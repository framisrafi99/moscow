/* =====================================================================
   COCOKKAN UPLOAD CONSIGNMENT (Master Data › Penjualan › Cocokkan upload consignment)
   Membandingkan file pesanan marketplace yang diupload staf consignment (Shopee / Tokopedia)
   dengan laporan penjualan yang diisi staf. Data: rpc consignment_cocok(bulan).
   ===================================================================== */
(function () {
  var BLS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var HARUS = { 'Consignment Medan': ['Shopee', 'Tokopedia'], 'Consignment Sidoarjo': ['Shopee'] };
  var NAMA_PF = { Shopee: 'Shopee', Tokopedia: 'Tokopedia/TikTok' };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n) { return Math.round(Number(n) || 0).toLocaleString('id-ID'); }
  function rp(n) { n = Math.round(Number(n) || 0); return (n < 0 ? '−Rp' : 'Rp') + Math.abs(n).toLocaleString('id-ID'); }
  function tgl(d) { var p = String(d || '').slice(0, 10).split('-'); return p.length < 3 ? '–' : Number(p[2]) + ' ' + BLS[Number(p[1]) - 1]; }
  function jam(ts) { if (!ts) return ''; var d = new Date(ts), w = new Date(d.getTime() + 8 * 3600e3); return tgl(w.toISOString().slice(0, 10)) + ' ' + w.toISOString().slice(11, 16); }
  function sel(a, b) { var d = (Number(a) || 0) - (Number(b) || 0); return d ? '<b class="ck-x">' + (d > 0 ? '+' : '') + fmt(d) + '</b>' : '<span class="ck-ok">sama</span>'; }

  var CSS = '' +
    '.ck-tk{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 14px}.ck-tk button{height:40px;padding:0 16px;border:1px solid var(--garis);border-radius:999px;background:#fff;font-weight:700;font-size:14px;color:var(--teks2);cursor:pointer}' +
    '.ck-tk button[aria-pressed="true"]{background:var(--navy);border-color:var(--navy);color:#fff}' +
    '.ck-pf{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-bottom:14px}' +
    '.ck-pf>div{background:#fff;border:1px solid var(--garis);border-radius:14px;padding:14px 16px}.ck-pf>div.kosong{background:var(--kuningMuda);border-color:#F0D48A}' +
    '.ck-pf h4{margin:0 0 4px;font-size:15px;display:flex;justify-content:space-between;gap:8px}.ck-pf p{margin:2px 0;font-size:13px;color:var(--teks2)}' +
    '.ck-pf .besar{font-size:20px;font-weight:800;margin:4px 0}' +
    '.ck-x{color:var(--merah)}.ck-ok{color:var(--hijau);font-weight:700;font-size:12.5px}' +
    '.ck-t{width:100%;border-collapse:collapse;font-size:13.5px}.ck-t th{text-align:left;font-size:12px;color:var(--abu);padding:7px 8px 7px 0;border-bottom:1px solid var(--garis)}' +
    '.ck-t td{padding:8px 8px 8px 0;border-bottom:1px solid var(--garis2)}.ck-t .r{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}' +
    '.ck-t small{display:block;color:var(--abu);font-size:12px}.ck-t tr.beda td{background:#FFF8F0}' +
    '.ck-gl{overflow-x:auto;max-height:460px;overflow-y:auto}';

  var C = { el: null, sb: null, data: null, toko: 'Consignment Medan', bulan: '' };

  async function muat() {
    if (C.data) C.el.style.opacity = '.55';
    var r = await C.sb.rpc('consignment_cocok', { p_bulan: C.bulan });
    C.el.style.opacity = '';
    if (r.error) { C.el.innerHTML = '<div class="msg bad">Data gagal dimuat: ' + esc(r.error.message) + '</div>'; return; }
    C.data = r.data; gambar();
  }

  function gambar() {
    if (!document.getElementById('ckCss')) { var s = document.createElement('style'); s.id = 'ckCss'; s.textContent = CSS; document.head.appendChild(s); }
    var D = C.data, T = (D.toko || []).filter(function (x) { return x.toko === C.toko; })[0] || { file: [], staf: [], harian: [], barang: [], belumPadan: [] };
    var h = '<div class="ck-tk" role="group" aria-label="Pilih toko">' + (D.toko || []).map(function (x) {
      return '<button type="button" data-ck="' + esc(x.toko) + '" aria-pressed="' + (x.toko === C.toko) + '">' + esc(x.toko.replace('Consignment ', '')) + '</button>'; }).join('') + '</div>';
    h += '<p class="tl">' + esc(C.toko) + ' · ' + tgl(D.dari) + ' – ' + tgl(D.sampai) + '</p>';

    // Status file per platform
    var F = {}; T.file.forEach(function (f) { F[f.pf] = f; });
    var pfs = (HARUS[C.toko] || []).concat(Object.keys(F).filter(function (p) { return (HARUS[C.toko] || []).indexOf(p) < 0; }));
    h += '<div class="ck-pf">' + pfs.map(function (p) {
      var f = F[p];
      if (!f) return '<div class="kosong"><h4><span>File ' + esc(NAMA_PF[p] || p) + '</span></h4><p><b>Belum diupload</b> untuk bulan ini.</p><p>Minta staf upload file pesanan ' + esc(NAMA_PF[p] || p) + ' dari form toko (Penjualan &amp; Bagi Hasil).</p></div>';
      var telat = D.sampai && f.akhir && (new Date(D.sampai) - new Date(f.akhir)) / 864e5 >= 2;
      return '<div' + (telat ? ' class="kosong"' : '') + '><h4><span>File ' + esc(NAMA_PF[p] || p) + '</span><span style="font-weight:600;font-size:12.5px;color:var(--abu)">masuk ' + esc(jam(f.masuk)) + '</span></h4>' +
        '<p>Data pesanan <b>s/d ' + tgl(f.akhir) + '</b>' + (telat ? ' · <b class="ck-x">perlu upload terbaru</b>' : '') + '</p>' +
        '<div class="besar">' + rp(f.v) + '</div><p>' + fmt(f.psn) + ' pesanan · ' + fmt(f.pcs) + ' pcs' + (f.batal ? ' · ' + fmt(f.batal) + ' batal (tidak dihitung)' : '') + '</p>' +
        (f.tanpaKode ? '<p class="ck-x">' + fmt(f.tanpaKode) + ' pcs belum dipasangkan ke kode barang</p>' : '') + '</div>';
    }).join('') + '</div>';

    // Ringkasan: file vs laporan staf
    var fq = 0, fv = 0, sq = 0, sv = 0; T.file.forEach(function (f) { fq += +f.pcs || 0; fv += +f.v || 0; }); T.staf.forEach(function (s) { sq += +s.pcs || 0; sv += +s.v || 0; });
    var S = {}; T.staf.forEach(function (s) { S[s.sal] = s; });
    var baris = pfs.map(function (p) { var f = F[p] || {}, s = S[p] || {};
      return '<tr><td>' + esc(NAMA_PF[p] || p) + '</td><td class="r">' + fmt(f.pcs) + '</td><td class="r">' + fmt(s.pcs) + '</td><td class="r">' + sel(f.pcs, s.pcs) + '</td><td class="r">' + rp(f.v) + '</td><td class="r">' + rp(s.v) + '</td></tr>'; });
    T.staf.forEach(function (s) { if (pfs.indexOf(s.sal) >= 0) return;
      baris.push('<tr><td>' + esc(s.sal) + '<small>' + (s.sal === 'Tanpa saluran' ? 'laporan sebelum ada pilihan saluran (s/d ' + tgl(s.akhir) + ')' : 'tidak lewat marketplace') + '</small></td><td class="r">–</td><td class="r">' + fmt(s.pcs) + '</td><td class="r">–</td><td class="r">–</td><td class="r">' + rp(s.v) + '</td></tr>'); });
    baris.push('<tr style="font-weight:800"><td>TOTAL</td><td class="r">' + fmt(fq) + '</td><td class="r">' + fmt(sq) + '</td><td class="r">' + sel(fq, sq) + '</td><td class="r">' + rp(fv) + '</td><td class="r">' + rp(sv) + '</td></tr>');
    h += '<div class="cd"><div class="kpl"><h3>File marketplace vs laporan staf</h3><span class="sb">pcs terjual</span></div><div class="ck-gl"><table class="ck-t"><thead><tr><th>Saluran</th><th class="r">Pcs file</th><th class="r">Pcs laporan staf</th><th class="r">Selisih</th><th class="r">Omzet file</th><th class="r">Omzet laporan</th></tr></thead><tbody>' + baris.join('') + '</tbody></table></div>' +
      '<p class="sb" style="margin:8px 0 0">Selisih + berarti di file marketplace lebih banyak dari yang dilaporkan staf (kemungkinan ada penjualan belum dilaporkan). Omzet file memakai harga jual di marketplace (setelah diskon, tanpa pesanan batal); omzet laporan memakai harga jual daftar, jadi wajar sedikit berbeda.</p></div>';

    // Per hari
    var H = (T.harian || []).filter(function (x) { return x.fq || x.sq; });
    h += '<div class="cd"><div class="kpl"><h3>Per hari</h3><span class="sb">' + H.filter(function (x) { return x.fq !== x.sq; }).length + ' hari berbeda</span></div>' + (H.length ? '<div class="ck-gl"><table class="ck-t"><thead><tr><th>Tanggal</th><th class="r">Pcs file</th><th class="r">Pcs laporan</th><th class="r">Selisih</th><th class="r">Omzet file</th><th class="r">Omzet laporan</th></tr></thead><tbody>' +
      H.slice().reverse().map(function (x) { return '<tr' + (x.fq !== x.sq ? ' class="beda"' : '') + '><td>' + tgl(x.t) + '</td><td class="r">' + fmt(x.fq) + '</td><td class="r">' + fmt(x.sq) + '</td><td class="r">' + sel(x.fq, x.sq) + '</td><td class="r">' + rp(x.fv) + '</td><td class="r">' + rp(x.sv) + '</td></tr>'; }).join('') +
      '</tbody></table></div><p class="sb" style="margin:8px 0 0">Tanggal file = tanggal pesanan dibuat pembeli; staf bisa saja melaporkan di hari berikutnya, jadi selisih harian kecil yang saling menutup itu wajar.</p>' : '<div class="ksg">Belum ada data bulan ini.</div>') + '</div>';

    // Per barang
    var B = T.barang || [];
    h += '<div class="cd"><div class="kpl"><h3>Per barang</h3><span class="sb">' + B.filter(function (x) { return x.fq !== x.sq; }).length + ' barang berbeda · urut selisih terbesar</span></div>' + (B.length ? '<div class="ck-gl"><table class="ck-t"><thead><tr><th>Barang</th><th class="r">Pcs file</th><th class="r">Pcs laporan</th><th class="r">Selisih</th></tr></thead><tbody>' +
      B.map(function (x) { return '<tr' + (x.fq !== x.sq ? ' class="beda"' : '') + '><td>' + esc(x.n) + '<small>' + esc(x.k) + '</small></td><td class="r">' + fmt(x.fq) + '</td><td class="r">' + fmt(x.sq) + '</td><td class="r">' + sel(x.fq, x.sq) + '</td></tr>'; }).join('') +
      '</tbody></table></div>' : '<div class="ksg">Belum ada data barang.</div>') +
      (T.belumPadan && T.belumPadan.length ? '<details style="margin-top:10px"><summary style="cursor:pointer;font-weight:700;color:var(--biru);font-size:13px">' + T.belumPadan.length + ' produk marketplace belum dipasangkan ke kode barang ›</summary><div class="ck-gl"><table class="ck-t"><tbody>' +
        T.belumPadan.map(function (x) { return '<tr><td>' + esc(x.n) + '<small>' + esc(x.var || '') + '</small></td><td class="r">' + fmt(x.pcs) + ' pcs</td></tr>'; }).join('') +
        '</tbody></table></div><p class="sb">Pcs dari produk ini belum masuk perbandingan per barang (tetap terhitung di total). Pasangkan produknya ke kode barang di bagian Marketplace Master Data lama.</p></details>' : '') + '</div>';

    C.el.innerHTML = h;
    C.el.querySelectorAll('[data-ck]').forEach(function (b) { b.onclick = function () { C.toko = b.getAttribute('data-ck'); gambar(); }; });
  }

  window.CocokConsignment = { gambar: function (el, sb) { C.el = el; C.sb = sb; if (C.data) gambar(); else el.innerHTML = '<div class="ksg">Memuat data upload consignment…</div>'; muat(); } };
})();
