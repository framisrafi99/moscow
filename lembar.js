/*
 * Moscow Supplies - "lembar": isi sheet lama dibaca dari Supabase (fungsi lembar_baca) dan disajikan persis seperti
 * sheet.getRange(2, 1, ...).getValues() di Apps Script: tanggal/waktu jadi Date, sel kosong jadi '', nomor baris sama.
 * Dipakai untuk menjalankan rumus Apps Script yang sama di halaman (gudang.js, dll.).
 */
(function () {
  'use strict';
  var TZ_JAM = 8; // Asia/Makassar, tanpa jam musim panas
  var JENIS = {
    barang_order: 'kode,nama_barang,harga_jual:n,kategori,varian_warna',
    gudang_stok_awal: 'kode,nama_barang,warna,qty:n',
    online_stok_awal: 'kode,nama_barang,kategori,warna,qty:n,hpp:n,harga_jual:n,per_tanggal:d,catatan',
    gudang_log: 'tanggal:d,jenis,kode,nama_barang,warna,qty:n,sumber_tujuan,waktu_masuk:t,pengisi,catatan,ref,qty_rusak:n',
    po_log: 'no_po,tanggal:d,asal,supplier,cara_bayar,total_barang:n,status,pengaju,waktu_ajuan:t,waktu_disetujui:t,waktu_dibayar:t,no_transaksi,resi_kode_kiriman,catatan,catatan_manajemen',
    po_item: 'no_po,kode,nama_barang,warna,qty:n,harga_satuan:n,subtotal:n',
    po_biaya: 'no_po,tanggal:d,jenis_biaya,nominal:n,cara_bayar,status_bayar,no_transaksi,waktu_masuk:t,pengisi,catatan',
    salur_log: 'tanggal:d,kode,nama,qty:n,waktu_masuk:t,pengirim,tujuan,warna',
    produksi_sesuai_log: 'no,waktu_ajuan:t,bagian,kode,nama_barang,warna,stok_sistem:n,hasil_hitung:n,selisih:n,alasan,pengaju,status,waktu_keputusan:t,catatan_manajemen',
    order_log: 'no_order,tanggal:d,pelanggan,tipe,kode,nama,qty:n,harga:n,diskon_persen:n,subtotal:n,nilai_diskon:n,total:n,status,waktu_masuk:t,pengisi,catatan,waktu_selesai:t',
    order_proses: 'waktu:t,no_order,aksi,oleh,kurir,resi,ongkir:n,foto,catatan,detail',
    pelanggan: 'nama_pelanggan,tipe,diskon_persen:n',
    pengadaan_ajuan: 'no,waktu:t,bagian,kelompok,kode,nama,satuan,qty:n,perkiraan_harga_satuan:n,alasan,pengaju,status_robot,analisa_robot,status,diputus_oleh,waktu_putus:t,catatan_putus,qty_disetujui:n,ref_po_supplier,waktu_pesan:t,perkiraan_datang:d,waktu_terima:t,asal_barang',
    bahan: 'jenis,nama,catatan,kode,stok_awal:n,stok_minimum:n,satuan'
  };

  function tanggal(s) {
    var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]) - TZ_JAM * 3600000) : '';
  }
  function nilai(v, j) {
    if (v === null || v === undefined) return '';
    if (j === 'd') return tanggal(v);
    if (j === 't') { var d = new Date(v); return isNaN(d.getTime()) ? '' : d; }
    if (j === 'n') return typeof v === 'number' ? v : Number(v);
    return String(v);
  }

  // data: hasil lembar_baca -> { tabel: { baris: [[...], ...] (mulai baris 2, padat seperti sheet), lebar } }
  function siapkan(data) {
    var L = {};
    Object.keys(data || {}).forEach(function (t) {
      var jenis = (JENIS[t] || '').split(',').map(function (x) { return x.split(':')[1] || 's'; });
      var rows = data[t] || [], padat = [], akhir = 1, tanpa = [];
      rows.forEach(function (r) {
        var isi = r.slice(1).map(function (v, i) { return nilai(v, jenis[i]); });
        if (r[0] === null) tanpa.push(isi); else { padat[r[0]] = isi; if (r[0] > akhir) akhir = r[0]; }
      });
      var out = [];
      for (var b = 2; b <= akhir; b++) out.push(padat[b] || jenis.map(function () { return ''; }));
      tanpa.forEach(function (x) { out.push(x); });
      L[t] = { baris: out, lebar: jenis.length };
    });
    return L;
  }

  // Sama dengan GD_baca_ / BH_baca_: baris 2..akhir, lebar kolom, kekurangan diisi ''.
  function baca(L, tabel, lebar) {
    var t = L[tabel];
    if (!t) return [];
    return t.baris.map(function (r) {
      var x = r.slice(0, Math.min(lebar, t.lebar));
      while (x.length < lebar) x.push('');
      return x;
    });
  }

  // Utilities.formatDate untuk Asia/Makassar.
  function format(d, pola) {
    var w = new Date(d.getTime() + TZ_JAM * 3600000), p = function (x) { return (x < 10 ? '0' : '') + x; };
    var Y = w.getUTCFullYear(), M = p(w.getUTCMonth() + 1), D = p(w.getUTCDate()), h = p(w.getUTCHours()), m = p(w.getUTCMinutes()), s = p(w.getUTCSeconds());
    return pola.replace('yyyy', Y).replace('MM', M).replace('dd', D).replace('HH', h).replace('mm', m).replace('ss', s);
  }

  async function muat(sb, tabel) {
    var r = await sb.rpc('lembar_baca', { p_tabel: tabel });
    if (r.error) throw new Error(r.error.message);
    return siapkan(r.data);
  }

  window.Lembar = { muat: muat, siapkan: siapkan, baca: baca, format: format };
})();
