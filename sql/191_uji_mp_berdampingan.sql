-- 191 (7 Nov 2026): uji berdampingan tahap B langkah 1 (penjualan marketplace dijumlah di database, SQL 190).
-- Tiga menit sesudah laporan bulan ini (:03/:33) dan TPB (:25/:55) disimpan dengan cara lama, robot menghitung ulang
-- dengan cara baru dalam mode banding (tidak menyimpan) lalu mencatat perbedaannya di robot_log jenis 'uji:mpdb'.
-- Kalau 3 hari berturut-turut tidak ada perbedaan (selain yang dijelaskan data baru masuk), cara baru dipakai untuk
-- menyimpan dan jadwal uji ini dihentikan (cron.unschedule('hitung-potret-uji-mp')).
select cron.schedule('hitung-potret-uji-mp', '6,28,36,58 * * * *', $c$
  select net.http_post(url := 'https://ufhuvwfudblbyrwzugaa.supabase.co/functions/v1/hitung-potret',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-moscow-robot-kunci', (select kunci from public.robot_kunci where id = 1)),
    body := jsonb_build_object('simpan', false, 'sub', true, 'uji', 'mpdb',
      'kunci', case when extract(minute from now()) in (6, 36)
                    then jsonb_build_array('laporan:' || to_char(now() at time zone 'Asia/Makassar', 'YYYY-MM'))
                    else jsonb_build_array('md:tpb') end),
    timeout_milliseconds := 150000)
$c$);
