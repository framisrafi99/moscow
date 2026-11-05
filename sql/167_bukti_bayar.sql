-- 167 (5 Nov 2026): Robot Bukti Bayar Moscow (grup Telegram "Bukti Bayar Moscow").
-- Anggota mengirim foto bukti bayar / nota / teks pengeluaran ke grup. Edge Function tg-tombol membaca bukti dengan AI,
-- mencari transaksi yang sudah ada di accounting (nominal ±Rp 5.000 / 0,5%, tanggal ±7 hari; juga jumlah beberapa transaksi
-- satu orang di hari yang sama). Kalau ketemu: bukti ditempel (acc_bukti), tidak dicatat lagi. Kalau belum: tombol ✅ Catat.
-- Akun bawaan: Junior = Rekening Belanja, Viory = ShopeePay, Mike = Rekening Belanja (> Rp 10 juta: Rekening PT),
-- Ronny / Daffa / Iqbal = tanpa bawaan (wajib tulis saluran bayar, kalau tidak robot menanyakan lewat tombol).

create table if not exists public.bb_atur (kunci text primary key, nilai jsonb not null, diubah timestamptz not null default now());
alter table public.bb_atur enable row level security;

create table if not exists public.bb_anggota (
  uid text primary key, nama text not null, nama_tg text, akun_bawaan text, aturan jsonb, waktu timestamptz not null default now()
);
alter table public.bb_anggota enable row level security;

create table if not exists public.bb_bukti (
  id bigint generated always as identity primary key,
  waktu timestamptz not null default now(),
  chat text, msg bigint, robot_msg bigint, uid text, pengirim text,
  file_id text, file_jenis text, berkas text, caption text,
  baca jsonb, nominal numeric, tanggal date, keterangan text, kategori text, akun text,
  status text not null default 'baru',   -- baru, usul, tunggu, cocok, dicatat, bukan, sama, gagal
  acc_no text, catatan text, diubah timestamptz
);
alter table public.bb_bukti enable row level security;
create index if not exists bb_bukti_status on public.bb_bukti (status);

create table if not exists public.acc_bukti (acc_no text not null, bukti_id bigint not null references public.bb_bukti (id), waktu timestamptz not null default now(),
  primary key (acc_no, bukti_id));
alter table public.acc_bukti enable row level security;

insert into storage.buckets (id, name, public) values ('bukti-bayar', 'bukti-bayar', false) on conflict (id) do nothing;

-- Calon transaksi yang sama di accounting. Hasil: [{no:[...], t, v, ket, sumber, cara:'satu'|'jumlah'}]
create or replace function public.bb_cocok(p_nominal numeric, p_tanggal date, p_pengirim text default '')
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare v numeric := round(coalesce(p_nominal, 0)); tol numeric; hasil jsonb := '[]'; d date := coalesce(p_tanggal, (now() at time zone 'Asia/Makassar')::date);
  x record;
begin
  if v <= 0 then return '[]'; end if;
  tol := greatest(5000, round(v * 0.005));
  -- satu transaksi
  select coalesce(jsonb_agg(jsonb_build_object('no', jsonb_build_array(btrim(no)), 't', to_char(tanggal, 'DD/MM/YYYY'), 'v', round(nominal),
           'ket', left(coalesce(keterangan, ''), 90), 'sumber', public._acc_sumber(pengisi), 'cara', 'satu',
           'beda', round(nominal) - v) order by abs(round(nominal) - v), abs(tanggal - d)), '[]') into hasil
    from (select * from acc_log a
           where public._rapi_spasi(a.jenis, 10) = 'Keluar' and coalesce(public._rapi_spasi(a.status, 20), 'Aktif') <> 'Batal'
             and abs(round(coalesce(a.nominal, 0)) - v) <= tol and a.tanggal between d - 7 and d + 2
             and not exists (select 1 from acc_bukti b where b.acc_no = btrim(a.no))
           order by abs(round(a.nominal) - v), abs(a.tanggal - d) limit 3) z;
  if jsonb_array_length(hasil) > 0 then return hasil; end if;
  -- beberapa transaksi dari sumber yang sama di hari yang sama (mis. satu checkout Shopee = beberapa kategori di aplikasi)
  for x in select a.tanggal, a.pengisi, array_agg(btrim(a.no) order by a.no) nos, sum(round(a.nominal)) jml, string_agg(left(coalesce(a.keterangan, ''), 40), ' + ' order by a.no) ket
             from acc_log a
            where public._rapi_spasi(a.jenis, 10) = 'Keluar' and coalesce(public._rapi_spasi(a.status, 20), 'Aktif') <> 'Batal'
              and a.tanggal between d - 7 and d + 2 and coalesce(a.pengisi, '') <> 'pemilik'
              and not exists (select 1 from acc_bukti b where b.acc_no = btrim(a.no))
            group by a.tanggal, a.pengisi having count(*) between 2 and 8 and abs(sum(round(a.nominal)) - v) <= tol
            order by abs(sum(round(a.nominal)) - v) limit 1 loop
    hasil := jsonb_build_array(jsonb_build_object('no', to_jsonb(x.nos), 't', to_char(x.tanggal, 'DD/MM/YYYY'), 'v', x.jml, 'ket', left(x.ket, 120),
      'sumber', public._acc_sumber(x.pengisi), 'cara', 'jumlah', 'beda', x.jml - v));
  end loop;
  return hasil;
