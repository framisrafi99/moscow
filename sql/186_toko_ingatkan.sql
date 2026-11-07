-- 186 (7 Nov 2026): Beranda Master Data › Perlu perhatian › "<toko> belum lapor N hari" bisa langsung ditindak:
--  * toko_lapor_status: tambah 'hp' = jumlah HP toko yang sudah mengaktifkan pengingat.
--  * toko_ingatkan(p_toko): manajemen mengirim notifikasi pengingat ke HP toko itu sekarang (Edge Function absen-pengingat).
--  * toko_pengingat_satu(p_toko): daftar HP satu toko untuk Edge Function (service_role).

create or replace function public.toko_lapor_status(p_toko text)
returns json language plpgsql stable security definer set search_path = public as $$
declare t text := public._toko_akun(p_toko); hari date := (now() at time zone 'Asia/Makassar')::date; s text;
begin
  if t is null then return json_build_object('ok', false); end if;
  s := public._toko_sudah_lapor(t, hari);
  return json_build_object('ok', true, 'toko', t, 'tanggal', hari, 'status', s,
    'terakhir', (select max(tanggal) from toko_jual_log where toko = t),
    'jam', extract(hour from now() at time zone 'Asia/Makassar')::int,
    'hp', (select count(*) from toko_push where toko = t));
end $$;

create table if not exists public.toko_ingat_log (toko text primary key, waktu timestamptz not null);
alter table public.toko_ingat_log enable row level security;
revoke all on public.toko_ingat_log from anon, authenticated;

-- Paling sering sekali per 5 menit per toko (Edge Function bisa dipanggil siapa pun yang tahu headernya).
create or replace function public.toko_pengingat_satu(p_toko text)
returns json language plpgsql volatile security definer set search_path = public as $$
begin
  if exists (select 1 from toko_ingat_log where toko = p_toko and waktu > now() - interval '5 minutes') then return '[]'::json; end if;
  insert into toko_ingat_log (toko, waktu) values (p_toko, now()) on conflict (toko) do update set waktu = excluded.waktu;
  return coalesce((select json_agg(json_build_object('endpoint', endpoint, 'p256dh', p256dh, 'auth', auth, 'toko', toko)) from toko_push where toko = p_toko), '[]'::json);
end $$;
revoke all on function public.toko_pengingat_satu(text) from public, anon, authenticated;
grant execute on function public.toko_pengingat_satu(text) to service_role;

create or replace function public.toko_ingatkan(p_toko text)
returns json language plpgsql volatile security definer set search_path = public as $$
declare t text := btrim(coalesce(p_toko, '')); n int;
begin
  if coalesce(public.peran_saya(), '') <> 'manajemen' then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  if t not in ('Consignment Medan', 'Consignment Sidoarjo', 'Consignment Renon', 'Toko Offline') then
    return json_build_object('ok', false, 'pesan', 'Toko tidak dikenal.');
  end if;
  if exists (select 1 from toko_ingat_log where toko = t and waktu > now() - interval '5 minutes') then
    return json_build_object('ok', false, 'pesan', 'Pengingat ke ' || t || ' baru saja dikirim. Coba lagi 5 menit lagi.');
  end if;
  select count(*) into n from toko_push where toko = t;
  if n = 0 then return json_build_object('ok', false, 'hp', 0, 'pesan', 'HP ' || t || ' belum mengaktifkan pengingat, jadi notifikasi belum bisa dikirim.'); end if;
  perform net.http_post(url := 'https://ufhuvwfudblbyrwzugaa.supabase.co/functions/v1/absen-pengingat',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-moscow-pengingat', '1'),
    body := jsonb_build_object('jenis', 'jual', 'toko', t), timeout_milliseconds := 30000);
  return json_build_object('ok', true, 'hp', n, 'pesan', 'Pengingat dikirim ke ' || n || ' HP ' || t || '.');
end $$;
revoke all on function public.toko_ingatkan(text) from public, anon;
grant execute on function public.toko_ingatkan(text) to authenticated;
