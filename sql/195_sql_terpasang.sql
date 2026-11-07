-- 195 (7 Nov 2026): catatan file SQL yang sudah dipasang di database.
-- Masalah: file di folder sql/ dipasang manual, sehingga ada yang tertunda tanpa ketahuan (mis. 132 & 183 baru ketahuan
-- karena aplikasi memanggil fungsi yang belum ada). Mulai sekarang setiap file yang dijalankan dicatat di sql_terpasang,
-- dan agen Penjaga sistem membandingkan daftar file di repo dengan tabel ini (laporan bila ada yang belum terpasang).
--
-- Isi awal (7 Nov 2026): semua file dianggap terpasang SETELAH diperiksa — fungsi, tabel, dan jadwal yang dibuat tiap file
-- ada di database — kecuali kreatif.sql (fungsi kreatif_* dan tabel kreatif_* belum ada; perlu keputusan manajemen).
--
-- Cara mencatat sesudah menjalankan file baru:
--   insert into public.sql_terpasang (file, cara, catatan) values ('196_contoh.sql', 'Claude', 'disetujui Iqbal') on conflict (file) do nothing;

create table if not exists public.sql_terpasang (
  file text primary key,
  dipasang timestamptz not null default now(),
  cara text not null default 'manual',
  catatan text
);
alter table public.sql_terpasang enable row level security;
drop policy if exists sql_terpasang_baca on public.sql_terpasang;
create policy sql_terpasang_baca on public.sql_terpasang for select to authenticated using (public._boleh_peran(array['manajemen']));
grant select on public.sql_terpasang to authenticated;
