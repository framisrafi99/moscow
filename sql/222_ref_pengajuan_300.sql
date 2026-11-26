-- 26 Nov 2026: keterangan pengadaan_ajuan.ref_po_supplier dipotong 120 huruf di bbk_beli, bbk_sampai,
-- produksi_simpan_masuk dan _pgd_ajuan (juga pengadaan.js). Ref panjang ("... · Form bahan baku PB-...")
-- membuat pengajuan tidak berubah jadi Diterima dan tetap muncul di daftar barang dibayar (klik ulang
-- bisa mencatat pembelian dobel). Diterapkan langsung: semua batas jadi 300 (sama dengan left(...,300)).
-- Data diperbaiki: PG-261109-001, PG-261109-003, PG-261120-002/003/004/005 -> Diterima;
-- PB-261116-001..003 (Alkohol 96% dobel) -> Batal; PG-261120-001 diberi ref dibayar Junior (TR-261125-005);
-- TR-261125-005 kategori -> Pembelian bahan baku.
do $$ declare f text; d text; begin
foreach f in array array['bbk_beli','bbk_sampai','produksi_simpan_masuk','_pgd_ajuan'] loop
  select pg_get_functiondef(p.oid) into d from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=f;
  d := replace(replace(d, '_rapi_spasi(ref_po_supplier, 120)', '_rapi_spasi(ref_po_supplier, 300)'), '_rapi_spasi(a.ref_po_supplier, 120)', '_rapi_spasi(a.ref_po_supplier, 300)');
  execute d;
end loop; end $$;
