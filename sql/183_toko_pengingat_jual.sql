-- 183 (7 Nov 2026): pengingat isi penjualan harian untuk Consignment Medan, Sidoarjo, Renon, dan Toko Offline.
--  * Notifikasi HP tiap jam 09.00–17.00 WITA selama penjualan hari ini belum diisi / diupload / ditandai "tidak ada penjualan".
--  * Kotak peringatan di aplikasi toko (toko_lapor_status) + tombol "Hari ini tidak ada penjualan" (toko_lapor_nihil).
--  * Rekap 17.05 WITA ke grup Pemberitahuan Operasional (toko_lapor_rekap -> efek_antre 'tg').
-- Kunci notifikasi (VAPID) memakai absen_push_kunci yang sama dengan pengingat absen.

create table if not exists public.toko_push (
  id bigint generated always as identity primary key, toko text not null, email text, endpoint text not null unique,
  p256dh text not null, auth text not null, perangkat text, dibuat timestamptz not null default now());
alter table public.toko_push enable row level security;
revoke all on public.toko_push from anon, authenticated;

create table if not exists public.toko_lapor_nihil (
  toko text not null, tanggal date not null, oleh text, waktu timestamptz not null default now(), primary key (toko, tanggal));
alter table public.toko_lapor_nihil enable row level security;
revoke all on public.toko_lapor_nihil from anon, authenticated;

create table if not exists public.toko_pengingat_log (tanggal date not null, jam int not null, kirim int, waktu timestamptz default now(), primary key (tanggal, jam));
alter table public.toko_pengingat_log enable row level security;
revoke all on public.toko_pengingat_log from anon, authenticated;

-- Toko yang boleh dipakai akun ini: staf toko = lingkupnya; manajemen = toko yang diminta.
create or replace function public._toko_akun(p_toko text)
returns text language plpgsql stable security definer set search_path = public as $$
declare p text := public.peran_saya(); l text := public.lingkup_saya();
begin
  if p = 'toko' then return nullif(btrim(l), ''); end if;
  if p = 'manajemen' then return nullif(btrim(coalesce(p_toko, '')), ''); end if;
  return null;
end $$;

-- Sudah lapor hari ini? (ada penjualan diinput hari ini, penjualan bertanggal hari ini, atau ditandai tidak ada penjualan)
create or replace function public._toko_sudah_lapor(p_toko text, p_tgl date)
returns text language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from toko_lapor_nihil where toko = p_toko and tanggal = p_tgl) then 'nihil'
    when exists (select 1 from toko_jual_log where toko = p_toko and (tanggal = p_tgl or (waktu_masuk at time zone 'Asia/Makassar')::date = p_tgl)) then 'isi'
    else '' end
$$;

create or replace function public.toko_lapor_status(p_toko text)
returns json language plpgsql stable security definer set search_path = public as $$
declare t text := public._toko_akun(p_toko); hari date := (now() at time zone 'Asia/Makassar')::date; s text;
begin
  if t is null then return json_build_object('ok', false); end if;
  s := public._toko_sudah_lapor(t, hari);
  return json_build_object('ok', true, 'toko', t, 'tanggal', hari, 'status', s,
    'terakhir', (select max(tanggal) from toko_jual_log where toko = t),
    'jam', extract(hour from now() at time zone 'Asia/Makassar')::int);
end $$;

create or replace function public.toko_lapor_nihil(p_toko text, p_nama text)
returns json language plpgsql volatile security definer set search_path = public as $$
declare t text := public._toko_akun(p_toko); hari date := (now() at time zone 'Asia/Makassar')::date;
begin
  if t is null then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  insert into toko_lapor_nihil (toko, tanggal, oleh) values (t, hari, left(coalesce(nullif(btrim(p_nama), ''), public.lingkup_saya(), '-'), 60))
    on conflict (toko, tanggal) do nothing;
  return json_build_object('ok', true, 'pesan', 'Tercatat: hari ini tidak ada penjualan di ' || t || '.');
end $$;

create or replace function public.toko_push_simpan(p_toko text, p_endpoint text, p_p256dh text, p_auth text, p_perangkat text)
returns json language plpgsql volatile security definer set search_path = public as $$
declare t text := public._toko_akun(p_toko);
begin
  if t is null then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  if coalesce(p_endpoint, '') !~ '^https://' or length(coalesce(p_p256dh, '')) < 20 or length(coalesce(p_auth, '')) < 8 then
    return json_build_object('ok', false, 'pesan', 'Data notifikasi tidak lengkap.');
  end if;
  insert into toko_push (toko, email, endpoint, p256dh, auth, perangkat) values (t, auth.email(), p_endpoint, p_p256dh, p_auth, left(coalesce(p_perangkat, ''), 120))
    on conflict (endpoint) do update set toko = excluded.toko, email = excluded.email, p256dh = excluded.p256dh, auth = excluded.auth, perangkat = excluded.perangkat, dibuat = now();
  return json_build_object('ok', true);
