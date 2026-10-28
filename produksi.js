/*
 * Moscow Supplies - data form produksi dari Supabase. Salinan rumus Apps Script dengan lembar.js.
 *   kemasanHargaData (file 4): harga botol, stiker, dan packaging dari catatan barang masuk.
 */
(function () {
  'use strict';
  var TABEL = ['bahan', 'bahan_masuk'];

  function buat(L) {
    var fmt = window.Lembar.format;
    function baca(t, w) { return window.Lembar.baca(L, t, w); }
    function rapi(v, maks) { return String(v === null || v === undefined ? '' : v).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maks || 200); }
    function tgl(v) {
      if (v instanceof Date) return fmt(v, 'yyyy-MM-dd');
      var m = String(v || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      return m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : '';
    }
    function banding(a, b) { return String(a).localeCompare(String(b), 'id', { sensitivity: 'base', numeric: true }); }
    function barang() {
      var out = {};
      baca('bahan', 7).forEach(function (r) {
        var j = /stik/i.test(String(r[0])) ? 'Stiker' : (/botol/i.test(String(r[0])) ? 'Botol' : '');
        var n = rapi(r[1], 60);
        if (!j || !n) return;
        var kel = /packag/i.test(String(r[2])) ? 'Packaging' : j;
        var s = rapi(r[6], 15) || (j === 'Botol' ? 'pcs' : (/roll/i.test(n) ? 'roll' : 'lembar'));
        out[n.toLowerCase()] = { n: n, kel: kel, s: s };
      });
      return out;
    }
    function masuk(brg) {
      var out = [];
      baca('bahan_masuk', 10).forEach(function (r, i) {
        var t = tgl(r[0]), n = rapi(r[2], 60), q = Number(r[3]);
        if (!t || !n || !isFinite(q) || q <= 0) return;
        var b = brg[n.toLowerCase()] || { n: n, kel: /stik/i.test(String(r[1])) ? 'Stiker' : 'Botol', s: /botol/i.test(String(r[1])) ? 'pcs' : (/roll/i.test(n) ? 'roll' : 'lembar') };
        var h = Number(String(r[7]).replace(/[^0-9.]/g, ''));
        out.push({ baris: i + 2, t: t, n: b.n, kel: b.kel, s: b.s, q: q, c: rapi(r[6], 120), p: rapi(r[5], 40),
          h: (r[7] !== '' && isFinite(h) && h > 0) ? h : 0, sup: rapi(r[8], 60) });
      });
      var per = {};
      out.forEach(function (x) {
        x.hs = x.h ? Math.round(x.h / x.q * 100) / 100 : 0; x.hp = 0; x.tp = ''; x.pc = null;
        if (x.hs) (per[x.n.toLowerCase()] = per[x.n.toLowerCase()] || []).push(x);
      });
      Object.keys(per).forEach(function (k) {
        var a = per[k].sort(function (p, q) { return p.t < q.t ? -1 : p.t > q.t ? 1 : p.baris - q.baris; });
        for (var i = 1; i < a.length; i++) {
          a[i].hp = a[i - 1].hs; a[i].tp = a[i - 1].t;
          a[i].pc = Math.round((a[i].hs - a[i - 1].hs) / a[i - 1].hs * 1000) / 10;
        }
      });
      return out;
    }
    function ringkas(x) { return { baris: x.baris, t: x.t, n: x.n, kel: x.kel, s: x.s, q: x.q, c: x.c, p: x.p, h: x.h, sup: x.sup, hs: x.hs, hp: x.hp, tp: x.tp, pc: x.pc }; }
    function daftarHarga(m) {
      var akhir = {};
      m.forEach(function (x) {
        if (!x.hs) return;
        var k = x.n.toLowerCase(), a = akhir[k];
        if (!a || x.t > a.t || (x.t === a.t && x.baris > a.baris)) akhir[k] = x;
      });
      var urut = { Botol: 0, Stiker: 1, Packaging: 2 };
      return Object.keys(akhir).map(function (k) {
        var x = akhir[k];
        return { n: x.n, kel: x.kel, s: x.s, hs: x.hs, t: x.t, sup: x.sup, hp: x.hp, tp: x.tp, pc: x.pc };
      }).sort(function (a, b) { return ((urut[a.kel] || 9) - (urut[b.kel] || 9)) || banding(a.n, b.n); });
    }
    function kemasanHargaData() {
      var m = masuk(barang());
      var baru = function (a, b) { return a.t < b.t ? 1 : a.t > b.t ? -1 : b.baris - a.baris; };
      var batas = fmt(new Date(Date.now() - 90 * 86400000), 'yyyy-MM-dd');
      return {
        ok: true,
        tanpa: m.filter(function (x) { return !x.h && x.t >= batas; }).sort(baru).slice(0, 60).map(ringkas),
        riwayat: m.filter(function (x) { return x.h; }).sort(baru).slice(0, 150).map(ringkas),
        harga: daftarHarga(m),
        diperbarui: fmt(new Date(), 'dd/MM/yyyy HH:mm')
      };
    }
    return { kemasanHargaData: kemasanHargaData };
  }

  window.Produksi = {
    kemasanHargaData: async function (sb) { return buat(await window.Lembar.muat(sb, TABEL)).kemasanHargaData(); },
    buat: buat, TABEL: TABEL
  };
})();
