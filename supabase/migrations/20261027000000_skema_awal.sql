-- Skema awal Moscow Supplies di Supabase.
-- Satu tabel per sheet data di spreadsheet "management sistem moscow",
-- kolom mengikuti judul kolom sheet (huruf kecil, spasi jadi garis bawah).
-- Sheet laporan (REKAP, REPORT_*, NILAI_ASET, ORDER_REKAP) tidak dibuat tabel:
-- nanti dibuat sebagai view setelah data log masuk.
--
-- Keamanan: semua tabel memakai RLS tanpa policy, jadi anon key dari browser
-- tidak bisa membaca atau menulis apa pun. Akses lewat server (Apps Script /
-- Edge Function) dengan service role key yang tidak pernah dikirim ke HP.

create extension if not exists pgcrypto;

-- =========================================================
-- MASTER DATA
-- =========================================================

create table katalog (            -- KATALOG
  kode        text primary key,
  nama        text not null,
  harga_jual  numeric(14,2),
  kategori    text
);

create table barang_order (       -- BARANG_ORDER (katalog untuk order reseller)
  kode         text primary key,
  nama_barang  text not null,
  harga_jual   numeric(14,2),
  kategori     text,
  varian_warna text[] not null default '{}'
);

create table pelanggan (          -- PELANGGAN
  nama_pelanggan text primary key,
  tipe           text,            -- Consignment / Reseller / ...
  diskon_persen  numeric(5,2),
  kunci_link     text unique,     -- kode masuk link order pribadi
  link_order     text,
  catatan        text
);

create table mp_padanan (         -- MP_PADANAN: nama produk marketplace -> kode
  id          bigint generated always as identity primary key,
  nama_produk text not null,
  variasi     text not null default '',
  kode        text,
  warna       text,
  status      text,
  diubah_oleh text,
  waktu       timestamptz,
  unique (nama_produk, variasi)
);

create table robot_isi_barang (   -- ROBOT_ISI_BARANG
  kode          text primary key,
  nama_barang   text,
  isi_per_pcs_gram numeric(12,3),
  catatan       text
);

create table hpp_toko (           -- HPP_MEDAN, HPP_SIDOARJO, HPP_RENON digabung
  toko        text not null,      -- 'Medan' / 'Sidoarjo' / 'Renon'
  kode        text not null,
  nama_barang text,
  hpp         numeric(14,2),
  kode_lama   text,               -- hanya Medan (file September)
  nama_lama   text,
  catatan     text,
  primary key (toko, kode)
);

create table ttp_barang (         -- TTP_BARANG: barang titipan per toko
  kode               text not null,
  toko               text not null,
  nama_barang        text,
  hpp                numeric(14,2),
  harga_jual         numeric(14,2),
  status             text,
  diajukan_oleh      text,
  waktu_ajuan        timestamptz,
  waktu_keputusan    timestamptz,
  catatan            text,
  stok_awal_diajukan numeric(12,3),
  primary key (toko, kode)
);

-- Bahan produksi ------------------------------------------------------

create table bahan (              -- BAHAN (botol, label, kemasan)
  kode         text primary key,
  jenis        text,
  nama         text not null,
  catatan      text,
  stok_awal    numeric(12,3),     -- per 1 Okt 2026
  stok_minimum numeric(12,3),
  satuan       text
);

create table bahan_baku (         -- BAHAN_BAKU (bahan mentah)
  kode                 text primary key,
  nama_bahan           text not null,
  satuan               text,
  stok_awal            numeric(12,3),
  stok_minimum         numeric(12,3),
  berat_per_liter_kg   numeric(12,4),
  kelompok             text
);

create table bahan_jadi (         -- BAHAN_JADI
  kode               text primary key,
  kelompok           text,
  nama_bahan_jadi    text not null,
  satuan             text,
  berat_per_produksi numeric(12,4)
);

create table bahan_resep (        -- BAHAN_RESEP
  kode_bahan_jadi   text not null references bahan_jadi(kode),
  nama_bahan_jadi   text,
  kode_bahan_mentah text not null references bahan_baku(kode),
  nama_bahan_mentah text,
  takaran           numeric(12,4),
  satuan_takaran    text,
  primary key (kode_bahan_jadi, kode_bahan_mentah)
);

create table bahan_warna (        -- BAHAN_WARNA (resep warna)
  nama_warna     text not null,
  bahan          text not null,
  takaran_gram   numeric(12,3),
  catatan        text,
  kelompok       text,
  primary key (nama_warna, bahan)
);

