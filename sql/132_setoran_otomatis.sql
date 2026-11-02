-- 132 (2 Nov 2026): setoran consignment & dana cair Official otomatis masuk accounting.
--
-- Consignment (Medan, Sidoarjo, Renon):
--   * Bagian Moscow Supplies dari invoice bagi hasil yang sudah terbit tercatat otomatis sebagai pendapatan di akun
--     "Setoran <toko> (belum disetor)" (dihitung akun.js, potret acc:oto).
--   * Staf toko mengupload bukti transfer di menu "Bukti transfer" form toko -> setoran_bukti_simpan mencatat
--     Pindah "Setoran <toko> (belum disetor)" -> Rekening PT dengan tanda [BH yyyy-MM]. Uangnya pindah ke Rekening PT,
--     pendapatan tidak tercatat dua kali.
--   * toko_bahan_bagi_hasil 'setor' ikut menghitung Pindah ini sebagai setoran tercatat.
--
-- Official (Shopee, Tokopedia/TikTok, Lazada):
--   * Setelah laporan dana diupload (dana_cair_simpan), _dc_official_acc mencatat potongan platform, penyesuaian, dan
--     penarikan dana ke Rekening PT ke acc_log (tanda [DC Official <platform> <bulan>]). Upload ulang = catatan lama
--     dibatalkan lalu dibuat ulang, jadi tidak dobel.

