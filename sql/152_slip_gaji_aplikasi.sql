-- 152 (4 Nov 2026): slip gaji pindah dari halaman Apps Script ke slip.html di aplikasi.
-- gaji_slip.kode: kode acak 40 huruf per staf per periode (tanpa login, tanpa kunci rahasia); link = https://app.moscowsupplies.com/slip.html?k=<kode>.
-- _gj_slip_buat(periode 'yyyy-MM'): dipanggil gaji_putus saat payroll disetujui (dulu efek gaji_slip Apps Script). Sudah dijalankan untuk 2026-09 dan 2026-10.
-- slip_baca(kode): dibaca halaman slip.html (anon), hanya untuk gaji berstatus Disetujui. Tabel gaji_slip tetap tertutup (RLS, tanpa izin baca langsung).
alter table public.gaji_slip add column if not exists kode text;
create unique index if not exists gaji_slip_kode_uk on public.gaji_slip (kode) where kode is not null;
-- Definisi lengkap: pg_get_functiondef('public._gj_slip_buat(text)'::regprocedure), pg_get_functiondef('public.slip_baca(text)'::regprocedure).