create table bahan_baku_staf (    -- BAHAN_BAKU_STAF
  nama_staf text primary key
);

-- Keuangan ------------------------------------------------------------

create table acc_akun (           -- ACC_AKUN
  nama_akun   text primary key,
  jenis       text,
  saldo_awal  numeric(16,2) not null default 0,
  per_tanggal date
);

create table acc_kategori (       -- ACC_KATEGORI
  jenis    text not null,         -- Masuk / Keluar
  kategori text not null,
  kelompok text,
  primary key (jenis, kategori)
);

create table acc_sumber (         -- ACC_SUMBER
  sumber          text primary key,
  akun_penerima   text references acc_akun(nama_akun),
  hitung_otomatis boolean not null default false
);

-- Payroll -------------------------------------------------------------

create table gaji_staf (          -- GAJI_STAF
  no                  int primary key,
  nama                text not null unique,
  divisi              text,
  kelompok            text,
  gaji_pokok          numeric(14,2),
  uang_makan          numeric(14,2),
  paket_bpjs          text,
  bpjs_karyawan       numeric(14,2),
  bpjs_ditanggung_pt  numeric(14,2),
  no_wa               text,
  aktif               boolean not null default true,
  catatan             text
);

-- Akses ---------------------------------------------------------------

create table akses_perangkat (    -- AKSES_PERANGKAT
  no               text primary key,   -- AK-yymmdd-nnn
  waktu_minta      timestamptz,
  link             text,
  kode_link        text,
  nama             text,
  perangkat        text,
  id_perangkat     text,
  status           text,               -- Menunggu / Disetujui / Dicabut
  waktu_keputusan  timestamptz,
  diputus_oleh     text,
  terakhir_dipakai timestamptz
);
create index on akses_perangkat (id_perangkat);

-- =========================================================
-- STOK AWAL
-- =========================================================

create table gudang_stok_awal (   -- GUDANG_STOK_AWAL
  kode        text not null,
  nama_barang text,
  warna       text not null default '',
  qty         numeric(12,3) not null,
  primary key (kode, warna)
);

create table toko_stok_awal (     -- TOKO_STOK_AWAL
  id          bigint generated always as identity primary key,
  tanggal     date not null,
  toko        text not null,
  kode        text not null,
  nama_barang text,
  qty         numeric(12,3) not null,
  keterangan  text
);

create table online_stok_awal (   -- ONLINE_STOK_AWAL
  id          bigint generated always as identity primary key,
  kode        text not null,
  nama_barang text,
  kategori    text,
  warna       text,
  qty         numeric(12,3),
  hpp         numeric(14,2),
  harga_jual  numeric(14,2),
  per_tanggal date,
  catatan     text
);

-- =========================================================
-- LOG TRANSAKSI
-- Kolom umum: waktu_masuk (kapan diisi), pengisi (siapa/form).
-- =========================================================

-- Produksi & gudang ---------------------------------------------------

create table produksi_log (       -- PRODUKSI_LOG
  id          bigint generated always as identity primary key,
  tanggal     date not null,
  kode        text not null,
  nama        text,
  qty         numeric(12,3) not null,
  waktu_masuk timestamptz,
  pengirim    text,
  warna       text
);

create table salur_log (          -- SALUR_LOG
  id          bigint generated always as identity primary key,
  tanggal     date not null,
  kode        text not null,
  nama        text,
  qty         numeric(12,3) not null,
  waktu_masuk timestamptz,
  pengirim    text,
  tujuan      text,
  warna       text
);

create table gudang_log (         -- GUDANG_LOG
  id             bigint generated always as identity primary key,
  tanggal        date not null,
  jenis          text not null,
  kode           text not null,
  nama_barang    text,
  warna          text,
  qty            numeric(12,3) not null,
  sumber_tujuan  text,
  waktu_masuk    timestamptz,
  pengisi        text,
  catatan        text,
  ref            text,
  qty_rusak      numeric(12,3)
);
create index on gudang_log (kode, warna);

create table produksi_sesuai_log ( -- PRODUKSI_SESUAI_LOG
  no               text primary key,  -- SP-...
  waktu_ajuan      timestamptz,
  bagian           text,
  kode             text,
  nama_barang      text,
  warna            text,
  stok_sistem      numeric(12,3),
  hasil_hitung     numeric(12,3),
  selisih          numeric(12,3),
  alasan           text,
  pengaju          text,
  status           text,
  waktu_keputusan  timestamptz,
  catatan_pemilik  text
);

