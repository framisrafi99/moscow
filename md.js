/*
 * Moscow Supplies - Master Data lama dibaca dari Supabase (rumus Apps Script yang sama):
 *   pinjamPemilik / sesuaiPemilik (file 6), prodSesuaiDaftar kunci manajemen (file 7), rpPantau (file 52 versi file 53),
 *   rpDaftar (file 33; hanya saat tidak ada request consignment yang menunggu, selebihnya tetap Apps Script).
 * Kalau ada yang tidak bisa dihitung di sini, fungsi mengembalikan null dan halaman membaca lewat Apps Script.
 */
(function () {
  'use strict';
  function fmt(d, p) { return window.Lembar.format(d, p); }
  function s(v) { return v === null || v === undefined ? '' : String(v); }
  function rapiWarna_(v) { return s(v).replace(/\s+/g, ' ').trim().toUpperCase(); }

  // Semua baris tabel, urut seperti sheet (baris_sheet, baris baru di bawah).
  async function semua(sb, tabel, kolom) {
    var out = [], dari = 0, n = 1000;
    for (;;) {
      var r = await sb.from(tabel).select(kolom).order('baris_sheet', { ascending: true, nullsFirst: false }).order('id').range(dari, dari + n - 1);
      if (r.error) throw new Error(r.error.message);
      out = out.concat(r.data || []);
      if (!r.data || r.data.length < n) return out;
      dari += n;
    }
  }
  function tglIso(v) { var m = s(v).match(/^\d{4}-\d{2}-\d{2}/); return m ? m[0] : ''; }
  function waktu(v) { if (!v) return null; var d = new Date(v); return isNaN(d.getTime()) ? null : d; }

  // ---- pinjamPemilik: TP_data_('') ----
  async function pinjamPemilik(sb) {
    var rows = await semua(sb, 'toko_pinjam_log', 'no_pinjam,jenis,tanggal,toko,kode,nama_barang,warna,qty,peminjam,rencana_kembali,catatan,pengisi');
    var ev = [];
    rows.forEach(function (r) {
      var no = s(r.no_pinjam).trim(), jenis = s(r.jenis).trim().toUpperCase(), q = Number(r.qty);
      if (!no || (jenis !== 'PINJAM' && jenis !== 'KEMBALI') || r.qty === null || r.qty === '' || !isFinite(q) || q <= 0) return;
      ev.push({ no: no, jenis: jenis, tgl: tglIso(r.tanggal), toko: s(r.toko).trim(), kode: s(r.kode).trim().toUpperCase(), nama: s(r.nama_barang),
        warna: rapiWarna_(r.warna), qty: q, peminjam: s(r.peminjam), rencana: tglIso(r.rencana_kembali), catatan: s(r.catatan), pengisi: s(r.pengisi) });
    });
    var idx = {}, daftar = [];
    ev.forEach(function (e) {
      if (!(e.no in idx)) {
        idx[e.no] = daftar.length;
        daftar.push({ no: e.no, toko: e.toko, tgl: '', peminjam: '', rencana: '', catatan: '', pengisi: '', kembali: '', items: [], sisa: 0, _i: {} });
      }
      var p = daftar[idx[e.no]], kunci = e.kode + '|' + e.warna;
      if (!(kunci in p._i)) { p._i[kunci] = p.items.length; p.items.push({ k: e.kode, n: e.nama, w: e.warna, q: 0, kb: 0, sisa: 0 }); }
      var it = p.items[p._i[kunci]];
      if (e.jenis === 'PINJAM') {
        it.q += e.qty;
        p.tgl = p.tgl || e.tgl; p.peminjam = p.peminjam || e.peminjam; p.rencana = p.rencana || e.rencana;
        p.catatan = p.catatan || e.catatan; p.pengisi = p.pengisi || e.pengisi;
      } else {
        it.kb += e.qty;
        if (e.tgl > p.kembali) p.kembali = e.tgl;
      }
    });
    daftar.forEach(function (p) {
      delete p._i;
      p.items.forEach(function (it) { it.sisa = Math.max(0, it.q - it.kb); p.sisa += it.sisa; });
    });
    var luar = daftar.filter(function (p) { return p.sisa > 0; });
    luar.sort(function (a, b) {
      var ra = a.rencana || '9999', rb = b.rencana || '9999';
      return ra < rb ? -1 : ra > rb ? 1 : (a.no < b.no ? -1 : 1);
    });
    return { ok: true, luar: luar, hariIni: fmt(new Date(), 'yyyy-MM-dd') };
  }

  // ---- sesuaiPemilik: TS_dataPemilik_() ----
  async function sesuaiPemilik(sb) {
    var rows = await semua(sb, 'toko_sesuai_log', 'no,waktu_ajuan,toko,kode,nama_barang,warna,stok_sistem,hasil_hitung,selisih,alasan,pengaju,status,waktu_keputusan,catatan_manajemen');
    var jam = function (d) { return d ? fmt(d, 'dd/MM/yyyy HH:mm') : ''; };
    var data = [];
    rows.forEach(function (r) {
      var no = s(r.no).trim(), t = s(r.toko).trim(), sel = Number(r.selisih);
      if (!no || !t || r.selisih === null || r.selisih === '' || !isFinite(sel)) return;
      var st = s(r.status).trim(), wa = waktu(r.waktu_ajuan), wk = waktu(r.waktu_keputusan);
      data.push({ no: no, ms: wa ? wa.getTime() : 0, waktu: jam(wa), toko: t, k: s(r.kode).trim().toUpperCase(), n: s(r.nama_barang), w: rapiWarna_(r.warna),
        sistem: Number(r.stok_sistem) || 0, fisik: Number(r.hasil_hitung) || 0, selisih: sel, alasan: s(r.alasan), pengaju: s(r.pengaju),
        status: (st === 'Disetujui' || st === 'Ditolak') ? st : 'Menunggu', putusMs: wk ? wk.getTime() : 0, putus: jam(wk), catatan: s(r.catatan_manajemen) });
    });
    var ringkas = function (x) {
      return { no: x.no, waktu: x.waktu, toko: x.toko, k: x.k, n: x.n, w: x.w, sistem: x.sistem, fisik: x.fisik, selisih: x.selisih,
        alasan: x.alasan, pengaju: x.pengaju, status: x.status, putus: x.putus, catatan: x.catatan };
    };
    var tunggu = data.filter(function (x) { return x.status === 'Menunggu'; });
    tunggu.sort(function (a, b) { return a.ms - b.ms || (a.no < b.no ? -1 : 1); });
    var putus = data.filter(function (x) { return x.status !== 'Menunggu'; });
    putus.sort(function (a, b) { return b.putusMs - a.putusMs; });
    return { tunggu: tunggu.map(ringkas), putus: putus.slice(0, 10).map(ringkas), ok: true };
  }

  // ---- rpPantau (file 53): pantau pengiriman request consignment ----
  var OP_TAHAN_PROSES_JAM_ = 24, OP_TAHAN_KIRIM_JAM_ = 48;
  function GD_fmt_(n) {
    n = Math.round(Number(n) || 0);
    var t = String(Math.abs(n)), o = '';
    for (var i = 0; i < t.length; i++) { if (i > 0 && (t.length - i) % 3 === 0) o += '.'; o += t.charAt(i); }
    return (n < 0 ? '-' : '') + o;
  }
  function OP_peta_(L) {
    var m = {};
    window.Lembar.baca(L, 'order_proses', 10).forEach(function (r) {
      var no = String(r[1]).trim(), aksi = String(r[2]).trim();
      if (!no || !(r[0] instanceof Date)) return;
      var x = m[no] || (m[no] = { kr: [] }), ms = r[0].getTime(), t = fmt(r[0], 'dd/MM HH:mm'), d;
      if (aksi === 'Disetujui') x.acc = ms;
      else if (aksi === 'Diproses') { if (!x.dp) x.dp = { oleh: String(r[3]), t: t, ms: ms }; }
      else if (aksi === 'Dikirim') {
        d = {}; try { d = JSON.parse(String(r[9] || '{}')) || {}; } catch (e) { d = {}; }
        x.kr.push({ sj: String(d.sj || ''), oleh: String(r[3]), t: t, ms: ms, kurir: String(r[4]), resi: String(r[5]), ongkir: Number(r[6]) || 0, foto: String(r[7]), c: String(r[8]) });
      } else if (aksi === 'Diterima') {
        d = {}; try { d = JSON.parse(String(r[9] || '{}')) || {}; } catch (e) { d = {}; }
        x.tr = { oleh: String(r[3]), t: t, ms: ms, c: String(r[8]), sumber: String(d.sumber || ''), items: Array.isArray(d.items) ? d.items : [], selisih: Number(d.selisih) || 0 };
      }
    });
    return m;
  }
  function OP_msOrder_(L) {
    var m = {};
    window.Lembar.baca(L, 'order_log', 14).forEach(function (r) {
      var no = String(r[0]).trim();
      if (no && !m[no] && r[13] instanceof Date) m[no] = r[13].getTime();
    });
    return m;
  }
  function OP_info_(x) {
    if (!x) return { dp: null, kr: [], tr: null };
    return {
      dp: x.dp ? { oleh: x.dp.oleh, t: x.dp.t } : null,
      kr: x.kr.map(function (k) { return { sj: k.sj, oleh: k.oleh, t: k.t, kurir: k.kurir, resi: k.resi, ongkir: k.ongkir, foto: k.foto }; }),
      tr: x.tr ? { oleh: x.tr.oleh, t: x.tr.t, c: x.tr.c, sumber: x.tr.sumber, selisih: x.tr.selisih, items: x.tr.items } : null
    };
  }
  function OP_tahan_(o, x, msOrder, kini) {
    if (o.st !== 'Disetujui') return '';
    var dp = x && x.dp, sudahKirim = o.kirim > 0, awal;
    if (!dp && !sudahKirim) {
      awal = (x && x.acc) || msOrder[o.no] || 0;
      if (awal && kini - awal > OP_TAHAN_PROSES_JAM_ * 3600000) return 'Sudah disetujui ' + Math.floor((kini - awal) / 86400000) + ' hari, belum diproses gudang.';
      return '';
    }
    if (o.sisa > 0) {
      awal = dp ? dp.ms : 0;
      if (awal && kini - awal > OP_TAHAN_KIRIM_JAM_ * 3600000) return 'Diproses sejak ' + dp.t + ' (' + Math.floor((kini - awal) / 86400000) + ' hari), ' + (sudahKirim ? 'sisa ' + GD_fmt_(o.sisa) + ' pcs belum dikirim.' : 'belum dikirim.');
    }
    return '';
  }
  var TABEL_ORDER = ['order_log', 'order_proses', 'gudang_log'];
  async function rpPantau(sb) {
    var L = await window.Lembar.muat(sb, TABEL_ORDER), G = window.Gudang.buat(L), O = G.om;
    var hariIni = fmt(new Date(), 'yyyy-MM-dd');
    var log = G.log(), kirim = O.kirimMap(log), batas = O.geser(hariIni, -30);
    var peta = OP_peta_(L), msOrder = OP_msOrder_(L), kini = Date.now();
    var aktif = [], selesai = [], nTahan = 0, nSelisih = 0, nTunggu = 0;
    O.kumpul('0000-01-01', '9999-12-31').forEach(function (o) {
      if (o.tp !== 'Consignment') return;
      var buka = o.st === 'Disetujui' || o.st === 'Dikirim';
      if (!buka && !((o.st === 'Selesai' || o.st === 'Batal') && o.t >= batas)) return;
      var sd = kirim[o.no] || { _sj: [] }, r = O.rinci(o, sd, null), info = OP_info_(peta[o.no]);
      var x = { no: o.no, t: o.t, pl: o.pl, jenis: O.jenis(o), st: o.st, p: O.t(o.p, 60), c: O.t(o.c, 200), q: r.q, kirim: r.kirim, sisa: r.sisa, sj: sd._sj,
        items: r.items.map(function (it) { return { n: it.n, k: it.k, w: it.w, q: it.q, kirim: it.kirim }; }), dp: info.dp, kr: info.kr, tr: info.tr };
      x.tahan = OP_tahan_(x, peta[o.no], msOrder, kini);
      if (x.tahan) nTahan++;
      if (o.st === 'Dikirim') nTunggu++;
      if (info.tr && info.tr.selisih > 0) nSelisih++;
      if (buka) aktif.push(x); else if (selesai.length < 20) selesai.push(x);
    });
    aktif.sort(function (a, b) { return (b.tahan ? 1 : 0) - (a.tahan ? 1 : 0) || (a.t < b.t ? -1 : (a.t > b.t ? 1 : 0)); });
    return { ok: true, aktif: aktif, selesai: selesai, nTahan: nTahan, nSelisih: nSelisih, nTunggu: nTunggu, diperbarui: fmt(new Date(), 'dd/MM/yyyy HH:mm') };
  }

  // ---- rpDaftar (file 33): kalau tidak ada request consignment yang menunggu, hasilnya selalu daftar kosong ----
  async function rpDaftar(sb) {
    var L = await window.Lembar.muat(sb, ['order_log']), O = window.Gudang.buat(L).om;
    var ada = O.kumpul('0000-01-01', '9999-12-31').some(function (o) { return o.tp === 'Consignment' && o.st === 'Menunggu'; });
    return ada ? null : { ok: true, list: [], n: 0 };
  }

  // ---- hargaBahanBakuMaster (file 4): harga bahan baku + kemasan, riwayat perubahan ----
  async function hargaBahanBakuMaster(sb) {
    var h = await Promise.all([window.BahanBaku.hargaMaster(sb), window.Produksi.hargaMaster(sb)]);
    var harga = h[0].harga.concat(h[1].harga), ubah = h[0].ubah.concat(h[1].ubah);
    ubah.sort(function (a, b) { return a.t < b.t ? 1 : a.t > b.t ? -1 : b.b - a.b; });
    return { ok: true, harga: harga, ubah: ubah.slice(0, 200), diperbarui: fmt(new Date(), 'dd/MM/yyyy HH:mm') };
  }

  window.MdLama = { hargaBahanBakuMaster: hargaBahanBakuMaster, pinjamPemilik: pinjamPemilik, sesuaiPemilik: sesuaiPemilik, rpPantau: rpPantau, rpDaftar: rpDaftar };
})();
