-- =====================================================================
-- ABSENSI: PENGINGAT NOTIFIKASI HP (10 menit sebelum jam masuk, dan saat jam pulang, per staf)
-- Jalankan sekali di Supabase SETELAH Edge Function "absen-pengingat" dipasang
-- (supabase/functions/absen-pengingat/index.ts). Aman dijalankan ulang.
--
-- Cara kerja:
--  - Staf menekan "Aktifkan pengingat" di aplikasi Absensi -> langganan HP disimpan di absen_push.
--  - Jadwal (pg_cron) memanggil Edge Function tiap 10 menit (09.00–19.59 WITA), Senin–Sabtu.
--  - Edge Function meminta daftar penerima ke absen_pengingat_target, lalu mengirim notifikasi.
--    Masuk  : staf aktif yang belum absen masuk dan tidak sedang izin/cuti/sakit.
--    Pulang : staf yang sudah absen masuk tapi belum absen pulang.
--  - Tiap staf hanya dikirimi sekali per jenis per hari, sesuai jam kerjanya, jadi aman dipanggil berulang.
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
-- Pengaman: setiap panggilan ke layanan pengingat dicatat. Lebih dari 20 panggilan sehari = dianggap aneh,
-- pengiriman dihentikan sampai besok dan manajemen melihat peringatan di Payroll › Absensi staf.
create table if not exists public.absen_pengingat_panggil (
  id bigint generated always as identity primary key,
  tanggal date not null default ((now() at time zone 'Asia/Makassar')::date),
  jenis text,
  hasil text,
  waktu timestamptz not null default now()
);
create index if not exists absen_pengingat_panggil_tgl on public.absen_pengingat_panggil (tanggal);
alter table public.absen_pengingat_panggil enable row level security;
revoke all on public.absen_pengingat_panggil from anon, authenticated;
grant select, insert, delete on public.absen_pengingat_panggil to service_role;

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
-- Pengingat per staf mengikuti jam kerja masing-masing (absen_staf.jam_masuk / jam_pulang):
--   masuk  : mulai 10 menit sebelum jam masuk (sampai 30 menit sesudahnya), kalau belum absen masuk dan tidak izin/cuti/sakit
--   pulang : mulai jam pulang (sampai 60 menit sesudahnya), kalau sudah absen masuk tapi belum absen pulang
-- Dipanggil jadwal tiap 10 menit; tiap staf hanya dikirimi sekali per jenis per hari (absen_pengingat_kirim).
create table if not exists public.absen_pengingat_kirim (
  tanggal date not null,
  staf_id bigint not null references public.absen_staf (id) on delete cascade,
  jenis text not null check (jenis in ('masuk', 'pulang')),
  waktu timestamptz not null default now(),
  primary key (tanggal, staf_id, jenis)
);
alter table public.absen_pengingat_kirim enable row level security;
revoke all on public.absen_pengingat_kirim from anon, authenticated;
grant select, insert, delete on public.absen_pengingat_kirim to service_role;

