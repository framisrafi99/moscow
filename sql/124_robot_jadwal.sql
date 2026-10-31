-- 124: jadwal robot hitung-potret tiap 10 menit (pengganti potret terjadwal Apps Script).
--  Tanda rahasia diambil langsung dari robot_kunci di dalam database (tidak pernah tertulis di sini).
do $x$ begin
  if exists (select 1 from cron.job where jobname = 'hitung-potret') then perform cron.unschedule('hitung-potret'); end if;
end $x$;
select cron.schedule('hitung-potret', '*/10 * * * *', $$
  select net.http_post(
    url := 'https://ufhuvwfudblbyrwzugaa.supabase.co/functions/v1/hitung-potret',
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'x-moscow-robot-kunci', (select kunci from public.robot_kunci where id = 1)),
    body := '{"simpan": true}'::jsonb,
    timeout_milliseconds := 150000)
$$);
select 'ok124' ok;
