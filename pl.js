/*
 * Moscow Supplies - link Purchasing (Viory) dibaca dari Supabase: plData (file 54 + 55) dan plxData (file 71 + 80).
 * Pengajuan (PGD_ajuan_) dan PO (GD_po_) memakai salinan rumus yang sama di pengadaan.js dan gudang.js (lembar.js);
 * kenaikan harga dari potret md:hrgnaik; "Dibayar Mike / Junior" dari rpc pl_mike_daftar (PMK_daftar_).
 */
(function () {
  'use strict';
  var PGD_ST_ = { TUNGGU: 'Menunggu', SETUJU: 'Disetujui', TOLAK: 'Ditolak', PESAN: 'Dipesan', TERIMA: 'Diterima', BATAL: 'Batal' };
  var GD_ST_ = { SETUJU: 'Disetujui', BAYAR: 'Dibayar', KIRIM: 'Dikirim supplier', SEBAGIAN: 'Diterima sebagian', SELESAI: 'Selesai' };
  var PL_BAYAR_LIST_ = ['ShopeePay', 'Kas Tunai', 'Rekening Belanja'];
  var PLX_HARI_DOBEL_ = 14, PLX_REF_ = 'Dibayar Viory';
  var TABEL = ['pengadaan_ajuan', 'bahan', 'po_log', 'po_item', 'po_biaya'];
  var TG_VIORY = false;  // sama dengan Apps Script saat ini (TG_VIORY di Script Properties belum diisi)

  function hariIni() { return window.Lembar.format(new Date(), 'yyyy-MM-dd'); }
  function jamSekarang() { return window.Lembar.format(new Date(), 'dd/MM/yyyy HH:mm'); }
  function geser(tgl, hari) { var p = String(tgl).split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + hari)).toISOString().slice(0, 10); }

  // PL_asalPeta_ (kolom W = asal barang) dan PL_impor_ (IMP_tebak_ untuk pengajuan lama).
  function asalPeta(L) {
    var m = {};
    window.Lembar.baca(L, 'pengadaan_ajuan', 23).forEach(function (r) { if (r[0]) m[String(r[0]).trim()] = String(r[22]).trim(); });
    return m;
  }
  function impor(x, peta) {
    var a = peta[x.no];
    if (a === 'Impor') return true;
    if (a === 'Lokal') return false;
    return x.kel === 'Barang jualan' || (x.kel === 'Botol & stiker' && /^(BT2|BT3)$/i.test(String(x.k || '')));
  }
  function tampil(x, peta) {
    return { no: x.no, wk: x.wk, t: x.t, bg: x.bg, kel: x.kel, k: x.k, n: x.n, s: x.s, q: x.q, qs: x.qs, h: x.h, al: x.al, pg: x.pg,
      sr: x.sr, an: x.an, st: x.st, oleh: x.oleh, wp: x.wp, cp: x.cp, ref: x.ref, eta: x.eta, wt: x.wt, imp: impor(x, peta) };
  }
  function dibayar(x) { return x.st === PGD_ST_.PESAN && String(x.ref || '').indexOf(PLX_REF_) === 0; }
  function label(x) { return dibayar(x) ? 'Dibayar' : x.st; }
  function kunci(x) { return x.k ? x.k + '|' + (x.w || '') : 'N|' + String(x.n || '').toLowerCase(); }
  function plxTampil(x) {
    return { no: x.no, wk: x.wk, t: x.t, bg: x.bg, kel: x.kel, k: x.k, n: x.n, s: x.s, q: x.q, qs: x.qs, h: x.h, al: x.al, pg: x.pg,
      st: label(x), oleh: x.oleh, cp: x.cp, ref: x.ref, wps: x.wps, wt: x.wt };
  }
  function dobel(semua, x, batas, poLokal) {
    var k = kunci(x), out = [];
    semua.forEach(function (y) {
      if (y.no === x.no || kunci(y) !== k) return;
      var belumTerima = y.st === PGD_ST_.PESAN, baru = y.st === PGD_ST_.TERIMA && y.wps && y.wps >= batas;
      if (!belumTerima && !baru) return;
      out.push({ no: y.no, st: label(y), t: y.wps || y.t, q: y.qs !== null && y.qs !== undefined ? y.qs : y.q, s: y.s, bg: y.bg, pg: y.pg });
    });
    (poLokal || []).forEach(function (o) {
      o.items.forEach(function (it) {
        if (!x.k || it.k + '|' + (it.w || '') !== k) return;
        if (out.some(function (d) { return d.po === o.no; })) return;
        out.push({ no: o.no, po: o.no, st: o.st, t: o.t, q: it.q, s: 'pcs', bg: 'PO lokal', pg: o.p });
      });
    });
    return out;
  }
  function poTunggu(po) {
    return po.list.filter(function (o) { return o.asal === 'Lokal' && o.st === GD_ST_.SETUJU && !o.wb; }).map(function (o) {
      return { no: o.no, t: o.t, sup: o.sup, bayar: o.bayar, tot: o.tot, p: o.p, c: o.c, items: o.items.map(function (it) { return { n: it.n, w: it.w, q: it.q, h: it.h, s: it.s }; }) };
    });
  }
  function poLokal(po, batas) {
    var buka = [GD_ST_.BAYAR, GD_ST_.KIRIM, GD_ST_.SEBAGIAN];
    return po.list.filter(function (o) {
      return o.asal === 'Lokal' && !/Dari pengajuan/.test(o.c) && (buka.indexOf(o.st) !== -1 || (o.st === GD_ST_.SELESAI && o.t >= batas));
    });
  }
  async function naikHarga(sb) {
    // Dihitung langsung dari harga_naik_log (md.js hrgNaikData); cadangan: potret Apps Script md:hrgnaik.
    var d = null;
    if (window.MdLama) { try { d = await window.MdLama.hrgNaikData(sb); } catch (e) { d = null; } }
    if (!d) { var r = await sb.from('hasil_hitung').select('data').eq('kunci', 'md:hrgnaik').maybeSingle(); d = r && r.data ? r.data.data : null; }
    if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { d = null; } }
    return d && d.ok && Array.isArray(d.list) ? d.list.slice(0, 120) : [];
  }
  async function siap(sb) {
    var L = await window.Lembar.muat(sb, TABEL);
    return { L: L, semua: window.Pengadaan.buat(L).ajuan(), po: window.Gudang.buat(L).po(), peta: asalPeta(L) };
  }

  // plData (file 54) + PW_poTunggu_ (file 55).
  async function plData(sb) {
    var h = await Promise.all([siap(sb), naikHarga(sb)]), s = h[0];
    var lokal = s.semua.filter(function (x) { return !impor(x, s.peta); }).sort(function (a, b) { return b.ms - a.ms; });
    var buka = [PGD_ST_.TUNGGU, PGD_ST_.SETUJU, PGD_ST_.PESAN];
    return {
      ok: true, hariIni: hariIni(),
      aktif: lokal.filter(function (x) { return buka.indexOf(x.st) !== -1; }).slice(0, 300).map(function (x) { return tampil(x, s.peta); }),
      selesai: lokal.filter(function (x) { return buka.indexOf(x.st) === -1; }).slice(0, 40).map(function (x) { return tampil(x, s.peta); }),
      naik: h[1], tgViory: TG_VIORY, diperbarui: jamSekarang(), po: poTunggu(s.po), bayarList: PL_BAYAR_LIST_.slice()
    };
  }

  // plxData (file 71) + daftar Dibayar Mike / Junior (file 80).
  async function plxData(sb) {
    var h = await Promise.all([siap(sb), naikHarga(sb), sb.rpc('pl_mike_daftar')]), s = h[0];
    if (h[2].error || !h[2].data || !h[2].data.ok) return null;
    var hari = hariIni(), batas = geser(hari, -PLX_HARI_DOBEL_), batasReport = geser(hari, -60), pl = poLokal(s.po, batas);
    var lokal = s.semua.filter(function (x) { return !impor(x, s.peta); });
    var belanja = lokal.filter(function (x) { return x.st === PGD_ST_.TUNGGU || x.st === PGD_ST_.SETUJU; })
      .sort(function (a, b) { return a.ms - b.ms; }).slice(0, 300)
      .map(function (x) { var o = plxTampil(x); o.dobel = dobel(s.semua, x, batas, pl); return o; });
    var report = lokal.filter(function (x) { return x.t >= batasReport || x.st === PGD_ST_.TUNGGU || x.st === PGD_ST_.SETUJU || x.st === PGD_ST_.PESAN; })
      .sort(function (a, b) { return b.ms - a.ms; }).slice(0, 400).map(plxTampil);
    return {
      ok: true, hariIni: hari, hariDobel: PLX_HARI_DOBEL_, belanja: belanja, report: report,
      naik: h[1], po: poTunggu(s.po), bayarList: PL_BAYAR_LIST_.slice(), diperbarui: jamSekarang(), mike: h[2].data.list
    };
  }

  window.Purchasing = { plData: plData, plxData: plxData };
})();
