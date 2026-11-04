-- 150 (4 Nov 2026)
-- 1) Robot jadwal (hitung-potret md:tpb) gagal "permission denied for function tutup_buku_daftar": izin untuk service role.
grant execute on function public.tutup_buku_daftar() to service_role;
-- 2) Order baru toko (toko_simpan_order): Telegram "REQUEST PINDAH STOK BARU" + catatan robot dibuat langsung di Supabase
--    oleh _rp_tg_masuk(order, asal) (salinan RP_tgMasuk_ + RP_robot_ Apps Script file 33; dicocokkan dengan Apps Script: sama).
--    toko_simpan_order sekarang memanggil public._rp_tg_masuk_d(jsonb_build_object('asal', .., 'order', ..)) menggantikan efek 'order_baru'.
--    Definisi lengkap: pg_get_functiondef('public._rp_tg_masuk(jsonb,jsonb)'::regprocedure).
