-- 193 (7 Nov 2026): Asisten GM — daftar tindakan & catatan untuk Iqbal (General Manager / pengelola sistem).
-- gm_tindakan: hal yang perlu ditindaklanjuti (dari Penjaga sistem, Penjaga bisnis, Audit, Iqbal, atau Asisten GM).
--   Dibaca & diperbarui agen "Asisten GM Moscow" (Senin & Jumat 07.30 WITA); dicentang Iqbal di Master Data > Penjaga sistem.
-- gm_catatan: keputusan / konteks penting supaya Asisten GM ingat dari minggu ke minggu.
-- Hanya manajemen Moscow Supplies yang bisa membaca dan mengubah.

create table if not exists public.gm_tindakan (
  id bigint generated always as identity primary key,
  dibuat timestamptz not null default now(),
  judul text not null,
  ket text,
  sumber text not null default 'iqbal' check (sumber in ('iqbal', 'asisten', 'penjaga sistem', 'penjaga bisnis', 'audit')),
  prioritas smallint not null default 2 check (prioritas between 1 and 3),
  tenggat date,
  status text not null default 'buka' check (status in ('buka', 'selesai', 'batal')),
  selesai_waktu timestamptz,
  catatan text
);
create index if not exists gm_tindakan_status on public.gm_tindakan (status, prioritas, tenggat);
alter table public.gm_tindakan enable row level security;
drop policy if exists gm_tindakan_baca on public.gm_tindakan;
drop policy if exists gm_tindakan_tambah on public.gm_tindakan;
drop policy if exists gm_tindakan_ubah on public.gm_tindakan;
create policy gm_tindakan_baca on public.gm_tindakan for select to authenticated using (public._boleh_peran(array['manajemen']));
create policy gm_tindakan_tambah on public.gm_tindakan for insert to authenticated with check (public._boleh_peran(array['manajemen']));
create policy gm_tindakan_ubah on public.gm_tindakan for update to authenticated using (public._boleh_peran(array['manajemen'])) with check (public._boleh_peran(array['manajemen']));
grant select, insert, update on public.gm_tindakan to authenticated;

create table if not exists public.gm_catatan (
  id bigint generated always as identity primary key,
  waktu timestamptz not null default now(),
  isi text not null,
  sumber text not null default 'asisten'
);
alter table public.gm_catatan enable row level security;
drop policy if exists gm_catatan_baca on public.gm_catatan;
create policy gm_catatan_baca on public.gm_catatan for select to authenticated using (public._boleh_peran(array['manajemen']));
grant select on public.gm_catatan to authenticated;