create table bahan_log (          -- BAHAN_LOG (bahan terpakai)
  id          bigint generated always as identity primary key,
  tanggal     date not null,
  jenis       text,
  nama        text not null,
  qty         numeric(12,3) not null,
  waktu_masuk timestamptz,
  pengisi     text,
  catatan     text
);

create table bahan_masuk (        -- BAHAN_MASUK
  id            bigint generated always as identity primary key,
  tanggal       date not null,
  jenis         text,
  nama          text not null,
  qty           numeric(12,3) not null,
  waktu_masuk   timestamptz,
  pengisi       text,
  catatan       text,
  harga_total   numeric(14,2),
  supplier      text,
  pengisi_harga text
);

create table bahan_rusak (        -- BAHAN_RUSAK
  id          bigint generated always as identity primary key,
  tanggal     date not null,
  jenis       text,
  nama        text not null,
  qty         numeric(12,3) not null,
  waktu_masuk timestamptz,
  pengisi     text,
  catatan     text
);

create table bahan_baku_log (     -- BAHAN_BAKU_LOG
  id             bigint generated always as identity primary key,
  tanggal        date not null,
  jenis          text not null,   -- Masuk / Terpakai / ...
  kode           text not null,
  nama_bahan     text,
  qty            numeric(12,4) not null,
  satuan         text,
  waktu_masuk    timestamptz,
  pengisi        text,
  catatan        text,
  untuk_produksi text
);

create table bahan_baku_beli (    -- BAHAN_BAKU_BELI
  no             text primary key, -- PB-...
  tanggal_beli   date,
  kode           text,
  nama_bahan     text,
  qty_dipesan    numeric(12,4),
  satuan         text,
  supplier       text,
  harga_total    numeric(14,2),
  catatan        text,
  pengisi        text,
  waktu_input    timestamptz,
  status         text,
  tanggal_sampai date,
  qty_diterima   numeric(12,4),
  sesuai_qty     text,
  penerima       text,
  catatan_terima text
);

create table bahan_jadi_log (     -- BAHAN_JADI_LOG
  id              bigint generated always as identity primary key,
  tanggal         date not null,
  kode            text not null,
  kelompok        text,
  nama_bahan_jadi text,
  qty             numeric(12,4) not null,
  satuan          text,
  waktu_masuk     timestamptz,
  pengisi         text,
  catatan         text,
  kali_produksi   numeric(8,2)
);

create table bahan_warna_log (    -- BAHAN_WARNA_LOG
  id                 bigint generated always as identity primary key,
  tanggal            date not null,
  warna              text not null,
  hasil_gram         numeric(12,3),
  dasar              text,
  dasar_terpakai_gram numeric(12,3),
  waktu_masuk        timestamptz,
  pengisi            text,
  catatan            text,
  kelompok           text
);

-- Pengadaan / PO ------------------------------------------------------

create table pengadaan_ajuan (    -- PENGADAAN_AJUAN
  no                     text primary key, -- PG-...
  waktu                  timestamptz,
  bagian                 text,
  kelompok               text,
  kode                   text,
  nama                   text,
  satuan                 text,
  qty                    numeric(12,3),
  perkiraan_harga_satuan numeric(14,2),
  alasan                 text,
  pengaju                text,
  status_robot           text,
  analisa_robot          text,
  status                 text,
  diputus_oleh           text,
  waktu_putus            timestamptz,
  catatan_putus          text,
  qty_disetujui          numeric(12,3),
  ref_po_supplier        text,
  waktu_pesan            timestamptz,
  perkiraan_datang       date,
  waktu_terima           timestamptz,
  asal_barang            text
);

create table po_log (             -- PO_LOG (kepala PO)
  no_po           text primary key,
  tanggal         date,
  asal            text,
  supplier        text,
  cara_bayar      text,
  total_barang    numeric(14,2),
  status          text,
  pengaju         text,
  waktu_ajuan     timestamptz,
  waktu_disetujui timestamptz,
  waktu_dibayar   timestamptz,
  no_transaksi    text,
  resi            text,
  catatan         text,
  catatan_pemilik text
);

create table po_item (            -- PO_ITEM
  id           bigint generated always as identity primary key,
  no_po        text not null references po_log(no_po) on delete cascade,
  kode         text,
  nama_barang  text,
  warna        text,
  qty          numeric(12,3),
  harga_satuan numeric(14,2),
  subtotal     numeric(14,2)
);

