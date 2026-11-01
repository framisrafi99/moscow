-- 126: catatan pesan Telegram yang baru terkirim dari Supabase (pencegah pesan ganda 10 menit, sama dengan TG_kirim_ Apps Script).
create table if not exists public.tg_kirim_ganda (sidik text primary key, waktu timestamptz not null default now());
alter table public.tg_kirim_ganda enable row level security;
revoke all on public.tg_kirim_ganda from anon, authenticated;
select 'ok126' ok;
