/* Robot purchasing (Master Data > Pengadaan) dihitung langsung dari Supabase (1 Nov 2026).
 * Salinan pgdData + PGD_analisa_ (Apps Script file 17) beserta bungkusnya (file 43: link staf disembunyikan,
 * file 48/49: tanda impor, file 55/56: warna pengajuan). Bagian-bagiannya memakai rumus yang sudah dipindah:
 *   stok gudang & PO     : gudang.js (lewat MdLama.bahanHpp, termasuk HPP berlapis DS_hpp_)
 *   stok Kantor Packing  : kp.js (GD_online_)
 *   stok toko            : rpc toko_stok_hitung (stokToko_)
 *   bahan baku           : bahanbaku.js (BBK_beli_ / BBK_log_ / BBK_stok_)
 *   botol & stiker       : produksi.js (STM_hitungBarang_)
 *   pengajuan            : pengadaan.js (PGD_ajuan_ + warna + tanda impor)
 * Butuh: lembar.js, gudang.js, kp.js, produksi.js, bahanbaku.js, pengadaan.js, md.js.
 */
(function () {
  'use strict';
  var KEL = ['Barang jualan', 'Bahan baku', 'Botol & stiker', 'Packaging & lainnya'];
  var BAGIAN = ['Produksi', 'Bahan Baku', 'Gudang', 'Kantor Packing', 'Purchasing', 'Toko', 'Lainnya'];
  var ST = { TUNGGU: 'Menunggu', SETUJU: 'Disetujui', TOLAK: 'Ditolak', PESAN: 'Dipesan', TERIMA: 'Diterima', BATAL: 'Batal' };
  function rapi(v, n) { return String(v === null || v === undefined ? '' : v).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n || 200); }
  function fmtF(n) { var r = Math.round(n * 100) / 100; return String(r).replace('.', ','); }
  function bulat(n, d) { var f = Math.pow(10, d === undefined ? 1 : d); return Math.round(n * f) / f; }
  function hari(a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000); }
  function geser(t, h) { return new Date(Date.parse(t + 'T00:00:00Z') + h * 86400000).toISOString().slice(0, 10); }
  function tgl(v) { if (v instanceof Date) return window.Lembar.format(v, 'yyyy-MM-dd'); var s = rapi(v, 10); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''; }
  function kodeDasar(k) { return String(k).trim().toUpperCase().split('-')[0]; }
  function bawaan(kel, k, asal) {
    if (kel === 'Barang jualan') return /lokal/i.test(asal || '') ? { lead: 5, cad: 7, siklus: 14, sumber: 'lokal' } : { lead: 105, cad: 7, siklus: 30, sumber: 'impor' };
    if (kel === 'Botol & stiker') return /^(BT2|BT3)$/.test(k) ? { lead: 90, cad: 7, siklus: 30, sumber: 'impor Cina' } : { lead: 4, cad: 7, siklus: 14, sumber: 'lokal' };
    return { lead: 5, cad: 7, siklus: 14, sumber: 'lokal' };
  }
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

  async function pgdData(sb) {
    var B = window.BahanBaku, P = window.Produksi;
    var TBL = ['order_log', 'pengadaan_ajuan', 'bahan', 'bahan_masuk', 'bahan_log', 'bahan_rusak'];
    var pel = await sb.from('pelanggan').select('nama_pelanggan,tipe,baris_sheet,id').order('baris_sheet', { ascending: true, nullsFirst: false }).order('id');
    var toko = [], adaToko = {};
    (pel.data || []).forEach(function (r) {
      var n = String(r.nama_pelanggan || '').trim();
      if (!n || String(r.tipe || '').trim() !== 'Consignment' || adaToko[n]) return;
      adaToko[n] = true; toko.push(n);
    });
    var h = await Promise.all([
      window.MdLama.bahanHpp(sb),
      window.KantorPacking.siap(sb),
      window.Lembar.muat(sb, TBL.concat(B.TABEL.filter(function (t) { return TBL.indexOf(t) === -1; }))),
      semua(sb, 'toko_jual_log', 'id,baris_sheet,tanggal,kode,qty_terjual'),
      semua(sb, 'acc_log', 'id,baris_sheet,tanggal,kategori,keterangan,nominal,status'),
      semua(sb, 'pengadaan_setelan', 'id,baris_sheet,kode,waktu_tunggu,stok_cadangan,beli_untuk,catatan'),
      Promise.all(toko.map(function (n) { return sb.rpc('toko_stok_hitung', { p_toko: n }); })),
      sb.from('hasil_hitung').select('data').eq('kunci', 'md:pengadaan').maybeSingle()
    ]);
    var H = h[0], A = h[1].A, L = h[2], lama = h[7] && h[7].data ? h[7].data.data : null;
    var BB = B.buat(L), PR = P.buat(L), PG = window.Pengadaan.buat(L);
    var hariIni = window.Lembar.format(new Date(), 'yyyy-MM-dd');
    var dari90 = geser(hariIni, -89), dari30 = geser(hariIni, -29);
    // PGD_setelan_
    var set = {};
    h[5].forEach(function (r) {
      var k = rapi(r.kode, 60).toUpperCase(); if (!k) return;
      var n = function (v) { if (v === null || v === undefined || v === '') return null; var x = Number(v); return (!isFinite(x) || x < 0) ? null : x; };
      set[k] = { lead: n(r.waktu_tunggu), cad: n(r.stok_cadangan), siklus: n(r.beli_untuk), c: rapi(r.catatan, 200) };
    });
    var ajuanSemua = PG.ajuan(), gagal = [], items = [];
    var tambahPakai = function (map, k, t, q) {
      if (!k || !t || !q || t < dari90 || t > hariIni) return;
      if (!map[k]) map[k] = { q30: 0, q90: 0 };
      map[k].q90 += q;
      if (t >= dari30) map[k].q30 += q;
    };
    var awalData = {};
    var catatAwal = function (kel, t) { if (t && (!awalData[kel] || t < awalData[kel])) awalData[kel] = t; };
    var coba = function (judul, kerja) { try { kerja(); } catch (err) { gagal.push(judul + ': ' + (err && err.message ? err.message : err)); } };
    var pesanAjuan = {};
    ajuanSemua.forEach(function (a) { if (a.st === ST.PESAN && a.k) pesanAjuan[a.kel + '|' + a.k] = (pesanAjuan[a.kel + '|' + a.k] || 0) + (a.qs !== null ? a.qs : a.q); });

    // A. Barang jualan
    coba('Barang jualan', function () {
      var G = H.G, brg = G.barang(), log = H.log, produksi = {};
      try { produksi = BB.bbk.katalog(); } catch (e) { produksi = {}; }
      var stok = {}, tambahStok = function (k, q) { if (k && q) stok[k] = (stok[k] || 0) + q; };
      var gs = G.stok(log);
      Object.keys(gs).forEach(function (key) { tambahStok(key.split('|')[0], gs[key]); });
      A.on.list.forEach(function (x) { tambahStok(x.k, x.q); });
      h[6].forEach(function (r) { if (r.error) { gagal.push('Stok toko: ' + r.error.message); return; } (r.data || []).forEach(function (x) { if (x.kode) tambahStok(x.kode, Number(x.qty) || 0); }); });
      var transit = {}, asal = {}, harga = {}, po = null;
      try { po = G.po(); G.isiTerima(po, log); } catch (e) { po = null; }
      if (po) {
        po.list.slice().sort(function (a, b) { return a.t < b.t ? -1 : 1; }).forEach(function (o) {
          o.items.forEach(function (it) { asal[it.k] = o.asal; if (it.h) harga[it.k] = it.h; });
          if (o.st === 'Ditolak' || o.st === 'Batal' || o.st === 'Selesai') return;
          o.items.forEach(function (it) { var s = Math.max(0, it.q - it.d); if (s) transit[it.k] = (transit[it.k] || 0) + s; });
        });
      }
      var hpp = {};
      try { hpp = H.peta(); } catch (e) { hpp = {}; }
      var pakai = {};
      h[3].forEach(function (r) { var t = tgl(r.tanggal); catatAwal('Barang jualan', t); tambahPakai(pakai, kodeDasar(r.kode === null ? '' : r.kode), t, Number(r.qty_terjual) || 0); });
      window.Lembar.baca(L, 'order_log', 13).forEach(function (r) {
        if (!/resel|putus/i.test(String(r[3])) || !/^(Dikirim|Selesai)$/.test(String(r[12]).trim())) return;
        tambahPakai(pakai, kodeDasar(r[4]), tgl(r[1]), Number(r[6]) || 0);
      });
      log.forEach(function (x) { if (/^keluar/i.test(x.j) && x.st === 'Kantor Packing') { catatAwal('Barang jualan', x.t); tambahPakai(pakai, x.k, x.t, x.q); } });
      brg.list.forEach(function (b) {
        if (produksi[b.k]) return;
        items.push({ kel: 'Barang jualan', k: b.k, n: b.n, kat: b.kat, s: 'pcs', stok: stok[b.k] || 0, transit: transit[b.k] || 0, p: pakai[b.k] || null, h: harga[b.k] || hpp[b.k] || 0, asal: asal[b.k] || '' });
      });
    });

    // B. Bahan baku
    coba('Bahan baku', function () {
      var bulan = hariIni.slice(0, 7), beli = BB.bbk.beli(), log = BB.bbk.log(), stok = BB.bbk.stok(bulan, beli, log);
      var transit = {}, harga = {}, pakai = {};
      beli.forEach(function (x) { if (x.st === 'Dipesan') transit[x.k] = (transit[x.k] || 0) + x.q; if (x.hs) harga[x.k] = x.hs; });
      log.forEach(function (x) { catatAwal('Bahan baku', x.t); if (x.j === 'Terpakai' || x.j === 'Rusak') tambahPakai(pakai, x.k, x.t, x.q); });
      stok.forEach(function (b) { items.push({ kel: 'Bahan baku', k: b.k, n: b.n, kat: b.kel, s: b.s || 'kg', stok: b.ss || 0, transit: transit[b.k] || 0, p: pakai[b.k] || null, h: harga[b.k] || 0, min: b.min }); });
    });

    // C. Botol & stiker
    coba('Botol & stiker', function () {
      var d = PR.stokBahan(), kunci = PR.kunci, pakai = {}, harga = {};
      PR.catatan('bahan_log').forEach(function (x) { catatAwal('Botol & stiker', x.t); tambahPakai(pakai, kunci(x.n), x.t, x.q); });
      PR.catatan('bahan_rusak').forEach(function (x) { tambahPakai(pakai, kunci(x.n), x.t, x.q); });
      window.Lembar.baca(L, 'bahan_masuk', 8).forEach(function (r) { var q = Number(r[3]), hg = Number(r[7]); if (q > 0 && hg > 0) harga[kunci(r[2])] = Math.round(hg / q); });
      d.barang.forEach(function (b) {
        var k = (b.k || b.n).toUpperCase();
        items.push({ kel: 'Botol & stiker', k: k, n: b.n, kat: b.j, s: 'pcs', stok: b.ss || 0, transit: pesanAjuan['Botol & stiker|' + k] || 0, p: pakai[kunci(b.n)] || null, h: harga[kunci(b.n)] || 0, min: b.min });
      });
    });

    // Status
    items.forEach(function (x) {
      var st = set[x.k] || {}, df = bawaan(x.kel, x.k, x.asal);
      x.lead = st.lead !== null && st.lead !== undefined ? st.lead : df.lead;
      x.cad = st.cad !== null && st.cad !== undefined ? st.cad : df.cad;
      x.siklus = st.siklus !== null && st.siklus !== undefined ? st.siklus : df.siklus;
      x.sumber = st.lead !== null && st.lead !== undefined ? 'setelan' : df.sumber;
      var mulai = awalData[x.kel] && awalData[x.kel] > dari90 ? awalData[x.kel] : dari90;
      var hariData = Math.max(1, Math.min(90, hari(mulai, hariIni) + 1));
      var p = x.p || { q30: 0, q90: 0 }, h30 = Math.min(30, hariData), r30 = p.q30 / h30, r90 = p.q90 / hariData;
      x.q30 = bulat(p.q30, 2); x.q90 = bulat(p.q90, 2); x.hariData = hariData;
      var rata = Math.max(r30, r90);
      if (hariData >= 60 && r90 > 0) rata = Math.min(rata, r90 * 1.5);
      x.rata = bulat(rata, 3);
      var ada = x.stok + x.transit;
      x.hari = rata > 0 ? Math.floor(Math.max(0, ada) / rata) : null;
      x.hariStok = rata > 0 ? Math.floor(Math.max(0, x.stok) / rata) : null;
      var target = rata * (x.lead + x.cad + x.siklus);
      x.saran = rata > 0 ? Math.max(0, Math.ceil(target - ada)) : 0;
      x.maks = Math.ceil(target);
      x.ket = [];
      if (rata <= 0) {
        x.st = x.stok <= 0 && x.transit <= 0 ? 'Tanpa data' : 'Tidak bergerak';
        if (x.stok > 0) x.ket.push('Belum ada penjualan/pemakaian tercatat dalam ' + hariData + ' hari terakhir.');
      } else if (x.hariStok < x.lead && x.hari < x.lead + x.cad) {
        x.st = 'Kritis';
        x.ket.push('Stok habis sekitar ' + x.hari + ' hari lagi, padahal waktu tunggu barang ' + x.lead + ' hari.');
      } else if (x.hari <= x.lead + x.cad) {
        x.st = 'Saatnya pesan';
        x.ket.push('Stok + dalam perjalanan cukup ' + x.hari + ' hari, sudah masuk batas pesan (' + (x.lead + x.cad) + ' hari).');
      } else if (x.hari > x.lead + x.cad + x.siklus * 3) {
        x.st = 'Berlebih';
        x.ket.push('Stok + dalam perjalanan cukup ' + x.hari + ' hari, jauh di atas kebutuhan (' + (x.lead + x.cad + x.siklus) + ' hari).');
      } else {
        x.st = 'Aman';
        x.ket.push('Cukup ' + x.hari + ' hari. Pesan lagi sekitar ' + geser(hariIni, Math.max(0, x.hari - x.lead - x.cad)).split('-').reverse().join('/') + '.');
      }
      if (x.transit > 0) x.ket.push('Ada ' + fmtF(x.transit) + ' ' + x.s + ' dalam perjalanan (sudah dipesan, belum diterima).');
      if (hariData < 14) x.ket.push('Data pemakaian baru ' + hariData + ' hari, hitungan masih kasar.');
      if (x.kel === 'Barang jualan') x.ket.push('Penjualan online dihitung dari kiriman gudang ke Kantor Packing.');
      x.nilai = Math.round(x.saran * (x.h || 0));
      delete x.p;
    });
    var urut = { 'Kritis': 0, 'Saatnya pesan': 1, 'Berlebih': 2, 'Aman': 3, 'Tidak bergerak': 4, 'Tanpa data': 5 };
    items.sort(function (a, b) { return (urut[a.st] - urut[b.st]) || ((a.hari === null ? 1e9 : a.hari) - (b.hari === null ? 1e9 : b.hari)) || (a.n < b.n ? -1 : 1); });

    // pgdData
    var ajuan = PG.pgdAjuan().a, bulan = hariIni.slice(0, 7), pakaiAngg = {};
    ajuan.forEach(function (x) {
      if (x.wp && (x.st === ST.SETUJU || x.st === ST.PESAN || x.st === ST.TERIMA) && x.t.slice(0, 7) === bulan) {
        pakaiAngg[x.kel] = (pakaiAngg[x.kel] || 0) + Math.round((x.qs !== null ? x.qs : x.q) * (x.h || 0));
      }
    });
    var ring = { Kritis: 0, 'Saatnya pesan': 0, Berlebih: 0, nilaiSaran: 0 };
    items.forEach(function (x) { if (ring[x.st] !== undefined) ring[x.st]++; if (x.st === 'Kritis' || x.st === 'Saatnya pesan') ring.nilaiSaran += x.nilai; });
    // PGD_belanjaKemasan_
    var kemasan = { q30: 0, q90: 0, akhir: [] };
    h[4].forEach(function (r) {
      if (!/kemasan|packaging|kardus/i.test(String(r.kategori || '')) || /batal/i.test(String(r.status || ''))) return;
      var t = tgl(r.tanggal), v = Number(r.nominal) || 0;
      if (!t || t < dari90) return;
      kemasan.q90 += v; if (t >= dari30) kemasan.q30 += v;
      kemasan.akhir.push({ t: t, ket: rapi(r.keterangan, 120), v: v });
    });
    kemasan.akhir.sort(function (a, b) { return a.t < b.t ? 1 : -1; });
    kemasan.akhir = kemasan.akhir.slice(0, 40);
    return {
      ok: true, peran: 'pemilik', hariIni: hariIni, items: items, gagal: gagal, ajuan: ajuan, kel: KEL, bagian: BAGIAN,
      tunggu: ajuan.filter(function (x) { return x.st === ST.TUNGGU; }).length,
      angg: (lama && lama.angg) || {}, pakaiAngg: pakaiAngg, ring: ring, kemasan: kemasan,
      link: lama && lama.link ? lama.link : null, langsung: true
    };
  }

  window.RobotBeli = { pgdData: pgdData };
})();
