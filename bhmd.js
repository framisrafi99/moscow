/* Bagi hasil semua toko consignment untuk Master Data, dihitung langsung dari Supabase (31 Okt 2026).
 * Sama dengan potret Apps Script 'md:bh' / 'md:bh:lalu' (SBM_bh_ = bagiHasilDataX per toko):
 *   hitungan toko = BagiHasil.hitung (bagihasil.js, salinan BHX_hitung_ beserta semua tambahannya),
 *   tanpa daftar harga (khusus formulir staf), ditambah angka setoran untuk manajemen:
 *   dc.setoran (file 76 DC_setoran_, Medan & Sidoarjo) dan rn.setoran (file 79, Renon).
 * Butuh: bagihasil.js.
 */
(function () {
  var TOKO = ['Consignment Medan', 'Consignment Sidoarjo', 'Consignment Renon'];
  function t(v, n) { return String(v === null || v === undefined ? '' : v).replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n || 200); }
  function bulat(v) { var x = Math.round(Number(v)); return isFinite(x) ? x : 0; }

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

  async function hitung(sb, bulan) {
    var h = await Promise.all([
      semua(sb, 'acc_log', 'id,baris_sheet,no,tanggal,jenis,akun,kategori,keterangan,nominal,status'),
      semua(sb, 'acc_sumber', 'id,baris_sheet,sumber,akun_penerima'),
      semua(sb, 'acc_akun', 'id,baris_sheet,nama_akun,jenis'),
      Promise.all(TOKO.map(function (toko) { return sb.rpc('toko_bahan_bagi_hasil', { p_toko: toko, p_bulan: bulan }); }))
    ]);
    var acc = h[0], sumber = h[1], akun = h[2];
    // DC_daftarAkun_: akun jenis Bank / Kas.
    var daftarAkun = akun.filter(function (r) { return t(r.nama_akun, 60) && /bank|kas/i.test(t(r.jenis, 20)); }).map(function (r) { return t(r.nama_akun, 60); });
    if (!akun.length) daftarAkun = ['Rekening PT'];
    // DC_akunPenerima_: baris terakhir di ACC_SUMBER untuk toko itu.
    function akunPenerima(toko) { var a = 'Rekening PT'; sumber.forEach(function (r) { if (t(r.sumber, 80) === toko && t(r.akun_penerima, 60)) a = t(r.akun_penerima, 60); }); return a; }
    // DC_setoran_: uang masuk Aktif kategori "Penjualan <toko>" yang keterangannya memuat [BH yyyy-MM].
    function setoran(toko) {
      var kat = 'Penjualan ' + toko, tag = '[BH ' + bulan + ']', rows = [];
      acc.forEach(function (r) {
        if (t(r.status, 20) !== 'Aktif' || t(r.jenis, 10) !== 'Masuk' || t(r.kategori, 80) !== kat) return;
        if (String(r.keterangan || '').indexOf(tag) === -1) return;
        rows.push({ no: t(r.no, 20), t: t(r.tanggal, 10), akun: t(r.akun, 60), v: bulat(r.nominal) });
      });
      return rows;
    }
    function isiSetoran(d, akunNama, rows) {
      var tercatat = 0; rows.forEach(function (x) { tercatat += x.v; });
      var harus = Math.round(Number(d.moscow) || 0);
      return { harus: harus, tercatat: tercatat, selisih: harus - tercatat, rows: rows, akun: akunNama, daftarAkun: daftarAkun };
    }
    var toko = TOKO.map(function (nm, i) {
      var r = h[3][i];
      if (r.error || !r.data) return { toko: nm, ok: false, pesan: (r.error && r.error.message) || 'tidak ada data' };
      var d = window.BagiHasil.hitung(nm, bulan, r.data);
      if (!d || d.ok === false) return { toko: nm, ok: false, pesan: (d && d.pesan) || 'tidak ada data' };
      delete d.daftar;
      if (d.dc && !d.dc.galat) d.dc.setoran = isiSetoran(d, akunPenerima(nm), setoran(nm));
      if (d.rn) d.rn.setoran = isiSetoran(d, 'Rekening PT', setoran(nm));
      d.toko = nm;
      return d;
    });
    return { ok: true, bulan: bulan, toko: toko };
  }

  window.BagiHasilMd = { hitung: hitung };
})();
