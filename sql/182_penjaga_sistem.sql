-- 182 (6 Nov 2026): Master Data > Penjaga sistem. penjaga_log diisi agen terjadwal "Penjaga sistem Moscow" (tiap 4 jam);
-- sistem_kesehatan() merangkum jadwal pg_cron, error pg_net, kapasitas, antrean, dan 30 log agen terakhir (manajemen saja).
create table if not exists public.penjaga_log (id bigint generated always as identity primary key, waktu timestamptz not null default now(),
  status text not null default 'sehat', ringkas text, rinci text, diperbaiki text, perlu_keputusan text);
-- status: sehat | diperbaiki | perlu_keputusan | mendesak
alter table public.penjaga_log enable row level security;
revoke all on public.penjaga_log from anon, authenticated;
grant select on public.penjaga_log to authenticated;
create policy penjaga_log_baca on public.penjaga_log for select to authenticated using (public._boleh_peran(array['manajemen']));
-- sistem_kesehatan(): lihat definisi di database (create or replace function public.sistem_kesehatan() ... security definer, search_path public, cron, net).