create or replace function public.absen_pengingat_target(p_jenis text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare tg date := public.absen_hari_ini(); jam int; hasil jsonb; pilih bigint[];
begin
  -- catat panggilan + pemutus: normal ±135 panggilan sehari (2 jenis x tiap 10 menit); lebih dari 200 = aneh, berhenti
  insert into public.absen_pengingat_panggil (tanggal, jenis) values (tg, left(coalesce(p_jenis, ''), 20));
  delete from public.absen_pengingat_panggil where tanggal < tg - 30;
  if (select count(*) from public.absen_pengingat_panggil where tanggal = tg) > 200 then
    return jsonb_build_object('ok', false, 'pesan', 'Terlalu banyak panggilan hari ini, pengingat dihentikan sampai besok.');
  end if;
  if p_jenis not in ('masuk', 'pulang') then return jsonb_build_object('ok', false, 'pesan', 'Jenis tidak dikenal.'); end if;
  if extract(dow from tg) = 0 then return jsonb_build_object('ok', false, 'pesan', 'Hari libur.'); end if;
  jam := extract(hour from now() at time zone 'Asia/Makassar') * 60 + extract(minute from now() at time zone 'Asia/Makassar');

  select array_agg(s.id) into pilih
  from public.absen_staf s
  left join public.absen_hari h on h.staf_id = s.id and h.tanggal = tg
  where s.aktif
    and exists (select 1 from public.absen_push p where p.staf_id = s.id)
    and not exists (select 1 from public.absen_pengingat_kirim k where k.tanggal = tg and k.staf_id = s.id and k.jenis = p_jenis)
    and case when p_jenis = 'masuk' then
           jam between (extract(hour from s.jam_masuk) * 60 + extract(minute from s.jam_masuk)) - 10
                   and (extract(hour from s.jam_masuk) * 60 + extract(minute from s.jam_masuk)) + 30
           and h.masuk is null
           and not exists (select 1 from public.absen_izin i where i.staf_id = s.id and i.status = 'disetujui' and tg between i.mulai and i.selesai)
         else
           jam between (extract(hour from s.jam_pulang) * 60 + extract(minute from s.jam_pulang))
                   and (extract(hour from s.jam_pulang) * 60 + extract(minute from s.jam_pulang)) + 60
           and h.masuk is not null and h.pulang is null
         end;
  if pilih is null then return jsonb_build_object('ok', true, 'jenis', p_jenis, 'target', '[]'::jsonb); end if;

  insert into public.absen_pengingat_kirim (tanggal, staf_id, jenis) select tg, unnest(pilih), p_jenis on conflict do nothing;
  select coalesce(jsonb_agg(jsonb_build_object('endpoint', p.endpoint, 'p256dh', p.p256dh, 'auth', p.auth)), '[]'::jsonb) into hasil
  from public.absen_push p where p.staf_id = any (pilih);
  insert into public.absen_pengingat_log (tanggal, jenis, penerima) values (tg, p_jenis, array_length(pilih, 1))
  on conflict (tanggal, jenis) do update set penerima = public.absen_pengingat_log.penerima + excluded.penerima, waktu = now();
  return jsonb_build_object('ok', true, 'jenis', p_jenis, 'uji', public.absen_uji_ket(tg), 'target', hasil);
end $$;

-- Ringkasan pengingat untuk manajemen (Payroll › Absensi staf).
create or replace function public.absen_pengingat_info(p_tanggal date) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.absen_kelola() then return jsonb_build_object('ok', false, 'pesan', 'Khusus manajemen Moscow Supplies.'); end if;
  return jsonb_build_object('ok', true,
    'hp', (select count(distinct staf_id) from public.absen_push),
    'kirim', coalesce((select jsonb_object_agg(jenis, n) from (select jenis, count(*) n from public.absen_pengingat_kirim where tanggal = p_tanggal group by jenis) x), '{}'::jsonb),
    'panggil', (select count(*) from public.absen_pengingat_panggil where tanggal = p_tanggal));
end $$;
grant execute on function public.absen_pengingat_info(date) to authenticated;
revoke all on function public.absen_pengingat_info(date) from public, anon;

revoke all on function public.absen_push_publik(), public.absen_push_simpan(text, text, text, text), public.absen_push_hapus(text),
  public.absen_pengingat_target(text) from public, anon;
grant execute on function public.absen_push_publik(), public.absen_push_simpan(text, text, text, text), public.absen_push_hapus(text) to authenticated;
revoke all on function public.absen_pengingat_target(text) from authenticated;
grant execute on function public.absen_pengingat_target(text) to service_role;

-- Jadwal (jam server = UTC): tiap 10 menit, 09.00–19.59 WITA = 01.00–11.59 UTC, Senin–Sabtu.
-- Database yang menentukan siapa dikirimi sesuai jam kerja masing-masing.
do $$
declare j record;
begin
  for j in select jobid from cron.job where jobname in ('absen-pengingat-masuk', 'absen-pengingat-pulang') loop
    perform cron.unschedule(j.jobid);
  end loop;
end $$;
select cron.schedule('absen-pengingat-masuk', '*/10 1-11 * * 1-6',
  $$select net.http_post(url := 'https://ufhuvwfudblbyrwzugaa.supabase.co/functions/v1/absen-pengingat',
    headers := '{"Content-Type": "application/json", "X-Moscow-Pengingat": "1"}'::jsonb, body := '{"jenis": "masuk"}'::jsonb)$$);
select cron.schedule('absen-pengingat-pulang', '*/10 1-11 * * 1-6',
  $$select net.http_post(url := 'https://ufhuvwfudblbyrwzugaa.supabase.co/functions/v1/absen-pengingat',
    headers := '{"Content-Type": "application/json", "X-Moscow-Pengingat": "1"}'::jsonb, body := '{"jenis": "pulang"}'::jsonb)$$);

-- Panggil sekali supaya Edge Function membuat kunci pengirim (VAPID).
select net.http_post(url := 'https://ufhuvwfudblbyrwzugaa.supabase.co/functions/v1/absen-pengingat',
  headers := '{"Content-Type": "application/json", "X-Moscow-Pengingat": "1"}'::jsonb, body := '{"siapkan": true}'::jsonb);
