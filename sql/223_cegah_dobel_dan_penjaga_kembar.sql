-- 26 Nov 2026: cegah pencatatan dobel karena klik berulang + penjaga otomatis catatan kembar.
-- (Diterapkan langsung lewat MCP; definisi lengkap fungsi ada di database: pg_get_functiondef.)

-- 1. Kunci keras: satu pengajuan (PG-...) hanya boleh punya satu pembelian bahan baku aktif.
create unique index if not exists bahan_baku_beli_satu_pengajuan on public.bahan_baku_beli ((substring(catatan from '^\[(PG-[^\]]+)\]')))
  where catatan ~ '^\[PG-' and coalesce(status, '') !~* 'batal';
-- bbk_beli: sebelum mencatat, cek pembelian aktif untuk pengajuan yang sama -> tolak dengan pesan
--   "Pengajuan PG-... sudah punya pembelian PB-... (tidak dicatat dua kali)".

-- 2. Penjaga kembar
--   public._cek_kembar(p_jam): cari catatan kembar (selisih <= 10-30 menit, isi sama) di bahan_baku_beli,
--   bahan_baku_log, bahan_jadi_log, bahan_masuk, produksi_log, gudang_log, acc_log (kategori sama), kasir_nota,
--   serta pengajuan macet (pembelian Sampai tapi pengajuan masih Dipesan).
--   public.cek_kembar_kirim(): temuan baru (26 jam terakhir) -> Telegram "Penjaga sistem", dicatat di cek_kembar_lapor
--   supaya tidak dilaporkan ulang. Temuan lama yang sudah ditinjau ditandai abaikan = true.
create table if not exists public.cek_kembar_lapor (sidik text primary key, modul text, kunci text, rincian text,
  dilapor timestamptz default now(), abaikan boolean default false);
alter table public.cek_kembar_lapor enable row level security;
-- select cron.schedule('cek-kembar', '47 * * * *', 'select public.cek_kembar_kirim()');