-- ---------------------------------------------------------------------
-- Penyimpanan foto / PDF bukti transfer
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('setoran', 'setoran', false, 6291456, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create or replace function public._setoran_folder(p_toko text)
returns text language sql immutable set search_path = '' as $$
  select lower(regexp_replace(replace(coalesce(p_toko, ''), 'Consignment ', ''), '[^A-Za-z]', '', 'g'))
$$;

drop policy if exists setoran_unggah on storage.objects;
drop policy if exists setoran_lihat on storage.objects;
create policy setoran_unggah on storage.objects for insert to authenticated
  with check (bucket_id = 'setoran' and (
    (select public.peran_saya()) = 'manajemen'
    or ((select public.peran_saya()) = 'toko' and (storage.foldername(name))[1] = public._setoran_folder((select public.lingkup_saya())))));
create policy setoran_lihat on storage.objects for select to authenticated
  using (bucket_id = 'setoran' and (
    (select public.peran_saya()) = any (array['manajemen', 'kendali_bisnis', 'accounting'])
    or ((select public.peran_saya()) = 'toko' and (storage.foldername(name))[1] = public._setoran_folder((select public.lingkup_saya())))));

-- ---------------------------------------------------------------------
-- Tabel bukti transfer
-- ---------------------------------------------------------------------
create table if not exists public.setoran_bukti (
  id bigint generated always as identity primary key,
  no text not null unique,
  toko text not null,
  bulan text not null,
  tanggal date not null,
  nominal numeric not null,
  akun_tujuan text not null default 'Rekening PT',
  file_path text not null,
  acc_no text,
  catatan text,
  oleh text,
  email text,
  status text not null default 'Aktif',
  waktu_batal timestamptz,
  batal_oleh text,
  alasan_batal text,
  dibuat timestamptz not null default now()
);
alter table public.setoran_bukti enable row level security;
create index if not exists setoran_bukti_toko_bulan on public.setoran_bukti (toko, bulan);

-- Setoran yang sudah tercatat di accounting untuk toko + bulan (Masuk lama atau Pindah dari akun setoran).
create or replace function public._setoran_tercatat(p_toko text, p_bulan text)
returns table (no text, tanggal date, akun text, nominal numeric, jenis text, keterangan text, pengisi text)
language sql stable security definer set search_path = public as $$
  select l.no, l.tanggal, case when l.jenis = 'Pindah' then l.akun_tujuan else l.akun end, l.nominal, l.jenis, l.keterangan, l.pengisi
    from acc_log l
   where l.status = 'Aktif' and position('[BH ' || p_bulan || ']' in coalesce(l.keterangan, '')) > 0
     and ((l.jenis = 'Masuk' and l.kategori = 'Penjualan ' || p_toko)
       or (l.jenis = 'Pindah' and l.akun = 'Setoran ' || p_toko || ' (belum disetor)'))
   order by l.tanggal, l.id
$$;

-- Nomor TR berikutnya (dipanggil di dalam kunci staf|acc_log).
create or replace function public._acc_no_baru()
returns text language plpgsql volatile security definer set search_path = public as $$
declare awalan text := 'TR-' || to_char(now() at time zone 'Asia/Makassar', 'YYMMDD') || '-';
begin
  return awalan || right('00' || (public._acc_urut() + 1)::text, 3);
end $$;

-- Data menu Bukti transfer (form toko).
create or replace function public.setoran_bukti_data(p_toko text)
returns json language plpgsql stable security definer set search_path = public as $$
declare v_toko text := left(btrim(regexp_replace(coalesce(p_toko, ''), '\s+', ' ', 'g')), 80);
begin
  if not (public._toko_consignment(v_toko) or (select public.peran_saya()) = any (array['manajemen', 'kendali_bisnis', 'accounting'])) then
    return json_build_object('ok', false, 'pesan', 'Akses ditolak.');
  end if;
  if v_toko not in ('Consignment Medan', 'Consignment Sidoarjo', 'Consignment Renon') then
    return json_build_object('ok', false, 'pesan', 'Bukti transfer hanya untuk toko consignment.');
  end if;
  return json_build_object('ok', true, 'toko', v_toko, 'folder', public._setoran_folder(v_toko),
    'manajemen', (select public.peran_saya()) = 'manajemen',
    'hari', to_char(now() at time zone 'Asia/Makassar', 'YYYY-MM-DD'),
    'bukti', coalesce((select json_agg(json_build_object('no', b.no, 'bulan', b.bulan, 't', b.tanggal, 'v', b.nominal, 'file', b.file_path,
                 'acc', b.acc_no, 'cat', b.catatan, 'oleh', b.oleh, 'st', b.status, 'alasan', b.alasan_batal,
                 'w', to_char(b.dibuat at time zone 'Asia/Makassar', 'DD/MM/YYYY HH24:MI')) order by b.dibuat desc)
               from setoran_bukti b where b.toko = v_toko), '[]'),
    'tercatat', coalesce((select json_agg(json_build_object('bulan', m.bulan, 'no', s.no, 't', s.tanggal, 'v', s.nominal, 'akun', s.akun, 'ket', s.keterangan))
               from (select distinct substring(keterangan from '\[BH (\d{4}-\d{2})\]') bulan from acc_log
                      where status = 'Aktif' and keterangan ~ '\[BH \d{4}-\d{2}\]') m,
                    lateral public._setoran_tercatat(v_toko, m.bulan) s where m.bulan is not null), '[]'));
end $$;

-- Simpan bukti transfer -> setoran tercatat (Pindah akun setoran -> Rekening PT).
create or replace function public.setoran_bukti_simpan(p_toko text, p_bulan text, p_tanggal text, p_nominal text, p_file text, p_catatan text, p_nama text, p_token text)
returns json language plpgsql volatile security definer set search_path = public as $$
declare
  v_toko text := left(btrim(regexp_replace(coalesce(p_toko, ''), '\s+', ' ', 'g')), 80);
  v_bulan text := left(btrim(coalesce(p_bulan, '')), 7);
  v_tgl text := left(btrim(coalesce(p_tanggal, '')), 10);
  v_file text := left(btrim(coalesce(p_file, '')), 300);
  v_cat text := left(btrim(regexp_replace(coalesce(p_catatan, ''), '\s+', ' ', 'g')), 200);
  v_nama text := left(btrim(regexp_replace(coalesce(p_nama, ''), '\s+', ' ', 'g')), 40);
  hari text := to_char(now() at time zone 'Asia/Makassar', 'YYYY-MM-DD');
  pemilik boolean := (select public.peran_saya()) = 'manajemen';
  s text; v numeric; salah text; akun_dari text; nomor text; nob text; oleh text; nb text;
  nm text[] := array['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
begin
  if not public._toko_consignment(v_toko) or v_toko not in ('Consignment Medan', 'Consignment Sidoarjo', 'Consignment Renon') then
    return json_build_object('ok', false, 'pesan', 'Akses ditolak.');
  end if;
  if v_bulan !~ '^\d{4}-(0[1-9]|1[0-2])$' then return json_build_object('ok', false, 'pesan', 'Pilih bulan bagi hasil yang disetor.'); end if;
  if v_tgl !~ '^\d{4}-\d{2}-\d{2}$' then return json_build_object('ok', false, 'pesan', 'Isi tanggal transfer.'); end if;
  if v_tgl > hari then return json_build_object('ok', false, 'pesan', 'Tanggal transfer tidak boleh lebih dari hari ini.'); end if;
  if v_tgl < v_bulan || '-01' then return json_build_object('ok', false, 'pesan', 'Tanggal transfer tidak boleh sebelum bulan bagi hasilnya.'); end if;
  s := regexp_replace(coalesce(p_nominal, ''), '[^\d]', '', 'g');
  if s = '' or length(s) > 13 then return json_build_object('ok', false, 'pesan', 'Isi nominal transfer dengan angka.'); end if;
  v := s::numeric;
  if v <= 0 then return json_build_object('ok', false, 'pesan', 'Nominal transfer harus lebih dari 0.'); end if;
  if v_file = '' or split_part(v_file, '/', 1) <> public._setoran_folder(v_toko)
     or not exists (select 1 from storage.objects where bucket_id = 'setoran' and name = v_file) then
    return json_build_object('ok', false, 'pesan', 'Foto / PDF bukti transfer belum terupload. Coba pilih filenya lagi.');
  end if;
  salah := public._tb_tolak(v_tgl);
  if salah <> '' then return json_build_object('ok', false, 'pesan', salah); end if;
  akun_dari := 'Setoran ' || v_toko || ' (belum disetor)';
  if not public._acc_ada_akun(akun_dari) or not public._acc_ada_akun('Rekening PT') then
    return json_build_object('ok', false, 'pesan', 'Akun setoran belum ada di accounting. Hubungi manajemen Moscow Supplies.');
  end if;
  perform pg_advisory_xact_lock(hashtext('staf|acc_log'));
  if coalesce(p_token, '') <> '' and exists (select 1 from toko_token where token = 'stb|' || left(p_token, 60)) then
    return json_build_object('ok', true, 'ulang', true, 'pesan', 'Bukti transfer ini sudah tersimpan sebelumnya.');
  end if;
  nb := nm[right(v_bulan, 2)::int] || ' ' || left(v_bulan, 4);
  oleh := case when pemilik then 'manajemen' else 'staf: ' || coalesce(nullif(v_nama, ''), 'toko') end;
  nob := 'ST-' || to_char(now() at time zone 'Asia/Makassar', 'YYMMDD') || '-' ||
         right('00' || (coalesce((select count(*) from setoran_bukti where no like 'ST-' || to_char(now() at time zone 'Asia/Makassar', 'YYMMDD') || '-%'), 0) + 1)::text, 3);
  nomor := public._acc_no_baru();
  insert into acc_log (no, tanggal, jenis, akun, akun_tujuan, kategori, keterangan, nominal, waktu_input, pengisi, status)
  values (nomor, v_tgl::date, 'Pindah', akun_dari, 'Rekening PT', '',
          left('Setoran bagi hasil ' || v_toko || ' ' || nb || ' [BH ' || v_bulan || '] · bukti transfer ' || nob || coalesce(' · ' || nullif(v_cat, ''), ''), 200),
          v, now(), oleh, 'Aktif');
  insert into setoran_bukti (no, toko, bulan, tanggal, nominal, file_path, acc_no, catatan, oleh, email)
  values (nob, v_toko, v_bulan, v_tgl::date, v, v_file, nomor, nullif(v_cat, ''), oleh, lower(coalesce(auth.jwt() ->> 'email', '')));
  if coalesce(p_token, '') <> '' then insert into toko_token (token) values ('stb|' || left(p_token, 60)) on conflict do nothing; end if;
  return json_build_object('ok', true, 'no', nob, 'acc', nomor,
    'pesan', 'Bukti transfer ' || nob || ' tersimpan. Setoran Rp ' || public._gd_fmt(v) || ' (bagi hasil ' || nb || ') sudah tercatat masuk Rekening PT.');
end $$;

-- Batalkan bukti transfer (manajemen): catatan accounting-nya ikut dibatalkan.
create or replace function public.setoran_bukti_batal(p_no text, p_alasan text)
returns json language plpgsql volatile security definer set search_path = public as $$
declare x record; v_alasan text := left(btrim(regexp_replace(coalesce(p_alasan, ''), '\s+', ' ', 'g')), 200); salah text;
begin
  if (select public.peran_saya()) is distinct from 'manajemen' then return json_build_object('ok', false, 'pesan', 'Hanya manajemen Moscow Supplies yang bisa membatalkan.'); end if;
  if length(v_alasan) < 3 then return json_build_object('ok', false, 'pesan', 'Isi alasan pembatalan.'); end if;
  perform pg_advisory_xact_lock(hashtext('staf|acc_log'));
  select * into x from setoran_bukti where no = left(btrim(coalesce(p_no, '')), 20);
  if x.id is null then return json_build_object('ok', false, 'pesan', 'Bukti transfer tidak ditemukan.'); end if;
  if x.status = 'Batal' then return json_build_object('ok', true, 'pesan', 'Sudah dibatalkan sebelumnya.'); end if;
  salah := public._tb_tolak(to_char(x.tanggal, 'YYYY-MM-DD'));
  if salah <> '' then return json_build_object('ok', false, 'pesan', salah); end if;
  update acc_log set status = 'Batal', waktu_batal = now() where no = x.acc_no and status = 'Aktif';
  update setoran_bukti set status = 'Batal', waktu_batal = now(), batal_oleh = 'manajemen', alasan_batal = v_alasan where id = x.id;
  return json_build_object('ok', true, 'pesan', 'Bukti transfer ' || x.no || ' dan catatan ' || coalesce(x.acc_no, '-') || ' dibatalkan.');
end $$;

revoke all on function public.setoran_bukti_data(text) from public, anon;
revoke all on function public.setoran_bukti_simpan(text, text, text, text, text, text, text, text) from public, anon;
revoke all on function public.setoran_bukti_batal(text, text) from public, anon;
grant execute on function public.setoran_bukti_data(text) to authenticated;
grant execute on function public.setoran_bukti_simpan(text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.setoran_bukti_batal(text, text) to authenticated;

-- ---------------------------------------------------------------------
-- toko_bahan_bagi_hasil: setoran tercatat ikut Pindah dari akun setoran
-- ---------------------------------------------------------------------
do $$
declare d text; lama text; baru text;
begin
  d := pg_get_functiondef('public.toko_bahan_bagi_hasil'::regproc);
  lama := $q$from acc_log where left(public._rapi_spasi(status, 1000), 20) = 'Aktif' and left(public._rapi_spasi(jenis, 1000), 10) = 'Masuk'
                 and left(public._rapi_spasi(kategori, 1000), 80) = 'Penjualan ' || p_toko
                 and position('[BH ' || p_bulan || ']' in coalesce(keterangan, '')) > 0),$q$;
  baru := $q$from acc_log where left(public._rapi_spasi(status, 1000), 20) = 'Aktif'
                 and ((left(public._rapi_spasi(jenis, 1000), 10) = 'Masuk' and left(public._rapi_spasi(kategori, 1000), 80) = 'Penjualan ' || p_toko)
                   or (left(public._rapi_spasi(jenis, 1000), 10) = 'Pindah' and akun = 'Setoran ' || p_toko || ' (belum disetor)'))
                 and position('[BH ' || p_bulan || ']' in coalesce(keterangan, '')) > 0),$q$;
  if position(lama in d) = 0 then
    if position('''Pindah'' and akun = ''Setoran ''' in d) > 0 then return; end if;
    raise exception 'toko_bahan_bagi_hasil: bagian setor tidak ditemukan';
  end if;
  execute replace(d, lama, baru);
end $$;
