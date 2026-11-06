-- 175 (6 Nov 2026): catatan tanya-jawab robot Bukti Bayar (masa transisi), untuk dicek manajemen.
create table if not exists public.bb_obrolan (id bigint generated always as identity primary key, waktu timestamptz not null default now(), uid text, nama text, tanya text, jawab text, bukti bigint);
alter table public.bb_obrolan enable row level security;
revoke all on public.bb_obrolan from anon, authenticated;
