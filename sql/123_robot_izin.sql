-- 123: robot hitung-potret (kunci server) boleh menjalankan fungsi baca yang dipakai rumus aplikasi.
--  Fungsi-fungsi ini sebelumnya hanya diberikan ke 'authenticated'; kunci server sudah bisa membaca semua tabel yang sama.
do $x$
declare f record;
begin
  for f in select p.oid::regprocedure sig from pg_proc p
            where p.pronamespace = 'public'::regnamespace
              and p.proname in ('lembar_baca', 'akunting_baca', 'hpp_staf', 'pengadaan_robot', 'produksi_awal', 'toko_bahan_bagi_hasil',
                                'toko_stok_hitung', 'toko_hitung_warna', 'ttp_pemilik_data', 'peran_saya', 'lingkup_saya', 'kp_ajuan')
  loop
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $x$;
select 'ok123' ok;
