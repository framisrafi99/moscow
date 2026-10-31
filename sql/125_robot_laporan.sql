-- 125: jadwal robot untuk laporan bulanan halaman Mike (berat, jadi dipanggil terpisah):
--  bulan ini tiap 30 menit (menit 3 dan 33), bulan lalu tiap 30 menit (menit 18 dan 48).
do $x$ begin
  if exists (select 1 from cron.job where jobname = 'hitung-potret-laporan') then perform cron.unschedule('hitung-potret-laporan'); end if;
  if exists (select 1 from cron.job where jobname = 'hitung-potret-laporan-lalu') then perform cron.unschedule('hitung-potret-laporan-lalu'); end if;
end $x$;
select cron.schedule('hitung-potret-laporan', '3,33 * * * *', $$
  select net.http_post(url := 'https://ufhuvwfudblbyrwzugaa.supabase.co/functions/v1/hitung-potret',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-moscow-robot-kunci', (select kunci from public.robot_kunci where id = 1)),
    body := '{"simpan": true, "kunci": ["laporan"]}'::jsonb, timeout_milliseconds := 150000)
$$);
select cron.schedule('hitung-potret-laporan-lalu', '18,48 * * * *', $$
  select net.http_post(url := 'https://ufhuvwfudblbyrwzugaa.supabase.co/functions/v1/hitung-potret',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-moscow-robot-kunci', (select kunci from public.robot_kunci where id = 1)),
    body := '{"simpan": true, "kunci": ["laporan:lalu"]}'::jsonb, timeout_milliseconds := 150000)
$$);
select 'ok125' ok;
