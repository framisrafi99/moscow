/*
 * Moscow Supplies - Master Data lama: order & omzet toko (4 Nov 2026), dihitung dari Supabase.
 *   ambilOrder  (Apps Script file 0): order semua pelanggan pada periode (kumpulOrder_, paling banyak 300)
 *   omzetKotor  (file 5)            : omzet consignment (laporanToko_) + order reseller selain Batal
 *   pieToko     (file 3)            : penjualan satu toko per kode dasar
 *   laporanToko (file 0)            : penjualan, biaya, return satu toko + stok (toko_stok_hitung) + hitung per warna (toko_hitung_warna)
 * Butuh: lembar.js, gudang.js.
 */
(function () {
  'use strict';
  function s(v) { return String(v === null || v === undefined ? '' : v); }
  function fmt(d, p) { return window.Lembar.format(d, p); }
  function kodeDasar(k) { return s(k).trim().toUpperCase().split('-')[0]; }
  function salahPeriode(dari, sampai) {
    var re = /^\d{4}-\d{2}-\d{2}$/;
    if (!re.test(dari) || !re.test(sampai)) return 'Tanggal tidak valid.';
    if (dari > sampai) return 'Tanggal awal harus sebelum tanggal akhir.';
    return '';
  }
  async function semua(sb, buat) {
    var out = [], dari = 0, n = 1000;
    for (;;) {
      var r = await buat().order('baris_sheet', { ascending: true, nullsFirst: false }).order('id').range(dari, dari + n - 1);
      if (r.error) throw new Error(r.error.message);
      out = out.concat(r.data || []);
      if (!r.data || r.data.length < n) return out;
      dari += n;
    }
  }
  // bacaPelanggan_ (file 0)
  async function pelanggan(sb) {
    var r = await semua(sb, function () { return sb.from('pelanggan').select('nama_pelanggan,tipe,id,baris_sheet'); });
    return r.map(function (x) { return { n: s(x.nama_pelanggan).trim(), t: /resel|putus/i.test(s(x.tipe)) ? 'Reseller' : 'Consignment' }; }).filter(function (x) { return x.n; });
  }
  async function kumpulOrder(sb, dari, sampai) {
    var L = await window.Lembar.muat(sb, ['order_log']);
    return window.Gudang.buat(L).om.kumpul(dari, sampai);
  }
  // laporanToko_ (file 0)
  async function laporan(sb, toko, dari, sampai) {
    var q = function (t, kol) { return semua(sb, function () { return sb.from(t).select(kol).eq('toko', toko).gte('tanggal', dari).lte('tanggal', sampai); }); };
    var h = await Promise.all([q('toko_jual_log', 'tanggal,toko,kode,nama_barang,qty_terjual,total,warna,id,baris_sheet'),
      q('toko_biaya_log', 'tanggal,toko,keterangan,nominal,id,baris_sheet'),
      q('toko_retur_log', 'tanggal,toko,kode,nama_barang,qty,nilai,warna,kondisi,catatan,id,baris_sheet')]);
    var out = { jual: [], biaya: [], omzet: 0, qty: 0, totalBiaya: 0, retur: [], returLayak: { q: 0, nilai: 0 }, rugi: { q: 0, nilai: 0 } }, idx = {};
    h[0].forEach(function (r) {
      if (!r.tanggal || s(r.toko).trim() !== toko) return;
      var kode = s(r.kode).trim().toUpperCase(), qq = Number(r.qty_terjual) || 0, tot = Number(r.total) || 0;
      var w = s(r.warna).trim().toUpperCase(), k = kode + '|' + w;
      if (!(k in idx)) { idx[k] = out.jual.length; out.jual.push({ k: kode, n: s(r.nama_barang), w: w, q: 0, tot: 0 }); }
      out.jual[idx[k]].q += qq; out.jual[idx[k]].tot += tot; out.qty += qq; out.omzet += tot;
    });
    out.jual.sort(function (a, b) { return b.q - a.q; });
    h[1].forEach(function (r) {
      if (!r.tanggal || s(r.toko).trim() !== toko) return;
      var nom = Number(r.nominal) || 0;
      out.biaya.push({ t: s(r.tanggal).slice(0, 10), ket: s(r.keterangan), nom: nom });
      out.totalBiaya += nom;
    });
    out.biaya.sort(function (a, b) { return a.t < b.t ? 1 : a.t > b.t ? -1 : 0; });
    h[2].forEach(function (r) {
      if (!r.tanggal || s(r.toko).trim() !== toko) return;
      var qq = Number(r.qty) || 0, nilai = Number(r.nilai) || 0, kd = s(r.kondisi).trim();
      out.retur.push({ t: s(r.tanggal).slice(0, 10), k: s(r.kode).trim().toUpperCase(), n: s(r.nama_barang), w: s(r.warna).trim().toUpperCase(), q: qq, kd: kd, nilai: nilai, c: s(r.catatan) });
      if (kd === 'Layak jual') { out.returLayak.q += qq; out.returLayak.nilai += nilai; } else { out.rugi.q += qq; out.rugi.nilai += nilai; }
    });
    out.retur.sort(function (a, b) { return a.t < b.t ? 1 : a.t > b.t ? -1 : 0; });
    out.totalRetur = out.returLayak.nilai + out.rugi.nilai;
    out.omzetBersih = out.omzet - out.totalRetur;
    return out;
  }
  function diperbarui() { return fmt(new Date(), 'dd/MM/yyyy HH:mm'); }

  async function ambilOrder(sb, p) {
    var dari = s(p.dari), sampai = s(p.sampai), re = /^\d{4}-\d{2}-\d{2}$/;
    if (!re.test(dari) || !re.test(sampai)) return { ok: false, pesan: 'Tanggal tidak valid.' };
    if (dari > sampai) return { ok: false, pesan: 'Tanggal awal harus sebelum tanggal akhir.' };
    var urut = await kumpulOrder(sb, dari, sampai), BATAS = 300;
    return { ok: true, orders: urut.slice(0, BATAS), terpotong: urut.length > BATAS, diperbarui: diperbarui() };
  }
  async function omzetKotor(sb, p) {
    var dari = s(p.dari), sampai = s(p.sampai), salah = salahPeriode(dari, sampai);
    if (salah) return { ok: false, pesan: salah };
    var pl = (await pelanggan(sb)).filter(function (x) { return x.t === 'Consignment'; });
    var h = await Promise.all([Promise.all(pl.map(function (x) { return laporan(sb, x.n, dari, sampai); })), kumpulOrder(sb, dari, sampai)]);
    var toko = [], totC = 0, pcsC = 0;
    pl.forEach(function (x, i) { var lap = h[0][i]; toko.push({ n: x.n, q: lap.qty, omzet: lap.omzet, retur: lap.totalRetur }); totC += lap.omzet; pcsC += lap.qty; });
    var res = [], idx = {}, trx = [], totR = 0;
    h[1].forEach(function (o) {
      if (o.tp !== 'Reseller' || o.st === 'Batal') return;
      if (!(o.pl in idx)) { idx[o.pl] = res.length; res.push({ n: o.pl, jml: 0, sub: 0, disk: 0, tot: 0 }); }
      var r = res[idx[o.pl]];
      r.jml++; r.sub += o.sub; r.disk += o.disk; r.tot += o.tot; totR += o.tot;
      trx.push({ no: o.no, t: o.t, pl: o.pl, st: o.st, d: o.d, sub: o.sub, tot: o.tot });
    });
    res.sort(function (a, b) { return b.tot - a.tot; });
    var BATAS = 300;
    return { ok: true, dari: dari, sampai: sampai, toko: toko, totalToko: totC, pcsToko: pcsC, reseller: res, totalReseller: totR,
      trx: trx.slice(0, BATAS), terpotong: trx.length > BATAS, total: totC + totR, diperbarui: diperbarui() };
  }
  async function cariToko(sb, nama) {
    var t = (await pelanggan(sb)).filter(function (x) { return x.t === 'Consignment' && x.n === s(nama); })[0];
    return t ? t.n : '';
  }
  async function pieToko(sb, p) {
    var toko = await cariToko(sb, p.toko);
    if (!toko) return { ok: false, pesan: 'Pilih toko consignment terlebih dahulu.' };
    var dari = s(p.dari), sampai = s(p.sampai), salah = salahPeriode(dari, sampai);
    if (salah) return { ok: false, pesan: salah };
    var lap = await laporan(sb, toko, dari, sampai), idx = {}, jual = [];
    lap.jual.forEach(function (x) {
      var k = kodeDasar(x.k);
      if (!(k in idx)) { idx[k] = jual.length; jual.push({ k: k, n: x.n, q: 0, tot: 0 }); }
      jual[idx[k]].q += Number(x.q) || 0; jual[idx[k]].tot += Number(x.tot) || 0;
    });
    jual.sort(function (a, b) { return b.tot - a.tot; });
    return { ok: true, toko: toko, jual: jual, omzet: lap.omzet };
  }
  async function laporanToko(sb, p) {
    var toko = await cariToko(sb, p.toko);
    if (!toko) return { ok: false, pesan: 'Pilih toko consignment terlebih dahulu.' };
    var dari = s(p.dari), sampai = s(p.sampai), re = /^\d{4}-\d{2}-\d{2}$/;
    if (!re.test(dari) || !re.test(sampai)) return { ok: false, pesan: 'Tanggal tidak valid.' };
    if (dari > sampai) return { ok: false, pesan: 'Tanggal awal harus sebelum tanggal akhir.' };
    var h = await Promise.all([laporan(sb, toko, dari, sampai), sb.rpc('toko_stok_hitung', { p_toko: toko }), sb.rpc('toko_hitung_warna', { p_toko: toko })]);
    if (h[1].error) throw new Error(h[1].error.message);
    if (h[2].error) throw new Error(h[2].error.message);
    var lap = h[0], stok = {};
    (h[1].data || []).forEach(function (r) { stok[r.kode] = (stok[r.kode] || 0) + (Number(r.qty) || 0); });
    lap.ok = true; lap.toko = toko; lap.stok = stok; lap.hitung = h[2].data || {}; lap.diperbarui = diperbarui();
    return lap;
  }
  window.TokoMd = { ambilOrder: ambilOrder, omzetKotor: omzetKotor, pieToko: pieToko, laporanToko: laporanToko, laporan: laporan };
})();
