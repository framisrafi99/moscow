/* Moscow Supplies - Re-stock produk di form toko & consignment (12 Nov 2026). Berjalan DI DALAM bingkai form toko.
 * Sumber angka: RPC toko_restok_info (sql 205), sama dengan yang dipakai Persetujuan Master Data.
 * - Di setiap barang tampil: stok Gudang Utama yang tersedia, stok toko, rata-rata laku per bulan, dan saran robot.
 * - Jumlah yang diketik tidak bisa melebihi stok Gudang Utama (server juga menolak).
 * - Saran robot = jumlah supaya stok toko cukup paling lama 2 bulan; jumlah di atas itu diberi peringatan.
 * - Tombol "Isi sesuai saran robot" mengisi semua barang yang disarankan sekaligus.
 * Kait yang dipasang consignment-app.js ke form lama: __rstInfo, __rstBatas, __rstTolak, __rstCek (dipanggil form), __rstIsi, __rstGambar (disediakan form).
 */
(function () {
  'use strict';
  var R = null; // { hari, target, items: {kunci: [gd, terjual, rataBulan, saran, butuh2bln]}, kode: {k: [stokToko, rataBulan]} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function f(n) { n = Math.round((Number(n) || 0) * 10) / 10; var p = String(Math.abs(n)).split('.'); return (n < 0 ? '-' : '') + p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (p[1] ? ',' + p[1] : ''); }
  function $(i) { return document.getElementById(i); }
  function dasar(k) { return String(k).split('-')[0]; }
  function brs(k) { return R && R.items[k] ? R.items[k] : null; }
  function kd(k) { return R && R.kode[dasar(k)] ? R.kode[dasar(k)] : [0, 0]; }
  var ABU = 'display:block;margin-top:3px;font-size:12px;color:#5A6677;font-weight:500', MERAH = 'color:#B42318;font-weight:700', HIJAU = 'color:#146C43;font-weight:700', JINGGA = 'color:#9A5B00;font-weight:700';

  // Keterangan di bawah nama barang. kq = kunci lengkap (kode, atau kode-WARNA; '' kalau warna belum dipilih).
  window.__rstInfo = function (kode, kq) {
    if (!R) return '';
    var t = kd(kode), h = '';
    if (!kq) {
      h = 'stok toko ' + f(t[0]) + ' (semua warna) &middot; laku ' + f(t[1]) + '/bln &middot; pilih warna untuk melihat stok gudang, stok toko, dan saran';
    } else {
      // b[5] = stok toko untuk barang / warna ini; null = toko belum punya hitung stok per warna (dipakai stok semua warna).
      var b = brs(kq) || [0, 0, 0, 0, 0, null], warna = kq !== kode, pasti = b[5] !== null && b[5] !== undefined;
      h = (b[0] > 0 ? 'Gudang <b>' + f(b[0]) + '</b>' : '<span style="' + MERAH + '">Gudang kosong</span>') +
        ' &middot; stok toko ' + (pasti ? f(b[5]) : f(t[0]) + (warna ? ' (semua warna)' : '')) + ' &middot; laku ' + f(b[2]) + '/bln' +
        (b[3] > 0 ? ' &middot; <span style="' + HIJAU + '">saran ' + f(b[3]) + '</span>' : (b[4] > 0 ? ' &middot; <span style="' + JINGGA + '">perlu ' + f(b[4]) + ', gudang kosong</span>' : ' &middot; saran 0'));
    }
    return '<span style="' + ABU + '">' + h + '</span><span id="rw_' + esc(kode) + '" style="display:block;font-size:12px"></span>';
  };

  function peringatan(kode, kq, q) {
    var el = $('rw_' + kode); if (!el) return;
    var b = brs(kq); if (!b || !(q > 0)) { el.innerHTML = ''; return; }
    if (b[4] <= 0) el.innerHTML = '<span style="' + JINGGA + '">' + (b[2] > 0 ? 'Stok toko masih cukup untuk 2 bulan.' : 'Belum ada penjualan ' + R.hari + ' hari terakhir.') + ' Request ini akan ditinjau manajemen.</span>';
    else if (q > b[4]) el.innerHTML = '<span style="' + JINGGA + '">Lebih dari kebutuhan 2 bulan (cukup ' + f(b[4]) + ' pcs).</span>';
    else el.innerHTML = '';
  }

  // Dipanggil form setiap jumlah diketik: dibatasi stok Gudang Utama.
  window.__rstBatas = function (inp, kq) {
    if (!R || !kq || !inp) return;
    var kode = inp.getAttribute('data-k'), b = brs(kq) || [0, 0, 0, 0, 0], q = Number(inp.value);
    if (inp.value !== '' && isFinite(q) && q > b[0]) {
      inp.value = b[0] > 0 ? String(b[0]) : '';
      var el = $('rw_' + kode);
      if (el) { el.innerHTML = '<span style="' + MERAH + '">' + (b[0] > 0 ? 'Stok Gudang Utama hanya ' + f(b[0]) + ' pcs. Jumlah disesuaikan.' : 'Stok Gudang Utama kosong, belum bisa diminta.') + '</span>'; return; }
    }
    peringatan(kode, kq, Number(inp.value));
  };

  // Dipanggil form saat "Periksa & simpan": tolak kalau masih ada yang melebihi stok gudang.
  window.__rstTolak = function (items) {
    if (!R) return '';
    for (var i = 0; i < items.length; i++) {
      var b = brs(items[i].kode) || [0];
      if (items[i].qty > b[0]) return 'Stok Gudang Utama untuk ' + items[i].nama + ' tinggal ' + f(b[0]) + ' pcs. Kurangi jumlahnya.';
    }
    return '';
  };

  // Ringkasan di layar periksa: barang yang melebihi kebutuhan 2 bulan.
  window.__rstCek = function (items) {
    if (!R) return '';
    var L = items.filter(function (it) { var b = brs(it.kode); return b && it.qty > b[4]; });
    if (!L.length) return '<div style="margin-top:10px;padding:10px 12px;border-radius:12px;background:#E9F7EF;color:#146C43;font-size:13px">&#9989; Semua jumlah sesuai kebutuhan paling lama 2 bulan.</div>';
    return '<div style="margin-top:10px;padding:10px 12px;border-radius:12px;background:#FFF6E6;color:#7A4A00;font-size:13px"><b>' + L.length + ' barang melebihi kebutuhan 2 bulan</b> (dihitung dari rata-rata penjualan ' + R.hari +
      ' hari terakhir). Order tetap bisa disimpan, tetapi akan ditinjau manajemen Moscow Supplies:<ul style="margin:6px 0 0;padding-left:18px">' +
      L.slice(0, 12).map(function (it) { var b = brs(it.kode); return '<li>' + esc(it.nama) + ': minta ' + f(it.qty) + ', ' + (b[4] > 0 ? 'cukup ' + f(b[4]) : (b[2] > 0 ? 'stok toko masih cukup' : 'belum ada penjualan')) + '</li>'; }).join('') +
      (L.length > 12 ? '<li>... dan ' + (L.length - 12) + ' barang lain</li>' : '') + '</ul></div>';
  };

  function kartu() {
    var d = $('daftar'); if (!d || !R) return;
    var el = $('rstKartu'); if (!el) { el = document.createElement('div'); el.id = 'rstKartu'; var cari = $('cari'); (cari || d).parentNode.insertBefore(el, cari || d); }
    var ks = Object.keys(R.items).filter(function (k) { return R.items[k][3] > 0; }), tot = 0, tahan = 0;
    ks.forEach(function (k) { tot += R.items[k][3]; });
    Object.keys(R.items).forEach(function (k) { if (R.items[k][4] > R.items[k][3]) tahan++; });
    el.style.cssText = 'margin:0 0 12px;padding:12px 14px;border-radius:14px;background:#EEF6FB;border:1px solid #CFE3EF;font-size:13px;color:#0F1B2A';
    el.innerHTML = '<b style="font-size:14px">&#129302; Saran robot re-stock</b><div style="margin-top:4px">' +
      (ks.length ? '<b>' + ks.length + ' barang</b> disarankan diminta (' + f(tot) + ' pcs) supaya stok toko cukup paling lama 2 bulan.' : 'Stok toko masih cukup untuk 2 bulan. Tidak ada barang yang perlu diminta sekarang.') +
      (tahan ? ' ' + tahan + ' barang lain perlu, tetapi stok Gudang Utama kosong atau kurang.' : '') +
      '</div><div style="margin-top:4px;color:#5A6677">Dihitung dari rata-rata penjualan ' + R.hari + ' hari terakhir dan stok toko saat ini. Jumlah request tidak bisa melebihi stok Gudang Utama.</div>' +
      (ks.length ? '<button type="button" id="rstIsiBtn" class="btn" style="margin-top:10px">Isi sesuai saran robot (' + ks.length + ' barang)</button>' : '');
    var b = $('rstIsiBtn');
    if (b) b.onclick = function () {
      var m = {}; ks.forEach(function (k) { m[k] = R.items[k][3]; });
      if (window.__rstIsi) window.__rstIsi(m);
      b.textContent = 'Terisi. Periksa lagi jumlahnya, lalu tekan Periksa & simpan';
    };
  }

  function muat() {
    var p = window.parent && window.parent.__restokInfo; if (!p) return;
    p().then(function (d) {
      if (!d || !d.ok) return;
      R = d; kartu();
      if (window.__rstGambar) window.__rstGambar();
    }, function () { });
  }
  window.__rstMuat = muat;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', muat); else setTimeout(muat, 0);
})();
