/*
 * Moscow Supplies - form Gudang Utama: Uang keluar (riwayat), Stok Toko / Consignment, dan Kenaikan harga / qty berlebih
 * dibaca dari Supabase. Rumus sama dengan gdxUangData, gdxLokasi, gdxHarga di Apps Script.
 */
(function () {
  'use strict';
  function rapi(v, n) { return String(v === null || v === undefined ? '' : v).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n || 200); }
  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }
  function fmtAngka(n) {
    n = Math.round(num(n) * 1000) / 1000;
    var b = String(Math.abs(n)).split('.');
    return (n < 0 ? '-' : '') + b[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (b[1] ? ',' + b[1] : '');
  }
  function jam(v) { if (!v) return ''; var d = new Date(v); return isNaN(d.getTime()) ? '' : window.Lembar.format(d, 'dd/MM/yyyy HH:mm'); }

  async function gdxUangData(sb, p) {
    var r = await sb.rpc('gudang_uang_data');
    if (r.error) throw new Error(r.error.message);
    var d = r.data;
    if (!d || !d.ok) return d;
    var riwayat = (d.rows || []).map(function (x) {
      var pg = rapi(x[9], 60);
      return {
        no: rapi(x[0], 30), t: x[1], j: rapi(x[2], 10), a: rapi(x[3], 60), a2: rapi(x[4], 60), k: rapi(x[5], 80), ket: rapi(x[6], 200),
        qs: num(x[10]) ? fmtAngka(x[10]) + (rapi(x[11], 20) ? ' ' + rapi(x[11], 20) : '') + (num(x[12]) ? ' x Rp ' + fmtAngka(x[12]) : '') : '',
        v: num(x[7]), w: jam(x[8]), p: pg.replace(/^staf:\s*/i, ''), batal: 0, staf: 1
      };
    }).filter(function (x) { return x.j === 'Keluar' && /\(gudang\)$/.test(String(x.p || '')); }).slice(0, 60);
    return { ok: true, mgmt: !!(p && p.mm), tanggal: d.tanggal, akun: (d.akun || []).map(function (a) { return { n: a[0], j: a[1] }; }), kat: d.kat || [], riwayat: riwayat };
  }

  async function gdxLokasi(sb) {
    var h = await Promise.all([sb.rpc('gudang_lokasi_data'), window.Lembar.muat(sb, ['barang_order'])]), r = h[0], L = h[1];
    if (r.error) throw new Error(r.error.message);
    if (!r.data || !r.data.ok) return r.data;
    var info = {};
    window.Lembar.baca(L, 'barang_order', 5).forEach(function (b) {
      var k = String(b[0]).trim().toUpperCase();
      if (!k || k.indexOf('-') !== -1 || info[k]) return;
      info[k] = { n: String(b[1]).trim(), kat: String(b[3]).trim() || 'Lainnya' };
    });
    var urut = { Habis: 0, Menipis: 1, Aman: 2, 'Belum laku': 3 };
    var lokasi = (r.data.toko || []).map(function (t) {
      var ada = {}, list = [], j = t.jual || {};
      Object.keys(t.stok || {}).forEach(function (k) { var q = Number(t.stok[k]) || 0; if (q) ada[k] = q; });
      Object.keys(j).forEach(function (k) { if (!(k in ada)) ada[k] = 0; });
      Object.keys(ada).forEach(function (k) {
        var q = ada[k], j30 = Number(j[k]) || 0, f = info[k] || { n: k + ' (tidak ada di BARANG_ORDER)', kat: 'Lainnya' };
        var hari = j30 > 0 ? Math.floor(q / (j30 / 30)) : null;
        var st = q <= 0 ? 'Habis' : (j30 <= 0 ? 'Belum laku' : (hari < 14 ? 'Menipis' : 'Aman'));
        list.push({ k: k, n: f.n, kat: f.kat, q: q, j30: j30, hari: hari, st: st });
      });
      list.sort(function (a, b) { return (urut[a.st] - urut[b.st]) || (a.n < b.n ? -1 : 1); });
      return { id: t.id, n: t.n, jenis: /offline/i.test(t.n) ? 'toko' : 'cons', list: list };
    });
    return { ok: true, lokasi: lokasi, diperbarui: window.Lembar.format(new Date(), 'dd/MM/yyyy HH:mm') };
  }

  var TAMPIL = ['no', 'wk', 't', 'bg', 'kel', 'k', 'n', 's', 'q', 'qs', 'h', 'al', 'pg', 'st', 'sr', 'an', 'oleh', 'wp', 'cp', 'ref', 'eta', 'wt'];
  async function gdxHarga(sb) {
    var h = await Promise.all([
      sb.from('hasil_hitung').select('data').eq('kunci', 'md:hrgnaik').maybeSingle(),
      window.Pengadaan.gdxPengajuan(sb)
    ]);
    var d = h[0] && h[0].data ? h[0].data.data : null;
    if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { d = null; } }
    var naik = d && d.ok && Array.isArray(d.list) ? d.list.slice(0, 120) : [];
    var lebih = ((h[1] && h[1].ajuan) || []).filter(function (x) { return x.sr === 'Berlebih'; }).slice(0, 80).map(function (x) {
      var o = {}; TAMPIL.forEach(function (f) { o[f] = x[f]; }); return o;
    });
    return { ok: true, naik: naik, lebih: lebih, pesan: '' };
  }

  window.GudangLain = { gdxUangData: gdxUangData, gdxLokasi: gdxLokasi, gdxHarga: gdxHarga };
})();
