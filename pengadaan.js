/*
 * Moscow Supplies - daftar pengadaan di form staf (ptrData: barang yang sudah dibayar Viory dan perlu dicatat terima;
 * pgsTerbuka: pengajuan yang sudah disetujui / dipesan; pgsData / gdxPengajuan: tab Pengajuan). Salinan rumus Apps Script
 * (file 18, 43, 48, 55, 72) dengan lembar.js. Daftar barang + saran robot purchasing (items) diambil dari potret robot
 * (fungsi Supabase pengadaan_robot); daftar pengajuan selalu dari data terbaru.
 */
(function () {
  'use strict';
  var PGD_ST_ = { TUNGGU: 'Menunggu', SETUJU: 'Disetujui', TOLAK: 'Ditolak', PESAN: 'Dipesan', TERIMA: 'Diterima', BATAL: 'Batal' };
  var PLX_REF_ = 'Dibayar Viory';
  var BAGIAN = { gudang: 'Gudang', produksi: 'Produksi', bahanbaku: 'Bahan Baku' };
  var GRUP = {
    produksi: { id: 'produksi', link: ['Botol & stiker', 'Packaging & lainnya'] },
    bahanbaku: { id: 'bahanbaku', link: ['Bahan baku'] }
  };
  var TABEL = ['pengadaan_ajuan', 'bahan'];
  var PGD_KEL_ = ['Barang jualan', 'Bahan baku', 'Botol & stiker', 'Packaging & lainnya'];
  var PGS_GRUP_ = { produksi: { bg: 'Produksi', kel: 'Botol & stiker' }, bahanbaku: { bg: 'Bahan Baku', kel: 'Bahan baku' } };

  function buat(L) {
    var fmt = window.Lembar.format;
    function baca(t, w) { return window.Lembar.baca(L, t, w); }
    function rapi(v, n) { return String(v === null || v === undefined ? '' : v).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n || 200); }
    function t2(v, n) { return String(v === null || v === undefined ? '' : v).replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n || 200); }
    function tgl(v) { if (v instanceof Date) return fmt(v, 'yyyy-MM-dd'); var s = rapi(v, 10); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''; }
    function jam(v) { return v instanceof Date ? fmt(v, 'dd/MM/yyyy HH:mm') : rapi(v, 20); }
    function ajuan() {
      var out = [];
      baca('pengadaan_ajuan', 24).forEach(function (r, i) {
        var no = rapi(r[0], 30);
        if (!no) return;
        var qs = Number(r[17]);
        out.push({
          baris: i + 2, no: no, t: r[1] instanceof Date ? fmt(r[1], 'yyyy-MM-dd') : '', wk: jam(r[1]), ms: r[1] instanceof Date ? r[1].getTime() : 0,
          bg: rapi(r[2], 40), kel: rapi(r[3], 40), k: rapi(r[4], 60).toUpperCase(), n: rapi(r[5], 120), s: rapi(r[6], 15),
          q: Number(r[7]) || 0, h: Number(r[8]) || 0, al: rapi(r[9], 300), pg: rapi(r[10], 60),
          sr: rapi(r[11], 30), an: rapi(r[12], 500), st: rapi(r[13], 20) || PGD_ST_.TUNGGU,
          oleh: rapi(r[14], 40), wp: jam(r[15]), cp: rapi(r[16], 300), qs: (r[17] !== '' && isFinite(qs)) ? qs : null,
          ref: rapi(r[18], 120), wps: tgl(r[19]), eta: tgl(r[20]), wt: jam(r[21]), w: ''
        });
        // File 55: warna (kolom X) dan nama tampil "Nama · WARNA". File 48: asal barang (kolom W) untuk tanda impor.
        var x = out[out.length - 1], v = PW_t_(r[23], 30).toUpperCase();
        x.w = v;
        if (v && String(x.n).toUpperCase().indexOf(v) === -1) x.n = x.n + ' · ' + v;
        Object.defineProperty(x, '_imp', { value: String(r[22]) === 'Impor', enumerable: false });
      });
      return out;
    }
    function PW_t_(v, n) { return String(v === null || v === undefined ? '' : v).replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^[=+@-]+/, '').slice(0, n || 200); }
    // IMP_pasang_ (file 48): tanda impor per nomor pengajuan.
    function impPasang(list, semua) {
      var m = {};
      semua.forEach(function (a) { m[a.no] = a._imp; });
      list.forEach(function (a) { if (a && Object.prototype.hasOwnProperty.call(m, a.no)) a.imp = m[a.no]; });
    }
    // PLX_labelList_ (file 72).
    function plxLabel(list) {
      list.forEach(function (x) { if (x && x.st === PGD_ST_.PESAN && String(x.ref || '').indexOf(PLX_REF_) === 0) x.st = 'Dibayar'; });
    }
    function itemRobot(robot) {
      return ((robot && robot.items) || []).map(function (x) {
        return { kel: x.kel, k: x.k, n: x.n, s: x.s, stok: x.stok, transit: x.transit, rata: x.rata, hari: x.hari, saran: x.saran, h: x.h, st: x.st };
      });
    }
    // pgdData: pengajuan terbaru dulu, maks 500, dengan tanda impor.
    function pgdAjuan() {
      var semua = ajuan(), a = semua.slice().reverse().slice(0, 500);
      impPasang(a, semua);
      return { a: a, semua: semua };
    }
    function pgsData(app, robot) {
      var g = PGS_GRUP_[app];
      if (!g) return { ok: false, pesan: 'Akses ditolak.' };
      var d = pgdAjuan();
      var list = d.a.filter(function (x) { return x.bg === g.bg; }).slice(0, 200).map(function (x) {
        return { no: x.no, wk: x.wk, bg: x.bg, kel: x.kel, k: x.k, n: x.n, s: x.s, q: x.q, qs: x.qs, h: x.h, al: x.al, pg: x.pg, st: x.st, oleh: x.oleh, wp: x.wp, cp: x.cp, ref: x.ref, eta: x.eta, wt: x.wt };
      });
      var r = { ok: true, mgmt: false, bg: g.bg, kelDef: g.kel, kel: (robot && robot.kel) || PGD_KEL_, items: itemRobot(robot), ajuan: list };
      impPasang(r.ajuan, d.semua);
      plxLabel(r.ajuan);
      return r;
    }
    function bacaWarnaBarang() {
      var m = {}, dilihat = {};
      baca('barang_order', 5).forEach(function (r) {
        var kode = String(r[0]).trim().toUpperCase();
        if (!kode || kode.indexOf('-') !== -1 || dilihat[kode]) return;
        dilihat[kode] = true;
        var warna = [], ada = {};
        String(r[4] || '').split(',').forEach(function (w) {
          w = w.replace(/-/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
          if (w && w !== 'LAINNYA' && !ada[w]) { ada[w] = true; warna.push(w); }
        });
        if (warna.length) m[kode] = warna;
      });
      return m;
    }
    function gdxPengajuan(robot) {
      var d = pgdAjuan();
      var r = { ok: true, mgmt: false, kel: (robot && robot.kel) || PGD_KEL_, items: itemRobot(robot), ajuan: d.a.slice(0, 250).map(function (x) {
        return { no: x.no, wk: x.wk, t: x.t, bg: x.bg, kel: x.kel, k: x.k, n: x.n, s: x.s, q: x.q, qs: x.qs, h: x.h, al: x.al, pg: x.pg, st: x.st, sr: x.sr, an: x.an, oleh: x.oleh, wp: x.wp, cp: x.cp, ref: x.ref, eta: x.eta, wt: x.wt };
      }) };
      impPasang(r.ajuan, d.semua);
      var w = bacaWarnaBarang();
      r.items.forEach(function (x) { if (x.kel === 'Barang jualan' && w[x.k]) x.w = w[x.k]; });
      plxLabel(r.ajuan);
      return r;
    }
    function terpakai(x) { return /Form (bahan baku|produksi)/i.test(String(x.ref || '')); }
    function ptrData(app) {
      var bagian = BAGIAN[app];
      if (!bagian) return { ok: false, pesan: 'Akses ditolak.' };
      var list = ajuan().filter(function (x) {
        return x.bg === bagian && x.st === PGD_ST_.PESAN && String(x.ref || '').indexOf(PLX_REF_) === 0 && !terpakai(x);
      }).map(function (x) {
        var q = x.qs !== null && x.qs !== undefined ? x.qs : x.q;
        var p = String(x.ref || '').split(' · '), m = /\b(PO-\d{6}-\d+)\b/.exec(String(x.ref || ''));
        return { no: x.no, n: x.n, kel: x.kel, s: x.s, q: q, wps: x.wps, pg: x.pg, toko: t2(p[p.length - 1], 60), po: m ? m[1] : '' };
      });
      return { ok: true, bagian: bagian, hariIni: fmt(new Date(), 'yyyy-MM-dd'), list: list };
    }
    function kunci(n) { return String(n).replace(/\s+/g, ' ').trim().toLowerCase(); }
    function daftarBahan() {
      var out = [], ada = {};
      baca('bahan', 6).forEach(function (r) {
        var j = /stik/i.test(String(r[0])) ? 'Stiker' : (/botol/i.test(String(r[0])) ? 'Botol' : '');
        var n = String(r[1]).replace(/\s+/g, ' ').trim();
        if (!j || !n || ada[kunci(n)]) return;
        ada[kunci(n)] = true;
        out.push({ j: j, n: n });
      });
      return out;
    }
    function pgsTerbuka(app) {
      var g = GRUP[app];
      if (!g || !g.link.length) return { ok: false, pesan: 'Akses ditolak.' };
      var stm = g.id === 'produksi' ? daftarBahan() : [];
      var list = ajuan().filter(function (x) {
        return g.link.indexOf(x.kel) !== -1 && (x.st === PGD_ST_.SETUJU || x.st === PGD_ST_.PESAN) && !terpakai(x);
      }).map(function (x) {
        var o = { no: x.no, wk: x.wk, bg: x.bg, kel: x.kel, k: x.k, n: x.n, s: x.s, q: x.q, qs: x.qs, h: x.h, al: x.al, pg: x.pg, st: x.st,
          oleh: x.oleh, wp: x.wp, cp: x.cp, ref: x.ref, eta: x.eta, wt: x.wt };
        if (stm.length) {
          var c = stm.filter(function (b) { return kunci(b.n) === kunci(x.n); })[0];
          o.j = c ? c.j : ''; o.nm = c ? c.n : '';
        }
        return o;
      });
      return { ok: true, list: list };
    }
    return { ptrData: ptrData, pgsTerbuka: pgsTerbuka, pgsData: pgsData, gdxPengajuan: gdxPengajuan, ajuan: ajuan, pgdAjuan: pgdAjuan };
  }

  async function muat(sb) { return buat(await window.Lembar.muat(sb, TABEL)); }
  async function robot(sb) {
    var r = await sb.rpc('pengadaan_robot');
    if (r.error) throw new Error(r.error.message);
    return r.data;
  }
  window.Pengadaan = {
    buat: buat,
    pgsData: async function (sb, app) {
      var h = await Promise.all([muat(sb), robot(sb)]);
      return h[1] ? h[0].pgsData(app, h[1]) : null;
    },
    gdxPengajuan: async function (sb) {
      var h = await Promise.all([buat(await window.Lembar.muat(sb, TABEL.concat(['barang_order']))), robot(sb)]);
      return h[1] ? h[0].gdxPengajuan(h[1]) : null;
    },
    ptrData: async function (sb, app) { return (await muat(sb)).ptrData(app); },
    pgsTerbuka: async function (sb, app) { return (await muat(sb)).pgsTerbuka(app); }
  };
})();
