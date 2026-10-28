/*
 * Moscow Supplies - data form produksi dari Supabase. Salinan rumus Apps Script dengan lembar.js.
 *   kemasanHargaData (file 4): harga botol, stiker, dan packaging dari catatan barang masuk.
 *   stokBahan (file 7): stok botol & stiker bulan ini (awal, masuk, pakai, rusak, penyesuaian).
 *   ambilBahan, ambilOrderProduksi (file 1), prodSesuaiDaftar (file 7, 13, 15): tab Botol & stiker, Order masuk,
 *   Penyesuaian stok di form staf produksi.
 */
(function () {
  'use strict';
  var TABEL = ['bahan', 'bahan_masuk'];
  var TABEL_STOK = ['bahan', 'bahan_masuk', 'bahan_log', 'bahan_rusak', 'produksi_sesuai_log'];
  var STATUS_ORDER_ = ['Menunggu', 'Disetujui', 'Dikirim', 'Selesai', 'Batal'];

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
    // ---- stokBahan (file 7) ----
    function STM_kunci_(nama) { return String(nama).replace(/\s+/g, ' ').trim().toLowerCase(); }
    function STM_bacaDaftar_() {
      var out = [], ada = {};
      baca('bahan', 6).forEach(function (r) {
        var j = /stik/i.test(String(r[0])) ? 'Stiker' : (/botol/i.test(String(r[0])) ? 'Botol' : '');
        var n = String(r[1]).replace(/\s+/g, ' ').trim();
        if (!j || !n || ada[STM_kunci_(n)]) return;
        ada[STM_kunci_(n)] = true;
        var awal = Number(r[4]);
        var min = (r[5] !== '' && isFinite(Number(r[5]))) ? Number(r[5]) : null;
        out.push({ j: j, n: n, k: String(r[3]).trim(), awal: isFinite(awal) ? awal : 0, min: min });
      });
      return out;
    }
    function STM_bacaCatatan_(tabel) {
      var out = [];
      baca(tabel, 7).forEach(function (r) {
        if (!(r[0] instanceof Date)) return;
        var n = String(r[2] || '').replace(/\s+/g, ' ').trim(), q = Number(r[3]);
        if (!n || !isFinite(q) || !q) return;
        out.push({
          t: fmt(r[0], 'yyyy-MM-dd'), ms: r[4] instanceof Date ? r[4].getTime() : 0,
          j: String(r[1] || '').trim(), n: n, q: q, p: String(r[5] || '').slice(0, 40), c: String(r[6] || '').slice(0, 200)
        });
      });
      return out;
    }
    function PSS_baca_() {
      var out = [];
      baca('produksi_sesuai_log', 14).forEach(function (r, i) {
        var no = String(r[0] || '').trim();
        if (!no) return;
        var sel = Number(r[8]);
        out.push({ baris: i + 2, no: no, wa: r[1] instanceof Date ? r[1] : null,
          bg: String(r[2] || '').trim(), k: String(r[3] || '').trim().toUpperCase(), n: String(r[4] || '').replace(/\s+/g, ' ').trim(),
          w: String(r[5] === null || r[5] === undefined ? '' : r[5]).replace(/\s+/g, ' ').trim().toUpperCase(), sis: Number(r[6]) || 0, hit: Number(r[7]) || 0, sel: isFinite(sel) ? sel : 0,
          al: String(r[9] || ''), pg: String(r[10] || ''), st: String(r[11] || '').trim(),
          wk: r[12] instanceof Date ? r[12] : null, cat: String(r[13] || '') });
      });
      return out;
    }
    function STM_terbaru_(a) {
      a.sort(function (x, y) { return x.t < y.t ? 1 : x.t > y.t ? -1 : y.ms - x.ms; });
      return a.slice(0, 30).map(function (x) { return { t: x.t, j: x.j, n: x.n, q: x.q, p: x.p, c: x.c }; });
    }
    function stokBahan() {
      var bulan = fmt(new Date(), 'yyyy-MM');
      var masuk = STM_bacaCatatan_('bahan_masuk'), pakai = STM_bacaCatatan_('bahan_log'), rusak = STM_bacaCatatan_('bahan_rusak');
      var jml = {};
      var isi = function (nama, b, iLalu, iKini, q) {
        if (b > bulan) return;
        var k = STM_kunci_(nama);
        if (!jml[k]) jml[k] = [0, 0, 0, 0, 0, 0, 0, 0];
        jml[k][b < bulan ? iLalu : iKini] += q;
      };
      masuk.forEach(function (x) { isi(x.n, x.t.slice(0, 7), 0, 1, x.q); });
      pakai.forEach(function (x) { isi(x.n, x.t.slice(0, 7), 2, 3, x.q); });
      rusak.forEach(function (x) { isi(x.n, x.t.slice(0, 7), 4, 5, x.q); });
      PSS_baca_().forEach(function (x) {
        if (x.bg === 'Produksi' || x.st !== 'Disetujui' || !x.wk || !x.sel || !x.n) return;
        isi(x.n, fmt(x.wk, 'yyyy-MM'), 6, 7, x.sel);
      });
      var barang = STM_bacaDaftar_().map(function (b) {
        var x = jml[STM_kunci_(b.n)] || [0, 0, 0, 0, 0, 0, 0, 0];
        var aw = b.awal + x[0] - x[2] - x[4] + x[6];
        return { j: b.j, n: b.n, k: b.k, aw: aw, ms: x[1], pk: x[3], rs: x[5], sy: x[7], ss: aw + x[1] - x[3] - x[5] + x[7], min: b.min };
      });
      return { ok: true, barang: barang, masuk: STM_terbaru_(masuk), rusak: STM_terbaru_(rusak),
        bulan: fmt(new Date(), 'MM/yyyy'), diperbarui: fmt(new Date(), 'dd/MM/yyyy HH:mm') };
    }

    // ---- ambilBahan (file 1): pemakaian botol & stiker bulan ini ----
    function bacaBahan_() {
      var out = [], ada = {};
      baca('bahan', 2).forEach(function (r) {
        var j = /stik/i.test(String(r[0])) ? 'Stiker' : (/botol/i.test(String(r[0])) ? 'Botol' : '');
        var n = String(r[1]).replace(/\s+/g, ' ').trim();
        if (!j || !n || ada[j + '|' + n.toLowerCase()]) return;
        ada[j + '|' + n.toLowerCase()] = true;
        out.push({ j: j, n: n });
      });
      return out;
    }
    function dataBahan_(dari, sampai) {
      var log = [], rekap = [], idx = {};
      baca('bahan_log', 7).forEach(function (r) {
        if (!(r[0] instanceof Date)) return;
        var tgl = fmt(r[0], 'yyyy-MM-dd');
        if (tgl < dari || tgl > sampai) return;
        var j = String(r[1]).trim(), n = String(r[2]).trim(), q = Number(r[3]) || 0;
        var kunci = j + '|' + n.toLowerCase();
        if (!(kunci in idx)) { idx[kunci] = rekap.length; rekap.push({ j: j, n: n, q: 0 }); }
        rekap[idx[kunci]].q += q;
        log.push({ t: tgl, ms: r[4] instanceof Date ? r[4].getTime() : 0, j: j, n: n, q: q, p: String(r[5]).slice(0, 40), c: String(r[6]) });
      });
      log.sort(function (a, b) { return a.t < b.t ? 1 : a.t > b.t ? -1 : b.ms - a.ms; });
      rekap.sort(function (a, b) { return a.j < b.j ? -1 : a.j > b.j ? 1 : (a.n.toLowerCase() < b.n.toLowerCase() ? -1 : 1); });
      return { rekap: rekap, log: log.slice(0, 300).map(function (x) { return { t: x.t, j: x.j, n: x.n, q: x.q, p: x.p, c: x.c }; }) };
    }
    function ambilBahan() {
      var hariIni = fmt(new Date(), 'yyyy-MM-dd');
      var d = dataBahan_(hariIni.slice(0, 8) + '01', hariIni);
      return { ok: true, daftar: bacaBahan_(), rekap: d.rekap, log: d.log };
    }
    // ---- ambilOrderProduksi (file 1) ----
    function salahPeriode_(dari, sampai) {
      var re = /^\d{4}-\d{2}-\d{2}$/;
      if (!re.test(dari) || !re.test(sampai)) return 'Tanggal tidak valid.';
      if (dari > sampai) return 'Tanggal awal harus sebelum tanggal akhir.';
      return '';
    }
    function kumpulOrder_(dari, sampai) {
      var map = {}, urut = [];
      baca('order_log', 16).forEach(function (r) {
        var no = String(r[0]).trim();
        if (!no || !(r[1] instanceof Date)) return;
        var tgl = fmt(r[1], 'yyyy-MM-dd');
        if (tgl < dari || tgl > sampai) return;
        if (!map[no]) {
          map[no] = { no: no, t: tgl, pl: String(r[2]), tp: String(r[3]), d: Number(r[8]) || 0, sub: 0, disk: 0, tot: 0,
            st: String(r[12]) || STATUS_ORDER_[0], p: String(r[14]).replace(/^form:?\s*/, ''), c: String(r[15]),
            ms: r[13] instanceof Date ? r[13].getTime() : 0, items: [] };
          urut.push(map[no]);
        }
        var o = map[no];
        o.items.push({ k: String(r[4]), n: String(r[5]), q: Number(r[6]) || 0 });
      });
      urut.sort(function (a, b) { return a.t < b.t ? 1 : a.t > b.t ? -1 : b.ms - a.ms; });
      return urut;
    }
    function ambilOrderProduksi(p) {
      var dari = String((p && p.dari) || ''), sampai = String((p && p.sampai) || '');
      var salah = salahPeriode_(dari, sampai);
      if (salah) return { ok: false, pesan: salah };
      var terbuka = ['Menunggu', 'Disetujui', 'Dikirim'];
      var semua = kumpulOrder_('0000-01-01', '9999-12-31').filter(function (o) {
        return (o.t >= dari && o.t <= sampai) || terbuka.indexOf(o.st) !== -1;
      });
      var BATAS = 300;
      return {
        ok: true, terpotong: semua.length > BATAS, status: STATUS_ORDER_,
        diperbarui: fmt(new Date(), 'dd/MM/yyyy HH:mm'),
        orders: semua.slice(0, BATAS).map(function (o) {
          return { no: o.no, t: o.t, pl: o.pl, tp: o.tp, st: o.st, c: o.c, p: o.p, luar: !(o.t >= dari && o.t <= sampai),
            items: o.items.map(function (it) { return { k: it.k, n: it.n, q: it.q }; }) };
        })
      };
    }
    // ---- prodSesuaiDaftar (file 7; link produksi tidak melihat ajuan Gudang & Kantor Packing: file 13, 15) ----
    function prodSesuaiDaftar() {
      var a = PSS_baca_();
      var jam = function (d) { return d ? fmt(d, 'dd/MM/yyyy HH:mm') : ''; };
      a.sort(function (x, y) { return y.baris - x.baris; });
      var tunggu = a.filter(function (x) { return x.st === 'Menunggu'; });
      var lain = a.filter(function (x) { return x.st !== 'Menunggu'; }).slice(0, 60);
      var r = {
        ok: true, menunggu: tunggu.length,
        list: tunggu.concat(lain).map(function (x) {
          return { no: x.no, t: jam(x.wa), bg: x.bg, k: x.k, n: x.n, w: x.w, sis: x.sis, hit: x.hit, sel: x.sel, al: x.al.slice(0, 200), pg: x.pg.slice(0, 40), st: x.st, tk: jam(x.wk), cat: x.cat.slice(0, 200) };
        }),
        diperbarui: jam(new Date())
      };
      r.list = r.list.filter(function (x) { return x.bg !== 'Gudang'; });
      r.menunggu = r.list.filter(function (x) { return x.st === 'Menunggu'; }).length;
      r.list = r.list.filter(function (x) { return x.bg !== 'Kantor Packing'; });
      r.menunggu = r.list.filter(function (x) { return x.st === 'Menunggu'; }).length;
      return r;
    }

    // ---- ambilRiwayatProduksi (file 1 dataProduksi_ + file 5 urutan katalog + file 7 penyesuaian) ----
    // awal = stok awal gudang produksi (sheet REPORT_STOK, dibaca Apps Script ke Supabase).
    function bacaKatalog_() {
      var k = {};
      baca('katalog', 2).forEach(function (r) { var kode = String(r[0]).trim().toUpperCase(); if (kode) k[kode] = String(r[1]).trim(); });
      var out = {};
      Object.keys(k).sort(function (a, b) {
        var ra = a.charAt(0) === 'M' ? 0 : 1, rb = b.charAt(0) === 'M' ? 0 : 1;
        if (ra !== rb) return ra - rb;
        return a < b ? -1 : a > b ? 1 : 0;
      }).forEach(function (x) { out[x] = k[x]; });
      return out;
    }
    function bacaKategori_() {
      var hasil = {};
      baca('katalog', 4).forEach(function (r) { var kode = String(r[0]).trim().toUpperCase(); if (kode) hasil[kode] = String(r[3]).trim() || 'Lainnya'; });
      return hasil;
    }
    function warnaBarang_() {
      var out = {}, dilihat = {};
      var sumber = L.barang_order && L.barang_order.baris.length ? 'barang_order' : 'katalog';
      baca(sumber, 5).forEach(function (r) {
        var kode = String(r[0]).trim().toUpperCase();
        if (!kode || kode.indexOf('-') !== -1 || dilihat[kode]) return;
        dilihat[kode] = true;
        var warna = [], ada = {};
        String(r[4] || '').split(',').forEach(function (w) {
          w = w.replace(/-/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
          if (w && w !== 'LAINNYA' && !ada[w]) { ada[w] = true; warna.push(w); }
        });
        if (warna.length) out[kode] = warna;
      });
      return out;
    }
    function rapiWarna_(v) { return String(v === null || v === undefined ? '' : v).replace(/\s+/g, ' ').trim().toUpperCase(); }
    function PSS_adjProduksi_() {
      var a = {};
      PSS_baca_().forEach(function (x) {
        if (x.bg !== 'Produksi' || x.st !== 'Disetujui' || !x.wk || !x.sel || !x.k) return;
        if (!a[x.k]) a[x.k] = { tot: 0, w: {} };
        a[x.k].tot += x.sel;
        a[x.k].w[x.w] = (a[x.k].w[x.w] || 0) + x.sel;
      });
      return a;
    }
    function dataProduksi_(dari, sampai, awal) {
      var katalog = bacaKatalog_(), kategori = bacaKategori_(), warnaAda = warnaBarang_();
      var baru = function () { return { pr: 0, sa: 0, kj: {}, semuaPr: 0, semuaSa: 0, w: {} }; };
      var baruW = function () { return { pr: 0, sa: 0, sisa: 0 }; };
      var agg = {};
      Object.keys(katalog).forEach(function (k) { agg[k] = baru(); });
      var log = [];
      [['PRODUKSI', 'produksi_log'], ['SALUR', 'salur_log']].forEach(function (x) {
        var jenis = x[0], iw = jenis === 'PRODUKSI' ? 6 : 7;
        var vals = baca(x[1], Math.min(8, L[x[1]] ? L[x[1]].lebar : 8));
        for (var i = 0; i < vals.length; i++) {
          var r = vals[i];
          if (!(r[0] instanceof Date)) continue;
          var kode = String(r[1]).trim().toUpperCase(), qty = Number(r[3]);
          if (!isFinite(qty)) continue;
          if (!agg[kode]) agg[kode] = baru();
          var a = agg[kode];
          var wr = warnaAda[kode] ? rapiWarna_(r[iw]) : '';
          var aw = null;
          if (warnaAda[kode]) { if (!a.w[wr]) a.w[wr] = baruW(); aw = a.w[wr]; }
          if (jenis === 'PRODUKSI') { a.semuaPr += qty; if (aw) aw.sisa += qty; }
          else { a.semuaSa += qty; if (aw) aw.sisa -= qty; }
          var tgl = fmt(r[0], 'yyyy-MM-dd');
          if (tgl < dari || tgl > sampai) continue;
          var tj = jenis === 'SALUR' ? String(r[6] || '') : '';
          if (jenis === 'PRODUKSI') { a.pr += qty; if (aw) aw.pr += qty; }
          else { a.sa += qty; if (aw) aw.sa += qty; if (tj) a.kj[tj] = (a.kj[tj] || 0) + qty; }
          var adaWaktu = r[4] instanceof Date;
          log.push({ t: tgl, w: adaWaktu ? fmt(r[4], 'HH:mm') : '', ms: adaWaktu ? r[4].getTime() : 0,
            j: jenis, k: kode, n: String(r[2]), q: qty, tj: tj, wr: wr, p: String(r[5]).slice(0, 40) });
        }
      });
      log.sort(function (a, b) { return a.t < b.t ? 1 : a.t > b.t ? -1 : b.ms - a.ms; });
      var BATAS = 600;
      var produk = Object.keys(agg).map(function (k) {
        var a = agg[k], w = [];
        if (warnaAda[k]) {
          if (awal[k]) { if (!a.w['']) a.w[''] = baruW(); a.w[''].sisa += awal[k]; }
          var lain = Object.keys(a.w).filter(function (x) { return warnaAda[k].indexOf(x) === -1; })
            .sort(function (x, y) { return x === '' ? 1 : y === '' ? -1 : x < y ? -1 : 1; });
          warnaAda[k].concat(lain).forEach(function (x) {
            var o = a.w[x];
            if (o && (o.pr || o.sa || o.sisa)) w.push({ w: x, pr: o.pr, sa: o.sa, sisa: o.sisa });
          });
        }
        return { k: k, n: katalog[k] || k, kat: kategori[k] || 'Lainnya', pr: a.pr, sa: a.sa,
          sisa: (awal[k] || 0) + a.semuaPr - a.semuaSa, bw: !!warnaAda[k], w: w };
      });
      var adj = PSS_adjProduksi_();
      produk.forEach(function (p) {
        var x = adj[p.k];
        if (!x) return;
        p.sisa += x.tot;
        if (!p.bw) return;
        Object.keys(x.w).forEach(function (w) {
          var e = p.w.filter(function (o) { return o.w === w; })[0];
          if (e) e.sisa += x.w[w];
          else if (x.w[w]) p.w.push({ w: w, pr: 0, sa: 0, sisa: x.w[w] });
        });
      });
      return { produk: produk, terpotong: log.length > BATAS, diperbarui: fmt(new Date(), 'dd/MM/yyyy HH:mm'),
        log: log.slice(0, BATAS).map(function (x) { return { t: x.t, w: x.w, j: x.j, k: x.k, n: x.n, q: x.q, p: x.p, tj: x.tj, wr: x.wr }; }) };
    }
    function ambilRiwayatProduksi(p, awal) {
      var dari = String((p && p.dari) || ''), sampai = String((p && p.sampai) || '');
      var salah = salahPeriode_(dari, sampai);
      if (salah) return { ok: false, pesan: salah };
      var d = dataProduksi_(dari, sampai, awal || {});
      return {
        ok: true, dari: dari, sampai: sampai, log: d.log, terpotong: d.terpotong, diperbarui: d.diperbarui,
        produk: d.produk.map(function (x) { return { k: x.k, n: x.n, kat: x.kat, pr: x.pr, sa: x.sa, sisa: x.sisa, bw: x.bw, w: x.w }; })
      };
    }

    // ---- ambilStok (file 1 hitungStokRinci_ + file 7 penyesuaian) ----
    function ambilStok(awal) {
      var tot = {}, w = {};
      Object.keys(awal).forEach(function (k) { tot[k] = awal[k]; });
      var warna = warnaBarang_();
      Object.keys(bacaKatalog_()).forEach(function (k) { if (!(k in tot)) tot[k] = 0; });
      Object.keys(tot).forEach(function (k) { if (warna[k]) { w[k] = {}; if (tot[k]) w[k][''] = tot[k]; } });
      [['produksi_log', 1, 7], ['salur_log', -1, 8]].forEach(function (x) {
        var t = L[x[0]];
        if (!t) return;
        baca(x[0], Math.min(x[2], t.lebar)).forEach(function (r) {
          if (!(r[0] instanceof Date)) return;
          var kode = String(r[1]).trim().toUpperCase(), qty = Number(r[3]);
          if (!kode || !isFinite(qty)) return;
          tot[kode] = (tot[kode] || 0) + x[1] * qty;
          if (warna[kode]) {
            var wr = rapiWarna_(r[x[2] - 1]);
            if (!w[kode]) w[kode] = {};
            w[kode][wr] = (w[kode][wr] || 0) + x[1] * qty;
          }
        });
      });
      var a = PSS_adjProduksi_();
      Object.keys(a).forEach(function (k) {
        tot[k] = (tot[k] || 0) + a[k].tot;
        if (w[k]) Object.keys(a[k].w).forEach(function (ww) { w[k][ww] = (w[k][ww] || 0) + a[k].w[ww]; });
      });
      return { ok: true, stok: tot, stokW: w };
    }
    return { kemasanHargaData: kemasanHargaData, stokBahan: stokBahan, ambilBahan: ambilBahan, ambilOrderProduksi: ambilOrderProduksi, prodSesuaiDaftar: prodSesuaiDaftar, ambilRiwayatProduksi: ambilRiwayatProduksi, ambilStok: ambilStok };
  }

  // Stok awal gudang produksi dari Supabase: { urut: [[kode, qty], ...] } (urutan baris REPORT_STOK).
  function petaAwal(r) {
    if (!r || r.error || !r.data) return null;
    var d = r.data, out = {};
    if (Array.isArray(d.urut)) { d.urut.forEach(function (x) { out[x[0]] = x[1]; }); return out; }
    return d.urut === undefined ? d : null;
  }
  window.Produksi = {
    kemasanHargaData: async function (sb) { return buat(await window.Lembar.muat(sb, TABEL)).kemasanHargaData(); },
    stokBahan: async function (sb) { return buat(await window.Lembar.muat(sb, TABEL_STOK)).stokBahan(); },
    ambilBahan: async function (sb) { return buat(await window.Lembar.muat(sb, ['bahan', 'bahan_log'])).ambilBahan(); },
    ambilOrderProduksi: async function (sb, p) { return buat(await window.Lembar.muat(sb, ['order_log'])).ambilOrderProduksi(p); },
    ambilRiwayatProduksi: async function (sb, p) {
      var h = await Promise.all([window.Lembar.muat(sb, ['katalog', 'barang_order', 'produksi_log', 'salur_log', 'produksi_sesuai_log']), sb.rpc('produksi_awal')]);
      var awal = petaAwal(h[1]);
      return awal ? buat(h[0]).ambilRiwayatProduksi(p, awal) : null;
    },
    ambilStok: async function (sb) {
      var h = await Promise.all([window.Lembar.muat(sb, ['katalog', 'barang_order', 'produksi_log', 'salur_log', 'produksi_sesuai_log']), sb.rpc('produksi_awal')]);
      var awal = petaAwal(h[1]);
      return awal ? buat(h[0]).ambilStok(awal) : null;
    },
    prodSesuaiDaftar: async function (sb) { return buat(await window.Lembar.muat(sb, ['produksi_sesuai_log'])).prodSesuaiDaftar(); },
    buat: buat, TABEL: TABEL
  };
})();