end $$;

-- Catat bukti ke accounting (uang keluar). Mengembalikan nomor TR.
create or replace function public.bb_catat(p_id bigint, p_oleh text)
returns json language plpgsql security definer set search_path to 'public' as $$
declare b record; nomor text; awalan text := 'TR-' || to_char(now() at time zone 'Asia/Makassar', 'YYMMDD') || '-'; urut int; kat text; salah text;
begin
  perform pg_advisory_xact_lock(hashtext('staf|acc_log'));
  select * into b from bb_bukti where id = p_id for update;
  if b.id is null then return json_build_object('ok', false, 'pesan', 'Bukti tidak ditemukan.'); end if;
  if b.status in ('dicatat', 'cocok') then return json_build_object('ok', false, 'pesan', 'Sudah tercatat: ' || coalesce(b.acc_no, '-')); end if;
  if coalesce(b.nominal, 0) <= 0 then return json_build_object('ok', false, 'pesan', 'Nominal belum terbaca. Tekan ✏️ Ubah lalu tulis nominalnya.'); end if;
  if b.tanggal is null then return json_build_object('ok', false, 'pesan', 'Tanggal belum terbaca. Tekan ✏️ Ubah lalu tulis tanggalnya.'); end if;
  if coalesce(b.akun, '') = '' or not exists (select 1 from acc_akun where public._rapi_spasi(nama_akun, 60) = b.akun) then
    return json_build_object('ok', false, 'pesan', 'Pilih akun bayarnya dulu.');
  end if;
  salah := public._tb_tolak(to_char(b.tanggal, 'YYYY-MM-DD'));
  if salah <> '' then return json_build_object('ok', false, 'pesan', salah); end if;
  kat := case when exists (select 1 from acc_kategori where public._rapi_spasi(jenis, 20) ~* 'keluar' and public._rapi_spasi(kategori, 80) = b.kategori) then b.kategori else 'Biaya lain-lain' end;
  urut := public._acc_urut();
  nomor := awalan || right('00' || (urut + 1)::text, 3);
  insert into acc_log (no, tanggal, jenis, akun, akun_tujuan, kategori, keterangan, nominal, waktu_input, pengisi, status)
  values (nomor, b.tanggal, 'Keluar', b.akun, '', kat, left(coalesce(nullif(b.keterangan, ''), 'Pengeluaran') || ' [Telegram: ' || coalesce(b.pengirim, '?') || ']', 190),
          round(b.nominal), now(), 'telegram: ' || left(coalesce(p_oleh, b.pengirim, ''), 40), 'Aktif');
  insert into acc_bukti (acc_no, bukti_id) values (nomor, b.id) on conflict do nothing;
  update bb_bukti set status = 'dicatat', acc_no = nomor, kategori = kat, diubah = now() where id = b.id;
  return json_build_object('ok', true, 'no', nomor);
end $$;

-- Tempel bukti ke transaksi yang sudah ada.
create or replace function public.bb_tempel(p_id bigint, p_nos text[])
returns json language plpgsql security definer set search_path to 'public' as $$
declare n text;
begin
  foreach n in array coalesce(p_nos, '{}') loop
    if exists (select 1 from acc_log where btrim(no) = n) then insert into acc_bukti (acc_no, bukti_id) values (n, p_id) on conflict do nothing; end if;
  end loop;
  update bb_bukti set status = 'cocok', acc_no = array_to_string(p_nos, ', '), diubah = now() where id = p_id;
  return json_build_object('ok', true);
end $$;

revoke all on function public.bb_cocok(numeric, date, text) from public, anon, authenticated;
revoke all on function public.bb_catat(bigint, text) from public, anon, authenticated;
revoke all on function public.bb_tempel(bigint, text[]) from public, anon, authenticated;
grant execute on function public.bb_cocok(numeric, date, text), public.bb_catat(bigint, text), public.bb_tempel(bigint, text[]) to service_role;

-- Jadwal tiap jam: bukti Viory/Mike yang menunggu input aplikasi (tempel otomatis / tanya sesudah 3 hari) & baca ulang bukti
-- yang gagal karena kunci AI belum dipasang.
select cron.schedule('bukti-bayar-periksa', '17 * * * *', $c$
  select net.http_post(url := 'https://ufhuvwfudblbyrwzugaa.supabase.co/functions/v1/tg-tombol',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-moscow-robot-kunci', (select kunci from public.robot_kunci where id = 1)),
    body := '{}'::jsonb, timeout_milliseconds := 120000)
$c$);
