-- =====================================================================
-- ABSENSI: PENGINGAT NOTIFIKASI HP (absen masuk 09.50, absen pulang 17.00 WITA)
-- Jalankan sekali di Supabase SETELAH Edge Function "absen-pengingat" dipasang
-- (supabase/functions/absen-pengingat/index.ts). Aman dijalankan ulang.
--
-- Cara kerja:
--  - Staf menekan "Aktifkan pengingat" di aplikasi Absensi -> langganan HP disimpan di absen_push.
--  - Jadwal (pg_cron) memanggil Edge Function jam 09.50 & 17.00 WITA, Senin–Sabtu.
--  - Edge Function meminta daftar penerima ke absen_pengingat_target, lalu mengirim notifikasi.
--    Masuk  : staf aktif yang belum absen masuk dan tidak sedang izin/cuti/sakit.
--    Pulang : staf yang sudah absen masuk tapi belum absen pulang.
--  - Tiap jenis hanya dikirim sekali sehari dan hanya di jam yang ditentukan, jadi aman dipanggil berulang.
--  - Kunci pengirim (VAPID) dibuat sendiri oleh Edge Function dan disimpan di absen_push_kunci (tidak bisa dibaca staf).
-- =====================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists public.absen_push (
  id bigint generated always as identity primary key,
  staf_id bigint not null references public.absen_staf (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  perangkat text,
  dibuat timestamptz not null default now()
);
create table if not exists public.absen_push_kunci (
  id int primary key check (id = 1),
  publik text not null,
  privat text not null,
  dibuat timestamptz not null default now()
);
create table if not exists public.absen_pengingat_log (
  tanggal date not null,
  jenis text not null check (jenis in ('masuk', 'pulang')),
  penerima int not null default 0,
  waktu timestamptz not null default now(),
  primary key (tanggal, jenis)
);
alter table public.absen_push enable row level security;
alter table public.absen_push_kunci enable row level security;
alter table public.absen_pengingat_log enable row level security;
revoke all on public.absen_push, public.absen_push_kunci, public.absen_pengingat_log from anon, authenticated;
grant select, insert, update, delete on public.absen_push, public.absen_push_kunci, public.absen_pengingat_log to service_role;

-- Kunci publik untuk HP staf (null = Edge Function belum pernah dipanggil).
create or replace function public.absen_push_publik() returns text
language sql stable security definer set search_path = public as $$
  select publik from public.absen_push_kunci where id = 1
$$;

-- Simpan / hapus langganan notifikasi HP milik staf yang sedang masuk.
create or replace function public.absen_push_simpan(p_endpoint text, p_p256dh text, p_auth text, p_perangkat text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare s public.absen_staf;
begin
  s := public.absen_staf_saya();
  if s.id is null then return jsonb_build_object('ok', false, 'pesan', 'Akun ini belum terdaftar untuk absensi.'); end if;
  if coalesce(p_endpoint, '') !~ '^https://' or coalesce(p_p256dh, '') = '' or coalesce(p_auth, '') = '' then
    return jsonb_build_object('ok', false, 'pesan', 'Data notifikasi HP tidak lengkap.');
  end if;
  insert into public.absen_push (staf_id, endpoint, p256dh, auth, perangkat)
  values (s.id, p_endpoint, p_p256dh, p_auth, left(p_perangkat, 120))
  on conflict (endpoint) do update set staf_id = excluded.staf_id, p256dh = excluded.p256dh, auth = excluded.auth, perangkat = excluded.perangkat, dibuat = now();
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.absen_push_hapus(p_endpoint text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare s public.absen_staf;
begin
  s := public.absen_staf_saya();
  delete from public.absen_push where endpoint = p_endpoint and staf_id = s.id;
  return jsonb_build_object('ok', true);
end $$;

-- Daftar penerima untuk Edge Function (hanya service_role). Mengunci "sudah dikirim hari ini".
create or replace function public.absen_pengingat_target(p_jenis text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare tg date := public.absen_hari_ini(); jam int; mulai int; selesai int; hasil jsonb;
begin
  if p_jenis not in ('masuk', 'pulang') then return jsonb_build_object('ok', false, 'pesan', 'Jenis tidak dikenal.'); end if;
  jam := extract(hour from now() at time zone 'Asia/Makassar') * 60 + extract(minute from now() at time zone 'Asia/Makassar');
  -- jendela kirim: masuk 09.30–11.30, pulang 16.45–19.00 (WITA); hari Minggu tidak dikirim
  mulai := case p_jenis when 'masuk' then 570 else 1005 end;
  selesai := case p_jenis when 'masuk' then 690 else 1140 end;
  if jam < mulai or jam > selesai then return jsonb_build_object('ok', false, 'pesan', 'Di luar jam pengingat.'); end if;
  if extract(dow from tg) = 0 then return jsonb_build_object('ok', false, 'pesan', 'Hari libur.'); end if;
  insert into public.absen_pengingat_log (tanggal, jenis) values (tg, p_jenis) on conflict do nothing;
  if not found then return jsonb_build_object('ok', false, 'pesan', 'Pengingat ' || p_jenis || ' hari ini sudah dikirim.'); end if;

  select coalesce(jsonb_agg(jsonb_build_object('endpoint', p.endpoint, 'p256dh', p.p256dh, 'auth', p.auth, 'nama', s.nama)), '[]'::jsonb) into hasil
  from public.absen_push p
  join public.absen_staf s on s.id = p.staf_id and s.aktif
  left join public.absen_hari h on h.staf_id = s.id and h.tanggal = tg
  where case when p_jenis = 'masuk' then h.masuk is null
               and not exists (select 1 from public.absen_izin i where i.staf_id = s.id and i.status = 'disetujui' and tg between i.mulai and i.selesai)
             else h.masuk is not null and h.pulang is null end;
  update public.absen_pengingat_log set penerima = jsonb_array_length(hasil) where tanggal = tg and jenis = p_jenis;
  return jsonb_build_object('ok', true, 'jenis', p_jenis, 'uji', public.absen_uji_ket(tg), 'target', hasil);
end $$;

revoke all on function public.absen_push_publik(), public.absen_push_simpan(text, text, text, text), public.absen_push_hapus(text),
  public.absen_pengingat_target(text) from public, anon;
grant execute on function public.absen_push_publik(), public.absen_push_simpan(text, text, text, text), public.absen_push_hapus(text) to authenticated;
revoke all on function public.absen_pengingat_target(text) from authenticated;
grant execute on function public.absen_pengingat_target(text) to service_role;

-- Jadwal (jam server = UTC): 09.50 WITA = 01.50 UTC, 17.00 WITA = 09.00 UTC, Senin–Sabtu.
do $$
declare j record;
begin
  for j in select jobid from cron.job where jobname in ('absen-pengingat-masuk', 'absen-pengingat-pulang') loop
    perform cron.unschedule(j.jobid);
  end loop;
end $$;
select cron.schedule('absen-pengingat-masuk', '50 1 * * 1-6',
  $$select net.http_post(url := 'https://ufhuvwfudblbyrwzugaa.supabase.co/functions/v1/absen-pengingat',
    headers := '{"Content-Type": "application/json"}'::jsonb, body := '{"jenis": "masuk"}'::jsonb)$$);
select cron.schedule('absen-pengingat-pulang', '0 9 * * 1-6',
  $$select net.http_post(url := 'https://ufhuvwfudblbyrwzugaa.supabase.co/functions/v1/absen-pengingat',
    headers := '{"Content-Type": "application/json"}'::jsonb, body := '{"jenis": "pulang"}'::jsonb)$$);

-- Panggil sekali supaya Edge Function membuat kunci pengirim (VAPID).
select net.http_post(url := 'https://ufhuvwfudblbyrwzugaa.supabase.co/functions/v1/absen-pengingat',
  headers := '{"Content-Type": "application/json"}'::jsonb, body := '{"siapkan": true}'::jsonb);
