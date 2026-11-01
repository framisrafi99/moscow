-- 127: jadwal robot kirim-telegram tiap menit (antrean efek_antre jenis tg, pl_viory, tg_kirim, terima_selisih).
do $x$ begin
  if exists (select 1 from cron.job where jobname = 'kirim-telegram') then perform cron.unschedule('kirim-telegram'); end if;
end $x$;
select cron.schedule('kirim-telegram', '* * * * *', $$
  select net.http_post(url := 'https://ufhuvwfudblbyrwzugaa.supabase.co/functions/v1/kirim-telegram',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-moscow-robot-kunci', (select kunci from public.robot_kunci where id = 1)),
    body := '{}'::jsonb, timeout_milliseconds := 60000)
  where exists (select 1 from public.efek_antre where selesai is null and jenis in ('tg', 'pl_viory', 'tg_kirim', 'terima_selisih'))
$$);
select 'ok127' ok;
