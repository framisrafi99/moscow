/* Diambil dari form.html supaya tersimpan di perangkat (lebih cepat dibuka). */
(function () {
  var M = Moscow, sb = M.sb, esc = M.esc;
  var SERVER = 'https://script.google.com/macros/s/AKfycbxcidGDrc33WJYcxzPf1dnRFzgafzbhwomXKlj3KjfYUHosPyI0qNpBcY9tvI7-PgI2/exec?app=';

  // Tiap form: siapa yang boleh, menu aplikasi, dan tombol form lama yang ditekan untuk tiap menu.
  // Langkah '#id' = tombol dengan id itu; 'teks@wadah' = tombol berteks itu langsung di dalam wadah (pemilih CSS).
  var FORM = {
    gudang: {
      judul: 'GUDANG UTAMA', masuk: 'Gudang Utama & Purchasing', peran: ['gudang', 'purchasing_shopeepay', 'manajemen'],
      sembunyi: '.m:has(> [data-m]), #mmhBtn',
      menu: [
        { k: 'stok', nm: 'Stok', ik: 'stok', l: ['Stok@.m'] },
        { k: 'order', nm: 'Order masuk', ik: 'nota', l: ['Order Masuk@.m'], pendek: 'Order' },
        { k: 'ajuan', nm: 'Pengajuan', ik: 'purch', l: ['Pengajuan@.m'] },
        { k: 'salur', nm: 'Penyaluran', ik: 'pemasok', l: ['Penyaluran@.m'] },
        { k: 'riwayat', nm: 'Riwayat', ik: 'riwayat', l: ['Riwayat@.m'] },
        { k: 'uang', nm: 'Uang keluar', ik: 'uang', l: ['Uang keluar@.m'], pendek: 'Uang' },
        { k: 'hpp', nm: 'HPP & Harga', ik: 'harga', l: [], modal: '#mmhBtn', kotak: 'mmhBox' },
        { k: 'lapajuan', nm: 'Laporan pengajuan (PDF)', ik: 'nota', panel: 'ajuan', pendek: 'Lap. ajuan' }
      ],
      bawah: ['stok', 'order', 'salur', 'ajuan', 'lain']
    },
    produksi: {
      judul: 'STAF PRODUKSI', masuk: 'Form staf produksi', peran: ['produksi', 'manajemen'],
      sembunyi: '.t:has(> #pgsT1), .tabs:has(> #tab1)',
      menu: [
        { k: 'isi', nm: 'Isi laporan', ik: 'produksi', l: ['#pgsT1', '#tab1'], pendek: 'Laporan' },
        { k: 'data', nm: 'Data produksi', ik: 'dasbor', l: ['#pgsT1', '#tab2'], pendek: 'Data' },
        { k: 'riwayat', nm: 'Riwayat', ik: 'riwayat', l: ['#pgsT1', '#tab3'] },
        { k: 'order', nm: 'Order masuk', ik: 'nota', l: ['#pgsT1', '#tab4'], pendek: 'Order' },
        { k: 'botol', nm: 'Botol, stiker & packaging', ik: 'stok', l: ['#pgsT1', '#tab5'], pendek: 'Botol & packing' },
        { k: 'pantau', nm: 'Pantau produksi', ik: 'laporan', l: ['#pgsT1', '#tabPP'] },
        { k: 'rencana', nm: 'Rencana produksi', ik: 'setuju', l: ['#pgsT1', '#tabRPD'] },
        { k: 'sesuai', nm: 'Penyesuaian stok', ik: 'atur', l: ['#pgsT1', '#tabPS'] },
        { k: 'kemasan', nm: 'Harga kemasan', ik: 'harga', l: ['#pgsT1', '#tabKms'] },
        { k: 'ajuan', nm: 'Pengajuan pembelian', ik: 'purch', l: ['#pgsT2'], pendek: 'Pengajuan' },
        { k: 'lapajuan', nm: 'Laporan pengajuan (PDF)', ik: 'nota', panel: 'ajuan', pendek: 'Lap. ajuan' }
      ],
      bawah: ['isi', 'data', 'order', 'botol', 'lain']
    },
    bahanbaku: {
      judul: 'STAF BAHAN BAKU', masuk: 'Form staf bahan baku', peran: ['bahan_baku', 'manajemen'],
      sembunyi: '.t:has(> #pgsT1), #tabs:has(> #tabBeli)',
      menu: [
        { k: 'produksi', nm: 'Produksi', ik: 'produksi', l: ['#pgsT1', 'Produksi@#tabs'] },
        { k: 'pigment', nm: 'Mixing pigment', ik: 'muat', l: ['#pgsT1', 'Mixing pigment@#tabs'], pendek: 'Pigment' },
        { k: 'warna', nm: 'Mixing warna', ik: 'muat', l: ['#pgsT1', 'Mixing warna@#tabs'], pendek: 'Warna' },
        { k: 'pakai', nm: 'Pakai / rusak', ik: 'nota', l: ['#pgsT1', 'Pakai / rusak@#tabs'], pendek: 'Pakai' },
        { k: 'beli', nm: 'Pembelian', ik: 'purch', l: ['#pgsT1', '#tabBeli'] },
        { k: 'sesuai', nm: 'Penyesuaian', ik: 'atur', l: ['#pgsT1', 'Penyesuaian@#tabs'] },
        { k: 'stok', nm: 'Stok bahan', ik: 'stok', l: ['#pgsT1', 'Stok bahan@#tabs'], pendek: 'Stok' },
        { k: 'harga', nm: 'Harga', ik: 'harga', l: ['#pgsT1', '#tabHarga'] },
        { k: 'laporan', nm: 'Laporan', ik: 'laporan', l: ['#pgsT1', 'Laporan@#tabs'] },
        { k: 'pantau', nm: 'Pantau produksi', ik: 'dasbor', l: ['#pgsT1', '#tabPP'] },
        { k: 'rencana', nm: 'Rencana bahan', ik: 'setuju', l: ['#pgsT1', '#tabRBB'] },
        { k: 'ajuan', nm: 'Pengajuan pembelian', ik: 'purch', l: ['#pgsT2'], pendek: 'Pengajuan' },
        { k: 'lapajuan', nm: 'Laporan pengajuan (PDF)', ik: 'nota', panel: 'ajuan', pendek: 'Lap. ajuan' }
      ],
      bawah: ['produksi', 'pigment', 'pakai', 'stok', 'lain']
    },
    mike: {
      judul: 'KENDALI BISNIS', masuk: 'Halaman Mike', peran: ['kendali_bisnis', 'manajemen'],
      sembunyi: '#kbTabs, .foot',
      menu: [
        { k: 'impor', nm: 'Impor', ik: 'purch', l: ['Impor@#kbTabs'] },
        { k: 'laporan', nm: 'Laporan', ik: 'laporan', l: ['Laporan@#kbTabs'] },
        { k: 'hpp', nm: 'HPP & Harga', ik: 'harga', l: ['HPP & Harga@#kbTabs'], pendek: 'HPP' },
        { k: 'naik', nm: 'ACC ubah HPP', ik: 'dasbor', l: ['Harga naik@#kbTabs'], pendek: 'ACC HPP' },
        { grup: 'PERSETUJUAN & LAPORAN' },
        { k: 'acc', nm: 'ACC Pengajuan', ik: 'setuju', href: 'form.html?f=mikelama#acc' },
        { k: 'laris', nm: 'Laris & Lambat', ik: 'jual', href: 'form.html?f=mikelama#laris' },
        { k: 'omzet', nm: 'Omzet & Profit', ik: 'uang', href: 'form.html?f=mikelama#omzet' },
        { k: 'stok', nm: 'Stok semua lokasi', ik: 'stok', href: 'stok.html' }
      ],
      bawah: ['impor', 'laporan', 'hpp', 'naik', 'lain']
    },
    mikelama: {
      judul: 'PERSETUJUAN & LAPORAN', masuk: 'Persetujuan & laporan Mike', peran: ['kendali_bisnis', 'manajemen'],
      sembunyi: '#tabs:has(> [data-t]), a[href*="hal=pengadaan"], a[href*="hal=gudang"]',
      menu: [
        { k: 'acc', nm: 'ACC Pengajuan', ik: 'setuju', l: ['ACC Pengajuan@#tabs'], pendek: 'ACC' },
        { k: 'naik', nm: 'Kenaikan harga', ik: 'harga', l: ['Kenaikan Harga@#tabs'], pendek: 'Harga naik' },
        { k: 'laris', nm: 'Laris & Lambat', ik: 'jual', l: ['Laris & Lambat@#tabs'], pendek: 'Laris' },
        { k: 'omzet', nm: 'Omzet', ik: 'uang', l: ['Omzet@#tabs'] },
        { k: 'profit', nm: 'Profit', ik: 'laporan', l: ['Profit@#tabs'] },
        { grup: 'KENDALI BISNIS' },
        { k: 'hppacc', nm: 'ACC ubah HPP', ik: 'setuju', href: 'form.html?f=mike#naik' },
        { k: 'kb', nm: 'Impor, laporan, HPP', ik: 'dasbor', href: 'form.html?f=mike' },
        { k: 'stok', nm: 'Stok semua lokasi', ik: 'stok', href: 'stok.html' }
      ],
      bawah: ['acc', 'naik', 'laris', 'omzet', 'lain']
    },
    akunting: {
      judul: 'ACCOUNTING', masuk: 'Accounting manajemen', peran: ['manajemen'],
      sembunyi: '#tabs:has(> [data-t])',
      menu: [
        { k: 'catat', nm: 'Catat transaksi', ik: 'uang', l: ['Catat@#tabs'], pendek: 'Catat' },
        { k: 'riwayat', nm: 'Riwayat', ik: 'riwayat', l: ['Riwayat@#tabs'] },
        { k: 'saldo', nm: 'Saldo akun', ik: 'dasbor', l: ['Saldo@#tabs'], pendek: 'Saldo' },
        { k: 'laporan', nm: 'Laporan bulanan', ik: 'laporan', l: ['Laporan@#tabs'], pendek: 'Laporan' }
      ],
      bawah: ['catat', 'riwayat', 'saldo', 'laporan']
    },
    // Master Data lama di dalam aplikasi baru: menu yang belum pindah (invoice & packing, upload marketplace, bagi hasil,
    // tutup buku, pelanggan & link, koreksi gudang, cetak PO, anggaran pengadaan). Penyimpanan tetap lewat Apps Script.
    // Link Purchasing (3 Nov): tampilan sendiri di aplikasi (purchasing-app.js), tidak lagi memuat form Apps Script.
    // PO & pembelian lain (buat PO, terima barang) ada di aplikasi Gudang Utama.
    purchasing: {
      judul: 'PURCHASING', masuk: 'Purchasing', peran: ['purchasing_shopeepay', 'manajemen'], asli: true,
      sembunyi: '.tidak-ada',
      menu: [
        { k: 'belanja', nm: 'Belanja', ik: 'purch' },
        { k: 'acc', nm: 'Sudah di-ACC', ik: 'setuju', pendek: 'Di-ACC' },
        { k: 'report', nm: 'Report PO', ik: 'laporan', pendek: 'Report' },
        { k: 'bayar', nm: 'Bayar PO', ik: 'uang' },
        { k: 'mike', nm: 'Dibayar Mike / Junior', ik: 'pelanggan', pendek: 'Mike/Junior' },
        { k: 'harga', nm: 'Harga naik', ik: 'harga' },
        { grup: 'APLIKASI LAIN' }, { k: 'gd', nm: 'Gudang Utama (PO & pembelian)', ik: 'gudang', href: 'form.html?f=gudang' }
      ],
      bawah: ['belanja', 'acc', 'report', 'bayar', 'lain']
    },
    mdlama: {
      judul: 'MASTER DATA LAMA', masuk: 'Master Data lama', peran: ['manajemen'],
      sembunyi: '.tidak-ada',
      menu: [{ k: 'md', nm: 'Master Data lama', ik: 'dasbor', l: [] }],
      bawah: ['md']
    },
    payroll: {
      judul: 'PAYROLL', masuk: 'Payroll gaji staf', peran: ['manajemen'],
      sembunyi: '.tidak-ada',
      menu: [{ k: 'gaji', nm: 'Gaji staf', ik: 'uang', l: [] }, { k: 'absensi', nm: 'Absensi staf', ik: 'riwayat', pendek: 'Absensi' }, { k: 'absen', nm: 'Hitung absensi', ik: 'dok', pendek: 'Hitung' }, { k: 'staf', nm: 'Data staf', ik: 'pelanggan', pendek: 'Staf' }],
      bawah: ['gaji', 'absensi', 'absen', 'staf']
    }
  };

  // Form yang dibuka: dari alamat (?f=...), atau yang terakhir dibuka di HP ini (alamat dirapikan setelah masuk Google).
  var APP = new URLSearchParams(location.search).get('f') || '';
  // Langsung ke layar tertentu di Master Data lama: buka=g:mkt (menu), #id (tekan tombol), ~id (gulir ke kotak).
  var BUKA = APP === 'mdlama' ? String(new URLSearchParams(location.search).get('buka') || '').split(',').filter(Boolean) : [];
  async function jalankanBuka(dok) {
    for (var i = 0; i < BUKA.length; i++) {
      var l = BUKA[i], el = null;
      for (var t = 0; t < 120 && !el; t++) {
        el = l.indexOf('g:') === 0 ? dok.querySelector('[data-g="' + l.slice(2) + '"]') : dok.getElementById(l.replace(/^[#~]/, ''));
        if (!el) await new Promise(function (r) { setTimeout(r, 500); });
      }
      if (!el) return;
      if (l.charAt(0) === '~') { try { el.scrollIntoView({ block: 'start' }); } catch (x) { } }
      else { el.click(); await new Promise(function (r) { setTimeout(r, 900); }); }
    }
    BUKA = [];
  }
  try { if (APP) localStorage.setItem('formApp', APP); else APP = localStorage.getItem('formApp') || ''; } catch (x) { }
  var F = FORM[APP];
  var C = { nama: '', frame: null, aktif: '' };
  function $(id) { return document.getElementById(id); }
  if (!F) { $('muatan').className = 'bad'; $('muatan').textContent = 'Form tidak dikenal. Buka lewat ikon aplikasi masing-masing.'; return; }
  document.title = F.masuk + ' - Moscow';

  var GAYA = '<style id="gayaBaru">' +
    ':root{--bg:#F4F7FA;--card:#fff;--ink:#0F1B2A;--mut:#5A6677;--line:#E2E7EE;--pri:#1E78A8;--ok:#146C43;--bad:#B42318;--warn:#9A5B00}' +
    'body{font-family:"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif!important;font-size:15px;padding-bottom:110px;-webkit-font-smoothing:antialiased;background:#F4F7FA}' +
    'body>header{display:none!important}.sembunyi-app{display:none!important}' +
    'main{max-width:860px}' +
    '.card{border-radius:16px;border-color:#E2E7EE;box-shadow:0 1px 2px rgba(15,27,42,.04)}' +
    '.btn{border-radius:12px;font-weight:700}' +
    'input[type=text],input[type=date],input[type=search],input[type=number],select,textarea{border-radius:12px}' +
    '</style>' +
    '<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">';

  // Pengganti google.script.run di form lama. Hasil diteruskan sebagai teks lalu dibaca di dalam form,
  // supaya datanya milik halaman form itu sendiri.
  var JEMBATAN = '<script>(function(){' +
    'function buat(s,f,u){return new Proxy({},{get:function(t,p){' +
    'if(p==="withSuccessHandler")return function(fn){return buat(fn,f,u);};' +
    'if(p==="withFailureHandler")return function(fn){return buat(s,fn,u);};' +
    'if(p==="withUserObject")return function(o){return buat(s,f,o);};' +
    'return function(){var a=JSON.parse(JSON.stringify([].slice.call(arguments)));window.parent.__formPanggil(p,a).then(function(t){if(s)s(JSON.parse(t),u);},function(e){if(f)f(new Error(String(e&&e.message||e)),u);else console.error(e);});};' +
    '}});}' +
    'window.google={script:{run:buat(null,null,undefined),host:{close:function(){}},url:{getLocation:function(cb){cb({parameter:{},hash:""});}}}};' +
    '})();<\/script>';

  async function token() {
    var s = await sb.auth.getSession();
    var t = s && s.data && s.data.session ? s.data.session.access_token : '';
    if (!t) throw new Error('Sesi masuk habis. Muat ulang halaman lalu masuk lagi.');
    return t;
  }
  var salinJalan = null;
  async function kirim(f, a) {
    if (salinJalan) { try { await salinJalan; } catch (e) { } }
    var badan = JSON.stringify({ t: await token(), f: f, a: a || [] });
    var r;
    try { r = await fetch(SERVER + APP, { method: 'POST', body: badan, redirect: 'follow' }); }
    catch (e) { throw new Error('Tidak tersambung ke server. Periksa internet lalu coba lagi.'); }
    var teks = await r.text(), d = null;
    try { d = JSON.parse(teks); } catch (e) { throw new Error('Jawaban server tidak terbaca. Coba lagi sebentar lagi.'); }
    if (!d || d.ok !== true) throw new Error((d && d.pesan) || 'Form ini belum aktif di server. Hubungi manajemen Moscow Supplies.');
    return d;
  }
  // Data halaman dibaca langsung dari Supabase (rumus sama dengan Apps Script, jauh lebih cepat, tidak memakai kuota).
  // Kalau simpan terakhir belum sempat disalin ke Supabase, atau Supabase gagal, halaman membaca lewat Apps Script seperti biasa.
  var BACA_SUPABASE = {
    gudang: {
      gdData: function () { return window.Gudang.gdData(sb); },
      gdxOrderMasuk: function () { return window.Gudang.gdxOrderMasuk(sb); },
      ptrData: function () { return window.Pengadaan.ptrData(sb, 'gudang'); },
      hppStafData: function (a) { return window.Hpp.hppStafData(sb, 'gudang', a[0]); },
      gdxPengajuan: function (a) { return a[0] && a[0].mm ? null : window.Pengadaan.gdxPengajuan(sb); },
      // Kantor Packing (stok, per warna) dihitung dari Supabase (kp.js).
      gdxKp: function () { return window.KantorPacking.gdxKp(sb); },
      gdxKpW: function (a) { return window.KantorPacking.gdxKpW(sb, a[0]); },
      // Uang keluar (riwayat), stok Toko / Consignment, kenaikan harga & qty berlebih (gdlain.js).
      gdxUangData: function (a) { return window.GudangLain.gdxUangData(sb, a[0]); },
      gdxLokasi: function () { return window.GudangLain.gdxLokasi(sb); },
      gdxHarga: function () { return window.GudangLain.gdxHarga(sb); }
    },
    produksi: {
      prodKebutuhan: function () { return window.Gudang.prodKebutuhan(sb); },
      kemasanHargaData: function () { return window.Produksi.kemasanHargaData(sb); },
      ptrData: function () { return window.Pengadaan.ptrData(sb, 'produksi'); },
      pgsTerbuka: function () { return window.Pengadaan.pgsTerbuka(sb, 'produksi'); },
      pantauProduksi: function (a) { return window.BahanBaku.pantauProduksi(sb, a[0], 'produksi'); },
      rencanaProduksi: function () { return window.BahanBaku.rencanaProduksi(sb); },
      hppStafData: function (a) { return window.Hpp.hppStafData(sb, 'produksi', a[0]); },
      pgsData: function (a) { return a[0] && a[0].mm ? null : window.Pengadaan.pgsData(sb, 'produksi'); },
      stokBahan: function () { return window.Produksi.stokBahan(sb); },
      ambilBahan: function () { return window.Produksi.ambilBahan(sb); },
      ambilOrderProduksi: function (a) { return window.Produksi.ambilOrderProduksi(sb, a[0]); },
      prodSesuaiDaftar: function () { return window.Produksi.prodSesuaiDaftar(sb); },
      ambilRiwayatProduksi: function (a) { return window.Produksi.ambilRiwayatProduksi(sb, a[0]); },
      ambilStok: function () { return window.Produksi.ambilStok(sb); }
    },
    bahanbaku: {
      ptrData: function () { return window.Pengadaan.ptrData(sb, 'bahanbaku'); },
      pgsTerbuka: function () { return window.Pengadaan.pgsTerbuka(sb, 'bahanbaku'); },
      bahanBakuData: function (a) { return window.BahanBaku.bahanBakuData(sb, a[0]); },
      bahanBakuLaporan: function (a) { return window.BahanBaku.bahanBakuLaporan(sb, a[0]); },
      pantauProduksi: function (a) { return window.BahanBaku.pantauProduksi(sb, a[0], 'bahan'); },
      rencanaBahan: function (a) { return window.BahanBaku.rencanaBahan(sb, a[0]); },
      hppStafData: function (a) { return window.Hpp.hppStafData(sb, 'bahanbaku', a[0]); },
      pgsData: function (a) { return a[0] && a[0].mm ? null : window.Pengadaan.pgsData(sb, 'bahanbaku'); }
    }
  };
  // Form accounting manajemen (31 Okt): saldo, riwayat, laporan bulanan, dan metode bayar nota dari Supabase (akun.js).
  BACA_SUPABASE.akunting = {
    akuntingData: function () { return window.Akunting.akuntingData(sb); },
    akuntingLaporan: function (a) { return window.Akunting.akuntingLaporan(sb, a[0]); },
    mbDaftar: function () { return window.Akunting.mbDaftar(sb); }
  };
  // Link Purchasing (Viory, 31 Okt): daftar belanja lokal, report, PO lokal, dan Dibayar Mike / Junior dari Supabase (pl.js).
  BACA_SUPABASE.purchasing = {
    plData: function () { return window.Purchasing.plData(sb); },
    plxData: function () { return window.Purchasing.plxData(sb); }
  };
  // Halaman Mike / Kendali Bisnis (31 Okt): impor, laporan, HPP & harga, harga naik dari Supabase (kb.js).
  BACA_SUPABASE.mike = {
    kbData: function () { return window.KendaliBisnis.kbData(sb); },
    kbLaporan: function (a) { return window.KendaliBisnis.kbLaporan(sb, a[0] || {}); },
    kbHarga: function () { return window.KendaliBisnis.kbHarga(sb); },
    kbNaik: function () { return window.KendaliBisnis.kbNaik(sb); }
  };
  // Persetujuan & laporan Mike (ACC Pengajuan, Kenaikan harga, Laris & Lambat, Omzet, Profit) dari Supabase (4 Nov 2026).
  // Rumus sama dengan Apps Script: pgdData (robot.js), impData (kb.js kbData.tunggu = PW_imporTunggu_), hppMikeData (kb.js kbNaik.usul),
  // hrgNaikData & bbrData (md.js), ceoUang (file 27, dari Dasbor.dsData).
  function CEO_grup_(n) {
    var s = String(n || '').toLowerCase();
    if (/reseller/.test(s)) return 'Reseller';
    if (/shopee|tokopedia|tokped|lazada|tiktok|online|marketplace/.test(s)) return 'Online';
    if (/offline/.test(s)) return 'Toko offline';
    return 'Consignment';
  }
  async function ceoUang(p) {
    var r = await window.Dasbor.dsData(sb, { dari: p && p.dari, sampai: p && p.sampai });
    if (!r || !r.ok) return null;
    var u = r.uang || null, t = r.terjual || null, URUT = ['Online', 'Consignment', 'Toko offline', 'Reseller'], G = {};
    URUT.forEach(function (n) { G[n] = { n: n, v: 0, l: 0, q: 0, det: [] }; });
    (t && t.saluran ? t.saluran : []).forEach(function (s) {
      var x = G[CEO_grup_(s.n)];
      x.v += s.omzet || 0; x.l += s.omzetL || 0; x.q += s.q || 0;
      if (s.omzet || s.omzetL) x.det.push({ n: String(s.n).replace(/^Consignment /, ''), v: s.omzet || 0, l: s.omzetL || 0, q: s.q || 0 });
    });
    if (u) {
      var ini = {}, lalu = u.saluranLalu || {};
      (u.saluran || []).forEach(function (x) { ini[x.n] = x.v; });
      Object.keys(ini).concat(Object.keys(lalu)).filter(function (k, i, a) { return a.indexOf(k) === i; }).forEach(function (k) {
        if (CEO_grup_(k) !== 'Online') return;
        var v = ini[k] || 0, l = lalu[k] || 0;
        if (!v && !l) return;
        G.Online.v += v; G.Online.l += l;
        G.Online.det.push({ n: String(k).replace(/^Penjualan /, ''), v: v, l: l, q: 0 });
      });
    }
    var omzet = URUT.map(function (n) { var x = G[n]; x.det.sort(function (a, b) { return b.v - a.v; }); return x; });
    var profit = null;
    if (u) {
      var kat = {}, katL = u.saluranLalu || {};
      (u.saluran || []).forEach(function (x) { kat[x.n] = x.v; });
      var ada = function (o, nama) { return Object.keys(o).some(function (k) { return k.toLowerCase() === nama.toLowerCase() && o[k]; }); };
      var hpp = 0, hppL = 0, luar = [];
      (t && t.saluran ? t.saluran : []).forEach(function (s) {
        var nama = s.n === 'Reseller' ? 'Penjualan reseller' : 'Penjualan ' + s.n;
        if (ada(kat, nama)) hpp += s.hpp || 0; else if (s.omzet) luar.push({ n: String(s.n).replace(/^Consignment /, ''), v: s.omzet });
        if (ada(katL, nama)) hppL += s.hppL || 0;
      });
      profit = {
        pend: u.ini.pend, pendL: u.lalu.pend, hpp: Math.round(hpp), hppL: Math.round(hppL), ops: u.ini.ops, opsL: u.lalu.ops,
        laba: Math.round(u.ini.pend - hpp - u.ini.ops), labaL: Math.round(u.lalu.pend - hppL - u.lalu.ops),
        pendKat: (u.saluran || []).map(function (x) { return { n: String(x.n).replace(/^Penjualan /, ''), v: x.v }; }),
        beban: (u.beban || []).slice(0, 10), beli: u.ini.beli, luar: luar
      };
    }
    return { ok: true, dari: r.dari, sampai: r.sampai, lDari: r.lDari, lSampai: r.lSampai, hariIni: r.hariIni,
      omzet: omzet, profit: profit, tanpaHpp: t && t.tanpaHpp ? t.tanpaHpp.length : 0, gagal: r.gagal || [], diperbarui: r.diperbarui };
  }
  BACA_SUPABASE.mikelama = {
    pgdData: async function () {
      if (!window.RobotBeli) return null;
      var r = await window.RobotBeli.pgdData(sb);
      if (r && r.ok) { r.peran = 'ceo'; r.link = null; }
      return r;
    },
    impData: async function () {
      var r = await window.KendaliBisnis.kbData(sb);
      return r && r.ok ? { ok: true, list: r.tunggu, hariIni: window.Lembar.format(new Date(), 'yyyy-MM-dd'), diperbarui: window.Lembar.format(new Date(), 'dd/MM/yyyy HH:mm') } : null;
    },
    hppMikeData: async function () {
      var r = await window.KendaliBisnis.kbNaik(sb);
      return r && r.ok ? { ok: true, list: r.usul } : null;
    },
    hrgNaikData: function () { return window.MdLama.hrgNaikData(sb); },
    bbrData: function () { return window.MdLama.bbrData(sb); },
    ceoUang: function (a) { return ceoUang(a[0] || {}); }
  };
  // Master Data lama (31 Okt): bagian yang dihitung dari Supabase (md.js, akun.js, produksi.js); selebihnya tetap Apps Script.
  BACA_SUPABASE.mdlama = {
    akuntingLaporan: function (a) { return window.Akunting.akuntingLaporan(sb, a[0]); },
    prodSesuaiDaftar: function () { return window.Produksi.prodSesuaiDaftar(sb, true); },
    pinjamPemilik: function () { return window.MdLama.pinjamPemilik(sb); },
    sesuaiPemilik: function () { return window.MdLama.sesuaiPemilik(sb); },
    rpPantau: function () { return window.MdLama.rpPantau(sb); },
    rpDaftar: function () { return window.MdLama.rpDaftar(sb); },
    mdSetujuData: function () { return window.MdLama.mdSetujuData(sb); },
    pgsTanpaData: function () { return window.MdLama.pgsTanpaData(sb); },
    ttpPemilikData: async function (a) { var p = a[0] || {}; var r = await sb.rpc('ttp_pemilik_data', { p_toko: teks(p.toko), p_bulan: teks(p.bulan) }); if (r.error) throw new Error(r.error.message); return r.data; },
    hargaBahanBakuMaster: function () { return window.MdLama.hargaBahanBakuMaster(sb); },
    hrgNaikData: function () { return window.MdLama.hrgNaikData(sb); },
    mdRingkasan: function () { return window.MdLama.mdRingkasan(sb); },
    gdRingkas: function () { return window.MdLama.gdRingkas(sb); },
    // Dasbor lama (file 13 dsData). Beda dgn Apps Script hanya disengaja: stok online memakai jam hitung Kantor Packing dalam WITA
    // (Apps Script membandingkan jam WIB dengan waktu kirim WITA, dan totalnya tidak dihitung ulang sesudah koreksi), dan laporan Renon BATAL tidak dihitung.
    dsData: function (a) { var p = a[0] || {}; return window.Dasbor.dsData(sb, { dari: p.dari, sampai: p.sampai }); },
    mpRingkasOfficial: function (a) { return window.MdLama.mpRingkasOfficial(sb, a[0] || {}); },
    mpData: function (a) { return window.MdLama.mpData(sb, a[0] || {}); },
    pantauProduksi: function (a) { var j = a[0] && a[0].jenis; return j === 'produksi' || j === 'bahan' ? window.BahanBaku.pantauProduksi(sb, a[0], j) : null; },
    rencanaProduksi: function () { return window.BahanBaku.rencanaProduksi(sb); },
    rencanaBahan: function (a) { return window.BahanBaku.rencanaBahan(sb, a[0] || {}); },
    // 4 Nov 2026: dicocokkan dengan Apps Script (sama; pgdData Supabase memakai setelan waktu tunggu terbaru, gjData memakai link slip baru).
    stokBahan: function () { return window.Produksi.stokBahan(sb); },
    bahanBakuData: function (a) { return window.BahanBaku.bahanBakuData(sb, a[0] || {}); },
    ambilPantau: function (a) { return window.Produksi.ambilPantau(sb, a[0] || {}); },
    mdeData: function () { return window.MdLama.mdeData(sb); },
    pgdData: function () { return window.RobotBeli.pgdData(sb); },
    tbBeranda: function () { return window.Akunting.berandaData(sb); },
    // Tutup buku (tpb.js, sama dengan Master Data baru): daftar & pemeriksaan bulan, penyeimbang hitung stok.
    tpbData: function (a) { return window.TutupBuku.tpbData(sb, a[0] || {}); },
    tpbPenyeimbang: function () { return window.TutupBuku.penyeimbang(sb); },
    // HPP & Harga, stok sistem di Edit Barang (md.js; harga dasar & stok Renon memakai data Supabase yang sudah dirapikan).
    mmHargaData: function () { return window.MdLama.mmHargaData(sb); },
    mdeStok: function (a) { return window.MdLama.mdeStok(sb, a[0] || {}); },
    tokoHasilPenjualan: function (a) { return window.TokoMd.hasilPenjualan(sb, a[0] || {}); },
    // Order & omzet toko (tokomd.js; omzet Renon tanpa baris yang dibatalkan, sama dengan Master Data baru).
    ambilOrder: function (a) { return window.TokoMd.ambilOrder(sb, a[0] || {}); },
    omzetKotor: function (a) { return window.TokoMd.omzetKotor(sb, a[0] || {}); },
    pieToko: function (a) { return window.TokoMd.pieToko(sb, a[0] || {}); },
    laporanToko: function (a) { return window.TokoMd.laporanToko(sb, a[0] || {}); },
    // Bagi hasil consignment & invoice (bhmd.js / bagihasil.js, sama dengan Master Data baru); setoran tercatat dari catatan accounting.
    bagiHasilDataX: async function (a) {
      var p = a[0] || {}, r = await window.BagiHasilMd.hitung(sb, teks(p.bulan));
      return r && r.ok ? (r.toko.filter(function (x) { return x.toko === teks(p.toko); })[0] || null) : null;
    },
    bhInvoice: async function (a) {
      var p = a[0] || {}, toko = teks(p.toko), bulan = teks(p.bulan);
      var h = await Promise.all([sb.rpc('toko_bahan_bagi_hasil', { p_toko: toko, p_bulan: bulan }), window.BagiHasilMd.hitung(sb, bulan)]);
      if (h[0].error || !h[0].data || h[0].data.ok !== true) return null;
      var v = window.BagiHasil.invoice(toko, bulan, h[0].data, false);
      var d = h[1] && h[1].ok ? h[1].toko.filter(function (x) { return x.toko === toko; })[0] : null, st = d && ((d.dc && d.dc.setoran) || (d.rn && d.rn.setoran));
      if (v && v.ok && st) v.tercatat = st.tercatat;
      return v;
    },
    riwayatHitung: function (a) { var t = teks((a[0] || {}).toko); return t && window.TokoBaca ? window.TokoBaca.riwayatHitung(sb, t) : null; },
    // Koreksi catatan gudang (5 Nov 2026): daftar catatan Gudang Utama beberapa hari terakhir (kgh_daftar).
    kghDaftar: function (a) { return ['kgh_daftar', { p_hari: Number((a[0] || {}).hari) || 30 }]; },
    gjData: async function (a) {
      var r = await sb.rpc('gaji_data', { p_per: teks((a[0] || {}).per) });
      if (r.error) throw new Error(r.error.message);
      return r.data;
    }
  };
  // Payroll (tahap 5f): data gaji langsung dari Supabase.
  BACA_SUPABASE.payroll = {
    gjData: async function (a) {
      var r = await sb.rpc('gaji_data', { p_per: teks((a[0] || {}).per) });
      if (r.error) throw new Error(r.error.message);
      return r.data;
    }
  };
  var basiSampai = 0;
  // Fungsi simpan (sama dengan daftar fungsi tulis di Apps Script). Kalau salinannya ke Supabase tidak terkonfirmasi, baca lewat Apps Script dulu.
  var TULIS_RE = /^(simpan|ajukan|gd(Biaya|Kirim|Opname|Po|Terima)|gdx(Order(Kirim|Proses)|Kp|Harga|Ajukan)|prodSesuai|putusSesuai|kembaliPinjam|tandaiSampai|ubahStatusOrder|rp(Tandai|Putus)|kemasanHargaSimpan|ptrTerima|pgsAjukan|pgdAjukan|pgdAksi|plx?(Aksi|Bayar|Tolak|PoBayar|KoreksiQty)|bahanBaku(Beli|Pakai|Produksi|Sampai|Sesuai|Warna|StafTambah)|hppUsul)/;
  // Batas tunggu baca Supabase: biasanya < 1 detik. Kalau sesekali tersendat (mis. server sedang memuat ulang),
  // jangan biarkan staf menunggu puluhan detik: hentikan setelah 8 detik, coba sekali lagi, baru pindah ke Apps Script.
  function batasWaktu(p, ms) {
    return Promise.race([p, new Promise(function (_, tolak) { setTimeout(function () { tolak(new Error('lambat')); }, ms); })]);
  }
  async function bacaSupabase(f, a) {
    var peta = BACA_SUPABASE[APP];
    if (!peta || !peta[f] || Date.now() < basiSampai) return null;
    for (var coba = 0; coba < 2; coba++) {
      try {
        if (coba && window.Gudang) window.Gudang.lupakan();
        var r = await batasWaktu(peta[f](a || []), 8000);
        return r && r.ok === true ? r : null;
      } catch (e) {
        console.warn('baca Supabase gagal', f, coba, e);
        if (!e || e.message !== 'lambat') return null;
      }
    }
    return null;
  }
  // Simpan langsung di Supabase (tahap 3): pemeriksaan sama dengan Apps Script; Apps Script menyalinnya ke Google Sheets.
  function teks(v) { return String(v === undefined || v === null ? '' : v); }
  // Usulan HPP / harga jual dari form staf (manajemen tetap lewat Apps Script karena langsung berlaku).
  function hppUsulRpc(app) {
    return function (p) {
      return ['hpp_usul', { p_app: app, p_jenis: teks(p.jenis), p_k: teks(p.k), p_nilai: teks(p.nilai), p_alasan: teks(p.alasan), p_nama: teks(p.nama), p_token: teks(p.token) }];
    };
  }

  // Terima barang yang sudah dibayar Purchasing (ptrTerima, file 72) langsung di Supabase, tanpa Apps Script (4 Nov 2026).
  // Cabangnya sama dengan Apps Script: PO gudang -> gudang_terima_po; bahan baku -> bbk_beli + bbk_sampai;
  // botol & stiker produksi -> produksi_simpan_masuk; selebihnya ditandai diterima saja (ptr_tandai_terima).
  function ptrTerimaRpc(app) {
    return async function (p) {
      async function rpc(nm, a) { var r = await sb.rpc(nm, a); if (r.error) throw new Error('Gagal menyimpan: ' + r.error.message + '. Tekan simpan sekali lagi; aman, tidak akan tercatat dua kali.'); return r.data; }
      function tandai(qty, ket) { return rpc('ptr_tandai_terima', { p_app: app, p_no: no, p_qty: String(qty), p_ket: ket, p_nama: nama }); }
      var no = teks(p.no).trim().slice(0, 30), nama = teks(p.nama).replace(/\s+/g, ' ').trim().slice(0, 40);
      if (nama.length < 2) return { ok: false, pesan: 'Isi nama penerima.' };
      var c = await window.Pengadaan.ptrCari(sb, app, no);
      if (!c) return { ok: false, pesan: 'Pengajuan ' + no + ' tidak ada di daftar barang dibayar bagian ini. Muat ulang.' };
      var x = c.x, dibeli = x.qs !== null && x.qs !== undefined ? x.qs : x.q;
      var qty = Number(teks(p.qty).replace(',', '.'));
      if (!(qty > 0) || qty > 1000000) return { ok: false, pesan: 'Isi jumlah yang diterima.' };
      var cat = teks(p.catatan).replace(/\s+/g, ' ').trim().slice(0, 150);
      if (Math.abs(qty - dibeli) > 1e-9 && cat.length < 3) return { ok: false, pesan: 'Jumlah diterima berbeda dengan yang dibeli (' + dibeli + ' ' + x.s + '). Isi catatannya.' };
      var tag = '[' + x.no + ']', token = teks(p.token).slice(0, 60) || ('ptr' + x.no + qty), hari = hariIni();
      var po = (/\b(PO-\d{6}-\d+)\b/.exec(x.ref || '') || [])[1] || '';
      if (x.kel === 'Barang jualan') {
        if (!po) return tandai(qty, 'tanpa PO');
        if (Math.round(qty) !== qty) return { ok: false, pesan: 'Jumlah barang jualan harus angka bulat.' };
        return rpc('gudang_terima_po', { p_tanggal: hari, p_no: po, p_nama: nama, p_catatan: (tag + ' ' + cat).trim(), p_token: token,
          p_items: [{ k: x.k, w: x.w || '', baik: qty, rusak: 0 }] });
      }
      if (x.kel === 'Bahan baku' && app === 'bahanbaku' && x.k) {
        var tot = (/Rp ([\d.]+)/.exec(x.ref || '') || [])[1], bag = String(x.ref || '').split(' · ');
        var beli = await rpc('bbk_beli', { p_tanggal: x.wps || hari, p_kode: x.k, p_qty: String(dibeli), p_satuan: x.s, p_harga: tot ? String(Number(tot.replace(/\./g, '')) || '') : '',
          p_supplier: bag[bag.length - 1].slice(0, 60), p_catatan: tag + ' dibayar Viory', p_pengisi: nama, p_baru: null, p_token: token + 'b' });
        if (!beli || !beli.ok) return beli && beli.lewat ? { ok: false, pesan: 'Pembelian bahan ini perlu dicatat lewat menu Pembelian.' } : (beli || { ok: false, pesan: 'Gagal mencatat pembelian bahan baku.' });
        var pb = (/Pembelian (\S+) tercatat/.exec(beli.pesan || '') || [])[1];
        if (!pb) {
          var cek = await sb.from('pengadaan_ajuan').select('ref_po_supplier').eq('no', x.no).limit(1);
          pb = cek.data && cek.data[0] ? (/Form bahan baku (\S+)/.exec(cek.data[0].ref_po_supplier || '') || [])[1] : '';
        }
        if (!pb) return { ok: false, pesan: 'Pembelian tercatat, tapi nomor pembeliannya tidak terbaca. Tandai Sampai lewat form bahan baku > Pembelian.' };
        return rpc('bbk_sampai', { p_no: pb, p_tanggal: hari, p_qty: String(qty), p_pengisi: nama, p_catatan: cat || ('Diterima dari pengajuan ' + x.no) });
      }
      if ((x.kel === 'Botol & stiker' || x.kel === 'Packaging & lainnya') && app === 'produksi') {
        if (Math.round(qty) !== qty) return { ok: false, pesan: 'Jumlah harus angka bulat.' };
        if (!c.adaStm) {
          var t = await tandai(qty, 'tanpa stok sistem: tidak ada di daftar botol & stiker');
          if (t && t.ok) t.pesan = x.no + ' ditandai diterima (barang ini tidak ada di daftar stok botol & stiker).';
          return t;
        }
        return rpc('produksi_simpan_masuk', { p_tanggal: hari, p_nama: c.nama, p_qty: String(qty), p_pengisi: nama, p_catatan: (tag + ' ' + cat).trim(), p_token: token });
      }
      return tandai(qty, 'tanpa stok sistem');
    };
  }
  var TULIS_SUPABASE = {
    produksi: {
      ptrTerima: ptrTerimaRpc('produksi'),
      hppUsul: hppUsulRpc('produksi'),
      // Harga kemasan (31 Okt): langsung di Supabase; kenaikan harga dicatat Apps Script (efek_antre 'kemasan_harga').
      kemasanHargaSimpan: function (p) {
        return ['kemasan_harga_simpan', { p_baris: Math.round(Number(p.baris)) || 0, p_tanggal: teks(p.tanggal), p_nama: teks(p.nama), p_harga: teks(p.harga),
          p_pengisi: teks(p.pengisi), p_supplier: teks(p.supplier) }];
      },
      // Pengajuan pembelian (pgdAjukan + pembungkus): robot dari potret; Telegram, pesan Mike & Viory oleh Apps Script (efek_antre).
      pgsAjukan: function (p) {
        return ['pengadaan_ajukan', { p_app: 'produksi', p_nama: teks(p.nama), p_yakin: p.yakin === true, p_items: Array.isArray(p.items) ? p.items : [], p_token: teks(p.token) }];
      },
      // Laporan produksi: dicatat + otomatis disalurkan ke Gudang Utama di Supabase; Telegram dikirim Apps Script (efek_antre).
      simpanLaporan: function (p) {
        return ['produksi_simpan_laporan', { p_jenis: teks(p.jenis), p_tanggal: teks(p.tanggal), p_tujuan: teks(p.tujuan), p_nama: teks(p.nama),
          p_items: Array.isArray(p.items) ? p.items : [], p_token: teks(p.token) }];
      },
      simpanBahan: function (p) {
        return ['produksi_simpan_bahan', { p_tanggal: teks(p.tanggal), p_jenis: teks(p.jenis), p_nama: teks(p.nama), p_qty: teks(p.qty),
          p_pengisi: teks(p.pengisi), p_catatan: teks(p.catatan), p_token: teks(p.token) }];
      },
      simpanBahanRusak: function (p) {
        return ['produksi_simpan_rusak', { p_tanggal: teks(p.tanggal), p_nama: teks(p.nama), p_qty: teks(p.qty),
          p_pengisi: teks(p.pengisi), p_catatan: teks(p.catatan), p_token: teks(p.token) }];
      },
      // Stok masuk botol / stiker dari pengajuan (pengajuan -> Diterima lewat ubah_antre). "Tanpa pengajuan" tetap lewat Apps Script.
      simpanBahanMasuk: function (p) {
        return ['produksi_simpan_masuk', { p_tanggal: teks(p.tanggal), p_nama: teks(p.nama), p_qty: teks(p.qty),
          p_pengisi: teks(p.pengisi), p_catatan: teks(p.catatan), p_token: teks(p.token) }];
      },
      // Ajuan penyesuaian stok produksi / botol / stiker (stok sistem dihitung di Supabase).
      prodSesuaiAjukan: function (p) {
        return ['produksi_sesuai_ajukan', { p_bagian: teks(p.bagian), p_kode: teks(p.kode), p_nama: teks(p.nama), p_warna: teks(p.warna),
          p_hitung: teks(p.hitung), p_alasan: teks(p.alasan), p_pengaju: teks(p.pengaju), p_token: teks(p.token) }];
      }
    },
    gudang: {
      hppUsul: hppUsulRpc('gudang'),
      ptrTerima: ptrTerimaRpc('gudang'),
      gdxKpUsul: hppUsulRpc('kp'),
      // Hitung stok & penyesuaian Kantor Packing: stok sistem dari kp.js, dicatat RPC kp_ajuan.
      gdxKpHitung: function (p) { return window.KantorPacking.gdxKpHitung(sb, p); },
      gdxKpHitungW: function (p) { return window.KantorPacking.gdxKpHitungW(sb, p); },
      gdxKpSesuaiW: function (p) { return window.KantorPacking.gdxKpSesuaiW(sb, p); },
      // Pengajuan pembelian (pgdAjukan + pembungkus): robot dari potret; Telegram, pesan Mike & Viory oleh Apps Script (efek_antre).
      gdxAjukan: function (p) {
        return ['pengadaan_ajukan', { p_app: 'gudang', p_nama: teks(p.nama), p_yakin: p.yakin === true, p_items: Array.isArray(p.items) ? p.items : [], p_token: teks(p.token) }];
      },
      // Kirim barang keluar (tab Kirim barang). Order yang tuntas -> status Dikirim + Telegram dijalankan Apps Script (efek_antre).
      gdKirim: function (p) {
        return ['gudang_kirim', { p_tanggal: teks(p.tanggal), p_tujuan: teks(p.tujuan), p_nama: teks(p.nama), p_catatan: teks(p.catatan),
          p_order: teks(p.order), p_items: Array.isArray(p.items) ? p.items : [], p_token: teks(p.token) }];
      },
      // Hitung stok (opname) dan penyesuaian stok gudang: ajuan menunggu persetujuan; Telegram dijalankan Apps Script (efek_antre).
      gdOpname: function (p) {
        return ['gudang_opname', { p_nama: teks(p.nama), p_alasan: teks(p.alasan), p_items: Array.isArray(p.items) ? p.items : [], p_token: teks(p.token) }];
      },
      // Order Masuk: tombol "Kirim" (surat jalan + info pengiriman di ORDER_PROSES). Dengan foto paket tetap lewat Apps Script (foto ke Drive).
      gdxOrderKirim: function (p) {
        if (p.foto) return Promise.resolve(null);
        return ['gudang_order_kirim', { p_tanggal: teks(p.tanggal), p_tujuan: teks(p.tujuan), p_nama: teks(p.nama), p_catatan: teks(p.catatan),
          p_order: teks(p.order), p_items: Array.isArray(p.items) ? p.items : [], p_token: teks(p.token),
          p_kurir: teks(p.kurir), p_resi: teks(p.resi), p_ongkir: teks(p.ongkir) }];
      },
      // Terima kiriman dari produksi (bukti TP-) langsung di Supabase.
      gdTerimaProduksi: function (p) {
        return ['gudang_terima_produksi', { p_tanggal: teks(p.tanggal), p_nama: teks(p.nama), p_items: Array.isArray(p.items) ? p.items : [], p_token: teks(p.token) }];
      },
      // Pengajuan: dipesan / diterima / batal (gudang) dan dipesan / batal (link Purchasing, plAksi) langsung di Supabase.
      pgdAksi: function (p) {
        return ['pengadaan_aksi', { p_aksi: teks(p.aksi), p_nos: Array.isArray(p.nos) ? p.nos.map(teks) : [], p_qty: p.qty && typeof p.qty === 'object' ? p.qty : null,
          p_catatan: teks(p.catatan), p_ref: teks(p.ref), p_eta: teks(p.eta), p_nama: teks(p.nama) }];
      },
      // Link Purchasing (Viory): belanja lokal dibayar, bayar PO lokal, tolak pengajuan lokal.
      plxBayar: function (p) {
        return ['plx_bayar', { p_toko: teks(p.toko), p_bayar: teks(p.bayar), p_tanggal: teks(p.tanggal), p_nama: teks(p.nama),
          p_items: Array.isArray(p.items) ? p.items : [], p_token: teks(p.token) }];
      },
      plPoBayar: function (p) {
        return ['pl_po_bayar', { p_no: teks(p.no), p_bayar: teks(p.bayar), p_tanggal: teks(p.tanggal), p_nama: teks(p.nama), p_token: teks(p.token) }];
      },
      plxTolak: function (p) {
        if (teks(p.catatan).replace(/\s+/g, ' ').trim().length < 3) return Promise.resolve({ ok: false, pesan: 'Tulis alasan penolakan.' });
        return ['pengadaan_aksi', { p_aksi: 'tolak', p_nos: Array.isArray(p.nos) ? p.nos.map(teks) : [], p_qty: null, p_catatan: teks(p.catatan), p_ref: '', p_eta: '', p_nama: teks(p.nama) }];
      },
      plAksi: function (p) {
        return ['pengadaan_aksi', { p_aksi: teks(p.aksi), p_nos: Array.isArray(p.nos) ? p.nos.map(teks) : [], p_qty: p.qty && typeof p.qty === 'object' ? p.qty : null,
          p_catatan: teks(p.catatan), p_ref: teks(p.ref), p_eta: teks(p.eta), p_nama: teks(p.nama) }];
      },
      // PO: tandai dikirim supplier / batalkan (sebelum dibayar), dan biaya tambahan PO (ongkir, bea, dll.).
      // Usulan koreksi HPP untuk PO yang barangnya sudah diterima dijalankan Apps Script (efek_antre 'biaya_po').
      // Buat PO dari form gudang: staf gudang hanya PO barang lokal (menunggu dibayar Viory). Manajemen tetap lewat Apps Script ({lewat:true}).
      gdPoSimpan: function (p) {
        return ['po_simpan', { p_asal: teks(p.asal), p_supplier: teks(p.supplier), p_bayar: teks(p.bayar), p_sudah: p.sudahBayar === true, p_tanggal: teks(p.tanggal),
          p_catatan: teks(p.catatan), p_items: Array.isArray(p.items) ? p.items : [], p_nama: teks(p.nama), p_token: teks(p.token) }];
      },
      // Uang keluar dari form gudang (accounting): cek dobel tanggal + nominal, bulan yang sudah tutup buku ditolak.
      gdxUangSimpan: function (p) {
        return ['gudang_uang_simpan', { p_tanggal: teks(p.tanggal), p_akun: teks(p.akun), p_kategori: teks(p.kategori), p_nominal: teks(p.nominal),
          p_ket: teks(p.ket), p_nama: teks(p.nama), p_yakin: p.yakin === true, p_token: teks(p.token) }];
      },
      gdPoUbah: function (p) {
        return ['po_ubah', { p_no: teks(p.no), p_aksi: teks(p.aksi), p_resi: teks(p.resi), p_alasan: teks(p.alasan), p_nama: teks(p.nama), p_token: teks(p.token) }];
      },
      gdBiayaSimpan: function (p) {
        return ['po_biaya_simpan', { p_no: teks(p.no), p_tanggal: teks(p.tanggal), p_jenis: teks(p.jenis), p_nominal: teks(p.nominal), p_bayar: teks(p.bayar),
          p_catatan: teks(p.catatan), p_sudah: p.sudahBayar === true, p_nama: teks(p.nama), p_token: teks(p.token) }];
      },
      // Order Masuk: tombol "Proses" (catatan Diproses di ORDER_PROSES).
      gdxOrderProses: function (p) { return ['gudang_order_proses', { p_order: teks(p.order), p_nama: teks(p.nama) }]; },
      // Terima barang PO: status PO diubah lewat ubah_antre; usulan HPP & pengajuan lokal oleh Apps Script (efek_antre).
      gdTerimaPo: function (p) {
        return ['gudang_terima_po', { p_tanggal: teks(p.tanggal), p_no: teks(p.no), p_nama: teks(p.nama), p_catatan: teks(p.catatan),
          p_items: Array.isArray(p.items) ? p.items : [], p_token: teks(p.token) }];
      },
      gdOpnameSesuai: function (p) {
        return ['gudang_sesuai', { p_nama: teks(p.nama), p_catatan: teks(p.catatan), p_items: Array.isArray(p.items) ? p.items : [], p_token: teks(p.token) }];
      }
    },
    bahanbaku: {
      hppUsul: hppUsulRpc('bahanbaku'),
      ptrTerima: ptrTerimaRpc('bahanbaku'),
      // Pengajuan pembelian (pgdAjukan + pembungkus): robot dari potret; Telegram, pesan Mike & Viory oleh Apps Script (efek_antre).
      pgsAjukan: function (p) {
        return ['pengadaan_ajukan', { p_app: 'bahanbaku', p_nama: teks(p.nama), p_yakin: p.yakin === true, p_items: Array.isArray(p.items) ? p.items : [], p_token: teks(p.token) }];
      },
      bahanBakuPakai: function (p) {
        return ['bbk_simpan_pakai', { p_tanggal: teks(p.tanggal), p_jenis: teks(p.jenis), p_kode: teks(p.kode), p_qty: teks(p.qty),
          p_satuan: teks(p.satuan), p_pengisi: teks(p.pengisi), p_catatan: teks(p.catatan), p_untuk: teks(p.untuk), p_token: teks(p.token) }];
      },
      bahanBakuStafTambah: function (p) { return ['bbk_staf_tambah', { p_nama: teks(p.nama) }]; },
      // Pembelian dari pengajuan (pengajuan -> Dipesan) dan barang sampai (pengajuan -> Diterima) lewat ubah_antre.
      // "Tanpa pengajuan" dan penggantian satuan bahan tetap lewat Apps Script ({lewat:true}).
      bahanBakuBeli: function (p) {
        return ['bbk_beli', { p_tanggal: teks(p.tanggal), p_kode: teks(p.kode), p_qty: teks(p.qty), p_satuan: teks(p.satuan), p_harga: teks(p.harga),
          p_supplier: teks(p.supplier), p_catatan: teks(p.catatan), p_pengisi: teks(p.pengisi), p_baru: p.baru === undefined ? null : p.baru, p_token: teks(p.token) }];
      },
      bahanBakuSampai: function (p) {
        return ['bbk_sampai', { p_no: teks(p.no), p_tanggal: teks(p.tanggal), p_qty: teks(p.qty), p_pengisi: teks(p.pengisi), p_catatan: teks(p.catatan) }];
      },
      // Ajuan penyesuaian stok bahan mentah (stok sistem dihitung di Supabase).
      bahanBakuSesuai: function (p) {
        return ['bbk_sesuai_ajukan', { p_kode: teks(p.kode), p_hitung: teks(p.hitung), p_alasan: teks(p.alasan), p_pengisi: teks(p.pengisi), p_token: teks(p.token) }];
      },
      // Hitungan resep / takaran di halaman (bahanbaku.js); null = disimpan Apps Script seperti biasa.
      bahanBakuProduksi: function (p) { return window.BahanBaku.simpanProduksi(sb, p); },
      bahanBakuWarna: function (p) { return window.BahanBaku.simpanWarna(sb, p); }
    },
    // Halaman Mike (Kendali Bisnis): ubah harga jual dan ACC / tolak usulan HPP (+ harga jual baru) langsung di Supabase.
    mike: {
      // Bayar impor (31 Okt): Lunas / DP dan pelunasan / biaya PO langsung di Supabase (kb_impor_bayar, kb_bayar_lanjut).
      kbImporBayar: function (p) {
        return ['kb_impor_bayar', { p_nos: Array.isArray(p.nos) ? p.nos.map(teks) : [], p_total: p.total && typeof p.total === 'object' ? p.total : {},
          p_jenis: teks(p.jenis), p_dp: teks(p.dp), p_supplier: teks(p.supplier), p_tanggal: teks(p.tanggal), p_eta: teks(p.eta),
          p_catatan: teks(p.catatan), p_token: teks(p.token) }];
      },
      kbBayarLanjut: function (p) {
        return ['kb_bayar_lanjut', { p_ref: teks(p.ref), p_jenis: teks(p.jenis), p_nominal: teks(p.nominal), p_tanggal: teks(p.tanggal),
          p_catatan: teks(p.catatan), p_token: teks(p.token) }];
      },
      kbHargaSimpan: function (p) { return ['kb_harga_simpan', { p_k: teks(p.k), p_harga: teks(p.harga), p_alasan: teks(p.alasan), p_token: teks(p.token) }]; },
      kbNaikPutus: function (p) {
        return ['hpp_mike_putus', { p_no: teks(p.no), p_aksi: teks(p.aksi), p_nilai: teks(p.nilai), p_catatan: teks(p.catatan), p_token: teks(p.token), p_k: teks(p.k), p_harga: teks(p.harga) }];
      },
      hppMikePutus: function (p) {
        return ['hpp_mike_putus', { p_no: teks(p.no), p_aksi: teks(p.aksi), p_nilai: teks(p.nilai), p_catatan: teks(p.catatan), p_token: teks(p.token), p_k: '', p_harga: '' }];
      }
    },
    // Halaman Mike: ACC / tolak pengajuan impor (pgdAksi + pembungkus PL & TG) langsung di Supabase.
    mikelama: {
      hppMikePutus: function (p) {
        return ['hpp_mike_putus', { p_no: teks(p.no), p_aksi: teks(p.aksi), p_nilai: teks(p.nilai), p_catatan: teks(p.catatan), p_token: teks(p.token), p_k: '', p_harga: '' }];
      },
      // Mike membayar pengajuan impor: uang keluar + PO impor otomatis (impBayar).
      impBayar: function (p) {
        return ['impor_bayar', { p_nos: Array.isArray(p.nos) ? p.nos.map(teks) : [], p_total: p.total && typeof p.total === 'object' ? p.total : {},
          p_supplier: teks(p.supplier), p_tanggal: teks(p.tanggal), p_eta: teks(p.eta), p_catatan: teks(p.catatan), p_token: teks(p.token) }];
      },
      pgdAksi: function (p) {
        return ['pengadaan_aksi', { p_aksi: teks(p.aksi), p_nos: Array.isArray(p.nos) ? p.nos.map(teks) : [], p_qty: p.qty && typeof p.qty === 'object' ? p.qty : null,
          p_catatan: teks(p.catatan), p_ref: teks(p.ref), p_eta: teks(p.eta), p_nama: teks(p.nama) }];
      }
    },
    // Accounting manajemen (tahap 5l): uang masuk / keluar / pindah akun dan pembatalan langsung di Supabase.
    akunting: {
      // Metode bayar nota Toko Offline (31 Okt): langsung di Supabase.
      simpanMetodeBayar: function (p) { return ['simpan_metode_bayar', { p_ubah: Array.isArray(p.ubah) ? p.ubah : [] }]; },
      akuntingSimpan: function (p) {
        return ['akunting_simpan', { p_tanggal: teks(p.tanggal), p_jenis: teks(p.jenis), p_akun: teks(p.akun), p_tujuan: teks(p.tujuan),
          p_kategori: teks(p.kategori), p_nominal: teks(p.nominal), p_ket: teks(p.ket), p_token: teks(p.token) }];
      },
      akuntingSimpanBanyak: function (p) {
        return ['akunting_simpan_banyak', { p_tanggal: teks(p.tanggal), p_akun: teks(p.akun), p_rows: Array.isArray(p.rows) ? p.rows : [], p_token: teks(p.token) }];
      },
      akuntingBatal: function (p) { return ['akunting_batal', { p_no: teks(p.no) }]; }
    },
    // Master Data lama di dalam aplikasi: tombol yang sudah pindah ikut langsung tersimpan di Supabase.
    mdlama: {
      gdPoPutus: function (p) { return ['po_putus', { p_no: teks(p.no), p_setuju: p.setuju === true, p_catatan: teks(p.catatan), p_token: teks(p.token) }]; },
      gdPoBayar: function (p) { return ['po_bayar', { p_no: teks(p.no), p_tanggal: teks(p.tanggal), p_token: teks(p.token) }]; },
      gdBiayaBayar: function (p) { return ['po_biaya_bayar', { p_no: teks(p.no), p_id: Number(p.id) || 0, p_tanggal: teks(p.tanggal), p_token: teks(p.token) }]; },
      gdPoBatalMgmt: function (p) { return ['po_batal', { p_no: teks(p.no), p_alasan: teks(p.alasan), p_batal_uang: p.batalUang !== false, p_token: teks(p.token) }]; },
      ubahStatusOrder: function (p) { return ['order_status', { p_no: teks(p.no), p_status: teks(p.status), p_rp: '', p_alasan: '' }]; },
      rpPutus: function (p) { return ['order_status', { p_no: teks(p.no), p_status: '', p_rp: teks(p.aksi), p_alasan: teks(p.alasan) }]; },
      rpTandai: function (p) { return ['rp_tandai', { p_no: teks(p.no), p_aksi: teks(p.aksi), p_catatan: teks(p.catatan), p_alasan: teks(p.alasan) }]; },
      mdSetujuPutus: function (p) { return ['md_setuju_putus', { p_toko: Array.isArray(p.toko) ? p.toko.map(teks) : [], p_prod: Array.isArray(p.prod) ? p.prod.map(teks) : [], p_setuju: p.setuju === true, p_catatan: teks(p.catatan) }]; },
      // Keuangan › HPP & Harga: ACC / tolak usulan staf dan simpan tabel langsung di Supabase; daftarnya dimuat ulang sesudah tersalin ke sheet.
      mmUsulPutus: function (p) {
        return rpcLaluMuat('hu_putus', { p_no: teks(p.no), p_aksi: teks(p.aksi), p_nilai: p.nilai === null || p.nilai === undefined ? '' : String(p.nilai), p_catatan: teks(p.catatan), p_token: teks(p.token) }, p.key);
      },
      mmHargaSimpan: function (p) {
        var items = (Array.isArray(p.items) ? p.items : []).map(function (x) { return { jenis: teks(x.jenis), k: teks(x.k), nilai: x.nilai, toko: teks(x.toko) }; });
        return rpcLaluMuat('mm_harga_simpan', { p_items: items, p_alasan: teks(p.alasan), p_token: teks(p.token) }, p.key);
      }
    },
    // Link Purchasing (Viory): belanja lokal dibayar, bayar PO lokal, tolak / tandai pengajuan lokal langsung di Supabase.
    purchasing: {
      plxBayar: function (p) {
        return ['plx_bayar', { p_toko: teks(p.toko), p_bayar: teks(p.bayar), p_tanggal: teks(p.tanggal), p_nama: teks(p.nama),
          p_items: Array.isArray(p.items) ? p.items : [], p_token: teks(p.token) }];
      },
      plPoBayar: function (p) {
        return ['pl_po_bayar', { p_no: teks(p.no), p_bayar: teks(p.bayar), p_tanggal: teks(p.tanggal), p_nama: teks(p.nama), p_token: teks(p.token) }];
      },
      plxTolak: function (p) {
        if (teks(p.catatan).replace(/\s+/g, ' ').trim().length < 3) return Promise.resolve({ ok: false, pesan: 'Tulis alasan penolakan.' });
        return ['pengadaan_aksi', { p_aksi: 'tolak', p_nos: Array.isArray(p.nos) ? p.nos.map(teks) : [], p_qty: null, p_catatan: teks(p.catatan), p_ref: '', p_eta: '', p_nama: teks(p.nama) }];
      },
      plAksi: function (p) {
        return ['pengadaan_aksi', { p_aksi: teks(p.aksi), p_nos: Array.isArray(p.nos) ? p.nos.map(teks) : [], p_qty: p.qty && typeof p.qty === 'object' ? p.qty : null,
          p_catatan: teks(p.catatan), p_ref: teks(p.ref), p_eta: teks(p.eta), p_nama: teks(p.nama) }];
      },
      // Tab "Sudah di-ACC": koreksi qty barang yang dibelanjakan lewat link ini (SQL 138).
      plKoreksiQty: function (p) {
        return ['pengadaan_koreksi_qty', { p_no: teks(p.no), p_qty: Number(p.qty) || 0, p_alasan: teks(p.alasan), p_nama: teks(p.nama) }];
      }
    },
    // Payroll (tahap 5f): gaji disimpan di Supabase, baris baru / perubahan disalin Apps Script ke sheet GAJI_LOG.
    payroll: {
      gjSimpan: function (p) {
        return ['gaji_simpan', { p_per: teks(p.per), p_oleh: teks(p.oleh), p_kirim: p.kirim === true, p_yakin: p.yakin === true, p_tarik: p.tarik === true,
          p_items: Array.isArray(p.items) ? p.items : [], p_token: teks(p.token) }];
      },
      gjPutus: function (p) { return ['gaji_putus', { p_per: teks(p.per), p_aksi: teks(p.aksi), p_catatan: teks(p.catatan) }]; }
    }
  };
  // Halaman Mike: ACC / tolak pengajuan impor sama dengan halaman Mike lama (pengadaan_aksi di Supabase).
  // Master Data lama (31 Okt): titipan staf dan Edit Barang (harga, HPP, info, barang baru) langsung di Supabase, sama dengan Master Data baru.
  // Qty stok tetap lewat Apps Script.
  // Tutup buku (4 Nov 2026): tutup / buka / penyeimbang langsung di Supabase (tpb.js, SQL 134 & 153).
  TULIS_SUPABASE.mdlama.tpbTutup = function (p) { return window.TutupBuku.tutup(sb, teks(p.bulan), { paksa: p.paksa === true }); };
  TULIS_SUPABASE.mdlama.tpbBuka = function (p) { return window.TutupBuku.buka(sb, teks(p.bulan), teks(p.alasan)); };
  TULIS_SUPABASE.mdlama.tpbTerapkan = function (p) { return window.TutupBuku.terapkan(sb, teks(p.bulan)); };
  // Upload dana cair & penjualan marketplace (SQL 141 / 129, sama dengan form toko dan Master Data baru).
  TULIS_SUPABASE.mdlama.danaCairSimpan = function (p) {
    var d = p.data && typeof p.data === 'object' ? Object.assign({}, p.data) : {};
    d.nama = teks(p.nama);
    return ['dana_cair_simpan', { p_toko: teks(p.toko), p_data: d, p_file: teks(p.file), p_yakin: p.yakin === true }];
  };
  TULIS_SUPABASE.mdlama.mpUpload = function (p) {
    return ['mp_upload', { p_toko: teks(p.toko), p_platform: teks(p.platform), p_up: teks(p.up), p_rows: Array.isArray(p.rows) ? p.rows : [] }];
  };
  // Bagi hasil consignment (5 Nov 2026): isian manual (bh_manual_simpan) lalu hitungan terbaru; setoran dicatat di accounting
  // sebagai pindah dari akun "Setoran <toko> (belum disetor)" ke rekening (file 77), keterangan memuat [BH yyyy-MM].
  TULIS_SUPABASE.mdlama.bagiHasilSimpanX = async function (p) {
    var toko = teks(p.toko) || 'Consignment Medan', bulan = teks(p.bulan);
    var r = await sb.rpc('bh_manual_simpan', { p_toko: toko, p_bulan: bulan, p_shopee: teks(p.shopee), p_tiktok: teks(p.tiktok), p_ongkir: teks(p.ongkir), p_catatan: teks(p.catatan) });
    if (r.error) throw new Error('Gagal menyimpan: ' + r.error.message + '. Tekan simpan sekali lagi.');
    if (!r.data || !r.data.ok) return r.data;
    var h = await window.BagiHasilMd.hitung(sb, bulan), d = h && h.ok ? h.toko.filter(function (x) { return x.toko === toko; })[0] : null;
    if (!d) return r.data;
    d.ok = true; d.pesan = r.data.pesan; if (toko === 'Consignment Medan') d.nama = r.data.nama;
    return d;
  };
  TULIS_SUPABASE.mdlama.danaCairSetoran = async function (p) {
    var toko = teks(p.toko).replace(/\s+/g, ' ').trim(), bulan = teks(p.bulan).trim();
    if (['Consignment Medan', 'Consignment Sidoarjo', 'Consignment Renon'].indexOf(toko) === -1) return { ok: false, pesan: 'Toko tidak dikenal.' };
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(bulan)) return { ok: false, pesan: 'Bulan tidak valid.' };
    var nb = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][Number(bulan.slice(5, 7)) - 1] + ' ' + bulan.slice(0, 4);
    var akunBelum = 'Setoran ' + toko + ' (belum disetor)';
    var r = await sb.rpc('akunting_simpan', { p_tanggal: teks(p.tanggal), p_jenis: 'Pindah', p_akun: akunBelum, p_tujuan: teks(p.akun), p_kategori: '',
      p_nominal: teks(p.nominal), p_ket: 'Setoran bagi hasil ' + toko + ' ' + nb + ' [BH ' + bulan + ']', p_token: teks(p.token) });
    if (r.error) throw new Error('Gagal menyimpan: ' + r.error.message + '. Tekan simpan sekali lagi; aman, tidak akan tercatat dua kali.');
    var h = r.data;
    if (h && !h.ok && /akun/i.test(h.pesan || '')) h.pesan += ' (Akun "' + akunBelum + '" harus ada di daftar akun Accounting.)';
    return h;
  };
  // Laporan sisa stok toko (tulisLaporanStok file 0): dulu ditulis ke sheet LAPORAN_STOK_TOKO; sekarang langsung diunduh sebagai file CSV (5 Nov 2026).
  TULIS_SUPABASE.mdlama.tulisLaporanStok = async function (p) {
    var toko = teks(p.toko).replace(/[\r\n]+/g, ' ').trim().slice(0, 60), daftar = Array.isArray(p.rows) ? p.rows : [];
    if (!toko || !daftar.length) return { ok: false, pesan: 'Laporan kosong, tidak ada yang disimpan.' };
    if (daftar.length > 5000) return { ok: false, pesan: 'Laporan terlalu panjang.' };
    var sel = function (v) { var x = String(v === null || v === undefined ? '' : v).replace(/[\r\n]+/g, ' ').replace(/^[=+@-]+/, '').slice(0, 200); return /[";,]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; };
    var kini = window.Lembar ? window.Lembar.format(new Date(), 'dd/MM/yyyy HH:mm') : new Date().toLocaleString('id-ID');
    var baris = ['LAPORAN SISA STOK - ' + sel(toko), 'Dibuat: ' + kini, 'Kode;Nama Barang;Warna;Sisa Stok'];
    daftar.forEach(function (r) { r = r || []; var q = Number(r[3]); baris.push([sel(r[0]), sel(r[1]), sel(r[2]), (r[3] === '' || !isFinite(q)) ? '' : String(q)].join(';')); });
    var blob = new Blob(['\ufeff' + baris.join('\r\n')], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'Laporan sisa stok ' + toko.replace(/[^\w .-]+/g, '') + ' ' + kini.slice(0, 10).replace(/\//g, '-') + '.csv';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    return { ok: true, pesan: 'Laporan sisa stok ' + toko + ' diunduh sebagai file CSV (' + daftar.length + ' baris). Bisa dibuka di Excel atau Google Sheets.' };
  };
  // Marketplace (5 Nov 2026): padanan nama produk -> kode (mp_padanan_simpan), penjualan staf dari upload (md.js mpTambahStaf + mp_tambah_staf_simpan).
  TULIS_SUPABASE.mdlama.mpPadananSimpan = function (p) {
    var items = (Array.isArray(p.items) ? p.items : []).map(function (x) { x = x || {}; return { n: teks(x.n), v: teks(x.v), k: teks(x.k), w: teks(x.w) }; });
    return ['mp_padanan_simpan', { p_items: items }];
  };
  TULIS_SUPABASE.mdlama.mpTambahStaf = function (p) { return window.MdLama.mpTambahStaf(sb, p); };
  // Koreksi catatan gudang: hapus baris salah / dobel, diarsip dulu ke gudang_log_hapus (kgh_hapus).
  TULIS_SUPABASE.mdlama.kghHapus = function (p) {
    var items = (Array.isArray(p.items) ? p.items : []).slice(0, 100).map(function (x) { x = x || {}; return { b: teks(x.b), s: teks(x.s) }; });
    return ['kgh_hapus', { p_items: items, p_alasan: teks(p.alasan), p_token: teks(p.token) }];
  };
  TULIS_SUPABASE.mdlama.ttpPutus = function (p) {
    return ['ttp_putus', { p_jenis: teks(p.jenis), p_id: teks(p.id), p_aksi: teks(p.aksi), p_hpp: teks(p.hpp), p_harga: teks(p.harga), p_qty: teks(p.qty) }];
  };
  TULIS_SUPABASE.mdlama.ttpBarangUbah = function (p) {
    return ['ttp_barang_ubah', { p_kode: teks(p.kode), p_hpp: teks(p.hpp), p_harga: teks(p.harga), p_aktif: p.aktif !== false }];
  };
  // Purchasing › pembelian tanpa pengajuan: tandai sudah dicek di Supabase, lalu (seperti Apps Script) kirim daftar terbaru.
  TULIS_SUPABASE.mdlama.pgsTanpaCek = async function (p) {
    var r = await sb.rpc('pgs_tanpa_cek', { p_no: teks(p.no) });
    if (r.error) throw new Error('Gagal menyimpan: ' + r.error.message + '. Coba lagi.');
    if (!r.data || !r.data.ok) return r.data;
    await salinKeSheet();
    var d = await kirim('pgsTanpaData', [p]);
    return d.r;
  };
  // Persetujuan penyesuaian stok satu per satu (toko: file 6, produksi/gudang/KP: file 7 + Telegram file 23) langsung di Supabase.
  TULIS_SUPABASE.mdlama.putusSesuai = async function (p) {
    var r = await sb.rpc('toko_sesuai_putus', { p_no: teks(p.no), p_semua: p.semua === true, p_setuju: p.setuju === true, p_catatan: teks(p.catatan) });
    if (r.error) throw new Error('Gagal menyimpan: ' + r.error.message + '. Coba lagi.');
    var h = r.data || { ok: false, pesan: 'Gagal menyimpan.' };
    if (h.pesan === 'Akses ditolak.' || h.pesan === 'Nomor ajuan tidak ada.') return h;
    // Seperti Apps Script: daftar ajuan terbaru ikut dikirim (dibaca dari Supabase yang sudah berubah).
    var d = await window.MdLama.sesuaiPemilik(sb);
    d.ok = h.ok; d.pesan = h.pesan;
    return d;
  };
  TULIS_SUPABASE.mdlama.prodSesuaiPutus = function (p) {
    return ['prod_sesuai_putus', { p_no: teks(p.no), p_setuju: p.setuju === true, p_catatan: teks(p.catatan) }];
  };
  // Bagi hasil consignment: dana diterima marketplace (file 36) dan uang tunai offline (file 76) diisi manajemen, sama dengan form toko.
  TULIS_SUPABASE.mdlama.salDanaSimpan = function (p) {
    return ['toko_dana_simpan', { p_toko: teks(p.toko), p_jenis: 'dana', p_saluran: teks(p.saluran), p_bulan: teks(p.bulan), p_nilai: teks(p.dana), p_nama: teks(p.nama) }];
  };
  TULIS_SUPABASE.mdlama.danaTunaiSimpan = function (p) {
    return ['toko_dana_simpan', { p_toko: teks(p.toko), p_jenis: 'tunai', p_saluran: '', p_bulan: teks(p.bulan), p_nilai: teks(p.nominal), p_nama: '' }];
  };
  // Laporan bulan consignment offline (Renon, file 79): simpan / tutup / buka kembali oleh manajemen.
  TULIS_SUPABASE.mdlama.rnLaporanSimpan = function (p) {
    return ['rn_laporan_simpan', { p_toko: teks(p.toko), p_bulan: teks(p.bulan), p_aksi: teks(p.aksi), p_tunai: teks(p.tunai), p_transfer: teks(p.transfer) }];
  };
  TULIS_SUPABASE.mdlama.mdeSimpan = async function (p) {
    var j = teks(p.jenis), r;
    if (j === 'harga' || j === 'hpp') {
      r = await sb.rpc('mde_simpan', { p_jenis: j, p_k: teks(p.k), p_nilai: teks(p.nilai), p_alasan: teks(p.alasan), p_token: teks(p.token) });
    } else if (j === 'info' || j === 'baru') {
      // File 74: HPP wajib untuk barang baru.
      if (j === 'baru' && !(Number(teks(p.hpp).replace(/[.\s]/g, '').replace(',', '.')) > 0)) {
        return { ok: false, pesan: 'HPP (harga beli / modal per pcs) wajib diisi untuk barang baru, supaya nilai stok dan laba bisa dihitung.' };
      }
      r = await sb.rpc('mde_info_baru', { p_jenis: j, p_k: teks(p.k), p_nama: teks(p.nama), p_kat: teks(p.kat), p_warna: teks(p.warna),
        p_hj: teks(p.hj), p_hpp: teks(p.hpp), p_katalog: p.katalog === true, p_kat_katalog: teks(p.katKatalog), p_online: p.online === true,
        p_alasan: teks(p.alasan), p_yakin: p.yakin === true, p_token: teks(p.token) });
    } else return null;
    if (r.error) throw new Error('Gagal menyimpan: ' + r.error.message + '. Tekan simpan sekali lagi; aman, tidak akan tercatat dua kali.');
    var h = r.data;
    if (h && h.lewat) return null;
    // Seperti Apps Script: sesudah berhasil, daftar barang & riwayat ikut dikirim (dibaca sesudah barisnya tersalin ke sheet).
    if (h && h.ok) {
      await salinKeSheet();
      try { var d = await window.MdLama.mdeData(sb); if (d && d.ok) { h.barang = d.barang; h.log = d.log; h.kategori = d.kategori; } } catch (e) { }
    }
    return h;
  };
  TULIS_SUPABASE.mike.pgdAksi = TULIS_SUPABASE.mikelama.pgdAksi;
  // Halaman Mike › harga jual barang baru (file 73) langsung di Supabase (bbr_simpan); Telegram lewat efek.
  TULIS_SUPABASE.mike.bbrSimpan = function (p) {
    return ['bbr_simpan', { p_k: teks(p.k), p_harga: teks(p.harga), p_kat: teks(p.kat), p_token: teks(p.token) }];
  };
  var BALIK = SERVER + 'balik';
  // Sesudah simpan, catatan baru disalin ke sheet di belakang (31 Okt): layar tidak menunggu. Hanya panggilan berikutnya yang masih
  // lewat Apps Script (yang membaca sheet) menunggu salinan itu selesai (paling lama 10 detik), supaya isinya tetap terbaru.
  async function salinKeSheet() {
    try {
      var t = await token(), kirim = fetch(BALIK, { method: 'POST', body: JSON.stringify({ t: t }), keepalive: true }).catch(function () { });
      var tunggu = Promise.race([kirim, new Promise(function (r) { setTimeout(r, 10000); })]);
      salinJalan = tunggu;
      tunggu.then(function () { if (salinJalan === tunggu) salinJalan = null; });
    } catch (e) { }
  }
  // Simpan lewat Supabase, lalu (kalau berhasil) muat ulang tabel HPP & Harga dari Apps Script sesudah barisnya tersalin.
  async function rpcLaluMuat(fn, arg, key) {
    var r = await sb.rpc(fn, arg);
    if (r.error) throw new Error('Gagal menyimpan: ' + r.error.message + '. Tekan simpan sekali lagi; aman, tidak akan tercatat dua kali.');
    var h = r.data;
    if (h && h.ok && !h.ulang) {
      await salinKeSheet();
      try { var d = await window.MdLama.mmHargaData(sb); if (d && d.ok) h.data = d; } catch (e) { }
    }
    return h;
  }
  var SEGARKAN_MD = {
    mdSetujuPutus: ['md:setuju'], putusSesuai: ['md:setuju'], prodSesuaiPutus: ['md:setuju'], rpPutus: ['md:request', 'md:pantau'], rpTandai: ['md:pantau'],
    ubahStatusOrder: ['md:request', 'md:pantau'], ttpPutus: ['md:titip'], ttpBarangUbah: ['md:titip'], gdPoPutus: ['md:gudang'], gdPoBayar: ['md:gudang'],
    gdBiayaBayar: ['md:gudang'], gdPoBatalMgmt: ['md:gudang'], pgdAksi: ['md:pengadaan'], pgsTanpaCek: ['md:tanpa'], mdeSimpan: ['md:barang']
  };
  async function tulisSupabase(f, a) {
    var q = TULIS_SUPABASE[APP][f]((a && a[0]) || {}), hasil;
    if (Array.isArray(q)) {
      var r = await sb.rpc(q[0], q[1]);
      if (r.error) throw new Error('Gagal menyimpan: ' + r.error.message + '. Tekan simpan sekali lagi; aman, tidak akan tercatat dua kali.');
      hasil = r.data;
      if (hasil && hasil.lewat) return kirimLama(f, a);
    } else {
      hasil = await q;
      if (hasil === null) return kirimLama(f, a);
    }
    if (hasil && hasil.ok) { if (APP === 'mdlama' || APP === 'mike' || APP === 'mikelama') await salinKeSheet(); else salinKeSheet(); if (window.Gudang) window.Gudang.lupakan(); }
    // Master Data lama: ringkasan Master Data baru yang terkait ikut dihitung ulang (sama seperti simpan dari Master Data baru).
    if (hasil && hasil.ok && APP === 'mdlama' && SEGARKAN_MD[f]) { try { sb.from('md_aksi').insert({ fungsi: 'segarkan', param: { kunci: SEGARKAN_MD[f] }, ringkas: 'Hitung ulang sesudah ' + f + ' (Master Data lama)' }).then(function () { }, function () { }); } catch (e) { } }
    if (APP === 'mike' && window.KendaliBisnis) window.KendaliBisnis.catatTulis();
    return JSON.stringify(hasil);
  }

  window.__formPanggil = function (f, a) {
    // Tiket akses perangkat (file 48) hanya berlaku dengan tanda perangkat link lama; di aplikasi selalu { ok: false } (sama dengan Apps Script).
    if (APP === 'mdlama' && f === 'aksesTiket' && !(a && a[0] && a[0].dev)) return Promise.resolve(JSON.stringify({ ok: false }));
    if (TULIS_SUPABASE[APP] && TULIS_SUPABASE[APP][f]) return tulisSupabase(f, a);
    return bacaSupabase(f, a).then(function (r) {
      if (r) return JSON.stringify(r);
      return kirimLama(f, a);
    });
  };
  function kirimLama(f, a) {
    return kirim(f, a).then(function (d) {
      // Sesudah simpan: data lembar dimuat ulang; kalau salinan ke Supabase belum jadi, baca lewat Apps Script dulu.
      if (window.Gudang) window.Gudang.lupakan();
      if (APP === 'mike' && window.KendaliBisnis && !/^kb(Data|Laporan|Harga|Naik)$/.test(f)) window.KendaliBisnis.catatTulis();
      if (d.cermin === false || (TULIS_RE.test(f) && d.cermin !== true)) basiSampai = Date.now() + 35 * 60 * 1000;
      return JSON.stringify(d.r === undefined ? null : d.r);
    });
  }

  // Menu yang membuka jendela di dalam form lama (mis. HPP & Harga di Gudang Utama). Setelah jendela ditutup, menu kembali ke halaman sebelumnya.
  function bukaModal(mm) {
    var kembali = C.aktif, fr = C.frame, dok = fr && fr.contentDocument;
    var b = dok && dok.querySelector(mm.modal);
    if (!b) { M.buka(kembali, true); return; }
    b.click();
    var box = dok.getElementById(mm.kotak);
    if (!box) { M.buka(kembali, true); return; }
    var am = new MutationObserver(function () {
      if (box.classList.contains('on')) return;
      am.disconnect(); M.buka(kembali, true);
    });
    am.observe(box, { attributes: true, attributeFilter: ['class'] });
  }
  // Gudang Utama: ikon emoji di isi form diganti ikon garis yang sama dengan menu aplikasi (lebih jelas & seragam).
  var IKON_GD = {
    '📥': 'M22 12h-6l-2 3h-4l-2-3H2M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z',
    '🚚': 'M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    '🛒': 'M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 8H6M9 21h.01M18 21h.01',
    '📦': 'M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
    '🤖': 'M12 3v4M7 7h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zM9.5 12h.01M14.5 12h.01M9.5 16h5M3 12v3M21 12v3',
    '📋': 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
    '💸': 'M3 6h18v13H3zM3 10h18M7 15h3',
    '🏠': 'M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5'
  };
  var EMOJI_GD = /^[\s‍️]*(\p{Extended_Pictographic})[‍️]*\s*/u;
  function ikonGd(dok) {
    if (!dok.getElementById('ikGaya')) {
      var g = dok.createElement('style'); g.id = 'ikGaya';
      g.textContent = '.gx-ik{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;border-radius:10px;background:#E7F3F9;color:#1E78A8}' +
        '.gx-ik svg{width:58%;height:58%}span.gx-ik.ik{width:40px;height:40px;font-size:0}h3 .gx-ik{width:30px;height:30px;margin-right:10px;vertical-align:middle;border-radius:9px}' +
        'h3:has(> .gx-ik){display:flex;align-items:center}.mrh span.gx-ik{background:#FFF6E6;color:#9A5B00}';
      dok.head.appendChild(g);
    }
    function svgIk(d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"></path></svg>'; }
    function ganti() {
      Array.prototype.forEach.call(dok.querySelectorAll('span.ik:not(.gx-ik)'), function (sp) {
        var m = EMOJI_GD.exec(sp.textContent || ''); if (!m || sp.closest('#gdxBar')) return;
        sp.classList.add('gx-ik'); sp.innerHTML = svgIk(IKON_GD[m[1]] || IKON_GD['📦']);
      });
      Array.prototype.forEach.call(dok.querySelectorAll('h3'), function (h) {
        var t = h.firstChild; if (!t || t.nodeType !== 3) return;
        var m = EMOJI_GD.exec(t.textContent); if (!m) return;
        t.textContent = t.textContent.slice(m[0].length);
        var sp = dok.createElement('span'); sp.className = 'gx-ik'; sp.innerHTML = svgIk(IKON_GD[m[1]] || IKON_GD['📦']);
        h.insertBefore(sp, t);
      });
    }
    ganti();
    var tunda = 0;
    new MutationObserver(function () { if (tunda) return; tunda = requestAnimationFrame(function () { tunda = 0; ganti(); }); })
      .observe(dok.body, { childList: true, subtree: true });
  }
  // Gudang › Penyaluran: tiap baris barang dapat kotak "ketik kode / nama" (tidak perlu menggulir daftar panjang).
  // Kotak ini hanya memilih barang di daftar lama lalu memicu 'change', jadi cara simpan form tidak berubah.
  function cariKodeKirim(dok) {
    var wadah = dok.getElementById('v-kirim'); if (!wadah) return;
    if (!dok.getElementById('ckGaya')) {
      var g = dok.createElement('style'); g.id = 'ckGaya';
      g.textContent = '.ir > .ck-cari{display:block;width:100%;box-sizing:border-box;margin:0 0 8px;font-size:16px}';
      dok.head.appendChild(g);
    }
    function daftar(sel) {
      var dl = dok.getElementById('ckDaftar'); if (dl) return dl;
      dl = dok.createElement('datalist'); dl.id = 'ckDaftar';
      Array.prototype.forEach.call(sel.options, function (o) {
        if (!o.value) return;
        var op = dok.createElement('option'); op.value = o.value + ' · ' + String(o.textContent || '').replace(/\s*\([^)]*\)\s*$/, ''); dl.appendChild(op);
      });
      dok.body.appendChild(dl); return dl;
    }
    function cocok(sel, teks) {
      var t = String(teks || '').trim().toUpperCase(); if (!t) return null;
      var kode = t.split(/[\s·]+/)[0], opsi = Array.prototype.filter.call(sel.options, function (o) { return o.value; });
      var pas = opsi.filter(function (o) { return o.value.toUpperCase() === kode; })[0];
      if (pas) return pas.value;
      var nama = opsi.filter(function (o) { return String(o.textContent).toUpperCase().indexOf(t) > -1; });
      return nama.length === 1 ? nama[0].value : null;
    }
    function pasang() {
      Array.prototype.forEach.call(wadah.querySelectorAll('.ir select[data-f="k"]'), function (sel) {
        var kotak = sel.parentNode;
        if (kotak.previousElementSibling && kotak.previousElementSibling.classList.contains('ck-cari')) return;
        var dl = daftar(sel), inp = dok.createElement('input');
        inp.className = 'ck-cari'; inp.type = 'text'; inp.setAttribute('list', dl.id); inp.setAttribute('autocomplete', 'off');
        inp.setAttribute('autocapitalize', 'characters'); inp.setAttribute('aria-label', 'Ketik kode atau nama barang');
        inp.placeholder = 'Ketik kode / nama barang, mis. K01';
        if (sel.value) inp.value = sel.value;
        function pilih(fokus) {
          var v = cocok(sel, inp.value); if (!v) return false;
          if (sel.value !== v) { sel.value = v; sel.dispatchEvent(new Event('change', { bubbles: true })); }
          if (fokus) setTimeout(function () {
            var baris = wadah.querySelectorAll('.ir')[Number(inp.dataset.i)];
            var q = baris && (baris.querySelector('select[data-f="w"]') || baris.querySelector('input[data-f="q"]')); if (q) q.focus();
          }, 30);
          return true;
        }
        var baris = sel.closest('.ir'); inp.dataset.i = baris ? baris.getAttribute('data-i') : '';
        inp.addEventListener('input', function (e) { e.stopPropagation(); if (/·/.test(inp.value)) pilih(true); });
        inp.addEventListener('change', function (e) { e.stopPropagation(); pilih(true); });
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); if (!pilih(true)) inp.select(); } });
        kotak.parentNode.insertBefore(inp, kotak);
      });
    }
    pasang();
    new MutationObserver(pasang).observe(wadah, { childList: true, subtree: true });
  }
  // Form produksi: menu "Botol, stiker & packaging" punya dua bagian. Botol & stiker = form lama (bingkai), Packaging = stok packing (packing.js).
  function subBotol(k) {
    var bar = $('subBotol'), sec = document.querySelector('#mIsi > section[data-bagian="isi"]'); if (!bar || !sec) return;
    var ada = APP === 'produksi' && k === 'botol', pk = ada && C.sub === 'packing';
    bar.hidden = !ada; sec.classList.toggle('pk-mode', pk); $('packing').hidden = !pk;
    bar.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-sub') === (C.sub || 'botol'))); });
    if (pk) { document.documentElement.classList.remove('berbingkai'); if (window.StokPacking) StokPacking.gambar($('packing'), M.sb); }
  }
  // Payroll › Hitung absensi (absen.js) dan Absensi staf (absen-kelola.js): tampilan sendiri, bukan form lama di bingkai.
  function panelAbsen(k) {
    var el = $('absen'), el2 = $('absenKelola'), el3 = $('stafKelola'), sec = document.querySelector('#mIsi > section[data-bagian="isi"]'); if (!el || !sec || APP !== 'payroll') return;
    var ada = k === 'absen', ada2 = k === 'absensi' && !!el2, ada3 = k === 'staf' && !!el3;
    el.hidden = !ada; if (el2) el2.hidden = !ada2; if (el3) el3.hidden = !ada3; sec.classList.toggle('pk-mode', ada || ada2 || ada3);
    if (ada || ada2 || ada3) document.documentElement.classList.remove('berbingkai');
    if (ada3 && window.StafKelola) StafKelola.gambar(el3, M.sb);
    if (ada && window.Absensi) Absensi.gambar(el, M.sb, { tersimpan: function () { salinKeSheet(); muat(); } });
    if (ada2 && window.AbsenKelola) AbsenKelola.gambar(el2, M.sb);
  }
  if ($('subBotol')) $('subBotol').addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-sub]') : null; if (!b) return;
    C.sub = b.getAttribute('data-sub'); subBotol('botol'); setTimeout(ukur, 0);
  });

  // Tampilan sendiri (tanpa form Apps Script), mis. link Purchasing.
  function panelAsli(k) {
    if (!F.asli) return;
    var el = $('asli'), sec = document.querySelector('#mIsi > section[data-bagian="isi"]'); if (!el || !sec) return;
    el.hidden = false; sec.classList.add('pk-mode'); $('muatan').hidden = true; document.documentElement.classList.remove('berbingkai');
    if (APP === 'purchasing' && window.PurchasingApp) PurchasingApp.gambar(el, M.sb, k, { nama: C.nama, salin: salinKeSheet });
  }
  // Menu dengan tampilan sendiri di form lama (mis. Laporan pengajuan PDF): bingkai disembunyikan selama menu itu dibuka.
  function panelMenu(k) {
    if (F.asli) return;
    var mm = F.menu.filter(function (x) { return x.k === k; })[0], el = $('asli'), sec = document.querySelector('#mIsi > section[data-bagian="isi"]');
    if (!el || !sec) return;
    if (mm && mm.panel === 'ajuan') {
      el.hidden = false; C.panel = true; sec.classList.add('pk-mode'); $('muatan').hidden = true; document.documentElement.classList.remove('berbingkai');
      if (window.AjuanPdf) AjuanPdf.gambar(el, M.sb, APP);
    } else if (C.panel) {
      C.panel = false; el.hidden = true; el.innerHTML = ''; sec.classList.remove('pk-mode');
    }
  }
  function ukur() {
    var fr = C.frame; if (!fr || fr.hidden) return;
    if (document.querySelector('#mIsi > section.pk-mode')) return;
    document.documentElement.classList.add('berbingkai'); window.scrollTo(0, 0);
    var bawah = document.documentElement.classList.contains('m-m') && $('mBawah') ? $('mBawah').offsetHeight : 0;
    fr.style.height = Math.max(320, window.innerHeight - fr.getBoundingClientRect().top - bawah) + 'px';
  }
  window.addEventListener('resize', ukur);

  function rapi(t) { return String(t || '').replace(/[^\p{L}\p{N}&\/ ]/gu, ' ').replace(/\s+/g, ' ').trim().toLowerCase(); }
  function cariTombol(dok, langkah) {
    if (langkah.charAt(0) === '#') return dok.getElementById(langkah.slice(1));
    var p = langkah.split('@'), teks = rapi(p[0]), wadah = p[1];
    var calon = dok.querySelectorAll(wadah + ' > button, ' + wadah + ' > [role=tab]');
    for (var i = 0; i < calon.length; i++) if (rapi(calon[i].innerText || calon[i].textContent) === teks) return calon[i];
    return null;
  }
  // Bilah tab lama disembunyikan; pindah menu lewat menu aplikasi.
  function sembunyikanTab(dok) {
    F.menu.forEach(function (m) {
      (m.l || []).forEach(function (lk) { var b = cariTombol(dok, lk); if (b && b.parentElement) b.parentElement.classList.add('sembunyi-app'); });
    });
  }
  function tekan(k) {
    var fr = C.frame; if (!fr || !fr.contentDocument) return;
    var m = F.menu.filter(function (x) { return x.k === k && x.l; })[0]; if (!m) return;
    m.l.forEach(function (lk) { var b = cariTombol(fr.contentDocument, lk); if (b) b.click(); });
    try { fr.contentWindow.scrollTo(0, 0); } catch (x) { }
  }

  function gagal(pesan) {
    var m = $('muatan'); m.hidden = false; m.className = 'bad';
    m.innerHTML = esc(pesan) + '<div class="ulang"><button type="button" class="tbl" id="cobaLagi">Coba lagi</button></div>';
    $('cobaLagi').onclick = muat;
    if (C.frame) C.frame.hidden = true;
    document.documentElement.classList.remove('berbingkai');
  }

  // Tampilan form: kalau ada simpanan di Supabase (dibuat Apps Script, tanpa kunci rahasia), langsung dipakai;
  // tanggal bawaan diganti hari ini dan stok dimuat ulang. Simpanan yang berumur > 30 menit diperbarui di belakang.
  function hariIni() { return window.Lembar ? window.Lembar.format(new Date(), 'yyyy-MM-dd') : new Date().toISOString().slice(0, 10); }
  function segarkan(html) {
    // Halaman Mike (Kendali Bisnis): bulan bawaan = bulan ini (tampilan simpanan bisa dibuat bulan lalu).
    html = html.replace(/("bulanIni":")\d{4}-\d{2}(")/, function (x, a, b) { return a + hariIni().slice(0, 7) + b; });
    var i = html.indexOf('var D = ');
    if (i < 0) return html;
    var j = html.indexOf(';\n', i);
    if (j < 0) return html;
    var bagian = html.slice(i, j).replace(/("tanggal":")\d{4}-\d{2}-\d{2}(")/, function (x, a, b) { return a + hariIni() + b; });
    return html.slice(0, i) + bagian + html.slice(j);
  }
  async function muat() {
    var m = $('muatan'); m.hidden = false; m.className = ''; m.textContent = 'Memuat form…';
    var simpanan = null;
    try {
      var r = await sb.rpc('halaman_baca', { p_app: APP });
      if (!r.error && r.data && r.data.html) simpanan = r.data;
    } catch (e) { simpanan = null; }
    var umur = simpanan ? Date.now() - new Date(simpanan.dibuat).getTime() : Infinity;
    if (simpanan && umur < 30 * 86400000) { // tampilan simpanan dipakai sampai 30 hari (diperbarui di belakang tiap > 30 menit), supaya tidak menunggu Apps Script
      C.nama = simpanan.nama || '';
      tampil(segarkan(String(simpanan.html)), true);
      if (umur > 30 * 60000) kirim('halaman', []).catch(function () { });
      return;
    }
    var d;
    try { d = await kirim('halaman', []); } catch (e) { gagal(e.message); return; }
    C.nama = d.nama || '';
    tampil(String(d.html || ''), false);
  }
  function tampil(html, dariSimpanan) {
    var m = $('muatan');
    // Bilah tab lama disembunyikan lewat aturan gaya (tetap berlaku walau form menggambar ulang isinya).
    var gaya = GAYA + '<style>' + F.sembunyi + '{display:none!important}</style>';
    html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, function (x) { return x + JEMBATAN + gaya; }) : JEMBATAN + gaya + html;
    var fr = $('bingkai'); C.frame = fr;
    fr.onload = function () {
      m.hidden = true; fr.hidden = false;
      var dok = fr.contentDocument;
      sembunyikanTab(dok);
      var nm = dok.getElementById('nama');
      if (nm && !nm.value && C.nama) { nm.value = C.nama; nm.dispatchEvent(new Event('input', { bubbles: true })); }
      ukur(); tekan(C.aktif);
      if (APP === 'gudang') { try { cariKodeKirim(dok); } catch (e) { } try { ikonGd(dok); } catch (e) { } }
      if (BUKA.length) jalankanBuka(dok);
      // Stok di dalam tampilan simpanan bisa sudah lama: langsung dimuat ulang (form produksi).
      if (dariSimpanan) try { if (typeof fr.contentWindow.muatStok === 'function') fr.contentWindow.muatStok(); } catch (e) { }
    };
    fr.srcdoc = html;
  }

  M.mulai({
    aplikasi: F.judul, masukJudul: F.masuk,
    masukTeks: 'Masuk memakai akun Google yang sudah didaftarkan manajemen Moscow Supplies.',
    izin: function (ctx) {
      if (F.peran.indexOf(ctx.peran) > -1) return true;
      return ctx.peran ? 'Akun ' + ctx.email + ' tidak punya akses ke form ini.' : false;
    },
    menu: F.menu.map(function (x) { return x.grup ? { grup: x.grup } : x.href ? { k: x.k, nm: x.nm, ik: x.ik, href: x.href } : { k: x.k, nm: x.nm, ik: x.ik, bagian: 'isi', pendek: x.pendek }; }),
    bawah: F.bawah,
    pindah: function (k) {
      var mm = F.menu.filter(function (x) { return x.k === k; })[0];
      if (mm && mm.modal) { bukaModal(mm); return; }
      C.aktif = k; if (F.asli) { panelAsli(k); return; } tekan(k); subBotol(k); panelAbsen(k); panelMenu(k); setTimeout(ukur, 0);
    },
    siap: function (ctx) {
      if (ctx.peran === 'manajemen') {
        var nav = document.querySelector('#mSide nav');
        if (nav) nav.insertAdjacentHTML('beforeend', '<div class="grp">APLIKASI LAIN</div><a class="it" href="master.html">' + M.svg('beranda') + '<span class="nm">Master Data</span></a>');
      }
      C.aktif = M.aktif() || F.menu[0].k;
      if (F.menu.some(function (x) { return x.k === C.aktif && x.modal; })) { C.aktif = F.menu[0].k; M.buka(C.aktif, true); }
      if (F.asli) {
        if (!F.menu.some(function (x) { return x.k === C.aktif && !x.href && !x.grup; })) { C.aktif = F.menu[0].k; M.buka(C.aktif, true); }
        var um = ctx.sesi && ctx.sesi.user && ctx.sesi.user.user_metadata || {};
        C.nama = String(um.full_name || um.name || '').split(' ')[0];
        panelAsli(C.aktif); return;
      }
      muat(); panelAbsen(C.aktif); panelMenu(C.aktif);
    }
  });
})();
