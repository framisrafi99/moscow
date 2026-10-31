/* Robot rencana produksi (Master Data > Produksi, form staf produksi & bahan baku) dihitung langsung dari Supabase (1 Nov 2026).
 * Salinan rencanaProduksi (Apps Script file 33). Bagian-bagiannya memakai rumus yang sudah dipindah:
 *   katalog, kategori, warna, stok gudang produksi : produksi.js
 *   stok Gudang Utama & order reseller             : gudang.js
 *   stok Kantor Packing                            : kp.js
 *   stok toko & consignment                        : rpc toko_stok_hitung
 * Butuh: lembar.js, gudang.js, kp.js, produksi.js.
 */
(function () {
  'use strict';
  var TARGET = 45, KRITIS = 14, PERLU = 30, AMAN = 60, DATA = 90, KP = 'kantor packing';
  function geser(t, n) { var d = new Date(t + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function selisih(a, b) { return Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000); }
  function warnaKode(kode) { var s = String(kode || '').trim().toUpperCase(), i = s.indexOf('-'); return i === -1 ? '' : s.slice(i + 1); }
  function rapiWarna(v) { return String(v === null || v === undefined ? '' : v).replace(/\s+/g, ' ').trim().toUpperCase(); }
  function kodeDasar(k) { return String(k).trim().toUpperCase().split('-')[0]; }
  async function semua(sb, tabel, kolom) {
    var out = [], dari = 0;
    for (;;) {
      var r = await sb.from(tabel).select(kolom).order('baris_sheet', { ascending: true, nullsFirst: false }).order('id').range(dari, dari + 999);
      if (r.error) throw r.error;
      out = out.concat(r.data || []);
      if (!r.data || r.data.length < 1000) return out;
      dari += 1000;
    }
  }

  async function hitung(sb) {
    var fmt = window.Lembar.format;
    var pel = await sb.from('pelanggan').select('nama_pelanggan,tipe,baris_sheet,id').order('baris_sheet', { ascending: true, nullsFirst: false }).order('id');
    var toko = [], adaToko = {};
    (pel.data || []).forEach(function (r) {
      var n = String(r.nama_pelanggan || '').trim();
      if (!n || String(r.tipe || '').trim() !== 'Consignment' || adaToko[n]) return;
      adaToko[n] = true; toko.push(n);
    });
    var h = await Promise.all([
      window.Lembar.muat(sb, ['katalog', 'barang_order', 'produksi_log', 'salur_log', 'produksi_sesuai_log', 'gudang_log', 'gudang_stok_awal', 'order_log']),
      sb.rpc('produksi_awal'),
      window.KantorPacking.siap(sb),
      semua(sb, 'toko_jual_log', 'id,baris_sheet,tanggal,kode,qty_terjual,warna'),
      Promise.all(toko.map(function (n) { return sb.rpc('toko_stok_hitung', { p_toko: n }); }))
    ]);
    var L = h[0], PR = window.Produksi.buat(L), G = window.Gudang.buat(L), A = h[2].A;
    var hariIni = fmt(new Date(), 'yyyy-MM-dd'), a90 = geser(hariIni, -(DATA - 1));
    var katalog = PR.katalog(), kat = PR.kategori(), warnaAda = PR.warna(), produk = {};
    Object.keys(katalog).forEach(function (k) { produk[k] = true; });

    // Stok jaringan
    var stok = {}, stokW = {};
    var tambahStok = function (bag, k, q) {
      if (!produk[k] || !q || !isFinite(q)) return;
      var s = stok[k] || (stok[k] = { gd: 0, prod: 0, toko: 0, kp: 0 });
      s[bag] += q;
    };
    var gdLog = G.log(), st = G.stok(gdLog);
    Object.keys(st).forEach(function (key2) {
      var pr = key2.split('|'), k = pr[0], w = pr[1] || '';
      tambahStok('gd', k, st[key2]);
      if (produk[k] && w) { var o = stokW[k] || (stokW[k] = {}); o[w] = (o[w] || 0) + st[key2]; }
    });
    try {
      var awal = (function (r) { if (!r || r.error || !r.data) return null; var d = r.data, out = {}; if (Array.isArray(d.urut)) { d.urut.forEach(function (x) { out[x[0]] = x[1]; }); return out; } return d.urut === undefined ? d : null; })(h[1]);
      if (awal) { var hp = PR.ambilStok(awal).stok; Object.keys(hp).forEach(function (k) { tambahStok('prod', k, Number(hp[k]) || 0); }); }
    } catch (e) { }
    h[4].forEach(function (r) { if (r.error) return; (r.data || []).forEach(function (x) { if (x.kode) tambahStok('toko', x.kode, Math.max(0, Number(x.qty) || 0)); }); });
    A.on.list.forEach(function (x) { tambahStok('kp', String(x.k).toUpperCase(), Math.max(0, Number(x.q) || 0)); });

    // Laku (semua saluran)
    var laku = {}, lakuW = {}, pertama = '';
    var catatLaku = function (t, kode, warna, q) {
      if (!t || t > hariIni || !q || !isFinite(q)) return;
      var k = kodeDasar(kode);
      if (!produk[k]) return;
      if (!pertama || t < pertama) pertama = t;
      if (t < a90) return;
      laku[k] = (laku[k] || 0) + q;
      var w = rapiWarna(warna || warnaKode(kode));
      if (w && warnaAda[k]) { var o = lakuW[k] || (lakuW[k] = {}); o[w] = (o[w] || 0) + q; }
    };
    h[3].forEach(function (r) { if (r.tanggal) catatLaku(String(r.tanggal).slice(0, 10), r.kode === null ? '' : r.kode, r.warna, Number(r.qty_terjual) || 0); });
    G.om.kumpul('0000-01-01', '9999-12-31').forEach(function (o) {
      if (o.tp !== 'Reseller' || !/^(dikirim|selesai)$/i.test(o.st)) return;
      o.items.forEach(function (it) { catatLaku(o.t, it.k, '', Number(it.q) || 0); });
    });
    gdLog.forEach(function (x) { if (/^keluar/i.test(x.j) && String(x.st).toLowerCase() === KP) catatLaku(x.t, x.k, x.w, x.q); });
    window.Lembar.baca(L, 'salur_log', 8).forEach(function (r) {
      if (!(r[0] instanceof Date) || String(r[6]).trim().toLowerCase() !== KP) return;
      catatLaku(fmt(r[0], 'yyyy-MM-dd'), r[1], r[7], Number(r[3]) || 0);
    });

    // Robot
    var hari = pertama ? Math.min(DATA, selisih(pertama, hariIni) + 1) : 0;
    var hariHitung = hari ? Math.max(hari, KRITIS) : 0;
    var urutSt = { 'Kritis': 0, 'Perlu dibuat': 1, 'Aman': 2, 'Berlebih': 3, 'Belum laku': 4, 'Belum ada data': 5 };
    var list = Object.keys(katalog).map(function (k) {
      var s = stok[k] || { gd: 0, prod: 0, toko: 0, kp: 0 };
      var tot = Math.max(0, s.gd + s.prod + s.toko);
      var q90 = laku[k] || 0, r = hariHitung ? q90 / hariHitung : 0;
      var cukup = r > 0 ? Math.round(tot / r) : null, stt;
      if (!hariHitung) stt = 'Belum ada data';
      else if (!(r > 0)) stt = 'Belum laku';
      else if (cukup < KRITIS) stt = 'Kritis';
      else if (cukup < PERLU) stt = 'Perlu dibuat';
      else if (cukup <= AMAN) stt = 'Aman';
      else stt = 'Berlebih';
      var saran = (stt === 'Kritis' || stt === 'Perlu dibuat') ? Math.max(0, Math.ceil(r * TARGET - tot)) : 0;
      var warna = [];
      if (warnaAda[k] && lakuW[k]) {
        var lw = lakuW[k], totW = Object.keys(lw).reduce(function (a, w) { return a + lw[w]; }, 0);
        warna = Object.keys(lw).map(function (w) {
          var porsi = totW ? lw[w] / totW : 0, rw = r * porsi, gdw = (stokW[k] || {})[w] || 0;
          var butuh = Math.max(0, Math.ceil(rw * TARGET - gdw - (tot - s.gd) * porsi));
          return { w: w, laku: lw[w], gd: gdw, saran: saran ? butuh : 0 };
        }).sort(function (a, b) { return b.saran - a.saran || b.laku - a.laku; });
      }
      return { k: k, n: katalog[k], kat: kat[k] || 'Lainnya', gd: s.gd, prod: s.prod, toko: s.toko, kp: s.kp, tot: tot,
        laku: q90, r: Math.round(r * 100) / 100, cukup: cukup, st: stt, saran: saran, warna: warna };
    }).sort(function (a, b) {
      var x = urutSt[a.st] - urutSt[b.st];
      if (x) return x;
      if (a.cukup !== null && b.cukup !== null && a.cukup !== b.cukup) return a.cukup - b.cukup;
      return b.saran - a.saran;
    });
    var n = { 'Kritis': 0, 'Perlu dibuat': 0, 'Aman': 0, 'Berlebih': 0 }, totSaran = 0;
    list.forEach(function (x) { if (n[x.st] !== undefined) n[x.st]++; totSaran += x.saran; });
    return { ok: true, hari: hari, target: TARGET, batas: { kritis: KRITIS, perlu: PERLU, aman: AMAN },
      n: n, totSaran: totSaran, list: list, diperbarui: fmt(new Date(), 'dd/MM/yyyy HH:mm') };
  }

  window.RencanaProduksi = { hitung: hitung };
})();
