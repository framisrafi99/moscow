/*
 * Moscow Supplies - widget "HPP & Harga" di form staf (hppStafData, file 39 Apps Script) dihitung di halaman.
 * Daftar barang dari lembar barang_order (sama dengan GD_barang_); HPP dan usulan yang masih Menunggu dari fungsi
 * Supabase hpp_staf (HPP = potret MM_hppPeta_ yang dihitung Apps Script tiap sinkron).
 * Mode manajemen (dibuka dari Master Data) dan link consignment tetap lewat Apps Script.
 */
(function () {
  'use strict';
  var LINK = { gudang: 'Gudang Utama', produksi: 'Staf Produksi', bahanbaku: 'Staf Bahan Baku' };

  function MM_rapi_(v, n) { return String(v === null || v === undefined ? '' : v).replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n || 200); }
  function MM_jenisDari_(teks) { return teks === 'HPP' ? 'hpp' : teks === 'Harga Jual' ? 'harga' : teks === 'Harga Dasar' ? 'hd' : ''; }

  function GD_barang_(L) {
    var out = [], dilihat = {};
    window.Lembar.baca(L, 'barang_order', 5).forEach(function (r) {
      var kode = String(r[0]).trim().toUpperCase();
      if (!kode || kode.indexOf('-') !== -1 || dilihat[kode]) return;
      dilihat[kode] = true;
      var h = Number(r[2]), harga = (r[2] === '' || !isFinite(h) || h < 0) ? 0 : h;
      out.push({ k: kode, n: String(r[1]).trim(), kat: String(r[3]).trim() || 'Lainnya', h: Number(harga) || 0 });
    });
    return out;
  }

  async function hppStafData(sb, app, p) {
    var link = LINK[app];
    if (!link || (p && p.mm)) return null;
    var hasil = await Promise.all([window.Lembar.muat(sb, ['barang_order']), sb.rpc('hpp_staf')]);
    var L = hasil[0], r = hasil[1];
    if (r.error) throw new Error(r.error.message);
    var hpp = (r.data && r.data.hpp) || {};
    var tunggu = {};
    ((r.data && r.data.usul) || []).forEach(function (u) {
      var j = MM_rapi_(u[3], 30), k = MM_rapi_(u[4], 30).toUpperCase();
      if (j === 'Harga Dasar') return;
      var w = u[1] ? new Date(u[1]) : null;
      var wk = w && !isNaN(w.getTime()) ? window.Lembar.format(w, 'dd/MM/yyyy HH:mm') : MM_rapi_(u[1], 20);
      tunggu[MM_jenisDari_(j) + '|' + k] = { baru: Number(u[5]) || 0, nama: MM_rapi_(u[2], 60), wk: wk };
    });
    var barang = GD_barang_(L).map(function (b) {
      return { k: b.k, n: b.n, kat: b.kat, hj: b.h || 0, hpp: Math.round(hpp[b.k] || 0) };
    });
    return { ok: true, mgmt: false, toko: '', link: link, barang: barang, tunggu: tunggu };
  }

  window.Hpp = { hppStafData: hppStafData };
})();
