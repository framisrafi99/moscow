-- 179 (6 Nov 2026): fungsi nomor TR yang dipakai SQL 133 belum ada, sehingga 133 belum pernah aktif.
-- Setelah fungsi ini dibuat, isi sql/133_dana_cair_official_acc.sql diterapkan (laporan dana Official -> accounting otomatis).
create or replace function public._acc_no_baru()
returns text language sql volatile security definer set search_path = public as $$
  -- dipanggil di dalam transaksi yang sudah memegang pg_advisory_xact_lock(hashtext('staf|acc_log'))
  select 'TR-' || to_char(now() at time zone 'Asia/Makassar', 'YYMMDD') || '-' || right('00' || (public._acc_urut() + 1)::text, 3)
$$;
revoke all on function public._acc_no_baru() from public, anon, authenticated;
-- lalu: \i sql/133_dana_cair_official_acc.sql
