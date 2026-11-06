-- 181 (6 Nov 2026): potret laporan bulan lalu + tutup buku dalam satu panggilan hitung-potret melebihi batas memori
-- Edge Function (WORKER_RESOURCE_LIMIT, gagal tiap 30 menit sejak 6 Nov 15:48). Dipisah:
--   hitung-potret-laporan-lalu : kunci 'laporan:<bulan lalu>' (eksplisit, tidak ikut md:tpb)
--   hitung-potret-tpb          : kunci 'md:tpb' tiap 25,55
-- Izin yang kurang (ditemukan dari log): tutup_buku dibaca Master Data / Kendali, sequence antrean untuk service_role.
grant usage, select on sequence public.efek_antre_id_seq to service_role;
grant usage, select on sequence public.ubah_antre_id_seq to service_role;
grant select on public.tutup_buku to authenticated;
drop policy if exists tutup_buku_baca on public.tutup_buku;
create policy tutup_buku_baca on public.tutup_buku for select to authenticated using (public._boleh_peran(array['manajemen','kendali_bisnis']));
select cron.alter_job((select jobid from cron.job where jobname='hitung-potret-laporan-lalu'), command := $c$
  select net.http_post(url := 'https://ufhuvwfudblbyrwzugaa.supabase.co/functions/v1/hitung-potret',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-moscow-robot-kunci', (select kunci from public.robot_kunci where id = 1)),
    body := jsonb_build_object('simpan', true, 'kunci', jsonb_build_array('laporan:' || to_char(date_trunc('month', now() at time zone 'Asia/Makassar') - interval '1 month', 'YYYY-MM'))),
    timeout_milliseconds := 150000)
$c$);
select cron.schedule('hitung-potret-tpb', '25,55 * * * *', $c$
  select net.http_post(url := 'https://ufhuvwfudblbyrwzugaa.supabase.co/functions/v1/hitung-potret',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-moscow-robot-kunci', (select kunci from public.robot_kunci where id = 1)),
    body := '{"simpan": true, "kunci": ["md:tpb"]}'::jsonb, timeout_milliseconds := 150000)
$c$);