create table po_biaya (           -- PO_BIAYA
  id           bigint generated always as identity primary key,
  no_po        text not null references po_log(no_po) on delete cascade,
  tanggal      date,
  jenis_biaya  text,
  nominal      numeric(14,2),
  cara_bayar   text,
  status_bayar text,
  no_transaksi text,
  waktu_masuk  timestamptz,
  pengisi      text,
  catatan      text
);

-- Toko offline & consignment -----------------------------------------

create table toko_jual_log (      -- TOKO_JUAL_LOG
  id            bigint generated always as identity primary key,
  tanggal       date not null,
  toko          text not null,
  kode          text not null,
  nama_barang   text,
  qty_terjual   numeric(12,3) not null,
  harga_jual    numeric(14,2),
  total         numeric(14,2),
  waktu_masuk   timestamptz,
  pengisi       text,
  warna         text,
  no_nota       text,
  diskon_persen numeric(5,2),
  pembeli       text,
  ongkir        numeric(14,2),
  saluran       text
);
create index on toko_jual_log (toko, tanggal);
create index on toko_jual_log (no_nota);

create table toko_nota_bayar (    -- TOKO_NOTA_BAYAR
  no_nota   text primary key,
  toko      text,
  tanggal   date,
  metode    text,
  diisi_oleh text,
  waktu     timestamptz
);

create table toko_biaya_log (     -- TOKO_BIAYA_LOG
  id          bigint generated always as identity primary key,
  tanggal     date not null,
  toko        text not null,
  keterangan  text,
  nominal     numeric(14,2) not null,
  waktu_masuk timestamptz,
  pengisi     text
);

create table toko_hitung_log (    -- TOKO_HITUNG_LOG (stok opname)
  id                   bigint generated always as identity primary key,
  waktu_hitung         timestamptz not null,
  toko                 text not null,
  kode                 text not null,
  nama_barang          text,
  warna                text,
  qty_hitung           numeric(12,3),
  stok_sistem_saat_itu numeric(12,3),
  pengisi              text,
  catatan              text
);

create table toko_retur_log (     -- TOKO_RETUR_LOG
  id          bigint generated always as identity primary key,
  tanggal     date not null,
  toko        text not null,
  kode        text not null,
  nama_barang text,
  qty         numeric(12,3) not null,
  harga_jual  numeric(14,2),
  nilai       numeric(14,2),
  waktu_masuk timestamptz,
  pengisi     text,
  warna       text,
  kondisi     text,
  catatan     text
);

create table toko_pinjam_log (    -- TOKO_PINJAM_LOG
  no_pinjam       text not null,
  jenis           text not null,  -- PINJAM / KEMBALI
  tanggal         date,
  toko            text,
  kode            text,
  nama_barang     text,
  warna           text,
  qty             numeric(12,3),
  peminjam        text,
  rencana_kembali date,
  catatan         text,
  waktu_masuk     timestamptz,
  pengisi         text,
  id              bigint generated always as identity primary key
);
create index on toko_pinjam_log (no_pinjam);

create table toko_sesuai_log (    -- TOKO_SESUAI_LOG
  no              text primary key, -- SA-...
  waktu_ajuan     timestamptz,
  toko            text,
  kode            text,
  nama_barang     text,
  warna           text,
  stok_sistem     numeric(12,3),
  hasil_hitung    numeric(12,3),
  selisih         numeric(12,3),
  alasan          text,
  pengaju         text,
  status          text,
  waktu_keputusan timestamptz,
  catatan_pemilik text
);

create table ttp_log (            -- TTP_LOG (barang titipan masuk/keluar)
  no              text primary key, -- TTM-...
  toko            text,
  tanggal         date,
  jenis           text,
  kode            text,
  nama_barang     text,
  qty             numeric(12,3),
  harga_jual      numeric(14,2),
  hpp             numeric(14,2),
  status          text,
  pengisi         text,
  waktu_masuk     timestamptz,
  waktu_keputusan timestamptz,
  catatan         text
);

create table saluran_dana (       -- SALURAN_DANA
  bulan          text not null,   -- 'YYYY-MM'
  toko           text not null,
  saluran        text not null,
  dana_diterima  numeric(16,2),
  diisi_oleh     text,
  waktu          timestamptz,
  primary key (bulan, toko, saluran)
);

