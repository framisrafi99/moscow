-- 4 Nov 2026: barang_baru bisa dibaca manajemen & Mike (bbrData di halaman Persetujuan & laporan / Master Data) langsung dari Supabase.
grant select on public.barang_baru to authenticated;
create policy barang_baru_baca on public.barang_baru for select to authenticated using ((select public.peran_saya()) = any (array['manajemen', 'kendali_bisnis']));
