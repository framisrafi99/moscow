-- Penjaga sistem, 2026-11-07 (WITA)
-- Masalah: policy RLS tutup_buku_baca & penjaga_log_baca memanggil public._boleh_peran(text[]),
-- tetapi role authenticated tidak punya izin EXECUTE -> "permission denied for function _boleh_peran"
-- (403 di /rest/v1/tutup_buku dari app.moscowsupplies.com).
-- Perbaikan: beri izin EXECUTE (fungsi hanya memeriksa peran pengguna yang sedang login).
grant execute on function public._boleh_peran(text[]) to authenticated, service_role;
