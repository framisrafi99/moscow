-- 5 Nov 2026: Master Data lama › Koreksi catatan gudang (kghDaftar / kghHapus, Apps Script file 63) pindah ke Supabase.
create table if not exists public.gudang_log_hapus (
  id bigint generated always as identity primary key,
  id_asal bigint, baris_asal integer, isi jsonb not null,
  dihapus_pada timestamptz not null default now(), dihapus_oleh text, alasan text);
alter table public.gudang_log_hapus enable row level security;
revoke all on public.gudang_log_hapus from anon, authenticated;
-- Fungsi (definisi lengkap: select pg_get_functiondef('public.kgh_hapus'::regproc) dst.):
--   _kgh_kunci(jenis, ref)  -> alasan baris tidak boleh dihapus (Masuk Produksi / |SL, Masuk Impor / TB- / PO-, RO-)
--   _kgh_sidik(gudang_log)  -> md5 16 huruf isi baris (cek baris tidak berubah sejak daftar dimuat)
--   kgh_daftar(p_hari)      -> {ok, hari, rows[{b,s,t,j,k,n,w,q,tj,wk,o,c,ref,x}], lebih}, maks 400, khusus manajemen
--   kgh_hapus(p_items, p_alasan, p_token) -> arsip ke gudang_log_hapus, hapus, Telegram "CATATAN GUDANG DIHAPUS"
-- grant execute kgh_daftar, kgh_hapus to authenticated.