create table md_ubah_log (        -- MD_UBAH_LOG (perubahan master data)
  no            text primary key, -- MD-...
  waktu         timestamptz,
  jenis         text,
  kode          text,
  nama_barang   text,
  lokasi        text,
  warna         text,
  lama          text,
  baru          text,
  berlaku_mulai date,
  alasan        text,
  oleh          text
);

create table harga_usul_log (     -- HARGA_USUL_LOG
  no              text primary key, -- HU-...
  waktu           timestamptz,
  dari_link       text,
  nama_pengusul   text,
  jenis           text,
  lokasi          text,
  kode            text,
  nama_barang     text,
  lama            text,
  baru            text,
  alasan          text,
  status          text,
  waktu_keputusan timestamptz,
  diputus_oleh    text,
  catatan         text
);

-- Marketplace ---------------------------------------------------------

create table mp_pesanan (         -- MP_PESANAN
  kunci                text primary key, -- PLATFORM|NO|PRODUK|VARIASI
  toko                 text,
  platform             text,
  no_pesanan           text,
  status               text,
  waktu_dibuat         timestamptz,
  waktu_kirim          timestamptz,
  waktu_selesai        timestamptz,
  nama_produk          text,
  variasi              text,
  qty                  numeric(12,3),
  qty_return           numeric(12,3),
  harga_awal           numeric(14,2),
  harga_setelah_diskon numeric(14,2),
  subtotal             numeric(14,2),
  upload               text,
  waktu_upload         timestamptz
);
create index on mp_pesanan (toko, waktu_dibuat);

-- Order reseller ------------------------------------------------------

create table order_log (          -- ORDER_LOG (satu baris per barang)
  id            bigint generated always as identity primary key,
  no_order      text not null,
  tanggal       date,
  pelanggan     text,
  tipe          text,
  kode          text,
  nama          text,
  qty           numeric(12,3),
  harga         numeric(14,2),
  diskon_persen numeric(5,2),
  subtotal      numeric(14,2),
  nilai_diskon  numeric(14,2),
  total         numeric(14,2),
  status        text,
  waktu_masuk   timestamptz,
  pengisi       text,
  catatan       text,
  waktu_selesai timestamptz
);
create index on order_log (no_order);

create table order_proses (       -- ORDER_PROSES (riwayat status order)
  id       bigint generated always as identity primary key,
  waktu    timestamptz,
  no_order text not null,
  aksi     text,
  oleh     text,
  kurir    text,
  resi     text,
  ongkir   numeric(14,2),
  foto     text,                  -- link Drive
  catatan  text,
  detail   text
);
create index on order_proses (no_order);

-- Keuangan ------------------------------------------------------------

create table acc_log (            -- ACC_LOG (buku kas)
  no           text primary key,  -- TR-...
  tanggal      date not null,
  jenis        text not null,     -- Masuk / Keluar / Pindah
  akun         text references acc_akun(nama_akun),
  akun_tujuan  text references acc_akun(nama_akun),
  kategori     text,
  keterangan   text,
  nominal      numeric(16,2) not null,
  waktu_input  timestamptz,
  pengisi      text,
  status       text,              -- Aktif / Batal
  waktu_batal  timestamptz,
  jumlah       numeric(12,3),
  satuan       text,
  harga_satuan numeric(14,2)
);
create index on acc_log (tanggal);

create table tg_acc_log (         -- TG_ACC_LOG (persetujuan lewat Telegram)
  id            text primary key,
  waktu         timestamptz,
  jenis         text,
  nomor         text,
  chat          text,
  pesan         text,
  status        text,
  diputus_oleh  text,
  waktu_putus   timestamptz,
  catatan       text
);

-- Payroll -------------------------------------------------------------

create table gaji_log (           -- GAJI_LOG
  periode            text not null, -- 'YYYY-MM'
  nama               text not null,
  divisi             text,
  gaji_pokok         numeric(14,2),
  uang_makan         numeric(14,2),
  lembur             numeric(14,2),
  bonus              numeric(14,2),
  bpjs_karyawan      numeric(14,2),
  bpjs_ditanggung_pt numeric(14,2),
  telat              numeric(14,2),
  kasbon             numeric(14,2),
  thp                numeric(14,2),
  status             text,
  diisi_oleh         text,
  waktu_isi          timestamptz,
  waktu_keputusan    timestamptz,
  catatan            text,
  kelompok           text,
  primary key (periode, nama)
);

-- =========================================================
-- RLS: kunci semua tabel dari anon/authenticated.
-- =========================================================
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;
