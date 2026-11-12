-- 12 Nov 2026: Laporan sistem (Kendali Bisnis). Catatan pekerjaan sistem per hari dari penanggung jawab sistem,
-- dibaca Mike & Junior (kendali_bisnis) dan manajemen; hanya manajemen yang menulis. Isi awal ditulis langsung di database.
create table if not exists public.sistem_laporan (
  id bigserial primary key,
  tanggal date not null default (now() at time zone 'Asia/Makassar')::date,
  jam text,
  judul text not null,
  isi text not null,
  bagian text[] not null default '{}',
  oleh text not null default 'Penanggung jawab sistem',
  dibuat timestamptz not null default now()
);
alter table public.sistem_laporan enable row level security;
drop policy if exists sistem_laporan_baca on public.sistem_laporan;
create policy sistem_laporan_baca on public.sistem_laporan for select using (peran_saya() in ('kendali_bisnis', 'manajemen'));
drop policy if exists sistem_laporan_tulis on public.sistem_laporan;
create policy sistem_laporan_tulis on public.sistem_laporan for insert with check (peran_saya() = 'manajemen');
grant select, insert on public.sistem_laporan to authenticated;
grant usage on sequence public.sistem_laporan_id_seq to authenticated;
