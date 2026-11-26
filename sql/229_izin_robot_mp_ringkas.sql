-- 26 Nov 2026 (Penjaga sistem): robot hitung-potret (service_role) ditolak memanggil mp_ringkas_kelompok
-- ("permission denied", 26x sejak 14:20 WITA) karena 228 hanya memberi izin ke authenticated.
-- Disamakan dengan mp_jual_kelompok. Fungsi tetap memeriksa peran_saya() (robot potret = manajemen).
grant execute on function public.mp_ringkas_kelompok(date, date) to service_role;
