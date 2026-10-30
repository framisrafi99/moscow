/*
 * Moscow Supplies - Kantor Packing di form Gudang Utama, langsung dari Supabase.
 * Rumus sama dengan Apps Script: GD_online_ (stok awal online + kiriman gudang ke Kantor Packing
 * + penyesuaian Kantor Packing yang disetujui - penjualan marketplace Official yang padanannya dikonfirmasi),
 * KPW_rinci_ (rincian per warna), kpData / gdxKpW (tampilan), kpHitung / gdxKpHitungW / gdxKpSesuaiW (ajuan -> RPC kp_ajuan).
 */
(function () {
  'use strict';
  var TABEL = ['barang_order', 'online_stok_awal', 'gudang_log', 'produksi_sesuai_log', 'mp_pesanan', 'mp_padanan'];
  var KP = 'Kantor Packing';
  var ALASAN = ['Barang rusak', 'Barang hilang', 'Sampel / promosi', 'Salah input', 'Barang ditemukan', 'Retur dari pelanggan', 'Lainnya'];
  var PAKET = { M02D5: { k: 'M02', w: ['RED', 'YELLOW', 'BLUE', 'WHITE', 'BLACK'] }, M03D5: { k: 'M03', w: ['RED', 'YELLOW', 'BLUE', 'WHITE', 'BLACK'] } };
  var AKTIF_CADANGAN = '2026-10-24 14:36'; // waktu potongan marketplace mulai berlaku (Asia/Jakarta), bila tidak terbaca

  function rapi(v, n) { return String(v === null || v === undefined ? '' : v).replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n || 200); }
  function warna(v) { return String(v === null || v === undefined ? '' : v).replace(/\s+/g, ' ').trim().toUpperCase(); }
  function bulat(v) { if (v === '' || v === null || v === undefined || typeof v === 'boolean') return NaN; var n = Number(v); return isFinite(n) && Math.floor(n) === n ? n : NaN; }
  function fmt(d, jam, pola) {
    var w = new Date(d.getTime() + jam * 3600000), p = function (x) { return (x < 10 ? '0' : '') + x; };
    return pola.replace('yyyy', w.getUTCFullYear()).replace('yy', String(w.getUTCFullYear()).slice(2)).replace('MM', p(w.getUTCMonth() + 1))
      .replace('dd', p(w.getUTCDate())).replace('HH', p(w.getUTCHours())).replace('mm', p(w.getUTCMinutes()));
  }
  var WITA = 8, WIB = 7; // zona sheet (Asia/Makassar) dan zona marketplace di Apps Script (Asia/Jakarta)

  function hitung(L, aktif) {
    var baca = function (t, w) { return window.Lembar.baca(L, t, w); };
    // GD_barang_
    var brg = { list: [], idx: {} };
    baca('barang_order', 5).forEach(function (r) {
      var kode = String(r[0]).trim().toUpperCase();
      if (!kode || kode.indexOf('-') !== -1 || brg.idx[kode] !== undefined) return;
      var h = Number(r[2]), w = [], ada = {};
      String(r[4] || '').split(',').forEach(function (x) {
        x = x.replace(/-/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
        if (x && x !== 'LAINNYA' && !ada[x]) { ada[x] = true; w.push(x); }
      });
      brg.idx[kode] = brg.list.length;
      brg.list.push({ k: kode, n: String(r[1]).trim(), kat: String(r[3]).trim() || 'Lainnya', w: w, h: (r[2] === '' || !isFinite(h) || h < 0) ? 0 : h });
    });
    // GD_log_
    var log = [];
    baca('gudang_log', 12).forEach(function (r) {
      if (!(r[0] instanceof Date)) return;
      var q = Number(r[5]);
      log.push({ t: fmt(r[0], WITA, 'yyyy-MM-dd'), j: rapi(r[1], 30), k: rapi(r[2], 30).toUpperCase(), n: rapi(r[3], 120), w: warna(r[4]), q: isFinite(q) ? q : 0, st: rapi(r[6], 100) });
    });
    // PSS_baca_
    var pss = [];
    baca('produksi_sesuai_log', 14).forEach(function (r) {
      var no = String(r[0] || '').trim(); if (!no) return;
      var sel = Number(r[8]);
      pss.push({ no: no, wa: r[1] instanceof Date ? r[1] : null, bg: String(r[2] || '').trim(), k: String(r[3] || '').trim().toUpperCase(),
        n: String(r[4] || '').replace(/\s+/g, ' ').trim(), w: warna(r[5]), sis: Number(r[6]) || 0, hit: Number(r[7]) || 0, sel: isFinite(sel) ? sel : 0,
        al: String(r[9] || ''), pg: String(r[10] || ''), st: String(r[11] || '').trim(), wk: r[12] instanceof Date ? r[12] : null, cat: String(r[13] || '') });
    });
    // GD_online_ (dasar)
    var per = {}, urut = [];
    var isi = function (k) { if (!per[k]) { per[k] = { k: k, n: '', kat: '', awal: 0, kirim: 0, q: 0, t: '' }; urut.push(k); } return per[k]; };
    var awal = baca('online_stok_awal', 9);
    awal.forEach(function (r) {
      var k = rapi(r[0], 30).toUpperCase(); if (!k) return;
      var x = isi(k), q = Number(r[4]);
      var t = r[7] instanceof Date ? fmt(r[7], WITA, 'yyyy-MM-dd') : rapi(r[7], 10);
      if (!x.n) x.n = rapi(r[1], 120);
      if (!x.kat) x.kat = rapi(r[2], 60);
      if (isFinite(q)) x.awal += q;
      if (/^\d{4}-\d{2}-\d{2}$/.test(t) && (!x.t || t < x.t)) x.t = t;
    });
    var mulai = '';
    urut.forEach(function (k) { var t = per[k].t; if (t && (!mulai || t < mulai)) mulai = t; });
    var tujuan = KP.toLowerCase();
    log.forEach(function (x) {
      if (!/^keluar/i.test(x.j) || String(x.st).toLowerCase() !== tujuan || !x.k) return;
      var o = per[x.k], dari = o && o.t ? o.t : mulai;
      if (dari && x.t < dari) return;
      var y = o || isi(x.k);
      if (!y.n) y.n = x.n;
      y.kirim += x.q;
    });
    var list = urut.map(function (k) {
      var x = per[k], b = brg.idx[k] !== undefined ? brg.list[brg.idx[k]] : null;
      x.q = x.awal + x.kirim;
      if (b) { if (!x.n) x.n = b.n; if (!x.kat) x.kat = b.kat; }
      if (!x.kat) x.kat = 'Lainnya';
      return x;
    });
    var idx = {};
    var ambil = function (k) {
      if (idx[k] === undefined) { list.forEach(function (x, i) { idx[x.k] = i; }); }
      if (idx[k] !== undefined) return list[idx[k]];
      var b = brg.idx[k] !== undefined ? brg.list[brg.idx[k]] : null;
      var x = { k: k, n: b ? b.n : k, kat: b ? b.kat : 'Lainnya', awal: 0, kirim: 0, q: 0, t: '' };
      idx[k] = list.length; list.push(x); return x;
    };
    // Bungkus SL: penyesuaian / hitung stok Kantor Packing yang disetujui.
    var adj = {};
    pss.forEach(function (x) { if (x.bg === KP && x.st === 'Disetujui' && x.wk && x.sel && x.k) adj[x.k] = (adj[x.k] || 0) + x.sel; });
    Object.keys(adj).forEach(function (k) { var x = ambil(k); x.sesuai = (x.sesuai || 0) + adj[k]; x.q += adj[k]; });
    // Bungkus MP: penjualan marketplace Official (padanan dikonfirmasi) sejak stok awal / hitung stok terakhir.
    var mp = { per: {}, perW: [] };
    if (aktif) {
      var pdn = {};
      baca('mp_padanan', 7).forEach(function (r) {
        var nm = rapi(r[0], 250); if (!nm) return;
        pdn[(nm + '|' + rapi(r[1], 120)).toUpperCase()] = { k: rapi(r[2], 30).toUpperCase(), w: warna(r[3]), st: rapi(r[4], 20) || 'Dikonfirmasi' };
      });
      var batas = {};
      list.forEach(function (x) { if (x.t) batas[x.k] = x.t + ' 00:00'; });
      var umum = mulai ? mulai + ' 00:00' : '';
      pss.forEach(function (x) {
        if (x.bg !== KP || x.st !== 'Disetujui' || !x.wk || !x.wa || !x.k) return;
        if (x.wk.getTime() >= aktif) return;
        var t = fmt(x.wa, WIB, 'yyyy-MM-dd HH:mm');
        if (!batas[x.k] || t > batas[x.k]) batas[x.k] = t;
      });
      baca('mp_pesanan', 17).forEach(function (r) {
        if (rapi(r[1], 40) !== 'Official' || !rapi(r[3], 40)) return;
        var st = rapi(r[4], 160);
        if (/batal|cancel/i.test(st) || /belum bayar|unpaid/i.test(st)) return;
        var kirim = r[6] instanceof Date ? fmt(r[6], WITA, 'yyyy-MM-dd HH:mm') : (/^\d{4}-\d{2}-\d{2}/.test(rapi(r[6], 20)) ? rapi(r[6], 20).slice(0, 16) : '');
        if (!kirim) return;
        var q = (Number(r[10]) || 0) - (Number(r[11]) || 0);
        if (!(q > 0)) return;
        var m = pdn[(rapi(r[8], 250) + '|' + rapi(r[9], 120)).toUpperCase()];
        if (!m || m.st !== 'Dikonfirmasi' || !m.k || m.k === '-') return;
        var pk = PAKET[m.k], kk = pk ? pk.k : m.k;
        var c = batas[kk] || umum;
        if (c && kirim < c) return;
        mp.per[kk] = (mp.per[kk] || 0) + (pk ? q * pk.w.length : q);
        if (pk) pk.w.forEach(function (w) { mp.perW.push([pk.k, w, -q]); });
        else if (warna(m.w)) mp.perW.push([m.k, warna(m.w), -q]);
      });
      Object.keys(mp.per).forEach(function (k) { var x = ambil(k); x.jualMp = (x.jualMp || 0) + mp.per[k]; x.q -= mp.per[k]; });
    }
    var on = { list: list, mulai: mulai };
    // KPW_rinci_: rincian per warna
    var part = {}, tambah = function (k, w, q) { if (!k || !w || !q || !isFinite(q)) return; var o = part[k] || (part[k] = {}); o[w] = (o[w] || 0) + q; };
    var mulaiK = {};
    list.forEach(function (x) { if (x.t) mulaiK[x.k] = x.t; });
    awal.forEach(function (r) { var k = rapi(r[0], 30).toUpperCase(), w = warna(r[3]), q = Number(r[4]); if (k && w && isFinite(q)) tambah(k, w, q); });
    log.forEach(function (x) {
      if (!/^keluar/i.test(x.j) || String(x.st).toLowerCase() !== tujuan || !x.k || !x.w) return;
      var dari = mulaiK[x.k] || mulai; if (dari && x.t < dari) return;
      tambah(x.k, x.w, x.q);
    });
    pss.forEach(function (x) { if (x.bg === KP && x.st === 'Disetujui' && x.wk && x.sel && x.k && x.w) tambah(x.k, x.w, x.sel); });
    mp.perW.forEach(function (a) { tambah(a[0], a[1], a[2]); });
    var rinci = {};
    list.forEach(function (x) {
      var c = part[x.k] || {}, s = 0;
      Object.keys(c).forEach(function (w) { if (!c[w]) delete c[w]; else s += c[w]; });
      rinci[x.k] = { tot: x.q, c: c, r: x.q - s };
    });
    Object.keys(part).forEach(function (k) {
      if (rinci[k]) return;
      var s = 0; Object.keys(part[k]).forEach(function (w) { s += part[k][w]; });
      rinci[k] = { tot: 0, c: part[k], r: -s };
    });
    return { brg: brg, on: on, rinci: rinci, pss: pss };
  }

  function daftarWarna(b, x) {
    var out = b && b.w ? b.w.slice() : [];
    if (x) Object.keys(x.c).forEach(function (w) { if (out.indexOf(w) === -1) out.push(w); });
    return out;
  }
  function urutkan(list, brg, ambilK) {
    var u = {};
    brg.list.forEach(function (b, i) { u[b.k] = i; if (u['#' + b.kat] === undefined) u['#' + b.kat] = i; });
    var v = function (key) { var x = u[key]; return x === undefined ? 1e6 : x; };
    list.sort(function (a, b) { return (v('#' + a.kat) - v('#' + b.kat)) || (v(a.k) - v(b.k)) || (a.k < b.k ? -1 : 1); });
  }
  function ajuanKP(pss, warnaJuga) {
    var out = [];
    pss.forEach(function (x) {
      if (x.bg !== KP) return;
      var a = { no: x.no, k: x.k, n: x.n, sis: x.sis, hit: x.hit, sel: x.sel, st: x.st, pg: x.pg, al: x.al, t: x.wa ? fmt(x.wa, WITA, 'dd/MM/yyyy HH:mm') : '' };
      if (warnaJuga) a.w = x.w; else a.cat = x.cat;
      out.push(a);
    });
    return out.reverse().slice(0, 80);
  }

  // Waktu aktif potongan marketplace: dari hasil hitung Master Data (md:gudang), cadangan bila tidak ada.
  function cariAktif(o) {
    if (!o || typeof o !== 'object') return '';
    if (typeof o.aktif === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(o.aktif) && o.belumHari) return o.aktif;
    var ks = Object.keys(o);
    for (var i = 0; i < ks.length; i++) { var r = cariAktif(o[ks[i]]); if (r) return r; }
    return '';
  }
  function keMs(t) { var m = t.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/); return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) - WIB * 3600000; }

  var muatan = null, waktuMuat = 0;
  function siap(sb) {
    if (muatan && Date.now() - waktuMuat < 3000) return muatan;
    waktuMuat = Date.now();
    muatan = Promise.all([
      window.Lembar.muat(sb, TABEL),
      sb.from('hasil_hitung').select('data').eq('kunci', 'md:gudang').maybeSingle().then(function (r) { return r && r.data ? r.data.data : null; }, function () { return null; }),
      sb.rpc('peran_saya').then(function (r) { return r && r.data; }, function () { return ''; })
    ]).then(function (h) {
      var d = h[1]; if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { d = null; } }
      var t = cariAktif(d) || AKTIF_CADANGAN;
      return { A: hitung(h[0], keMs(t)), peran: h[2] || '' };
    });
    muatan.catch(function () { muatan = null; });
    return muatan;
  }
  function lupakan() { muatan = null; }

  async function gdxKp(sb) {
    var S = await siap(sb), A = S.A;
    var list = A.on.list.map(function (x) { return { k: x.k, n: x.n, kat: x.kat, q: x.q }; }), ada = {};
    list.forEach(function (x) { ada[x.k] = true; });
    A.brg.list.forEach(function (b) { if (!ada[b.k]) list.push({ k: b.k, n: b.n, kat: b.kat, q: 0, lain: true }); });
    urutkan(list, A.brg);
    return { ok: true, list: list, ajuan: ajuanKP(A.pss, false), hariIni: fmt(new Date(), WITA, 'yyyy-MM-dd') };
  }

  async function gdxKpW(sb) {
    var h = await Promise.all([siap(sb), sb.rpc('hpp_staf')]), S = h[0], A = S.A, r = h[1];
    var hpp = (r && !r.error && r.data && r.data.hpp) || {}, usul = {};
    ((r && r.data && r.data.usul) || []).forEach(function (u) {
      var j = rapi(u[3], 30) === 'HPP' ? 'hpp' : (rapi(u[3], 30) === 'Harga Jual' ? 'harga' : '');
      if (!j) return;
      var w = u[1] ? new Date(u[1]) : null;
      (usul[rapi(u[4], 30).toUpperCase()] = usul[rapi(u[4], 30).toUpperCase()] || {})[j] = { b: Number(u[5]) || 0, nm: rapi(u[2], 60), wk: w && !isNaN(w.getTime()) ? fmt(w, WITA, 'dd/MM/yyyy HH:mm') : '' };
    });
    var list = [], ada = {};
    var isi = function (k, n, kat) {
      if (ada[k]) return; ada[k] = true;
      var b = A.brg.idx[k] !== undefined ? A.brg.list[A.brg.idx[k]] : null, x = A.rinci[k] || { tot: 0, c: {}, r: 0 };
      list.push({ k: k, n: n || (b ? b.n : k), kat: kat || (b ? b.kat : 'Lainnya'), q: x.tot, r: x.r,
        w: daftarWarna(b, x).map(function (w) { return [w, x.c[w] || 0]; }), hpp: Math.round(hpp[k] || 0), hj: b ? (b.h || 0) : 0, u: usul[k] || null });
    };
    A.on.list.forEach(function (x) { isi(x.k, x.n, x.kat); });
    A.brg.list.forEach(function (b) { isi(b.k, b.n, b.kat); });
    urutkan(list, A.brg);
    return { ok: true, list: list, ajuan: ajuanKP(A.pss, true), alasan: ALASAN.slice(), mgmt: S.peran === 'manajemen' };
  }

  // Ajuan: stok sistem dihitung di sini (rumus di atas), lalu RPC kp_ajuan mencatat & memberi nomor.
  async function ajukan(sb, jenis, p) {
    lupakan();
    var A = (await siap(sb)).A, daftar = Array.isArray(p.items) ? p.items : [], items = [];
    var sis = {};
    A.on.list.forEach(function (x) { sis[x.k] = x.q; });
    for (var i = 0; i < daftar.length; i++) {
      var x = daftar[i] || {}, k = rapi(x.k, 30).toUpperCase(), w = jenis === 'hitung' ? '' : warna(x.w);
      var b = A.brg.idx[k] !== undefined ? A.brg.list[A.brg.idx[k]] : null;
      if (jenis === 'hitung') {
        var nm = b ? b.n : (A.on.list.filter(function (y) { return y.k === k; })[0] || {}).n;
        if (!nm) return { ok: false, pesan: 'Barang tidak dikenal: ' + k };
        items.push({ k: k, n: nm, sis: sis[k] || 0, hitung: x.hitung });
        continue;
      }
      var rc = A.rinci[k];
      if (!b && !rc) return { ok: false, pesan: jenis === 'sesuaiW' ? 'Pilih barang di baris ' + (i + 1) + '.' : 'Barang tidak dikenal: ' + k };
      var n2 = b ? b.n : k, wl = daftarWarna(b, rc);
      if (w && wl.indexOf(w) === -1) return { ok: false, pesan: 'Warna ' + w + ' tidak ada di daftar ' + n2 + '.' };
      if (jenis === 'sesuaiW' && !w && wl.length && !(rc && rc.r)) return { ok: false, pesan: 'Pilih warna untuk ' + n2 + '.' };
      var s = !rc ? 0 : (w ? (rc.c[w] || 0) : rc.r);
      if (jenis === 'hitungW') items.push({ k: k, n: n2, w: w, sis: s, hitung: x.hitung });
      else items.push({ k: k, n: n2, w: w, sis: s, q: x.q, a: x.a, al: x.al });
    }
    var r = await sb.rpc('kp_ajuan', { p_jenis: jenis, p_nama: rapi(p.nama, 40), p_alasan: jenis === 'sesuaiW' ? rapi(p.catatan, 200) : rapi(p.alasan, 200), p_items: items, p_token: rapi(p.token, 80) });
    if (r.error) throw new Error('Gagal menyimpan: ' + r.error.message + '. Tekan kirim sekali lagi; aman, tidak akan tercatat dua kali.');
    lupakan();
    return r.data;
  }

  window.KantorPacking = {
    gdxKp: gdxKp, gdxKpW: gdxKpW, lupakan: lupakan, hitung: hitung,
    gdxKpHitung: function (sb, p) { return ajukan(sb, 'hitung', p); },
    gdxKpHitungW: function (sb, p) { return ajukan(sb, 'hitungW', p); },
    gdxKpSesuaiW: function (sb, p) { return ajukan(sb, 'sesuaiW', p); }
  };
})();
