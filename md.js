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

  // ---- hrgNaikData (file 26): isi sheet HARGA_NAIK_LOG (tabel harga_naik_log), terbaru di atas ----
  async function hrgNaikData(sb) {
    var rows = await semua(sb, 'harga_naik_log', 'baris_sheet,waktu,sumber,no,kelompok,kode,nama_barang,warna,harga_lama,tanggal_harga_lama,harga_baru,selisih,naik_persen,supplier,pengisi');
    // Tabel baru: tunggu sampai sinkron pertama selesai (ada baris), kecuali sheet memang kosong menurut potret lama.
    if (!rows.length) {
      var p = await sb.from('hasil_hitung').select('data').eq('kunci', 'md:hrgnaik').maybeSingle();
      var d = p && p.data ? p.data.data : null;
      if (!d || !Array.isArray(d.list) || d.list.length) return null;
    }
    var list = [];
    rows.forEach(function (r) {
      if (r.baris_sheet === null) return;
      var w = waktu(r.waktu);
      if (!w) return;
      var lama = Number(r.harga_lama) || 0, baru = Number(r.harga_baru) || 0;
      list.push({
        t: fmt(w, 'yyyy-MM-dd'), j: fmt(w, 'HH:mm'), sb: s(r.sumber), no: s(r.no), kel: s(r.kelompok), k: s(r.kode), n: s(r.nama_barang), w: s(r.warna), lama: lama,
        tl: tglIso(r.tanggal_harga_lama), baru: baru, sel: Number(r.selisih) || (baru - lama),
        pc: (r.naik_persen === null || r.naik_persen === '') ? (lama ? Math.round((baru - lama) / lama * 1000) / 10 : 0) : Number(r.naik_persen) || 0,
        sup: s(r.supplier), pg: s(r.pengisi)
      });
    });
    list.reverse();
    return { ok: true, list: list.slice(0, 2000), diperbarui: fmt(new Date(), 'dd/MM/yyyy HH:mm') };
  }

  // ======================= mdRingkasan (file 9) =======================
  function tglLokal(v) { var m = s(v).match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]) - 8 * 3600000) : ''; }
  function wkt(v) { var d = waktu(v); return d || ''; }
  function rlTeks_(v) { return s(v).replace(/\s+/g, ' ').trim(); }
  function rlWaktu_(v, c) { return (v instanceof Date) ? v : ((c instanceof Date) ? c : null); }
  function rlsAngka_(v) { var n = Number(v); return isFinite(n) ? n : 0; }
  function rlsFmt_(n) {
    n = Math.round(rlsAngka_(n) * 1000) / 1000;
    var b = String(Math.abs(n)).split('.');
    return (n < 0 ? '-' : '') + b[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (b[1] ? ',' + b[1] : '');
  }
  function MD_angka_(v) { var n = Number(v); return isFinite(n) ? n : 0; }
  var RLS_PROD_ = 'Staf produksi', RLS_BBK_ = 'Staf produksi bahan baku';

  function pelanggan(rows) {
    var out = [];
    rows.forEach(function (r) {
      var nama = s(r.nama_pelanggan).trim();
      if (!nama) return;
      out.push({ n: nama, t: /resel|putus/i.test(s(r.tipe)) ? 'Reseller' : 'Consignment' });
    });
    return out;
  }
  // laporanToko_ (file 1): penjualan, biaya, return satu toko pada periode.
  function laporanToko(T, toko, dari, sampai) {
    var out = { jual: [], omzet: 0, qty: 0, totalBiaya: 0, totalRetur: 0 }, idx = {};
    T.jual.forEach(function (r) {
      var d = tglLokal(r.tanggal);
      if (!d || s(r.toko).trim() !== toko) return;
      var t = fmt(d, 'yyyy-MM-dd');
      if (t < dari || t > sampai) return;
      var kode = s(r.kode).trim().toUpperCase(), q = Number(r.qty_terjual) || 0, tot = Number(r.total) || 0;
      var w = s(r.warna).trim().toUpperCase(), k = kode + '|' + w;
      if (!(k in idx)) { idx[k] = out.jual.length; out.jual.push({ k: kode, n: s(r.nama_barang), w: w, q: 0, tot: 0 }); }
      out.jual[idx[k]].q += q; out.jual[idx[k]].tot += tot; out.qty += q; out.omzet += tot;
    });
    out.jual.sort(function (a, b) { return b.q - a.q; });
    T.biaya.forEach(function (r) {
      var d = tglLokal(r.tanggal);
      if (!d || s(r.toko).trim() !== toko) return;
      var t = fmt(d, 'yyyy-MM-dd');
      if (t < dari || t > sampai) return;
      out.totalBiaya += Number(r.nominal) || 0;
    });
    T.retur.forEach(function (r) {
      var d = tglLokal(r.tanggal);
      if (!d || s(r.toko).trim() !== toko) return;
      var t = fmt(d, 'yyyy-MM-dd');
      if (t < dari || t > sampai) return;
      out.totalRetur += Number(r.nilai) || 0;
    });
    return out;
  }
  // riwayatLaporanStaf (file 5) bagian ringkas: kapan terakhir tiap toko / staf mengisi dan berapa laporan pada periode.
  function riwayatRingkas(T, L, tokoSemua, dari, sampai) {
    var dariMs = tglLokal(dari).getTime(), sampaiMs = tglLokal(sampai).getTime() + 86400000;
    function hitung(lihat, staf) {
      var pakai = {}, grup = {}, urut = [], akhir = {};
      lihat.forEach(function (n) { pakai[n] = true; });
      var masuk = function (jenis, toko, w, pengisi, tetap) {
        toko = staf ? toko : rlTeks_(toko);
        if (!pakai[toko] || !(w instanceof Date)) return null;
        if (staf && /^impor/i.test(rlTeks_(pengisi))) return null;
        var ms = w.getTime();
        if (!(akhir[toko] >= ms)) akhir[toko] = ms;
        if (ms < dariMs || ms >= sampaiMs) return null;
        var k = jenis + '|' + toko + '|' + (tetap || (Math.floor(ms / 1000) + '|' + rlTeks_(pengisi)));
        if (!grup[k]) { grup[k] = { j: jenis, toko: toko, n: 0, q: 0 }; urut.push(grup[k]); }
        return grup[k];
      };
      return { masuk: masuk, urut: urut, akhir: akhir };
    }
    // Toko consignment (riwayatLaporan).
    var A = hitung(tokoSemua, false), m = A.masuk;
    T.jual.forEach(function (r) {
      var nota = rlTeks_(r.no_nota), g = m('Penjualan', r.toko, rlWaktu_(wkt(r.waktu_masuk), tglLokal(r.tanggal)), r.pengisi, nota ? 'nota|' + nota : '');
      if (g) { g.n++; g.q += rlsAngka_(r.qty_terjual); }
    });
    T.biaya.forEach(function (r) { m('Biaya', r.toko, rlWaktu_(wkt(r.waktu_masuk), tglLokal(r.tanggal)), r.pengisi, ''); });
    T.retur.forEach(function (r) { m('Return', r.toko, rlWaktu_(wkt(r.waktu_masuk), tglLokal(r.tanggal)), r.pengisi, ''); });
    T.hitung.forEach(function (r) { m('Hitung stok', r.toko, rlWaktu_(wkt(r.waktu_hitung)), r.pengisi, ''); });
    window.Lembar.baca(L, 'order_log', 16).forEach(function (r) {
      var no = rlTeks_(r[0]);
      if (!no) return;
      m('Re-stock', r[2], rlWaktu_(r[13], r[1]), r[14], 'no|' + no);
    });
    T.pinjam.forEach(function (r) {
      var no = rlTeks_(r.no_pinjam), jenis = rlTeks_(r.jenis).toUpperCase();
      m('Stok dipinjam', r.toko, rlWaktu_(wkt(r.waktu_masuk), tglLokal(r.tanggal)), r.pengisi, no ? 'no|' + no + '|' + jenis : '');
    });
    T.sesuai.forEach(function (r) {
      var no = rlTeks_(r.no);
      m('Penyesuaian stok', r.toko, rlWaktu_(wkt(r.waktu_ajuan)), r.pengaju, no ? 'no|' + no : '');
    });
    var f = function (ms, pola) { return fmt(new Date(ms), pola); };
    var ringkas = tokoSemua.map(function (n) { return { toko: n, akhir: A.akhir[n] ? f(A.akhir[n], 'dd/MM/yyyy HH:mm') : '', hari: A.akhir[n] ? f(A.akhir[n], 'yyyy-MM-dd') : '', lap: 0, pcs: 0 }; });
    var pos = {};
    ringkas.forEach(function (x, i) { pos[x.toko] = i; });
    A.urut.forEach(function (g) { var x = ringkas[pos[g.toko]]; x.lap++; if (g.j === 'Penjualan') x.pcs += g.q; });

    // Staf produksi & bahan baku (riwayatLaporanStaf).
    var B = hitung([RLS_PROD_, RLS_BBK_], true), mb = B.masuk, baca = function (t, w) { return window.Lembar.baca(L, t, w); };
    baca('produksi_log', 7).forEach(function (r) { var g = mb('Produksi', RLS_PROD_, rlWaktu_(r[4], r[0]), r[5], ''); if (g) { g.n++; g.q += rlsAngka_(r[3]); } });
    baca('salur_log', 8).forEach(function (r) {
      var tujuan = rlTeks_(r[6]), w = rlWaktu_(r[4], r[0]);
      var g = mb('Penyaluran', RLS_PROD_, w, r[5], w ? Math.floor(w.getTime() / 1000) + '|' + rlTeks_(r[5]) + '|' + tujuan : '');
      if (g) { g.n++; g.q += rlsAngka_(r[3]); }
    });
    [['bahan_masuk', 'Botol & stiker masuk'], ['bahan_log', 'Botol & stiker terpakai'], ['bahan_rusak', 'Botol & stiker rusak']].forEach(function (x) {
      baca(x[0], 7).forEach(function (r) { var g = mb(x[1], RLS_PROD_, rlWaktu_(r[4], r[0]), r[5], ''); if (g) { g.n++; g.q += rlsAngka_(r[3]); } });
    });
    baca('bahan_baku_beli', 17).forEach(function (r) {
      var no = rlTeks_(r[0]);
      if (!no) return;
      var g = mb('Pembelian bahan', RLS_BBK_, rlWaktu_(r[10], r[1]), r[9], 'no|' + no);
      if (g) g.n++;
      if (rlTeks_(r[11]) === 'Sampai' && (r[12] instanceof Date)) { g = mb('Barang sampai', RLS_BBK_, r[12], r[15], 'sampai|' + no); if (g) g.n++; }
    });
    baca('bahan_jadi_log', 10).forEach(function (r) { var g = mb('Produksi bahan', RLS_BBK_, rlWaktu_(r[6], r[0]), r[7], ''); if (g) g.n++; });
    baca('bahan_baku_log', 10).forEach(function (r) {
      var g = mb(/rusak/i.test(rlTeks_(r[1])) ? 'Bahan rusak / terbuang' : 'Bahan terpakai', RLS_BBK_, rlWaktu_(r[6], r[0]), r[7], '');
      if (g) g.n++;
    });
    baca('produksi_sesuai_log', 14).forEach(function (r) {
      var no = rlTeks_(r[0]), bagian = rlTeks_(r[2]);
      var g = mb('Penyesuaian stok', /bahan baku/i.test(bagian) ? RLS_BBK_ : RLS_PROD_, rlWaktu_(r[1]), r[10], no ? 'no|' + no : '');
      if (g) { g.n++; g.q += rlsAngka_(r[7]); }
    });
    var hit = {};
    hit[RLS_PROD_] = { lap: 0, pcs: 0, kali: 0 }; hit[RLS_BBK_] = { lap: 0, pcs: 0, kali: 0 };
    B.urut.forEach(function (g) {
      var h = hit[g.toko];
      h.lap++;
      if (g.j === 'Produksi') h.pcs += g.q;
      if (g.j === 'Produksi bahan') h.kali += g.n;
    });
    [RLS_PROD_, RLS_BBK_].forEach(function (n) {
      ringkas.push({ toko: n, akhir: B.akhir[n] ? f(B.akhir[n], 'dd/MM/yyyy HH:mm') : '', hari: B.akhir[n] ? f(B.akhir[n], 'yyyy-MM-dd') : '',
        lap: hit[n].lap, pcs: hit[n].pcs, teks: n === RLS_PROD_ ? rlsFmt_(hit[n].pcs) + ' pcs diproduksi' : rlsFmt_(hit[n].kali) + ' kali produksi' });
    });
    return ringkas;
  }

  async function mdRingkasan(sb) {
    var hari = fmt(new Date(), 'yyyy-MM-dd'), bulan = hari.slice(0, 7), awal = bulan + '-01';
    var h = await Promise.all([
      semua(sb, 'pelanggan', 'nama_pelanggan,tipe'),
      semua(sb, 'toko_jual_log', 'tanggal,toko,kode,nama_barang,qty_terjual,total,waktu_masuk,pengisi,warna,no_nota'),
      semua(sb, 'toko_biaya_log', 'tanggal,toko,nominal,waktu_masuk,pengisi'),
      semua(sb, 'toko_retur_log', 'tanggal,toko,nilai,waktu_masuk,pengisi'),
      semua(sb, 'toko_hitung_log', 'waktu_hitung,toko,pengisi'),
      semua(sb, 'toko_pinjam_log', 'no_pinjam,jenis,tanggal,toko,waktu_masuk,pengisi'),
      semua(sb, 'toko_sesuai_log', 'no,waktu_ajuan,toko,pengaju'),
      window.Lembar.muat(sb, ['order_log', 'produksi_log', 'salur_log', 'bahan_masuk', 'bahan_log', 'bahan_rusak', 'bahan_baku_beli', 'bahan_jadi_log', 'bahan_baku_log', 'produksi_sesuai_log']),
      sesuaiPemilik(sb), window.Produksi.prodSesuaiDaftar(sb, true), pinjamPemilik(sb), hargaBahanBakuMaster(sb),
      window.BahanBaku.ringkasStok(sb), window.Akunting.akuntingLaporan(sb, { bulan: bulan })
    ]);
    var T = { jual: h[1], biaya: h[2], retur: h[3], hitung: h[4], pinjam: h[5], sesuai: h[6] }, L = h[7];
    var sp = h[8], pd = h[9], pj = h[10], hb = h[11], bb = h[12], acc = h[13];
    if (!sp || !sp.ok || !pd || !pd.ok || !pj || !pj.ok || !acc || !acc.ok) return null;
    var selisihHari = function (iso) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) return null;
      var a = iso.split('-'), b = hari.split('-');
      return Math.round((Date.UTC(+b[0], +b[1] - 1, +b[2]) - Date.UTC(+a[0], +a[1] - 1, +a[2])) / 86400000);
    };
    var out = { ok: true, hari: hari, bulan: bulan };
    out.tunggu = { toko: 0, tokoRinci: {}, prod: 0, bahan: 0 };
    (sp.tunggu || []).forEach(function (x) { out.tunggu.toko++; out.tunggu.tokoRinci[x.toko] = (out.tunggu.tokoRinci[x.toko] || 0) + 1; });
    (pd.list || []).forEach(function (x) { if (x.st !== 'Menunggu') return; if (/bahan baku/i.test(String(x.bg))) out.tunggu.bahan++; else out.tunggu.prod++; });
    out.pinjam = { n: 0, pcs: 0, lewat: 0 };
    (pj.luar || []).forEach(function (x) {
      out.pinjam.n++; out.pinjam.pcs += MD_angka_(x.sisa);
      if (x.rencana && String(x.rencana) < String(pj.hariIni || hari)) out.pinjam.lewat++;
    });
    var pel = pelanggan(h[0]), tokoSemua = pel.filter(function (x) { return x.t === 'Consignment'; }).map(function (x) { return x.n; });
    out.toko = [];
    tokoSemua.forEach(function (n) {
      var lap = laporanToko(T, n, awal, hari), jual = lap.jual[0];
      out.toko.push({ n: n, q: MD_angka_(lap.qty), omzet: MD_angka_(lap.omzet), retur: MD_angka_(lap.totalRetur),
        bersih: MD_angka_(lap.omzet) - MD_angka_(lap.totalRetur), biaya: MD_angka_(lap.totalBiaya),
        laris: jual ? String(jual.n) + (jual.w ? ' ' + String(jual.w) : '') + ' (' + MD_angka_(jual.q) + ')' : '' });
    });
    var totR = 0;
    window.Gudang.buat(L).om.kumpul(awal, hari).forEach(function (o) { if (o.tp === 'Reseller' && o.st !== 'Batal') totR += o.tot; });
    out.reseller = MD_angka_(totR);
    out.akhir = riwayatRingkas(T, L, tokoSemua, awal, hari).map(function (x) {
      return { n: x.toko, akhir: x.akhir || '', lalu: selisihHari(x.hari), lap: MD_angka_(x.lap), teks: x.teks || '' };
    });
    out.harga = { naik: 0, top: [] };
    if (hb && hb.ok) {
      var naik = (hb.harga || []).filter(function (x) { return MD_angka_(x.pc) > 0; });
      naik.sort(function (a, b) { return b.pc - a.pc; });
      out.harga.naik = naik.length;
      out.harga.top = naik.slice(0, 3).map(function (x) { return { n: x.n, pc: x.pc }; });
    }
    out.bahan = bb;
    out.uang = {
      masuk: MD_angka_(acc.totalMasuk), keluar: MD_angka_(acc.totalKeluar), bersih: MD_angka_(acc.lr && acc.lr.bersih),
      peringatan: (acc.peringatan || []).slice(0, 5),
      minus: (acc.akun || []).filter(function (a) { return MD_angka_(a.akhir) < 0; }).map(function (a) { return a.n; })
    };
    out.gagal = [];
    out.batas = 3;
    out.diperbarui = fmt(new Date(), 'dd/MM/yyyy HH:mm');
    return out;
  }

  // ======================= HPP berlapis (file 13 GD_hpp_ + file 16 edit barang + file 60 hitung HPP) =======================
  // MDE_riwayatHpp_: riwayat HPP dari MD_UBAH_LOG (jenis HPP / Barang baru), urut tanggal berlaku.
  function riwayatHpp(rows) {
    var out = {};
    rows.forEach(function (r) {
      var no = rlTeks_(r.no).slice(0, 30);
      if (!no) return;
      var j = rlTeks_(r.jenis).slice(0, 30), k = rlTeks_(r.kode).slice(0, 30).toUpperCase(), b = tglIso(r.berlaku_mulai);
      if ((j !== 'HPP' && j !== 'Barang baru') || !k || !/^\d{4}-\d{2}-\d{2}$/.test(b)) return;
      var baru = Number(r.baru === null ? '' : r.baru), lama = Number(r.lama === null ? '' : r.lama);
      if (!isFinite(baru) || baru <= 0) return;
      var w = waktu(r.waktu);
      (out[k] = out[k] || []).push({ b: b, ms: w ? w.getTime() : 0, lama: isFinite(lama) ? lama : 0, baru: baru });
    });
    Object.keys(out).forEach(function (k) { out[k].sort(function (a, b) { return a.b < b.b ? -1 : a.b > b.b ? 1 : a.ms - b.ms; }); });
    return out;
  }
  function lapisHpp(L, rwRows, chrRows) {
    var RW = riwayatHpp(rwRows), hari = fmt(new Date(), 'yyyy-MM-dd'), G = window.Gudang.buat(L);
    var kini = function (k) { var a = RW[k]; if (!a) return null; var h = null; a.forEach(function (x) { if (x.b <= hari) h = x.baru; }); return h; };
    var pada = function (k, t, sekarang) {
      var a = RW[k];
      if (!a || !a.length || !t) return sekarang || 0;
      if (t < a[0].b) return a[0].lama > 0 ? a[0].lama : (sekarang || 0);
      var h = a[0].baru; a.forEach(function (x) { if (x.b <= t) h = x.baru; }); return h;
    };
    var log = G.log();
    // CHR_memo_: barang yang pernah diterima sebelum sistem hitung HPP (lama) dan yang sudah lewat hitung HPP (adaBaru).
    var tbBaru = {}, lama = {}, adaBaru = {};
    chrRows.forEach(function (r) { var tb = rlTeks_(r.bukti_terima).slice(0, 30); if (tb) tbBaru[tb] = true; });
    log.forEach(function (x) {
      if (!/^masuk/i.test(x.j)) return;
      var ref = String(x.ref), i = ref.indexOf('|'), r0 = i === -1 ? ref : ref.slice(0, i), r1 = i === -1 ? '' : ref.slice(i + 1);
      if (r0.indexOf('TB-') !== 0) return;
      if (tbBaru[r0]) adaBaru[x.k] = true; else lama[r1 + '|' + x.k] = true;
    });
    var urutPo = function (po) { return po.list.slice().sort(function (a, b) { return a.t < b.t ? -1 : a.t > b.t ? 1 : a.ms - b.ms; }); };
    var unitPo = function (o, it, barang, biaya) { var bagian = barang > 0 ? biaya * it.s / barang : 0; return it.q > 0 ? Math.round(it.h + bagian / it.q) : it.h; };
    // GD_hpp_ dengan bungkus file 16 lalu file 60.
    function akhirPo(po) {
      var akhir = {};
      urutPo(po).forEach(function (o) {
        if (o.st === 'Ditolak' || o.st === 'Batal' || !o.items.length) return;
        var barang = 0, biaya = 0;
        o.items.forEach(function (it) { barang += it.s; }); o.biaya.forEach(function (b) { biaya += b.v; });
        o.items.forEach(function (it) { akhir[it.k] = { n: it.n, hpp: unitPo(o, it, barang, biaya), h: it.h, t: o.t, no: o.no, sup: o.sup }; });
      });
      Object.keys(akhir).forEach(function (k) { var h = kini(k); if (h) akhir[k].hpp = h; });
      var pilih = {};
      urutPo(po).forEach(function (o) {
        if (o.st === 'Ditolak' || o.st === 'Batal' || !o.items.length) return;
        var barang = 0, biaya = 0;
        o.items.forEach(function (it) { barang += it.s; }); o.biaya.forEach(function (b) { biaya += b.v; });
        o.items.forEach(function (it) {
          if (!lama[o.no + '|' + it.k]) return;
          pilih[it.k] = { n: it.n, hpp: unitPo(o, it, barang, biaya), h: it.h, t: o.t, no: o.no, sup: o.sup };
        });
      });
      Object.keys(akhir).forEach(function (k) {
        if (pilih[k]) akhir[k] = pilih[k];
        else if (adaBaru[k]) akhir[k].hpp = 0;
        else return;
        var h = kini(k); if (h) akhir[k].hpp = h;
      });
      return akhir;
    }
    // DS_hpp_ (file 14) dengan bungkus file 16 = MM_hppPeta_.
    function peta() {
      var hpp = {}, akhir = {}, po = null;
      try { po = G.po(); G.isiTerima(po, log); } catch (e) { po = null; }
      try { if (po) akhir = akhirPo(po); } catch (e) { akhir = {}; }
      Object.keys(akhir).forEach(function (k) { if (akhir[k].hpp) hpp[k] = akhir[k].hpp; });
      window.Lembar.baca(L, 'online_stok_awal', 6).forEach(function (r) {
        var k = rlTeks_(r[0]).slice(0, 30).toUpperCase(), h = Number(r[5]);
        if (k && isFinite(h) && h > 0) hpp[k] = h;
      });
      Object.keys(RW).forEach(function (k) { var h = kini(k); if (h) hpp[k] = h; });
      return hpp;
    }
    return { L: L, G: G, log: log, kini: kini, pada: pada, akhirPo: akhirPo, peta: peta, RW: RW };
  }
  var TABEL_HPP = ['barang_order', 'gudang_log', 'gudang_stok_awal', 'online_stok_awal', 'po_log', 'po_item', 'po_biaya', 'salur_log', 'produksi_sesuai_log'];
  async function bahanHpp(sb) {
    var h = await Promise.all([window.Lembar.muat(sb, TABEL_HPP),
      semua(sb, 'md_ubah_log', 'no,waktu,jenis,kode,berlaku_mulai,lama,baru'), semua(sb, 'hpp_hitung_log', 'bukti_terima')]);
    return lapisHpp(h[0], h[1], h[2]);
  }

  // ---- gdRingkas (file 13): ringkasan Gudang Utama di Master Data ----
  async function gdRingkas(sb) {
    var h = await Promise.all([bahanHpp(sb), window.KantorPacking.siap(sb)]), H = h[0], A = h[1].A, G = H.G;
    var log = H.log, po = G.po();
    G.isiTerima(po, log);
    var stok = G.stok(log), pcs = 0, minus = 0;
    Object.keys(stok).forEach(function (k) { pcs += stok[k]; if (stok[k] < 0) minus++; });
    var t = { setuju: 0, bayar: 0, biaya: 0, jalan: 0, prod: G.salurTunggu(log).length, nilaiBayar: 0, nilaiBiaya: 0 };
    var STAF = { 'ShopeePay': true, 'Kas Tunai': true };
    po.list.forEach(function (o) {
      if (o.st === 'Menunggu persetujuan') t.setuju++;
      if (o.st === 'Ditolak' || o.st === 'Batal') return;
      if (!STAF[o.bayar] && !o.wb && o.st !== 'Menunggu persetujuan') { t.bayar++; t.nilaiBayar += o.tot; }
      if (o.st === 'Dikirim supplier') t.jalan++;
      o.biaya.forEach(function (b) { if (b.sb !== 'Dibayar') { t.biaya++; t.nilaiBiaya += b.v; } });
    });
    var ajuan = 0;
    G.sesuai().forEach(function (x) { if (x.st === 'Menunggu') ajuan++; });
    t.ajuan = ajuan;
    // GD_online_ (file 13 + 15 + 16 + 38): jumlah dari kp.js, HPP & harga jual per barang.
    var hppPo = H.akhirPo(G.po()), brg = G.barang(), onH = {}, onJ = {};
    var online = null;
    try {
      window.Lembar.baca(H.L, 'online_stok_awal', 9).forEach(function (r) {
        var k = rlTeks_(r[0]).slice(0, 30).toUpperCase();
        if (!k) return;
        var hp = Number(r[5]), hj = Number(r[6]);
        if (!onH[k] && isFinite(hp) && hp > 0) onH[k] = hp;
        if (!onJ[k] && isFinite(hj) && hj > 0) onJ[k] = hj;
      });
      var tot = { pcs: 0, hpp: 0, jual: 0, tanpaHpp: 0, minus: 0 };
      A.on.list.forEach(function (x) {
        var b = brg.idx[x.k] !== undefined ? brg.list[brg.idx[x.k]] : null;
        var hp = onH[x.k] || (hppPo[x.k] && hppPo[x.k].hpp ? hppPo[x.k].hpp : 0), hj = onJ[x.k] || (b && b.h ? b.h : 0);
        var e = H.kini(x.k); if (e && e !== hp) hp = e;
        tot.pcs += x.q;
        if (x.q < 0) tot.minus++;
        if (x.q > 0) { tot.hpp += x.q * hp; tot.jual += x.q * hj; if (!hp) tot.tanpaHpp++; }
      });
      online = { pcs: tot.pcs, hpp: tot.hpp, jual: tot.jual, tanpaHpp: tot.tanpaHpp, minus: tot.minus };
    } catch (e) { return null; }
    return { ok: true, t: t, pcs: pcs, minus: minus, online: online, diperbarui: fmt(new Date(), 'dd/MM/yyyy HH:mm') };
  }

  // ======================= MARKETPLACE (file 38): mpRingkasOfficial, mpData (consignment) =======================
  var MP_TOKO_ = { 'Consignment Medan': ['Shopee', 'Tokopedia'], 'Consignment Sidoarjo': ['Shopee'], 'Official': ['Shopee', 'Tokopedia', 'Lazada'] };
  var MP_TOKO_POTONG_ = 'Official';
  function MP_t_(v, n) { return s(v).replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n || 200); }
  function MP_n_(v) { var x = Number(v); return isFinite(x) ? x : 0; }
  function MP_tgl_(v) { v = MP_t_(v, 20); return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : ''; }
  // Waktu marketplace tersimpan sebagai teks "yyyy-MM-dd HH:mm" di sheet (dibaca ulang dengan zona sheet).
  function MP_jamTeks_(v) { if (v instanceof Date) return fmt(v, 'yyyy-MM-dd HH:mm'); var t = MP_t_(v, 20); return /^\d{4}-\d{2}-\d{2}/.test(t) ? t.slice(0, 16) : ''; }
  function MP_pkunci_(nm, vr) { return (MP_t_(nm, 250) + '|' + MP_t_(vr, 120)).toUpperCase(); }
  function MP_up_(x) { return String(x || '').toUpperCase(); }
  function MP_kata_(x) {
    var t = MP_up_(x).replace(/[^A-Z0-9]+/g, ' ').replace(/(\d)([A-Z])/g, '$1 $2').replace(/([A-Z])(\d)/g, '$1 $2').replace(/\s+/g, ' ').trim();
    var sin = [['CLEANER', 'KLIN'], ['SABUN', 'KLIN'], ['SPATULA', 'SEPATULA'], ['LEATHER', 'LETHER'], ['DEMPUL', 'FILLER']];
    var ada = ' ' + t + ' ';
    sin.forEach(function (y) { if (ada.indexOf(' ' + y[0] + ' ') !== -1 && ada.indexOf(' ' + y[1] + ' ') === -1) t += ' ' + y[1]; });
    return t;
  }
  function MP_ukuran_(x) {
    var t = MP_up_(x).replace(/\s+/g, '');
    if (/(^|[^0-9])1(L|LT|LTR|LITER|LITRE)([^A-Z]|$)/.test(t)) return 1000;
    var m = t.match(/(\d{2,4})ML/);
    return m ? Number(m[1]) : 0;
  }
  function MP_warna_(teks, daftar) {
    var t = ' ' + MP_kata_(teks) + ' ', best = '';
    daftar.forEach(function (w) { var ww = ' ' + MP_kata_(w) + ' '; if (t.indexOf(ww) !== -1 && w.length > best.length) best = w; });
    return best;
  }
  function MP_aturan_(nm, vr) {
    var t = ' ' + MP_kata_(nm + ' ' + vr) + ' ', ml = MP_ukuran_(nm + ' ' + vr);
    var ada = function (x) { return t.indexOf(' ' + x + ' ') !== -1; };
    if (ada('WATERBASED') || ada('WATER BASED')) return ml === 1000 ? 'M06' : 'M05';
    if (ada('SUEDE DYE') || ada('PEWARNA SUEDE')) return ml >= 250 ? 'M07C' : (ml >= 100 ? 'M07B' : 'M07');
    if (ada('FINISHER') || ada('VARNISH')) {
      var g = ada('GLOSS'), d = ada('DOFF') || ada('MATTE');
      if (g === d) return null;
      return ml === 60 ? (g ? 'M11' : 'M09') : (g ? 'M10' : 'M08');
    }
    if (ada('CAT') && (ada('LEATHER') || ada('PAINT') || ada('MOSCOW'))) {
      if (ada('NEON')) return ml === 60 ? 'M03N60' : 'M02N30';
      if (ada('PASTEL')) return ml === 60 ? 'M03P60' : 'M02P30';
      if (ml === 1000) return 'M01';
      if (ml === 100) return 'M04';
      if (ml === 60) return 'M03';
      if (ml === 30) return 'M02';
    }
    return null;
  }
  function MP_skor_(nm, vr, ha, b) {
    var teks = MP_kata_(nm + ' ' + vr), set = {};
    teks.split(' ').forEach(function (x) { if (x.length >= 2) set[x] = 1; });
    var bt = MP_kata_(b.nama).split(' ').filter(function (x) { return x.length >= 2; });
    if (!bt.length) return 0;
    var hit = 0;
    bt.forEach(function (x) { if (set[x]) hit++; });
    var sk = hit / bt.length * 0.7;
    var ca = teks.replace(/ /g, ''), cb = MP_kata_(b.nama).replace(/ /g, '');
    if (cb.length >= 5 && ca.indexOf(cb) !== -1) sk += 0.25;
    if (ha > 0 && b.harga > 0) {
      var sel = Math.abs(ha - b.harga) / b.harga;
      if (Math.abs(ha - b.harga) <= 1) sk += 0.35; else if (sel <= 0.15) sk += 0.08; else if (sel > 0.4) sk -= 0.3;
    }
    var u1 = MP_ukuran_(nm + ' ' + vr), u2 = MP_ukuran_(b.nama);
    if (u1 && u2 && u1 !== u2) sk -= 0.3;
    return sk;
  }
  function MP_usul_(nm, vr, ha, B) {
    var r = MP_aturan_(nm, vr), b, w;
    if (r && B.idx[r]) {
      b = B.idx[r];
      if (!b.warna.length) return { k: r, w: '', y: 0.9 };
      w = MP_warna_(vr, b.warna) || MP_warna_(nm, b.warna);
      return { k: r, w: w, y: w ? 0.9 : 0.5 };
    }
    var best = null, s1 = 0, s2 = 0;
    B.list.forEach(function (x) {
      var sk = MP_skor_(nm, vr, ha, x);
      if (sk > s1) { s2 = s1; s1 = sk; best = x; } else if (sk > s2) s2 = sk;
    });
    if (!best || s1 < 0.35) return { k: '', w: '', y: 0 };
    w = best.warna.length ? (MP_warna_(vr, best.warna) || MP_warna_(nm, best.warna)) : '';
    var y = Math.min(1, s1);
    if (s1 - s2 < 0.05) y = Math.min(y, 0.4);
    if (best.warna.length && !w) y = Math.min(y, 0.4);
    return { k: best.kode, w: w, y: Math.round(y * 100) / 100 };
  }
  // MP_barang_: bacaBarangOrder_(true).
  function MP_barang_(L) {
    var list = [], dilihat = {}, idx = {};
    window.Lembar.baca(L, 'barang_order', 5).forEach(function (r) {
      var kode = String(r[0]).trim().toUpperCase();
      if (!kode || kode.indexOf('-') !== -1 || dilihat[kode]) return;
      dilihat[kode] = true;
      var h = Number(r[2]), harga = (r[2] === '' || !isFinite(h) || h < 0) ? 0 : h, warna = [], ada = {};
      String(r[4] || '').split(',').forEach(function (w) {
        w = w.replace(/-/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
        if (w && w !== 'LAINNYA' && !ada[w]) { ada[w] = true; warna.push(w); }
      });
      list.push({ kode: kode, nama: String(r[1]).trim(), harga: harga, kat: String(r[3]).trim() || 'Lainnya', warna: warna });
    });
    list.forEach(function (b) { if (!idx[b.kode]) idx[b.kode] = b; });
    return { list: list, idx: idx, nama: function (k) { return idx[k] ? idx[k].nama : k; } };
  }
  function MP_padananFn_(L, B) {
    var tetap = {}, memo = {};
    window.Lembar.baca(L, 'mp_padanan', 7).forEach(function (r) {
      var nm = MP_t_(r[0], 250);
      if (!nm) return;
      tetap[MP_pkunci_(nm, r[1])] = { k: MP_t_(r[2], 30).toUpperCase(), w: rapiWarna_(r[3]), st: MP_t_(r[4], 20) || 'Dikonfirmasi' };
    });
    return function (nm, vr, ha) {
      var key = MP_pkunci_(nm, vr), t = tetap[key];
      if (t) return { k: t.st === 'Diabaikan' ? '-' : t.k, w: t.w, st: t.st, y: 1 };
      if (!memo[key]) { var u = MP_usul_(nm, vr, ha, B); memo[key] = { k: u.k, w: u.w, st: u.k ? 'Usulan' : '', y: u.y }; }
      return memo[key];
    };
  }
  function MP_bacaPsn_(L) {
    var out = [];
    window.Lembar.baca(L, 'mp_pesanan', 17).forEach(function (r) {
      var no = MP_t_(r[3], 40);
      if (!no) return;
      var st = MP_t_(r[4], 160);
      out.push({ toko: MP_t_(r[1], 40), pf: MP_t_(r[2], 20), no: no, st: st,
        dibuat: MP_jamTeks_(r[5]), kirim: MP_jamTeks_(r[6]), selesai: MP_jamTeks_(r[7]),
        nm: MP_t_(r[8], 250), vr: MP_t_(r[9], 120), q: MP_n_(r[10]), ret: MP_n_(r[11]),
        ha: MP_n_(r[12]), hd: MP_n_(r[13]), sub: MP_n_(r[14]), wu: MP_jamTeks_(r[16]),
        batal: /batal|cancel/i.test(st), belum: /belum bayar|unpaid/i.test(st) });
    });
    return out;
  }
  var TABEL_MP = ['barang_order', 'mp_pesanan', 'mp_padanan'];

  async function mpRingkasOfficial(sb, p) {
    var h = await Promise.all([window.Lembar.muat(sb, TABEL_MP), bahanHpp(sb)]), L = h[0], H = h[1];
    var kini = fmt(new Date(), 'yyyy-MM-dd'), dari = MP_tgl_(p && p.dari), sampai = MP_tgl_(p && p.sampai), tt;
    if (!sampai) sampai = kini;
    if (!dari) dari = sampai.slice(0, 8) + '01';
    if (dari > sampai) { tt = dari; dari = sampai; sampai = tt; }
    var B = MP_barang_(L), P = MP_padananFn_(L, B), psn = MP_bacaPsn_(L), hpp = H.peta();
    var hppK = function (k, t) { return Number(H.pada(k, t, hpp[k] || 0) || 0) || 0; };
    var PF = MP_TOKO_[MP_TOKO_POTONG_], per = {}, brg = {};
    PF.forEach(function (pf) { per[pf] = { psn: {}, batal: {}, pcs: 0, ret: 0, nret: 0, omzet: 0, hpp: 0, tanpaHpp: 0, belumKenal: 0, terakhir: '' }; });
    psn.forEach(function (x) {
      if (x.toko !== MP_TOKO_POTONG_) return;
      var st = per[x.pf];
      if (!st) return;
      if (x.wu > st.terakhir) st.terakhir = x.wu;
      var t = x.dibuat.slice(0, 10);
      if (t < dari || t > sampai || x.belum) return;
      if (x.batal) { st.batal[x.no] = 1; return; }
      st.psn[x.no] = 1;
      var harga = x.hd || x.ha, q = x.q - x.ret;
      st.ret += x.ret; st.nret += harga * x.ret;
      if (!(q > 0)) return;
      var om = harga * q;
      st.pcs += q; st.omzet += om;
      var m = P(x.nm, x.vr, x.ha);
      if (!m.k || m.k === '-') { if (m.k !== '-') st.belumKenal += q; return; }
      var hh = hppK(m.k, t);
      if (!(hh > 0)) st.tanpaHpp += q;
      st.hpp += hh * q;
      var b = brg[m.k] || (brg[m.k] = { k: m.k, n: B.nama(m.k), q: {}, pcs: 0, omzet: 0, hpp: 0 });
      b.q[x.pf] = (b.q[x.pf] || 0) + q; b.pcs += q; b.omzet += om; b.hpp += hh * q;
    });
    var list = PF.map(function (pf) {
      var st = per[pf];
      return { pf: pf, psn: Object.keys(st.psn).length, batal: Object.keys(st.batal).filter(function (n) { return !st.psn[n]; }).length,
        pcs: st.pcs, ret: st.ret, nret: Math.round(st.nret), omzet: Math.round(st.omzet), hpp: Math.round(st.hpp), laba: Math.round(st.omzet - st.hpp),
        tanpaHpp: st.tanpaHpp, belumKenal: st.belumKenal, terakhir: st.terakhir };
    });
    var top = Object.keys(brg).map(function (k) { var b = brg[k]; b.omzet = Math.round(b.omzet); b.hpp = Math.round(b.hpp); return b; })
      .sort(function (a, b) { return b.omzet - a.omzet; }).slice(0, 50);
    return { ok: true, dari: dari, sampai: sampai, pf: PF, list: list, top: top };
  }

  // mpData: hanya toko consignment (Medan / Sidoarjo). Official memakai potongan stok Kantor Packing: tetap lewat Apps Script.
  async function mpData(sb, p) {
    p = p || {};
    var toko = MP_TOKO_[MP_t_(p.toko, 40)] ? MP_t_(p.toko, 40) : 'Consignment Medan';
    if (toko === MP_TOKO_POTONG_) return null;
    var pf = MP_TOKO_[toko].indexOf(MP_t_(p.platform, 20)) !== -1 ? MP_t_(p.platform, 20) : MP_TOKO_[toko][0];
    var h = await Promise.all([window.Lembar.muat(sb, TABEL_MP),
      semua(sb, 'toko_jual_log', 'tanggal,toko,kode,qty_terjual,warna,saluran')]), L = h[0];
    var kini = fmt(new Date(), 'yyyy-MM-dd'), dari = MP_tgl_(p.dari), sampai = MP_tgl_(p.sampai), tt;
    if (!sampai) sampai = kini;
    if (!dari) dari = sampai.slice(0, 8) + '01';
    if (dari > sampai) { tt = dari; dari = sampai; sampai = tt; }
    var B = MP_barang_(L), P = MP_padananFn_(L, B), psn = MP_bacaPsn_(L);
    var combo = {};
    psn.forEach(function (x) {
      var k = MP_pkunci_(x.nm, x.vr);
      if (!combo[k]) combo[k] = { n: x.nm, v: x.vr, q: 0, h: x.ha, toko: {} };
      if (!x.batal && !x.belum) combo[k].q += x.q - x.ret;
      combo[k].toko[x.toko] = 1;
    });
    var padanan = Object.keys(combo).map(function (k) {
      var c = combo[k], m = P(c.n, c.v, c.h);
      return { n: c.n, v: c.v, q: c.q, h: c.h, k: m.k, w: m.w, st: m.st, y: m.y, toko: Object.keys(c.toko) };
    }).sort(function (a, b) { return b.q - a.q; });
    var hari = {}, brg = {}, noP = {}, noB = {}, tot = { psn: 0, batal: 0, pcs: 0, omzet: 0, kenal: 0, belumKenal: 0, ragu: 0 }, terakhir = '';
    var hr = function (t) { return hari[t] || (hari[t] = { t: t, psn: {}, batal: {}, pcs: 0, omzet: 0, staf: 0, potong: 0 }); };
    psn.forEach(function (x) {
      if (x.toko !== toko || x.pf !== pf) return;
      if (x.wu > terakhir) terakhir = x.wu;
      var t = x.dibuat.slice(0, 10);
      if (t < dari || t > sampai || x.belum) return;
      var d = hr(t);
      if (x.batal) { d.batal[x.no] = 1; noB[x.no] = 1; return; }
      d.psn[x.no] = 1; noP[x.no] = 1;
      var q = x.q - x.ret;
      if (!(q > 0)) return;
      d.pcs += q; tot.pcs += q;
      var om = (x.hd || x.ha) * q;
      d.omzet += om; tot.omzet += om;
      var m = P(x.nm, x.vr, x.ha);
      if (m.k === '-') return;
      if (!m.k) { tot.belumKenal += q; return; }
      var kk = m.k + '|' + (m.w || '');
      var b = brg[kk] || (brg[kk] = { k: m.k, w: m.w || '', n: B.nama(m.k), mkt: 0, staf: 0, ragu: 0 });
      b.mkt += q; tot.kenal += q;
      if (m.st !== 'Dikonfirmasi') { b.ragu += q; tot.ragu += q; }
    });
    tot.psn = Object.keys(noP).length;
    tot.batal = Object.keys(noB).filter(function (n) { return !noP[n]; }).length;
    // MP_staf_: laporan penjualan staf toko (toko_jual_log) pada periode, per saluran.
    var ikut = p.ikut !== false, sf = { brg: {}, hari: {}, tanpa: 0, pcs: 0 };
    h[1].forEach(function (r) {
      var d = tglLokal(r.tanggal);
      if (!d || MP_t_(r.toko, 80) !== toko) return;
      var t = fmt(d, 'yyyy-MM-dd');
      if (t < dari || t > sampai) return;
      var q = Number(r.qty_terjual) || 0;
      if (!q) return;
      var sl = MP_t_(r.saluran, 30);
      if (!sl) { sf.tanpa += q; if (!ikut) return; }
      else if (sl !== pf) return;
      var kk = MP_t_(r.kode, 30).toUpperCase() + '|' + rapiWarna_(r.warna);
      sf.brg[kk] = (sf.brg[kk] || 0) + q;
      sf.hari[t] = (sf.hari[t] || 0) + q;
      sf.pcs += q;
    });
    Object.keys(sf.brg).forEach(function (kk) {
      var bag = kk.split('|');
      var b = brg[kk] || (brg[kk] = { k: bag[0], w: bag[1] || '', n: B.nama(bag[0]), mkt: 0, staf: 0, ragu: 0 });
      b.staf += sf.brg[kk];
    });
    Object.keys(sf.hari).forEach(function (t) { hr(t).staf += sf.hari[t]; });
    var staf = { pcs: sf.pcs, tanpa: sf.tanpa, ikut: ikut };
    var hariList = Object.keys(hari).sort().map(function (t) {
      var d = hari[t];
      return { t: t, psn: Object.keys(d.psn).length, batal: Object.keys(d.batal).filter(function (n) { return !d.psn[n]; }).length, pcs: d.pcs, omzet: d.omzet, staf: d.staf, potong: d.potong };
    });
    var brgList = Object.keys(brg).map(function (k) { return brg[k]; })
      .sort(function (a, b) { return Math.abs(b.mkt - b.staf) - Math.abs(a.mkt - a.staf) || b.mkt - a.mkt; });
    var barang = B.list.map(function (b) { return { k: b.kode, n: b.nama, w: b.warna }; });
    return { ok: true, toko: toko, pf: pf, dari: dari, sampai: sampai, tot: tot, hari: hariList, brg: brgList, staf: staf, stok: null, terakhir: terakhir, padanan: padanan, barang: barang };
  }

  // ---- mdSetujuData (file 9) + pembungkus file 13 (grup Staf gudang utama) dan file 15 (grup Staf Kantor Packing) ----
  function MD_jamUrut_(t) {
    var m = /^(\d{2})\/(\d{2})\/(\d{4})(?: (\d{2}):(\d{2}))?/.exec(s(t));
    return m ? m[3] + m[2] + m[1] + (m[4] || '00') + (m[5] || '00') : '';
  }
  async function mdSetujuData(sb) {
    var grup = [], idx = {}, riwayat = [], gagal = [];
    var masuk = function (id, nama, jenis, item) {
      if (!(id in idx)) { idx[id] = grup.length; grup.push({ id: id, n: nama, jenis: jenis, items: [] }); }
      grup[idx[id]].items.push(item);
    };
    var h = await Promise.all([sesuaiPemilik(sb).catch(function () { return null; }), window.Produksi.prodSesuaiDaftar(sb, true).catch(function () { return null; })]);
    var r = h[0];
    if (!r || !r.ok) gagal.push('ajuan toko');
    else {
      (r.tunggu || []).forEach(function (x) {
        masuk('toko|' + x.toko, x.toko, 'toko', { no: x.no, t: x.waktu, k: x.k, n: x.n, w: x.w, sis: x.sistem, hit: x.fisik, sel: x.selisih, al: x.alasan, pg: x.pengaju });
      });
      (r.putus || []).forEach(function (x) {
        riwayat.push({ dari: x.toko, n: x.n, w: x.w, sel: x.selisih, st: x.status, tk: x.putus, pg: x.pengaju, cat: x.catatan, u: MD_jamUrut_(x.putus) });
      });
    }
    r = h[1];
    if (!r || !r.ok) gagal.push('ajuan staf produksi');
    else {
      (r.list || []).forEach(function (x) {
        var bbk = /bahan baku/i.test(s(x.bg)), nama = bbk ? 'Staf produksi bahan baku' : 'Staf produksi';
        if (x.st === 'Menunggu') {
          masuk(bbk ? 'bbk' : 'prod', nama, 'prod', { no: x.no, t: x.t, k: x.k, n: x.n, w: x.w, sis: x.sis, hit: x.hit, sel: x.sel, al: x.al, pg: x.pg, bg: x.bg });
        } else if (riwayat.length < 200) {
          riwayat.push({ dari: nama, n: x.n, w: x.w, sel: x.sel, st: x.st, tk: x.tk, pg: x.pg, cat: x.cat, u: MD_jamUrut_(x.tk) });
        }
      });
    }
    riwayat.sort(function (a, b) { return a.u < b.u ? 1 : a.u > b.u ? -1 : 0; });
    var n = 0;
    grup.forEach(function (g) { n += g.items.length; });
    var out = { ok: true, grup: grup, menunggu: n, riwayat: riwayat.slice(0, 25), gagal: gagal, diperbarui: fmt(new Date(), 'dd/MM/yyyy HH:mm') };
    // file 13 lalu file 15: ajuan bagian Gudang, lalu Kantor Packing, dipisah ke grup sendiri di belakang.
    [['Gudang', { id: 'gudang', n: 'Staf gudang utama', jenis: 'prod', items: [] }],
     ['Kantor Packing', { id: 'kantorpacking', n: 'Staf Kantor Packing (hitung stok online)', jenis: 'prod', items: [] }]].forEach(function (z) {
      var g2 = z[1];
      out.grup.forEach(function (g) {
        if (g.jenis !== 'prod') return;
        g.items = g.items.filter(function (it) { if (it.bg === z[0]) { g2.items.push(it); return false; } return true; });
      });
      out.grup = out.grup.filter(function (g) { return g.items.length; });
      if (g2.items.length) out.grup.push(g2);
    });
    return out;
  }

  // ---- pgsTanpaData (file 43): pembelian tanpa pengajuan, terbaru di atas ----
  async function pgsTanpaData(sb) {
    var rows = await semua(sb, 'pembelian_tanpa_ajuan', 'no,waktu,bagian,form,kode,nama_barang,qty,satuan,harga,alasan,pengisi,ref,status,dicek_oleh,waktu_cek');
    var t = function (v, n) { return s(v).replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n); };
    var jam = function (v) { var d = waktu(v); return d ? fmt(d, 'dd/MM/yyyy HH:mm') : ''; };
    var list = rows.map(function (r, i) {
      return { baris: i + 2, no: t(r.no, 30), wk: jam(r.waktu), bg: t(r.bagian, 40), form: t(r.form, 80), k: t(r.kode, 40), n: t(r.nama_barang, 120),
        q: Number(r.qty) || 0, s: t(r.satuan, 15), h: Number(r.harga) || 0, al: t(r.alasan, 200), pg: t(r.pengisi, 60), ref: t(r.ref, 60),
        st: t(r.status, 20) || 'Belum dicek', oleh: t(r.dicek_oleh, 60), wc: jam(r.waktu_cek) };
    }).filter(function (x) { return x.no; }).reverse();
    return { ok: true, baru: list.filter(function (x) { return x.st !== 'Sudah dicek'; }).length, list: list.slice(0, 60) };
  }


  // ======================= GUDANG UTAMA & PURCHASING (file 12 gdPemilikData + bungkus GD_online_ file 14/15/36, GD_hpp_ file 15/61) =======================
  async function gdPemilikData(sb, bulan) {
    var h = await Promise.all([bahanHpp(sb), window.KantorPacking.siap(sb), window.Lembar.muat(sb, TABEL_MP),
      sb.from('hasil_hitung').select('data').eq('kunci', 'md:gudang').maybeSingle()]);
    var H = h[0], A = h[1].A, LM = h[2], lama = h[3] && h[3].data ? h[3].data.data : null, G = H.G, L = H.L;
    var hariIni = fmt(new Date(), 'yyyy-MM-dd');
    if (!/^\d{4}-\d{2}$/.test(String(bulan || ''))) bulan = hariIni.slice(0, 7);
    var brg = G.barang(), log = H.log, po = G.po();
    G.isiTerima(po, log);
    var masukProd = G.salurTunggu(log), stok = G.stok(log);
    // GD_hpp_: perPo dari rumus dasar, akhir dari rumus berlapis (file 15 + 61).
    var perPo = [];
    po.list.slice().sort(function (a, b) { return a.t < b.t ? -1 : a.t > b.t ? 1 : a.ms - b.ms; }).forEach(function (o) {
      if (o.st === 'Ditolak' || o.st === 'Batal' || !o.items.length) return;
      var barang = 0, biaya = 0;
      o.items.forEach(function (it) { barang += it.s; }); o.biaya.forEach(function (b) { biaya += b.v; });
      perPo.push({ no: o.no, t: o.t, sup: o.sup, asal: o.asal, barang: barang, biaya: biaya, items: o.items.map(function (it) {
        var bagian = barang > 0 ? biaya * it.s / barang : 0;
        return { k: it.k, n: it.n, w: it.w, q: it.q, h: it.h, hpp: it.q > 0 ? Math.round(it.h + bagian / it.q) : it.h };
      }) });
    });
    perPo.reverse();
    var akhir = H.akhirPo(po);
    // GD_online_: jumlah dari kp.js, HPP / harga jual / catatan seperti Apps Script.
    var onl = {};
    window.Lembar.baca(L, 'online_stok_awal', 9).forEach(function (r) {
      var k = rlTeks_(r[0]).slice(0, 30).toUpperCase(); if (!k) return;
      var x = onl[k] || (onl[k] = { hpp: 0, hj: 0, c: '' }), hp = Number(r[5]), hj = Number(r[6]);
      if (!x.hpp && isFinite(hp) && hp > 0) x.hpp = hp;
      if (!x.hj && isFinite(hj) && hj > 0) x.hj = hj;
      var c = MP_t_(r[8], 200).replace(/\s+/g, ' ');
      if (c) x.c = x.c ? x.c + '; ' + c : c;
    });
    var bOf = function (k) { return brg.idx[k] !== undefined ? brg.list[brg.idx[k]] : null; };
    var list = A.on.list.map(function (y) {
      var x = { k: y.k, n: y.n, kat: y.kat, awal: y.awal, kirim: y.kirim, q: y.q, hpp: 0, hj: 0, hs: '', hjs: '', t: y.t || '', c: '' }, b = bOf(y.k), o = onl[y.k];
      if (y.sesuai !== undefined) x.sesuai = y.sesuai;
      if (y.jualMp !== undefined) x.jualMp = y.jualMp;
      if (o) {
        if (o.hpp) { x.hpp = o.hpp; x.hs = 'awal'; }
        if (o.hj) { x.hj = o.hj; x.hjs = 'online'; }
        x.c = o.c;
        if (!x.hpp && akhir[y.k] && akhir[y.k].hpp) { x.hpp = akhir[y.k].hpp; x.hs = 'po'; }
        if (!x.hj && b && b.h) { x.hj = b.h; x.hjs = 'order'; }
      } else if (y.awal || y.kirim) {
        if (akhir[y.k] && akhir[y.k].hpp) { x.hpp = akhir[y.k].hpp; x.hs = 'po'; }
        if (b && b.h) { x.hj = b.h; x.hjs = 'order'; }
      } else {
        x.hpp = akhir[y.k] && akhir[y.k].hpp ? akhir[y.k].hpp : 0; x.hs = akhir[y.k] ? 'po' : '';
        x.hj = b ? b.h : 0; x.hjs = b ? 'order' : '';
      }
      var e = H.kini(y.k); if (e && e !== x.hpp) { x.hpp = e; x.hs = 'edit'; }
      return x;
    });
    var tot = { pcs: 0, hpp: 0, jual: 0, tanpaHpp: 0, tanpaHarga: 0, minus: 0, barang: 0, kirim: 0, sesuai: 0, jualMp: 0 };
    list.forEach(function (x) {
      tot.pcs += x.q; tot.kirim += x.kirim; tot.sesuai += x.sesuai || 0; tot.jualMp += x.jualMp || 0;
      if (x.q) tot.barang++;
      if (x.q < 0) tot.minus++;
      if (x.q > 0) { tot.hpp += x.q * x.hpp; tot.jual += x.q * x.hj; if (!x.hpp) tot.tanpaHpp++; if (!x.hj) tot.tanpaHarga++; }
    });
    // MP_potongOnline_: ringkasan potongan penjualan marketplace Official.
    var aktifT = lama && lama.online && lama.online.mp ? lama.online.mp.aktif : '';
    var mp = { aktif: aktifT || '', pcs: 0, belum: 0, hari: {}, belumHari: {} };
    if (aktifT) {
      var m = aktifT.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/), aktifMs = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) - 7 * 3600000;
      var B = MP_barang_(LM), P = MP_padananFn_(LM, B), batas = {}, umum = A.on.mulai ? A.on.mulai + ' 00:00' : '';
      A.on.list.forEach(function (x) { if (x.t) batas[x.k] = x.t + ' 00:00'; });
      A.pss.forEach(function (x) {
        if (x.bg !== 'Kantor Packing' || x.st !== 'Disetujui' || !x.wk || !x.wa || !x.k) return;
        if (x.wk.getTime() >= aktifMs) return;
        var t = new Date(x.wa.getTime() + 7 * 3600000).toISOString().slice(0, 16).replace('T', ' ');
        if (!batas[x.k] || t > batas[x.k]) batas[x.k] = t;
      });
      MP_bacaPsn_(LM).forEach(function (x) {
        if (x.toko !== MP_TOKO_POTONG_ || x.batal || x.belum || !x.kirim) return;
        var q = x.q - x.ret; if (!(q > 0)) return;
        var pm = P(x.nm, x.vr, x.ha), tgl = x.kirim.slice(0, 10);
        if (!pm.k || pm.k === '-' || pm.st !== 'Dikonfirmasi') {
          if (pm.k !== '-') { mp.belum += q; mp.belumHari[tgl] = (mp.belumHari[tgl] || 0) + q; }
          return;
        }
        var kk = pm.k === 'M02D5' ? 'M02' : (pm.k === 'M03D5' ? 'M03' : pm.k), c = batas[kk] || umum;
        if (c && x.kirim < c) return;
        mp.hari[tgl] = (mp.hari[tgl] || 0) + q; mp.pcs += q;
      });
    }
    var online = { list: list, tot: tot, mulai: A.on.mulai, ada: true, mp: mp };
    // Stok gudang per barang.
    var hppAwal = {};
    list.forEach(function (x) { if (x.hs === 'awal') hppAwal[x.k] = x.hpp; });
    var perBarang = {};
    Object.keys(stok).forEach(function (key) {
      var k = key.split('|')[0], w = key.slice(k.length + 1);
      if (!perBarang[k]) perBarang[k] = { q: 0, w: [] };
      perBarang[k].q += stok[key];
      if (w) perBarang[k].w.push({ w: w, q: stok[key] });
    });
    var stokList = [], nilaiJual = 0, nilaiHpp = 0, tanpaHpp = 0;
    brg.list.forEach(function (b) {
      var st = perBarang[b.k]; if (!st) return;
      var hp = akhir[b.k] ? akhir[b.k].hpp : (hppAwal[b.k] || 0), hs = akhir[b.k] ? 'po' : (hppAwal[b.k] ? 'awal' : '');
      nilaiJual += st.q * b.h;
      if (hp) nilaiHpp += st.q * hp; else if (st.q > 0) tanpaHpp++;
      stokList.push({ k: b.k, n: b.n, kat: b.kat, q: st.q, w: st.w, hj: b.h, hpp: hp, hs: hs });
    });
    Object.keys(perBarang).forEach(function (k) {
      if (brg.idx[k] === undefined) stokList.push({ k: k, n: k + ' (tidak ada di BARANG_ORDER)', kat: 'Lainnya', q: perBarang[k].q, w: perBarang[k].w, hj: 0, hpp: 0 });
    });
    // GD_tindak_
    var STAF = { 'ShopeePay': true, 'Kas Tunai': true };
    var tindak = { setuju: 0, bayar: 0, biaya: 0, jalan: 0, prod: masukProd.length, nilaiBayar: 0, nilaiBiaya: 0 };
    po.list.forEach(function (o) {
      if (o.st === 'Menunggu persetujuan') tindak.setuju++;
      if (o.st === 'Ditolak' || o.st === 'Batal') return;
      if (!STAF[o.bayar] && !o.wb && o.st !== 'Menunggu persetujuan') { tindak.bayar++; tindak.nilaiBayar += o.tot; }
      if (o.st === 'Dikirim supplier') tindak.jalan++;
      o.biaya.forEach(function (b) { if (b.sb !== 'Dibayar') { tindak.biaya++; tindak.nilaiBiaya += b.v; } });
    });
    var poOut = po.list.slice().sort(function (a, b) { return a.t < b.t ? 1 : a.t > b.t ? -1 : b.ms - a.ms; }).slice(0, 300).map(G.poKeluar);
    return {
      ok: true, hariIni: hariIni, bulan: bulan, po: poOut, tindak: tindak,
      stok: stokList, nilai: { jual: nilaiJual, hpp: nilaiHpp, tanpaHpp: tanpaHpp },
      hpp: { perPo: perPo.slice(0, 60), akhir: Object.keys(akhir).map(function (k) { var x = akhir[k]; return { k: k, n: x.n, hpp: x.hpp, h: x.h, t: x.t, no: x.no, sup: x.sup }; }) },
      laporan: gdLaporan(po, bulan), masukProd: masukProd, online: online,
      riwayat: G.riwayat(log, 60), linkStaf: lama && lama.linkStaf ? lama.linkStaf : ''
    };
  }
  // GD_laporan_ (file 12): laporan pembelian satu bulan.
  function gdLaporan(po, bulan) {
    var out = { bulan: bulan, n: 0, barang: 0, biaya: 0, sup: [], brg: [], naik: [] }, sup = {}, brg = {}, akhirHarga = {};
    po.list.slice().sort(function (a, b) { return a.t < b.t ? -1 : a.t > b.t ? 1 : a.ms - b.ms; }).forEach(function (o) {
      if (o.st === 'Ditolak' || o.st === 'Batal') return;
      var ini = o.t.slice(0, 7) === bulan;
      if (ini) {
        var biaya = 0; o.biaya.forEach(function (b) { biaya += b.v; });
        out.n++; out.barang += o.tot; out.biaya += biaya;
        if (!sup[o.sup]) sup[o.sup] = { n: o.sup, asal: o.asal, po: 0, tot: 0, biaya: 0 };
        sup[o.sup].po++; sup[o.sup].tot += o.tot; sup[o.sup].biaya += biaya;
      }
      o.items.forEach(function (it) {
        var key = it.k + '|' + it.w;
        if (ini) {
          if (!brg[key]) brg[key] = { k: it.k, n: it.n, w: it.w, q: 0, tot: 0 };
          brg[key].q += it.q; brg[key].tot += it.s;
          var lalu = akhirHarga[it.k];
          if (lalu && lalu.no !== o.no && lalu.h > 0 && it.h !== lalu.h) out.naik.push({ k: it.k, n: it.n, w: it.w, dulu: lalu.h, kini: it.h, pc: Math.round((it.h - lalu.h) / lalu.h * 1000) / 10, tDulu: lalu.t, t: o.t, sup: o.sup });
        }
        akhirHarga[it.k] = { h: it.h, t: o.t, no: o.no };
      });
    });
    out.sup = Object.keys(sup).map(function (k) { return sup[k]; }).sort(function (a, b) { return b.tot - a.tot; });
    out.brg = Object.keys(brg).map(function (k) { return brg[k]; }).sort(function (a, b) { return b.tot - a.tot; });
    out.naik.sort(function (a, b) { return Math.abs(b.pc) - Math.abs(a.pc); });
    return out;
  }
  async function beliLalu(sb, bulan) {
    var H = await bahanHpp(sb), G = H.G, po = G.po();
    G.isiTerima(po, H.log);
    return { ok: true, bulan: bulan, laporan: gdLaporan(po, bulan) };
  }


  // ======================= DAFTAR BARANG (file 15 mdeData) =======================
  async function mdeData(sb) {
    var h = await Promise.all([bahanHpp(sb), window.Lembar.muat(sb, ['katalog']),
      semua(sb, 'md_ubah_log', 'no,waktu,jenis,kode,nama_barang,lokasi,warna,lama,baru,berlaku_mulai,alasan,oleh'),
      sb.from('pelanggan').select('nama_pelanggan,tipe,baris_sheet,id').order('baris_sheet', { ascending: true, nullsFirst: false }).order('id')]);
    var H = h[0], brg = H.G.barang(), hpp = {};
    try { hpp = H.peta(); } catch (e) { }
    var katalog = {}, online = {};
    window.Lembar.baca(h[1], 'katalog', 2).forEach(function (r) { var k = String(r[0]).trim().toUpperCase(); if (k) katalog[k] = true; });
    window.Lembar.baca(H.L, 'online_stok_awal', 1).forEach(function (r) { var k = rlTeks_(r[0]).slice(0, 30).toUpperCase(); if (k) online[k] = true; });
    var kat = [], adaKat = {};
    var barang = brg.list.map(function (b) {
      if (!adaKat[b.kat]) { adaKat[b.kat] = true; kat.push(b.kat); }
      return { k: b.k, n: b.n, kat: b.kat, w: b.w, hj: b.h, hpp: hpp[b.k] || 0, ed: H.RW[b.k] ? 1 : 0, kt: katalog[b.k] ? 1 : 0, on: online[b.k] ? 1 : 0 };
    });
    var R = function (v, n) { return String(v === null || v === undefined ? '' : v).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n); };
    var angka = function (v) { if (v === null || v === undefined || v === '') return ''; var x = Number(v); return isFinite(x) && String(v).trim() !== '' && !isNaN(x) ? x : v; };
    var log = [];
    h[2].forEach(function (r) {
      var no = R(r.no, 30); if (!no) return;
      var w = waktu(r.waktu);
      log.push({ no: no, wk: w ? fmt(w, 'dd/MM/yyyy HH:mm') : '', j: R(r.jenis, 30), k: R(r.kode, 30).toUpperCase(), n: R(r.nama_barang, 120), lok: R(r.lokasi, 60), w: R(r.warna, 60),
        lama: angka(r.lama), baru: angka(r.baru), b: tglIso(r.berlaku_mulai) || R(r.berlaku_mulai, 10), al: R(r.alasan, 300), oleh: R(r.oleh, 60) });
    });
    log = log.reverse().slice(0, 400);
    var lokasi = [{ id: 'prod', n: 'Gudang produksi', warna: true }, { id: 'gudang', n: 'Gudang utama', warna: true }, { id: 'kp', n: 'Kantor Packing (stok online)', warna: false }], ada = {}, i = 0;
    ((h[3] && h[3].data) || []).forEach(function (r) {
      var n = String(r.nama_pelanggan || '').trim();
      if (!n || String(r.tipe || '').trim() !== 'Consignment' || ada[n]) return;
      ada[n] = true; lokasi.push({ id: 't' + (i++), n: n, warna: true, toko: true });
    });
    return { ok: true, barang: barang, kategori: kat, lokasi: lokasi, log: log, hariIni: fmt(new Date(), 'yyyy-MM-dd') };
  }

  window.MdLama = { mdSetujuData: mdSetujuData, pgsTanpaData: pgsTanpaData, mpRingkasOfficial: mpRingkasOfficial, mpData: mpData, gdRingkas: gdRingkas, bahanHpp: bahanHpp, mdRingkasan: mdRingkasan, hargaBahanBakuMaster: hargaBahanBakuMaster, hrgNaikData: hrgNaikData, pinjamPemilik: pinjamPemilik, sesuaiPemilik: sesuaiPemilik, rpPantau: rpPantau, rpDaftar: rpDaftar, gdPemilikData: gdPemilikData, beliLalu: beliLalu, mdeData: mdeData, mpPsn: async function (sb) { return MP_bacaPsn_(await window.Lembar.muat(sb, TABEL_MP)); } };
})();
