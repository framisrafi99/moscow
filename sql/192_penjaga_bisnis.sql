-- 192 (7 Nov 2026): Penjaga bisnis Moscow — agen harian (07.00 WITA) yang menjaga uang, stok, dan penjualan.
-- Agen hanya MEMBACA data bisnis; hasilnya dicatat di penjaga_bisnis_log dan dikirim ke HP Iqbal.
-- bisnis_atur: batas peringatan yang bisa diubah manajemen Moscow Supplies (dibaca agen setiap jalan).
-- Ditampilkan di Master Data > Penjaga sistem (bagian "Penjaga bisnis", jaga.js v3) lewat sistem_kesehatan().

create table if not exists public.penjaga_bisnis_log (
  id bigint generated always as identity primary key,
  waktu timestamptz not null default now(),
  status text not null default 'aman' check (status in ('aman', 'perhatian', 'mendesak')),
  ringkas text,
  uang text,
  stok text,
  penjualan text,
  tindakan text
);
alter table public.penjaga_bisnis_log enable row level security;
drop policy if exists penjaga_bisnis_log_baca on public.penjaga_bisnis_log;
create policy penjaga_bisnis_log_baca on public.penjaga_bisnis_log for select to authenticated using (public._boleh_peran(array['manajemen']));
grant select on public.penjaga_bisnis_log to authenticated;

create table if not exists public.bisnis_atur (
  kunci text primary key,
  nilai numeric not null,
  ket text,
  diubah timestamptz not null default now()
);
alter table public.bisnis_atur enable row level security;
drop policy if exists bisnis_atur_baca on public.bisnis_atur;
create policy bisnis_atur_baca on public.bisnis_atur for select to authenticated using (public._boleh_peran(array['manajemen']));
drop policy if exists bisnis_atur_ubah on public.bisnis_atur;
create policy bisnis_atur_ubah on public.bisnis_atur for update to authenticated using (public._boleh_peran(array['manajemen'])) with check (public._boleh_peran(array['manajemen']));
grant select, update on public.bisnis_atur to authenticated;
insert into public.bisnis_atur (kunci, nilai, ket) values
  ('stok_tipis_hari', 7, 'Barang laris dianggap tipis bila stok Kantor Packing cukup kurang dari sekian hari'),
  ('stok_habis_mendesak_hari', 3, 'Barang laris yang habis dalam sekian hari = mendesak'),
  ('stok_diam_hari', 30, 'Barang dengan stok tetapi tidak terjual sekian hari = barang diam'),
  ('impor_tunggu_hari', 105, 'Waktu tunggu barang impor (hari) untuk saran pesan ulang'),
  ('dana_lama_hari', 14, 'Dana marketplace belum cair dianggap lama sesudah sekian hari'),
  ('setoran_selisih_min', 1000, 'Selisih setoran consignment (Rp) yang dilaporkan'),
  ('biaya_naik_persen', 30, 'Biaya operasional bulan ini (diproyeksikan) naik lebih dari sekian persen dibanding bulan lalu'),
  ('penjualan_turun_persen', 30, 'Omzet 7 hari terakhir per saluran turun lebih dari sekian persen dibanding 7 hari sebelumnya'),
  ('penjualan_naik_persen', 50, 'Omzet 7 hari terakhir per saluran naik lebih dari sekian persen (kabar baik)')
on conflict (kunci) do nothing;

-- sistem_kesehatan(): sama dengan sql/189, ditambah 'bisnis' (30 catatan Penjaga bisnis terakhir) dan 'bisnis_atur'.
create or replace function public.sistem_kesehatan()
 returns json
 language plpgsql
 stable security definer
 set search_path to 'public', 'cron', 'net'
as $function$
declare j json; h json; k json; a json; l json; pb json; bl json; ba json;
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
  select coalesce(json_agg(z order by z.waktu desc), '[]') into bl from (select id, waktu, status, ringkas, uang, stok, penjualan, tindakan from penjaga_bisnis_log order by waktu desc limit 30) z;
  select coalesce(json_agg(json_build_object('k', kunci, 'v', nilai, 'ket', ket) order by kunci), '[]') into ba from bisnis_atur;
  return json_build_object('ok', true, 'waktu', now(), 'jadwal', j, 'http', h, 'kapasitas', k, 'antrean', a, 'log', l, 'bisnis', bl, 'bisnis_atur', ba);
end $function$;
