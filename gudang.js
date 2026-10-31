/*
 * Moscow Supplies - data halaman Gudang Utama & Purchasing (gdData) dihitung di halaman dari data Supabase.
 * Salinan rumus Apps Script yang sama (file 13 gudang, file 7 penyesuaian, file 14 harga dasar, file 24 harga),
 * memakai lembar.js sebagai pengganti sheet. Peran halaman = 'staf' (sama dengan link gudang lama).
 */
(function () {
  'use strict';
  var GD_ST_ = { TUNGGU: 'Menunggu persetujuan', SETUJU: 'Disetujui', BAYAR: 'Dibayar', KIRIM: 'Dikirim supplier',
    SEBAGIAN: 'Diterima sebagian', SELESAI: 'Selesai', TOLAK: 'Ditolak', BATAL: 'Batal' };
  var GD_BAYAR_ = ['Rekening Belanja', 'ShopeePay', 'Kas Tunai'];
  var GD_BAYAR_STAF_ = { 'ShopeePay': true, 'Kas Tunai': true };
  var GD_BIAYA_JENIS_ = ['Ongkir cargo', 'Bill kedua / IMP', 'Pajak & bea masuk', 'Ongkir lokal', 'Lainnya'];
  var GD_TUJUAN_PRODUKSI_ = 'Gudang Utama';
  var HRG_KEL_BRG_ = 'Barang jualan';
  var STATUS_ORDER_ = ['Menunggu', 'Disetujui', 'Dikirim', 'Selesai', 'Batal'];
  var TABEL = ['barang_order', 'gudang_stok_awal', 'online_stok_awal', 'gudang_log', 'po_log', 'po_item', 'po_biaya',
    'salur_log', 'produksi_sesuai_log', 'order_log', 'order_proses', 'pelanggan'];

  function buat(L) {
    var fmt = window.Lembar.format;
    function baca(t, w) { return window.Lembar.baca(L, t, w); }
    function GD_rapi_(v, n) { return String(v === null || v === undefined ? '' : v).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n || 200); }
    function rapiWarna_(v) { return String(v === null || v === undefined ? '' : v).replace(/\s+/g, ' ').trim().toUpperCase(); }
    function GD_tglTeks_(v) { if (v instanceof Date) return fmt(v, 'yyyy-MM-dd'); var s = GD_rapi_(v, 10); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''; }
    function GD_jam_(v) { return v instanceof Date ? fmt(v, 'dd/MM/yyyy HH:mm') : ''; }
    function GD_geser_(tgl, hari) { var p = String(tgl).split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + hari)).toISOString().slice(0, 10); }
    function GD_masuk_(x) { return /^masuk/i.test(x.j); }
    function GD_keluar_(x) { return /^keluar/i.test(x.j); }
    function GD_refBagi_(ref) { var i = String(ref).indexOf('|'); return i === -1 ? [String(ref), ''] : [ref.slice(0, i), ref.slice(i + 1)]; }
    function GD_final_(st) { return st === GD_ST_.SELESAI || st === GD_ST_.TOLAK || st === GD_ST_.BATAL; }

    function bacaBarangOrder_() {
      var out = [], dilihat = {};
      baca('barang_order', 5).forEach(function (r) {
        var kode = String(r[0]).trim().toUpperCase();
        if (!kode || kode.indexOf('-') !== -1 || dilihat[kode]) return;
        dilihat[kode] = true;
        var h = Number(r[2]), harga = (r[2] === '' || !isFinite(h) || h < 0) ? 0 : h;
        var nama = String(r[1]).trim(), kat = String(r[3]).trim() || 'Lainnya', warna = [], ada = {};
        String(r[4] || '').split(',').forEach(function (w) {
          w = w.replace(/-/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
          if (w && w !== 'LAINNYA' && !ada[w]) { ada[w] = true; warna.push(w); }
        });
        out.push({ kode: kode, nama: nama, harga: harga, kat: kat, warna: warna });
      });
      return out;
    }
    function GD_barang_() {
      var list = [], idx = {};
      bacaBarangOrder_().forEach(function (b) {
        if (idx[b.kode] !== undefined) return;
        idx[b.kode] = list.length;
        list.push({ k: b.kode, n: b.nama, kat: b.kat || 'Lainnya', w: b.warna || [], h: Number(b.harga) || 0 });
      });
      return { list: list, idx: idx };
    }
    function GD_log_() {
      var out = [];
      baca('gudang_log', 12).forEach(function (r, i) {
        if (!(r[0] instanceof Date)) return;
        var q = Number(r[5]), rs = Number(r[11]);
        out.push({
          baris: i + 2, t: fmt(r[0], 'yyyy-MM-dd'), j: GD_rapi_(r[1], 30),
          k: GD_rapi_(r[2], 30).toUpperCase(), n: GD_rapi_(r[3], 120), w: rapiWarna_(r[4]),
          q: isFinite(q) ? q : 0, st: GD_rapi_(r[6], 100), ms: r[7] instanceof Date ? r[7].getTime() : 0,
          p: GD_rapi_(r[8], 60), c: GD_rapi_(r[9], 300), ref: GD_rapi_(r[10], 160), rs: isFinite(rs) ? rs : 0
        });
      });
      return out;
    }
    function GD_po_() {
      var list = [], idx = {};
      baca('po_log', 15).forEach(function (r, i) {
        var no = GD_rapi_(r[0], 30);
        if (!no || idx[no] !== undefined) return;
        idx[no] = list.length;
        list.push({
          baris: i + 2, no: no, t: GD_tglTeks_(r[1]), asal: GD_rapi_(r[2], 20), sup: GD_rapi_(r[3], 80),
          bayar: GD_rapi_(r[4], 30), tot: Number(r[5]) || 0, st: GD_rapi_(r[6], 40), p: GD_rapi_(r[7], 60),
          wa: GD_jam_(r[8]), ws: GD_jam_(r[9]), wb: GD_jam_(r[10]), tr: GD_rapi_(r[11], 60),
          resi: GD_rapi_(r[12], 80), c: GD_rapi_(r[13], 400), cp: GD_rapi_(r[14], 300),
          ms: r[8] instanceof Date ? r[8].getTime() : 0, items: [], biaya: [], terima: {}, sisa: 0, rusak: 0
        });
      });
      baca('po_item', 7).forEach(function (r) {
        var i = idx[GD_rapi_(r[0], 30)];
        if (i === undefined) return;
        list[i].items.push({ k: GD_rapi_(r[1], 30).toUpperCase(), n: GD_rapi_(r[2], 120), w: rapiWarna_(r[3]),
          q: Number(r[4]) || 0, h: Number(r[5]) || 0, s: Number(r[6]) || 0, d: 0, rs: 0 });
      });
      baca('po_biaya', 10).forEach(function (r, j) {
        var i = idx[GD_rapi_(r[0], 30)];
        if (i === undefined) return;
        list[i].biaya.push({ id: j + 2, t: GD_tglTeks_(r[1]), j: GD_rapi_(r[2], 40), v: Number(r[3]) || 0, bayar: GD_rapi_(r[4], 30),
          sb: GD_rapi_(r[5], 20), tr: GD_rapi_(r[6], 60), p: GD_rapi_(r[8], 60), c: GD_rapi_(r[9], 200) });
      });
      return { list: list, idx: idx };
    }
    function GD_isiTerima_(po, log) {
      log.forEach(function (x) {
        if (!GD_masuk_(x)) return;
        var r = GD_refBagi_(x.ref);
        if (r[0].indexOf('TB-') !== 0) return;
        var i = po.idx[r[1]];
        if (i === undefined) return;
        var key = x.k + '|' + x.w, t = po.list[i].terima;
        if (!t[key]) t[key] = { d: 0, rs: 0 };
        t[key].d += x.q + x.rs; t[key].rs += x.rs;
      });
      po.list.forEach(function (o) {
        var sisa = 0, rusak = 0;
        o.items.forEach(function (it) {
          var t = o.terima[it.k + '|' + it.w] || { d: 0, rs: 0 };
          it.d = t.d; it.rs = t.rs;
          sisa += Math.max(0, it.q - t.d); rusak += t.rs;
        });
        o.sisa = sisa; o.rusak = rusak;
      });
    }
    function PSS_baca_() {
      var out = [];
      baca('produksi_sesuai_log', 14).forEach(function (r, i) {
        var no = String(r[0] || '').trim();
        if (!no) return;
        var sel = Number(r[8]);
        out.push({ baris: i + 2, no: no, wa: r[1] instanceof Date ? r[1] : null,
          bg: String(r[2] || '').trim(), k: String(r[3] || '').trim().toUpperCase(), n: String(r[4] || '').replace(/\s+/g, ' ').trim(),
          w: rapiWarna_(r[5]), sis: Number(r[6]) || 0, hit: Number(r[7]) || 0, sel: isFinite(sel) ? sel : 0,
          al: String(r[9] || ''), pg: String(r[10] || ''), st: String(r[11] || '').trim(),
          wk: r[12] instanceof Date ? r[12] : null, cat: String(r[13] || '') });
      });
      return out;
    }
    function GD_sesuai_() { return PSS_baca_().filter(function (x) { return x.bg === 'Gudang'; }); }
    function GD_poKeluar_(o) {
      return {
        no: o.no, t: o.t, asal: o.asal, sup: o.sup, bayar: o.bayar, tot: o.tot, st: o.st, p: o.p,
        wa: o.wa, ws: o.ws, wb: o.wb, tr: o.tr, resi: o.resi, c: o.c, cp: o.cp, sisa: o.sisa, rusak: o.rusak,
        items: o.items.map(function (it) { return { k: it.k, n: it.n, w: it.w, q: it.q, h: it.h, s: it.s, d: it.d, rs: it.rs }; }),
        biaya: o.biaya.map(function (b) { return { id: b.id, t: b.t, j: b.j, v: b.v, bayar: b.bayar, sb: b.sb, tr: b.tr, p: b.p, c: b.c }; })
      };
    }
    function GD_stok_(log) {
      var s = {};
      var tambah = function (k, w, q) {
        if (!k || !q || !isFinite(q)) return;
        var key = k + '|' + (w || '');
        s[key] = (s[key] || 0) + q;
      };
      baca('gudang_stok_awal', 4).forEach(function (r) { tambah(GD_rapi_(r[0], 30).toUpperCase(), rapiWarna_(r[2]), Number(r[3])); });
      log.forEach(function (x) { if (GD_masuk_(x)) tambah(x.k, x.w, x.q); else if (GD_keluar_(x)) tambah(x.k, x.w, -x.q); });
      GD_sesuai_().forEach(function (x) { if (x.st === 'Disetujui' && x.wk && x.sel) tambah(x.k, x.w, x.sel); });
      Object.keys(s).forEach(function (k) { if (!s[k]) delete s[k]; });
      return s;
    }
    function GD_salurTunggu_(log) {
      var sudah = {}, out = [];
      log.forEach(function (x) { var r = GD_refBagi_(x.ref); if (r[0].indexOf('TP-') === 0 && r[1]) sudah[r[1]] = true; });
      baca('salur_log', 8).forEach(function (r) {
        if (!(r[0] instanceof Date) || !(r[4] instanceof Date)) return;
        if (GD_rapi_(r[6], 60) !== GD_TUJUAN_PRODUKSI_) return;
        var k = GD_rapi_(r[1], 30).toUpperCase(), w = rapiWarna_(r[7]), q = Number(r[3]);
        if (!k || !isFinite(q) || q <= 0) return;
        var id = 'SL' + r[4].getTime() + ':' + k + ':' + w;
        if (sudah[id]) return;
        out.push({ id: id, t: fmt(r[0], 'yyyy-MM-dd'), j: fmt(r[4], 'dd/MM HH:mm'), k: k, n: GD_rapi_(r[2], 120), w: w, q: q,
          p: GD_rapi_(r[5], 60).replace(/^form:?\s*/i, '') });
      });
      return out;
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
        o.sub += Number(r[9]) || 0; o.disk += Number(r[10]) || 0; o.tot += Number(r[11]) || 0;
        o.items.push({ k: String(r[4]), n: String(r[5]), q: Number(r[6]) || 0, h: Number(r[7]) || 0, s: Number(r[9]) || 0 });
      });
      urut.sort(function (a, b) { return a.t < b.t ? 1 : a.t > b.t ? -1 : b.ms - a.ms; });
      return urut;
    }
    function GD_orderTunggu_(log, hariIni) {
      var kirim = {};
      log.forEach(function (x) {
        if (!GD_keluar_(x)) return;
        var r = GD_refBagi_(x.ref);
        if (!r[1]) return;
        var m = kirim[r[1]] || (kirim[r[1]] = {});
        m[x.k + '|' + x.w] = (m[x.k + '|' + x.w] || 0) + x.q;
      });
      var out = [];
      kumpulOrder_(GD_geser_(hariIni, -150), '9999-12-31').forEach(function (o) {
        if (o.st !== 'Disetujui' && o.st !== 'Dikirim') return;
        var sudah = kirim[o.no] || {}, gab = {}, urut = [];
        o.items.forEach(function (it) {
          var kk = String(it.k).trim().toUpperCase(), i = kk.indexOf('-');
          var k = i === -1 ? kk : kk.slice(0, i), w = i === -1 ? '' : rapiWarna_(kk.slice(i + 1)), key = k + '|' + w;
          if (!gab[key]) { gab[key] = { k: k, w: w, q: 0 }; urut.push(key); }
          gab[key].q += Number(it.q) || 0;
        });
        var items = [];
        urut.forEach(function (key) { var g = gab[key], sisa = g.q - (sudah[key] || 0); if (sisa > 0) items.push({ k: g.k, w: g.w, q: g.q, sisa: sisa }); });
        if (items.length) out.push({ no: o.no, t: o.t, pl: o.pl, st: o.st, items: items });
      });
      return out;
    }
    function GD_tujuanList_() {
      var out = ['Kantor Packing'], ada = { 'kantor packing': true };
      baca('pelanggan', 3).forEach(function (r) {
        var nama = String(r[0]).trim();
        if (!nama) return;
        var k = nama.toLowerCase();
        if (!ada[k]) { ada[k] = true; out.push(nama); }
      });
      out.push('Lainnya');
      return out;
    }
    function GD_riwayat_(log, maks) {
      var grup = [], idx = {};
      log.forEach(function (x) {
        var r = GD_refBagi_(x.ref);
        var kunci = /^(TB|TP|SJ)-/.test(r[0]) ? r[0] : 'L' + x.baris;
        if (idx[kunci] === undefined) {
          idx[kunci] = grup.length;
          grup.push({ no: /^L\d/.test(kunci) ? '' : kunci, ke: r[1], t: x.t, j: x.j, st: x.st, p: x.p.replace(/^form:?\s*/i, ''), c: x.c, ms: x.ms, items: [] });
        }
        grup[idx[kunci]].items.push({ k: x.k, n: x.n, w: x.w, q: x.q, rs: x.rs });
      });
      grup.sort(function (a, b) { return a.t < b.t ? 1 : a.t > b.t ? -1 : b.ms - a.ms; });
      return grup.slice(0, maks);
    }
    function GD_hpp_(po) {
      var akhir = {};
      po.list.slice().sort(function (a, b) { return a.t < b.t ? -1 : a.t > b.t ? 1 : a.ms - b.ms; }).forEach(function (o) {
        if (o.st === GD_ST_.TOLAK || o.st === GD_ST_.BATAL || !o.items.length) return;
        var barang = 0, biaya = 0;
        o.items.forEach(function (it) { barang += it.s; });
        o.biaya.forEach(function (b) { biaya += b.v; });
        o.items.forEach(function (it) {
          var bagian = barang > 0 ? biaya * it.s / barang : 0;
          var unit = it.q > 0 ? Math.round(it.h + bagian / it.q) : it.h;
          akhir[it.k] = { n: it.n, hpp: unit, h: it.h, t: o.t, no: o.no, sup: o.sup };
        });
      });
      return { akhir: akhir };
    }
    function DS_hpp_(gdLog) {
      var hpp = {}, po = null, akhir = {};
      try { po = GD_po_(); GD_isiTerima_(po, gdLog); } catch (e) { po = null; }
      try { if (po) akhir = GD_hpp_(po).akhir; } catch (e) { akhir = {}; }
      Object.keys(akhir).forEach(function (k) { if (akhir[k].hpp) hpp[k] = akhir[k].hpp; });
      try {
        baca('online_stok_awal', 6).forEach(function (r) {
          var k = GD_rapi_(r[0], 30).toUpperCase(), h = Number(r[5]);
          if (k && isFinite(h) && h > 0) hpp[k] = h;
        });
      } catch (e) { }
      return { hpp: hpp };
    }
    // HRG_peta_ bagian A (barang jualan) saja: yang dipakai halaman gudang.
    function hargaBarang() {
      var peta = {};
      var taruh = function (kunci, rw, ekstra) {
        var a = rw.length ? rw[rw.length - 1] : null, l = rw.length > 1 ? rw[rw.length - 2] : null;
        var x = { hb: a ? a.h : 0, hbL: l ? l.h : 0, tg: a ? a.t : '', sup: a ? (a.sup || '') : '', hpp: 0, hj: 0 };
        if (ekstra) Object.keys(ekstra).forEach(function (k) { x[k] = ekstra[k]; });
        if (x.hb || x.hpp || x.hj) peta[kunci] = x;
      };
      try {
        var brg = GD_barang_(), po = null, rw = {};
        try { po = GD_po_(); } catch (e) { po = null; }
        if (po) {
          po.list.slice().sort(function (a, b) { return a.t < b.t ? -1 : a.t > b.t ? 1 : a.ms - b.ms; }).forEach(function (o) {
            if (o.st === GD_ST_.TOLAK || o.st === GD_ST_.BATAL) return;
            o.items.forEach(function (it) { if (!it.h) return; (rw[it.k] = rw[it.k] || []).push({ h: it.h, t: o.t, sup: o.sup }); });
          });
        }
        var hpp = {}, hppDs = {};
        try { if (po) { var a = GD_hpp_(po).akhir; Object.keys(a).forEach(function (k) { hpp[k] = a[k].hpp; }); } } catch (e) { hpp = {}; }
        try { hppDs = DS_hpp_(GD_log_()).hpp || {}; } catch (e) { hppDs = {}; }
        brg.list.forEach(function (b) {
          taruh(HRG_KEL_BRG_ + '|' + b.k, rw[b.k] || [], { hpp: Math.round(hpp[b.k] || hppDs[b.k] || 0), hj: b.h || 0 });
        });
      } catch (e) { }
      var hrg = {};
      Object.keys(peta).forEach(function (k) { if (k.indexOf(HRG_KEL_BRG_ + '|') === 0) hrg[k.slice(HRG_KEL_BRG_.length + 1)] = peta[k]; });
      return hrg;
    }

    function gdData() {
      var hariIni = fmt(new Date(), 'yyyy-MM-dd');
      var brg = GD_barang_(), log = GD_log_(), po = GD_po_();
      GD_isiTerima_(po, log);
      var batas = GD_geser_(hariIni, -60);
      var poOut = po.list.filter(function (o) { return !GD_final_(o.st) || o.t >= batas; })
        .sort(function (a, b) { return a.t < b.t ? 1 : a.t > b.t ? -1 : b.ms - a.ms; }).slice(0, 150).map(GD_poKeluar_);
      var sup = [], adaSup = {};
      po.list.slice().reverse().forEach(function (o) {
        var k = o.sup.toLowerCase();
        if (o.sup && !adaSup[k] && sup.length < 80) { adaSup[k] = true; sup.push(o.sup); }
      });
      var ajuan = GD_sesuai_().filter(function (x) { return x.st === 'Menunggu'; })
        .map(function (x) { return { no: x.no, k: x.k, n: x.n, w: x.w, sis: x.sis, hit: x.hit, sel: x.sel, pg: x.pg }; });
      var r = {
        ok: true, peran: 'staf', hariIni: hariIni,
        barang: brg.list.map(function (b) { return { k: b.k, n: b.n, kat: b.kat, w: b.w }; }),
        stok: GD_stok_(log), po: poOut, masukProd: GD_salurTunggu_(log),
        order: GD_orderTunggu_(log, hariIni), tujuan: GD_tujuanList_(), sup: sup,
        riwayat: GD_riwayat_(log, 80), ajuan: ajuan,
        bayar: GD_BAYAR_.slice(), bayarStaf: Object.keys(GD_BAYAR_STAF_), biayaJenis: GD_BIAYA_JENIS_.slice(), st: Object.assign({}, GD_ST_)
      };
      r.hrg = hargaBarang();
      return r;
    }
    // gdxOrderMasuk (file 52, versi file 53): order yang siap dikirim gudang dan order yang menunggu ACC.
    function OM_t_(v, n) { return String(v === null || v === undefined ? '' : v).replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n || 200); }
    function OM_jenis_(o) { return o.tp === 'Reseller' ? 'Reseller' : (/offline/i.test(String(o.pl)) ? 'Toko' : 'Consignment'); }
    function OM_kw_(kode) { var kk = String(kode || '').trim().toUpperCase(), i = kk.indexOf('-'); return i === -1 ? [kk, ''] : [kk.slice(0, i), rapiWarna_(kk.slice(i + 1))]; }
    function OM_kirimMap_(log) {
      var m = {};
      log.forEach(function (x) {
        if (!GD_keluar_(x)) return;
        var r = GD_refBagi_(x.ref);
        if (!r[1]) return;
        var o = m[r[1]] || (m[r[1]] = { _sj: [] }), key = x.k + '|' + x.w;
        o[key] = (o[key] || 0) + x.q;
        if (r[0] && o._sj.indexOf(r[0]) === -1) o._sj.push(r[0]);
      });
      return m;
    }
    function OM_rinci_(o, sudah, stok) {
      var gab = {}, urut = [], q = 0, kirim = 0, sisa = 0;
      o.items.forEach(function (it) {
        var kw = OM_kw_(it.k), key = kw[0] + '|' + kw[1];
        if (!gab[key]) { gab[key] = { k: kw[0], w: kw[1], n: String(it.n || kw[0]), q: 0 }; urut.push(key); }
        gab[key].q += Number(it.q) || 0;
      });
      var items = urut.map(function (key) {
        var g = gab[key], s = Math.min(g.q, Math.max(0, (sudah && sudah[key]) || 0)), sis = g.q - s;
        q += g.q; kirim += s; sisa += sis;
        return { k: g.k, w: g.w, n: g.n, q: g.q, kirim: s, sisa: sis, stok: stok ? (stok[key] || 0) : 0 };
      });
      return { items: items, q: q, kirim: kirim, sisa: sisa };
    }
    function OP_proses_() {
      var m = {};
      baca('order_proses', 10).forEach(function (r) {
        var no = String(r[1]).trim(), aksi = String(r[2]).trim();
        if (!no || !(r[0] instanceof Date)) return;
        var x = m[no] || (m[no] = {});
        if (aksi === 'Diproses' && !x.dp) x.dp = { oleh: String(r[3]), t: fmt(r[0], 'dd/MM HH:mm') };
      });
      return m;
    }
    function gdxOrderMasuk() {
      var hariIni = fmt(new Date(), 'yyyy-MM-dd');
      var log = GD_log_(), stok = GD_stok_(log), kirim = OM_kirimMap_(log), peta = OP_proses_();
      var siap = [], tunggu = [];
      kumpulOrder_(GD_geser_(hariIni, -150), '9999-12-31').forEach(function (o) {
        if (o.st === 'Menunggu') {
          var q = 0; o.items.forEach(function (it) { q += Number(it.q) || 0; });
          tunggu.push({ no: o.no, t: o.t, pl: o.pl, jenis: OM_jenis_(o), q: q });
          return;
        }
        if (o.st !== 'Disetujui') return;
        var sd = kirim[o.no] || { _sj: [] }, r = OM_rinci_(o, sd, stok);
        if (r.sisa <= 0) return;
        var x = peta[o.no];
        siap.push({ no: o.no, t: o.t, pl: o.pl, jenis: OM_jenis_(o), st: o.st, c: OM_t_(o.c, 200), p: OM_t_(o.p, 60), q: r.q, kirim: r.kirim,
          sisa: r.sisa, sj: sd._sj, items: r.items, dp: x && x.dp ? { oleh: x.dp.oleh, t: x.dp.t } : null });
      });
      siap.sort(function (a, b) { return a.t < b.t ? -1 : (a.t > b.t ? 1 : 0); });
      return { ok: true, hariIni: hariIni, siap: siap, tunggu: tunggu, diperbarui: fmt(new Date(), 'dd/MM/yyyy HH:mm') };
    }
    // prodKebutuhan (file 52): barang yang kurang di gudang untuk order yang menunggu / sudah ACC (halaman produksi).
    function prodKebutuhan() {
      var hariIni = fmt(new Date(), 'yyyy-MM-dd');
      var log = GD_log_(), stok = GD_stok_(log), kirim = OM_kirimMap_(log), jalan = {};
      try { GD_salurTunggu_(log).forEach(function (x) { var key = x.k + '|' + (x.w || ''); jalan[key] = (jalan[key] || 0) + (Number(x.q) || 0); }); } catch (e) { }
      var per = {}, urut = [], nOrder = 0;
      kumpulOrder_(GD_geser_(hariIni, -150), '9999-12-31').forEach(function (o) {
        var tg = o.st === 'Menunggu', ac = o.st === 'Disetujui';
        if (!tg && !ac) return;
        var r = OM_rinci_(o, tg ? {} : (kirim[o.no] || {}), null);
        if (r.sisa <= 0) return;
        nOrder++;
        r.items.forEach(function (it) {
          if (it.sisa <= 0) return;
          var key = it.k + '|' + it.w;
          if (!per[key]) { per[key] = { k: it.k, w: it.w, n: it.n, acc: 0, tunggu: 0 }; urut.push(key); }
          if (tg) per[key].tunggu += it.sisa; else per[key].acc += it.sisa;
        });
      });
      var list = [];
      urut.forEach(function (key) {
        var x = per[key], s = Math.max(0, stok[key] || 0), j = jalan[key] || 0, ada = s + j, kurang = x.acc + x.tunggu - ada;
        if (kurang <= 0) return;
        list.push({ k: x.k, w: x.w, n: x.n, acc: x.acc, tunggu: x.tunggu, stok: s, jalan: j, kurang: kurang, kurangAcc: Math.max(0, x.acc - ada) });
      });
      list.sort(function (a, b) { return (b.kurangAcc - a.kurangAcc) || (b.kurang - a.kurang) || (a.n < b.n ? -1 : 1); });
      return { ok: true, list: list, nOrder: nOrder, diperbarui: fmt(new Date(), 'dd/MM/yyyy HH:mm') };
    }
    return { gdData: gdData, gdxOrderMasuk: gdxOrderMasuk, prodKebutuhan: prodKebutuhan, po: GD_po_, barang: GD_barang_, log: GD_log_, isiTerima: GD_isiTerima_, stok: GD_stok_, salurTunggu: GD_salurTunggu_, sesuai: GD_sesuai_, riwayat: GD_riwayat_, poKeluar: GD_poKeluar_, orderTunggu: GD_orderTunggu_,
      om: { kumpul: kumpulOrder_, kirimMap: OM_kirimMap_, rinci: OM_rinci_, jenis: OM_jenis_, t: OM_t_, geser: GD_geser_ } };
  }

  // Data lembar dipakai bersama beberapa panggilan yang datang hampir bersamaan (gdData + gdxOrderMasuk saat halaman dibuka).
  // Permintaan yang masih berjalan selalu dipakai bersama (dulu: lewat 3 detik dibuat permintaan baru walau yang lama belum selesai,
  // sehingga saat server lambat permintaan menumpuk). Hasil yang sudah selesai dipakai ulang 3 detik.
  var muatan = null, waktuMuat = 0, selesai = true;
  function lembar(sb) {
    if (!muatan || (selesai && Date.now() - waktuMuat > 3000)) {
      waktuMuat = Date.now(); selesai = false;
      var ini = muatan = window.Lembar.muat(sb, TABEL);
      ini.then(function () { if (muatan === ini) { selesai = true; waktuMuat = Date.now(); } }, function () { if (muatan === ini) { muatan = null; selesai = true; } });
    }
    return muatan;
  }
  async function gdData(sb) { return buat(await lembar(sb)).gdData(); }
  async function gdxOrderMasuk(sb) { return buat(await lembar(sb)).gdxOrderMasuk(); }
  async function prodKebutuhan(sb) { return buat(await lembar(sb)).prodKebutuhan(); }
  function lupakan() { muatan = null; selesai = true; }
  window.Gudang = { gdData: gdData, gdxOrderMasuk: gdxOrderMasuk, prodKebutuhan: prodKebutuhan, lupakan: lupakan, buat: buat, TABEL: TABEL };
})();
