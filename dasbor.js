/* Dasbor lama (Apps Script file 13 dsData) dan laporan bulanan Kendali Bisnis (file 81 KB_laporan_ + file 26 ceoUang)
 * dihitung langsung dari Supabase (1 Nov 2026). Bagian-bagiannya memakai rumus yang sudah dipindah:
 *   keuangan            : akun.js (ACC_siap_ / ACC_log_ / ACC_gerak_, penjualan otomatis acc:oto)
 *   HPP berlapis        : md.js (DS_hpp_ + MDE_hppPada_)
 *   penjualan marketplace : md.js (MP_dasborJual_)
 *   stok per lokasi     : produksi.js, gudang.js, md.js gdPemilikData (stok online), rpc toko_stok_hitung
 * Butuh: lembar.js, gudang.js, kp.js, produksi.js, akun.js, md.js.
 */
(function () {
  'use strict';
  function rapi(v, n) { return String(v === null || v === undefined ? '' : v).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n || 200); }
  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }
  function tglOk(s) { return /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) ? String(s) : ''; }
  function hari(a, b) { var x = a.split('-'), y = b.split('-'); return Math.round((Date.UTC(+y[0], +y[1] - 1, +y[2]) - Date.UTC(+x[0], +x[1] - 1, +x[2])) / 86400000); }
  function geser(tgl, h) { var p = tgl.split('-'); return new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2]) + h)).toISOString().slice(0, 10); }
  function fmtRp(n) { n = Math.round(Number(n) || 0); var s = String(Math.abs(n)), o = ''; for (var i = 0; i < s.length; i++) { if (i > 0 && (s.length - i) % 3 === 0) o += '.'; o += s.charAt(i); } return (n < 0 ? '-' : '') + o; }
  function kodeDasar(k) { return String(k).trim().toUpperCase().split('-')[0]; }
  function coba(gagal, judul, kerja, cadangan) { try { return kerja(); } catch (err) { gagal.push(judul + ': ' + (err && err.message ? err.message : err)); return cadangan; } }
  async function semua(sb, tabel, kolom) {
    var out = [], dari = 0;
    for (;;) {
      var r = await sb.from(tabel).select(kolom).order('baris_sheet', { ascending: true, nullsFirst: false }).order('id').range(dari, dari + 999);
      if (r.error) throw new Error(r.error.message);
      out = out.concat(r.data || []);
      if (!r.data || r.data.length < 1000) return out;
      dari += 1000;
    }
  }
  function tglDb(v) { var s = rapi(v, 20).slice(0, 10); return tglOk(s); }

  async function dsData(sb, p) {
    var fmt = window.Lembar.format;
    var hariIni = fmt(new Date(), 'yyyy-MM-dd');
    var sampai = tglOk(p && p.sampai) || hariIni, dari = tglOk(p && p.dari) || (sampai.slice(0, 8) + '01');
    if (sampai > hariIni) sampai = hariIni;
    if (dari > sampai) dari = sampai;
    if (hari(dari, sampai) > 400) dari = geser(sampai, -400);
    var panjang = hari(dari, sampai) + 1, lSampai = geser(dari, -1), lDari = geser(dari, -panjang);
    var gagal = [], out = { ok: true, hariIni: hariIni, dari: dari, sampai: sampai, lDari: lDari, lSampai: lSampai, gagal: gagal };

    var pel = await sb.from('pelanggan').select('nama_pelanggan,tipe,baris_sheet,id').order('baris_sheet', { ascending: true, nullsFirst: false }).order('id');
    var toko = [], adaT = {};
    ((pel && pel.data) || []).forEach(function (r) { var n = String(r.nama_pelanggan || '').trim(); if (n && String(r.tipe || '').trim() === 'Consignment' && !adaT[n]) { adaT[n] = 1; toko.push(n); } });
    var tangkap = function (pr) { return pr.then(function (v) { return { v: v }; }, function (e) { return { e: e }; }); };
    var h = await Promise.all([
      window.MdLama.bahanHpp(sb),
      tangkap(window.Akunting.inti(sb)),
      tangkap(semua(sb, 'toko_jual_log', 'id,baris_sheet,tanggal,toko,kode,qty_terjual,total')),
      tangkap(semua(sb, 'toko_retur_log', 'id,baris_sheet,tanggal,toko,kode,qty,nilai')),
      window.Lembar.muat(sb, ['order_log', 'katalog', 'produksi_log', 'salur_log']),
      tangkap(window.MdLama.mpJual(sb)),
      tangkap(window.MdLama.gdPemilikData(sb)),
      sb.rpc('produksi_awal'),
      Promise.all(toko.map(function (n) { return sb.rpc('toko_stok_hitung', { p_toko: n }); }))
    ]);
    var H = h[0], G = H.G, hpp = H.peta();
    var brg = coba(gagal, 'Daftar barang', function () { return G.barang(); }, { list: [], idx: {} });
    var nama = {}, harga = {};
    brg.list.forEach(function (b) { nama[b.k] = b.n; harga[b.k] = b.h; });
    var gdLog = H.log, laku = {}, stokLok = {};
    // L gabungan: tabel gudang dari HPP + order/katalog/produksi.
    var L = Object.assign({}, H.L, h[4]);

    // 1. Keuangan
    coba(gagal, 'Keuangan', function () {
      if (h[1].e) throw h[1].e;
      var I = h[1].v; if (!I) throw new Error('data accounting belum tersedia');
      var cfg = I.cfg, gerak = I.gerak;
      var saldo = function (t) { var s = {}; cfg.akun.forEach(function (a) { s[a.n] = a.awal; }); gerak.forEach(function (g) { if (g.t <= t && (g.a in s)) s[g.a] += g.d; }); return s; };
      var sAkhir = saldo(sampai);
      out.akun = cfg.akun.map(function (a) { return { n: a.n, j: a.j, v: sAkhir[a.n] || 0 }; });
      var tren = [];
      for (var i = 13; i >= 0; i--) {
        var t = geser(sampai, -i), s = saldo(t), tot = 0;
        Object.keys(s).forEach(function (k) { if (!/belum cair/i.test(k)) tot += s[k]; });
        tren.push({ t: t, v: tot });
      }
      out.saldoTren = tren;
      var kosong = function () { return { masuk: 0, keluar: 0, pend: 0, beli: 0, ops: 0, luarMasuk: 0, luarKeluar: 0, kat: {}, pendKat: {}, beliKat: {} }; };
      var ini = kosong(), lalu = kosong(), harian = {};
      for (var j = 0; j < panjang && j < 400; j++) harian[geser(dari, j)] = 0;
      gerak.forEach(function (g) {
        if (g.arah === 'Pindah') return;
        var x = (g.t >= dari && g.t <= sampai) ? ini : (g.t >= lDari && g.t <= lSampai) ? lalu : null;
        if (!x) return;
        var v = Math.abs(g.d);
        if (g.arah === 'Masuk') {
          x.masuk += v;
          if (g.kel === 'Pendapatan') { var sv = g.d; x.pend += sv; x.pendKat[g.k] = (x.pendKat[g.k] || 0) + sv; if (x === ini && g.t in harian) harian[g.t] += sv; }
          else x.luarMasuk += v;
        } else {
          x.keluar += v;
          if (g.kel === 'Biaya operasional') { x.ops += v; x.kat[g.k] = (x.kat[g.k] || 0) + v; }
          else if (g.kel === 'Pembelian barang & bahan') { x.beli += v; x.beliKat[g.k] = (x.beliKat[g.k] || 0) + v; }
          else x.luarKeluar += v;
        }
      });
      var rinci = {};
      gerak.forEach(function (g) {
        if (g.arah !== 'Keluar' || g.t < dari || g.t > sampai || !g.ref) return;
        (rinci[g.k] || (rinci[g.k] = [])).push({ t: g.t, ket: g.ref.ket || '', v: Math.abs(g.d), a: g.a, qs: g.ref.qs || '' });
      });
      Object.keys(rinci).forEach(function (k) { rinci[k].sort(function (a, b) { return b.v - a.v; }); rinci[k] = rinci[k].slice(0, 25); });
      var urut = function (o) { return Object.keys(o).map(function (k) { return { n: k, v: o[k] }; }).filter(function (z) { return z.v; }).sort(function (a, b) { return b.v - a.v; }); };
      out.uang = {
        ini: { masuk: ini.masuk, keluar: ini.keluar, pend: ini.pend, beli: ini.beli, ops: ini.ops, luarMasuk: ini.luarMasuk, luarKeluar: ini.luarKeluar },
        lalu: { masuk: lalu.masuk, keluar: lalu.keluar, pend: lalu.pend, beli: lalu.beli, ops: lalu.ops },
        beban: urut(ini.kat), bebanLalu: lalu.kat, beliKat: urut(ini.beliKat), saluran: urut(ini.pendKat), saluranLalu: lalu.pendKat, rinci: rinci
      };
      out.harian = Object.keys(harian).sort().map(function (t) { return { t: t, v: harian[t] }; });
    }, null);

    // 2. Barang terjual & HPP terjual
    coba(gagal, 'Barang terjual', function () {
      var jual = {}, tanpa = {}, sal = {}, salBrg = {}, hppIni = 0, hppLalu = 0, qIni = 0;
      var salK = function (n) { if (!sal[n]) sal[n] = { n: n, omzet: 0, hpp: 0, q: 0, omzetL: 0, hppL: 0 }; return sal[n]; };
      var catat = function (t, kode, q, total, saluran) {
        var k = kodeDasar(kode);
        if (!k || !q) return;
        var ini = t >= dari && t <= sampai, lalu = t >= lDari && t <= lSampai;
        if (!ini && !lalu) return;
        var hh = H.pada(k, t, hpp[k] || 0) || 0;
        if (lalu) { hppLalu += q * hh; salK(saluran).omzetL += total; salK(saluran).hppL += q * hh; return; }
        hppIni += q * hh; qIni += q;
        var sk = salK(saluran); sk.omzet += total; sk.hpp += q * hh; sk.q += q;
        if (!hh) tanpa[k] = (tanpa[k] || 0) + q;
        if (!jual[k]) jual[k] = { k: k, n: nama[k] || k, q: 0, v: 0, hpp: 0, sal: {} };
        jual[k].q += q; jual[k].v += total; jual[k].hpp += q * hh;
        jual[k].sal[saluran] = (jual[k].sal[saluran] || 0) + q;
        var sbb = salBrg[saluran] || (salBrg[saluran] = {});
        var bb = sbb[k] || (sbb[k] = { k: k, n: nama[k] || k, q: 0, v: 0, hpp: 0 });
        bb.q += q; bb.v += total; bb.hpp += q * hh;
      };
      if (h[2].e) throw h[2].e;
      h[2].v.forEach(function (r) { var t = tglDb(r.tanggal); if (t) catat(t, r.kode === null ? '' : r.kode, num(r.qty_terjual), num(r.total), rapi(r.toko, 60)); });
      if (h[3].e) throw h[3].e;
      h[3].v.forEach(function (r) { var t = tglDb(r.tanggal); if (t) catat(t, r.kode === null ? '' : r.kode, -num(r.qty), -num(r.nilai), rapi(r.toko, 60)); });
      window.Lembar.baca(L, 'order_log', 13).forEach(function (r) {
        var t = r[1] instanceof Date ? fmt(r[1], 'yyyy-MM-dd') : tglOk(rapi(r[1], 10));
        if (!t || rapi(r[3], 20) !== 'Reseller' || !/^(dikirim|selesai)$/i.test(rapi(r[12], 20))) return;
        catat(t, r[4], num(r[6]), num(r[11]), 'Reseller');
      });
      coba(gagal, 'Penjualan marketplace', function () { if (h[5].e) throw h[5].e; h[5].v.forEach(function (a) { catat(a[0], a[1], a[2], a[3], a[4]); }); }, null);
      var list = Object.keys(jual).map(function (k) { return jual[k]; }).filter(function (x) { return x.q > 0; });
      list.sort(function (a, b) { return b.v - a.v; });
      list.forEach(function (x) { laku[x.k] = x; });
      var perSal = {};
      Object.keys(salBrg).forEach(function (s) {
        perSal[s] = Object.keys(salBrg[s]).map(function (k) { return salBrg[s][k]; }).filter(function (x) { return x.q > 0; }).sort(function (a, b) { return b.v - a.v; }).slice(0, 15);
      });
      out.terjual = { hpp: hppIni, hppLalu: hppLalu, q: qIni, top: list.slice(0, 10), perSal: perSal,
        saluran: Object.keys(sal).map(function (k) { return sal[k]; }),
        tanpaHpp: Object.keys(tanpa).map(function (k) { return { k: k, n: nama[k] || k, q: tanpa[k] }; }) };
    }, null);

    // 3. Nilai stok per lokasi
    var nilai = function (stok, judul, ket) {
      var q = 0, vh = 0, vj = 0, tanpaH = 0, minus = 0;
      Object.keys(stok).forEach(function (k) {
        var s = stok[k]; if (!s) return;
        if (s < 0) { minus++; return; }
        q += s; vh += s * (hpp[k] || 0); vj += s * (harga[k] || 0);
        if (!hpp[k]) tanpaH++;
      });
      return { n: judul, ket: ket, q: q, hpp: vh, jual: vj, tanpa: tanpaH, minus: minus };
    };
    var lokasi = [];
    coba(gagal, 'Stok gudang produksi', function () {
      var r = h[7], d = r && !r.error && r.data, awal = null;
      if (d) { if (Array.isArray(d.urut)) { awal = {}; d.urut.forEach(function (x) { awal[x[0]] = x[1]; }); } else if (d.urut === undefined) awal = d; }
      if (!awal) throw new Error('stok awal gudang produksi belum tersedia');
      lokasi.push(nilai(window.Produksi.buat(L).ambilStok(awal).stok, 'Gudang produksi', 'Cat Moscow & Kenka hasil produksi'));
    });
    coba(gagal, 'Stok gudang utama', function () {
      var s = {}, st = G.stok(gdLog);
      Object.keys(st).forEach(function (key) { var k = key.split('|')[0]; s[k] = (s[k] || 0) + st[key]; });
      stokLok['Gudang utama'] = s;
      lokasi.push(nilai(s, 'Gudang utama', 'Barang impor / lokal & hasil produksi'));
    });
    coba(gagal, 'Stok online', function () {
      if (h[6].e) throw h[6].e;
      var on = h[6].v.online, s = {};
      on.list.forEach(function (x) { s[x.k] = (s[x.k] || 0) + x.q; });
      stokLok['Kantor Packing'] = s;
      var n = nilai(s, 'Stok online', 'Kantor Packing (marketplace)');
      n.hpp = on.tot.hpp; n.jual = on.tot.jual; n.tanpa = on.tot.tanpaHpp;
      lokasi.push(n);
    });
    coba(gagal, 'Stok toko & consignment', function () {
      toko.forEach(function (n, i) {
        var r = h[8][i]; if (r.error) throw new Error(r.error.message);
        var m = {}; (r.data || []).forEach(function (x) { if (x.kode) m[x.kode] = Number(x.qty) || 0; });
        lokasi.push(nilai(m, n, /offline/i.test(n) ? 'Toko' : 'Consignment'));
      });
    });
    out.stok = lokasi;

    // 4. Perlu ditindak
    coba(gagal, 'Perlu ditindak', function () {
      var t = [], po = null;
      try { po = G.po(); G.isiTerima(po, gdLog); } catch (e) { po = null; }
      if (po) {
        var STAF = { 'ShopeePay': true, 'Kas Tunai': true };
        var tk = { setuju: 0, bayar: 0, biaya: 0, jalan: 0, prod: G.salurTunggu(gdLog).length, nilaiBayar: 0, nilaiBiaya: 0 };
        po.list.forEach(function (o) {
          if (o.st === 'Menunggu persetujuan') tk.setuju++;
          if (o.st === 'Ditolak' || o.st === 'Batal') return;
          if (!STAF[o.bayar] && !o.wb && o.st !== 'Menunggu persetujuan') { tk.bayar++; tk.nilaiBayar += o.tot; }
          if (o.st === 'Dikirim supplier') tk.jalan++;
          o.biaya.forEach(function (b) { if (b.sb !== 'Dibayar') { tk.biaya++; tk.nilaiBiaya += b.v; } });
        });
        if (tk.setuju) t.push({ n: tk.setuju + ' PO menunggu persetujuan', ke: 'beli', s: 'warn' });
        if (tk.bayar || tk.biaya) t.push({ n: (tk.bayar + tk.biaya) + ' tagihan PO belum dibayar (Rp ' + fmtRp(tk.nilaiBayar + tk.nilaiBiaya) + ')', ke: 'beli', s: 'warn' });
        if (tk.prod) t.push({ n: tk.prod + ' kiriman produksi belum diterima gudang utama', ke: 'gudang', s: 'info' });
      }
      var G2 = window.Gudang.buat(L), tunggu = 0, siap = 0, ajuan = 0;
      try { G2.om.kumpul(geser(hariIni, -90), '9999-12-31').forEach(function (o) { if (o.st === 'Menunggu') tunggu++; }); } catch (e) { }
      try { siap = G2.orderTunggu(gdLog, hariIni).length; } catch (e) { }
      if (tunggu) t.push({ n: tunggu + ' order menunggu disetujui', ke: 'order', s: 'warn' });
      if (siap) t.push({ n: siap + ' order disetujui belum dikirim gudang', ke: 'gudang', s: 'info' });
      try { G.sesuai().forEach(function (x) { if (x.st === 'Menunggu') ajuan++; }); } catch (e) { }
      if (ajuan) t.push({ n: ajuan + ' ajuan hitung stok gudang menunggu', ke: 'setuju', s: 'info' });
      (out.akun || []).forEach(function (a) { if (a.v < 0) t.push({ n: (/^saldo/i.test(a.n) ? '' : 'Saldo ') + a.n + ' minus (Rp ' + fmtRp(a.v) + ')', ke: 'uang', s: 'bad' }); });
      out.tindak = t;
    });

    // 5. Peringatan
    coba(gagal, 'Peringatan', function () {
      var P = { minus: [], tipis: [], diam: [] };
      Object.keys(stokLok).forEach(function (lok) {
        var s = stokLok[lok];
        Object.keys(s).forEach(function (k) { if (s[k] < 0) P.minus.push({ k: k, n: nama[k] || k, lok: lok, q: s[k] }); });
      });
      var kp = stokLok['Kantor Packing'];
      if (kp) {
        Object.keys(kp).forEach(function (k) {
          var q = kp[k], l = laku[k];
          if (q < 0) return;
          if (l && l.q > 0) { var hr = q / (l.q / panjang); if (hr < 7) P.tipis.push({ k: k, n: nama[k] || k, q: q, hari: Math.round(hr * 10) / 10, laku: l.q }); }
          else if (q > 0 && panjang >= 14) P.diam.push({ k: k, n: nama[k] || k, q: q, nilai: q * (hpp[k] || 0) });
        });
      }
      P.minus.sort(function (a, b) { return a.q - b.q; });
      P.tipis.sort(function (a, b) { return a.hari - b.hari; });
      P.diam.sort(function (a, b) { return b.nilai - a.nilai; });
      P.jml = { minus: P.minus.length, tipis: P.tipis.length, diam: P.diam.length };
      P.minus = P.minus.slice(0, 40); P.tipis = P.tipis.slice(0, 40); P.diam = P.diam.slice(0, 40);
      out.peringatan = P;
    }, null);

    out.diperbarui = fmt(new Date(), 'dd/MM/yyyy HH:mm');
    return out;
  }

  // ceoUang (file 26) bagian profit: HPP barang terjual untuk saluran yang penjualannya sudah dicatat di accounting.
  function hppTercatat(r) {
    var u = r.uang || null, t = r.terjual || null;
    if (!u) return null;
    var kat = {};
    (u.saluran || []).forEach(function (x) { kat[x.n] = x.v; });
    var ada = function (o, nm) { return Object.keys(o).some(function (k) { return k.toLowerCase() === nm.toLowerCase() && o[k]; }); };
    var hpp = 0;
    (t && t.saluran ? t.saluran : []).forEach(function (s) { var nm = s.n === 'Reseller' ? 'Penjualan reseller' : 'Penjualan ' + s.n; if (ada(kat, nm)) hpp += s.hpp || 0; });
    return Math.round(hpp);
  }
  function kanal(n) {
    var s = String(n || '').toLowerCase();
    if (/consignment|bagi hasil/.test(s)) return 'Consignment';
    if (/reseller/.test(s)) return 'Reseller';
    if (/shopee|tokopedia|tiktok|lazada|online|marketplace|official/.test(s)) return 'Official';
    if (/offline|toko/.test(s)) return 'Toko Offline';
    return 'Lainnya';
  }
  function akhir(b) { var a = b.split('-'), d = new Date(Date.UTC(Number(a[0]), Number(a[1]), 0)).getUTCDate(); return b + '-' + (d < 10 ? '0' : '') + d; }

  // KB_laporan_ (file 81): laporan bulanan Kendali Bisnis.
  async function laporanBulan(sb, bulan) {
    var h = await Promise.all([window.Akunting.akuntingLaporan(sb, { bulan: bulan }),
      dsData(sb, { dari: bulan + '-01', sampai: akhir(bulan) }).then(function (v) { return v; }, function (e) { return { ok: false, pesan: e.message }; }),
      sb.from('tutup_buku').select('bulan,status').eq('bulan', bulan)]);
    var lap = h[0];
    if (!lap || !lap.ok) throw new Error((lap && lap.pesan) || 'Laporan accounting gagal dimuat.');
    if (h[2].error) throw new Error(h[2].error.message);
    var URUT = ['Official', 'Consignment', 'Toko Offline', 'Reseller', 'Lainnya'], masuk = {}, keluar = {}, luar = [];
    URUT.forEach(function (n) { masuk[n] = { n: n, v: 0, det: [] }; });
    var KEL = ['Pendapatan', 'Pembelian barang & bahan', 'Biaya operasional', 'Di luar laba rugi'];
    (lap.kat || []).forEach(function (k) {
      if (k.kel === 'Pendapatan') { var g = masuk[kanal(k.n)], v = k.arah === 'Masuk' ? k.v : -k.v; g.v += v; g.det.push({ n: k.n, v: v }); }
      else if (k.kel === KEL[1] || k.kel === KEL[2]) { var g2 = keluar[k.kel] || (keluar[k.kel] = { n: k.kel, v: 0, det: [] }), v2 = k.arah === 'Keluar' ? k.v : -k.v; g2.v += v2; g2.det.push({ n: k.n, v: v2 }); }
      else if (k.v) luar.push({ n: k.n, arah: k.arah, v: k.v });
    });
    var hpp = null, hppInfo = '', u = h[1];
    if (u && u.ok) {
      hpp = hppTercatat(u);
      if (hpp === null) hppInfo = 'HPP belum bisa dihitung.';
      else if (u.terjual && u.terjual.tanpaHpp && u.terjual.tanpaHpp.length) hppInfo = u.terjual.tanpaHpp.length + ' barang terjual belum punya HPP.';
    } else hppInfo = (u && u.pesan) || 'HPP belum bisa dihitung.';
    var omzet = lap.lr.pend, beli = lap.lr.beli, biaya = lap.lr.biaya;
    var tutup = (h[2].data || []).some(function (r) { return rapi(r.status, 20) === 'Ditutup'; });
    var sort = function (a, b) { return b.v - a.v; };
    return {
      bulan: bulan, final: tutup, omzet: omzet, beli: beli, biaya: biaya, keluar: beli + biaya,
      kas: omzet - beli - biaya, hpp: hpp, laba: hpp === null ? null : omzet - hpp - biaya, hppInfo: hppInfo,
      masuk: URUT.map(function (n) { masuk[n].det.sort(sort); return masuk[n]; }).filter(function (g) { return g.v || g.n !== 'Lainnya'; }),
      sektor: Object.keys(keluar).map(function (k) { keluar[k].det.sort(sort); return keluar[k]; }),
      luar: luar.sort(sort).slice(0, 12), peringatan: lap.peringatan || [],
      dibuat: window.Lembar.format(new Date(), 'dd/MM/yyyy HH:mm')
    };
  }

  window.Dasbor = { dsData: dsData, laporanBulan: laporanBulan };
})();
