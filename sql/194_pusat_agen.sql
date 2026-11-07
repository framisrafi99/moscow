-- 194 (7 Nov 2026): Pusat agen (Master Data) — satu tab untuk 4 agen: Penjaga bisnis, Penjaga sistem, Audit, Asisten GM.
-- * gm_laporan: rencana Senin / evaluasi Jumat dari Asisten GM (ditulis agen, dibaca manajemen).
-- * agen_audit_hitung(): ringkasan view audit.* (peringatan dihitung ±3 detik) disimpan ke hasil_hitung 'agen:audit'
--   tiap jam (jadwal agen-audit-ringkas) supaya tab cepat terbuka.
-- * pusat_agen(): data tab Audit & Asisten GM (manajemen saja). Penjaga bisnis & sistem tetap dari sistem_kesehatan().

create table if not exists public.gm_laporan (
  id bigint generated always as identity primary key,
  waktu timestamptz not null default now(),
  jenis text not null default 'lain' check (jenis in ('rencana', 'evaluasi', 'lain')),
  ringkas text,
  isi text not null
);
alter table public.gm_laporan enable row level security;
drop policy if exists gm_laporan_baca on public.gm_laporan;
create policy gm_laporan_baca on public.gm_laporan for select to authenticated using (public._boleh_peran(array['manajemen']));
grant select on public.gm_laporan to authenticated;

create or replace function public.agen_audit_hitung()
returns void language plpgsql security definer set search_path = public, audit as $$
declare d jsonb; bln text := to_char(now() at time zone 'Asia/Makassar', 'YYYY-MM');
  bll text := to_char(date_trunc('month', now() at time zone 'Asia/Makassar') - interval '1 month', 'YYYY-MM');
begin
  create temp table _p on commit drop as select * from audit.peringatan;
  d := jsonb_build_object(
    'dihitung', now(),
    'jumlah', coalesce((select jsonb_object_agg(prioritas, n) from (select prioritas, count(*) n from _p group by 1) x), '{}'),
    'peringatan', coalesce((select jsonb_agg(jsonb_build_object('p', prioritas, 'm', modul, 'o', objek, 'masalah', masalah, 'dampak', dampak, 'solusi', solusi) order by case prioritas when 'CRITICAL' then 1 when 'HIGH' then 2 else 3 end, no)
                            from (select * from _p where prioritas in ('CRITICAL', 'HIGH') order by case prioritas when 'CRITICAL' then 1 else 2 end, no limit 20) y), '[]'),
    'metrik', coalesce((select jsonb_agg(to_jsonb(z) order by z.bulan desc) from (select bulan, omzet, hpp, laba, iklan, mp, gaji, pesanan, batal, nilai_batal, final, tutup_status from audit.metrik_tim order by bulan desc limit 3) z), '[]'),
    'rencana_bulan', (select max(bulan) from audit.rencana_bulanan),
    'rencana', coalesce((select jsonb_agg(jsonb_build_object('area', area, 'urut', urut, 'p', prioritas, 'pemilik', pemilik, 'masalah', masalah, 'tindakan', tindakan, 'ukuran', ukuran) order by area, urut)
                          from audit.rencana_bulanan where bulan = (select max(bulan) from audit.rencana_bulanan)), '[]'),
    'saluran', coalesce((select jsonb_agg(jsonb_build_object('b', bulan, 's', saluran, 'omzet', omzet, 'hpp', hpp, 'unit', unit, 'akhir', tanggal_terakhir) order by bulan desc, omzet desc nulls last)
                          from audit.saluran_bulanan where bulan in (bln, bll)), '[]'));
  insert into hasil_hitung (kunci, data, dibuat) values ('agen:audit', d, now())
  on conflict (kunci) do update set data = excluded.data, dibuat = excluded.dibuat;
end $$;
revoke all on function public.agen_audit_hitung() from public, anon, authenticated;

create or replace function public.pusat_agen()
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not public._boleh_peran(array['manajemen']) then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  return json_build_object('ok', true,
    'audit', (select data from hasil_hitung where kunci = 'agen:audit'),
    'laporan', coalesce((select json_agg(x order by x.waktu desc) from (select id, waktu, jenis, ringkas, isi from gm_laporan order by waktu desc limit 12) x), '[]'),
    'catatan', coalesce((select json_agg(x order by x.waktu desc) from (select waktu, isi, sumber from gm_catatan order by waktu desc limit 20) x), '[]'),
    'tindakan', json_build_object(
      'buka', (select count(*) from gm_tindakan where status = 'buka'),
      'lewat', (select count(*) from gm_tindakan where status = 'buka' and tenggat < (now() at time zone 'Asia/Makassar')::date),
      'selesai_7', (select count(*) from gm_tindakan where status = 'selesai' and selesai_waktu > now() - interval '7 days')));
end $$;
revoke all on function public.pusat_agen() from public, anon;
grant execute on function public.pusat_agen() to authenticated;

select cron.schedule('agen-audit-ringkas', '41 * * * *', $c$ select public.agen_audit_hitung() $c$);
select public.agen_audit_hitung();
