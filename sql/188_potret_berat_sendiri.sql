-- 188 (7 Nov 2026): robot hitung (hitung-potret) makin sering kehabisan tenaga (546 WORKER_RESOURCE_LIMIT / CPU Time exceeded),
-- sejak 7 Nov juga di malam hari. Satu panggilan yang lewat batas prosesor mematikan semua panggilan di mesin yang sama,
-- termasuk panggilan induk, jadi laporan bulanan & TPB ikut menjatuhkan hitungan lain.
--
-- Perubahan jadwal:
--   * hitung-potret-laporan      : laporan bulan ini dipanggil langsung sebagai satu bagian (sub: true), tanpa panggilan induk.
--   * hitung-potret-tpb          : sama, md:tpb dipanggil langsung sebagai satu bagian.
--   * hitung-potret-laporan-lalu : dilewati bila buku bulan lalu sudah Ditutup dan potretnya dibuat sesudah buku ditutup.
--                                  Tetap dihitung bila buku dibuka lagi / belum ditutup / potret belum ada, dan sekali tiap
--                                  malam (02:18 WITA) sebagai cadangan.
-- Dijalankan 7 Nov 2026 21:03 WITA.
-- Pasangannya: Edge Function hitung-potret v15 (tanpa coba ulang saat 546, 2 kelompok bersamaan, TPB tidak ikut laporan bulan lalu).

select cron.alter_job((select jobid from cron.job where jobname = 'hitung-potret-laporan'), command := $c$
  select net.http_post(url := 'https://ufhuvwfudblbyrwzugaa.supabase.co/functions/v1/hitung-potret',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-moscow-robot-kunci', (select kunci from public.robot_kunci where id = 1)),
    body := jsonb_build_object('simpan', true, 'sub', true, 'kunci', jsonb_build_array('laporan:' || to_char(now() at time zone 'Asia/Makassar', 'YYYY-MM'))),
    timeout_milliseconds := 150000)
$c$);

select cron.alter_job((select jobid from cron.job where jobname = 'hitung-potret-tpb'), command := $c$
  select net.http_post(url := 'https://ufhuvwfudblbyrwzugaa.supabase.co/functions/v1/hitung-potret',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-moscow-robot-kunci', (select kunci from public.robot_kunci where id = 1)),
    body := '{"simpan": true, "sub": true, "kunci": ["md:tpb"]}'::jsonb, timeout_milliseconds := 150000)
$c$);

select cron.alter_job((select jobid from cron.job where jobname = 'hitung-potret-laporan-lalu'), command := $c$
  with b as (select to_char(date_trunc('month', now() at time zone 'Asia/Makassar') - interval '1 month', 'YYYY-MM') bulan),
  t as (select tb.status, tb.waktu from public.tutup_buku tb, b where tb.bulan = b.bulan order by tb.waktu desc limit 1),
  p as (select h.dibuat from public.hasil_hitung h, b where h.kunci = 'laporan:' || b.bulan)
  select net.http_post(url := 'https://ufhuvwfudblbyrwzugaa.supabase.co/functions/v1/hitung-potret',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-moscow-robot-kunci', (select kunci from public.robot_kunci where id = 1)),
    body := jsonb_build_object('simpan', true, 'sub', true, 'kunci', jsonb_build_array('laporan:' || b.bulan)),
    timeout_milliseconds := 150000)
  from b
  where coalesce((select status from t), '') <> 'Ditutup'
     or not exists (select 1 from p)
     or (select dibuat from p) < (select waktu from t)
     or to_char(now() at time zone 'Asia/Makassar', 'HH24:MI') between '02:15' and '02:25'
$c$);
