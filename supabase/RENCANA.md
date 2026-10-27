# Rencana pindah ke Supabase

## Kondisi sekarang
- Repo ini hanya berisi halaman pembuka (PWA) yang membuka aplikasi Apps Script di dalam iframe.
- Tampilan dan logika ada di Apps Script; data ada di spreadsheet **management sistem moscow** (63 sheet).
- Sheet laporan (REKAP, REPORT_*, NILAI_ASET, ORDER_REKAP) dihitung dari sheet log.

## Pendekatan yang disarankan
Tampilan Apps Script tetap dipakai, yang diganti hanya tempat datanya. Fungsi baca/tulis
sheet di Apps Script diganti dengan panggilan ke Supabase lewat `UrlFetchApp`, memakai
service role key yang disimpan di **Script Properties**, tidak pernah dikirim ke HP.
Link staf, izin perangkat, dan halaman pembuka di repo ini tidak berubah.

Semua tabel memakai RLS tanpa policy, jadi anon key saja tidak bisa membaca data.

## Skema
`migrations/20261027000000_skema_awal.sql` berisi 53 tabel, satu per sheet data, dengan
nama kolom mengikuti judul kolom sheet. HPP_MEDAN, HPP_SIDOARJO, dan HPP_RENON digabung
menjadi `hpp_toko`.

Catatan untuk saat impor:
- Tanggal di sheet campur `dd/mm/yyyy` dan `yyyy-mm-dd`, jadi harus dibaca per format.
- Angka ditampilkan dengan titik ribuan (`420.000`) dan koma desimal (`43,2`).
  Impor memakai nilai mentah sel, bukan teks yang tampil.
- Kolom `toko`, `pengisi`, dan nama barang masih berupa teks bebas seperti di sheet.
  Normalisasi menyusul setelah semua data masuk.

## Urutan pindah
1. **Siapkan**: buat project Supabase, jalankan skema, simpan key di Script Properties.
2. **Impor master data**: katalog, bahan, bahan baku, pelanggan, akun, staf, HPP.
3. **Impor log** sejak 1 Okt 2026, lalu buat view laporan dan cocokkan angkanya dengan sheet REPORT_*.
4. **Pindah per modul**: saat pindah, sheet modul itu dibekukan dan Supabase jadi sumber data utama.
   1. Bahan baku & produksi (bahanbaku, produksi). Penggunanya sedikit, jadi risikonya kecil.
   2. Gudang & pengadaan/PO (gudang)
   3. Toko offline & consignment (toko, medan, sidoarjo, renon)
   4. Order reseller (reseller)
   5. Payroll (payroll)
   6. Keuangan & dasbor manajemen (index, mike)
5. **Rapikan**: spreadsheet jadi arsip baca saja, backup harian Supabase aktif (paket Pro).
