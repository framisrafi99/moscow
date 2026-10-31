-- 115: manajemen boleh membaca pembelian_tanpa_ajuan (Master Data menghitung daftarnya langsung dari Supabase).
alter table public.pembelian_tanpa_ajuan enable row level security;
grant select on public.pembelian_tanpa_ajuan to authenticated;
do $x$ begin
  if not exists (select 1 from pg_policies where tablename = 'pembelian_tanpa_ajuan' and policyname = 'pembelian_tanpa_ajuan_baca') then
    create policy pembelian_tanpa_ajuan_baca on public.pembelian_tanpa_ajuan for select to authenticated using ((select public.peran_saya()) = 'manajemen');
  end if;
end $x$;
select 'ok115' ok;
