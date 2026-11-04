/*
 * Moscow Supplies - usulan HPP baru setelah barang PO diterima gudang (4 Nov 2026).
 * Salinan CHR_hitungTerima_ (Apps Script file 60) dengan rumus yang sudah dipindah ke aplikasi:
 *   HPP lama   : MdLama.bahanHpp -> lapisHpp(..).peta() (MM_hppPeta_), bukti terima yang sedang dihitung diabaikan (CHR_ABAIKAN_TB_)
 *   usulan     : harga_usul_log (CHR_tunggu_: usulan HPP "Semua lokasi" yang masih Menunggu)
 *   stok       : Gudang Utama (GD_stok_) + Kantor Packing (GD_online_) + toko consignment (toko_stok_hitung)
 * Dipakai Edge Function efek-hitung (service role). Hasil: daftar usulan seperti CHR_hitungTerima_ (tanpa menulis).
 * Butuh: lembar.js, gudang.js, kp.js, md.js.
 */
(function () {
  var BATAS_NAIK = 5, DARI = 'Penerimaan barang';
  function t(v) { return String(v === null || v === undefined ? '' : v).replace(/\s+/g, ' ').trim(); }
  function fmt(n) { n = Math.round(Number(n) || 0); var s = String(Math.abs(n)), o = ''; for (var i = 0; i < s.length; i++) { if (i > 0 && (s.length - i) % 3 === 0) o += '.'; o += s.charAt(i); } return (n < 0 ? '-' : '') + o; }
  function rp(n) { return 'Rp' + fmt(n); }
  function persen(baru, lama) { return lama > 0 ? Math.round((baru - lama) / lama * 1000) / 10 : 0; }
  function pt(p) { return String(p).replace('.', ','); }
  function margin(hj, hpp) { return hj > 0 ? Math.round((hj - hpp) / hj * 100) : null; }
  function refBagi(ref) { var s = String(ref), i = s.indexOf('|'); return i === -1 ? [s, ''] : [s.slice(0, i), s.slice(i + 1)]; }

  async function semua(sb, buat) {
    var out = [], dari = 0, m = 1000;
    for (;;) {
      var r = await buat().range(dari, dari + m - 1);
      if (r.error) throw new Error(r.error.message);
      out = out.concat(r.data || []);
      if (!r.data || r.data.length < m) return out;
      dari += m;
    }
  }

  async function hitung(sb, tb) {
    tb = t(tb);
    var TABEL = ['barang_order', 'gudang_log', 'gudang_stok_awal', 'online_stok_awal', 'po_log', 'po_item', 'po_biaya', 'salur_log', 'produksi_sesuai_log'];
    var pel = await sb.from('pelanggan').select('nama_pelanggan,tipe');
    var toko = [], ada = {};
    (pel.data || []).forEach(function (r) { var n = t(r.nama_pelanggan); if (n && t(r.tipe) === 'Consignment' && !ada[n]) { ada[n] = 1; toko.push(n); } });
    var h = await Promise.all([
      window.Lembar.muat(sb, TABEL),
      semua(sb, function () { return sb.from('md_ubah_log').select('no,waktu,jenis,kode,berlaku_mulai,lama,baru').order('id'); }),
      semua(sb, function () { return sb.from('hpp_hitung_log').select('bukti_terima').order('id'); }),
      semua(sb, function () { return sb.from('harga_usul_log').select('no,dari_link,jenis,lokasi,kode,baru,status').order('id'); }),
      window.KantorPacking.siap(sb),
      Promise.all(toko.map(function (n) { return sb.rpc('toko_stok_hitung', { p_toko: n }); }))
    ]);
    var L = h[0];
    // CHR_ABAIKAN_TB_: bukti terima yang sedang dihitung dianggap "sudah lewat hitung HPP" supaya HPP lama = sebelum penerimaan ini.
    var H = window.MdLama.lapisHpp(L, h[1], h[2].concat([{ bukti_terima: tb }]));
    var G = H.G, log = H.log, po = G.po(), brg = G.barang();
    var rows = log.filter(function (x) { return /^masuk/i.test(x.j) && refBagi(x.ref)[0] === tb; });
    if (!rows.length) return { ok: false, pesan: 'Bukti ' + tb + ' tidak ditemukan.' };
    var poNo = refBagi(rows[0].ref)[1], i = po.idx[poNo];
    if (i === undefined) return { ok: false, pesan: 'PO ' + poNo + ' tidak ditemukan.' };
    var o = po.list[i], barang = 0, B = 0;
    o.items.forEach(function (it) { barang += it.s; });
    o.biaya.forEach(function (b) { if (b.sb !== 'Batal') B += b.v; });
    var agg = {};
    rows.forEach(function (x) {
      var it = o.items.filter(function (y) { return y.k === x.k && y.w === x.w; })[0] || o.items.filter(function (y) { return y.k === x.k; })[0];
      if (!it) return;
      var unit = it.h + (barang > 0 && it.q > 0 ? B * it.s / barang / it.q : 0);
      var a = agg[x.k] || (agg[x.k] = { baik: 0, rusak: 0, nilai: 0, n: it.n });
      a.baik += x.q; a.rusak += x.rs; a.nilai += unit * (x.q + x.rs);
    });
    var peta = H.peta();
    // CHR_tunggu_
    var tunggu = {};
    h[3].forEach(function (r) {
      if (t(r.status) === 'Menunggu' && t(r.jenis) === 'HPP' && t(r.lokasi) === 'Semua lokasi') tunggu[t(r.kode).toUpperCase()] = { no: t(r.no), dari: t(r.dari_link), baru: Number(r.baru) || 0 };
    });
    // CHR_stokSemua_
    var stok = {};
    var tambah = function (k, q) { k = String(k || '').toUpperCase(); q = Number(q) || 0; if (k && q) stok[k] = (stok[k] || 0) + q; };
    var sg = G.stok(log); Object.keys(sg).forEach(function (key) { tambah(key.split('|')[0], sg[key]); });
    if (h[4] && h[4].A && h[4].A.on) h[4].A.on.list.forEach(function (x) { tambah(x.k, x.q); });
    h[5].forEach(function (r) { (r.data || []).forEach(function (x) { tambah(x.kode, x.qty); }); });

    var daftar = [];
    Object.keys(agg).forEach(function (k) {
      var a = agg[k];
      if (!(a.baik > 0)) return;
      var bpp = a.nilai / a.baik;
      var tg = tunggu[k], L0 = tg && tg.dari.indexOf(DARI) === 0 && tg.baru > 0 ? { v: tg.baru, ket: 'dari usulan ' + tg.no + ' yang belum diputus' } : { v: Math.round(peta[k] || 0), ket: '' };
      var lama = L0.v, stokLama = Math.max(0, (stok[k] || 0) - a.baik);
      var baru = Math.round(lama > 0 && stokLama > 0 ? (stokLama * lama + a.baik * bpp) / (stokLama + a.baik) : bpp);
      var b = brg.idx[k] !== undefined ? brg.list[brg.idx[k]] : null, hj = b ? (b.h || 0) : 0;
      var naik = persen(baru, lama), tinjau = (lama > 0 && naik >= BATAS_NAIK) || (hj > 0 && baru >= hj);
      var catat = [];
      if (!B) catat.push('Biaya PO belum dicatat');
      if (!lama) catat.push('HPP lama belum ada');
      if (L0.ket) catat.push('HPP lama ' + L0.ket);
      var al = 'Diterima ' + tb + ' (PO ' + o.no + ', ' + o.sup + '): ' + fmt(a.baik) + ' baik' + (a.rusak ? ', ' + fmt(a.rusak) + ' rusak' : '') +
        ', biaya ' + rp(bpp) + '/pcs. Stok lama ' + fmt(stokLama) + ' pcs @' + (lama ? rp(lama) : '-') +
        ' = HPP ' + rp(baru) + (lama ? ' (' + (naik >= 0 ? '+' : '') + pt(naik) + '%)' : '') + '.' +
        (hj ? ' Margin ' + (lama ? margin(hj, lama) + '% -> ' : '') + margin(hj, baru) + '%.' : '') +
        (tinjau ? ' TINJAU HARGA JUAL.' : '') + (catat.length ? ' ' + catat.join('. ') + '.' : '');
      daftar.push({ k: k, n: b ? b.n : a.n, lama: lama, baru: baru, naik: naik, tinjau: tinjau, al: al.slice(0, 300),
        stokLama: stokLama, baik: a.baik, rusak: a.rusak, bpp: Math.round(bpp), hj: hj, catat: catat.join('. ') });
    });
    return { ok: true, tb: tb, po: o.no, sup: o.sup, asal: o.asal, daftar: daftar.filter(function (x) { return x.baru !== x.lama; }) };
  }

  window.HppTerima = { hitung: hitung };
})();
