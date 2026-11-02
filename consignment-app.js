/* Diambil dari consignment.html supaya tersimpan di perangkat (lebih cepat dibuka). */
(function () {
  var M = Moscow, sb = M.sb, esc = M.esc;
  // Server form lama (Apps Script). Akses dicek dari akun Google yang masuk, bukan dari kunci link.
  var SERVER = 'https://script.google.com/macros/s/AKfycbxcidGDrc33WJYcxzPf1dnRFzgafzbhwomXKlj3KjfYUHosPyI0qNpBcY9tvI7-PgI2/exec?app=toko';
  // Menu aplikasi -> tombol tab di form lama.
  var TAB = { terima: '', jual: 'tab5', biaya: 'tab6', retur: 'tab10', dasbor: 'tab7', hitung: 'tab9', restok: 'tab1', titip: 'tabTtp', bh: 'tabBHS', riwayat: 'rlBtn', pinjam: 'pjNav', sesuai: 'saNav' };
  // Toko Offline punya bilah sendiri (Kasir / Operasional toko / Pinjaman / Penyesuaian): menu operasional dibuka lewat 'ksNavO' dulu.
  var KHUSUS_OFFLINE = { pinjam: 1, sesuai: 1 };
  var MENU;
  var C = { toko: '', nama: '', peran: '', daftar: [], frame: null, aktif: 'jual' };
  // Dari halaman masuk (manajemen): consignment.html?toko=Nama Toko langsung membuka toko itu.
  var TOKO_URL = new URLSearchParams(location.search).get('toko') || '';
  function $(id) { return document.getElementById(id); }

  // Gaya form lama disamakan dengan aplikasi baru (warna, huruf, kartu); judul & tab lama disembunyikan karena diganti menu aplikasi.
  var GAYA = '<style id="gayaBaru">' +
    ':root{--bg:#F4F7FA;--card:#fff;--ink:#0F1B2A;--mut:#5A6677;--line:#E2E7EE;--pri:#1E78A8;--ok:#146C43;--bad:#B42318;--warn:#9A5B00}' +
    'body{font-family:"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif!important;font-size:15px;padding-bottom:110px;-webkit-font-smoothing:antialiased}' +
    'body>header,#tabs,#rlBtn,#bhBtn{display:none!important}' +
    'main{max-width:860px;padding:16px}' +
    '.card{border-radius:16px;padding:16px;border-color:#E2E7EE;box-shadow:0 1px 2px rgba(15,27,42,.04)}' +
    '.btn{border-radius:12px;font-weight:700}.btn.sec{border-color:#C9D6E2}' +
    'input[type=text],input[type=date],input[type=search],input[type=number],select,textarea{border-radius:12px;border-color:#D5DEE9}' +
    'h2{font-size:12.5px;font-weight:800;letter-spacing:.04em}' +
    '.kat{border-radius:12px;background:#E7F3F9}.tile{border-radius:12px;background:#F4F7FA}' +
    '.bar{box-shadow:0 -4px 16px rgba(15,27,42,.06)}' +
    // Kiriman dari gudang punya menu sendiri ("Terima barang"), tidak menumpuk di atas menu lain.
    'body.tanpaTerima #opTk{display:none!important}.ksnav{display:none!important}' +
    'body.hanyaTerima main>*:not(#opTk):not(#err):not(#kosongTerima){display:none!important}' +
    '#kosongTerima{padding:28px 8px;color:#5A6677}' +
    '</style>' +
    '<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">';

  // Pengganti google.script.run di dalam form lama: diteruskan ke server lewat halaman ini.
  var JEMBATAN = '<script>(function(){' +
    'function buat(s,f,u){return new Proxy({},{get:function(t,p){' +
    'if(p==="withSuccessHandler")return function(fn){return buat(fn,f,u);};' +
    'if(p==="withFailureHandler")return function(fn){return buat(s,fn,u);};' +
    'if(p==="withUserObject")return function(o){return buat(s,f,o);};' +
    'return function(){var a=[].slice.call(arguments);window.parent.__tokoPanggil(p,a).then(function(r){if(s)s(r,u);},function(e){if(f)f(e,u);else console.error(e);});};' +
    '}});}' +
    'window.google={script:{run:buat(null,null,undefined),host:{close:function(){}},url:{getLocation:function(cb){cb({parameter:{},hash:""});}}}};' +
    // Cetak / PDF dari form dalam bingkai: dicetak di jendela sendiri (di HP, mencetak bingkai menghasilkan halaman kosong).
    'window.print=function(){if(window.parent.__cetakBingkai)window.parent.__cetakBingkai(document);};' +
    '})();<\/script>';

  async function token() {
    var s = await sb.auth.getSession();
    var t = s && s.data && s.data.session ? s.data.session.access_token : '';
    if (!t) throw new Error('Sesi masuk habis. Muat ulang halaman lalu masuk lagi.');
    return t;
  }

  async function kirim(f, a) {
    var badan = JSON.stringify({ t: await token(), f: f, a: a || [], toko: C.toko });
    var r;
    try { r = await fetch(SERVER, { method: 'POST', body: badan, redirect: 'follow' }); }
    catch (e) { throw new Error('Tidak tersambung ke server. Periksa internet lalu coba lagi.'); }
    var teks = await r.text(), d = null;
    try { d = JSON.parse(teks); } catch (e) { throw new Error('Jawaban server tidak terbaca. Coba lagi sebentar lagi.'); }
    if (!d || d.ok !== true) throw new Error((d && d.pesan) || 'Form toko belum aktif di server. Hubungi manajemen Moscow Supplies.');
    return d;
  }

  // Data halaman toko (stok, kiriman berjalan, ringkasan bulan, rincian warna) dibaca langsung dari Supabase:
  // jauh lebih cepat dan tidak memakai kuota Apps Script. Kalau simpan terakhir belum sempat disalin ke Supabase,
  // atau Supabase gagal, halaman membaca dari sheet seperti biasa.
  C.basiSampai = 0;
  var BACA_SUPABASE = {
    dataToko: function () { return ['toko_data', { p_toko: C.toko }]; },
    pendapatanToko: function (p) { return ['toko_pendapatan', { p_toko: C.toko, p_bulan: String(p.bulan || ''), p_harga: !!p.harga }]; },
    riwayatOrder: function () { return ['toko_riwayat_order', { p_toko: C.toko }]; },
    selisihHitung: function () { return ['toko_selisih_hitung', { p_toko: C.toko }]; },
    tokoKiriman: function () { return ['toko_kiriman', { p_toko: C.toko }]; },
    // Bagi hasil: Supabase mengirim bahan datanya, hitungannya (rumus yang sama dengan Apps Script) di bagihasil.js.
    bagiHasilToko: function (p) {
      return ['toko_bahan_bagi_hasil', { p_toko: C.toko, p_bulan: String(p.bulan || '') },
        function (bahan) { return window.BagiHasil ? window.BagiHasil.hitung(C.toko, String(p.bulan || ''), bahan) : null; }];
    },
    // Invoice bagi hasil (31 Okt): dihitung dari bahan yang sama (bagihasil.js invoice = bhInvoice Apps Script, sudah diuji sama persis).
    bhInvoice: function (p) {
      return ['toko_bahan_bagi_hasil', { p_toko: C.toko, p_bulan: String(p.bulan || '') },
        function (bahan) { return window.BagiHasil && window.BagiHasil.invoice ? window.BagiHasil.invoice(C.toko, String(p.bulan || ''), bahan, true) : null; }];
    },
    hppTokoSaya: function (p) {
      return ['toko_bahan_bagi_hasil', { p_toko: C.toko, p_bulan: String(p.bulan || '') },
        function (bahan) { return window.BagiHasil ? window.BagiHasil.hppSaya(C.toko, String(p.bulan || ''), bahan) : null; }];
    },
    // Pinjaman dan penyesuaian stok (Toko Offline), barang titipan (Medan).
    dataPinjam: function () { return ['toko_pinjam_data', { p_toko: C.toko }]; },
    dataSesuai: function () { return ['toko_sesuai_data', { p_toko: C.toko }]; },
    ttpData: function (p) { return ['toko_ttp_data', { p_toko: C.toko, p_bulan: String(p.bulan || '') }]; }
  };
  async function dataSupabase(f, a) {
    if (!C.toko || Date.now() < C.basiSampai) return null;
    try {
      var q = BACA_SUPABASE[f]((a && a[0]) || {});
      var r = await sb.rpc(q[0], q[1]);
      if (r.error || !r.data || r.data.ok !== true) return null;
      var d = q[2] ? q[2](r.data) : r.data;
      return d && d.ok === true ? d : null;
    } catch (e) { return null; }
  }

  // Tahap 3: laporan penjualan, biaya, return, hitung stok, request order, ajuan penyesuaian, pinjaman, dan jual titipan disimpan langsung di Supabase (pemeriksaan sama dengan Apps Script).
  // Sesudahnya Apps Script diminta menyalin ke Google Sheets (tidak ditunggu; kalau gagal, sinkron 30 menit yang menyalin).
  function jualRpc(p) {
    return ['toko_simpan_jual', { p_toko: C.toko, p_tanggal: String(p.tanggal || ''), p_nama: String(p.nama || ''),
      p_items: Array.isArray(p.items) ? p.items : [], p_saluran: String(p.saluran || ''), p_token: String(p.token || '') }];
  }
  var TULIS_SUPABASE = {
    simpanJual: jualRpc,
    simpanJualSaluran: jualRpc,
    simpanBiaya: function (p) {
      return ['toko_simpan_biaya', { p_toko: C.toko, p_tanggal: String(p.tanggal || ''), p_nama: String(p.nama || ''),
        p_keterangan: String(p.keterangan || ''), p_nominal: String(p.nominal === undefined || p.nominal === null ? '' : p.nominal), p_token: String(p.token || '') }];
    },
    simpanHitung: function (p) {
      return ['toko_simpan_hitung', { p_toko: C.toko, p_nama: String(p.nama || ''), p_catatan: String(p.catatan || ''),
        p_items: Array.isArray(p.items) ? p.items : [], p_token: String(p.token || '') }];
    },
    // Request order (toko consignment; pelanggan reseller tetap lewat Apps Script). Telegram order baru dikirim Apps Script (efek_antre).
    simpanOrder: function (p) {
      return ['toko_simpan_order', { p_toko: C.toko, p_tanggal: String(p.tanggal || ''), p_nama: String(p.nama || ''),
        p_catatan: String(p.catatan || ''), p_items: Array.isArray(p.items) ? p.items : [], p_token: String(p.token || '') }];
    },
    ajukanSelisihHitung: function (p) {
      return ['toko_ajukan_selisih', { p_toko: C.toko, p_nama: String(p.nama || ''), p_alasan: String(p.alasan || ''),
        p_kode: Array.isArray(p.kode) ? p.kode : [], p_token: String(p.token || '') }];
    },
    simpanPinjam: function (p) {
      return ['toko_simpan_pinjam', { p_toko: C.toko, p_tanggal: String(p.tanggal || ''), p_peminjam: String(p.peminjam || ''),
        p_nama: String(p.nama || ''), p_catatan: String(p.catatan || ''), p_rencana: String(p.rencana || ''),
        p_items: Array.isArray(p.items) ? p.items : [], p_token: String(p.token || '') }];
    },
    kembaliPinjam: function (p) {
      return ['toko_kembali_pinjam', { p_toko: C.toko, p_tanggal: String(p.tanggal || ''), p_nama: String(p.nama || ''),
        p_no: String(p.no || ''), p_items: Array.isArray(p.items) ? p.items : [], p_token: String(p.token || '') }];
    },
    ajukanSesuai: function (p) {
      return ['toko_ajukan_sesuai', { p_toko: C.toko, p_nama: String(p.nama || ''), p_alasan: String(p.alasan || ''),
        p_items: Array.isArray(p.items) ? p.items : [], p_token: String(p.token || '') }];
    },
    // Ajuan stok / barang baru titipan Medan; Telegram dikirim Apps Script (efek_antre).
    ttpStokAjukan: function (p) {
      return ['toko_ttp_stok_ajukan', { p_toko: C.toko, p_kode: String(p.kode || ''), p_qty: String(p.qty === undefined || p.qty === null ? '' : p.qty),
        p_oleh: String(p.oleh || ''), p_catatan: String(p.catatan || ''), p_token: String(p.token || '') }];
    },
    ttpBarangAjukan: function (p) {
      var t = function (v) { return String(v === undefined || v === null ? '' : v); };
      return ['toko_ttp_barang_ajukan', { p_toko: C.toko, p_nama: t(p.nama), p_hpp: t(p.hpp), p_harga: t(p.harga), p_stok: t(p.stok),
        p_oleh: t(p.oleh), p_catatan: t(p.catatan), p_token: t(p.token) }];
    },
    ttpJual: function (p) {
      return ['toko_ttp_jual', { p_toko: C.toko, p_tanggal: String(p.tanggal || ''), p_oleh: String(p.oleh || ''),
        p_items: Array.isArray(p.items) ? p.items : [], p_token: String(p.token || '') }];
    },
    // Konfirmasi barang dari gudang diterima: jumlah order disamakan dengan yang diterima, order Selesai (baris sheet diubah Apps Script).
    tokoTerima: function (p) {
      return ['toko_terima', { p_toko: C.toko, p_no: String(p.no || ''), p_nama: String(p.nama || ''), p_catatan: String(p.catatan || ''),
        p_items: Array.isArray(p.items) ? p.items : [], p_token: String(p.token || '') }];
    },
    // Bagi hasil: dana diterima per marketplace dan uang tunai penjualan offline (Sidoarjo).
    salDanaSimpan: function (p) {
      return ['toko_dana_simpan', { p_toko: C.toko, p_jenis: '', p_saluran: String(p.saluran || ''), p_bulan: String(p.bulan || ''),
        p_nilai: String(p.dana === undefined || p.dana === null ? '' : p.dana), p_nama: String(p.nama || '') }];
    },
    danaTunaiSimpan: function (p) {
      return ['toko_dana_simpan', { p_toko: C.toko, p_jenis: 'tunai', p_saluran: '', p_bulan: String(p.bulan || ''),
        p_nilai: String(p.nominal === undefined || p.nominal === null ? '' : p.nominal), p_nama: String(p.nama || '') }];
    },
    simpanRetur: function (p) {
      return ['toko_simpan_retur', { p_toko: C.toko, p_tanggal: String(p.tanggal || ''), p_nama: String(p.nama || ''),
        p_kode: String(p.kode || ''), p_qty: String(p.qty === undefined || p.qty === null ? '' : p.qty), p_warna: String(p.warna || ''),
        p_kondisi: String(p.kondisi || ''), p_catatan: String(p.catatan || ''), p_token: String(p.token || '') }];
    }
  };
  var BALIK = SERVER.replace('app=toko', 'app=balik');
  async function salinKeSheet() {
    try { var t = await token(); fetch(BALIK, { method: 'POST', body: JSON.stringify({ t: t }), keepalive: true }).catch(function () { }); } catch (e) { }
  }
  async function tulisSupabase(f, a) {
    if (!C.toko) throw new Error('Pilih tokonya dulu.');
    var q = TULIS_SUPABASE[f]((a && a[0]) || {});
    var r = await sb.rpc(q[0], q[1]);
    if (r.error) throw new Error('Gagal menyimpan: ' + r.error.message + '. Tekan simpan sekali lagi; aman, tidak akan tercatat dua kali.');
    if (r.data && r.data.lewat) {
      return kirim(f, a).then(function (d) { if (d.cermin === false) C.basiSampai = Date.now() + 35 * 60 * 1000; return d.r; });
    }
    if (r.data && r.data.ok) salinKeSheet();
    return r.data;
  }

  function setelah(f, r) {
    if (f === 'bhInvoice' && r && r.ok) { C.inv = r; tombolPdf(); }
    // Jumlah kiriman gudang yang menunggu diterima -> tanda angka di menu.
    if (f === 'tokoKiriman' && r && r.ok) {
      var n = (r.terima || []).length; M.badge('terima', n);
      if (n && !C.terimaDibuka && !location.hash) { C.terimaDibuka = true; M.buka('terima'); }
    }
    return r;
  }

  window.__tokoPanggil = function (f, a) {
    if (TULIS_SUPABASE[f]) return tulisSupabase(f, a).then(function (r) { return setelah(f, r); });
    if (BACA_SUPABASE[f]) {
      return dataSupabase(f, a).then(function (r) {
        return r || kirim(f, a).then(function (d) { return d.r; });
      }).then(function (r) { return setelah(f, r); });
    }
    return kirim(f, a).then(function (d) {
      if (d.cermin === false) C.basiSampai = Date.now() + 35 * 60 * 1000;
      return setelah(f, d.r);
    });
  };

  // Cetak / PDF isi bingkai (mis. invoice bagi hasil). Bingkai tidak bisa terbagi ke beberapa halaman saat dicetak
  // (di HP hasilnya halaman kosong), jadi isinya disalin ke halaman utama (#cetakWadah, gaya diisolasi dengan shadow DOM)
  // dan hanya salinan itu yang tercetak. Berlaku untuk tombol cetak di form maupun Bagikan › Cetak dari browser.
  function siapkanCetak(dok) {
    hapusCetak();
    if (!dok || !dok.body) return false;
    var badan = dok.body.cloneNode(true);
    badan.querySelectorAll('script').forEach(function (x) { x.remove(); });
    badan.querySelectorAll('details').forEach(function (x) { x.setAttribute('open', ''); });
    var asli = dok.body.querySelectorAll('input,select,textarea'), salin = badan.querySelectorAll('input,select,textarea');
    for (var i = 0; i < asli.length && i < salin.length; i++) {
      var a = asli[i], c = salin[i];
      if (a.tagName === 'SELECT') [].forEach.call(c.options, function (o, j) { if (j === a.selectedIndex) o.setAttribute('selected', ''); else o.removeAttribute('selected'); });
      else if (a.type === 'checkbox' || a.type === 'radio') { if (a.checked) c.setAttribute('checked', ''); else c.removeAttribute('checked'); }
      else if (a.tagName === 'TEXTAREA') c.textContent = a.value;
      else c.setAttribute('value', a.value);
    }
    // Bagian yang tersembunyi di layar (display:none lewat skrip) tetap tersembunyi karena gaya inline ikut tersalin.
    var css = '';
    dok.querySelectorAll('style').forEach(function (x) { css += x.textContent + '\n'; });
    // html/body di gaya form -> pembungkus di dalam shadow DOM.
    css = css.replace(/(^|[\s,{}>+~(])html(?=[\s,{.:#\[>+~)])/g, '$1:host').replace(/(^|[\s,{}>+~(])body(?=[\s,{.:#\[>+~)])/g, '$1.sbody');
    var links = '';
    dok.querySelectorAll('link[rel="stylesheet"]').forEach(function (x) { links += '<link rel="stylesheet" href="' + x.href + '">'; });
    var w = document.createElement('div'); w.id = 'cetakWadah';
    var akar = w.attachShadow ? w.attachShadow({ mode: 'open' }) : w;
    akar.innerHTML = links + '<style>' + css + ':host{display:block}.sbody{margin:0;background:#fff}</style>';
    var b = document.createElement('div'); b.className = 'sbody ' + (dok.body.className || '');
    while (badan.firstChild) b.appendChild(badan.firstChild);
    akar.appendChild(b);
    document.body.appendChild(w);
    document.documentElement.classList.add('cetakBingkai');
    return true;
  }
  function hapusCetak() {
    var w = document.getElementById('cetakWadah'); if (w) w.remove();
    document.documentElement.classList.remove('cetakBingkai');
  }
  function bingkaiAktif() { return C.frame && !C.frame.hidden && C.aktif !== 'koreksi' && C.frame.contentDocument; }
  window.__cetakBingkai = function (dok) {
    if (C.inv && C.aktif === 'bh') { pdfInvoice(); return; }
    if (!siapkanCetak(dok)) return;
    setTimeout(function () { window.print(); }, 150);
  };
  window.addEventListener('beforeprint', function () {
    if (!document.getElementById('cetakWadah') && bingkaiAktif()) siapkanCetak(C.frame.contentDocument);
  });
  window.addEventListener('afterprint', function () { setTimeout(hapusCetak, 500); });

  // ---------- Invoice bagi hasil sebagai file PDF (dibuat langsung dari angka invoice, tidak lewat cetak browser) ----------
  function muatSkrip(src) {
    return new Promise(function (ok, gagal) { var x = document.createElement('script'); x.src = src; x.onload = ok; x.onerror = function () { gagal(new Error('Gagal memuat pembuat PDF. Periksa internet.')); }; document.head.appendChild(x); });
  }
  async function siapPdf() {
    if (!(window.jspdf && window.jspdf.jsPDF)) await muatSkrip('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    if (!window.jspdf.jsPDF.API.autoTable) await muatSkrip('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
    return window.jspdf.jsPDF;
  }
  // Logo berwarna (logo-warna.png) diubah ke PNG lewat kanvas supaya bisa ditempel jsPDF.
  var LOGO = null;
  function logoPdf() {
    if (LOGO) return Promise.resolve(LOGO);
    return new Promise(function (ok) {
      var im = new Image();
      im.onload = function () {
        try {
          var c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
          c.getContext('2d').drawImage(im, 0, 0);
          LOGO = { data: c.toDataURL('image/png'), w: im.naturalWidth, h: im.naturalHeight }; ok(LOGO);
        } catch (e) { ok(null); }
      };
      im.onerror = function () { ok(null); };
      im.src = 'logo-warna.png';
    });
  }
  var BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  function rpP(n) { n = Math.round(Number(n) || 0); return (n < 0 ? '-Rp ' : 'Rp ') + Math.abs(n).toLocaleString('id-ID'); }
  function angkaP(n) { return Math.round(Number(n) || 0).toLocaleString('id-ID'); }
  function bulanP(b) { var a = String(b || '').split('-'); return a.length === 2 ? BLN[Number(a[1]) - 1] + ' ' + a[0] : String(b || ''); }
  function tglP(t) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(t || '')); return m ? Number(m[3]) + ' ' + BLN[Number(m[2]) - 1].slice(0, 3) + ' ' + m[1] : String(t || ''); }
  async function buatPdf(v) {
    var JsPDF = await siapPdf();
    var doc = new JsPDF({ unit: 'mm', format: 'a4' }), L = 14, W = 182, y;
    var biru = [11, 35, 64], abu = [100, 110, 125], tosca = [18, 190, 230];
    // Kepala: logo Moscow Supplies + identitas perusahaan di kiri, judul dan nomor invoice di kanan.
    var logo = await logoPdf();
    if (logo) doc.addImage(logo.data, 'PNG', L, 10, 46, 46 * logo.h / logo.w);
    else { doc.setFont('helvetica', 'bolditalic'); doc.setFontSize(22); doc.setTextColor.apply(doc, tosca); doc.text('Moscow', L, 22); }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor.apply(doc, abu);
    doc.text('PT. Toentoenan Langkah Elohim', L, 32.5);
    doc.text('Jl. Raya Kerobokan No. 8, Kuta Utara, Badung, Bali', L, 36);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.setTextColor.apply(doc, biru);
    doc.text('INVOICE BAGI HASIL', L + W, 17, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(30, 36, 48);
    doc.text('No. ' + (v.no || '-'), L + W, 23.5, { align: 'right' });
    doc.text('Periode ' + bulanP(v.bulan), L + W, 28.5, { align: 'right' });
    doc.setTextColor.apply(doc, abu); doc.setFontSize(8);
    doc.text('Dibuat ' + (v.dibuat || ''), L + W, 33, { align: 'right' });
    doc.setDrawColor.apply(doc, tosca); doc.setLineWidth(0.8); doc.line(L, 40, L + W, 40);
    // Pihak toko.
    y = 47; doc.setFontSize(8); doc.setTextColor.apply(doc, abu); doc.text('KEPADA', L, y); doc.text('BAGI HASIL', L + W, y, { align: 'right' });
    y += 5.5; doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.setTextColor(30, 36, 48);
    doc.text(String(v.nama || v.toko || ''), L, y);
    doc.text('Toko ' + (Number(v.persen) || 0) + '% · Moscow Supplies ' + (100 - (Number(v.persen) || 0)) + '%', L + W, y, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    if (!v.terbit) {
      y += 7; doc.setFillColor(255, 243, 214); doc.rect(L, y - 4.5, W, 7 + (v.kurang && v.kurang.length ? 5 : 0), 'F');
      doc.setTextColor(120, 70, 0); doc.setFont('helvetica', 'bold'); doc.text('DRAF - invoice belum terbit', L + 2, y);
      if (v.kurang && v.kurang.length) { y += 5; doc.setFont('helvetica', 'normal'); doc.text(doc.splitTextToSize('Belum lengkap: ' + v.kurang.join(', '), W - 4)[0], L + 2, y); }
      doc.setTextColor(30, 36, 48);
    }
    y += 6;
    var ring = [
      ['Omzet (harga jual)', rpP(v.omzet)], ['Retur', rpP(-v.retur)], ['Penjualan bersih', rpP(v.penjualan)],
      ['Potongan marketplace', rpP(-v.potongan)], ['HPP (harga dasar barang terjual)', rpP(-v.hpp)]
    ];
    if (!v.biayaToko) { ring.push(['Biaya / belanja toko', rpP(-v.belanja)]); ring.push(['Ongkir', rpP(-v.ongkir)]); }
    ring.push(['Laba bersih', rpP(v.bersih)]);
    ring.push(['Bagian toko (' + (Number(v.persen) || 0) + '%)', rpP(v.bagianToko)]);
    ring.push(['Bagian Moscow Supplies (' + (100 - (Number(v.persen) || 0)) + '%)', rpP(v.bagianMoscow)]);
    ring.push([v.biayaToko ? 'Disetor ke Moscow Supplies (HPP + bagian Moscow Supplies)' : 'Disetor ke Moscow Supplies (HPP + biaya + ongkir + bagian Moscow Supplies)', rpP(v.setoran)]);
    ring.push(['Sudah tercatat disetor', rpP(v.tercatat)]);
    ring.push(['Sisa yang harus disetor', rpP((v.setoran || 0) - (v.tercatat || 0))]);
    var tebal = { 'Penjualan bersih': 1, 'Laba bersih': 1, 'Sisa yang harus disetor': 1 };
    doc.autoTable({ startY: y, head: [['Ringkasan', 'Nilai']], body: ring, theme: 'grid', margin: { left: L, right: L },
      styles: { fontSize: 9.5, cellPadding: 1.8 }, headStyles: { fillColor: biru }, columnStyles: { 1: { halign: 'right', cellWidth: 45 } },
      didParseCell: function (h) { if (h.section === 'body' && (tebal[h.row.raw[0]] || /^Disetor/.test(h.row.raw[0]))) h.cell.styles.fontStyle = 'bold'; } });
    y = doc.lastAutoTable.finalY + 3; doc.setFontSize(9); doc.setTextColor.apply(doc, abu);
    doc.text('Setor ke: ' + (v.akun || 'Rekening PT'), L, y + 2); y += 7; doc.setTextColor(30, 36, 48);
    if (v.dana && v.dana.length) {
      var dana = v.dana.map(function (f) {
        if (f.manual) return [f.pf, f.ket || '', '', '', f.belumIsi ? 'belum diisi' : rpP(f.cair), ''];
        if (f.belum) return [f.pf, 'belum diupload', '', '', '', ''];
        return [f.pf, tglP(f.dari) + ' - ' + tglP(f.sampai), rpP(f.harga), rpP(f.biaya), rpP(f.cair), angkaP(f.jml)];
      });
      doc.autoTable({ startY: y, head: [['Dana diterima', 'Periode', 'Harga jual', 'Biaya', 'Dana cair', 'Pesanan']], body: dana, theme: 'striped', margin: { left: L, right: L },
        styles: { fontSize: 8.5, cellPadding: 1.5 }, headStyles: { fillColor: biru }, columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } } });
      y = doc.lastAutoTable.finalY + 6;
    }
    var it = (v.items || []).map(function (x) { return [x.k, x.n, angkaP(x.q), rpP(x.omzet), x.rq ? angkaP(x.rq) : '', rpP(x.hpp), rpP(x.hppTot)]; });
    if (it.length) {
      doc.autoTable({ startY: y, head: [['Kode', 'Barang', 'Terjual', 'Omzet', 'Retur', 'HPP/pcs', 'Total HPP']], body: it, theme: 'striped', margin: { left: L, right: L },
        styles: { fontSize: 8, cellPadding: 1.3 }, headStyles: { fillColor: biru }, columnStyles: { 0: { cellWidth: 22 }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' } } });
      y = doc.lastAutoTable.finalY + 6;
    }
    var by = (v.biaya || []).map(function (b) { return [tglP(b.t), b.ket || '', rpP(b.nom)]; });
    if (by.length && !v.biayaToko) {
      doc.autoTable({ startY: y, head: [['Tanggal', 'Biaya / belanja toko', 'Nominal']], body: by, theme: 'striped', margin: { left: L, right: L },
        styles: { fontSize: 8.5, cellPadding: 1.5 }, headStyles: { fillColor: biru }, columnStyles: { 0: { cellWidth: 26 }, 2: { halign: 'right', cellWidth: 35 } } });
    }
    var n = doc.getNumberOfPages();
    for (var i = 1; i <= n; i++) {
      doc.setPage(i); doc.setFontSize(8); doc.setTextColor.apply(doc, abu);
      doc.text('Moscow Supplies · ' + (v.no || '') + ' · dibuat ' + (v.dibuat || ''), L, 289);
      doc.text('Halaman ' + i + ' dari ' + n, L + W, 289, { align: 'right' });
    }
    return doc;
  }
  function namaPdf(v) { return 'Invoice ' + (v.no || 'bagi hasil') + ' ' + (v.nama || v.toko || '') + '.pdf'; }
  // PDF dibuat, lalu ditawarkan lewat lembar kecil: Bagikan / simpan (lembar Bagikan iPhone: Simpan ke File, WhatsApp, dll.) atau Buka.
  async function pdfInvoice() {
    var v = C.inv; if (!v) return;
    var lb = lembarPdf('Menyiapkan PDF invoice…');
    try {
      var doc = await buatPdf(v), blob = doc.output('blob'), nama = namaPdf(v);
      var file = null; try { file = new File([blob], nama, { type: 'application/pdf' }); } catch (e) { file = null; }
      var url = URL.createObjectURL(blob);
      lb.isi.innerHTML = '<b>' + esc(nama) + '</b><div class="pdfAksi"></div>';
      var aksi = lb.isi.querySelector('.pdfAksi');
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        var bg = document.createElement('button'); bg.type = 'button'; bg.className = 'tbl pri'; bg.textContent = 'Simpan / bagikan PDF';
        bg.onclick = function () { navigator.share({ files: [file], title: nama }).catch(function () { }); };
        aksi.appendChild(bg);
      }
      var a = document.createElement('a'); a.className = 'tbl'; a.href = url; a.download = nama; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Buka / unduh PDF';
      aksi.appendChild(a);
    } catch (e) { lb.isi.innerHTML = '<div class="msg bad">' + esc(e.message || e) + '</div>'; }
  }
  function lembarPdf(teks) {
    var lama = document.getElementById('lembarPdf'); if (lama) lama.remove();
    var w = document.createElement('div'); w.id = 'lembarPdf';
    w.innerHTML = '<div class="kotak" role="dialog" aria-label="PDF invoice"><div class="isi">' + esc(teks) + '</div><button type="button" class="tbl tutup">Tutup</button></div>';
    w.querySelector('.tutup').onclick = function () { w.remove(); };
    w.onclick = function (e) { if (e.target === w) w.remove(); };
    document.body.appendChild(w);
    return { isi: w.querySelector('.isi') };
  }
  // Tombol tetap di aplikasi (di luar form lama), muncul di menu Penjualan & Bagi hasil setelah invoice tampil.
  function tombolPdf() {
    var b = document.getElementById('tPdfInv');
    var tampil = !!(C.inv && C.aktif === 'bh');
    if (!tampil) { if (b) b.hidden = true; return; }
    if (!b) {
      b = document.createElement('button'); b.type = 'button'; b.id = 'tPdfInv'; b.className = 'tbl pri';
      b.onclick = function () { pdfInvoice(); };
      document.body.appendChild(b);
    }
    b.textContent = 'PDF invoice ' + bulanP(C.inv.bulan);
    b.hidden = false;
  }

  function ukur() {
    var fr = C.frame; if (!fr || fr.hidden || C.aktif === 'koreksi' || C.aktif === 'setoran') return;
    document.documentElement.classList.add('berbingkai'); window.scrollTo(0, 0);
    var atas = fr.getBoundingClientRect().top;
    var bawah = document.documentElement.classList.contains('m-m') && $('mBawah') ? $('mBawah').offsetHeight : 0;
    fr.style.height = Math.max(320, window.innerHeight - atas - bawah) + 'px';
  }
  window.addEventListener('resize', ukur);

  function tekan(k) {
    var fr = C.frame; if (!fr || !fr.contentDocument) return;
    var dok = fr.contentDocument;
    // Riwayat isi laporan tampil sebagai lembar di atas form; tutup dulu kalau pindah ke menu lain.
    var rl = dok.getElementById('rlWrap'), tutup = dok.getElementById('rlTutup');
    if (k !== 'riwayat' && rl && tutup && getComputedStyle(rl).display !== 'none' && rl.offsetHeight) tutup.click();
    dok.body.classList.toggle('hanyaTerima', k === 'terima');
    dok.body.classList.toggle('tanpaTerima', k !== 'terima');
    var ks = dok.getElementById('kosongTerima'); if (ks) ks.remove();
    if (k === 'terima') {
      var op = dok.getElementById('opTk');
      if (!op || op.offsetHeight < 8) {
        var el = dok.createElement('div'); el.id = 'kosongTerima';
        el.textContent = 'Tidak ada kiriman dari gudang yang menunggu diterima.';
        (op && op.parentNode ? op.parentNode : dok.body).insertBefore(el, op ? op.nextSibling : null);
      }
      try { fr.contentWindow.scrollTo(0, 0); } catch (x) { }
      return;
    }
    var ops = dok.getElementById('ksNavO');
    if (ops && !KHUSUS_OFFLINE[k]) ops.click();
    var b = TAB[k] ? dok.getElementById(TAB[k]) : null;
    if (b) { b.click(); try { fr.contentWindow.scrollTo(0, 0); } catch (x) { } }
  }

  function gagal(pesan) {
    var m = $('muatan'); m.hidden = false; m.className = 'bad';
    m.innerHTML = esc(pesan) + '<div class="ulang"><button type="button" class="tbl" id="cobaLagi">Coba lagi</button></div>';
    $('cobaLagi').onclick = muat;
    if (C.frame) C.frame.hidden = true;
    document.documentElement.classList.remove('berbingkai');
  }

  // Tanggal hari ini (WITA) dalam bentuk yyyy-MM-dd.
  function hariWita(d) { return new Date((d ? new Date(d) : new Date()).getTime() + 8 * 3600000).toISOString().slice(0, 10); }
  // Tampilan simpanan dibuat pada hari lain: tanggal bawaan form diganti ke hari ini.
  function segarkan(html, dibuat) {
    var lama = hariWita(dibuat), kini = hariWita();
    if (lama === kini) return html;
    return html.split('"tanggal":"' + lama + '"').join('"tanggal":"' + kini + '"').split('"hariIni":"' + lama + '"').join('"hariIni":"' + kini + '"');
  }

  async function muat() {
    var m = $('muatan'); m.hidden = false; m.className = ''; m.textContent = 'Memuat form ' + (C.toko || 'toko') + '…';
    // Tampilan form yang tersimpan di Supabase dipakai dulu supaya terbuka seketika; yang lama diperbarui di belakang.
    var simpanan = null;
    try {
      var r = await sb.rpc('halaman_baca_toko', { p_toko: C.toko || '' });
      if (!r.error && r.data && r.data.html) simpanan = r.data;
    } catch (e) { simpanan = null; }
    var umur = simpanan ? Date.now() - new Date(simpanan.dibuat).getTime() : Infinity;
    if (simpanan && umur < 30 * 86400000) { // tampilan simpanan dipakai sampai 30 hari (diperbarui di belakang tiap > 30 menit), supaya tidak menunggu Apps Script
      C.toko = simpanan.toko; C.daftar = simpanan.daftar || []; C.nama = simpanan.nama || C.nama;
      pilihToko();
      tampil(segarkan(String(simpanan.html), simpanan.dibuat));
      if (umur > 30 * 60000) kirim('halaman', []).catch(function () { });
      return;
    }
    var d;
    try { d = await kirim('halaman', []); } catch (e) { gagal(e.message); return; }
    C.toko = d.toko; C.daftar = d.daftar || []; C.nama = d.nama || C.nama;
    pilihToko();
    tampil(String(d.html || ''));
  }

  function tampil(html) {
    var m = $('muatan');
    html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, function (x) { return x + JEMBATAN + GAYA; }) : JEMBATAN + GAYA + html;
    var fr = $('bingkai'); C.frame = fr;
    fr.onload = function () {
      m.hidden = true; fr.hidden = false;
      var dok = fr.contentDocument;
      // Barang titipan hanya ada di Medan.
      var adaTitip = !!(dok && dok.getElementById('tabTtp'));
      document.querySelectorAll('[data-k="titip"]').forEach(function (x) { x.hidden = !adaTitip; });
      // Kasir, pinjaman, dan penyesuaian hanya ada di Toko Offline.
      var offline = !!(dok && dok.getElementById('ksNavO'));
      document.querySelectorAll('[data-k="pinjam"],[data-k="sesuai"],a[href="kasir.html"]').forEach(function (x) { x.hidden = !offline; });
      // Bukti transfer setoran hanya untuk toko consignment (bukan Toko Offline).
      document.querySelectorAll('[data-k="setoran"]').forEach(function (x) { x.hidden = offline; });
      // Menu yang tidak ada di toko ini juga dibuang dari lembar "Menu" (HP).
      for (var i = MENU.length - 1; i >= 0; i--) {
        var mk = MENU[i].k;
        if ((mk === 'titip' && !adaTitip) || ((mk === 'pinjam' || mk === 'sesuai' || mk === 'kasir') && !offline) || (mk === 'setoran' && offline)) MENU.splice(i, 1);
      }
      // Nama pengisi otomatis dari akun yang masuk.
      var nm = dok && dok.getElementById('nama');
      if (nm && !nm.value && C.nama) { nm.value = C.nama; nm.dispatchEvent(new Event('input', { bubbles: true })); }
      if (C.aktif === 'koreksi') { window.KoreksiJual.bukaToko($('kjIsi'), C.toko, C.nama); return; }
      if (C.aktif === 'setoran') { window.SetoranBukti.buka($('stIsi'), C.toko, C.nama); return; }
      ukur(); tekan(C.aktif === 'riwayat' ? 'jual' : C.aktif);
      if (C.aktif === 'riwayat') tekan('riwayat');
    };
    fr.srcdoc = html;
  }

  function pilihToko() {
    var el = $('mAksi'); if (!el) return;
    if (C.peran !== 'manajemen' || C.daftar.length < 2) { el.innerHTML = '<span class="tg" style="font-weight:700;color:var(--abu)">' + esc(C.toko) + '</span>'; return; }
    el.innerHTML = '<label class="sr" for="pilihToko" style="position:absolute;left:-9999px">Toko</label><select id="pilihToko">' +
      C.daftar.map(function (n) { return '<option' + (n === C.toko ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('') + '</select>';
    $('pilihToko').onchange = function () {
      C.toko = this.value;
      try { localStorage.setItem('tokoPilihan', C.toko); } catch (x) { }
      muat();
    };
  }

  M.mulai({
    aplikasi: 'FORM TOKO', masukJudul: 'Form toko consignment',
    masukTeks: 'Laporan penjualan, biaya, stok, dan bagi hasil toko consignment. Masuk memakai akun Google yang sudah didaftarkan manajemen Moscow Supplies.',
    izin: function (ctx) {
      if (ctx.peran === 'manajemen' || ctx.peran === 'toko') return true;
      return ctx.peran ? 'Akun ' + ctx.email + ' tidak punya akses ke form toko.' : false;
    },
    menu: MENU = [
      { k: 'jual', nm: 'Report penjualan', ik: 'jual', bagian: 'isi', pendek: 'Jual' },
      { k: 'terima', nm: 'Terima barang', ik: 'gudang', bagian: 'isi', pendek: 'Terima' },
      { k: 'biaya', nm: 'Biaya', ik: 'uang', bagian: 'isi' },
      { k: 'retur', nm: 'Barang return', ik: 'muat', bagian: 'isi', pendek: 'Return' },
      { k: 'dasbor', nm: 'Dashboard toko', ik: 'dasbor', bagian: 'isi', pendek: 'Dashboard' },
      { k: 'hitung', nm: 'Hitung stok', ik: 'stok', bagian: 'isi' },
      { k: 'restok', nm: 'Re-stock produk', ik: 'purch', bagian: 'isi', pendek: 'Re-stock' },
      { k: 'titip', nm: 'Barang titipan', ik: 'toko', bagian: 'isi' },
      { k: 'pinjam', nm: 'Stok dipinjam', ik: 'toko', bagian: 'isi', pendek: 'Pinjaman' },
      { k: 'sesuai', nm: 'Penyesuaian stok', ik: 'atur', bagian: 'isi', pendek: 'Penyesuaian' },
      { k: 'bh', nm: 'Penjualan & Bagi Hasil', ik: 'laporan', bagian: 'isi', pendek: 'Bagi hasil' },
      { k: 'setoran', nm: 'Bukti transfer setoran', ik: 'uang', bagian: 'setoran', pendek: 'Setoran' },
      { k: 'koreksi', nm: 'Koreksi penjualan', ik: 'atur', bagian: 'koreksi', pendek: 'Koreksi' },
      { k: 'riwayat', nm: 'Riwayat isi laporan', ik: 'riwayat', bagian: 'isi', pendek: 'Riwayat' },
      { k: 'kasir', nm: 'Kasir', ik: 'kasir', href: 'kasir.html' }
    ],
    bawah: ['jual', 'terima', 'biaya', 'dasbor', 'lain'],
    pindah: function (k) {
      C.aktif = k; tombolPdf();
      // Koreksi penjualan tampil langsung di aplikasi (bukan di form lama dalam bingkai).
      if (k === 'koreksi') { document.documentElement.classList.remove('berbingkai'); if (C.toko) window.KoreksiJual.bukaToko($('kjIsi'), C.toko, C.nama); return; }
      if (k === 'setoran') { document.documentElement.classList.remove('berbingkai'); if (C.toko) window.SetoranBukti.buka($('stIsi'), C.toko, C.nama); return; }
      tekan(k); setTimeout(ukur, 0);
    },
    siap: function (ctx) {
      C.peran = ctx.peran; C.nama = '';
      if (ctx.peran === 'manajemen') {
        try { C.toko = TOKO_URL || localStorage.getItem('tokoPilihan') || ''; if (TOKO_URL) localStorage.setItem('tokoPilihan', TOKO_URL); } catch (x) { C.toko = TOKO_URL; }
        var nav = document.querySelector('#mSide nav');
        if (nav) nav.insertAdjacentHTML('beforeend', '<div class="grp">APLIKASI LAIN</div><a class="it" href="master.html">' + M.svg('beranda') + '<span class="nm">Master Data</span></a>');
      }
      C.aktif = M.aktif() || 'jual';
      muat();
    }
  });
})();
