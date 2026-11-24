-- 213 (24 Nov 2026): Agen audit memeriksa catatan dobel lintas sumber.
-- audit.peringatan mendapat cabang baru (data ? 'dobel_lintas', prioritas HIGH, modul Accounting):
--   1. catatan Telegram dan catatan Purchasing dengan nominal sama (selisih <= Rp1.000), tanggal berjarak <= 3 hari;
--   2. catatan Telegram yang nominalnya sama dengan jumlah dua catatan Purchasing di hari yang sama.
-- Catatan Telegram yang sudah memuat nomor pengajuan (PG-…) atau sudah disambungkan tidak ikut diperiksa. 30 hari terakhir.
-- Dipasang lewat MCP dengan menyisipkan cabang sebelum "SELECT row_number() OVER" pada definisi view yang ada
-- (lihat catatan sesi 24 Nov); hasilnya ikut ke hasil_hitung 'agen:audit' tiap jam (agen_audit_hitung).
-- Cuplikan cabang:
--   SELECT 'HIGH', 'Accounting', tg || ' + ' || pc,
--          'Kemungkinan tercatat dua kali: <tg> dari bukti Telegram dan <pc> dari Purchasing, sama-sama Rp <nominal> (<tgl> dan <tgl>)',
--          jsonb_build_object('dobel_lintas', true, ...), dampak, penyebab, solusi
--     FROM (pasangan satu-satu UNION ALL satu telegram = dua purchasing) d
insert into sql_terpasang (file, cara, catatan)
select '213_audit_dobel_lintas.sql', 'mcp', 'audit.peringatan: dobel lintas Telegram–Purchasing'
where not exists (select 1 from sql_terpasang where file = '213_audit_dobel_lintas.sql');
