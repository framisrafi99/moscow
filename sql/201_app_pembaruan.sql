-- 12 Nov 2026: catatan "Pembaruan aplikasi" untuk staf (pembaruan.js). aplikasi: gudang, produksi, bahanbaku, purchasing,
-- akunting, payroll, mike, toko, atau 'semua'. Dibaca semua yang punya peran; ditulis manajemen Moscow Supplies.
create table if not exists public.app_pembaruan (
  id bigserial primary key,
  waktu timestamptz not null default now(),
  aplikasi text[] not null,
  judul text not null,
  isi text not null,
  oleh text
);
alter table public.app_pembaruan enable row level security;
create policy app_pembaruan_baca on public.app_pembaruan for select to authenticated using (coalesce(public.peran_saya(), '') <> '');
create policy app_pembaruan_tulis on public.app_pembaruan for insert to authenticated with check (public.peran_saya() = 'manajemen');
grant select, insert on public.app_pembaruan to authenticated;
grant usage, select on sequence public.app_pembaruan_id_seq to authenticated;
grant all on public.app_pembaruan to service_role;

insert into public.app_pembaruan (waktu, aplikasi, judul, isi, oleh) values
('2026-11-11 09:00+08', array['gudang','produksi','bahanbaku'], 'Asal barang Impor / Lokal mengikuti daftar barang impor',
 E'- Barang impor (daftar resmi manajemen) otomatis Impor dan dikirim ke Mike untuk ACC.\n- Barang tanda kuning (R01, R02, R03, R18, R19, R20, R21) bisa impor atau lokal: WAJIB pilih Impor atau Lokal sebelum mengirim pengajuan.\n- Barang lainnya otomatis Lokal (ACC Viory).', 'manajemen Moscow Supplies'),
('2026-11-12 12:15+08', array['produksi','bahanbaku'], 'Daftar Botol & stiker di pengajuan sudah normal',
 E'- Daftar Botol & stiker dan Bahan baku di menu Ajukan pembelian sudah tampil lengkap lagi (sebelumnya kadang kosong).', 'manajemen Moscow Supplies'),
('2026-11-12 12:20+08', array['gudang','produksi','bahanbaku','purchasing'], 'Menu bawah tidak macet lagi',
 E'- Menu bawah (Stok, Order, Penyaluran, Pengajuan) sekarang selalu pindah ke tab yang dipilih, walaupun tab itu punya angka penanda (mis. Pengajuan 8).', 'manajemen Moscow Supplies'),
('2026-11-12 12:30+08', array['gudang'], 'Pengajuan: stok Gudang Utama saja & hanya barang yang perlu diajukan',
 E'- Stok di daftar pengajuan sekarang stok Gudang Utama saja. Stok Kantor Packing dan toko tampil sebagai keterangan, contoh: "stok gudang 0 pcs (di luar gudang: KP 8, toko 11)".\n- Saat membuka + Buat pengajuan, yang tampil hanya barang yang PERLU diajukan (Kritis / Saatnya pesan), sudah dengan saran jumlah. Barang yang sudah diajukan dan menunggu ACC tidak tampil lagi.\n- Mau mengajukan barang lain: tekan "Tampilkan semua barang" atau ketik nama / kode barang.\n- Setiap barang diberi tanda: Impor, Impor / lokal, atau Lokal. Tanda yang sama tampil di Daftar pengajuan.\n- Data diperbarui robot setiap 10 menit.', 'manajemen Moscow Supplies'),
('2026-11-12 12:35+08', array['gudang'], 'Restok cukup lewat + Buat pengajuan',
 E'- Tab "PO impor" tidak ditampilkan lagi untuk staf gudang. Semua kebutuhan restok cukup diajukan lewat + Buat pengajuan.\n- PO dibuat Purchasing / manajemen setelah pengajuan di-ACC. Saat barang datang, tandai di tab Terima barang.', 'manajemen Moscow Supplies'),
('2026-11-12 12:55+08', array['gudang','produksi','bahanbaku'], 'Harga di pengajuan terisi otomatis',
 E'- Kolom harga di pengajuan sekarang "Harga terakhir (otomatis)" dari harga beli terakhir. Staf tidak perlu mencari atau mengisi harga lagi, cukup isi qty.', 'manajemen Moscow Supplies'),
('2026-11-12 13:10+08', array['gudang'], 'Terima barang: kolom Bonus, laporan bonus, dan tanda HPP',
 E'- Tabel penerimaan PO punya kolom Bonus: isi jumlah barang gratis dari supplier. Bonus masuk stok gudang, HPP tidak berubah.\n- Kartu "Laporan barang bonus": pilih bulan lalu tekan Lihat untuk rekap bonus setiap akhir bulan.\n- Setiap barang menampilkan tanda HPP: "HPP tetap", "naik x% (+Rp ...)", atau "turun x% (-Rp ...)".\n- Setelah penerimaan disimpan, HPP di daftar barang langsung diperbarui otomatis (tidak perlu usulan HPP).\n- Barang dengan HPP lebih dari 35% harga jual diberi tanda "ajukan harga jual baru" supaya margin tidak menipis.', 'manajemen Moscow Supplies'),
('2026-11-12 13:20+08', array['semua'], 'Menu baru: Pembaruan aplikasi',
 E'- Tombol lonceng "Pembaruan" dan menu "Pembaruan aplikasi" berisi fitur baru dan perubahan di aplikasi yang kamu pegang.\n- Angka merah = jumlah pembaruan yang belum dibaca. Baca supaya tahu cara memakai fitur terbaru.', 'manajemen Moscow Supplies');
