-- 189 (9 Nov 2026): Peringatan darurat juga tampil untuk Mike & Junior (aplikasi Kendali Bisnis).
-- Sumber: daftar tindakan agen (gm_tindakan) prioritas 1 yang masih terbuka + ringkasan pagi Penjaga bisnis terakhir.
-- Mike / Junior bisa memberi tanggapan; tanggapan tersimpan di catatan tindakan dan dikirim ke Telegram.

create or replace function public.peringatan_data()
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not public._boleh_peran(array['kendali_bisnis', 'accounting']) then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  return json_build_object('ok', true,
    'darurat', coalesce((select json_agg(json_build_object('id', id, 'judul', judul, 'ket', ket, 'sumber', sumber, 'tenggat', tenggat,
                  'dibuat', dibuat, 'catatan', catatan) order by tenggat nulls last, id desc)
                from gm_tindakan where status = 'buka' and prioritas <= 1), '[]'),
    'lain', coalesce((select json_agg(json_build_object('id', id, 'judul', judul, 'tenggat', tenggat, 'prioritas', prioritas) order by prioritas, tenggat nulls last)
                from gm_tindakan where status = 'buka' and prioritas = 2), '[]'),
    'pagi', (select json_build_object('waktu', waktu, 'status', status, 'ringkas', ringkas, 'tindakan', tindakan)
               from penjaga_bisnis_log where waktu > now() - interval '36 hours' order by waktu desc limit 1),
    'selesai', coalesce((select json_agg(json_build_object('judul', judul, 'waktu', selesai_waktu) order by selesai_waktu desc)
                from (select * from gm_tindakan where status = 'selesai' and prioritas <= 1 and selesai_waktu > now() - interval '7 days' order by selesai_waktu desc limit 10) z), '[]'));
end $$;
revoke all on function public.peringatan_data() from public, anon;
grant execute on function public.peringatan_data() to authenticated;

create or replace function public.peringatan_tanggapi(p_id bigint, p_teks text, p_nama text)
returns json language plpgsql volatile security definer set search_path = public as $$
declare t text := left(btrim(coalesce(p_teks, '')), 500); n text := left(btrim(coalesce(nullif(p_nama, ''), auth.email(), '')), 40); j text;
  cap text := to_char(now() at time zone 'Asia/Makassar', 'DD/MM HH24:MI');
begin
  if not public._boleh_peran(array['kendali_bisnis']) then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  if length(t) < 2 then return json_build_object('ok', false, 'pesan', 'Tulis tanggapannya dulu.'); end if;
  update gm_tindakan set catatan = left(coalesce(catatan || E'\n', '') || '[' || cap || ' ' || n || '] ' || t, 4000)
   where id = p_id and status = 'buka' returning judul into j;
  if j is null then return json_build_object('ok', false, 'pesan', 'Peringatan tidak ditemukan atau sudah selesai.'); end if;
  insert into efek_antre (jenis, data) values ('tg', jsonb_build_object('teks',
    '💬 <b>Tanggapan peringatan</b>' || E'\n' || public._tg_esc(j) || E'\n\n' || public._tg_esc(n) || ': ' || public._tg_esc(t)));
  return json_build_object('ok', true, 'pesan', 'Tanggapan terkirim.');
end $$;
revoke all on function public.peringatan_tanggapi(bigint, text, text) from public, anon;
grant execute on function public.peringatan_tanggapi(bigint, text, text) to authenticated;

-- Telegram (grup Pemberitahuan) setiap ada peringatan darurat baru, dan saat peringatan darurat selesai ditangani.
create or replace function public._gm_tindakan_tg()
returns trigger language plpgsql security definer set search_path = public as $$
declare teks text;
begin
  if new.status = 'buka' and new.prioritas <= 1 and (tg_op = 'INSERT' or old.prioritas > 1 or old.status <> 'buka') then
    teks := '🚨 <b>PERINGATAN DARURAT</b>' || E'\n' || public._tg_esc(new.judul) ||
      case when coalesce(new.ket, '') <> '' then E'\n\n' || public._tg_esc(left(new.ket, 900)) else '' end ||
      case when new.tenggat is not null then E'\n\nTenggat: ' || to_char(new.tenggat, 'DD/MM/YYYY') else '' end ||
      E'\n\n<i>Beri tanggapan di aplikasi Kendali Bisnis › Peringatan darurat.</i>';
  elsif tg_op = 'UPDATE' and old.status = 'buka' and new.status = 'selesai' and old.prioritas <= 1 then
    teks := '✅ <b>Peringatan darurat selesai ditangani</b>' || E'\n' || public._tg_esc(new.judul);
  end if;
  if teks is not null then insert into efek_antre (jenis, data) values ('tg', jsonb_build_object('teks', teks)); end if;
  return new;
end $$;
drop trigger if exists gm_tindakan_tg on public.gm_tindakan;
create trigger gm_tindakan_tg after insert or update of status, prioritas on public.gm_tindakan for each row execute function public._gm_tindakan_tg();
