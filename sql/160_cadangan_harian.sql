-- 5 Nov 2026: cadangan harian Supabase, pengganti CADANG_harian Apps Script (salinan file Sheets ke Drive).
-- * bucket Storage pribadi 'cadangan' (tidak publik).
-- * cadang_daftar(): daftar tabel public yang dicadangkan (tanpa robot_log, robot_kunci, absen_push_kunci, ubah_antre,
--   gas_pakai, tg_kirim_ganda, order_kode_salah, uji_tulis). Khusus service_role.
-- * Edge Function cadang-harian (supabase/functions/cadang-harian): cadangan/<yyyy-MM-dd>/<tabel>/<nnn>.json.gz,
--   1.000 baris per file; salinan lebih dari 30 hari dibuang. Hasil dicatat di robot_log (jenis 'cadangan').
-- * cron job 12 'cadang-harian': '30 18 * * *' (02.30 WITA).
-- Uji pertama 5 Nov: 96 tabel, 39.133 baris = jumlah baris sebenarnya, ±15 detik.
create or replace function public.cadang_daftar()
 returns json language sql stable security definer set search_path to 'public'
as $$
  select coalesce(json_agg(json_build_object('t', c.relname, 'n', greatest(c.reltuples, 0)::bigint) order by c.relname), '[]')
    from pg_class c join pg_namespace s on s.oid = c.relnamespace
   where s.nspname = 'public' and c.relkind = 'r'
     and c.relname not in ('robot_log', 'robot_kunci', 'absen_push_kunci', 'ubah_antre', 'gas_pakai', 'tg_kirim_ganda', 'order_kode_salah', 'uji_tulis')
$$;
