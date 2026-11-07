# Robot hitung (hitung-potret): masalah batas prosesor & rencana pindah ke database

Ditulis 7 Nov 2026 oleh Penjaga sistem, disetujui Iqbal.

## Masalah

Robot hitung menjalankan rumus aplikasi (file JS yang sama dengan browser) di Edge Function Supabase.
Satu panggilan hanya boleh memakai prosesor ±2 detik. Rumus membaca isi tabel utuh (mis. `mp_pesanan`
±20 ribu baris, seluruh `acc_log`) lalu menghitung di JavaScript, jadi bebannya naik setiap hari.
Bila satu panggilan lewat batas, mesinnya dimatikan dan **semua panggilan lain di mesin itu ikut gagal (546)**.

Kegagalan melonjak sejak 2–4 Nov 2026; tanggal 7 Nov laporan bulan ini gagal walau dijalankan sendiri.

## Sudah dilakukan (7 Nov 2026)

| Perubahan | File |
|---|---|
| Tanpa coba ulang saat 546, 2 kelompok bersamaan (dulu 4), TPB tidak ikut laporan bulan lalu | `supabase/functions/hitung-potret` v15 |
| Laporan & TPB dipanggil langsung sendiri; laporan bulan lalu dilewati bila buku Ditutup (cadangan 02:18 WITA) | `sql/188` |
| Laporan bulanan memakai potret `md:acc` yang segar, Dasbor mode ringan (tanpa stok) | `dasbor.js` v4, hitung-potret v16–17 |
| TPB memakai potret `md:bh` & `md:gudang` yang segar, Dasbor mode `tpb` (tanpa stok produksi/toko & tindakan) | `dasbor.js` v5, `tpb.js` v6, hitung-potret v18 |
| Penjaga sistem menampilkan hasil hitung yang terlambat | `sql/189`, `jaga.js` v2 |

Semua versi ringan dicocokkan dengan mode banding (`simpan: false`): hasil `laporan:2026-11` dan `md:tpb` sama persis
dengan hitungan lama.

Ini memberi ruang, tetapi beban masih ikut naik dengan jumlah data. Supaya tuntas, hitungan berat dipindah ke database.

## Rencana pindah ke database (tahap B)

Urutan menurut dampak. Setiap langkah: buat fungsi SQL → robot menghitung versi lama dan baru berdampingan
(mode banding) minimal 3 hari → kalau sama persis, rumus JS memakai hasil SQL → versi lama dilepas.

1. **(Sedang diuji sejak 7 Nov 2026)** `sql/190` `mp_jual_kelompok` + `md.js` v15 `mpJual(sb, {dari, sampai})`;
   jadwal `hitung-potret-uji-mp` (`sql/191`) membandingkan tiap 30 menit, hasil di `robot_log` jenis `uji:mpdb`.
   Uji pertama: `laporan:2026-11` dan `md:tpb` sama persis. Sesudah 3 hari bersih: robot menyimpan dengan cara baru
   (`mpDb` tidak lagi dibatasi mode banding) dan jadwal uji dihentikan.
   **Penjualan marketplace per barang** (`MdLama.mpJual`, dipakai Dasbor/HPP terjual, `md:mkt`).
   Sekarang: seluruh `mp_pesanan` dibaca dan dicocokkan nama/variasi → kode barang di JS setiap panggilan.
   Jadi: fungsi `mp_jual_harian(dari, sampai)` → (tanggal, kode, qty, total, saluran). Padanan nama → kode
   (`MP_padananFn_`) disimpan sebagai kolom kode di `mp_pesanan` saat upload / lewat trigger, supaya tidak dicocokkan ulang.
   Dampak terbesar karena tabel ini yang paling cepat bertambah.
2. **Bacaan tabel per periode** (`lembar_baca`): kirim hanya baris dalam rentang tanggal yang diminta
   (log toko, order, produksi), bukan seluruh riwayat.
3. **Accounting per bulan** (`Akunting.baca/gerak`, dipakai `md:acc`, laporan, Dasbor): fungsi SQL saldo akun
   per tanggal dan jumlah per kategori per bulan. Penjualan otomatis (`otomatis()`) tetap dari JS sampai langkah 1 selesai.
4. **HPP per tanggal** (`lapisHpp` / `H.pada`): paling rumit (riwayat penerimaan & perubahan HPP). Disimpan sebagai
   tabel `hpp_harian` (kode, berlaku_mulai, hpp) yang diperbarui saat penerimaan barang / ubah HPP, lalu dipakai rumus.

Perkiraan: langkah 1 dan 2 masing-masing 1–2 hari kerja termasuk pencocokan; langkah 3–4 lebih lama.

## Cara memeriksa

- Master Data › Penjaga sistem: kotak "Hasil hitung terlambat".
- `robot_log` (jenis `jadwal`, `jadwal:bagian`, `banding`) dan `net._http_response` (546 = kehabisan tenaga).
