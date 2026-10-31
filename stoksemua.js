/* Stok semua lokasi & nilai aset, dihitung langsung dari Supabase (31 Okt 2026).
 * Sama dengan slData (Apps Script file 14 "Stok semua lokasi") yang dulu dihitung Apps Script lalu disimpan
 * di hasil_hitung 'stok:semua'. Bagian-bagiannya memakai rumus yang sudah dipindah ke aplikasi:
 *   Gudang produksi : Produksi.ambilStok  (hitungStokRinci_ + penyesuaian)
 *   Gudang utama    : Gudang.buat(..).stok (GD_stok_)
 *   Kantor Packing  : KantorPacking.siap   (GD_online_)
 *   Toko & consign. : rpc toko_stok_hitung (stokToko_ + pinjaman)
 *   HPP             : MdLama.bahanHpp(..).peta() (DS_hpp_ / MM_hppPeta_)
 * Butuh: lembar.js, gudang.js, kp.js, produksi.js, md.js.
 */
(function () {
  function fmtWaktu(d) {
    var w = new Date(d.getTime() + 8 * 3600000), p = function (n) { return ('0' + n).slice(-2); };
    return { hari: w.toISOString().slice(0, 10), teks: p(w.getUTCDate()) + '/' + p(w.getUTCMonth() + 1) + '/' + w.getUTCFullYear() + ' ' + p(w.getUTCHours()) + ':' + p(w.getUTCMinutes()) };
  }

  async function hitung(sb) {
    var gagal = [], lokasi = [], stok = {}, info = {};
    var isi = function (id, data) {
      Object.keys(data || {}).forEach(function (k) {
        var q = Number(data[k]) || 0;
        if (!q) return;
        if (!stok[k]) stok[k] = {};
        stok[k][id] = (stok[k][id] || 0) + q;
      });
    };
    var pel = await sb.from('pelanggan').select('nama_pelanggan,tipe,baris_sheet,id').order('baris_sheet', { ascending: true, nullsFirst: false }).order('id');
    var toko = [], adaToko = {};
    (pel.data || []).forEach(function (r) {
      var n = String(r.nama_pelanggan || '').trim();
      if (!n || String(r.tipe || '').trim() !== 'Consignment' || adaToko[n]) return;
      adaToko[n] = true; toko.push(n);
    });
    var h = await Promise.all([
      window.MdLama.bahanHpp(sb),
      window.Produksi.ambilStok(sb).catch(function (e) { return { galat: e }; }),
      window.KantorPacking.siap(sb).catch(function (e) { return { galat: e }; }),
      Promise.all(toko.map(function (n) { return sb.rpc('toko_stok_hitung', { p_toko: n }); }))
    ]);
    var H = h[0], G = H.G, brg = G.barang(), hpp = H.peta();
    brg.list.forEach(function (b) { info[b.k] = { n: b.n, kat: b.kat, hj: b.h }; });

    // Gudang produksi
    lokasi.push({ id: 'prod', n: 'Gudang produksi', ket: 'Hasil produksi Cat Moscow & Kenka' });
    if (h[1] && h[1].stok) isi('prod', h[1].stok); else gagal.push('Gudang produksi: ' + ((h[1] && h[1].galat && h[1].galat.message) || 'stok awal belum tersedia'));
    // Gudang utama
    try {
      var s = {}, st = G.stok(H.log);
      Object.keys(st).forEach(function (key) { var k = key.split('|')[0]; s[k] = (s[k] || 0) + st[key]; });
      lokasi.push({ id: 'gudang', n: 'Gudang utama', ket: 'Barang impor / lokal' }); isi('gudang', s);
    } catch (e) { gagal.push('Gudang utama: ' + e.message); }
    // Kantor Packing
    try {
      if (!h[2] || !h[2].A) throw (h[2] && h[2].galat) || new Error('data Kantor Packing kosong');
      var on = {};
      h[2].A.on.list.forEach(function (x) { on[x.k] = (on[x.k] || 0) + x.q; if (!info[x.k]) info[x.k] = { n: x.n, kat: x.kat, hj: x.hj }; });
      lokasi.push({ id: 'kp', n: 'Kantor Packing', ket: 'Stok online / marketplace' }); isi('kp', on);
    } catch (e) { gagal.push('Kantor Packing: ' + (e.message || e)); }
    // Toko & consignment
    toko.forEach(function (n, i) {
      var id = 't' + i, r = h[3][i];
      lokasi.push({ id: id, n: n, ket: /offline/i.test(n) ? 'Toko offline' : 'Consignment' });
      if (r.error) { gagal.push('Toko & consignment: ' + r.error.message); return; }
      var m = {}; (r.data || []).forEach(function (x) { if (x.kode) m[x.kode] = Number(x.qty) || 0; });
      isi(id, m);
    });

    var barang = Object.keys(stok).map(function (k) {
      var f = info[k] || { n: k + ' (tidak ada di BARANG_ORDER)', kat: 'Lainnya', hj: 0 }, tot = 0;
      Object.keys(stok[k]).forEach(function (id) { tot += stok[k][id]; });
      return { k: k, n: f.n, kat: f.kat || 'Lainnya', q: stok[k], tot: tot, hpp: hpp[k] || 0, hj: f.hj || 0 };
    });
    var urutKat = {}, urutK = {};
    brg.list.forEach(function (b, i) { if (urutKat[b.kat] === undefined) urutKat[b.kat] = i; urutK[b.k] = i; });
    barang.sort(function (a, b) {
      var ka = urutKat[a.kat] !== undefined ? urutKat[a.kat] : 1e6, kb = urutKat[b.kat] !== undefined ? urutKat[b.kat] : 1e6;
      if (ka !== kb) return ka - kb;
      var ia = urutK[a.k] !== undefined ? urutK[a.k] : 1e6, ib = urutK[b.k] !== undefined ? urutK[b.k] : 1e6;
      return ia !== ib ? ia - ib : (a.k < b.k ? -1 : 1);
    });
    var tunggu = 0;
    try { G.sesuai().forEach(function (x) { if (x.st === 'Menunggu') tunggu++; }); } catch (e) { }
    var w = fmtWaktu(new Date());
    return { ok: true, lokasi: lokasi, barang: barang, gagal: gagal, ajuan: tunggu, hariIni: w.hari, diperbarui: w.teks, langsung: true };
  }

  // Ringkasan nilai aset per lokasi (stok positif × HPP / harga jual).
  function nilai(d) {
    var per = {};
    d.lokasi.forEach(function (l) { per[l.id] = { n: l.n, pcs: 0, hpp: 0, jual: 0, tanpaHpp: 0, minus: 0 }; });
    d.barang.forEach(function (b) {
      Object.keys(b.q).forEach(function (id) {
        var q = b.q[id], p = per[id]; if (!p) return;
        p.pcs += q; if (q < 0) p.minus++;
        if (q > 0) { p.hpp += q * (b.hpp || 0); p.jual += q * (b.hj || 0); if (!b.hpp) p.tanpaHpp++; }
      });
    });
    return d.lokasi.map(function (l) { return per[l.id]; });
  }

  // Bandingkan dengan potret Apps Script (hasil_hitung 'stok:semua'): daftar perbedaan, kosong = sama persis.
  function banding(a, b) {
    var beda = [];
    var lok = function (d) { return d.lokasi.map(function (l) { return l.id + '=' + l.n; }).join(','); };
    if (lok(a) !== lok(b)) beda.push('lokasi: ' + lok(a) + ' vs ' + lok(b));
    var ia = {}, ib = {};
    a.barang.forEach(function (x) { ia[x.k] = x; }); b.barang.forEach(function (x) { ib[x.k] = x; });
    Object.keys(Object.assign({}, ia, ib)).forEach(function (k) {
      var x = ia[k], y = ib[k];
      if (!x || !y) { beda.push(k + ': hanya ada di ' + (x ? 'aplikasi' : 'Apps Script')); return; }
      ['n', 'kat', 'tot', 'hpp', 'hj'].forEach(function (f) { if (String(x[f]) !== String(y[f])) beda.push(k + '.' + f + ': ' + x[f] + ' vs ' + y[f]); });
      var ids = Object.keys(Object.assign({}, x.q, y.q));
      ids.forEach(function (id) { if ((x.q[id] || 0) !== (y.q[id] || 0)) beda.push(k + '@' + id + ': ' + (x.q[id] || 0) + ' vs ' + (y.q[id] || 0)); });
    });
    if (a.barang.map(function (x) { return x.k; }).join() !== b.barang.map(function (x) { return x.k; }).join()) beda.push('urutan barang berbeda');
    return beda;
  }

  window.StokSemua = { hitung: hitung, nilai: nilai, banding: banding };
})();
