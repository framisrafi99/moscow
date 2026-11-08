-- 196 (8 Nov 2026): rekap laporan penjualan toko (17.05 WITA) menyebut sudah berapa hari toko tidak lapor.
-- Disetujui Iqbal. Mengganti toko_lapor_rekap() dari sql/183.
--  * Toko yang belum lapor hari ini: "terakhir lapor DD/MM (N hari lalu)" atau "belum pernah lapor".
--  * N >= 3 hari: ditandai 🚨 dan dikumpulkan di baris "Perlu ditegur" di bawah rekap.
--  * "Lapor" = penjualan diisi/diupload (toko_jual_log: tanggal atau waktu_masuk) atau ditandai tidak ada penjualan (toko_lapor_nihil).

create or replace function public.toko_lapor_rekap()
returns void language plpgsql volatile security definer set search_path = public as $$
declare hari date := (now() at time zone 'Asia/Makassar')::date; t text; s text; baris text := ''; belum int := 0; hp int;
  akhir date; lama int; tegur text := '';
begin
  foreach t in array array['Consignment Medan', 'Consignment Sidoarjo', 'Consignment Renon', 'Toko Offline'] loop
    s := public._toko_sudah_lapor(t, hari);
    hp := (select count(*) from toko_push where toko = t);
    akhir := greatest(
      (select max(tanggal) from toko_jual_log where toko = t and tanggal <= hari),
      (select max((waktu_masuk at time zone 'Asia/Makassar')::date) from toko_jual_log where toko = t),
      (select max(tanggal) from toko_lapor_nihil where toko = t and tanggal <= hari));
    lama := case when akhir is null then null else hari - akhir end;
    if s = '' then belum := belum + 1; end if;
    if s = '' and (akhir is null or lama >= 3) then
      tegur := tegur || case when tegur = '' then '' else ', ' end || replace(t, 'Consignment ', '') ||
        case when akhir is null then ' (belum pernah)' else ' (' || lama || ' hari)' end;
    end if;
    baris := baris || E'\n' ||
      case s when 'isi' then '✅ ' when 'nihil' then '➖ ' else case when akhir is null or lama >= 3 then '🚨 ' else '❌ ' end end ||
      t || ': ' ||
      case s when 'isi' then 'sudah lapor' when 'nihil' then 'tidak ada penjualan' else '<b>belum lapor</b>' ||
        case when akhir is null then ' · belum pernah lapor'
             else ' · terakhir ' || to_char(akhir, 'DD/MM') || ' (' ||
               case when lama >= 3 then '<b>' || lama || ' hari lalu</b>' else lama || ' hari lalu' end || ')' end
      end ||
      case when hp = 0 then ' <i>(notifikasi HP belum diaktifkan)</i>' else '' end;
  end loop;
  insert into efek_antre (jenis, data) values ('tg', jsonb_build_object('teks',
    '🧾 <b>Laporan penjualan toko hari ini</b> (' || to_char(hari, 'DD/MM/YYYY') || ')' || baris ||
    case when belum > 0 then E'\n\n' || belum || ' toko belum mengisi penjualan hari ini.' else E'\n\nSemua toko sudah lapor 👍' end ||
    case when tegur <> '' then E'\n🚨 <b>Perlu ditegur</b> (3 hari atau lebih tidak lapor): ' || tegur || '.' else '' end ||
    E'\nOleh: Admin Accounting'));
end $$;

revoke all on function public.toko_lapor_rekap() from public, anon, authenticated;

insert into public.sql_terpasang (file, cara, catatan) values ('196_toko_rekap_hari.sql', 'Claude', 'disetujui Iqbal') on conflict (file) do nothing;
