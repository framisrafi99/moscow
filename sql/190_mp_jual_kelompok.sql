-- 190 (7 Nov 2026): tahap B langkah 1 — penjualan marketplace dijumlah di database.
-- Dulu MdLama.mpJual membaca SELURUH mp_pesanan (±20 ribu baris) lewat lembar_baca di setiap hitungan Dasbor/laporan/TPB.
-- mp_jual_kelompok(dari, sampai) hanya mengembalikan pesanan toko Official dalam rentang tanggal (WITA), sudah dijumlah
-- per tanggal + nama produk + variasi + harga + platform. Pencocokan nama -> kode barang tetap di JS (MP_padananFn_),
-- jadi aturannya sama persis. Filter sama dengan MP_bacaPsn_ + mpJual: bukan batal/cancel, bukan belum bayar/unpaid,
-- qty - qty_return > 0 per baris.
-- Hasil: { g: [[tanggal, nama, variasi, harga_awal, harga_diskon, platform, qty], ...],
--          p: [[nama, variasi, harga_awal, baris_sheet], ...] }  -- p = baris pertama (urutan sheet) tiap nama+variasi
-- p dipakai supaya usulan padanan (yang ikut menimbang harga) dihitung dengan harga dari baris pertama, sama seperti
-- cara lama yang membaca pesanan dari awal.
-- Belum dipakai untuk angka yang tampil: dipakai robot hanya dalam mode uji berdampingan (jadwal hitung-potret-uji-mp)
-- sampai hasilnya terbukti sama dengan cara lama.
create or replace function public.mp_jual_kelompok(p_dari date, p_sampai date)
returns json language sql stable security definer set search_path = public as $$
  with sah as (
    select m.baris_sheet, m.id, m.waktu_dibuat, coalesce(m.nama_produk, '') nm, coalesce(m.variasi, '') vr,
           coalesce(m.harga_awal, 0) ha, coalesce(m.harga_setelah_diskon, 0) hd, coalesce(m.platform, '') pf,
           coalesce(m.qty, 0) - coalesce(m.qty_return, 0) q
      from mp_pesanan m
     where btrim(regexp_replace(coalesce(m.toko, ''), '\s+', ' ', 'g')) = 'Official'
       and coalesce(btrim(m.no_pesanan), '') <> ''
       and left(btrim(regexp_replace(coalesce(m.status, ''), '\s+', ' ', 'g')), 160) !~* 'batal|cancel|belum bayar|unpaid'
       and coalesce(m.qty, 0) - coalesce(m.qty_return, 0) > 0)
  select case when (select public.peran_saya()) in ('manajemen', 'kendali_bisnis', 'gudang', 'purchasing_shopeepay', 'produksi', 'bahan_baku')
    then json_build_object(
      'g', coalesce((select json_agg(json_build_array(t, nm, vr, ha, hd, pf, q) order by t, nm, vr, ha, hd, pf) from (
             select to_char(waktu_dibuat at time zone 'Asia/Makassar', 'YYYY-MM-DD') t, nm, vr, ha, hd, pf, sum(q) q
               from sah
              where waktu_dibuat >= (p_dari::timestamp at time zone 'Asia/Makassar')
                and waktu_dibuat < ((p_sampai + 1)::timestamp at time zone 'Asia/Makassar')
              group by 1, 2, 3, 4, 5, 6) x), '[]'::json),
      'p', coalesce((select json_agg(json_build_array(nm, vr, ha, baris_sheet) order by baris_sheet nulls last, id) from (
             select distinct on (nm, vr) nm, vr, ha, baris_sheet, id from sah order by nm, vr, baris_sheet nulls last, id) y), '[]'::json))
    else json_build_object('g', '[]'::json, 'p', '[]'::json) end
$$;
revoke all on function public.mp_jual_kelompok(date, date) from public, anon;
grant execute on function public.mp_jual_kelompok(date, date) to authenticated, service_role;
