-- =====================================================================
-- MANAGER KREATIF (kreatif.html)
-- Jalankan sekali di Supabase: SQL Editor > New query > tempel semua > Run.
-- Aman dijalankan ulang (memakai "if not exists" / "or replace").
--
-- Peran baru di tabel pengguna:
--   kreatif_manager  manager kreatif: semua fitur, termasuk target, tim, dan hapus konten
--   kreatif          talent, videografer, editor: lihat papan, ubah status, isi catatan harian
-- Peran manajemen tetap bisa membuka semuanya.
-- =====================================================================

-- 1. Izinkan dua peran baru bila kolom pengguna.peran dibatasi daftar nilai (check constraint).
do $$
declare c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class t on t.oid = con.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public' and t.relname = 'pengguna' and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%peran%'
  loop
    execute format('alter table public.pengguna drop constraint %I', c.conname);
  end loop;
  alter table public.pengguna add constraint pengguna_peran_check check (peran in (
    'manajemen', 'kendali_bisnis', 'accounting', 'gudang', 'purchasing_shopeepay', 'produksi',
    'bahan_baku', 'payroll', 'toko', 'kreatif_manager', 'kreatif')) not valid;
end $$;

-- 2. Siapa boleh membuka dan siapa boleh mengelola.
create or replace function public.kreatif_boleh() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.peran_saya() in ('manajemen', 'kreatif_manager', 'kreatif'), false)
$$;
create or replace function public.kreatif_kelola() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.peran_saya() in ('manajemen', 'kreatif_manager'), false)
$$;

-- 3. Tabel
create table if not exists public.kreatif_anggota (
  id bigint generated always as identity primary key,
  nama text not null,
  peran text not null check (peran in ('talent', 'videografer', 'editor', 'lainnya')),
  email text unique,
  aktif boolean not null default true,
  dibuat timestamptz not null default now()
);

create table if not exists public.kreatif_konten (
  id bigint generated always as identity primary key,
  judul text not null,
  platform text,
  status text not null default 'ide' check (status in ('ide', 'terjadwal', 'shooting', 'editing', 'review', 'tayang')),
  talent_id bigint references public.kreatif_anggota (id) on delete set null,
  videografer_id bigint references public.kreatif_anggota (id) on delete set null,
  editor_id bigint references public.kreatif_anggota (id) on delete set null,
  tgl_shooting date,
  tenggat date,
  tgl_tayang date,
  link_drive text,
  catatan text,
  revisi int not null default 0,
  selesai_shooting timestamptz,
  selesai_edit timestamptz,
  ditayangkan timestamptz,
  dibuat timestamptz not null default now(),
  diubah timestamptz not null default now(),
  dibuat_oleh text default auth.email()
);
create index if not exists kreatif_konten_status on public.kreatif_konten (status);

create table if not exists public.kreatif_log (
  id bigint generated always as identity primary key,
  konten_id bigint not null references public.kreatif_konten (id) on delete cascade,
  dari text,
  ke text not null,
  oleh text default auth.email(),
  waktu timestamptz not null default now()
);
create index if not exists kreatif_log_konten on public.kreatif_log (konten_id);

-- anggota_id kosong = target tim. bulan = tanggal 1 bulan itu.
create table if not exists public.kreatif_target (
  id bigint generated always as identity primary key,
  anggota_id bigint references public.kreatif_anggota (id) on delete cascade,
  jenis text not null check (jenis in ('harian', 'bulanan')),
  bulan date not null,
  angka int not null check (angka >= 0)
);
create unique index if not exists kreatif_target_unik on public.kreatif_target (coalesce(anggota_id, 0), jenis, bulan);

create table if not exists public.kreatif_catatan (
  id bigint generated always as identity primary key,
  anggota_id bigint references public.kreatif_anggota (id) on delete cascade,
  tanggal date not null,
  isi text not null,
  kendala text,
  oleh text default auth.email(),
  dibuat timestamptz not null default now()
);

