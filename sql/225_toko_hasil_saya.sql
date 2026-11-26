-- 26 Nov 2026: Dashboard Toko Offline menampilkan omzet, HPP barang terjual, laba kotor, biaya toko, profit bersih.
-- Angka diambil dari hasil_hitung 'thp:<toko>:<bulan>' (dihitung hitung-potret, rumus sama dengan Hasil penjualan Master Data).
create or replace function public.toko_hasil_saya(p_toko text, p_bulan text)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $f$
declare pr text := public.peran_saya(); tk text := btrim(coalesce(p_toko, '')); b text := left(btrim(coalesce(p_bulan, '')), 7); d jsonb; w timestamptz;
begin
  if tk !~* 'offline' then return jsonb_build_object('ok', false, 'pesan', 'Hanya untuk toko offline.'); end if;
  if not (pr = any (array['manajemen','kendali_bisnis','accounting']) or (pr = 'toko' and tk = public.lingkup_saya())) then
    return jsonb_build_object('ok', false, 'pesan', 'Akses ditolak.');
  end if;
  if b !~ '^\d{4}-(0[1-9]|1[0-2])$' then b := to_char(now() at time zone 'Asia/Makassar', 'YYYY-MM'); end if;
  select data, dibuat into d, w from hasil_hitung where kunci = 'thp:' || tk || ':' || b;
  if d is null then return jsonb_build_object('ok', false, 'pesan', 'Hasil penjualan bulan ini belum dihitung. Coba lagi beberapa menit lagi.'); end if;
  return jsonb_build_object('ok', true, 'bulan', b, 'penjualan', d->'penjualan', 'retur', d->'retur', 'omzet', d->'omzet', 'hpp', d->'hpp',
    'kotor', d->'kotor', 'biaya', d->'biaya', 'profit', d->'profit', 'qty', d->'qty', 'tanpaHpp', coalesce(d->'tanpaHpp', '[]'::jsonb),
    'diperbarui', coalesce(d->>'diperbarui', to_char(w at time zone 'Asia/Makassar', 'DD/MM/YYYY HH24:MI')));
end $f$;
revoke all on function public.toko_hasil_saya(text, text) from public, anon;
grant execute on function public.toko_hasil_saya(text, text) to authenticated;
