/*
 * Moscow Supplies - bacaan form toko (consignment & Toko Offline) langsung dari Supabase, tanpa Apps Script (4 Nov 2026).
 *   dasborToko (file 3), riwayatHitung & riwayatLaporan (file 5): rumus dan bentuk jawaban sama dengan Apps Script.
 * Staf toko hanya bisa membaca baris tokonya sendiri (aturan akses tabel di Supabase).
 * Kalau gagal, fungsi melempar galat dan halaman membaca lewat Apps Script seperti biasa.
 */
(function () {
  'use strict';
  var TZ = 'Asia/Makassar';
  function t(v) { return String(v === null || v === undefined ? '' : v).replace(/\s+/g, ' ').trim(); }
  function nama(v) { return t(v).replace(/^(form|kasir)\s*:?\s*/i, ''); }
  function n(v) { v = Number(v); return isFinite(v) ? v : 0; }
  function bagian(d) {
    var o = {};
    new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(d).forEach(function (p) { o[p.type] = p.value; });
    return o;
  }
  function jam(v) { var o = bagian(new Date(v)); return o.day + '/' + o.month + '/' + o.year + ' ' + o.hour + ':' + o.minute; }
  function hari(v) { var o = bagian(new Date(v)); return o.year + '-' + o.month + '-' + o.day; }
  function tglId(iso) { var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }
  function sekarang() { return jam(Date.now()); }
  function kodeDasar(k) { return String(k).trim().toUpperCase().split('-')[0]; }

  async function semua(buat) {
    var out = [], dari = 0, m = 1000;
    for (;;) {
      var r = await buat().range(dari, dari + m - 1);
      if (r.error) throw new Error(r.error.message);
      out = out.concat(r.data || []);
      if (!r.data || r.data.length < m) return out;
      dari += m;
    }
  }

  // dasborToko: penjualan bulan ini per kode dasar (tanpa warna), terbanyak dulu.
  async function dasborToko(sb, toko) {
    var hi = hari(Date.now()), awal = hi.slice(0, 8) + '01';
    var rows = await semua(function () { return sb.from('toko_jual_log').select('kode,nama_barang,qty_terjual').eq('toko', toko).gte('tanggal', awal).lte('tanggal', hi).order('id'); });
    var idx = {}, jual = [], qty = 0;
    rows.forEach(function (r) {
      var k = kodeDasar(r.kode), q = n(r.qty_terjual);
      qty += q;
      if (!(k in idx)) { idx[k] = jual.length; jual.push({ k: k, n: String(r.nama_barang || ''), q: 0 }); }
      jual[idx[k]].q += q;
    });
    jual.sort(function (a, b) { return b.q - a.q; });
    return { ok: true, jual: jual, qty: qty, bulan: hi.slice(5, 7) + '/' + hi.slice(0, 4), diperbarui: sekarang() };
  }

  // riwayatHitung: 30 sesi hitung stok terakhir toko ini.
  async function riwayatHitung(sb, toko) {
    var rows = await semua(function () { return sb.from('toko_hitung_log').select('waktu_hitung,kode,nama_barang,warna,qty_hitung,stok_sistem_saat_itu,pengisi,catatan').eq('toko', toko).order('id'); });
    var sesi = {}, urut = [];
    rows.forEach(function (r) {
      if (!r.waktu_hitung) return;
      var kode = kodeDasar(r.kode || ''), q = Number(r.qty_hitung);
      if (!kode || r.qty_hitung === null || r.qty_hitung === '' || !isFinite(q)) return;
      var ms = new Date(r.waktu_hitung).getTime();
      if (!sesi[ms]) {
        sesi[ms] = { ms: ms, t: jam(r.waktu_hitung), p: String(r.pengisi || '').replace(/^form:?\s*/, '').slice(0, 40), c: String(r.catatan || '').slice(0, 200), b: {} };
        urut.push(sesi[ms]);
      }
      var b = sesi[ms].b;
      if (!b[kode]) b[kode] = { k: kode, n: String(r.nama_barang || ''), h: 0, s: n(r.stok_sistem_saat_itu), w: [] };
      b[kode].h += q;
      var w = String(r.warna || '').trim().toUpperCase();
      if (w) b[kode].w.push({ w: w, q: q });
    });
    urut.sort(function (a, b) { return b.ms - a.ms; });
    return { ok: true, toko: toko, terpotong: urut.length > 30, diperbarui: sekarang(),
      sesi: urut.slice(0, 30).map(function (s) { return { t: s.t, p: s.p, c: s.c, items: Object.keys(s.b).map(function (k) { return s.b[k]; }) }; }) };
  }

  // riwayatLaporan (tampilan staf toko): semua laporan toko ini pada periode dari..sampai (menurut waktu pengisian).
  var BATAS = 400, BATAS_BARIS = 300;
  async function riwayatLaporan(sb, toko, p) {
    p = p || {};
    var re = /^\d{4}-\d{2}-\d{2}$/, dari = String(p.dari || ''), sampai = String(p.sampai || '');
    if (!re.test(dari) || !re.test(sampai)) return { ok: false, pesan: 'Tanggal tidak valid.' };
    if (dari > sampai) return { ok: false, pesan: 'Tanggal awal harus sebelum tanggal akhir.' };
    var a = dari + 'T00:00:00+08:00', b = sampai + 'T23:59:59.999+08:00';
    function q(tb, kol, w, kt) { return semua(function () { return sb.from(tb).select(kol).eq(kt || 'toko', toko).gte(w, a).lte(w, b).order('id'); }); }
    function akhir(tb, w, kt) { return sb.from(tb).select(w).eq(kt || 'toko', toko).not(w, 'is', null).order(w, { ascending: false }).limit(1); }
    var h = await Promise.all([
      q('toko_jual_log', 'tanggal,kode,nama_barang,qty_terjual,total,waktu_masuk,pengisi,warna,no_nota,diskon_persen', 'waktu_masuk'),
      q('toko_biaya_log', 'tanggal,keterangan,nominal,waktu_masuk,pengisi', 'waktu_masuk'),
      q('toko_retur_log', 'tanggal,kode,nama_barang,qty,nilai,waktu_masuk,pengisi,warna,kondisi,catatan', 'waktu_masuk'),
      q('toko_hitung_log', 'waktu_hitung,kode,nama_barang,warna,qty_hitung,pengisi,catatan', 'waktu_hitung'),
      q('order_log', 'no_order,tanggal,kode,nama,qty,total,status,waktu_masuk,pengisi,catatan', 'waktu_masuk', 'pelanggan'),
      q('toko_pinjam_log', 'no_pinjam,jenis,tanggal,kode,nama_barang,warna,qty,peminjam,catatan,waktu_masuk,pengisi', 'waktu_masuk'),
      q('toko_sesuai_log', 'no,waktu_ajuan,kode,nama_barang,warna,stok_sistem,hasil_hitung,selisih,alasan,pengaju,status', 'waktu_ajuan'),
      akhir('toko_jual_log', 'waktu_masuk'), akhir('toko_biaya_log', 'waktu_masuk'), akhir('toko_retur_log', 'waktu_masuk'), akhir('toko_hitung_log', 'waktu_hitung'),
      akhir('order_log', 'waktu_masuk', 'pelanggan'), akhir('toko_pinjam_log', 'waktu_masuk'), akhir('toko_sesuai_log', 'waktu_ajuan')
    ]);
    var akhirMs = 0;
    [[7, 'waktu_masuk'], [8, 'waktu_masuk'], [9, 'waktu_masuk'], [10, 'waktu_hitung'], [11, 'waktu_masuk'], [12, 'waktu_masuk'], [13, 'waktu_ajuan']].forEach(function (z) {
      var r = h[z[0]]; if (r.error) throw new Error(r.error.message);
      var w = r.data && r.data[0] && r.data[0][z[1]]; if (w) akhirMs = Math.max(akhirMs, new Date(w).getTime());
    });
    var grup = {}, urut = [];
    function masuk(jenis, waktu, pengisi, tetap) {
      if (!waktu) return null;
      var ms = new Date(waktu).getTime(), k = jenis + '|' + (tetap || (Math.floor(ms / 1000) + '|' + t(pengisi)));
      if (!grup[k]) { grup[k] = { j: jenis, toko: toko, ms: ms, w: jam(waktu), p: nama(pengisi), t: '', t1: '', t2: '', n: 0, q: 0, tot: 0, ket: '', items: [] }; urut.push(grup[k]); }
      return grup[k];
    }
    function tgl(g, v) { v = String(v || '').slice(0, 10); if (!v) return; if (!g.t1 || v < g.t1) g.t1 = v; if (!g.t2 || v > g.t2) g.t2 = v; }
    h[0].forEach(function (r) {
      var nota = t(r.no_nota), g = masuk('Penjualan', r.waktu_masuk, r.pengisi, nota ? 'nota|' + nota : ''); if (!g) return;
      tgl(g, r.tanggal); g.n++; g.q += n(r.qty_terjual); g.tot += n(r.total);
      if (nota) g.ket = 'Nota ' + nota + (n(r.diskon_persen) ? ', diskon ' + n(r.diskon_persen) + '%' : '');
      g.items.push({ k: t(r.kode), n: t(r.nama_barang), w: t(r.warna), q: n(r.qty_terjual), tot: n(r.total) });
    });
    h[1].forEach(function (r) {
      var g = masuk('Biaya', r.waktu_masuk, r.pengisi, ''); if (!g) return;
      tgl(g, r.tanggal); g.n++; g.tot += n(r.nominal);
      g.items.push({ k: '', n: t(r.keterangan), w: '', q: 0, tot: n(r.nominal) });
    });
    h[2].forEach(function (r) {
      var g = masuk('Return', r.waktu_masuk, r.pengisi, ''); if (!g) return;
      tgl(g, r.tanggal); g.n++; g.q += n(r.qty); g.tot += n(r.nilai);
      var c = t(r.catatan);
      g.items.push({ k: t(r.kode), n: t(r.nama_barang), w: t(r.warna), q: n(r.qty), tot: n(r.nilai), x: t(r.kondisi) + (c ? ' - ' + c : '') });
    });
    h[3].forEach(function (r) {
      var g = masuk('Hitung stok', r.waktu_hitung, r.pengisi, ''); if (!g) return;
      g.n++; g.q += n(r.qty_hitung);
      if (!g.ket && t(r.catatan)) g.ket = 'Catatan: ' + t(r.catatan);
      g.items.push({ k: t(r.kode), n: t(r.nama_barang), w: t(r.warna), q: n(r.qty_hitung) });
    });
    h[4].forEach(function (r) {
      var no = t(r.no_order); if (!no) return;
      var g = masuk('Re-stock', r.waktu_masuk, r.pengisi, 'no|' + no); if (!g) return;
      tgl(g, r.tanggal); g.n++; g.q += n(r.qty); g.tot += n(r.total);
      g.ket = 'No ' + no + ', status ' + (t(r.status) || 'Menunggu') + (t(r.catatan) ? ', catatan: ' + t(r.catatan) : '');
      g.items.push({ k: t(r.kode), n: t(r.nama), w: '', q: n(r.qty), tot: n(r.total) });
    });
    h[5].forEach(function (r) {
      var no = t(r.no_pinjam), jn = t(r.jenis).toUpperCase();
      var g = masuk('Stok dipinjam', r.waktu_masuk, r.pengisi, no ? 'no|' + no + '|' + jn : ''); if (!g) return;
      tgl(g, r.tanggal); g.n++; g.q += n(r.qty);
      g.ket = (jn === 'PINJAM' ? 'Dipinjam' : (jn ? jn.charAt(0) + jn.slice(1).toLowerCase() : 'Dipinjam')) +
        (t(r.peminjam) ? ' oleh ' + t(r.peminjam) : '') + (no ? ', no ' + no : '') + (t(r.catatan) ? ', catatan: ' + t(r.catatan) : '');
      g.items.push({ k: t(r.kode), n: t(r.nama_barang), w: t(r.warna), q: n(r.qty) });
    });
    h[6].forEach(function (r) {
      var no = t(r.no), g = masuk('Penyesuaian stok', r.waktu_ajuan, r.pengaju, no ? 'no|' + no : ''); if (!g) return;
      g.n++; g.q += n(r.hasil_hitung);
      g.ket = (no ? 'No ' + no + ', ' : '') + 'status ' + (t(r.status) || 'Menunggu') + (t(r.alasan) ? ', alasan: ' + t(r.alasan) : '');
      g.items.push({ k: t(r.kode), n: t(r.nama_barang), w: t(r.warna), q: n(r.hasil_hitung), x: 'stok sistem ' + n(r.stok_sistem) + ', selisih ' + n(r.selisih) });
    });
    urut.sort(function (x, y) { return y.ms - x.ms; });
    var rk = { toko: toko, akhir: akhirMs ? jam(akhirMs) : '', hari: akhirMs ? hari(akhirMs) : '', lap: 0, pcs: 0 };
    urut.forEach(function (g) {
      rk.lap++;
      if (g.j === 'Penjualan') rk.pcs += g.q;
      if (g.t1) { var x = tglId(g.t1), y = tglId(g.t2); g.t = x === y ? x : x + ' s/d ' + y; }
      delete g.t1; delete g.t2; delete g.ms;
      // Staf toko tidak melihat nominal, kecuali biaya yang memang mereka isi sendiri.
      if (g.j !== 'Biaya') { g.tot = null; g.items.forEach(function (it) { delete it.tot; }); }
      if (g.items.length > BATAS_BARIS) { g.lebih = g.items.length - BATAS_BARIS; g.items = g.items.slice(0, BATAS_BARIS); }
    });
    return { ok: true, admin: false, grup: urut.slice(0, BATAS), terpotong: urut.length > BATAS, jumlah: urut.length, ringkas: [rk], diperbarui: sekarang() };
  }

  window.TokoBaca = { dasborToko: dasborToko, riwayatHitung: riwayatHitung, riwayatLaporan: riwayatLaporan };
})();
