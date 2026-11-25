-- 221 (25 Nov 2026): aplikasi Staf Produksi > "Penyesuaian stok Gudang Utama". gudang_sesuai juga menerima peran produksi,
--  khusus produk Moscow & Kenka (_produk_produksi / katalog). Notifikasi ajuan bertanda "🏭 Staf Produksi".
--  Diterapkan lewat patch pg_get_functiondef (lihat riwayat sesi 25 Nov 2026): peran produksi ditambahkan ke _boleh_peran,
--  cek _produk_produksi(kd) per baris untuk peran produksi, dan asal efek 'sa_ajuan' mengikuti peran.
select 1;
