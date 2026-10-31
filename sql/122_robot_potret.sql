-- 122: robot hitung di Supabase (Edge Function "hitung-potret") pengganti jadwal potret Apps Script.
--  1. peran_saya(): panggilan kunci server (service_role) yang ditandai header x-moscow-robot: potret dianggap manajemen,
--     supaya fungsi-fungsi baca yang memeriksa peran bisa dipakai robot. Kunci server memang sudah melewati semua RLS,
--     jadi ini tidak menambah hak siapa pun; panggilan Apps Script (tanpa header itu) tidak berubah.
--  2. robot_kunci: tanda rahasia acak untuk jadwal pg_cron -> Edge Function (dibuat di database, tidak pernah ditampilkan).
create or replace function public.peran_saya()
returns text language sql stable security definer set search_path to '' as $$
  select case
    when auth.role() = 'service_role'
         and coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-moscow-robot', '') = 'potret' then 'manajemen'
    else (select p.peran from public.pengguna p
           where p.aktif and p.email = lower(coalesce(auth.jwt() ->> 'email', ''))
             and coalesce((auth.jwt() -> 'user_metadata' ->> 'email_verified')::boolean, true))
  end
$$;

create table if not exists public.robot_kunci (id int primary key, kunci text not null, dibuat timestamptz not null default now());
alter table public.robot_kunci enable row level security;
revoke all on public.robot_kunci from anon, authenticated;
insert into public.robot_kunci (id, kunci) values (1, replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')) on conflict (id) do nothing;

-- Catatan jalannya robot (untuk dipantau): waktu, lama, kunci yang dihitung, yang gagal.
create table if not exists public.robot_log (id bigint generated always as identity primary key, waktu timestamptz not null default now(),
  jenis text, detik numeric, hasil jsonb);
alter table public.robot_log enable row level security;
revoke all on public.robot_log from anon, authenticated;
grant select on public.robot_log to authenticated;
do $x$ begin
  if not exists (select 1 from pg_policies where tablename = 'robot_log' and policyname = 'robot_log_baca') then
    create policy robot_log_baca on public.robot_log for select to authenticated using ((select public.peran_saya()) = 'manajemen');
  end if;
end $x$;
select 'ok122' ok;
