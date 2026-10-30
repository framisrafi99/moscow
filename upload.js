/* =====================================================================
   UPLOAD PENJUALAN HARIAN (file ekspor pesanan marketplace) - Master Data aplikasi baru
   Cara baca file sama persis dengan menu "Laporan Marketplace" Master Data lama (file 38).
   Penyimpanan tetap lewat fungsi server yang sama (mpUpload), lalu server langsung menyalin
   tabel pesanan ke Supabase, jadi angka Beranda ikut berubah saat itu juga.
   ===================================================================== */
(function () {
  var TOKO = { 'Official': ['Shopee', 'Tokopedia', 'Lazada'], 'Consignment Medan': ['Shopee', 'Tokopedia'], 'Consignment Sidoarjo': ['Shopee'] };
  var NAMA_PF = { Shopee: 'Shopee', Tokopedia: 'Tokopedia / TikTok Shop', Lazada: 'Lazada' };
  var BLS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n) { return Math.round(Number(n) || 0).toLocaleString('id-ID'); }
  function tglTampil(s) { var a = String(s || '').split('-'); return a.length === 3 ? Number(a[2]) + ' ' + BLS[Number(a[1]) - 1] + ' ' + a[0] : String(s || ''); }
  function namaToko(t) { return t === 'Official' ? 'Moscow Supplies Official' : t; }

  // ---------- pembaca file (disalin dari Master Data lama) ----------
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function tglJam(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function teks(v) {
    if (v === null || v === undefined) return '';
    if (v instanceof Date) return tglJam(v);
    return String(v).split(String.fromCharCode(13)).join(' ').split(String.fromCharCode(10)).join(' ').trim();
  }
  function angka(v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    var s = teks(v).split('Rp').join('').split(' ').join(''), t, k, b;
    if (!s) return 0;
    t = s.indexOf('.'); k = s.indexOf(',');
    if (t !== -1 && k !== -1) { s = t < k ? s.split('.').join('').split(',').join('.') : s.split(',').join(''); }
    else if (k !== -1) { b = s.split(','); s = (b.length > 2 || b[1].length === 3) ? b.join('') : b.join('.'); }
    else if (t !== -1) { b = s.split('.'); if (b.length > 2 || b[1].length === 3) s = b.join(''); }
    var x = Number(s);
    return isFinite(x) ? x : 0;
  }
  function jam(v) {
    if (v instanceof Date) return tglJam(v);
    if (typeof v === 'number' && v > 20000 && v < 80000) {
      var d = new Date(Math.round((v - 25569) * 86400000));
      return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + ' ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes());
    }
    var s = teks(v);
    if (s.length >= 10 && s.charAt(4) === '-' && s.charAt(7) === '-') return s.slice(0, 16);
    if (s.length >= 10 && s.charAt(2) === '/' && s.charAt(5) === '/') return s.slice(6, 10) + '-' + s.slice(3, 5) + '-' + s.slice(0, 2) + s.slice(10, 16);
    return '';
  }
  var BLN = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', mei: '05', jun: '06', jul: '07', aug: '08', agu: '08', agt: '08', sep: '09', oct: '10', okt: '10', nov: '11', dec: '12', des: '12' };
  function jam2(v) {
    var a = jam(v);
    if (a) return a;
    var s = teks(v), m = s.match(/^(\d{1,2})\s+([A-Za-z]{3})[A-Za-z]*\s+(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
    if (!m || !BLN[m[2].toLowerCase()]) return '';
    return m[3] + '-' + BLN[m[2].toLowerCase()] + '-' + pad(Number(m[1])) + (m[4] ? ' ' + pad(Number(m[4])) + ':' + m[5] : ' 00:00');
  }
  function perbaikiRef(ws) {
    var r = -1, c = -1, k, a;
    for (k in ws) {
      if (k.charAt(0) === '!') continue;
      a = XLSX.utils.decode_cell(k);
      if (a.r > r) r = a.r;
      if (a.c > c) c = a.c;
    }
    if (r >= 0) ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r, c: c } });
  }
  function kepala(rows, wajib) {
    var i, j, r, nama, c;
    for (i = 0; i < Math.min(rows.length, 6); i++) {
      r = rows[i] || []; nama = []; c = {};
      for (j = 0; j < r.length; j++) { nama.push(teks(r[j])); if (c[nama[j]] === undefined) c[nama[j]] = j; }
      var ok = true;
      for (j = 0; j < wajib.length; j++) if (c[wajib[j]] === undefined) { ok = false; break; }
      if (ok) return { hi: i, c: c };
    }
    return null;
  }
  function rangkum(peta, urut, psn, batal, pcs, dari, sampai) {
    var lines = [], i, nb = 0, n;
    for (i = 0; i < urut.length; i++) lines.push(peta[urut[i]]);
    if (!lines.length) return { galat: 'Tidak ada baris pesanan yang bisa dibaca di file ini.' };
    for (n in batal) if (!psn[n]) nb++;
    return { lines: lines, psn: Object.keys(psn).length, batal: nb, pcs: pcs, dari: dari, sampai: sampai };
  }
  function bacaShopee(rows) {
    var hi = -1, i, j, c = {}, r;
    for (i = 0; i < Math.min(rows.length, 6); i++) {
      r = rows[i] || [];
      var nama = [];
      for (j = 0; j < r.length; j++) nama.push(teks(r[j]));
      if (nama.indexOf('No. Pesanan') !== -1 && nama.indexOf('Nama Produk') !== -1) { hi = i; for (j = 0; j < nama.length; j++) if (c[nama[j]] === undefined) c[nama[j]] = j; break; }
    }
    if (hi === -1) return { galat: 'Ini bukan file ekspor pesanan Shopee (kolom "No. Pesanan" dan "Nama Produk" tidak ditemukan).' };
    var wajib = ['Status Pesanan', 'Waktu Pesanan Dibuat', 'Jumlah'];
    for (i = 0; i < wajib.length; i++) if (c[wajib[i]] === undefined) return { galat: 'Kolom "' + wajib[i] + '" tidak ada di file.' };
    function ambil(r, n) { return c[n] === undefined ? '' : r[c[n]]; }
    var peta = {}, urut = [], psn = {}, batal = {}, pcs = 0, dari = '', sampai = '';
    for (i = hi + 1; i < rows.length; i++) {
      r = rows[i] || [];
      var no = teks(ambil(r, 'No. Pesanan'));
      if (!no) continue;
      var st = teks(ambil(r, 'Status Pesanan')), dib = jam(ambil(r, 'Waktu Pesanan Dibuat'));
      var nm = teks(ambil(r, 'Nama Produk')), vr = teks(ambil(r, 'Nama Variasi'));
      var q = angka(ambil(r, 'Jumlah')), ret = angka(ambil(r, 'Returned quantity'));
      if (!nm || !dib || !(q > 0)) continue;
      var key = no + '|' + nm + '|' + vr;
      if (peta[key]) { peta[key][7] += q; peta[key][8] += ret; peta[key][11] += angka(ambil(r, 'Subtotal Pesanan')); }
      else {
        peta[key] = [no, st, dib, jam(ambil(r, 'Waktu Pengiriman Diatur')), jam(ambil(r, 'Waktu Pesanan Selesai')), nm, vr, q, ret,
          angka(ambil(r, 'Harga Awal')), angka(ambil(r, 'Harga Setelah Diskon')), angka(ambil(r, 'Subtotal Pesanan'))];
        urut.push(key);
      }
      var lo = st.toLowerCase();
      if (lo.indexOf('batal') !== -1) batal[no] = 1;
      else if (lo.indexOf('belum bayar') === -1) { psn[no] = 1; pcs += q - ret; }
      var t = dib.slice(0, 10);
      if (!dari || t < dari) dari = t;
      if (!sampai || t > sampai) sampai = t;
    }
    return rangkum(peta, urut, psn, batal, pcs, dari, sampai);
  }
  function bacaTokopedia(rows) {
    var K = kepala(rows, ['Order ID', 'Order Status', 'Product Name', 'Quantity', 'Created Time']);
    if (!K) return { galat: 'Ini bukan file ekspor pesanan Tokopedia / TikTok Shop (kolom "Order ID", "Product Name", "Quantity" tidak ditemukan).' };
    var c = K.c, i, r;
    function ambil(r, n) { return c[n] === undefined ? '' : r[c[n]]; }
    var peta = {}, urut = [], psn = {}, batal = {}, pcs = 0, dari = '', sampai = '';
    for (i = K.hi + 1; i < rows.length; i++) {
      r = rows[i] || [];
      var no = teks(ambil(r, 'Order ID'));
      if (!/^\d{6,}$/.test(no)) continue;
      var st = teks(ambil(r, 'Order Status')), tipe = teks(ambil(r, 'Cancelation/Return Type'));
      var dib = jam2(ambil(r, 'Created Time'));
      var nm = teks(ambil(r, 'Product Name')), vr = teks(ambil(r, 'Variation'));
      var q = angka(ambil(r, 'Quantity'));
      var batalkah = /cancel/i.test(st);
      var ret = batalkah ? 0 : angka(ambil(r, 'Sku Quantity of return'));
      if (!nm || !dib || !(q > 0)) continue;
      if (ret > q) ret = q;
      var sub = angka(ambil(r, 'SKU Subtotal After Discount'));
      var stSimpan = st + (tipe && !batalkah ? ' (' + tipe + ')' : '');
      var key = no + '|' + nm + '|' + vr;
      if (peta[key]) { peta[key][7] += q; peta[key][8] += ret; peta[key][11] += sub; peta[key][10] = peta[key][7] ? peta[key][11] / peta[key][7] : 0; }
      else {
        peta[key] = [no, stSimpan, dib, jam2(ambil(r, 'Shipped Time')), jam2(ambil(r, 'Delivered Time')), nm, vr, q, ret,
          angka(ambil(r, 'SKU Unit Original Price')), q ? sub / q : 0, sub];
        urut.push(key);
      }
      if (batalkah) batal[no] = 1;
      else if (!/unpaid|belum bayar/i.test(st)) { psn[no] = 1; pcs += q - ret; }
      var t = dib.slice(0, 10);
      if (!dari || t < dari) dari = t;
      if (!sampai || t > sampai) sampai = t;
    }
    return rangkum(peta, urut, psn, batal, pcs, dari, sampai);
  }
  function bacaLazada(rows) {
    var K = kepala(rows, ['orderNumber', 'itemName', 'status', 'createTime']);
    if (!K) return { galat: 'Ini bukan file ekspor pesanan Lazada (kolom "orderNumber", "itemName", "status" tidak ditemukan).' };
    var c = K.c, i, r;
    function ambil(r, n) { return c[n] === undefined ? '' : r[c[n]]; }
    var grp = {}, urut = [], psn = {}, batal = {}, pcs = 0, dari = '', sampai = '';
    for (i = K.hi + 1; i < rows.length; i++) {
      r = rows[i] || [];
      var no = teks(ambil(r, 'orderNumber'));
      if (!no) continue;
      var st = teks(ambil(r, 'status')), lo = st.toLowerCase();
      var dib = jam2(ambil(r, 'createTime'));
      var nm = teks(ambil(r, 'itemName')), vr = teks(ambil(r, 'variation'));
      if (!nm || !dib) continue;
      var key = no + '|' + nm + '|' + vr;
      var g = grp[key];
      if (!g) { g = grp[key] = { no: no, dib: dib, nm: nm, vr: vr, aktif: 0, batal: 0, ret: 0, bayar: 0, bayarB: 0, awal: 0, st: '', stB: st, kir: '', sel: '' }; urut.push(key); }
      var bayar = angka(ambil(r, 'paidPrice'));
      g.awal = angka(ambil(r, 'unitPrice')) || g.awal;
      if (/cancel/.test(lo)) { g.batal++; g.bayarB += bayar; batal[no] = 1; }
      else {
        g.aktif++; g.bayar += bayar; g.st = st;
        if (/return/.test(lo)) g.ret++;
        if (/shipped|delivered|return|lost|damaged/.test(lo)) g.kir = jam2(ambil(r, 'updateTime')) || dib;
        if (/delivered/.test(lo)) g.sel = jam2(ambil(r, 'deliveredDate')) || g.kir;
        if (!/unpaid|pending/.test(lo)) { psn[no] = 1; pcs += /return/.test(lo) ? 0 : 1; }
      }
      var t = dib.slice(0, 10);
      if (!dari || t < dari) dari = t;
      if (!sampai || t > sampai) sampai = t;
    }
    var peta = {};
    for (i = 0; i < urut.length; i++) {
      var x = grp[urut[i]];
      peta[urut[i]] = x.aktif > 0
        ? [x.no, x.st, x.dib, x.kir, x.sel, x.nm, x.vr, x.aktif, x.ret, x.awal, x.bayar / x.aktif, x.bayar]
        : [x.no, x.stB, x.dib, '', '', x.nm, x.vr, x.batal, 0, x.awal, x.bayarB / x.batal, x.bayarB];
    }
    return rangkum(peta, urut, psn, batal, pcs, dari, sampai);
  }
  function bacaFile(pf, rows) {
    if (pf === 'Shopee') return bacaShopee(rows);
    if (pf === 'Tokopedia') return bacaTokopedia(rows);
    if (pf === 'Lazada') return bacaLazada(rows);
    return { galat: 'Format ' + pf + ' belum didukung.' };
  }
  function muatXlsx(cb, gagal) {
    if (window.XLSX) { cb(); return; }
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = function () { cb(); };
    s.onerror = function () { gagal('Gagal memuat pembaca file Excel. Periksa internet lalu coba lagi.'); };
    document.head.appendChild(s);
  }

  // ---------- tampilan ----------
  var S = { toko: 'Official', pf: 'Shopee', prev: null, sibuk: false, pesan: '', kelas: '' };
  try { S.toko = localStorage.getItem('upToko') || S.toko; if (!TOKO[S.toko]) S.toko = 'Official'; S.pf = localStorage.getItem('upPf') || S.pf; } catch (e) { }
  if (TOKO[S.toko].indexOf(S.pf) < 0) S.pf = TOKO[S.toko][0];

  var CSS = '.up-kotak{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;align-items:end}' +
    '.up-kotak label{display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:700;color:var(--teks2)}' +
    '.up-kotak select,.up-kotak input[type=file]{height:44px;padding:0 12px;border:1px solid var(--garis);border-radius:12px;background:#fff;font:inherit;font-weight:600}' +
    '.up-kotak input[type=file]{padding:9px 10px;height:auto}' +
    '.up-pv{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:4px 0}' +
    '.up-pv div{background:#F7F9FB;border-radius:12px;padding:12px 14px}.up-pv span{display:block;font-size:12.5px;color:var(--abu)}.up-pv b{font-size:18px;font-variant-numeric:tabular-nums}' +
    '.up-tb{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}' +
    '.up-lk{color:var(--biru);font-weight:700}';

  function gambar(el, opsi) {
    if (!document.getElementById('upCss')) { var s = document.createElement('style'); s.id = 'upCss'; s.textContent = CSS; document.head.appendChild(s); }
    var p = S.prev, h = '';
    h += '<div class="cd"><div class="kpl"><h3>Upload penjualan harian</h3><span class="sb">File ekspor pesanan Shopee, Tokopedia / TikTok Shop, Lazada</span></div>' +
      '<p class="sb" style="margin:0">Shopee: Seller Center › Pesanan Saya › Ekspor. Tokopedia / TikTok Shop dan Lazada: Seller Center › Pesanan › Ekspor (file .xlsx). ' +
      'File dengan rentang tanggal yang sama boleh diunggah berulang kali: pesanan yang sudah ada hanya diperbarui statusnya. Data pembeli tidak disimpan.</p>' +
      '<div class="up-kotak"><label>Toko<select id="upToko"' + (S.sibuk ? ' disabled' : '') + '>' + Object.keys(TOKO).map(function (t) { return '<option value="' + esc(t) + '"' + (t === S.toko ? ' selected' : '') + '>' + esc(namaToko(t)) + '</option>'; }).join('') + '</select></label>' +
      '<label>Platform<select id="upPf"' + (S.sibuk ? ' disabled' : '') + '>' + TOKO[S.toko].map(function (x) { return '<option value="' + x + '"' + (x === S.pf ? ' selected' : '') + '>' + esc(NAMA_PF[x]) + '</option>'; }).join('') + '</select></label>' +
      '<label>File ekspor pesanan<input type="file" id="upFile" accept=".xlsx,.xls,.csv"' + (S.sibuk ? ' disabled' : '') + '></label></div>';
    if (S.pesan) h += '<div class="msg ' + (S.kelas || 'tunggu') + '" style="margin:0">' + S.pesan + '</div>';
    if (p) {
      h += '<div style="border-top:1px solid var(--garis);padding-top:12px"><b>Periksa dulu sebelum disimpan</b>' +
        '<div class="up-pv"><div><span>Disimpan untuk</span><b style="font-size:15px">' + esc(namaToko(p.toko)) + ' · ' + esc(NAMA_PF[p.pf]) + '</b></div>' +
        '<div><span>Periode pesanan</span><b style="font-size:15px">' + esc(tglTampil(p.dari)) + ' – ' + esc(tglTampil(p.sampai)) + '</b></div>' +
        '<div><span>Pesanan</span><b>' + fmt(p.psn) + '</b></div><div><span>Pesanan batal</span><b>' + fmt(p.batal) + '</b></div><div><span>Barang (pcs)</span><b>' + fmt(p.pcs) + '</b></div></div>' +
        '<p class="sb" style="margin:4px 0">' + esc(p.nama) + ' · ' + fmt(p.lines.length) + ' baris produk</p>' +
        (p.toko === 'Official' ? '<p class="sb" style="margin:0;color:var(--kuning)">Untuk Official, stok Kantor Packing berkurang untuk pesanan yang sudah dikirim (padanan barangnya harus sudah dikonfirmasi).</p>'
          : '<p class="sb" style="margin:0">Untuk consignment, data ini hanya dicocokkan dengan laporan penjualan staf; stok toko tidak berubah.</p>') +
        '<div class="up-tb"><button type="button" class="tbl pri" id="upKirim"' + (S.sibuk ? ' disabled' : '') + '>Simpan ke ' + esc(namaToko(p.toko)) + '</button>' +
        '<button type="button" class="tbl" id="upBatal"' + (S.sibuk ? ' disabled' : '') + '>Batal</button></div></div>';
    }
    h += '<p class="sb" style="margin:0">Padanan nama produk ke kode barang dan rekap per barang tetap di <a class="up-lk" href="form.html?f=mdlama&buka=g:mkt">Laporan Marketplace (Master Data lama)</a>.</p></div>';
    h += '<div class="cd"><div class="kpl"><h3>Upload dana cair</h3><span class="sb">Laporan penghasilan consignment Medan & Sidoarjo</span></div>' +
      '<p class="sb" style="margin:0">Laporan Penghasilan Shopee dan laporan penyelesaian Tokopedia / TikTok Shop diupload di layar Bagi hasil consignment. Data dana cair langsung tersimpan ke sistem baru.</p>' +
      '<div class="up-tb"><a class="tbl" href="form.html?f=mdlama&buka=g:toko,%23bhBtn,~dcKartu">Buka upload dana cair</a></div></div>';
    el.innerHTML = h;
    var q = function (i) { return el.querySelector('#' + i); };
    q('upToko').onchange = function () { S.toko = this.value; if (TOKO[S.toko].indexOf(S.pf) < 0) S.pf = TOKO[S.toko][0]; S.prev = null; S.pesan = ''; simpanLs(); gambar(el, opsi); };
    q('upPf').onchange = function () { S.pf = this.value; S.prev = null; S.pesan = ''; simpanLs(); gambar(el, opsi); };
    q('upFile').onchange = function () { pilihFile(this.files && this.files[0], el, opsi); };
    if (q('upBatal')) q('upBatal').onclick = function () { S.prev = null; S.pesan = ''; gambar(el, opsi); };
    if (q('upKirim')) q('upKirim').onclick = function () { kirim(el, opsi); };
  }
  function simpanLs() { try { localStorage.setItem('upToko', S.toko); localStorage.setItem('upPf', S.pf); } catch (e) { } }
  function pesan(el, opsi, t, k) { S.pesan = t; S.kelas = k || ''; gambar(el, opsi); }

  function pilihFile(f, el, opsi) {
    S.prev = null;
    if (!f) { pesan(el, opsi, ''); return; }
    if (f.size > 25 * 1024 * 1024) { pesan(el, opsi, 'File terlalu besar (maks 25 MB). Ekspor dengan rentang tanggal lebih pendek.', 'bad'); return; }
    pesan(el, opsi, 'Membaca file…');
    muatXlsx(function () {
      var rd = new FileReader();
      rd.onload = function (e) {
        try {
          var wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: true });
          var ws = wb.Sheets[wb.SheetNames[0]];
          perbaikiRef(ws);
          var rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
          var h = bacaFile(S.pf, rows);
          if (h.galat) { pesan(el, opsi, esc(h.galat), 'bad'); return; }
          h.toko = S.toko; h.pf = S.pf; h.nama = f.name;
          S.prev = h; pesan(el, opsi, '');
        } catch (err) { pesan(el, opsi, 'File tidak bisa dibaca: ' + esc(err && err.message ? err.message : err), 'bad'); }
      };
      rd.onerror = function () { pesan(el, opsi, 'File tidak bisa dibaca.', 'bad'); };
      rd.readAsArrayBuffer(f);
    }, function (t) { pesan(el, opsi, t, 'bad'); });
  }

  async function kirim(el, opsi) {
    var p = S.prev; if (!p || S.sibuk) return;
    S.sibuk = true;
    var up = 'UP' + Date.now(), ukuran = 800, hasil = { baru: 0, ubah: 0, sama: 0, bentrok: 0, lewat: 0 }, lines = p.lines, salinOk = true;
    for (var i = 0; i < lines.length; i += ukuran) {
      pesan(el, opsi, 'Menyimpan ' + fmt(Math.min(i + ukuran, lines.length)) + ' dari ' + fmt(lines.length) + ' baris… Jangan tutup halaman ini.');
      var d;
      try { d = await opsi.kirim('mpUpload', [{ key: 'KUNCI_TOKO', toko: p.toko, platform: p.pf, up: up, rows: lines.slice(i, i + ukuran) }]); }
      catch (e) { S.sibuk = false; pesan(el, opsi, esc(e.message) + (i > 0 ? ' (' + fmt(i) + ' baris pertama sudah tersimpan; unggah ulang file yang sama untuk melanjutkan, aman).' : ''), 'bad'); return; }
      var r = d && d.r;
      if (!r || !r.ok) { S.sibuk = false; pesan(el, opsi, esc((r && r.pesan) || 'Gagal menyimpan.') + (i > 0 ? ' (' + fmt(i) + ' baris pertama sudah tersimpan; unggah ulang file yang sama untuk melanjutkan, aman).' : ''), 'bad'); return; }
      if (d.cermin === false) salinOk = false;
      hasil.baru += r.baru; hasil.ubah += r.ubah; hasil.sama += r.sama; hasil.bentrok += r.bentrok; hasil.lewat += r.lewat;
    }
    S.sibuk = false; S.prev = null;
    var t = 'Tersimpan untuk ' + esc(namaToko(p.toko)) + ' · ' + esc(NAMA_PF[p.pf]) + ': ' + fmt(hasil.baru) + ' baris baru, ' + fmt(hasil.ubah) + ' diperbarui, ' + fmt(hasil.sama) + ' tidak berubah.', k = 'ok';
    if (hasil.bentrok) { t += ' ' + fmt(hasil.bentrok) + ' baris TIDAK disimpan karena pesanan itu sudah tercatat atas nama toko lain. Periksa apakah file ini memang milik toko yang dipilih.'; k = 'bad'; }
    if (hasil.lewat) t += ' ' + fmt(hasil.lewat) + ' baris dilewati (data tidak lengkap).';
    t += salinOk ? ' Angka di Beranda sudah ikut diperbarui.' : ' Data tersimpan di Google Sheets; angka di Beranda menyusul pada sinkron berikutnya.';
    pesan(el, opsi, t, k);
    if (opsi.selesai) opsi.selesai();
  }

  window.UploadMP = { gambar: gambar };
})();