-- 4. Setiap pindah status dicatat, dan waktu selesai tiap tahap diisi otomatis.
--    Review kembali ke editing = satu revisi.
create or replace function public.kreatif_konten_status() returns trigger
language plpgsql as $$
begin
  new.diubah := now();
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    if new.status in ('editing', 'review', 'tayang') and new.selesai_shooting is null then new.selesai_shooting := now(); end if;
    if new.status in ('review', 'tayang') and new.selesai_edit is null then new.selesai_edit := now(); end if;
    if new.status = 'tayang' and new.ditayangkan is null then new.ditayangkan := now(); end if;
    if new.status <> 'tayang' then new.ditayangkan := null; end if;
    if tg_op = 'UPDATE' and old.status = 'review' and new.status = 'editing' then
      new.revisi := old.revisi + 1;
      new.selesai_edit := null;
    end if;
  end if;
  return new;
end $$;

create or replace function public.kreatif_konten_log() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.kreatif_log (konten_id, dari, ke) values (new.id, case when tg_op = 'UPDATE' then old.status end, new.status);
  end if;
  return null;
end $$;

drop trigger if exists kreatif_konten_status on public.kreatif_konten;
create trigger kreatif_konten_status before insert or update on public.kreatif_konten
  for each row execute function public.kreatif_konten_status();
drop trigger if exists kreatif_konten_log on public.kreatif_konten;
create trigger kreatif_konten_log after insert or update on public.kreatif_konten
  for each row execute function public.kreatif_konten_log();

-- 5. Hak akses (RLS)
alter table public.kreatif_anggota enable row level security;
alter table public.kreatif_konten enable row level security;
alter table public.kreatif_log enable row level security;
alter table public.kreatif_target enable row level security;
alter table public.kreatif_catatan enable row level security;

drop policy if exists baca on public.kreatif_anggota;
drop policy if exists kelola on public.kreatif_anggota;
create policy baca on public.kreatif_anggota for select to authenticated using (public.kreatif_boleh());
create policy kelola on public.kreatif_anggota for all to authenticated using (public.kreatif_kelola()) with check (public.kreatif_kelola());

drop policy if exists baca on public.kreatif_konten;
drop policy if exists tambah on public.kreatif_konten;
drop policy if exists ubah on public.kreatif_konten;
drop policy if exists hapus on public.kreatif_konten;
create policy baca on public.kreatif_konten for select to authenticated using (public.kreatif_boleh());
create policy tambah on public.kreatif_konten for insert to authenticated with check (public.kreatif_kelola());
create policy ubah on public.kreatif_konten for update to authenticated using (public.kreatif_boleh()) with check (public.kreatif_boleh());
create policy hapus on public.kreatif_konten for delete to authenticated using (public.kreatif_kelola());

drop policy if exists baca on public.kreatif_log;
create policy baca on public.kreatif_log for select to authenticated using (public.kreatif_boleh());

drop policy if exists baca on public.kreatif_target;
drop policy if exists kelola on public.kreatif_target;
create policy baca on public.kreatif_target for select to authenticated using (public.kreatif_boleh());
create policy kelola on public.kreatif_target for all to authenticated using (public.kreatif_kelola()) with check (public.kreatif_kelola());

drop policy if exists baca on public.kreatif_catatan;
drop policy if exists tambah on public.kreatif_catatan;
drop policy if exists hapus on public.kreatif_catatan;
create policy baca on public.kreatif_catatan for select to authenticated using (public.kreatif_boleh());
create policy tambah on public.kreatif_catatan for insert to authenticated with check (public.kreatif_boleh());
create policy hapus on public.kreatif_catatan for delete to authenticated using (public.kreatif_kelola() or oleh = auth.email());

grant select, insert, update, delete on public.kreatif_anggota, public.kreatif_konten, public.kreatif_target, public.kreatif_catatan to authenticated;
grant select on public.kreatif_log to authenticated;
