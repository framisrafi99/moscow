-- 119 (31 Okt 2026): rincian dana cair per pesanan (sheet DANA_CAIR_PESANAN, diisi upload laporan pesanan marketplace
--  di form toko / file 76_dana_cair) ikut disalin ke Supabase oleh sinkron otomatis Apps Script (file 85_dana_cair_pesanan).
--  Susunan sama dengan tabel cermin lain: baris_sheet + sidik dipakai penyalin.
create table if not exists public.dana_cair_pesanan (
  id bigint generated always as identity primary key,
  baris_sheet integer unique,
  bulan text,
  toko text,
  platform text,
  no_pesanan text,
  jenis text,
  tanggal_pesanan text,
  tanggal_cair text,
  harga_produk numeric,
  pengembalian_dana numeric,
  dana_cair numeric,
  waktu_upload timestamptz,
  dibuat timestamptz default now(),
  sidik text
);
create index if not exists dana_cair_pesanan_toko on public.dana_cair_pesanan (toko, bulan);
alter table public.dana_cair_pesanan enable row level security;
drop policy if exists dana_cair_pesanan_baca on public.dana_cair_pesanan;
create policy dana_cair_pesanan_baca on public.dana_cair_pesanan for select using (
  (select public.peran_saya()) = any (array['manajemen', 'kendali_bisnis', 'accounting'])
  or ((select public.peran_saya()) = 'toko' and toko = (select public.lingkup_saya())));
revoke all on public.dana_cair_pesanan from anon;
grant select on public.dana_cair_pesanan to authenticated;
grant all on public.dana_cair_pesanan to service_role;
select 'ok119' as ok;
