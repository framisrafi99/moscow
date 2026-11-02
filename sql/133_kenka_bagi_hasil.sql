-- 133: bagi hasil produk Kenka (Mike / Junior) dari Master Data.
--  kenka_bh_data(bulan): penjualan Kenka per saluran (Official dari mp_pesanan + padanan, consignment & toko offline dari toko_jual_log),
--  HPP terbaru (hasil_hitung 'hpp'), potongan platform Official dari dana_cair, dan invoice yang sudah terbit.
--  kenka_bh_terbit(bulan, data, tanggal): simpan invoice (snapshot hitungan) + catat 2 uang keluar dari Rekening PT
--  kategori "Bagi hasil Kenka (dividen)" (Di luar laba rugi). Hanya manajemen; buku yang sudah ditutup ditolak.
create table if not exists public.kenka_bh (
  bulan text primary key, no text not null, data jsonb not null, total_mike numeric not null, total_junior numeric not null,
  tanggal date not null, tr_mike text, tr_junior text, oleh text, waktu timestamptz not null default now()
);
alter table public.kenka_bh enable row level security;
revoke all on public.kenka_bh from anon, authenticated;

create or replace function public.kenka_bh_data(p_bulan text)
returns json language plpgsql stable security definer set search_path = public as $$
declare dari timestamptz; sampai timestamptz; d1 date; d2 date;
  kd text[] := array['K002','K003','K004','K005','K010','K011','K012','K013','K014','K017','K018'];
begin
  if (select public.peran_saya()) is distinct from 'manajemen' then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  if coalesce(p_bulan, '') !~ '^\d{4}-(0[1-9]|1[0-2])$' then return json_build_object('ok', false, 'pesan', 'Bulan tidak valid.'); end if;
  d1 := (p_bulan || '-01')::date; d2 := (d1 + interval '1 month')::date;
  dari := d1::timestamp at time zone 'Asia/Makassar'; sampai := d2::timestamp at time zone 'Asia/Makassar';
  return json_build_object('ok', true, 'bulan', p_bulan,
    'jual', (select coalesce(json_agg(json_build_array(s, k, q, v)), '[]'::json) from (
      select o.platform s, p.kode k, sum(greatest(o.qty - coalesce(o.qty_return, 0), 0)) q,
             round(sum(case when o.qty > 0 then coalesce(o.subtotal, 0) * greatest(o.qty - coalesce(o.qty_return, 0), 0) / o.qty else 0 end)) v
        from mp_pesanan o
        join (select distinct on (kunci) kunci, kode, st from (
                select upper(public._mp_t(nama_produk, 250) || '|' || public._mp_t(coalesce(variasi, ''), 120)) kunci, upper(trim(kode)) kode,
                       coalesce(nullif(trim(status), ''), 'Dikonfirmasi') st, baris_sheet, id from mp_padanan) x
              order by kunci, baris_sheet desc nulls first, id desc) p
          on p.kunci = upper(public._mp_t(o.nama_produk, 250) || '|' || public._mp_t(coalesce(o.variasi, ''), 120))
       where o.toko = 'Official' and o.waktu_dibuat >= dari and o.waktu_dibuat < sampai
         and coalesce(o.status, '') !~* '(batal|cancel|belum bayar|unpaid)' and p.st = 'Dikonfirmasi' and p.kode = any(kd)
       group by 1, 2
      union all
      select t.toko, upper(trim(t.kode)), sum(t.qty_terjual), round(sum(t.total))
        from toko_jual_log t
       where t.tanggal >= d1 and t.tanggal < d2 and upper(trim(t.kode)) = any(kd) and t.toko !~* '\((batal|arsip)'
       group by 1, 2) z where q <> 0),
    'hpp', (select data::jsonb -> 'hpp' from hasil_hitung where kunci = 'hpp'),
    'dana', (select coalesce(json_agg(json_build_object('pf', platform, 'pend', total_pendapatan, 'biaya', total_biaya)), '[]'::json)
               from dana_cair where public._bulan_teks(bulan) = p_bulan and public._mp_t(toko, 80) = 'Official'),
    'terbit', (select row_to_json(k) from (select no, data, total_mike, total_junior, tanggal, tr_mike, tr_junior, oleh, waktu from kenka_bh where bulan = p_bulan) k));
end $$;
revoke all on function public.kenka_bh_data(text) from public, anon;
grant execute on function public.kenka_bh_data(text) to authenticated;

