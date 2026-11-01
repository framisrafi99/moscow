/* =====================================================================
   UPLOAD LAPORAN DANA CAIR marketplace - Master Data aplikasi baru (2 Nov 2026)
   Pengganti layar "Laporan dana marketplace" di Bagi hasil consignment Master Data lama (file 76).
   Cara baca file SAMA PERSIS (DC_baca disalin apa adanya dari Apps Script). Simpan langsung di Supabase
   lewat rpc dana_cair_simpan (SQL 131); Apps Script menyalinnya ke sheet DANA_CAIR / DANA_CAIR_PESANAN.
   Toko: Consignment Medan (Shopee, Tokopedia/TikTok), Consignment Sidoarjo (Shopee), Official (Shopee, Tokopedia/TikTok).
   ===================================================================== */
(function () {
  var TOKO = { 'Consignment Medan': ['Shopee', 'Tokopedia'], 'Consignment Sidoarjo': ['Shopee'], 'Official': ['Shopee', 'Tokopedia', 'Lazada'] };
  var NAMA_PF = { Shopee: 'Shopee', Tokopedia: 'Tokopedia / TikTok Shop', Lazada: 'Lazada' };
  var BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var BLS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n) { n = Math.round(Number(n) || 0); return (n < 0 ? '-' : '') + Math.abs(n).toLocaleString('id-ID'); }
  function namaBulan(b) { var a = String(b || '').split('-'); return a.length === 2 ? BLN[Number(a[1]) - 1] + ' ' + a[0] : String(b || ''); }
  function tglIndo(s) { var a = String(s || '').split('-'); return a.length === 3 ? Number(a[2]) + ' ' + BLS[Number(a[1]) - 1] + ' ' + a[0] : String(s || ''); }
  function namaToko(t) { return t === 'Official' ? 'Moscow Supplies Official' : t; }
  function bulanLalu() { var d = new Date(Date.now() + 8 * 3600e3); d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 15)); return d.toISOString().slice(0, 7); }
  var S = { toko: 'Consignment Medan', bulan: bulanLalu(), prev: null, file: '', pesan: '', kelas: '', sibuk: false, ada: null, adaKunci: '' };
  try { var t0 = localStorage.getItem('dcToko'); if (TOKO[t0]) S.toko = t0; } catch (e) { }

  // ---------- pembaca file (DC_baca Apps Script file 76, tidak diubah) ----------
  function DC_baca(S) {
    function t(v) { return String(v === null || v === undefined ? '' : v).replace(/\s+/g, ' ').trim(); }
    function n(v) {
      if (typeof v === 'number') return isFinite(v) ? v : 0;
      var s = t(v).replace(/[^\d,.\-]/g, '');
      if (!s || s === '-') return 0;
      if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
      else s = s.replace(/,/g, '');
      var x = Number(s); return isFinite(x) ? x : 0;
    }
    function tgl(v) {
      if (v instanceof Date) { var m = v.getMonth() + 1, d = v.getDate(); return v.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d; }
      var s = t(v), a = s.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
      if (a) return a[1] + '-' + ('0' + a[2]).slice(-2) + '-' + ('0' + a[3]).slice(-2);
      a = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      if (a) return a[3] + '-' + ('0' + a[2]).slice(-2) + '-' + ('0' + a[1]).slice(-2);
      return '';
    }
    function cari(nama) { for (var k in S) if (t(k).toLowerCase() === nama.toLowerCase()) return S[k]; return null; }
    // baris berlabel: [kolom label, label, nilai angka terakhir di baris itu]
    function berlabel(rows) {
      var out = [], i, j, r, lab, kol, val;
      for (i = 0; i < rows.length; i++) {
        r = rows[i] || []; lab = ''; kol = -1; val = null;
        for (j = 0; j < r.length; j++) {
          if (lab === '' && typeof r[j] === 'string' && t(r[j]) !== '' && !/^-?[\d.,]+$/.test(t(r[j]))) { lab = t(r[j]); kol = j; continue; }
          if (lab !== '' && t(r[j]) !== '' ) val = r[j];
        }
        if (lab !== '') out.push({ i: i, kol: kol, lab: lab, v: val });
      }
      return out;
    }
    function nilai(L, label) {
      for (var i = 0; i < L.length; i++) if (L[i].lab.toLowerCase() === label.toLowerCase()) return L[i];
      return null;
    }
    // anak langsung dari baris induk (kolom label lebih dalam satu tingkat), berhenti di baris sejajar induk
    function anak(L, induk, ambilSemua) {
      var out = [], i, k = induk.kol, tingkat = null;
      for (i = L.indexOf(induk) + 1; i < L.length; i++) {
        if (L[i].kol <= k) break;
        if (tingkat === null) tingkat = L[i].kol;
        if (L[i].kol === tingkat && (ambilSemua || n(L[i].v) !== 0)) out.push({ n: L[i].lab, v: n(L[i].v) });
      }
      return out;
    }
    function bulanDari(dari, sampai) {
      if (!dari || !sampai) return { galat: 'Periode laporan tidak terbaca.' };
      if (dari.slice(0, 7) !== sampai.slice(0, 7)) return { galat: 'Periode laporan ' + dari + ' s/d ' + sampai + ' melewati dua bulan. Download ulang laporan untuk satu bulan saja (tanggal 1 sampai akhir bulan).' };
      return { bulan: dari.slice(0, 7) };
    }

    // ---------- Shopee ----------
    var sum = cari('Summary'), ph = cari('Penghasilan');
    if (sum && ph) {
      var L = berlabel(sum);
      var akun = nilai(L, 'Username (Penjual)'), dari = nilai(L, 'Dari'), ke = nilai(L, 'ke');
      if (!nilai(L, '3. Total yang Dilepas')) return { galat: 'File Shopee ini bukan "Laporan Penghasilan" (baris "Total yang Dilepas" tidak ada).' };
      var b = bulanDari(tgl(dari && dari.v), tgl(ke && ke.v)); if (b.galat) return b;
      var pend = nilai(L, '1. Total Pendapatan'), keluar = nilai(L, '2. Total Pengeluaran'), lepas = nilai(L, '3. Total yang Dilepas');
      // Di Shopee, rincian pengeluaran sejajar dengan induknya (kolom A), nilainya di kolom D: ambil sampai baris "3."
      var biaya = [];
      if (keluar) {
        for (var q = L.indexOf(keluar) + 1; q < L.length && L[q] !== lepas; q++) {
          if (L[q].kol === keluar.kol && n(L[q].v) !== 0) biaya.push({ n: L[q].lab, v: n(L[q].v) });
        }
      }
      var hargaAsli = nilai(L, 'Harga Asli Produk'), refund = nilai(L, 'Jumlah Pengembalian Dana ke Pembeli');
      // penyesuaian
      var adj = cari('Adjustment'), pen = 0, penRinci = [];
      if (adj) {
        var LA = berlabel(adj), tp = nilai(LA, 'Total Penyesuaian');
        if (tp) { pen = n(tp.v); penRinci = anak(LA, tp); }
      }
      // pesanan
      var hi = -1, c = {}, i, j, r;
      for (i = 0; i < Math.min(ph.length, 10); i++) {
        r = ph[i] || [];
        for (j = 0; j < r.length; j++) if (t(r[j]) === 'No. Pesanan') { hi = i; break; }
        if (hi >= 0) break;
      }
      if (hi < 0) return { galat: 'Sheet "Penghasilan" di file Shopee tidak punya kolom "No. Pesanan".' };
      for (j = 0; j < ph[hi].length; j++) { var nm = t(ph[hi][j]); if (nm && c[nm] === undefined) c[nm] = j; }
      var wajib = ['Lihat berdasarkan', 'No. Pesanan', 'Waktu Pesanan Dibuat', 'Tanggal Dana Dilepaskan', 'Total Penghasilan', 'Harga Produk'];
      for (j = 0; j < wajib.length; j++) if (c[wajib[j]] === undefined) return { galat: 'Kolom "' + wajib[j] + '" tidak ada di sheet Penghasilan.' };
      var psn = [], totRows = 0;
      for (i = hi + 1; i < ph.length; i++) {
        r = ph[i] || [];
        if (t(r[c['Lihat berdasarkan']]) !== 'Order') continue;
        var no = t(r[c['No. Pesanan']]); if (!no) continue;
        var dana = n(r[c['Total Penghasilan']]); totRows += dana;
        psn.push({ no: no, tp: tgl(r[c['Waktu Pesanan Dibuat']]), tc: tgl(r[c['Tanggal Dana Dilepaskan']]), h: n(r[c['Harga Produk']]),
          rf: c['Jumlah Pengembalian Dana ke Pembeli'] === undefined ? 0 : n(r[c['Jumlah Pengembalian Dana ke Pembeli']]), d: dana });
      }
      var cair = Math.round(n(lepas.v) + pen);
      return {
        platform: 'Shopee', akun: t(akun && akun.v), dari: tgl(dari.v), sampai: tgl(ke.v), bulan: b.bulan,
        harga: Math.round(n(hargaAsli && hargaAsli.v)), refund: Math.round(n(refund && refund.v)),
        pendapatan: Math.round(n(pend && pend.v)), biaya: biaya, biayaTot: Math.round(n(keluar && keluar.v)),
        dilepas: Math.round(n(lepas.v)), penyesuaian: Math.round(pen), penRinci: penRinci, cair: cair,
        pesanan: psn, jml: psn.length, cekBaris: Math.round(totRows), cocok: Math.round(totRows) === Math.round(n(lepas.v)),
        tarik: []
      };
    }

    // ---------- Tokopedia / TikTok Shop ----------
    var lap = cari('Laporan'), det = cari('Detail pesanan');
    if (lap && det) {
      var L2 = berlabel(lap), per = nilai(L2, 'Periode'), jp = nilai(L2, 'Jumlah penyelesaian pembayaran');
      if (!per || !jp) return { galat: 'File Tokopedia/TikTok ini tidak berisi "Periode" dan "Jumlah penyelesaian pembayaran".' };
      var pp = t(per.v).match(/(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\s*-\s*(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/);
      if (!pp) return { galat: 'Periode laporan Tokopedia tidak terbaca.' };
      var d2 = tgl(pp[1]), s2 = tgl(pp[2]), b2 = bulanDari(d2, s2); if (b2.galat) return b2;
      var tPend = nilai(L2, 'Total Pendapatan'), tBiaya = nilai(L2, 'Total Biaya'), tPen = nilai(L2, 'Penyesuaian');
      var sbd = nilai(L2, 'Subtotal sebelum diskon'), tRf = nilai(L2, 'Total pengembalian dana setelah diskon');
      var c2 = {}, h2 = det[0] || [], k2;
      for (k2 = 0; k2 < h2.length; k2++) { var nm2 = t(h2[k2]); if (nm2 && c2[nm2] === undefined) c2[nm2] = k2; }
      var w2 = ['ID Pesanan/Penyesuaian', 'Jenis transaksi', 'Jumlah penyelesaian pembayaran'];
      for (k2 = 0; k2 < w2.length; k2++) if (c2[w2[k2]] === undefined) return { galat: 'Kolom "' + w2[k2] + '" tidak ada di sheet Detail pesanan.' };
      var psn2 = [], tot2 = 0;
      for (i = 1; i < det.length; i++) {
        r = det[i] || [];
        var id = t(r[c2['ID Pesanan/Penyesuaian']]); if (!id) continue;
        var dn = n(r[c2['Jumlah penyelesaian pembayaran']]); tot2 += dn;
        psn2.push({ no: id, j: t(r[c2['Jenis transaksi']]), tp: tgl(r[c2['Waktu pemesanan']]), tc: tgl(r[c2['Waktu pembayaran pesanan']]),
          h: n(r[c2['Subtotal setelah diskon penjual']]), rf: n(r[c2['Total pengembalian dana setelah diskon']]), d: dn });
      }
      var tarik = [], rw = cari('Riwayat penarikan');
      if (rw && rw.length > 1) {
        var c3 = {}; for (k2 = 0; k2 < rw[0].length; k2++) c3[t(rw[0][k2])] = k2;
        for (i = 1; i < rw.length; i++) {
          r = rw[i] || []; if (!t(r[c3['Total']])) continue;
          if (!/withdraw|penarikan/i.test(t(r[c3['Jenis transaksi']])) || !/transferred|berhasil|sukses/i.test(t(r[c3['Status']]))) continue;
          tarik.push({ t: tgl(r[c3['Waktu permintaan']]), v: Math.abs(Math.round(n(r[c3['Total']]))), st: t(r[c3['Status']]), rek: t(r[c3['Rekening bank']]).replace(/[^\d]/g, '').slice(-4) });
        }
      }
      var jmlP = psn2.filter(function (x) { return /pesanan/i.test(x.j); }).length;
      return {
        platform: 'Tokopedia', akun: '', dari: d2, sampai: s2, bulan: b2.bulan,
        harga: Math.round(n(sbd && sbd.v)), refund: Math.round(n(tRf && tRf.v)),
        pendapatan: Math.round(n(tPend && tPend.v)), biaya: tBiaya ? anak(L2, tBiaya) : [], biayaTot: Math.round(n(tBiaya && tBiaya.v)),
        dilepas: Math.round(n(jp.v)) - Math.round(n(tPen && tPen.v)), penyesuaian: Math.round(n(tPen && tPen.v)), penRinci: tPen ? anak(L2, tPen) : [],
        cair: Math.round(n(jp.v)), pesanan: psn2, jml: jmlP, cekBaris: Math.round(tot2), cocok: Math.round(tot2) === Math.round(n(jp.v)), tarik: tarik
      };
    }
    return { galat: 'Format file tidak dikenali. Pakai "Laporan Penghasilan" dari Shopee (Keuangan > Penghasilan Saya > Laporan) atau laporan penyelesaian dari Tokopedia/TikTok Shop (Keuangan > Laporan).' };
  }

  function muatXlsx() {
    return new Promise(function (ok, gagal) {
      if (window.XLSX) { ok(); return; }
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = function () { ok(); }; s.onerror = function () { gagal(new Error('Gagal memuat pembaca file Excel. Periksa internet lalu coba lagi.')); };
      document.head.appendChild(s);
    });
  }
  function perbaikiRef(ws) {
    var r = -1, c = -1, k, a;
    for (k in ws) { if (k.charAt(0) === '!') continue; a = XLSX.utils.decode_cell(k); if (a.r > r) r = a.r; if (a.c > c) c = a.c; }
    if (r >= 0) ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r, c: c } });
  }

  async function muatAda(opsi) {
    var k = S.toko + '|' + S.bulan; if (S.adaKunci === k && S.ada) return;
    var r = await opsi.sb.from('dana_cair').select('bulan,platform,akun_toko,dari,sampai,total_pendapatan,total_biaya,penyesuaian,dana_cair,jumlah_pesanan,nama_file,diupload_oleh,waktu_upload')
      .eq('toko', S.toko).eq('bulan', S.bulan);
    S.ada = {}; S.adaKunci = k;
    (r.data || []).forEach(function (x) { S.ada[x.platform] = x; });
  }

  function isiPrev(p) {
    var h = '<div style="border-top:1px solid var(--garis);padding-top:12px"><b>Periksa dulu sebelum disimpan</b>' +
      '<div class="up-pv"><div><span>Disimpan untuk</span><b style="font-size:15px">' + esc(namaToko(S.toko)) + ' · ' + esc(NAMA_PF[p.platform] || p.platform) + '</b></div>' +
      '<div><span>Periode laporan</span><b style="font-size:15px">' + esc(tglIndo(p.dari)) + ' – ' + esc(tglIndo(p.sampai)) + '</b></div>' +
      (p.akun ? '<div><span>Akun toko</span><b style="font-size:15px">' + esc(p.akun) + '</b></div>' : '') + '</div>';
    h += '<table class="tabel"><tbody>' +
      '<tr><td>Harga produk<small>' + fmt(p.jml) + ' pesanan</small></td><td class="r angka">' + fmt(p.harga) + '</td></tr>' +
      (p.refund ? '<tr><td>Pengembalian dana ke pembeli</td><td class="r angka">' + fmt(p.refund) + '</td></tr>' : '') +
      '<tr><td>Total pendapatan</td><td class="r angka">' + fmt(p.pendapatan) + '</td></tr>';
    p.biaya.forEach(function (b) { h += '<tr><td><small style="display:inline">' + esc(b.n) + '</small></td><td class="r angka">' + fmt(b.v) + '</td></tr>'; });
    h += '<tr><td>Total potongan platform' + (p.pendapatan ? '<small>' + String(Math.round(Math.abs(p.biayaTot) / p.pendapatan * 1000) / 10).replace('.', ',') + '% dari pendapatan</small>' : '') + '</td><td class="r angka">' + fmt(p.biayaTot) + '</td></tr>';
    p.penRinci.forEach(function (b) { h += '<tr><td><small style="display:inline">Penyesuaian: ' + esc(b.n) + '</small></td><td class="r angka">' + fmt(b.v) + '</td></tr>'; });
    h += '<tr><td><b>DANA CAIR</b></td><td class="r angka"><b>' + fmt(p.cair) + '</b></td></tr></tbody></table>';
    if (!p.cocok) h += '<div class="msg w" style="margin:6px 0 0">Jumlah per pesanan (' + fmt(p.cekBaris) + ') tidak sama dengan total laporan. Ringkasan tetap memakai total laporan.</div>';
    if (p.tarik && p.tarik.length) h += '<p class="sb" style="margin:6px 0 0">Penarikan di laporan: ' + esc(p.tarik.map(function (t) { return tglIndo(t.t) + ' Rp ' + fmt(t.v) + (t.rek ? ' (****' + t.rek + ')' : ''); }).join(' | ')) + '</p>';
    var lama = S.ada && S.ada[p.platform];
    if (lama) h += '<div class="msg w" style="margin:6px 0 0">Laporan ' + esc(NAMA_PF[p.platform]) + ' ' + esc(namaBulan(p.bulan)) + ' sudah pernah diupload (dana cair ' + fmt(lama.dana_cair) + '). Menyimpan akan menggantikannya.</div>';
    h += '<div class="up-tb"><button type="button" class="tbl pri" id="dcSimpan"' + (S.sibuk ? ' disabled' : '') + '>Simpan laporan dana</button><button type="button" class="tbl" id="dcBatal"' + (S.sibuk ? ' disabled' : '') + '>Batal</button></div></div>';
    return h;
  }

  async function gambar(el, opsi) {
    if (!el) return;
    try { await muatAda(opsi); } catch (e) { S.ada = {}; }
    var pasar = TOKO[S.toko], h = '';
    h += '<div class="cd"><div class="kpl"><h3>Upload dana cair</h3><span class="sb">Laporan penghasilan / penyelesaian marketplace satu bulan</span></div>' +
      '<p class="sb" style="margin:0">Shopee: Keuangan › Penghasilan Saya › Laporan (file "Laporan Penghasilan"). Tokopedia / TikTok Shop: Keuangan › Laporan (laporan penyelesaian). ' +
      'Download untuk satu bulan penuh (tanggal 1 sampai akhir bulan). Upload ulang bulan yang sama menggantikan data lama.</p>' +
      '<div class="up-kotak"><label>Toko<select id="dcToko"' + (S.sibuk ? ' disabled' : '') + '>' + Object.keys(TOKO).map(function (t) { return '<option value="' + esc(t) + '"' + (t === S.toko ? ' selected' : '') + '>' + esc(namaToko(t)) + '</option>'; }).join('') + '</select></label>' +
      '<label>Bulan<input type="month" id="dcBulan" value="' + esc(S.bulan) + '"' + (S.sibuk ? ' disabled' : '') + '></label>' +
      '<label>File laporan dana<input type="file" id="dcFile" accept=".xlsx,.xls"' + (S.sibuk ? ' disabled' : '') + '></label></div>';
    h += '<table class="tabel"><thead><tr><th>Platform</th><th class="r">Dana cair</th><th class="r">Potongan platform</th><th>Sumber</th></tr></thead><tbody>' + pasar.map(function (pf) {
      var f = S.ada && S.ada[pf];
      if (pf === 'Lazada') return '<tr><td><b>Lazada</b></td><td colspan="3"><span class="sb">Format laporan Lazada belum dikenali. Kirim contoh filenya ke pembuat sistem.</span></td></tr>';
      if (!f) return '<tr><td><b>' + esc(NAMA_PF[pf]) + '</b></td><td colspan="3"><span style="color:var(--kuning)">Belum diupload untuk ' + esc(namaBulan(S.bulan)) + '</span></td></tr>';
      var pct = f.total_pendapatan ? String(Math.round(Math.abs(f.total_biaya) / f.total_pendapatan * 1000) / 10).replace('.', ',') + '% dari pendapatan' : '';
      return '<tr><td><b>' + esc(NAMA_PF[pf]) + '</b><small>' + fmt(f.jumlah_pesanan) + ' pesanan</small></td><td class="r angka">' + fmt(f.dana_cair) + (f.penyesuaian ? '<small>termasuk penyesuaian ' + fmt(f.penyesuaian) + '</small>' : '') + '</td>' +
        '<td class="r angka">' + fmt(f.total_biaya) + (pct ? '<small>' + pct + '</small>' : '') + '</td><td><small style="display:block">' + esc(f.nama_file || 'upload') + '</small><small>' + esc(f.diupload_oleh || '') + '</small></td></tr>';
    }).join('') + '</tbody></table>';
    if (S.pesan) h += '<div class="msg ' + (S.kelas || 'tunggu') + '" style="margin:0">' + S.pesan + '</div>';
    if (S.prev) h += isiPrev(S.prev);
    h += '</div>';
    el.innerHTML = h;
    var q = function (i) { return el.querySelector('#' + i); };
    q('dcToko').onchange = function () { S.toko = this.value; S.prev = null; S.pesan = ''; try { localStorage.setItem('dcToko', S.toko); } catch (e) { } gambar(el, opsi); };
    q('dcBulan').onchange = function () { if (/^\d{4}-\d{2}$/.test(this.value)) { S.bulan = this.value; S.prev = null; S.pesan = ''; gambar(el, opsi); } };
    q('dcFile').onchange = function () { pilihFile(this.files && this.files[0], el, opsi); };
    if (q('dcBatal')) q('dcBatal').onclick = function () { S.prev = null; S.pesan = ''; gambar(el, opsi); };
    if (q('dcSimpan')) q('dcSimpan').onclick = function () { simpan(el, opsi, false); };
  }
  function pesan(el, opsi, t, k) { S.pesan = t; S.kelas = k || ''; gambar(el, opsi); }

  async function pilihFile(f, el, opsi) {
    S.prev = null;
    if (!f) { pesan(el, opsi, ''); return; }
    S.file = f.name;
    pesan(el, opsi, 'Membaca file…');
    try {
      await muatXlsx();
      var buf = await f.arrayBuffer();
      var wb = XLSX.read(new Uint8Array(buf), { type: 'array', cellDates: true }), D = {};
      wb.SheetNames.forEach(function (n) { var ws = wb.Sheets[n]; perbaikiRef(ws); D[n] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' }); });
      var r = DC_baca(D);
      if (r.galat) { pesan(el, opsi, esc(r.galat), 'bad'); return; }
      if (TOKO[S.toko].indexOf(r.platform) < 0) { pesan(el, opsi, esc(namaToko(S.toko) + ' tidak memakai ' + (NAMA_PF[r.platform] || r.platform) + '. Pilih toko yang benar.'), 'bad'); return; }
      if (r.bulan !== S.bulan) { S.bulan = r.bulan; S.ada = null; S.adaKunci = ''; }
      S.prev = r; S.pesan = 'File ini laporan <b>' + esc(namaBulan(r.bulan)) + '</b>.'; S.kelas = 'tunggu';
      gambar(el, opsi);
    } catch (err) { pesan(el, opsi, 'File tidak bisa dibaca: ' + esc(err && err.message ? err.message : err), 'bad'); }
  }

  async function simpan(el, opsi, yakin) {
    var p = S.prev; if (!p || S.sibuk) return;
    S.sibuk = true; pesan(el, opsi, 'Menyimpan…');
    var r = await opsi.sb.rpc('dana_cair_simpan', { p_toko: S.toko, p_data: p, p_file: S.file, p_yakin: !!yakin });
    S.sibuk = false;
    if (r.error) { pesan(el, opsi, 'Gagal menyimpan: ' + esc(r.error.message), 'bad'); return; }
    var d = r.data || {};
    if (d.perluYakin) {
      if (confirm(d.pesan + '\n\nTetap simpan?')) { simpan(el, opsi, true); return; }
      pesan(el, opsi, 'Dibatalkan.', 'w'); return;
    }
    if (!d.ok) { pesan(el, opsi, esc(d.pesan || 'Gagal menyimpan.'), 'bad'); return; }
    S.prev = null; S.ada = null; S.adaKunci = '';
    pesan(el, opsi, esc(d.pesan) + (S.toko === 'Official' ? ' Potongan platform Official ikut tercatat di laporan bulanan.' : ' Hitungan bagi hasil dan invoice toko ikut memakai angka ini.'), 'ok');
    if (opsi.selesai) opsi.selesai();
  }

  window.DanaCair = { gambar: gambar, baca: DC_baca };
})();