end $$;

create or replace function public.toko_push_ada(p_toko text, p_endpoint text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from toko_push where endpoint = p_endpoint and toko = public._toko_akun(p_toko))
$$;

create or replace function public.toko_push_hapus(p_endpoint text)
returns json language plpgsql volatile security definer set search_path = public as $$
begin
  if public.peran_saya() not in ('toko', 'manajemen') then return json_build_object('ok', false); end if;
  delete from toko_push where endpoint = p_endpoint;
  return json_build_object('ok', true);
end $$;

-- Dipanggil Edge Function absen-pengingat {"jenis":"jual"}: daftar HP toko yang belum lapor hari ini, jam 9–17 WITA, sekali per jam.
create or replace function public.toko_pengingat_target()
returns json language plpgsql volatile security definer set search_path = public as $$
declare hari date := (now() at time zone 'Asia/Makassar')::date; j int := extract(hour from now() at time zone 'Asia/Makassar')::int; n int;
begin
  if j < 9 or j > 17 then return json_build_object('ok', false, 'pesan', 'Di luar jam 09–17 WITA.'); end if;
  insert into toko_pengingat_log (tanggal, jam) values (hari, j) on conflict do nothing;
  get diagnostics n = row_count;
  if n = 0 then return json_build_object('ok', false, 'pesan', 'Jam ini sudah dikirim.'); end if;
  return json_build_object('ok', true, 'jam', j, 'target', coalesce((
    select json_agg(json_build_object('endpoint', p.endpoint, 'p256dh', p.p256dh, 'auth', p.auth, 'toko', p.toko))
      from toko_push p where public._toko_sudah_lapor(p.toko, hari) = ''), '[]'::json));
end $$;

create or replace function public.toko_pengingat_catat(p_jam int, p_kirim int)
returns void language sql volatile security definer set search_path = public as $$
  update toko_pengingat_log set kirim = p_kirim where tanggal = (now() at time zone 'Asia/Makassar')::date and jam = p_jam
$$;

-- Rekap 17.05 WITA ke grup Pemberitahuan Operasional.
create or replace function public.toko_lapor_rekap()
returns void language plpgsql volatile security definer set search_path = public as $$
declare hari date := (now() at time zone 'Asia/Makassar')::date; t text; s text; baris text := ''; belum int := 0; hp int;
begin
  foreach t in array array['Consignment Medan', 'Consignment Sidoarjo', 'Consignment Renon', 'Toko Offline'] loop
    s := public._toko_sudah_lapor(t, hari);
    hp := (select count(*) from toko_push where toko = t);
    if s = '' then belum := belum + 1; end if;
    baris := baris || E'\n' || case s when 'isi' then '✅ ' when 'nihil' then '➖ ' else '❌ ' end || t || ': ' ||
      case s when 'isi' then 'sudah lapor' when 'nihil' then 'tidak ada penjualan' else '<b>belum lapor</b>' end ||
      case when hp = 0 then ' <i>(notifikasi HP belum diaktifkan)</i>' else '' end;
  end loop;
  insert into efek_antre (jenis, data) values ('tg', jsonb_build_object('teks',
    '🧾 <b>Laporan penjualan toko hari ini</b> (' || to_char(hari, 'DD/MM/YYYY') || ')' || baris ||
    case when belum > 0 then E'\n\n' || belum || ' toko belum mengisi penjualan hari ini.' else E'\n\nSemua toko sudah lapor 👍' end ||
    E'\nOleh: Admin Accounting'));
end $$;

revoke all on function public._toko_akun(text), public._toko_sudah_lapor(text, date), public.toko_pengingat_target(), public.toko_pengingat_catat(int, int), public.toko_lapor_rekap() from public, anon, authenticated;
revoke all on function public.toko_lapor_status(text), public.toko_lapor_nihil(text, text), public.toko_push_simpan(text, text, text, text, text), public.toko_push_ada(text, text), public.toko_push_hapus(text) from public, anon;
grant execute on function public.toko_lapor_status(text), public.toko_lapor_nihil(text, text), public.toko_push_simpan(text, text, text, text, text), public.toko_push_ada(text, text), public.toko_push_hapus(text) to authenticated;
grant execute on function public.toko_pengingat_target(), public.toko_pengingat_catat(int, int) to service_role;

-- Jadwal: tiap jam 09.00–17.00 WITA (01–09 UTC) dan rekap 17.05 WITA.
select cron.schedule('toko-pengingat-jual', '0 1-9 * * *', $c$
  select net.http_post(url := 'https://ufhuvwfudblbyrwzugaa.supabase.co/functions/v1/absen-pengingat',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-moscow-pengingat', '1'),
    body := '{"jenis": "jual"}'::jsonb, timeout_milliseconds := 60000)
$c$);
select cron.schedule('toko-lapor-rekap', '5 9 * * *', $c$ select public.toko_lapor_rekap() $c$);