create or replace function public.kenka_bh_terbit(p_bulan text, p_data jsonb, p_tanggal text)
returns json language plpgsql volatile security definer set search_path = public as $$
declare v_m numeric := round(public._mp_n(p_data ->> 'mike')); v_j numeric := round(public._mp_n(p_data ->> 'junior'));
  v_tgl date; v_no text; nb text; pre text; n int; trm text; trj text; oleh text;
  nm text[] := array['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
begin
  if (select public.peran_saya()) is distinct from 'manajemen' then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  if coalesce(p_bulan, '') !~ '^\d{4}-(0[1-9]|1[0-2])$' then return json_build_object('ok', false, 'pesan', 'Bulan tidak valid.'); end if;
  if coalesce(p_tanggal, '') !~ '^\d{4}-\d{2}-\d{2}$' then return json_build_object('ok', false, 'pesan', 'Isi tanggal transfer.'); end if;
  v_tgl := p_tanggal::date;
  if v_tgl < (p_bulan || '-01')::date then return json_build_object('ok', false, 'pesan', 'Tanggal transfer tidak boleh sebelum bulan bagi hasil.'); end if;
  if v_m < 0 or v_j < 0 or v_m + v_j <= 0 or v_m + v_j > 10000000000 then return json_build_object('ok', false, 'pesan', 'Nominal bagi hasil tidak wajar.'); end if;
  if public._tb_tolak(p_tanggal) <> '' then return json_build_object('ok', false, 'pesan', 'Buku bulan tanggal transfer sudah ditutup.'); end if;
  perform pg_advisory_xact_lock(hashtext('kenka_bh|acc_log'));
  if exists (select 1 from kenka_bh where bulan = p_bulan) then return json_build_object('ok', false, 'pesan', 'Invoice bagi hasil Kenka bulan ini sudah terbit.'); end if;
  nb := nm[right(p_bulan, 2)::int] || ' ' || left(p_bulan, 4);
  v_no := 'BHK-' || substr(p_bulan, 3, 2) || right(p_bulan, 2) || '-001';
  pre := 'TR-' || to_char((now() at time zone 'Asia/Makassar')::date, 'YYMMDD') || '-';
  select coalesce(max(nullif(regexp_replace(no, '^.*-', ''), '')::int), 0) into n from acc_log where no like pre || '%' and no ~ '-\d+$';
  oleh := public._mgmt_nama();
  if v_m > 0 then
    trm := pre || lpad((n + 1)::text, 3, '0'); n := n + 1;
    insert into acc_log (no, tanggal, jenis, akun, akun_tujuan, kategori, keterangan, nominal, waktu_input, pengisi, status)
    values (trm, v_tgl, 'Keluar', 'Rekening PT', null, 'Bagi hasil Kenka (dividen)', 'Bagi hasil produk Kenka ' || nb || ' - bagian Mike [' || v_no || ']', v_m, now(), 'pemilik', 'Aktif');
  end if;
  if v_j > 0 then
    trj := pre || lpad((n + 1)::text, 3, '0');
    insert into acc_log (no, tanggal, jenis, akun, akun_tujuan, kategori, keterangan, nominal, waktu_input, pengisi, status)
    values (trj, v_tgl, 'Keluar', 'Rekening PT', null, 'Bagi hasil Kenka (dividen)', 'Bagi hasil produk Kenka ' || nb || ' - bagian Francois Junior Bogaard [' || v_no || ']', v_j, now(), 'pemilik', 'Aktif');
  end if;
  insert into kenka_bh (bulan, no, data, total_mike, total_junior, tanggal, tr_mike, tr_junior, oleh)
  values (p_bulan, v_no, p_data, v_m, v_j, v_tgl, trm, trj, oleh);
  return json_build_object('ok', true, 'no', v_no, 'pesan', 'Invoice ' || v_no || ' terbit. Tercatat di Accounting: uang keluar dari Rekening PT tanggal ' || to_char(v_tgl, 'DD/MM/YYYY') ||
    ' (Mike Rp ' || replace(to_char(v_m, 'FM999,999,999,990'), ',', '.') || ', Junior Rp ' || replace(to_char(v_j, 'FM999,999,999,990'), ',', '.') || ').');
end $$;
revoke all on function public.kenka_bh_terbit(text, jsonb, text) from public, anon;
grant execute on function public.kenka_bh_terbit(text, jsonb, text) to authenticated;
