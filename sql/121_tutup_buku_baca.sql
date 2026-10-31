-- 121: manajemen boleh membaca tutup_buku (bulan yang sudah ditutup + angka penjualan otomatis yang dibekukan),
-- supaya penjualan otomatis accounting (acc:oto) bisa dihitung langsung di aplikasi. Hanya baca.
alter table public.tutup_buku enable row level security;
drop policy if exists tutup_buku_baca on public.tutup_buku;
create policy tutup_buku_baca on public.tutup_buku for select using ((select public.peran_saya()) = 'manajemen');
revoke all on public.tutup_buku from anon;
grant select on public.tutup_buku to authenticated;
grant all on public.tutup_buku to service_role;
select 'ok121' as ok;
