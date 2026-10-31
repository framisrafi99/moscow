-- 120: manajemen boleh membaca setelan pengadaan (waktu tunggu / cadangan / beli untuk per barang),
-- supaya robot purchasing di Master Data bisa dihitung langsung di aplikasi. Hanya baca; tulis tetap lewat Apps Script.
alter table public.pengadaan_setelan enable row level security;
drop policy if exists pengadaan_setelan_baca on public.pengadaan_setelan;
create policy pengadaan_setelan_baca on public.pengadaan_setelan for select using ((select public.peran_saya()) = 'manajemen');
revoke all on public.pengadaan_setelan from anon;
grant select on public.pengadaan_setelan to authenticated;
grant all on public.pengadaan_setelan to service_role;
select 'ok120' as ok;
