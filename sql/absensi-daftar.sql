-- =====================================================================
-- ABSENSI: STAF MENDAFTAR SENDIRI (tambahan untuk sql/absensi.sql)
-- Jalankan sekali di Supabase: SQL Editor > New query > tempel semua > Run.
-- Aman dijalankan ulang.
--
-- Staf baru masuk aplikasi dengan akun Google-nya, menulis nama lengkap, lalu
-- manajemen mencocokkan dengan nama di Payroll, memilih lokasi, dan menyetujui.
-- Tanpa persetujuan manajemen, akun itu tidak bisa absen dan tidak bisa membuka halaman lain.
-- =====================================================================

create table if not exists public.absen_daftar (
  id bigint generated always as identity primary key,
  email text not null unique,
  nama text not null,
  status text not null default 'menunggu' check (status in ('menunggu', 'disetujui', 'ditolak')),
  dibuat timestamptz not null default now(),
  diputus_oleh text,
  diputus timestamptz
);
alter table public.absen_daftar enable row level security;
revoke all on public.absen_daftar from anon, authenticated;

-- Status pendaftaran akun yang sedang masuk.
create or replace function public.absen_daftar_saya() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare d public.absen_daftar;
begin
  if auth.email() is null then return jsonb_build_object('ok', false, 'pesan', 'Masuk dulu dengan akun Google.'); end if;
  select * into d from public.absen_daftar where email = lower(auth.email());
  return jsonb_build_object('ok', true, 'email', lower(auth.email()), 'status', d.status, 'nama', d.nama);
end $$;

-- Staf mengajukan pendaftaran (satu pengajuan per email; boleh diperbarui selama belum disetujui).
create or replace function public.absen_daftar_ajukan(p_nama text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare e text := lower(auth.email()); n text := regexp_replace(trim(coalesce(p_nama, '')), '\s+', ' ', 'g');
begin
  if e is null then return jsonb_build_object('ok', false, 'pesan', 'Masuk dulu dengan akun Google.'); end if;
  if exists (select 1 from public.absen_staf where lower(email) = e and aktif) then
    return jsonb_build_object('ok', false, 'pesan', 'Akun ini sudah terdaftar. Muat ulang halaman.');
  end if;
  if length(n) < 3 or length(n) > 80 then return jsonb_build_object('ok', false, 'pesan', 'Tulis nama lengkapmu.'); end if;
  insert into public.absen_daftar (email, nama) values (e, n)
  on conflict (email) do update set nama = excluded.nama, status = 'menunggu', dibuat = now(), diputus_oleh = null, diputus = null
  where public.absen_daftar.status <> 'disetujui';
  return jsonb_build_object('ok', true);
end $$;

-- Manajemen menyetujui (cocokkan ke nama Payroll + lokasi) atau menolak.
create or replace function public.absen_daftar_putus(p_id bigint, p_setuju boolean, p_nama_payroll text, p_lokasi_id bigint) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare d public.absen_daftar; n text := trim(coalesce(p_nama_payroll, '')); baru boolean := false;
begin
  if not public.absen_kelola() then return jsonb_build_object('ok', false, 'pesan', 'Khusus manajemen Moscow Supplies.'); end if;
  select * into d from public.absen_daftar where id = p_id for update;
  if d.id is null then return jsonb_build_object('ok', false, 'pesan', 'Pendaftaran tidak ditemukan.'); end if;
  if not p_setuju then
    update public.absen_daftar set status = 'ditolak', diputus_oleh = auth.email(), diputus = now() where id = p_id;
    return jsonb_build_object('ok', true);
  end if;
  if n = '' then return jsonb_build_object('ok', false, 'pesan', 'Pilih nama staf di Payroll.'); end if;
  if p_lokasi_id is null or not exists (select 1 from public.absen_lokasi where id = p_lokasi_id) then
    return jsonb_build_object('ok', false, 'pesan', 'Pilih lokasi kerja.');
  end if;
  if exists (select 1 from public.absen_staf where lower(email) = d.email and nama <> n) then
    return jsonb_build_object('ok', false, 'pesan', 'Email ' || d.email || ' sudah dipakai staf lain.');
  end if;
  insert into public.absen_staf (nama, email, lokasi_id, aktif) values (n, d.email, p_lokasi_id, true)
  on conflict (nama) do update set email = excluded.email, lokasi_id = excluded.lokasi_id, aktif = true;
  if not exists (select 1 from public.pengguna where lower(email) = d.email) then
    begin
      insert into public.pengguna (email, nama, peran) values (d.email, n, 'staf');
      baru := true;
    exception when others then
      return jsonb_build_object('ok', false, 'pesan', 'Staf tercatat, tapi akun aplikasinya gagal dibuat: ' || sqlerrm);
    end;
  end if;
  update public.absen_daftar set status = 'disetujui', diputus_oleh = auth.email(), diputus = now() where id = p_id;
  insert into public.absen_log (aksi, isi) values ('daftar', jsonb_build_object('email', d.email, 'nama', n, 'lokasi_id', p_lokasi_id));
  return jsonb_build_object('ok', true, 'akun_baru', baru);
end $$;

-- Daftar pendaftaran untuk manajemen (yang menunggu + 30 hari terakhir).
create or replace function public.absen_daftar_list() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.absen_kelola() then return jsonb_build_object('ok', false, 'pesan', 'Khusus manajemen Moscow Supplies.'); end if;
  return jsonb_build_object('ok', true, 'daftar', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'email', email, 'nama', nama, 'status', status, 'dibuat', dibuat)
    order by (status = 'menunggu') desc, dibuat desc) from public.absen_daftar where status = 'menunggu' or dibuat > now() - interval '30 days'), '[]'::jsonb));
end $$;

revoke all on function public.absen_daftar_saya(), public.absen_daftar_ajukan(text), public.absen_daftar_putus(bigint, boolean, text, bigint), public.absen_daftar_list() from public, anon;
grant execute on function public.absen_daftar_saya(), public.absen_daftar_ajukan(text), public.absen_daftar_putus(bigint, boolean, text, bigint), public.absen_daftar_list() to authenticated;
