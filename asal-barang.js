/* Asal barang (Impor / Lokal) di form pengajuan & PO (11 Nov 2026).
 * Dimuat form-app.js ke dalam tampilan form (gudang, produksi, bahanbaku, purchasing) bersama window.__ASAL
 * = daftar barang impor manajemen (tabel barang_impor: { KODE: { a: 'impor' | 'campuran', n: nama } }).
 * Aturan manajemen Moscow Supplies:
 *   - asal 'impor'    : selalu Impor (tidak bisa diganti, dikirim juga ke Mike)
 *   - asal 'campuran' : kadang impor kadang lokal (baris kuning) -> staf WAJIB memilih Impor atau Lokal
 *   - selain itu      : selalu Lokal (tidak bisa diganti)
 */
(function () {
  'use strict';
  function ambil(k) { return (window.__ASAL || {})[String(k || '').trim().toUpperCase()] || null; }
  function jenis(kel, k) {
    if (kel && kel !== 'Barang jualan') return 'lokal';
    var a = ambil(k);
    return a ? a.a : 'lokal';
  }
  function e(s) { return String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  window.__asalAmbil = ambil;
  // 12 Nov 2026: stok di daftar pengajuan = stok Gudang Utama saja; stok Kantor Packing & toko hanya keterangan.
  window.__stokLain = function (x) {
    if (!x || (!x.kp && !x.toko)) return '';
    var f = function (n) { return (Math.round(Number(n) * 10) / 10).toLocaleString('id-ID'); };
    return ' <span style="color:#6b7280">(di luar gudang: KP ' + f(x.kp || 0) + ', toko ' + f(x.toko || 0) + ')</span>';
  };
  // tebakan awal: impor = true, campuran = null (belum dipilih), lainnya = false
  window.__asalTebak = function (kel, k) { var j = jenis(kel, k); return j === 'impor' ? true : j === 'campuran' ? null : false; };

  // pilihan di kartu pengajuan
  window.__asalPilih = function (it, i) {
    var j = jenis(it.kel, it.k);
    if (j !== 'campuran') {
      it.imp = j === 'impor';
      return '<label>Asal barang</label><select data-imp="' + i + '" disabled><option selected>' + (it.imp ? 'Impor (dikirim juga ke Mike)' : 'Lokal') + '</option></select>';
    }
    var h = '<label>Asal barang <b style="color:#9a3412">(bisa impor atau lokal, wajib dipilih)</b></label>' +
      '<select data-imp="' + i + '"' + (it.imp === null || it.imp === undefined ? ' style="border:2px solid #d97706"' : '') + '>';
    h += '<option value=""' + (it.imp === null || it.imp === undefined ? ' selected' : '') + '>- pilih Impor atau Lokal -</option>';
    h += '<option value="0"' + (it.imp === false ? ' selected' : '') + '>Lokal</option><option value="1"' + (it.imp === true ? ' selected' : '') + '>Impor (dikirim juga ke Mike)</option></select>';
    return h;
  };

  // sebelum kirim: barang campuran harus sudah dipilih; barang lain dipastikan sesuai daftar
  window.__asalCek = function (KR) {
    for (var i = 0; i < KR.length; i++) {
      var it = KR[i], j = jenis(it.kel, it.k);
      if (j === 'impor') { it.imp = true; continue; }
      if (j === 'lokal') { it.imp = false; continue; }
      if (it.imp === null || it.imp === undefined) {
        var s = document.querySelector('select[data-imp="' + i + '"]');
        if (s) { s.style.border = '2px solid #b3261e'; if (s.scrollIntoView) s.scrollIntoView({ block: 'center' }); }
        alert('Pilih asal barang (Impor atau Lokal) untuk ' + (it.n || it.k) + '. Barang ini kadang impor kadang beli lokal.');
        return false;
      }
    }
    return true;
  };

  // form PO: asal ditetapkan dari barang di PO; hanya bisa dipilih bila ada barang campuran
  window.__asalPo = function (po, asli) {
    var rows = (po && po.rows || []).filter(function (r) { return r && r.k; });
    if (!rows.length) return asli;
    var ada = { impor: [], campuran: [], lokal: [] };
    rows.forEach(function (r) { ada[jenis('Barang jualan', r.k)].push(r.k); });
    var tetap = null, ket = '';
    if (ada.impor.length && ada.lokal.length) {
      ket = ' <b style="color:#b3261e">(PO ini berisi barang impor ' + e(ada.impor.slice(0, 4).join(', ')) + ' dan barang lokal ' + e(ada.lokal.slice(0, 4).join(', ')) + '; sebaiknya dipisah jadi dua PO)</b>';
    } else if (ada.campuran.length) {
      ket = ' <b style="color:#9a3412">(' + e(ada.campuran.join(', ')) + ' bisa impor atau lokal, pilih sesuai pembelian ini)</b>';
      if (ada.impor.length) tetap = 'Impor'; else if (ada.lokal.length) tetap = 'Lokal';
    } else {
      tetap = ada.impor.length ? 'Impor' : 'Lokal';
    }
    if (tetap) {
      po.asal = tetap;
      return '<div><label>Asal barang' + ket + '</label><select data-po="asal" disabled><option selected>' + tetap + '</option></select></div>';
    }
    return '<div><label>Asal barang' + ket + '</label><select data-po="asal">' +
      ['Impor', 'Lokal'].map(function (x) { return '<option' + (x === po.asal ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></div>';
  };
})();
