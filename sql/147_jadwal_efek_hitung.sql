-- 147 (4 Nov 2026): jadwal Edge Function efek-hitung (efek terima_po: Telegram barang supplier diterima + usulan HPP).
-- Apps Script melewati terima_po (SBE_SUPABASE_), kecuali barisnya sudah lebih dari 3 menit (cadangan).
select cron.schedule('efek-hitung', '* * * * *', $c$
  select net.http_post(url := 'https://ufhuvwfudblbyrwzugaa.supabase.co/functions/v1/efek-hitung',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-moscow-robot-kunci', (select kunci from public.robot_kunci where id = 1)),
    body := '{}'::jsonb, timeout_milliseconds := 120000)
  where exists (select 1 from public.efek_antre where selesai is null and jenis in ('terima_po'))
$c$);
