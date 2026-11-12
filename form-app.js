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
        { k: 'hpp', nm: 'HPP & Harga', ik: 'harga', l: [], modal: '#mmhBtn', kotak: 'mmhBox' }
        // 12 Nov 2026: "Laporan pengajuan (PDF)" pindah jadi tombol di Pengajuan > Daftar pengajuan (lapAjuanDiDaftar).
      ],
      bawah: ['stok', 'order', 'salur', 'ajuan', 'lain']
    },
    produksi: {
      judul: 'STAF PRODUKSI', masuk: 'Form staf produksi', peran: ['produksi', 'manajemen'],
      sembunyi: '.t:has(> #pgsT1), .tabs:has(> #tab1), #mmhBtn',
      menu: [
        { k: 'isi', nm: 'Isi laporan', ik: 'produksi', l: ['#pgsT1', '#tab1'], pendek: 'Laporan' },
        { k: 'data', nm: 'Data produksi', ik: 'dasbor', l: ['#pgsT1', '#tab2'], pendek: 'Data' },
        { k: 'kirimkp', nm: 'Kirim ke Kantor Packing', ik: 'pemasok', panel: 'pkp', pendek: 'Kirim KP' },
        { k: 'stokgu', nm: 'Stok Gudang Utama', ik: 'gudang', panel: 'pkp', pendek: 'Stok GU' },
        { k: 'riwayat', nm: 'Riwayat', ik: 'riwayat', l: ['#pgsT1', '#tab3'] },
        { k: 'order', nm: 'Order masuk', ik: 'nota', l: ['#pgsT1', '#tab4'], pendek: 'Order' },
        { k: 'botol', nm: 'Botol, stiker & packaging', ik: 'stok', l: ['#pgsT1', '#tab5'], pendek: 'Botol & packing' },
        // 12 Nov 2026: "Pantau produksi" digabung ke dalam Data produksi (gabungPantau).
        { k: 'rencana', nm: 'Rencana produksi', ik: 'setuju', l: ['#pgsT1', '#tabRPD'] },
        { k: 'sesuai', nm: 'Penyesuaian stok', ik: 'atur', l: ['#pgsT1', '#tabPS'] },
        { k: 'kemasan', nm: 'Harga kemasan', ik: 'harga', l: ['#pgsT1', '#tabKms'] },
        { k: 'hpp', nm: 'HPP & Harga jual', ik: 'harga', l: [], modal: '#mmhBtn', kotak: 'mmhBox', pendek: 'HPP' },
        { k: 'ajuan', nm: 'Pengajuan pembelian', ik: 'purch', l: ['#pgsT2'], pendek: 'Pengajuan' }
        // 12 Nov 2026: "Laporan pengajuan (PDF)" jadi tombol di daftar pengajuan (lapAjuanDiDaftar), sama dengan Gudang Utama.
      ],
      bawah: ['isi', 'data', 'order', 'botol', 'lain']
    },
    bahanbaku: {
      judul: 'STAF BAHAN BAKU', masuk: 'Form staf bahan baku', peran: ['bahan_baku', 'manajemen'],
      sembunyi: '.t:has(> #pgsT1), #tabs:has(> #tabBeli), #mmhBtn',
      menu: [
        { k: 'produksi', nm: 'Produksi', ik: 'produksi', l: ['#pgsT1', 'Produksi@#tabs'] },
        { k: 'pigment', nm: 'Mixing pigment', ik: 'muat', l: ['#pgsT1', 'Mixing pigment@#tabs'], pendek: 'Pigment' },
        { k: 'warna', nm: 'Mixing warna', ik: 'muat', l: ['#pgsT1', 'Mixing warna@#tabs'], pendek: 'Warna' },
        { k: 'pakai', nm: 'Pakai / rusak', ik: 'nota', l: ['#pgsT1', 'Pakai / rusak@#tabs'], pendek: 'Pakai' },
        { k: 'beli', nm: 'Pembelian', ik: 'purch', l: ['#pgsT1', '#tabBeli'] },
        { k: 'sesuai', nm: 'Penyesuaian', ik: 'atur', l: ['#pgsT1', 'Penyesuaian@#tabs'] },
        { k: 'stok', nm: 'Stok bahan', ik: 'stok', l: ['#pgsT1', 'Stok bahan@#tabs'], pendek: 'Stok' },
        { k: 'harga', nm: 'Harga', ik: 'harga', l: ['#pgsT1', '#tabHarga'] },
        { k: 'hpp', nm: 'HPP & Harga jual', ik: 'harga', l: [], modal: '#mmhBtn', kotak: 'mmhBox', pendek: 'HPP' },
        { k: 'laporan', nm: 'Laporan', ik: 'laporan', l: ['#pgsT1', 'Laporan@#tabs'] },
        { k: 'pantau', nm: 'Pantau produksi', ik: 'dasbor', l: ['#pgsT1', '#tabPP'] },
        { k: 'rencana', nm: 'Rencana bahan', ik: 'setuju', l: ['#pgsT1', '#tabRBB'] },
        { k: 'ajuan', nm: 'Pengajuan pembelian', ik: 'purch', l: ['#pgsT2'], pendek: 'Pengajuan' }
        // 12 Nov 2026: "Laporan pengajuan (PDF)" jadi tombol di daftar pengajuan (lapAjuanDiDaftar), sama dengan Gudang Utama.
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
        // 12 Nov 2026: catatan pekerjaan sistem per hari dari penanggung jawab sistem (sistem-lap.js, tabel sistem_laporan).
        { k: 'sistem', nm: 'Laporan sistem', ik: 'laporan', panel: 'sistem', pendek: 'Sistem' },
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
    // Catatan pemakaian Apps Script (tahap 6: mana yang masih bergantung). Tidak ditunggu.
    try { sb.rpc('gas_pakai_catat', { p_app: APP, p_fn: f }).then(function () { }, function () { }); } catch (e) { }
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
      // 12 Nov 2026: mode manajemen juga dibaca dari Supabase (dulu lewat Apps Script, memuat 10-20 detik); mgmt hanya menandai "atas nama manajemen".
      gdBonusLap: function (a) { return sb.rpc('gudang_bonus_bulan', { p_bulan: (a[0] && a[0].bulan) || '' }).then(function (r) { return r.error ? { ok: false, pesan: r.error.message } : r.data; }); },
      gdxPengajuan: function (a) { return window.Pengadaan.gdxPengajuan(sb).then(function (r) { if (r && a[0] && a[0].mm) r.mgmt = true; return r; }); },
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
      rencanaProduksi: function () { return rencanaDenganOrder(); },
      hppStafData: function (a) { return window.Hpp.hppStafData(sb, 'produksi', a[0]); },
      pgsData: function (a) { return window.Pengadaan.pgsData(sb, 'produksi').then(function (r) { if (r && a[0] && a[0].mm) r.mgmt = true; return r; }); },
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
      pgsData: function (a) { return window.Pengadaan.pgsData(sb, 'bahanbaku').then(function (r) { if (r && a[0] && a[0].mm) r.mgmt = true; return r; }); }
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
    kghDaftar: async function (a) {
      var r = await sb.rpc('kgh_daftar', { p_hari: Number((a[0] || {}).hari) || 30 });
      if (r.error) throw new Error(r.error.message);
      return r.data;
    },
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
      gdxKpHitung: function (p) { return window.KantorPacking.gdxKpHitung(sb, Object.assign({}, p, { tanggal: tglOp('gdxKa') })); },
      gdxKpHitungW: function (p) { return window.KantorPacking.gdxKpHitungW(sb, Object.assign({}, p, { tanggal: tglOp('kpwAl') })); },
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
        return ['gudang_opname', { p_nama: teks(p.nama), p_alasan: teks(p.alasan), p_items: Array.isArray(p.items) ? p.items : [], p_token: teks(p.token),
          p_tanggal: tglOp('skAlasan') || null }];
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
      // 5 Nov 2026: uang keluar dicek dulu (nominal sama, selisih tanggal maks. 3 hari, dari sumber mana pun) supaya tidak tercatat dobel.
      akuntingSimpan: async function (p) {
        if (teks(p.jenis) === 'Keluar' && !(await cekDobelAcc([{ t: teks(p.tanggal), v: teks(p.nominal), ket: teks(p.ket) }])))
          return { ok: false, pesan: 'Tidak disimpan: transaksi ini kemungkinan sudah tercatat. Cek di tab Riwayat.' };
        return rpcData('akunting_simpan', { p_tanggal: teks(p.tanggal), p_jenis: teks(p.jenis), p_akun: teks(p.akun), p_tujuan: teks(p.tujuan),
          p_kategori: teks(p.kategori), p_nominal: teks(p.nominal), p_ket: teks(p.ket), p_token: teks(p.token) });
      },
      akuntingSimpanBanyak: async function (p) {
        var rows = Array.isArray(p.rows) ? p.rows : [];
        if (!(await cekDobelAcc(rows.map(function (x) { return { t: teks(p.tanggal), v: teks(x && x.nominal), ket: teks(x && x.ket) }; }))))
          return { ok: false, pesan: 'Tidak disimpan: ada pengeluaran yang kemungkinan sudah tercatat. Hapus baris itu lalu simpan lagi.' };
        return rpcData('akunting_simpan_banyak', { p_tanggal: teks(p.tanggal), p_akun: teks(p.akun), p_rows: rows, p_token: teks(p.token) });
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
  async function rpcData(fn, args) {
    var r = await sb.rpc(fn, args);
    if (r.error) throw new Error('Gagal menyimpan: ' + r.error.message + '. Tekan simpan sekali lagi; aman, tidak akan tercatat dua kali.');
    return r.data;
  }
  // Pengaman uang keluar dobel: true = lanjut simpan, false = dibatalkan pengguna.
  async function cekDobelAcc(rows) {
    var d;
    try { var r = await sb.rpc('acc_cek_dobel', { p_rows: rows.map(function (x) { return { t: x.t, v: String(x.v || '').replace(/[^\d]/g, '') }; }) }); d = r && r.data && r.data.dobel; }
    catch (e) { return true; }
    if (!d || !d.length) return true;
    var rp = function (n) { return 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID'); };
    var t = 'Kemungkinan SUDAH TERCATAT (nominal sama, selisih tanggal maks. 3 hari):\n\n' + d.map(function (x) {
      var b = rows[x.i - 1] || {};
      return '• ' + (rows.length > 1 ? 'Baris ' + x.i + ': ' : '') + rp(x.v) + (b.ket ? ' – ' + b.ket : '') + '\n' + x.ada.slice(0, 3).map(function (a) {
        return '   sudah ada ' + a.no + ' (' + a.t + ', ' + a.sumber + ')' + (a.ket ? ': ' + a.ket : '');
      }).join('\n');
    }).join('\n\n') + '\n\nTekan OK kalau ini memang transaksi lain (tetap simpan).\nTekan Batal kalau ini transaksi yang sama.';
    return window.confirm(t);
  }
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
    if ((APP === 'mdlama' || APP === 'akunting') && f === 'aksesTiket' && !(a && a[0] && a[0].dev)) return Promise.resolve(JSON.stringify({ ok: false }));
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
  // Hitung stok (Gudang Utama, Kantor Packing total & per warna): pilihan tanggal hitung (5 Nov 2026).
  // Kotak tanggal disisipkan di atas kolom keterangan setiap kali form menggambar ulang; nilainya disimpan di sini.
  var TGL_OP = {};
  function hariWita(geser) { return new Date(Date.now() + 8 * 3600e3 - (geser || 0) * 86400e3).toISOString().slice(0, 10); }
  function tglOp(id) { var t = TGL_OP[id] || ''; return /^\d{4}-\d{2}-\d{2}$/.test(t) && t < hariWita() ? t : ''; }
  function tanggalOpname(dok) {
    var CATATAN = 'Hasil hitung dianggap jumlah fisik di akhir tanggal ini. Selisih dibandingkan dengan stok sistem per akhir tanggal itu; ' +
      'barang yang keluar / masuk sesudahnya (penyaluran, kiriman produksi, penjualan) tetap tercatat. Angka "stok sistem" di daftar adalah stok hari ini.';
    function pasang() {
      ['skAlasan', 'gdxKa', 'kpwAl'].forEach(function (id) {
        var el = dok.getElementById(id);
        if (!el || dok.getElementById('tgOp_' + id)) return;
        var ref = el.previousElementSibling && el.previousElementSibling.tagName === 'LABEL' ? el.previousElementSibling : el;
        var w = dok.createElement('div'); w.style.margin = '0 0 12px';
        w.innerHTML = '<label for="tgOp_' + id + '" style="margin-top:0">Tanggal hitung stok</label>' +
          '<input type="date" id="tgOp_' + id + '" min="' + hariWita(62) + '" max="' + hariWita() + '" value="' + (tglOp(id) || hariWita()) + '">' +
          '<div class="kecil ks" style="margin-top:4px"></div>';
        ref.parentNode.insertBefore(w, ref);
        var inp = w.querySelector('input'), ket = w.querySelector('div');
        var tulis = function () {
          var v = inp.value || hariWita();
          if (v > hariWita()) { v = hariWita(); inp.value = v; }
          TGL_OP[id] = v < hariWita() ? v : '';
          ket.textContent = TGL_OP[id] ? CATATAN : 'Hitung stok hari ini. Ganti tanggal kalau hitungnya dilakukan di hari sebelumnya.';
          ket.style.color = TGL_OP[id] ? '#9A5B00' : '';
        };
        inp.addEventListener('change', tulis); inp.addEventListener('input', tulis); tulis();
      });
    }
    pasang();
    var tunda = 0;
    new MutationObserver(function () { if (tunda) return; tunda = setTimeout(function () { tunda = 0; pasang(); }, 60); })
      .observe(dok.body, { childList: true, subtree: true });
  }
  // Koreksi pengajuan pembelian oleh pengaju (5 Nov 2026): tombol "Koreksi" di daftar pengajuan Gudang Utama, Produksi, Bahan Baku.
  // Langsung tersimpan (RPC pengadaan_koreksi) tanpa ACC Master Data; dicatat & dikabarkan ke grup.
  function koreksiAjuan(dok) {
    var NO_RE = /^[A-Z]{1,4}-\d{6}-\d+$/;
    function e_(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function f_(n) { n = Number(n) || 0; return n.toLocaleString('id-ID', { maximumFractionDigits: 2 }); }
    var GAYA_IN = 'width:100%;box-sizing:border-box;margin-top:4px;padding:9px 10px;border:1px solid #cfd6e0;border-radius:10px;font:inherit;background:#fff';
    function baris() {
      var out = [];
      Array.prototype.forEach.call(dok.querySelectorAll('#pgsIsi .aj, #gdxIsi .row'), function (r) {
        var ks = r.querySelector('.ks'); if (!ks) return;
        var bag = ks.textContent.split(' · ').map(function (x) { return x.trim(); });
        if (!NO_RE.test(bag[0])) return;
        if (APP === 'gudang' && bag[2] && bag[2] !== 'Gudang' && !C.mgmt) return;
        var ch = Array.prototype.filter.call(r.querySelectorAll('.ch'), function (c) { return !c.classList.contains('Impor'); })[0];
        out.push({ el: r, no: bag[0], st: ch ? ch.textContent.trim() : '', ch: ch });
      });
      return out;
    }
    function pasang() {
      baris().forEach(function (b) {
        if (b.el.querySelector('.kxB')) return;
        if (b.st !== 'Menunggu' && b.st !== 'Disetujui') return;
        var w = dok.createElement('div'); w.className = 'kxB'; w.style.marginTop = '6px';
        w.innerHTML = '<button type="button" style="border:1px solid #1a78a0;background:#fff;color:#1a78a0;border-radius:9px;padding:6px 12px;font:inherit;font-size:13px;font-weight:700;cursor:pointer">&#9998;&#65039; Koreksi</button><div class="kxP"></div>';
        b.el.appendChild(w);
        w.querySelector('button').onclick = function () { buka(b, w.querySelector('.kxP'), w.querySelector('button')); };
      });
    }
    async function buka(b, P, tb) {
      if (P.innerHTML) { P.innerHTML = ''; return; }
      P.innerHTML = '<div style="font-size:13px;color:#5a6677;margin-top:6px">Memuat...</div>';
      var r = await sb.rpc('pengadaan_koreksi', { p_no: b.no, p_aksi: 'lihat' }), d = r && r.data;
      if (!d || !d.ok) { P.innerHTML = '<div style="font-size:13px;color:#b3261e;margin-top:6px">' + e_((d && d.pesan) || (r.error && r.error.message) || 'Gagal memuat.') + '</div>'; return; }
      if (!d.boleh) { P.innerHTML = '<div style="font-size:13px;color:#8a4b0b;margin-top:6px">' + e_(d.info) + '</div>'; return; }
      var tunggu = d.st === 'Menunggu', q0 = d.qs !== null && d.qs !== undefined ? d.qs : d.q;
      var nmAwal = (dok.getElementById('nama') || {}).value || C.nama || '';
      P.innerHTML = '<div style="margin-top:8px;border:1px solid #cfe0ea;background:#f3f8fb;border-radius:10px;padding:10px;font-size:13.5px">' +
        '<div style="color:#4a5566;margin-bottom:6px">' + e_(d.info) + '</div>' +
        '<label style="display:block;margin-top:6px;font-weight:600">Qty (' + e_(d.s || 'pcs') + ')</label><input class="kxQ" inputmode="decimal" value="' + e_(q0) + '" style="' + GAYA_IN + '">' +
        (tunggu ? '<label style="display:block;margin-top:8px;font-weight:600">Perkiraan harga satuan (Rp, boleh kosong)</label><input class="kxH" inputmode="numeric" value="' + (d.h ? e_(d.h) : '') + '" style="' + GAYA_IN + '">' +
          '<label style="display:block;margin-top:8px;font-weight:600">Alasan pengajuan</label><input class="kxA" maxlength="300" value="' + e_(d.al) + '" style="' + GAYA_IN + '">' : '') +
        '<label style="display:block;margin-top:8px;font-weight:600">Alasan koreksi (wajib)</label><input class="kxC" maxlength="200" placeholder="Mis. salah ketik qty / tidak jadi dibeli" style="' + GAYA_IN + '">' +
        '<label style="display:block;margin-top:8px;font-weight:600">Nama kamu</label><input class="kxN" maxlength="40" value="' + e_(nmAwal) + '" style="' + GAYA_IN + '">' +
        '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button type="button" class="kxS" style="flex:1;min-width:140px;border:0;border-radius:10px;background:#1a78a0;color:#fff;padding:10px;font:inherit;font-weight:700;cursor:pointer">Simpan koreksi</button>' +
        '<button type="button" class="kxX" style="flex:1;min-width:140px;border:1px solid #b3261e;border-radius:10px;background:#fff;color:#b3261e;padding:10px;font:inherit;font-weight:700;cursor:pointer">Batalkan pengajuan</button></div>' +
        '<div class="kxM" style="margin-top:8px;font-size:13px"></div></div>';
      var $q = function (c) { return P.querySelector(c); };
      async function kirim(aksi, bt) {
        var m = $q('.kxM'), cat = $q('.kxC').value.trim(), nm = $q('.kxN').value.trim();
        if (cat.length < 3) { m.style.color = '#b3261e'; m.textContent = 'Tulis alasan koreksinya.'; $q('.kxC').focus(); return; }
        if (aksi === 'batal' && !window.confirm('Batalkan pengajuan ' + b.no + ' (' + d.n + ')?')) return;
        bt.disabled = true; m.style.color = '#4a5566'; m.textContent = 'Menyimpan...';
        var r2 = await sb.rpc('pengadaan_koreksi', { p_no: b.no, p_aksi: aksi, p_qty: $q('.kxQ').value, p_harga: $q('.kxH') ? $q('.kxH').value : null,
          p_alasan_ajuan: $q('.kxA') ? $q('.kxA').value : null, p_catatan: cat, p_nama: nm });
        var h = r2 && r2.data; bt.disabled = false;
        if (!h || !h.ok) { m.style.color = '#b3261e'; m.textContent = (h && h.pesan) || (r2.error && r2.error.message) || 'Gagal menyimpan. Coba lagi.'; return; }
        if (nm) C.nama = nm;
        // perbarui baris di daftar
        if (b.ch) { b.ch.textContent = h.st; b.ch.className = 'ch ' + h.st; }
        Array.prototype.forEach.call(b.el.children, function (c) {
          if (/^Qty\b/.test(c.textContent || '') && h.st !== 'Batal') c.innerHTML = 'Qty <b>' + f_(h.q) + '</b> ' + e_(d.s) + (h.h ? ' &times; Rp ' + f_(h.h) + ' = Rp ' + f_(h.q * h.h) : '') + ' <span style="color:#1a78a0;font-size:12px">(dikoreksi)</span>';
        });
        P.innerHTML = '<div style="margin-top:6px;font-size:13px;color:#157347;background:#e8f5ee;border-radius:8px;padding:8px 10px">' + e_(h.pesan) + '</div>';
        if (h.st === 'Batal') tb.remove();
      }
      $q('.kxS').onclick = function () { kirim('ubah', this); };
      $q('.kxX').onclick = function () { kirim('batal', this); };
    }
    pasang();
    var tunda = 0;
    new MutationObserver(function () { if (tunda) return; tunda = setTimeout(function () { tunda = 0; pasang(); }, 60); })
      .observe(dok.body, { childList: true, subtree: true });
  }
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
  // Gudang › Pengajuan › Daftar pengajuan: tombol "Laporan PDF / WhatsApp" (dulu menu terpisah "Laporan pengajuan (PDF)").
  // Laporan dibuka sebagai jendela di atas aplikasi; ditutup kembali ke Daftar pengajuan.
  function lapAjuanDiDaftar(dok) {
    // Gudang Utama memakai panel gdx (#gdxIsi, tab di #gdxBar .s); Staf Produksi & Bahan Baku memakai panel pgs (#pgsIsi, #pgsSg).
    var gd = !!dok.getElementById('gdxIsi');
    var isi = dok.getElementById(gd ? 'gdxIsi' : 'pgsIsi'); if (!isi) return;
    var pilihOn = gd ? '#gdxBar .s button.on[data-s="daftar"]' : '#pgsSg button.on[data-s="daftar"]';
    function pasang() {
      var on = dok.querySelector(pilihOn);
      if (!on || dok.getElementById('lapAjBtn') || !isi.firstElementChild) return;
      isi.insertAdjacentHTML('afterbegin', '<div class="c" style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">' +
        '<span class="ks">Laporan pengajuan per tanggal untuk Purchasing.</span>' +
        '<button type="button" id="lapAjBtn" class="btn" style="width:auto;margin:0">&#128196; Laporan PDF / WhatsApp</button></div>');
      dok.getElementById('lapAjBtn').onclick = bukaLapAjuan;
    }
    pasang();
    new MutationObserver(pasang).observe(isi, { childList: true });
    var bar = dok.getElementById(gd ? 'gdxBar' : 'pgsSg'); if (bar) new MutationObserver(pasang).observe(bar, { childList: true, attributes: true, subtree: true });
  }
  // Staf Produksi: isi "Pantau produksi" (perbandingan bulan ini dengan bulan lalu) dipindah ke bawah Data produksi,
  // supaya angka produksi ada di satu menu. Kotaknya (#ppBox) memuat datanya sendiri begitu terlihat di layar.
  function gabungPantau(dok) {
    var v2 = dok.getElementById('v2'), box = dok.getElementById('ppBox');
    if (!v2 || !box || dok.getElementById('ppGabung')) return;
    var wadah = dok.createElement('div'); wadah.id = 'ppGabung';
    wadah.innerHTML = '<h2 style="margin-top:22px">Perbandingan dengan bulan lalu</h2>';
    var asal = dok.getElementById('vPP');
    // gaya .pp ada di dalam #vPP: ikut dipindah supaya tampilannya tetap
    if (asal) Array.prototype.slice.call(asal.querySelectorAll('style')).forEach(function (st) { wadah.appendChild(st); });
    wadah.appendChild(box);
    v2.appendChild(wadah);
    var tb = dok.getElementById('tabPP'); if (tb) tb.style.display = 'none';
  }
  function bukaLapAjuan() {
    if (!window.AjuanPdf) return;
    var lama = $('lapAjLatar'); if (lama) lama.remove();
    var lt = document.createElement('div'); lt.id = 'lapAjLatar';
    lt.style.cssText = 'position:fixed;inset:0;z-index:70;background:var(--latar,#F4F6F9);overflow:auto';
    lt.innerHTML = '<div style="max-width:900px;margin:0 auto;padding:12px 16px 0"><button type="button" id="lapAjTutup" style="border:0;background:none;color:#1E78A8;font:inherit;font-weight:700;cursor:pointer;padding:6px 0">&larr; Kembali ke Daftar pengajuan</button></div><div id="lapAjIsi"></div>';
    document.body.appendChild(lt);
    $('lapAjTutup').onclick = function () { lt.remove(); };
    AjuanPdf.gambar($('lapAjIsi'), M.sb, APP);
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
    } else if (mm && mm.panel === 'sistem') {
      el.hidden = false; C.panel = true; sec.classList.add('pk-mode'); $('muatan').hidden = true; document.documentElement.classList.remove('berbingkai');
      if (window.LaporanSistem) LaporanSistem.gambar(el, M.sb, C.peran);
    } else if (mm && mm.panel === 'pkp') {
      el.hidden = false; C.panel = true; sec.classList.add('pk-mode'); $('muatan').hidden = true; document.documentElement.classList.remove('berbingkai');
      if (window.ProduksiKP) ProduksiKP.gambar(el, M.sb, k, { nama: C.nama, salin: salinKeSheet });
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
    // 12 Nov 2026: tombol menu lama bisa memuat angka penanda (mis. "Pengajuan 8", "Stok 3"); tanpa ini menu aplikasi
    // tidak menemukan tombolnya dan halaman tetap di tab sebelumnya (tampak "macet").
    for (var j = 0; j < calon.length; j++) if (rapi(calon[j].innerText || calon[j].textContent).replace(/\s*\d+$/, '') === teks) return calon[j];
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

  // Blok data JSON yang ditanam di tampilan form ("var D = {...};") diganti isinya (5 Nov 2026, tanpa Apps Script).
  function gantiBlok(html, nama, ubah) {
    var m = new RegExp('(?:var|const|let)\\s+' + nama + '\\s*=\\s*').exec(html); if (!m) return html;
    var s = html.indexOf('{', m.index); if (s < 0 || s > m.index + m[0].length + 2) return html;
    var dalam = 0, i = s, str = false;
    for (; i < html.length; i++) {
      var c = html[i];
      if (str) { if (c === '\\') { i++; continue; } if (c === '"') str = false; continue; }
      if (c === '"') { str = true; continue; }
      if (c === '{' || c === '[') dalam++; else if (c === '}' || c === ']') { dalam--; if (!dalam) break; }
    }
    var o; try { o = JSON.parse(html.slice(s, i + 1)); } catch (e) { return html; }
    o = ubah(o) || o;
    return html.slice(0, s) + JSON.stringify(o).replace(/</g, '\\u003c') + html.slice(i + 1);
  }
  // Daftar barang, pilihan warna & pelanggan di tampilan simpanan diperbarui dari Supabase (dulu ditanam Apps Script saat membuat tampilan).
  async function isiUlang(html) {
    try {
      if (APP === 'produksi' && window.Produksi && window.Produksi.halamanData) {
        var p = await batasWaktu(window.Produksi.halamanData(sb), 6000);
        if (p && p.items && p.items.length) html = gantiBlok(html, 'D', function (D) { D.items = p.items; D.warna = p.warna; });
      } else if (APP === 'mdlama') {
        var r = await batasWaktu(sb.rpc('halaman_isi'), 6000), d = r && r.data;
        if (d && d.ok && d.items && d.items.length) html = gantiBlok(html, 'D', function (D) {
          D.items = d.items;
          if (Array.isArray(d.pelanggan) && Array.isArray(D.pelanggan)) D.pelanggan = d.pelanggan.map(function (x) { return { n: x.n, t: x.t, d: x.d, k: 'KUNCI_LAIN' }; });
        });
      }
    } catch (e) { }
    try { html = await asalBarang(html); } catch (e) { }
    try { html = await acuanHpp(html); } catch (e) { }
    return html;
  }
  // 11 Nov 2026: asal barang (Impor / Lokal) di form pengajuan & PO mengikuti daftar barang impor manajemen (tabel barang_impor).
  // impor = tetap Impor; campuran (baris kuning) = staf wajib memilih Impor atau Lokal; selain itu = tetap Lokal. Aturan di asal-barang.js.
  // 12 Nov 2026: HPP acuan (HPP saat harga jual terakhir ditetapkan) untuk tanda "HPP naik 35% atau lebih" di Gudang Utama.
  async function acuanHpp(html) {
    if (APP !== 'gudang') return html;
    var r = await batasWaktu(sb.rpc('hpp_acuan_daftar'), 6000);
    if (!r || r.error || !r.data || !r.data.ok) return html;
    var skrip = '<script>window.__ACUAN=' + JSON.stringify(r.data.acuan || {}).replace(/</g, '\\u003c') + ';window.__ACUAN_BATAS=' + (Number(r.data.batas) || 35) + ';<\/script>';
    return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, function (x) { return x + skrip; }) : skrip + html;
  }
  // 12 Nov 2026: Rencana produksi (Staf Produksi) jadi satu daftar kerja. Barang yang ditunggu order (request toko / consignment /
  // reseller yang sudah disetujui dan stok Gudang Utama tidak cukup) diberi tanda "request stock" dan ditaruh paling atas.
  // x.ord = { s: sisa order disetujui, m: menunggu ACC, kurang: harus diproduksi untuk order, kurangM: tambahan kalau yang menunggu
  // disetujui, siapa: daftar pelanggan, warna: [{ w, s, kurang }] }.
  async function rencanaDenganOrder() {
    var dua = await Promise.all([window.BahanBaku.rencanaProduksi(sb), sb.rpc('produksi_order_butuh').then(function (r) { return r; }, function () { return { data: null }; })]);
    var rp = dua[0], bt = dua[1] && dua[1].data && dua[1].data.ok ? dua[1].data.butuh : null;
    if (!rp || !rp.ok || !bt) return rp;
    var per = {};
    Object.keys(bt).forEach(function (kw) {
      var p = kw.split('|'), k = p[0], w = p.slice(1).join('|'), v = bt[kw], s = Number(v[0]) || 0, m = Number(v[1]) || 0, g = Math.max(0, Number(v[2]) || 0);
      var kurang = Math.max(0, s - g), kurangM = Math.max(0, s + m - g) - kurang;
      var o = per[k] || (per[k] = { s: 0, m: 0, kurang: 0, kurangM: 0, siapa: [], warna: [] });
      o.s += s; o.m += m; o.kurang += kurang; o.kurangM += kurangM;
      String(v[3] || '').split(', ').forEach(function (n) { if (n && o.siapa.indexOf(n) < 0) o.siapa.push(n); });
      if (w && (kurang > 0 || kurangM > 0)) o.warna.push({ w: w, s: s, kurang: kurang, kurangM: kurangM });
    });
    var nBrg = 0, pcs = 0, ada = {};
    rp.list.forEach(function (x) { ada[x.k] = 1; if (per[x.k] && (per[x.k].s > 0 || per[x.k].m > 0)) { x.ord = per[x.k]; if (x.ord.kurang > 0) { nBrg++; pcs += x.ord.kurang; } } });
    // Barang di order yang tidak ada di daftar robot tetap ditampilkan supaya tidak terlewat.
    Object.keys(per).forEach(function (k) {
      if (ada[k] || !(per[k].kurang > 0)) return;
      rp.list.push({ k: k, n: k, kat: 'Order', st: 'Kritis', tot: 0, gd: 0, prod: 0, toko: 0, r: 0, cukup: 0, saran: 0, warna: [], ord: per[k] });
      nBrg++; pcs += per[k].kurang;
    });
    rp.list = rp.list.map(function (x, i) { return [x, i]; }).sort(function (a, b) {
      var ka = a[0].ord ? a[0].ord.kurang : 0, kb = b[0].ord ? b[0].ord.kurang : 0;
      return (kb > 0) - (ka > 0) || kb - ka || a[1] - b[1];
    }).map(function (y) { return y[0]; });
    rp.ordN = nBrg; rp.ordPcs = pcs;
    return rp;
  }
  async function asalBarang(html) {
    if (['gudang', 'produksi', 'bahanbaku', 'purchasing'].indexOf(APP) === -1) return html;
    var r = await batasWaktu(sb.from('barang_impor').select('kode,nama,asal'), 6000);
    if (!r || r.error || !Array.isArray(r.data) || !r.data.length) return html;
    var peta = {};
    r.data.forEach(function (x) { peta[String(x.kode).trim().toUpperCase()] = { a: x.asal, n: x.nama }; });
    var skrip = '<script>window.__ASAL=' + JSON.stringify(peta).replace(/</g, '\\u003c') + ';<\/script>' +
      '<script src="' + location.origin + '/asal-barang.js?v=8"><\/script>';
    // 1) tebakan awal per barang
    html = html.replace("function tebakImp(kl, k) {", "function tebakImp(kl, k) { if (window.__asalTebak) return window.__asalTebak(kl, k);");
    // 2) pilihan asal di kartu pengajuan (hanya barang campuran yang bisa dipilih)
    html = html.split("'<label>Asal barang</label><select data-imp=\"' + i + '\"><option value=\"0\"' + (it.imp ? '' : ' selected') + '>Lokal</option><option value=\"1\"' + (it.imp ? ' selected' : '') + '>Impor (dikirim juga ke Mike)</option></select>'")
      .join("(window.__asalPilih ? window.__asalPilih(it, i) : '')");
    html = html.split("if (it) it.imp = s.value === '1'; };").join("if (it) { it.imp = s.value === '' ? null : s.value === '1'; s.style.border = ''; } };");
    // 3) cek sebelum kirim pengajuan
    html = html.replace('function kirimAjuan(yakin) {', 'function kirimAjuan(yakin) { if (window.__asalCek && !window.__asalCek(KR)) return;');
    html = html.replace('function kirim(yakin) {', 'function kirim(yakin) { if (typeof KR !== "undefined" && window.__asalCek && !window.__asalCek(KR)) return;');
    // 3b) stok di daftar pengajuan = Gudang Utama; stok Kantor Packing & toko ditampilkan terpisah sebagai keterangan
    html = html.replace("function infoItem(x) { return 'stok ' + f(x.stok, 1) + ' ' + esc(x.s)", "function infoItem(x) { return 'stok gudang ' + f(x.stok, 1) + ' ' + esc(x.s) + (window.__stokLain ? window.__stokLain(x) : '')");
    html = html.replace("'<div class=\"ks\">stok ' + f(x.stok) + (x.transit", "'<div class=\"ks\">stok gudang ' + f(x.stok) + (window.__stokLain ? window.__stokLain(x) : '') + (x.transit");
    html = html.replace("Dihitung dari stok, barang dalam perjalanan, dan rata-rata terjual.", "Dihitung dari stok Gudang Utama, barang dalam perjalanan, dan rata-rata keluar dari gudang atau terjual (yang lebih besar).");
    // 3c) Gudang Utama: daftar barang di pengajuan = yang perlu diajukan saja (bisa tampilkan semua), tanda Impor / Lokal
    html = html.replace("var L = D.items.filter(function (x) { return x.kel === kel && (!q || (x.k + ' ' + x.n).toLowerCase().indexOf(q) !== -1); });\n    L.sort(function (a, b) { return (URUT[a.st] !== undefined ? URUT[a.st] : 9) - (URUT[b.st] !== undefined ? URUT[b.st] : 9); });\n    var tot = L.length; L = L.slice(0, 60);\n    $('gdxHs').innerHTML = L.map(",
      "var L = D.items.filter(function (x) { return x.kel === kel && (!q || (x.k + ' ' + x.n).toLowerCase().indexOf(q) !== -1); });\n    if (window.__perluSaring) L = window.__perluSaring(L, D, kel, q);\n    L.sort(function (a, b) { return (URUT[a.st] !== undefined ? URUT[a.st] : 9) - (URUT[b.st] !== undefined ? URUT[b.st] : 9); });\n    var tot = L.length; L = L.slice(0, 60);\n    $('gdxHs').innerHTML = (window.__perluKepala ? window.__perluKepala(D, kel, q, 'gdxQ') : '') + L.map(");
    html = html.split("'</b> <span class=\"ks\">' + esc(x.k) + '</span><div class=\"ks\">' + infoItem(x)").join("'</b> <span class=\"ks\">' + esc(x.k) + '</span>' + (window.__asalTanda ? window.__asalTanda(x.kel, x.k) : '') + '<div class=\"ks\">' + infoItem(x)");
    html = html.split("(a.imp ? ' <span class=\"ch Impor\">&#127759; Impor</span>' : '')").join("(a.imp ? ' <span class=\"ch Impor\">&#127759; Impor</span>' : ' <span class=\"ch\" style=\"background:#e7f6ec;color:#157347\">&#127968; Lokal</span>')");
    // 3d) pengajuan: harga satuan diisi otomatis dari harga beli terakhir (staf tidak perlu mencari); saat terima PO tampil perubahan HPP
    html = html.split("'<div><label>Perkiraan harga satuan</label><input data-i=\"' + i + '\" data-f=\"h\" inputmode=\"numeric\" value=\"' + esc(it.h ? f(it.h) : '') + '\" placeholder=\"Rp\"></div></div>'")
      .join("'<div><label>Harga terakhir (otomatis)</label><input data-i=\"' + i + '\" data-f=\"h\" readonly tabindex=\"-1\" style=\"background:#f2f5f8;color:#6b7686\" value=\"' + esc(it.h ? f(it.h) : '') + '\" placeholder=\"belum ada data\"></div></div>'");
    html = html.split("', sudah datang ' + fmt(it.d) + '</div></td>").join("', sudah datang ' + fmt(it.d) + '</div>' + (window.__hppTanda ? window.__hppTanda(it, S.d && S.d.hrg, o && o.no, S.d && S.d.hppTerima) : '') + '</td>");
    // 3e) Terima barang PO: kolom Bonus (barang gratis dari supplier) + laporan barang bonus bulanan (aplikasi Gudang Utama)
    if (APP === 'gudang') {
    html = html.split("<th class=\"n\">Baik</th><th class=\"n\">Rusak</th></tr>'").join("<th class=\"n\">Baik</th><th class=\"n\">Rusak</th><th class=\"n\">Bonus</th></tr>'");
    html = html.split("'<td class=\"n\" colspan=\"3\">lengkap</td></tr>'").join("'<td class=\"n\" colspan=\"4\">lengkap</td></tr>'");
    html = html.split("esc(v.rusak === undefined ? '' : v.rusak) + '\" placeholder=\"0\"></td></tr>';").join("esc(v.rusak === undefined ? '' : v.rusak) + '\" placeholder=\"0\"></td>' +\n            '<td class=\"n\"><input data-tb=\"' + esc(key) + '\" data-jn=\"bonus\" inputmode=\"numeric\" title=\"Barang bonus gratis dari supplier\" style=\"width:60px;padding:6px;text-align:right\" value=\"' + esc(v.bonus === undefined ? '' : v.bonus) + '\" placeholder=\"0\"></td></tr>';");
    html = html.split("return { k: it.k, w: it.w, baik: v.baik || '', rusak: v.rusak || '' }; }).filter(function (x) { return x.baik || x.rusak; });")
      .join("return { k: it.k, w: it.w, baik: v.baik || '', rusak: v.rusak || '', bonus: v.bonus || '' }; }).filter(function (x) { return x.baik || x.rusak || x.bonus; });");
    html = html.split("h += '<div class=\"card\"><h3>&#128229; Barang dari supplier (PO)</h3>';").join("h += '<div class=\"card\"><h3>&#128229; Barang dari supplier (PO)</h3>';\n  h = (window.__bonusKartu ? window.__bonusKartu() : '') + h;");
    }
    // 4) form PO: asal ditetapkan dari barangnya
    var po = "'<div><label>Asal barang</label><select data-po=\"asal\">' + opsi(['Impor', 'Lokal'], S.po.asal) + '</select></div>'";
    html = html.split(po).join("(window.__asalPo ? window.__asalPo(S.po, " + po + ") : " + po + ")");
    html = html.replace('function simpanPo(btn) {', 'function simpanPo(btn) { if (window.__asalPo) window.__asalPo(S.po, \'\');');
    return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, function (x) { return x + skrip; }) : skrip + html;
  }
  async function muat() {
    var m = $('muatan'); m.hidden = false; m.className = ''; m.textContent = 'Memuat form…';
    var simpanan = null;
    try {
      var r = await sb.rpc('halaman_baca', { p_app: APP });
      if (!r.error && r.data && r.data.html) simpanan = r.data;
    } catch (e) { simpanan = null; }
    var umur = simpanan ? Date.now() - new Date(simpanan.dibuat).getTime() : Infinity;
    if (simpanan) { // tampilan simpanan selalu dipakai (isinya diperbarui dari Supabase); Apps Script hanya memperbaruinya di belakang selama masih jalan
      C.nama = simpanan.nama || '';
      tampil(await isiUlang(segarkan(String(simpanan.html))), true);
      if (umur > 30 * 60000) kirim('halaman', []).catch(function () { });
      return;
    }
    var d;
    try { d = await kirim('halaman', []); } catch (e) { gagal(e.message); return; }
    C.nama = d.nama || '';
    tampil(String(d.html || ''), false);
  }
  // 7 Nov 2026: tombol mengambang "barang dibayar — tandai diterima" menutupi tombol lain dan membuat staf menandai barang
  // yang belum datang. Tombolnya disembunyikan; daftarnya dibuka dari kartu di bawah daftar pengajuan (menu Pengajuan),
  // dan setiap "Diterima" minta konfirmasi bahwa barang sudah benar-benar sampai.
  function terimaDiDaftar(dok) {
    if (!dok || dok.getElementById('ptrInlineCss')) return;
    var st = dok.createElement('style'); st.id = 'ptrInlineCss';
    st.textContent = '#ptrBtn{display:none!important}#ptrInline{margin:14px 0 6px;border:1px solid #d9cdf0;background:#f6f1fd;border-radius:14px;padding:14px}' +
      '#ptrInline b{display:block;font-size:15px;margin-bottom:4px;color:#3f2470}#ptrInline .ks{font-size:13px;color:#4a5566}' +
      '#ptrInline button{margin-top:10px;width:100%;border:0;border-radius:10px;background:#6b3fb5;color:#fff;padding:11px;font:inherit;font-weight:700;cursor:pointer}' +
      '#ptrInline button:disabled{background:#c9bfdc}';
    (dok.head || dok.body).appendChild(st);
    function jumlah() { var b = dok.getElementById('ptrBtn'), m = b && /(\d+)/.exec(b.textContent || ''); return m ? Number(m[1]) : 0; }
    function pasang() {
      var pan = dok.getElementById('pgsPan'), isi = dok.getElementById('pgsIsi'), seg = dok.querySelector('#pgsSg button[data-s="daftar"]');
      if (!pan || !isi || !seg) return;
      var daftar = /\bon\b/.test(seg.className), ada = dok.getElementById('ptrInline');
      if (!daftar) { if (ada) ada.remove(); return; }
      var n = jumlah(), h = '<b>&#128230; Barang sudah dibayar, menunggu datang (' + n + ')</b>' +
        '<div class="ks">' + (n ? 'Tekan <b>Diterima</b> hanya kalau barangnya <b>sudah benar-benar sampai</b> dan sudah dicek jumlahnya. Barang yang baru dipesan / dibayar jangan ditandai diterima.' : 'Belum ada barang dibayar yang menunggu diterima.') + '</div>' +
        '<button type="button" data-ptr-buka' + (n ? '' : ' disabled') + '>Buka daftar barang datang &rarr; tandai diterima</button>';
      if (ada && ada.getAttribute('data-n') === String(n) && ada.parentNode === isi && isi.lastElementChild === ada) return;
      if (!ada) { ada = dok.createElement('div'); ada.id = 'ptrInline'; }
      ada.setAttribute('data-n', String(n)); ada.innerHTML = h; isi.appendChild(ada);
    }
    var tunda = null, obs = new (dok.defaultView || window).MutationObserver(function () { clearTimeout(tunda); tunda = setTimeout(pasang, 120); });
    obs.observe(dok.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    dok.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target : null; if (!t) return;
      if (t.closest('[data-ptr-buka]')) { var b = dok.getElementById('ptrBtn'); if (b) b.click(); return; }
      var tr = t.closest('#ptrPan [data-p="terima"]');
      if (tr) {
        var kartu = tr.closest('.c'), nm = kartu && kartu.querySelector('b') ? kartu.querySelector('b').textContent : 'barang ini';
        if (!(dok.defaultView || window).confirm('Barang "' + nm + '" sudah BENAR-BENAR SAMPAI dan sudah dicek jumlahnya?\n\nKalau barangnya belum datang, tekan Batal.')) { e.preventDefault(); e.stopPropagation(); }
      }
    }, true);
    pasang();
  }

  // 7 Nov 2026: hasil produksi yang dilaporkan langsung dipindah otomatis ke stok Gudang Utama, jadi "stok gudang produksi"
  // selalu 0 dan membingungkan staf. Di aplikasi staf produksi: pilihan "Disalurkan" dan angka stok gudang produksi
  // disembunyikan, diganti keterangan bahwa hasil produksi langsung masuk Gudang Utama. Datanya tidak dihapus.
  function produksiKeGudang(dok) {
    if (!dok || dok.getElementById('pkgCss')) return;
    var st = dok.createElement('style'); st.id = 'pkgCss';
    st.textContent = '#seg button[data-j="SALUR"],#tujuanBox,.stokbar,#daftar .stk,#daftar .grid2 label i,' +
      '#p2 .tile.k,#p2 .prod .nums .k,#p2 table.tw th:nth-child(4),#p2 table.tw td:nth-child(4){display:none!important}' +
      '#pkgInfo{border:1px solid #BFE3CB;background:#EAF6EE;color:#145C34;border-radius:12px;padding:10px 12px;margin:0 0 10px;font-size:13px;line-height:1.45}';
    (dok.head || dok.body).appendChild(st);
    var TEKS = 'Hasil produksi yang kamu laporkan <b>langsung masuk stok Gudang Utama</b>, jadi tidak ada stok yang tersisa di produksi. Cukup isi jumlah yang diproduksi hari ini. Untuk melihat stok barang jadi, buka menu <b>Stok Gudang Utama</b>. Barang yang dibawa ke Kantor Packing dicatat di menu <b>Kirim ke Kantor Packing</b>.';
    function rapikan() {
      var cari = dok.getElementById('cari');
      if (cari && !dok.getElementById('pkgInfo')) { var d = dok.createElement('div'); d.id = 'pkgInfo'; d.innerHTML = TEKS; cari.parentNode.insertBefore(d, cari); }
      var sal = dok.querySelector('#seg button[data-j="SALUR"]');
      if (sal && /\bon\b/.test(sal.className)) { var pr = dok.querySelector('#seg button[data-j="PRODUKSI"]'); if (pr) pr.click(); }
      dok.querySelectorAll('#p2 .tile.x span, #p2 .prod .nums .x span, #p2 table.tw th:nth-child(3)').forEach(function (el) {
        if (el.textContent === 'Disalurkan') el.textContent = 'Masuk Gudang Utama';
      });
      var ket = dok.querySelector('#p2 .card .kecil');
      if (ket && !ket.getAttribute('data-pkg')) { ket.setAttribute('data-pkg', '1'); ket.textContent = 'Angka mengikuti periode di atas. Hasil produksi otomatis masuk stok Gudang Utama. Cat dirinci per warna.'; }
    }
    // 9 Nov 2026 (sql/193): botol, Seal Filler, amplop & Kenka Bond jerigen terpotong otomatis dari laporan produksi.
    // Menu "Botol & stiker" tinggal untuk stiker & heat shrink: roll = catat 1 saat membuka roll baru, lembar = jumlah lembar terpakai.
    function rapikanBotol() {
      var v5 = dok.getElementById('v5'); if (!v5) return;
      var bt = dok.querySelector('#bhSeg button[data-bj="Botol"]'), sk = dok.querySelector('#bhSeg button[data-bj="Stiker"]');
      if (bt) bt.style.display = 'none';
      if (sk && !/\bon\b/.test(sk.className)) sk.click();
      if (sk && sk.textContent !== 'Stiker & heat shrink') sk.textContent = 'Stiker & heat shrink';
      var judul = v5.querySelector('.card > b'), ket = v5.querySelector('.card > .kecil');
      if (judul && judul.textContent !== 'Stiker & heat shrink') judul.textContent = 'Stiker & heat shrink';
      if (ket && !ket.getAttribute('data-komp')) {
        ket.setAttribute('data-komp', '1');
        ket.innerHTML = '<b>Botol tidak perlu dicatat lagi</b>: botol, Seal Filler, amplop, dan Kenka Bond jerigen terpotong otomatis setiap kamu melapor produksi. ' +
          'Di sini cukup catat <b>stiker roll & heat shrink: isi 1 setiap membuka roll baru</b>, dan <b>stiker lembar: jumlah lembar yang dipakai</b>. Botol rusak / pecah dicatat di menu Rusak.';
      }
      var q = dok.getElementById('bhQty'); if (q && q.placeholder !== '1') q.placeholder = '1';
      var lq = v5.querySelector('label[for="bhQty"]'); if (lq && lq.textContent !== 'Jumlah roll / lembar') lq.textContent = 'Jumlah roll / lembar';
    }
    var tunda = null, obs = new (dok.defaultView || window).MutationObserver(function () { clearTimeout(tunda); tunda = setTimeout(function () { rapikan(); rapikanBotol(); }, 80); });
    obs.observe(dok.body, { childList: true, subtree: true });
    rapikan(); rapikanBotol();
  }

  function tampil(html, dariSimpanan) {
    var m = $('muatan');
    // Bilah tab lama disembunyikan lewat aturan gaya (tetap berlaku walau form menggambar ulang isinya).
    var gaya = GAYA + '<style>' + F.sembunyi + '{display:none!important}</style>';
    // 12 Nov 2026: staf Gudang Utama cukup lewat "+ Buat pengajuan"; tab "PO impor" (buat / catat PO) hanya untuk Purchasing & manajemen.
    if (APP === 'gudang' && (C.peran === 'gudang' || (C.peran === 'manajemen' && C.lihatStaf))) gaya += '<style>.s > button[data-s="po"], .tile[data-ke="po"]{display:none!important}</style>';
    // 12 Nov 2026: blok "Mulai cepat" di Ringkasan dihapus (isinya sama dengan menu Stok / Pengajuan / Penyaluran).
    if (APP === 'gudang') html = html.replace("h += '<div class=\"card\"><h3>Mulai cepat</h3>' +", "if (0) h += '<div class=\"card\"><h3>Mulai cepat</h3>' +");
    if (APP === 'gudang') {
      // 12 Nov 2026: Riwayat gudang bisa disaring per jenis (Kirim / Terima supplier / Terima produksi / Bonus).
      html = html.replace("<span class=\"kecil\">80 transaksi gudang terakhir.</span></div>';", "<span class=\"kecil\">80 transaksi gudang terakhir.</span>' + (window.__rwChip ? window.__rwChip(d.riwayat) : '') + '</div>';");
      html = html.replace("d.riwayat.forEach(function (x) {\n    var pcs = 0, rs = 0;", "d.riwayat.filter(function (x) { return window.__rwCocok ? window.__rwCocok(x) : true; }).forEach(function (x) {\n    var pcs = 0, rs = 0;");
      html = html.replace("if (el.id === 'rwMuat') { muat(); return; }", "if (el.hasAttribute('data-rwf')) { window.__rwF = el.getAttribute('data-rwf'); gambarRiwayat(); return; }\n  if (el.id === 'rwMuat') { muat(); return; }");
      // 12 Nov 2026: Robot stok gudang: satu tombol "Ajukan semua saran robot"; tombol per barang diperpendek jadi "+ Ajukan".
      html = html.replace("Tekan + Buat pengajuan untuk mengajukan restok (barang lokal di-ACC Viory, barang impor di-ACC Mike).</div>' +",
        "Tekan Ajukan semua untuk memasukkan semua saran ke daftar pengajuan (jumlah masih bisa diubah sebelum dikirim), atau + Ajukan per barang. Barang lokal di-ACC Purchasing, barang impor di-ACC Mike.</div>' +\n      (function () { var P = window.__robotPerlu ? window.__robotPerlu(D, hb.concat(tp)) : []; return P.length ? '<button type=\"button\" class=\"btn\" id=\"gdxRbSemua\" style=\"margin:10px 0 4px\">Ajukan semua saran robot (' + P.length + ' barang)</button>' : ''; })() +");
      html = html.replace("'<button type=\"button\" data-k=\"' + esc(x.k) + '\">+ Buat pengajuan</button></div>'; }).join('') +\n      (hb.length + tp.length > 15", "'<button type=\"button\" data-k=\"' + esc(x.k) + '\">+ Ajukan</button></div>'; }).join('') +\n      (hb.length + tp.length > 15");
      html = html.replace("b.onclick = function () { kel = 'Barang jualan'; tambah('Barang jualan', b.getAttribute('data-k'), true); pilih('beli', 'ajukan'); }; });\n  }",
        "b.onclick = function () { kel = 'Barang jualan'; tambah('Barang jualan', b.getAttribute('data-k'), true); pilih('beli', 'ajukan'); }; });\n    var sm = $('gdxRbSemua'); if (sm) sm.onclick = function () { kel = 'Barang jualan'; (window.__robotPerlu ? window.__robotPerlu(D, hb.concat(tp)) : []).forEach(function (y) { tambah('Barang jualan', y.x.k, true); }); pilih('beli', 'ajukan'); };\n  }");
    }
    if (APP === 'produksi') {
      // 12 Nov 2026: Penyesuaian stok: pilihan "Produksi" dihapus. Hasil produksi langsung masuk stok Gudang Utama, jadi tidak ada
      // stok barang jadi di produksi; penyesuaian barang jadi dilakukan dari Gudang Utama. Tersisa Botol dan Stiker.
      html = html.replace("var PS = {bagian: 'Produksi',", "var PS = {bagian: 'Botol',");
      html = html.replace("'<div class=\"seg\" id=\"psSeg\"><button type=\"button\" data-pb=\"Produksi\" class=\"on\">Produksi</button><button type=\"button\" data-pb=\"Botol\">Botol</button>",
        "'<div class=\"seg\" id=\"psSeg\"><button type=\"button\" data-pb=\"Botol\" class=\"on\">Botol</button>");
      html = html.replace("Dipakai kalau hasil hitung fisik berbeda dengan stok di sistem. Stok baru berubah setelah disetujui manajemen Moscow Supplies.</div>' +\n      '<label class=\"t\">Bagian</label>'",
        "Dipakai kalau hasil hitung fisik botol atau stiker berbeda dengan stok di sistem. Stok baru berubah setelah disetujui manajemen Moscow Supplies. Stok barang jadi ada di Gudang Utama dan disesuaikan dari aplikasi Gudang Utama.</div>' +\n      '<label class=\"t\">Bagian</label>'");
      // Rencana produksi: tanda "request stock" (rencanaDenganOrder).
      html = html.replace("    return '<div class=\"rpd-it\"><div class=\"nm\">' + esc(x.n) + '<small>'",
        "    var od = '';\n    if (x.ord && (x.ord.kurang > 0 || x.ord.kurangM > 0 || x.ord.s > 0)) {\n" +
        "      var o = x.ord, wr = o.warna.filter(function (y) { return y.kurang > 0; });\n" +
        "      od = '<div style=\"margin:0 0 6px;padding:8px 10px;border-radius:10px;font-size:13px;line-height:1.4;' + (o.kurang > 0 ? 'background:#FDECEA;color:#8A1C14' : 'background:#EEF6FB;color:#0F4C6B') + '\">' +\n" +
        "        (o.kurang > 0 ? '<b>&#128230; Request stock: buat ' + fmt(o.kurang) + ' pcs dulu</b> (diminta ' + fmt(o.s) + ' pcs, stok gudang tidak cukup)' : (o.s > 0 ? '<b>&#128230; Ada request stock ' + fmt(o.s) + ' pcs</b>, stok gudang cukup' : '<b>&#128230; Ada request menunggu ACC</b>')) +\n" +
        "        (o.kurangM > 0 ? ' &middot; +' + fmt(o.kurangM) + ' pcs kalau request yang menunggu disetujui' : '') +\n" +
        "        (wr.length ? '<div class=\"rpd-w\" style=\"margin-top:4px\">' + wr.map(function (y) { return '<span>' + esc(y.w) + ' ' + fmt(y.kurang) + '</span>'; }).join('') + '</div>' : '') +\n" +
        "        '<div style=\"margin-top:2px;opacity:.85\">' + esc(o.siapa.join(', ')) + '</div></div>';\n    }\n" +
        "    return '<div class=\"rpd-it\"><div class=\"nm\">' + esc(x.n) + (x.ord && x.ord.kurang > 0 ? ' <span style=\"font-size:11px;font-weight:700;color:#fff;background:#B42318;border-radius:999px;padding:1px 7px\">request stock</span>' : '') + '<small>'");
      html = html.replace("'<div class=\"rpd-b ' + kelas(x.st) + '\"><i>🤖</i><em><b class=\"rpd-st\">' + esc(x.st) + '</b>' + isi + w + '</em></div></div>';",
        "od + '<div class=\"rpd-b ' + kelas(x.st) + '\"><i>🤖</i><em><b class=\"rpd-st\">' + esc(x.st) + '</b>' + isi + w + '</em></div></div>';");
      html = html.replace("      if (F === 'buat') return x.st === 'Kritis' || x.st === 'Perlu dibuat';", "      if (F === 'buat') return x.st === 'Kritis' || x.st === 'Perlu dibuat' || (x.ord && x.ord.kurang > 0);");
      html = html.replace("      el('rpdKet').innerHTML = 'Total saran produksi: <b>'", "      el('rpdKet').innerHTML = (r.ordN ? '<b style=\"color:#B42318\">' + r.ordN + ' barang ditunggu request stock (' + fmt(r.ordPcs) + ' pcs harus dibuat dulu)</b>, ada di urutan paling atas. ' : '') + 'Total saran produksi: <b>'");
      // Harga kemasan: stok masuk dari pengajuan terisi otomatis dari pembayaran Purchasing (sql 208).
      html = html.replace("Isi harga total sesuai nota.", "Stok masuk dari pengajuan terisi otomatis dari pembayaran Purchasing; yang tampil di sini hanya stok masuk tanpa pengajuan. Isi harga total sesuai nota.");
    }
    // 12 Nov 2026: HPP & Harga (Gudang Utama). HPP diperbarui otomatis saat Terima barang, jadi staf hanya melihat HPP
    // dan mengajukan harga jual baru; barang yang HPP-nya naik 35% atau lebih dari HPP acuan (sql 203) diberi tanda merah
    // dan ditaruh paling atas. Manajemen (mode manajemen) tetap bisa mengubah HPP & harga jual seperti biasa.
    if (APP === 'gudang') {
      html = html.replace("return D.mgmt ? ['hpp', 'harga'] : ['hpp']; }", "return D.mgmt ? ['hpp', 'harga'] : ['harga']; }");
      html = html.replace(": 'Perubahan HPP dikirim sebagai usulan dan baru berlaku setelah di-ACC manajemen Moscow Supplies.');",
        ": 'HPP diperbarui otomatis setiap barang PO diterima (harga beli + ongkir). Kalau HPP naik 35% atau lebih dari HPP acuan (HPP saat harga jual terakhir ditetapkan), barang diberi tanda merah dan laporan harga jual baru otomatis dikirim ke manajemen Moscow Supplies.');");
      html = html.replace("var tot = L.length; L = L.slice(0, 80);\n    var JB = jenisBoleh();",
        "if (!D.toko) { var tipis = function (b) { var acu = (window.__ACUAN || {})[b.k]; return acu > 0 && b.hpp >= acu * (1 + (window.__ACUAN_BATAS || 35) / 100) ? 0 : 1; }; L.sort(function (a, b) { return tipis(a) - tipis(b); }); }\n    var tot = L.length; L = L.slice(0, 80);\n    var JB = jenisBoleh();");
      html = html.replace("(D.toko ? ['hd', 'harga'] : ['hpp', 'harga']).forEach(function (j) { var t = D.tunggu[",
        "var acu = (window.__ACUAN || {})[b.k], bts = window.__ACUAN_BATAS || 35; if (!D.toko && acu > 0 && b.hpp >= acu * (1 + bts / 100)) tg += '<div class=\"tg\" style=\"background:#FDECEA;color:#B3261E;font-weight:600\">HPP naik ' + (Math.round((b.hpp / acu - 1) * 1000) / 10).toString().replace(\".\", \",\") + '% dari HPP acuan Rp ' + Math.round(acu).toLocaleString(\"id-ID\") + ' (batas ' + bts + '%). Laporan harga jual baru sudah dikirim ke manajemen; bisa juga ajukan sendiri.</div>';\n      (D.toko ? ['hd', 'harga'] : ['hpp', 'harga']).forEach(function (j) { var t = D.tunggu[");
      html = html.replace("'\">' + (buka === b.k ? 'Tutup' : 'Ubah') + '</button>", "'\">' + (buka === b.k ? 'Tutup' : (D.mgmt || D.toko ? 'Ubah' : 'Ajukan harga jual')) + '</button>");
      html = html.replace("placeholder=\"' + (D.toko ? 'Contoh: harga pasaran di marketplace turun' : 'Contoh: harga beli dari supplier naik') + '\"", "placeholder=\"' + (D.toko ? 'Contoh: harga pasaran di marketplace turun' : 'Contoh: HPP naik 40% dari acuan, margin menipis') + '\"");
    }
    html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, function (x) { return x + JEMBATAN + gaya; }) : JEMBATAN + gaya + html;
    var fr = $('bingkai'); C.frame = fr;
    fr.onload = function () {
      m.hidden = true; fr.hidden = false;
      var dok = fr.contentDocument;
      sembunyikanTab(dok);
      var nm = dok.getElementById('nama');
      if (nm && !nm.value && C.nama) { nm.value = C.nama; nm.dispatchEvent(new Event('input', { bubbles: true })); }
      ukur(); tekan(C.aktif);
      if (APP === 'gudang') { try { cariKodeKirim(dok); } catch (e) { } try { ikonGd(dok); } catch (e) { } try { tanggalOpname(dok); } catch (e) { } try { lapAjuanDiDaftar(dok); } catch (e) { } }
      if (APP === 'gudang' || APP === 'produksi' || APP === 'bahanbaku') { try { koreksiAjuan(dok); } catch (e) { } try { terimaDiDaftar(dok); } catch (e) { } }
      if (APP === 'produksi' || APP === 'bahanbaku') { try { lapAjuanDiDaftar(dok); } catch (e) { } }
      if (APP === 'produksi') { try { gabungPantau(dok); } catch (e) { } }
      if (APP === 'produksi') { try { produksiKeGudang(dok); } catch (e) { } }
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
      C.mgmt = ctx.peran === 'manajemen'; C.peran = ctx.peran || '';
      if (window.Pembaruan) setTimeout(function () { window.Pembaruan.pasang(APP, ctx.peran); }, 300);
      C.lihatStaf = true; try { C.lihatStaf = localStorage.getItem('lihatStaf') !== '0'; } catch (x) { }
      if (ctx.peran === 'manajemen') {
        var nav = document.querySelector('#mSide nav');
        if (nav) nav.insertAdjacentHTML('beforeend', '<div class="grp">APLIKASI LAIN</div><a class="it" href="master.html">' + M.svg('beranda') + '<span class="nm">Master Data</span></a>');
        // 12 Nov 2026: manajemen melihat aplikasi persis seperti staf yang memegangnya (bawaan), supaya mudah mengontrol kesalahan.
        // Bisa diganti ke "Tampilan lengkap manajemen" (menu tambahan seperti PO impor) lewat tombol di menu samping.
        if (nav) {
          nav.insertAdjacentHTML('beforeend', '<div class="grp">TAMPILAN</div><a class="it" href="#" id="mTampil">' + M.svg('atur') + '<span class="nm">' +
            (C.lihatStaf ? 'Tampilan staf (aktif) &middot; ganti ke lengkap' : 'Tampilan lengkap manajemen &middot; ganti ke staf') + '</span></a>');
          var tb = document.getElementById('mTampil');
          if (tb) tb.onclick = function (e) { e.preventDefault(); try { localStorage.setItem('lihatStaf', C.lihatStaf ? '0' : '1'); } catch (x) { } location.reload(); };
        }
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
