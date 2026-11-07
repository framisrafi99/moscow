-- 189 (7 Nov 2026): Penjaga sistem ikut memeriksa umur hasil robot hitung (tabel hasil_hitung).
-- antrean.potret_basi        = jumlah potret yang terlambat: laporan bulan ini & md:tpb > 2 jam, potret jadwal 10 menit > 1 jam,
--                              laporan bulan lalu > 2 jam hanya bila bukunya belum Ditutup.
-- antrean.potret_basi_daftar = daftar kunci yang terlambat beserta jam terakhirnya (WITA).
-- Ditampilkan di Master Data > Penjaga sistem (jaga.js v2).
create or replace function public.sistem_kesehatan()
 returns json
 language plpgsql
 stable security definer
 set search_path to 'public', 'cron', 'net'
as $function$
declare j json; h json; k json; a json; l json; pb json;
  bln text := to_char(now() at time zone 'Asia/Makassar', 'YYYY-MM');
  bll text := to_char(date_trunc('month', now() at time zone 'Asia/Makassar') - interval '1 month', 'YYYY-MM');
begin
  if not public._boleh_peran(array['manajemen']) then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  select coalesce(json_agg(x order by x.gagal desc, x.nama), '[]') into j from (
    select jb.jobname nama, jb.schedule jadwal, jb.active aktif,
      count(d.*) jalan, count(d.*) filter (where d.status <> 'succeeded') gagal, max(d.start_time) terakhir
    from cron.job jb left join cron.job_run_details d on d.jobid = jb.jobid and d.start_time > now() - interval '24 hours'
    group by jb.jobname, jb.schedule, jb.active) x;
  select coalesce(json_agg(y order by y.jam desc), '[]') into h from (
    select to_char(date_trunc('hour', created at time zone 'Asia/Makassar'), 'DD/MM HH24:00') jam, status_code kode, count(*) n,
      left(max(coalesce(error_msg, content::text)), 160) contoh
    from net._http_response where created > now() - interval '24 hours' and (status_code is null or status_code <> 200)
    group by 1, 2) y;
  select json_build_object(
    'db_mb', round(pg_database_size(current_database()) / 1048576.0, 1), 'db_batas_mb', 8192,
    'file_mb', round(coalesce((select sum((metadata->>'size')::bigint) from storage.objects), 0) / 1048576.0, 1), 'file_batas_mb', 102400,
    'file_n', (select count(*) from storage.objects),
    'fungsi_hari', (select count(*) from net._http_response where created > now() - interval '24 hours'),
    'fungsi_batas_bulan', 2000000) into k;
  select coalesce(json_agg(json_build_object('k', p.kunci, 'w', to_char(p.dibuat at time zone 'Asia/Makassar', 'DD/MM HH24:MI')) order by p.dibuat), '[]') into pb
    from hasil_hitung p
   where (p.kunci in ('laporan:' || bln, 'md:tpb') and p.dibuat < now() - interval '2 hours')
      or (p.kunci = 'laporan:' || bll and p.dibuat < now() - interval '2 hours'
          and coalesce((select t.status from tutup_buku t where t.bulan = bll order by t.waktu desc limit 1), '') <> 'Ditutup')
      or (p.kunci = any (array['md:beranda', 'acc:oto', 'md:acc', 'md:acc:lalu', 'md:ringkasan', 'md:setuju', 'md:tanpa', 'md:titip',
            'md:request', 'md:pantau', 'md:hrgnaik', 'md:hbb', 'kb:bbr', 'kb:hrgnaik', 'md:mkt', 'md:mkt:lalu', 'md:botol', 'md:pp:prod',
            'md:pp:bahan', 'md:prod', 'md:bbk', 'md:rbb', 'md:rpd', 'md:barang', 'hpp', 'hpp:asli', 'md:pengadaan', 'md:gudang',
            'md:beli:lalu', 'md:bh', 'md:bh:lalu', 'stok:semua'])
          and p.dibuat < now() - interval '1 hour');
  select json_build_object(
    'antre_macet', (select count(*) from efek_antre where selesai is null and dibuat < now() - interval '15 minutes'),
    'bukti_gagal', (select count(*) from bb_bukti where status = 'gagal' and waktu > now() - interval '7 days'),
    'bukti_tunggu', (select count(*) from bb_bukti where status in ('usul', 'tunggu') and waktu < now() - interval '1 day' and waktu > now() - interval '14 days'),
    'halaman_cache', (select count(*) from halaman_cache),
    'tanya_staf', (select count(*) from bb_obrolan where waktu > now() - interval '24 hours'),
    'potret_basi', json_array_length(pb), 'potret_basi_daftar', pb) into a;
  select coalesce(json_agg(z order by z.waktu desc), '[]') into l from (select id, waktu, status, ringkas, rinci, diperbaiki, perlu_keputusan from penjaga_log order by waktu desc limit 30) z;
  return json_build_object('ok', true, 'waktu', now(), 'jadwal', j, 'http', h, 'kapasitas', k, 'antrean', a, 'log', l);
end $function$;
