-- 4 Nov 2026: tabel untuk tombol Setujui / Tolak Telegram di Supabase (Edge Function tg-tombol), pengganti sheet TG_ACC_LOG
-- dan Properti skrip TG_MANAJEMEN / TG_MIKE / TG_VIORY / TG_DAFTAR. Hanya dibaca Edge Function (tanpa akses aplikasi).
create table if not exists public.tg_acc_log (
  id text primary key, waktu timestamptz not null default now(), jenis text not null, nos text[] not null default '{}',
  chat text, msg text, status text not null default 'Menunggu', oleh text, waktu_putus timestamptz, catatan text);
create table if not exists public.tg_akun (peran text primary key, uid text not null, nama text, waktu timestamptz not null default now());
create table if not exists public.tg_sementara (kunci text primary key, data jsonb, kedaluwarsa timestamptz not null);
alter table public.tg_acc_log enable row level security;
alter table public.tg_akun enable row level security;
alter table public.tg_sementara enable row level security;
revoke all on public.tg_acc_log, public.tg_akun, public.tg_sementara from anon, authenticated;
insert into public.tg_sementara (kunci, data, kedaluwarsa) values ('webhook', jsonb_build_object('rahasia', encode(gen_random_bytes(24), 'hex')), '2999-01-01')
  on conflict (kunci) do nothing;
