/* Diambil dari master.html supaya tersimpan di perangkat (lebih cepat dibuka). */
(function () {
  var M = Moscow, esc = M.esc, rp = M.rp, jt = M.jt, fmt = M.fmt;
  var BLN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  function namaBulan(b) { var p = String(b || '').split('-'); return BLN[Number(p[1]) - 1] || b; }
  function $(i) { return document.getElementById(i); }
  var D = { beranda: null, ringkasan: null, setuju: null, request: null, pantau: null, aksi: [], waktu: {} }, sb = M.sb, BAGIAN = 'request';
  var KUNCI = { 'md:beranda': 'beranda', 'md:ringkasan': 'ringkasan', 'md:setuju': 'setuju', 'md:request': 'request', 'md:pantau': 'pantau',
    'md:titip': 'titip', 'md:mkt': 'mkt', 'md:mkt:lalu': 'mktLalu', 'md:bh': 'bh', 'md:bh:lalu': 'bhLalu',
    'md:gudang': 'gudang', 'md:beli:lalu': 'beliLalu', 'md:pengadaan': 'pengadaan', 'md:tanpa': 'tanpa',
    'md:prod': 'prod', 'md:botol': 'botol', 'md:bbk': 'bbk', 'md:rpd': 'rpd', 'md:rbb': 'rbb', 'md:pp:prod': 'ppProd', 'md:pp:bahan': 'ppBahan',
    'md:barang': 'barang', 'md:akses': 'akses', 'md:acc': 'acc', 'md:acc:lalu': 'accLalu', 'md:hrgnaik': 'hrgnaik', 'md:hbb': 'hbb', 'md:tpb': 'tpb' };
  function jumlahTunggu() { return (D.setuju && D.setuju.menunggu || 0) + (D.request && D.request.n || 0) + (window.KoreksiJual ? window.KoreksiJual.menunggu() : 0); }

  M.mulai({
    aplikasi: 'MASTER DATA', masukJudul: 'Master Data', masukTeks: 'Pusat kendali manajemen Moscow Supplies. Masuk memakai akun Google yang sudah didaftarkan.',
    izin: function (ctx) { return ctx.peran === 'manajemen' ? true : 'Master Data hanya untuk manajemen Moscow Supplies.'; },
    menu: [
      { k: 'beranda', nm: 'Beranda' }, { k: 'setuju', nm: 'Persetujuan' },
      { k: 'produksi', nm: 'Produksi' }, { k: 'gudang', nm: 'Gudang Utama', pendek: 'Gudang' }, { k: 'purch', nm: 'Purchasing' },
      { k: 'jual', nm: 'Penjualan' }, { k: 'upload', nm: 'Upload laporan', ik: 'nota' }, { k: 'uang', nm: 'Accounting' }, { k: 'laporan', nm: 'Laporan', ik: 'laporan' }, { k: 'riwayat', nm: 'Riwayat' }, { k: 'atur', nm: 'Pengaturan' },
      { grup: 'MASTER DATA' },
      { k: 'mdproduk', nm: 'Produk', ik: 'produk', bagian: 'atur', judul: 'Produk · edit barang & HPP' },
      { k: 'mdpemasok', nm: 'Pemasok', ik: 'pemasok', bagian: 'purch', judul: 'Pemasok · pembelian per supplier' },
      { k: 'mdpelanggan', nm: 'Pelanggan', ik: 'pelanggan', bagian: 'atur', judul: 'Pelanggan & link' },
      { grup: 'APLIKASI LAIN' },
      { k: 'app-kb', nm: 'Kendali Bisnis', ik: 'laporan', href: 'kendali.html' },
      { k: 'app-stok', nm: 'Stok', ik: 'stok', href: 'stok.html' },
      { k: 'app-kasir', nm: 'Kasir Toko Offline', ik: 'kasir', href: 'kasir.html' },
      { k: 'app-kreatif', nm: 'Manager Kreatif', ik: 'produksi', href: 'kreatif.html' },
      { k: 'app-akunting', nm: 'Form accounting', ik: 'uang', href: 'form.html?f=akunting' },
      { k: 'app-payroll', nm: 'Payroll', ik: 'pelanggan', href: 'form.html?f=payroll' },
      { k: 'app-absensi', nm: 'Absensi staf', ik: 'setuju', href: 'form.html?f=payroll#absensi' },
      { k: 'app-mdlama', nm: 'Master Data lama', ik: 'dasbor', href: 'form.html?f=mdlama' },
      { grup: 'FORM STAF' },
      { k: 'f-gudang', nm: 'Gudang Utama', ik: 'gudang', href: 'form.html?f=gudang' },
      { k: 'f-purch', nm: 'Purchasing', ik: 'purch', href: 'form.html?f=purchasing' },
      { k: 'f-produksi', nm: 'Staf Produksi', ik: 'produksi', href: 'form.html?f=produksi' },
      { k: 'f-bbk', nm: 'Staf Bahan Baku', ik: 'produk', href: 'form.html?f=bahanbaku' },
      { k: 'f-medan', nm: 'Consignment Medan', ik: 'toko', href: 'consignment.html?toko=Consignment%20Medan' },
      { k: 'f-sidoarjo', nm: 'Consignment Sidoarjo', ik: 'toko', href: 'consignment.html?toko=Consignment%20Sidoarjo' },
      { k: 'f-renon', nm: 'Consignment Renon', ik: 'toko', href: 'consignment.html?toko=Consignment%20Renon' },
      { k: 'f-offline', nm: 'Toko Offline', ik: 'toko', href: 'consignment.html?toko=Toko%20Offline' },
      { k: 'f-mike', nm: 'Persetujuan & pembayaran', ik: 'harga', href: 'form.html?f=mike' },
      { k: 'f-absen', nm: 'Absen staf (tampilan HP)', ik: 'setuju', href: 'absensi.html' }
    ],
    bawah: ['beranda', 'setuju', 'gudang', 'uang', 'lain'],
    pindah: function (k, m) { document.documentElement.classList.toggle('m-bx', k === 'beranda');
      if (k === 'mdproduk' || k === 'mdpelanggan') { AT.bagian = k === 'mdproduk' ? 'brg' : 'pel'; if (!AT.mulai) { AT.mulai = true; muatAtur(); } else gambarAtur(); }
      if (k === 'mdpemasok') { P.bagian = 'beli'; gambarPurch(); }
      if (k === 'upload') gambarUpload(); if (k === 'laporan' && window.LaporanPajak && !LaporanPajak.dimuat) { LaporanPajak.dimuat = true; LaporanPajak.gambar($('bLaporan'), { sb: sb }); } if ($('lamaJudul')) $('lamaJudul').textContent = m.nm + ' masih di Master Data lama'; if (k === 'jual' && !J.mulai) { J.mulai = true; siapJual(); } if (k === 'riwayat' && !RW.mulai) { RW.mulai = true; siapRiwayat(); } if (k === 'atur' && !AT.mulai) { AT.mulai = true; muatAtur(); } },
    siap: function (ctx) {
      D.email = String((ctx && ctx.email) || '').toLowerCase();
      var um = (ctx && ctx.sesi && ctx.sesi.user && ctx.sesi.user.user_metadata) || {}; D.nama = um.full_name || um.name || '';
      M.aksi([
        { nm: 'Muat ulang', ik: 'muat', klik: function () { muat(); } },
        { nm: 'Hitung ulang sekarang', kelas: 'pri', ik: 'muat', klik: function (b) { hitungUlang(b); } }
      ]);
      BR.janji = ambilBeranda(''); // mulai bersamaan dengan data lain, tidak menunggu
      muat();
    }
  });

  // Muat dua tahap: data kecil untuk Beranda dulu (langsung tampil), sisanya (data besar bagian lain) menyusul.
  var INTI = ['md:beranda', 'md:ringkasan', 'md:setuju', 'md:request', 'md:pantau'];
  async function muat() {
    var h = await Promise.all([
      sb.from('hasil_hitung').select('kunci,data,dibuat').in('kunci', INTI),
      sb.from('md_aksi').select('*').order('id', { ascending: false }).limit(15)
    ]);
    if (h[0].error) { $('bBeranda').innerHTML = '<div class="msg bad">Data gagal dimuat: ' + esc(h[0].error.message) + '</div>'; return; }
    (h[0].data || []).forEach(function (x) { D[KUNCI[x.kunci]] = x.data; D.waktu[KUNCI[x.kunci]] = x.dibuat; });
    D.aksi = h[1].data || [];
    // Koreksi laporan penjualan toko (koreksi.js): langsung dari Supabase.
    if (window.KoreksiJual) {
      window.KoreksiJual.pasang({ badge: function () { M.badge('setuju', jumlahTunggu()); var c = document.querySelector('[data-bg="koreksi"] b'); if (c) c.textContent = window.KoreksiJual.menunggu() + ' menunggu'; },
        setelah: function (k) { sb.from('md_aksi').insert({ fungsi: 'segarkan', param: {}, ringkas: 'Hitung ulang sesudah koreksi penjualan ' + k.no }).then(function () { }, function () { }); } });
      try { await window.KoreksiJual.muatSetuju(); } catch (e) { }
    }
    M.badge('setuju', jumlahTunggu());
    gambarBeranda(BR.janji ? false : undefined);
    var sisa = Object.keys(KUNCI).filter(function (k) { return INTI.indexOf(k) < 0; });
    var h2 = await sb.from('hasil_hitung').select('kunci,data,dibuat').in('kunci', sisa);
    if (!h2.error) (h2.data || []).forEach(function (x) { D[KUNCI[x.kunci]] = x.data; D.waktu[KUNCI[x.kunci]] = x.dibuat; });
    U.gaji = null;
    gambarDasbor(); gambarBeranda(false); gambarSetuju(); gambarGudang(); gambarPurch(); gambarProduksi(); gambarUang();
    if (J.mulai) { gambarJual(); gambarJualIsi(); }
    if (AT.mulai) gambarAtur();
    // Sesudah tampil, bagian yang bisa dihitung langsung diperbarui ke angka terbaru.
    await hitungLangsung();
    M.badge('setuju', jumlahTunggu());
    gambarDasbor(); gambarBeranda(false); gambarSetuju(); gambarGudang(); gambarPurch(); gambarProduksi(); gambarUang();
    if (J.mulai) { gambarJual(); gambarJualIsi(); }
    if (AT.mulai) gambarAtur();
  }

  // Tahap akhir (31 Okt): bagian yang rumusnya sudah ada di aplikasi dihitung langsung dari Supabase saat halaman dibuka
  // (hasilnya sudah dicocokkan sama persis dengan hitungan Apps Script). Kalau gagal, tetap memakai hitungan Apps Script terakhir.
  function bulanMundur(m) { var d = new Date(Date.now() + 8 * 3600e3); d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - m, 15)); return d.toISOString().slice(0, 7); }
  function akhirBulan(b) { return ('0' + new Date(Number(b.slice(0, 4)), Number(b.slice(5, 7)), 0).getDate()).slice(-2); }
  var LANGSUNG = {
    'md:beranda': function () { return window.Akunting.berandaData(sb); },
    'md:ringkasan': function () { return window.MdLama.mdRingkasan(sb); },
    'md:setuju': function () { return window.MdLama.mdSetujuData(sb); },
    'md:tanpa': function () { return window.MdLama.pgsTanpaData(sb); },
    'md:titip': async function () { var r = await sb.rpc('ttp_pemilik_data', { p_toko: '', p_bulan: '' }); if (r.error) throw r.error; return r.data; },
    'md:request': function () { return window.MdLama.rpDaftar(sb); },
    'md:pantau': function () { return window.MdLama.rpPantau(sb); },
    'md:mkt': function () { return window.MdLama.mpRingkasOfficial(sb, {}); },
    'md:mkt:lalu': function () { var b = bulanMundur(1); return window.MdLama.mpRingkasOfficial(sb, { dari: b + '-01', sampai: b + '-' + akhirBulan(b) }); },
    'md:botol': function () { return window.Produksi.stokBahan(sb); },
    'md:rbb': function () { return window.BahanBaku.rencanaBahan(sb, {}); },
    'md:pp:prod': function () { return window.BahanBaku.pantauProduksi(sb, { jenis: 'produksi' }, 'produksi'); },
    'md:pp:bahan': function () { return window.BahanBaku.pantauProduksi(sb, { jenis: 'bahan' }, 'bahan'); },
    'md:acc': function () { return window.Akunting.akuntingLaporan(sb, { bulan: bulanMundur(0) }); },
    'md:acc:lalu': function () { return window.Akunting.akuntingLaporan(sb, { bulan: bulanMundur(1) }); },
    'md:hrgnaik': function () { return window.MdLama.hrgNaikData(sb); },
    'md:hbb': function () { return window.MdLama.hargaBahanBakuMaster(sb); },
    'md:gudang': function () { return window.MdLama.gdPemilikData(sb); },
    'md:beli:lalu': function () { return window.MdLama.beliLalu(sb, bulanMundur(1)); },
    'md:bh': function () { return window.BagiHasilMd.hitung(sb, bulanMundur(0)); },
    'md:bh:lalu': function () { return window.BagiHasilMd.hitung(sb, bulanMundur(1)); }
  };
  async function hitungLangsung() {
    if (!window.MdLama) return;
    var kunci = Object.keys(LANGSUNG);
    var h = await Promise.all(kunci.map(function (k) {
      return Promise.race([Promise.resolve().then(LANGSUNG[k]), new Promise(function (r) { setTimeout(function () { r(null); }, 15000); })]).catch(function () { return null; });
    }));
    var kini = new Date().toISOString();
    kunci.forEach(function (k, i) { var v = h[i]; if (v && v.ok !== false) { D[KUNCI[k]] = JSON.parse(JSON.stringify(v)); D.waktu[KUNCI[k]] = kini; } });
  }

  // ======================= BERANDA (sama dengan Beranda Master Data lama) =======================
  function grafik(d) {
    var H = d.harian || []; if (!H.length) return '<div class="ksg">Belum ada data bulan ini.</div>';
    var hp = document.documentElement.classList.contains('m-m');
    var VW = hp ? 380 : 760, VH = hp ? 214 : 236, X0 = hp ? 40 : 56, W = hp ? 332 : 690, Y0 = hp ? 178 : 200, TG = hp ? 150 : 180, FS = hp ? 12 : 11, maks = 0, i;
    var hariBln = new Date(Number(d.hari.slice(0, 4)), Number(d.hari.slice(5, 7)), 0).getDate();
    for (i = 0; i < H.length; i++) maks = Math.max(maks, H[i].s, H[i].k);
    var lang = Math.pow(10, Math.floor(Math.log(Math.max(maks, 1)) / Math.LN10)), step = lang;
    if (maks / step > 5) step = lang * 2; if (maks / step > 5) step = lang * 5; if (maks / step > 5) step = lang * 10;
    var atas = Math.ceil(maks / step) * step || 1, n = Math.max(H.length, hariBln), lb = W / n;
    function y(v) { return Y0 - Math.max(0, v) / atas * TG; }
    function x(j) { return X0 + lb * (j + 0.5); }
    var s = '<svg viewBox="0 0 ' + VW + ' ' + VH + '" role="img" aria-label="Grafik saldo harian dan uang keluar bulan ini" style="width:100%;height:auto;display:block">';
    for (var g = 0; g <= atas + 1; g += step) s += '<line x1="' + X0 + '" x2="' + (X0 + W) + '" y1="' + y(g) + '" y2="' + y(g) + '" stroke="#E9EEF4"></line><text x="' + (X0 - 8) + '" y="' + (y(g) + 4) + '" text-anchor="end" font-size="' + FS + '" fill="#5A6677">' + (g >= 1e6 ? Math.round(g / 1e6) + ' jt' : fmt(g)) + '</text>';
    var bw = Math.max(3, Math.min(16, lb - (hp ? 3 : 6))), pts = [];
    for (i = 0; i < H.length; i++) {
      if (H[i].k > 0) s += '<rect x="' + (x(i) - bw / 2) + '" y="' + y(H[i].k) + '" width="' + bw + '" height="' + (Y0 - y(H[i].k)) + '" rx="3" fill="#E8833A"><title>' + esc(H[i].t) + ': keluar ' + rp(H[i].k) + '</title></rect>';
      pts.push(x(i).toFixed(1) + ',' + y(H[i].s).toFixed(1));
    }
    s += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="#1E78A8" stroke-width="' + (hp ? 2.5 : 3) + '" stroke-linejoin="round" stroke-linecap="round"></polyline>';
    for (i = 0; i < H.length; i++) if (H[i].m > 0) {
      s += '<circle cx="' + x(i) + '" cy="' + y(H[i].s) + '" r="6" fill="#fff" stroke="#1E78A8" stroke-width="3"><title>' + esc(H[i].t) + ': masuk ' + rp(H[i].m) + '</title></circle>' +
        '<text x="' + (x(i) + (i < 3 ? 10 : 0)) + '" y="' + (y(H[i].s) - 12) + '" text-anchor="' + (i < 3 ? 'start' : 'middle') + '" font-size="' + (FS + 0.5) + '" font-weight="700" fill="#0F1B2A">+' + jt(H[i].m) + '</text>';
    }
    var tandai = hp ? [0, 9, 19, 29] : [0, 4, 9, 14, 19, 24, 29];
    for (i = 0; i < tandai.length; i++) if (tandai[i] < H.length) s += '<text x="' + x(tandai[i]) + '" y="' + (Y0 + 24) + '" text-anchor="middle" font-size="' + FS + '" fill="#5A6677">' + Number(H[tandai[i]].t.slice(8)) + '</text>';
    return s + '</svg>';
  }

  function tindakan() {
    var d = D.beranda, r = D.ringkasan || {}, h = '', n = 0;
    if (d.nota && d.nota.n) { h += '<button type="button" class="ti w" data-buka="uang"><span><b>' + d.nota.n + ' nota toko offline belum ada metode bayar</b><span class="ks">' + rp(d.nota.v) + ' belum masuk saldo · Accounting › Saldo</span></span><span class="pa" aria-hidden="true">›</span></button>'; n++; }
    (d.akun || []).forEach(function (a) { if (a.v < 0) { h += '<button type="button" class="ti w" data-buka="uang"><span><b>' + esc(/^saldo /i.test(a.n) ? a.n : 'Saldo ' + a.n) + ' minus ' + rp(-a.v) + '</b><span class="ks">Periksa saldo awal atau catatan uang masuk</span></span><span class="pa" aria-hidden="true">›</span></button>'; n++; } });
    var t = jumlahTunggu();
    if (D.pantau && D.pantau.nTahan) { h += '<button type="button" class="ti w" data-buka="setuju"><span><b>' + D.pantau.nTahan + ' pengiriman tertahan</b><span class="ks">Persetujuan › Pantau pengiriman</span></span><span class="pa" aria-hidden="true">›</span></button>'; n++; }
    if (t) { h += '<button type="button" class="ti" data-buka="setuju"><span><b>Persetujuan menunggu</b><span class="ks">Request barang toko &amp; consignment, penyesuaian stok</span></span><span class="bdg">' + t + '</span><span class="pa" aria-hidden="true">›</span></button>'; n++; }
    if (r.pinjam && r.pinjam.lewat) { h += '<button type="button" class="ti w" data-buka="gudang"><span><b>' + r.pinjam.lewat + ' pinjaman barang lewat tanggal kembali</b><span class="ks">' + r.pinjam.n + ' pinjaman belum kembali · ' + fmt(r.pinjam.pcs) + ' pcs</span></span><span class="pa" aria-hidden="true">›</span></button>'; n++; }
    (r.akhir || []).forEach(function (a) { if (a.lalu !== null && a.lalu > (r.batas || 3)) { h += '<button type="button" class="ti w" data-buka="riwayat"><span><b>' + esc(a.n) + ' belum mengisi laporan ' + a.lalu + ' hari</b><span class="ks">Terakhir ' + esc(a.akhir || '–') + '</span></span><span class="pa" aria-hidden="true">›</span></button>'; n++; } });
    var tgl = Number(String(d.hari).slice(8)), akhir = new Date(Number(d.hari.slice(0, 4)), Number(d.hari.slice(5, 7)), 0).getDate();
    if (tgl >= akhir - 7) { h += '<button type="button" class="ti" data-buka="gudang"><span><b>Hitung fisik akhir bulan</b><span class="ks">' + akhir + ' ' + namaBulan(d.bulan) + ' · semua lokasi</span></span><span class="pa" aria-hidden="true">›</span></button>'; n++; }
    return n ? h : '<div class="ksg">Tidak ada yang perlu ditindak saat ini.</div>';
  }

  // ======================= BERANDA (gabungan Beranda + Dasbor; tampilan di beranda.js) =======================
  function tindakanList() {
    var d = D.beranda || {}, r = D.ringkasan || {}, L = [];
    if (d.nota && d.nota.n) L.push({ teks: d.nota.n + ' nota toko offline belum ada metode bayar', buka: 'uang', w: true });
    (d.akun || []).forEach(function (a) { if (a.v < 0) L.push({ teks: (/^saldo /i.test(a.n) ? a.n : 'Saldo ' + a.n) + ' minus ' + rp(-a.v), buka: 'uang', w: true }); });
    if (D.pantau && D.pantau.nTahan) L.push({ teks: D.pantau.nTahan + ' pengiriman tertahan', buka: 'setuju', w: true });
    var t = jumlahTunggu(); if (t) L.push({ teks: t + ' persetujuan menunggu', buka: 'setuju', w: true });
    if (r.pinjam && r.pinjam.lewat) L.push({ teks: r.pinjam.lewat + ' pinjaman barang lewat tanggal kembali', buka: 'gudang', w: true });
    (r.akhir || []).forEach(function (a) { if (a.lalu !== null && a.lalu > (r.batas || 3)) L.push({ teks: a.n + ' belum lapor ' + a.lalu + ' hari', buka: 'riwayat', w: true }); });
    if (d.hari) {
      var tgl = Number(String(d.hari).slice(8)), akhir = new Date(Number(d.hari.slice(0, 4)), Number(d.hari.slice(5, 7)), 0).getDate();
      if (tgl >= akhir - 7) L.push({ teks: 'Hitung fisik akhir bulan · ' + akhir + ' ' + namaBulan(d.bulan), buka: 'gudang', w: false });
    }
    return L;
  }
  var BR = { bulan: '', cache: {} };
  function ambilBeranda(k) {
    return Promise.all([sb.rpc('beranda_data', { p_bulan: k }), sb.rpc('beranda_kpi', { p_bulan: k }),
      D.namaTim === undefined ? sb.from('pengguna').select('nama').eq('email', D.email).maybeSingle() : null]);
  }
  async function gambarBeranda(segar) {
    var el = $('bBeranda'); if (!el || !window.BerandaBaru) return;
    var k = BR.bulan || '';
    if (segar !== false) delete BR.cache[k];
    if (!BR.cache[k]) {
      if (el.querySelector('.bx-grid')) el.style.opacity = '.55';
      var rr;
      if (BR.janji && k === '') { rr = await BR.janji; BR.janji = null; } else rr = await ambilBeranda(k);
      if (BR.cache[k]) { el.style.opacity = ''; } else {
      var r = rr[0];
      if (rr[2]) D.namaTim = (rr[2].data && rr[2].data.nama) || '';
      el.style.opacity = '';
      if (r.error) { el.innerHTML = '<div class="msg bad">Beranda gagal dimuat: ' + esc(r.error.message) + '</div>'; return; }
      BR.cache[k] = r.data; BR.kpi = BR.kpi || {}; BR.kpi[k] = rr[1].error ? null : rr[1].data;
      }
    }
    var ekor = D.dasborHtml ? '<details class="cd" style="margin-top:16px"><summary style="cursor:pointer;font-weight:800;font-size:16.5px">Ringkasan operasional <span class="sb" style="font-weight:500">· laporan staf, toko &amp; consignment, catatan stok</span></summary><div style="margin-top:12px">' + D.dasborHtml + '</div></details>' : '';
    BerandaBaru.gambar(el, BR.cache[k], D.beranda || {}, tindakanList(), {
      gantiBulan: function (m) { BR.bulan = m; gambarBeranda(false); },
      buka: function (b) { M.buka(b); },
      ekor: ekor, kpi: (BR.kpi || {})[k], pengguna: { nama: D.namaTim || D.nama, email: D.email },
      menuAkun: [{ nm: 'Muat ulang data', klik: function () { muat(); } }, { nm: 'Hitung ulang sekarang', klik: function () { var b = document.querySelector('#mAksi .pri'); if (b) b.click(); } },
        { nm: 'Upload penjualan harian', k: 'upload' }, { nm: 'Upload dana cair', href: 'form.html?f=mdlama&buka=g:toko,%23bhBtn,~dcKartu' }, { nm: 'Laporan bulanan', k: 'laporan' },
        { nm: 'Keluar / ganti akun', klik: function () { sb.auth.signOut({ scope: 'local' }).then(function () { location.href = 'index.html'; }); } }],
      aksi: [{ nm: 'Upload penjualan harian', k: 'upload' }, { nm: 'Upload dana cair', href: 'form.html?f=mdlama&buka=g:toko,%23bhBtn,~dcKartu' }]
    });
  }
  function isiAlur() {
    var d = D.beranda; if (!d) return '<div class="msg w">Data alur kas belum tersedia.</div>';
    var h = '';
    var akhir = d.harian && d.harian.length ? d.harian[d.harian.length - 1].s : d.total0;
    h += '<div class="cd"><div class="kpl"><h3>Alur kas ' + namaBulan(d.bulan) + '</h3><span class="sb">Saldo gabungan semua akun per hari · diperbarui ' + esc(d.diperbarui) + '</span></div>' +
      '<div class="ak"><div class="gr">' + grafik(d) +
      '<div class="lg2"><span><i style="width:16px;height:3px;border-radius:2px;background:#1E78A8;display:inline-block"></i>Saldo kas &amp; bank</span><span><i style="width:10px;height:10px;border-radius:2px;background:#E8833A;display:inline-block"></i>Uang keluar harian</span><span><i style="width:10px;height:10px;border-radius:99px;border:2.5px solid #1E78A8;display:inline-block;box-sizing:border-box"></i>Modal / uang masuk lain</span></div></div>' +
      '<div class="rk"><div><span style="color:#5A6677">Saldo awal bulan</span><b>' + jt(d.total0) + '</b></div>' +
      '<div><span style="color:#5A6677">+ Penjualan</span><b style="color:#146C43">' + jt(d.masukJual) + '</b></div>' +
      '<div><span style="color:#5A6677">+ Modal &amp; masuk lain</span><b style="color:#146C43">' + jt(d.masukLain) + '</b></div>' +
      '<div><span style="color:#5A6677">− Uang keluar</span><b style="color:#B42318">' + jt(d.keluar) + '</b></div><div class="gs"></div>' +
      '<div style="font-size:15px"><b>Saldo sekarang</b><b>' + jt(akhir) + '</b></div>' +
      '<span style="font-size:12px;color:#5A6677;line-height:1.45">Penjualan consignment dicatat akhir bulan setelah bagi hasil.</span></div></div></div>';
    h += '<div class="cd"><div class="kpl"><h3>Uang keluar per kategori</h3><span class="sb">' + rp(d.keluar) + '</span></div>';
    var kat = d.kategori || [];
    if (!kat.length) h += '<div class="ksg">Belum ada uang keluar bulan ini.</div>';
    var mx = kat.length ? kat[0].v : 1, lain = 0, nl = 0;
    kat.forEach(function (c, i) {
      if (i >= 6) { lain += c.v; nl++; return; }
      h += '<div class="br"><div class="tx"><span>' + esc(c.n) + '</span><b>' + jt(c.v) + '</b></div><div class="tr"><div class="is" style="width:' + Math.max(2, Math.round(c.v / mx * 100)) + '%"></div></div></div>';
    });
    if (nl) h += '<span class="sb">+ ' + nl + ' kategori lain ' + jt(lain) + '</span>';
    h += '</div>';
    return h;
  }
  var tundaGrafik; window.addEventListener('resize', function () { clearTimeout(tundaGrafik); tundaGrafik = setTimeout(function () { if (D.beranda && U.bagian === 'alur' && $('bUang') && $('bUang').offsetParent) gambarUang(); }, 200); });

  // ======================= DASBOR (ringkasan bulan berjalan) =======================
  function gambarDasbor() {
    var R = D.ringkasan, el = $('bDasbor');
    if (!R) { el.innerHTML = '<div class="msg w">Ringkasan belum tersedia.</div>'; return; }
    var h = '<p class="tl">Bulan ' + esc(namaBulan(R.bulan)) + ' sampai hari ini · diperbarui ' + esc(R.diperbarui) + '</p>';
    if (R.uang) h += '<div class="kp"><div class="kt"><span class="l">Uang masuk</span><span class="v angka">' + jt(R.uang.masuk) + '</span><span class="k">' + rp(R.uang.masuk) + '</span></div>' +
      '<div class="kt"><span class="l">Uang keluar</span><span class="v angka">' + jt(R.uang.keluar) + '</span><span class="k">' + rp(R.uang.keluar) + '</span></div>' +
      '<div class="kt"><span class="l">Laba bersih (accounting)</span><span class="v angka' + (R.uang.bersih < 0 ? ' mn' : '') + '">' + jt(R.uang.bersih) + '</span><span class="k">' + rp(R.uang.bersih) + '</span></div>' +
      '<div class="kt"><span class="l">Pembelian reseller</span><span class="v angka">' + jt(R.reseller) + '</span><span class="k">' + rp(R.reseller) + '</span></div></div>';
    var tk = R.toko || [], tot = { q: 0, omzet: 0, retur: 0, bersih: 0, biaya: 0 };
    tk.forEach(function (x) { Object.keys(tot).forEach(function (k) { tot[k] += Number(x[k]) || 0; }); });
    h += '<div class="dua"><div class="cd"><div class="kpl"><h3>Toko &amp; consignment</h3><span class="sb">Penjualan bersih ' + rp(tot.bersih) + '</span></div><table class="tabel"><tbody>' +
      tk.map(function (x) {
        return '<tr><td><b>' + esc(x.n) + '</b><small>' + fmt(x.q) + ' pcs terjual' + (x.retur ? ' · retur ' + rp(x.retur) : '') + (x.biaya ? ' · biaya ' + rp(x.biaya) : '') + '</small>' + (x.laris ? '<small>Terlaris: ' + esc(x.laris) + '</small>' : '') + '</td><td class="r angka"><b>' + rp(x.bersih) + '</b>' + (x.retur ? '<small>omzet ' + rp(x.omzet) + '</small>' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    var ak = R.akhir || [];
    h += '<div class="cd"><h3>Terakhir mengisi laporan</h3><table class="tabel"><tbody>' + ak.map(function (a) {
      var lama = a.lalu !== null && a.lalu > (R.batas || 3);
      var kapan = a.lalu === 0 ? 'Hari ini' : a.lalu === 1 ? 'Kemarin' : a.lalu === null ? '–' : a.lalu + ' hari lalu';
      return '<tr><td><b>' + esc(a.n) + '</b>' + (a.teks ? '<small>' + esc(a.teks) + '</small>' : '') + '</td><td class="r"><span class="label ' + (lama ? 'no' : 'ok') + '">' + kapan + '</span><small>' + esc(a.akhir || '') + ' · ' + fmt(a.lap) + ' laporan</small></td></tr>';
    }).join('') + '</tbody></table></div></div>';
    var info = [];
    if (R.pinjam && R.pinjam.n) info.push(R.pinjam.n + ' pinjaman barang toko belum kembali (' + fmt(R.pinjam.pcs) + ' pcs' + (R.pinjam.lewat ? ', ' + R.pinjam.lewat + ' lewat tanggal' : '') + ')');
    if (R.bahan && R.bahan.minus) info.push(R.bahan.minus + ' bahan baku stoknya minus');
    if (R.bahan && R.bahan.beli && R.bahan.beli.length) info.push(R.bahan.beli.length + ' bahan baku perlu dibeli: ' + R.bahan.beli.slice(0, 4).map(function (b) { return b.n; }).join(', '));
    if (R.harga && R.harga.naik) info.push(R.harga.naik + ' harga bahan & kemasan naik');
    if (info.length) h += '<div class="cd"><h3>Catatan stok &amp; bahan</h3>' + info.map(function (t) { return '<div class="ti w" style="cursor:default"><span><b>' + esc(t) + '</b></span></div>'; }).join('') + '</div>';
    el.innerHTML = h; D.dasborHtml = h;
  }


  // ======================= PENJUALAN =======================
  // Dihitung langsung dari tabel yang disinkron (rumus sama dengan laporanToko_ / omzetKotor / TP_kelompok_ lama).
  var J = { mulai: false, bagian: 'toko', toko: null, data: null };
  function hariIniMks() { try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date()); } catch (e) { return new Date().toISOString().slice(0, 10); } }
  async function ambilSemua(buat) {
    var out = [], dari = 0;
    for (;;) {
      var r = await buat().range(dari, dari + 999);
      if (r.error) throw r.error;
      out = out.concat(r.data || []);
      if (!r.data || r.data.length < 1000) break;
      dari += 1000;
    }
    return out;
  }
  function tr(v) { return String(v == null ? '' : v).trim(); }
  function siapJual() {
    var hi = hariIniMks();
    J.dari = hi.slice(0, 8) + '01'; J.sampai = hi;
    gambarJual(); muatJual();
  }
  async function muatJual() {
    var el = $('jIsi'); if (el) el.innerHTML = '<div class="ksg">Menghitung…</div>';
    try {
      var d = J.dari, s = J.sampai;
      var h = await Promise.all([
        ambilSemua(function () { return sb.from('pelanggan').select('nama_pelanggan,tipe,baris_sheet').order('baris_sheet'); }),
        ambilSemua(function () { return sb.from('toko_jual_log').select('tanggal,toko,kode,nama_barang,qty_terjual,total,warna').gte('tanggal', d).lte('tanggal', s).order('id'); }),
        ambilSemua(function () { return sb.from('toko_biaya_log').select('tanggal,toko,keterangan,nominal').gte('tanggal', d).lte('tanggal', s).order('id'); }),
        ambilSemua(function () { return sb.from('toko_retur_log').select('tanggal,toko,kode,nama_barang,qty,nilai,warna,kondisi,catatan').gte('tanggal', d).lte('tanggal', s).order('id'); }),
        ambilSemua(function () { return sb.from('order_log').select('no_order,tanggal,pelanggan,tipe,kode,nama,qty,harga,diskon_persen,subtotal,nilai_diskon,total,status,waktu_masuk,pengisi,catatan').order('id'); }),
        ambilSemua(function () { return sb.from('toko_pinjam_log').select('no_pinjam,jenis,tanggal,toko,kode,nama_barang,warna,qty,peminjam,rencana_kembali,catatan,pengisi').order('id'); })
      ]);
      J.data = { pel: h[0], jual: h[1], biaya: h[2], retur: h[3], order: h[4], pinjam: h[5] };
      hitungJual();
      gambarJual();
    } catch (e) { if ($('jIsi')) $('jIsi').innerHTML = '<div class="msg bad">Data penjualan gagal dimuat: ' + esc(e.message || e) + '</div>'; return; }
    gambarJualIsi();
  }
  function laporanToko(toko) {
    var D2 = J.data, out = { jual: [], biaya: [], omzet: 0, qty: 0, totalBiaya: 0, retur: [], returLayak: { q: 0, nilai: 0 }, rugi: { q: 0, nilai: 0 } }, idx = {};
    D2.jual.forEach(function (r) {
      if (tr(r.toko) !== toko || !r.tanggal) return;
      var kode = tr(r.kode).toUpperCase(), q = Number(r.qty_terjual) || 0, tot = Number(r.total) || 0, w = tr(r.warna).toUpperCase(), k = kode + '|' + w;
      if (!(k in idx)) { idx[k] = out.jual.length; out.jual.push({ k: kode, n: String(r.nama_barang || ''), w: w, q: 0, tot: 0 }); }
      out.jual[idx[k]].q += q; out.jual[idx[k]].tot += tot; out.qty += q; out.omzet += tot;
    });
    out.jual.sort(function (a, b) { return b.q - a.q; });
    D2.biaya.forEach(function (r) { if (tr(r.toko) !== toko || !r.tanggal) return; var n = Number(r.nominal) || 0; out.biaya.push({ t: r.tanggal, ket: String(r.keterangan || ''), nom: n }); out.totalBiaya += n; });
    out.biaya.sort(function (a, b) { return a.t < b.t ? 1 : a.t > b.t ? -1 : 0; });
    D2.retur.forEach(function (r) {
      if (tr(r.toko) !== toko || !r.tanggal) return;
      var q = Number(r.qty) || 0, nilai = Number(r.nilai) || 0, kd = tr(r.kondisi);
      out.retur.push({ t: r.tanggal, k: tr(r.kode).toUpperCase(), n: String(r.nama_barang || ''), w: tr(r.warna).toUpperCase(), q: q, kd: kd, nilai: nilai, c: String(r.catatan || '') });
      if (kd === 'Layak jual') { out.returLayak.q += q; out.returLayak.nilai += nilai; } else { out.rugi.q += q; out.rugi.nilai += nilai; }
    });
    out.retur.sort(function (a, b) { return a.t < b.t ? 1 : a.t > b.t ? -1 : 0; });
    out.totalRetur = out.returLayak.nilai + out.rugi.nilai; out.omzetBersih = out.omzet - out.totalRetur;
    return out;
  }
  function kumpulOrder(dari, sampai) {
    var map = {}, urut = [];
    J.data.order.forEach(function (r) {
      var no = tr(r.no_order); if (!no || !r.tanggal) return;
      if (dari && (r.tanggal < dari || r.tanggal > sampai)) return;
      if (!map[no]) { map[no] = { no: no, t: r.tanggal, pl: String(r.pelanggan || ''), tp: String(r.tipe || ''), d: Number(r.diskon_persen) || 0, sub: 0, disk: 0, tot: 0, st: String(r.status || '') || 'Menunggu', p: String(r.pengisi || '').replace(/^form:?\s*/, ''), c: String(r.catatan || ''), ms: r.waktu_masuk ? new Date(r.waktu_masuk).getTime() : 0, items: [] }; urut.push(map[no]); }
      var o = map[no]; o.sub += Number(r.subtotal) || 0; o.disk += Number(r.nilai_diskon) || 0; o.tot += Number(r.total) || 0;
      o.items.push({ k: String(r.kode || ''), n: String(r.nama || ''), q: Number(r.qty) || 0, h: Number(r.harga) || 0, s: Number(r.subtotal) || 0 });
    });
    urut.sort(function (a, b) { return a.t < b.t ? 1 : a.t > b.t ? -1 : b.ms - a.ms; });
    return urut;
  }
  function hitungJual() {
    var D2 = J.data;
    J.tokoList = D2.pel.filter(function (x) { return tr(x.tipe) === 'Consignment'; }).map(function (x) { return tr(x.nama_pelanggan); });
    J.lap = {}; J.tokoList.forEach(function (t) { J.lap[t] = laporanToko(t); });
    if (!J.toko || J.tokoList.indexOf(J.toko) === -1) J.toko = J.tokoList[0];
    var res = [], idx = {}, totR = 0, trx = [];
    kumpulOrder(J.dari, J.sampai).forEach(function (o) {
      if (o.tp !== 'Reseller' || o.st === 'Batal') return;
      if (!(o.pl in idx)) { idx[o.pl] = res.length; res.push({ n: o.pl, jml: 0, sub: 0, disk: 0, tot: 0 }); }
      var r = res[idx[o.pl]]; r.jml++; r.sub += o.sub; r.disk += o.disk; r.tot += o.tot; totR += o.tot; trx.push(o);
    });
    res.sort(function (a, b) { return b.tot - a.tot; });
    J.res = res; J.totR = totR;
    // Pinjaman (TP_kelompok_)
    var pi = {}, pl = [];
    D2.pinjam.forEach(function (r) {
      var no = tr(r.no_pinjam), jenis = tr(r.jenis).toUpperCase(), q = Number(r.qty);
      if (!no || (jenis !== 'PINJAM' && jenis !== 'KEMBALI') || !(q > 0)) return;
      if (!(no in pi)) { pi[no] = pl.length; pl.push({ no: no, toko: tr(r.toko), tgl: '', peminjam: '', rencana: '', catatan: '', kembali: '', items: [], sisa: 0, _i: {} }); }
      var p = pl[pi[no]], w = tr(r.warna).replace(/\s+/g, ' ').toUpperCase(), kk = tr(r.kode).toUpperCase() + '|' + w;
      if (!(kk in p._i)) { p._i[kk] = p.items.length; p.items.push({ k: tr(r.kode).toUpperCase(), n: String(r.nama_barang || ''), w: w, q: 0, kb: 0, sisa: 0 }); }
      var it = p.items[p._i[kk]];
      if (jenis === 'PINJAM') { it.q += q; p.tgl = p.tgl || r.tanggal || ''; p.peminjam = p.peminjam || r.peminjam || ''; p.rencana = p.rencana || r.rencana_kembali || ''; p.catatan = p.catatan || r.catatan || ''; }
      else { it.kb += q; if ((r.tanggal || '') > p.kembali) p.kembali = r.tanggal || ''; }
    });
    pl.forEach(function (p) { delete p._i; p.items.forEach(function (it) { it.sisa = Math.max(0, it.q - it.kb); p.sisa += it.sisa; }); });
    J.pinjamLuar = pl.filter(function (p) { return p.sisa > 0; }).sort(function (a, b) { var ra = a.rencana || '9999', rb = b.rencana || '9999'; return ra < rb ? -1 : ra > rb ? 1 : (a.no < b.no ? -1 : 1); });
    J.orderRes = kumpulOrder('', '').filter(function (o) { return o.tp === 'Reseller'; });
  }

  function gambarJual() {
    var nPinjam = J.pinjamLuar ? J.pinjamLuar.length : 0;
    var nOrder = J.orderRes ? J.orderRes.filter(function (o) { return ['Menunggu', 'Disetujui', 'Dikirim'].indexOf(o.st) > -1; }).length : 0;
    $('bJual').innerHTML = '<div id="msgJual"></div>' +
      '<div class="chip" role="group" aria-label="Bagian penjualan">' +
      [['toko', 'Toko & consignment', ''], ['omzet', 'Omzet semua', ''], ['order', 'Order reseller', nOrder ? nOrder + ' berjalan' : ''], ['pinjam', 'Pinjaman barang', nPinjam ? nPinjam + ' belum kembali' : ''],
        ['titip', 'Titipan staf', nAjuanTitip() ? nAjuanTitip() + ' ajuan' : ''], ['mkt', 'Marketplace', ''], ['cocok', 'Cocokkan upload consignment', ''], ['bh', 'Bagi hasil consignment', '']].map(function (b) {
        return '<button type="button" data-jb="' + b[0] + '" aria-pressed="' + (J.bagian === b[0]) + '"><span>' + b[1] + '</span><b>' + (b[2] || '&nbsp;') + '</b></button>';
      }).join('') + '</div>' +
      '<div class="periode" id="jPeriode"' + (J.bagian === 'toko' || J.bagian === 'omzet' || J.bagian === 'order' ? '' : ' hidden') + '><label>Dari<input class="isian" type="date" id="jDari" value="' + J.dari + '"></label><label>Sampai<input class="isian" type="date" id="jSampai" value="' + J.sampai + '"></label>' +
      '<button type="button" class="tbl" data-cepat="bulan">Bulan ini</button><button type="button" class="tbl" data-cepat="lalu">Bulan lalu</button><button type="button" class="tbl pri" id="jTampil">Tampilkan</button></div>' +
      '<div id="jIsi"></div>';
    $('bJual').querySelectorAll('[data-jb]').forEach(function (b) { b.onclick = function () { J.bagian = b.getAttribute('data-jb'); gambarJual(); gambarJualIsi(); }; });
    var on = $('bJual').querySelector('[data-jb][aria-pressed="true"]');
    if (on && on.parentNode.scrollWidth > on.parentNode.clientWidth) on.parentNode.scrollLeft = Math.max(0, on.offsetLeft - on.parentNode.offsetLeft - 16);
    $('jTampil').onclick = function () { J.dari = $('jDari').value; J.sampai = $('jSampai').value; if (J.dari > J.sampai) { var t = J.dari; J.dari = J.sampai; J.sampai = t; } muatJual(); };
    $('bJual').querySelectorAll('[data-cepat]').forEach(function (b) {
      b.onclick = function () {
        var hi = hariIniMks(), y = +hi.slice(0, 4), m = +hi.slice(5, 7);
        if (b.getAttribute('data-cepat') === 'bulan') { J.dari = hi.slice(0, 8) + '01'; J.sampai = hi; }
        else { if (--m === 0) { m = 12; y--; } var mm = ('0' + m).slice(-2); J.dari = y + '-' + mm + '-01'; J.sampai = y + '-' + mm + '-' + ('0' + new Date(y, m, 0).getDate()).slice(-2); }
        $('jDari').value = J.dari; $('jSampai').value = J.sampai; muatJual();
      };
    });
  }

  function gambarJualIsi() {
    var el = $('jIsi'); if (!el) return;
    if (J.bagian === 'cocok') { if (window.CocokConsignment) CocokConsignment.gambar(el, sb); return; }
    if (J.bagian === 'titip' || J.bagian === 'mkt' || J.bagian === 'bh') { gambarPotretJual(el); return; }
    if (!J.data) return;
    if (J.bagian === 'toko') el.innerHTML = isiToko();
    else if (J.bagian === 'omzet') el.innerHTML = isiOmzet();
    else if (J.bagian === 'order') el.innerHTML = isiOrder();
    else el.innerHTML = isiPinjam();
    el.querySelectorAll('[data-tk]').forEach(function (b) { b.onclick = function () { J.toko = b.getAttribute('data-tk'); gambarJualIsi(); }; });
    el.querySelectorAll('[data-ord]').forEach(function (b) { b.onclick = function () { ubahStatus(b.getAttribute('data-ord'), b); }; });
  }
  function rentang() { return esc(J.dari.split('-').reverse().join('/')) + ' – ' + esc(J.sampai.split('-').reverse().join('/')); }

  function isiToko() {
    var h = '<div class="kp">';
    J.tokoList.forEach(function (t) {
      var l = J.lap[t];
      h += '<button type="button" class="kt tk' + (t === J.toko ? ' on' : '') + '" data-tk="' + esc(t) + '"><span class="l">' + esc(t) + '</span><span class="v angka">' + jt(l.omzetBersih) + '</span><span class="k">' + fmt(l.qty) + ' pcs' + (l.totalRetur ? ' · retur ' + jt(l.totalRetur) : '') + (l.totalBiaya ? ' · biaya ' + jt(l.totalBiaya) : '') + '</span></button>';
    });
    h += '</div>';
    var L = J.lap[J.toko]; if (!L) return h + '<div class="ksg">Belum ada toko consignment.</div>';
    h += '<div class="cd"><div class="kpl"><h3>' + esc(J.toko) + '</h3><span class="sb">' + rentang() + '</span></div>' +
      '<div class="kp" style="margin:0"><div class="kt"><span class="l">Penjualan</span><span class="v angka">' + jt(L.omzet) + '</span><span class="k">' + rp(L.omzet) + ' · ' + fmt(L.qty) + ' pcs</span></div>' +
      '<div class="kt"><span class="l">Retur</span><span class="v angka">' + jt(L.totalRetur) + '</span><span class="k">Layak jual ' + fmt(L.returLayak.q) + ' pcs · rusak/hilang ' + fmt(L.rugi.q) + ' pcs</span></div>' +
      '<div class="kt"><span class="l">Penjualan bersih</span><span class="v angka">' + jt(L.omzetBersih) + '</span><span class="k">' + rp(L.omzetBersih) + '</span></div>' +
      '<div class="kt"><span class="l">Biaya operasional</span><span class="v angka">' + jt(L.totalBiaya) + '</span><span class="k">' + L.biaya.length + ' catatan</span></div></div></div>';
    h += '<div class="dua"><div class="cd"><div class="kpl"><h3>Barang terjual</h3><span class="sb">' + L.jual.length + ' jenis</span></div>' +
      (L.jual.length ? '<div class="gulir"><table class="tabel"><thead><tr><th>Barang</th><th class="r">Pcs</th><th class="r">Penjualan</th></tr></thead><tbody>' + L.jual.map(function (x) {
        return '<tr><td>' + esc(x.n) + (x.w ? ' – ' + esc(x.w) : '') + '<small>' + esc(x.k) + '</small></td><td class="r angka">' + fmt(x.q) + '</td><td class="r angka">' + rp(x.tot) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="ksg">Belum ada penjualan pada periode ini.</div>') + '</div>';
    h += '<div><div class="cd"><div class="kpl"><h3>Biaya operasional</h3><span class="sb angka">' + rp(L.totalBiaya) + '</span></div>' +
      (L.biaya.length ? '<table class="tabel"><tbody>' + L.biaya.map(function (x) { return '<tr><td>' + esc(x.ket) + '<small>' + esc(x.t) + '</small></td><td class="r angka">' + rp(x.nom) + '</td></tr>'; }).join('') + '</tbody></table>' : '<div class="ksg">Tidak ada biaya.</div>') + '</div>';
    h += '<div class="cd"><div class="kpl"><h3>Barang retur</h3><span class="sb angka">' + rp(L.totalRetur) + '</span></div>' +
      (L.retur.length ? '<table class="tabel"><tbody>' + L.retur.map(function (x) { return '<tr><td>' + esc(x.n) + (x.w ? ' – ' + esc(x.w) : '') + '<small>' + esc(x.t) + ' · ' + fmt(x.q) + ' pcs' + (x.c ? ' · ' + esc(x.c) : '') + '</small></td><td class="r"><span class="label ' + (x.kd === 'Layak jual' ? 'ok' : 'no') + '">' + esc(x.kd) + '</span><small>' + rp(x.nilai) + '</small></td></tr>'; }).join('') + '</tbody></table>' : '<div class="ksg">Tidak ada retur.</div>') + '</div></div></div>';
    return h;
  }

  function isiOmzet() {
    var totC = 0, pcsC = 0;
    J.tokoList.forEach(function (t) { totC += J.lap[t].omzet; pcsC += J.lap[t].qty; });
    var h = '<div class="kp"><div class="kt"><span class="l">Total penjualan</span><span class="v angka">' + jt(totC + J.totR) + '</span><span class="k">' + rentang() + '</span></div>' +
      '<div class="kt"><span class="l">Toko &amp; consignment</span><span class="v angka">' + jt(totC) + '</span><span class="k">' + fmt(pcsC) + ' pcs</span></div>' +
      '<div class="kt"><span class="l">Reseller</span><span class="v angka">' + jt(J.totR) + '</span><span class="k">' + J.res.reduce(function (a, r) { return a + r.jml; }, 0) + ' order</span></div></div>';
    h += '<div class="dua"><div class="cd"><h3>Per toko</h3><table class="tabel"><tbody>' + J.tokoList.map(function (t) { var l = J.lap[t];
      return '<tr><td><b>' + esc(t) + '</b><small>' + fmt(l.qty) + ' pcs' + (l.totalRetur ? ' · retur ' + rp(l.totalRetur) : '') + '</small></td><td class="r angka">' + rp(l.omzet) + '</td></tr>'; }).join('') + '</tbody></table></div>';
    h += '<div class="cd"><h3>Per reseller</h3>' + (J.res.length ? '<table class="tabel"><tbody>' + J.res.map(function (r) {
      return '<tr><td><b>' + esc(r.n) + '</b><small>' + r.jml + ' order' + (r.disk ? ' · diskon ' + rp(r.disk) : '') + '</small></td><td class="r angka">' + rp(r.tot) + '</td></tr>'; }).join('') + '</tbody></table>' : '<div class="ksg">Belum ada order reseller pada periode ini.</div>') + '</div></div>';
    return h + '<p class="sb">Omzet toko = penjualan sebelum dikurangi retur (sama dengan menu Omzet lama). Order reseller yang Batal tidak dihitung.</p>';
  }

  var STATUS = ['Menunggu', 'Disetujui', 'Dikirim', 'Selesai', 'Batal'];
  function statusAntre() {
    var o = {};
    D.aksi.forEach(function (a) { if (a.fungsi !== 'ubahStatusOrder') return; if (!(a.param.no in o)) o[a.param.no] = a; });
    return o;
  }
  function isiOrder() {
    var antre = statusAntre(), dalamPeriode = {}, h = '';
    kumpulOrder(J.dari, J.sampai).forEach(function (o) { dalamPeriode[o.no] = 1; });
    var berjalan = J.orderRes.filter(function (o) { return ['Menunggu', 'Disetujui', 'Dikirim'].indexOf(o.st) > -1; });
    var lain = J.orderRes.filter(function (o) { return dalamPeriode[o.no] && berjalan.indexOf(o) === -1; });
    function kartu(o) {
      var a = antre[o.no], st = o.st, catatanA = '';
      if (a && a.status === 'menunggu') catatanA = '<div class="msg tunggu" style="margin:0">Sedang diterapkan: ' + esc(a.ringkas) + '</div>';
      else if (a && a.status === 'selesai' && a.hasil && a.hasil.status && new Date(a.dibuat).getTime() > o.ms) { st = a.hasil.status; catatanA = '<div class="sb">Status diubah dari aplikasi baru (' + new Date(a.diproses || a.dibuat).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) + ').</div>'; }
      else if (a && a.status === 'gagal') catatanA = '<div class="msg bad" style="margin:0">Gagal: ' + esc((a.hasil && a.hasil.pesan) || '') + '</div>';
      var warna = { Menunggu: 'w', Disetujui: 'biru', Dikirim: 'biru', Selesai: 'ok', Batal: 'no' }[st] || 'abu';
      return '<div class="cd"><div class="rq-kpl"><h3>' + esc(o.pl) + '</h3><span class="sb">' + esc(o.no) + ' · ' + esc(o.t) + (o.p ? ' · ' + esc(o.p) : '') + '</span></div>' +
        '<div class="rq-mt"><span class="label ' + warna + '">' + esc(st) + '</span><span class="label abu">' + fmt(o.items.reduce(function (s, x) { return s + x.q; }, 0)) + ' pcs</span><span class="label biru">' + rp(o.tot) + '</span>' + (o.d ? '<span class="label abu">diskon ' + fmt(o.d) + '%</span>' : '') + '</div>' +
        (o.c ? '<div class="sb">Catatan: ' + esc(o.c) + '</div>' : '') +
        '<details><summary class="sb" style="cursor:pointer">Rincian ' + o.items.length + ' barang</summary><table class="tabel"><tbody>' + o.items.map(function (x) {
          return '<tr><td>' + esc(x.n) + '<small>' + esc(x.k) + '</small></td><td class="r angka">' + fmt(x.q) + ' × ' + rp(x.h) + '<small>' + rp(x.s) + '</small></td></tr>'; }).join('') + '</tbody></table></details>' +
        (a && a.status === 'menunggu' ? catatanA : catatanA + '<div class="aksi-baris"><select class="st-order" data-st="' + esc(o.no) + '">' + STATUS.map(function (x) { return '<option' + (x === st ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select><button type="button" class="tbl pri" data-ord="' + esc(o.no) + '">Simpan status</button></div>') +
        '</div>';
    }
    h += '<div class="cd" style="background:#F7F9FB"><div class="kpl"><h3>Perlu ditindak</h3><span class="sb">' + berjalan.length + ' order Menunggu / Disetujui / Dikirim</span></div></div>';
    h += berjalan.length ? berjalan.map(kartu).join('') : '<div class="cd"><div class="aman">Tidak ada order reseller yang berjalan.</div></div>';
    h += '<div class="cd" style="background:#F7F9FB"><div class="kpl"><h3>Selesai / batal</h3><span class="sb">' + rentang() + '</span></div></div>';
    h += lain.length ? lain.map(kartu).join('') : '<div class="cd"><div class="ksg">Tidak ada order lain pada periode ini.</div></div>';
    return h + '<p class="sb">Cetak invoice dan ceklis packing masih lewat menu Order di Master Data lama.</p>';
  }
  async function ubahStatus(no, b) {
    var sel = $('jIsi').querySelector('[data-st="' + no + '"]'); if (!sel) return;
    var o = J.orderRes.filter(function (x) { return x.no === no; })[0], st = sel.value;
    if (o && st === o.st) { $('msgJual').innerHTML = '<div class="msg w">Status ' + esc(no) + ' sudah ' + esc(st) + '.</div>'; return; }
    b.disabled = true;
    // Langsung tersimpan di Supabase (order_status = ubahStatusOrder); Telegram request consignment dikirim Apps Script.
    var r = await sb.rpc('order_status', { p_no: no, p_status: st, p_rp: '', p_alasan: '' });
    var gagal = r.error ? r.error.message : (!r.data || !r.data.ok) ? ((r.data && r.data.pesan) || 'Gagal menyimpan.') : '';
    if (gagal) { $('msgJual').innerHTML = '<div class="msg bad">Gagal: ' + esc(gagal) + '</div>'; b.disabled = false; return; }
    salinKeSheetGaji();
    await sb.from('md_aksi').insert({ fungsi: 'segarkan', param: {}, ringkas: 'Hitung ulang sesudah status order ' + no + ' menjadi ' + st });
    if (o) o.st = st;
    await muatAksi(); gambarJualIsi();
    $('msgJual').innerHTML = '<div class="msg ok">' + esc(r.data.pesan) + ' Daftar di halaman ini diperbarui paling lambat 10 menit lagi.</div>';
  }

  function isiPinjam() {
    var hi = hariIniMks(), L = J.pinjamLuar || [];
    if (!L.length) return '<div class="cd"><div class="aman">Tidak ada barang toko yang sedang dipinjam.</div></div>';
    return L.map(function (p) {
      var lewat = p.rencana && p.rencana < hi;
      return '<div class="cd"><div class="rq-kpl"><h3>' + esc(p.peminjam || '–') + '</h3><span class="sb">' + esc(p.no) + ' · ' + esc(p.toko) + ' · dipinjam ' + esc(p.tgl) + '</span></div>' +
        '<div class="rq-mt"><span class="label ' + (lewat ? 'no' : 'abu') + '">' + (p.rencana ? (lewat ? 'Lewat rencana kembali ' : 'Rencana kembali ') + esc(p.rencana) : 'Tanpa rencana kembali') + '</span><span class="label biru">' + fmt(p.sisa) + ' pcs belum kembali</span></div>' +
        (p.catatan ? '<div class="sb">Catatan: ' + esc(p.catatan) + '</div>' : '') +
        '<table class="tabel"><tbody>' + p.items.map(function (it) { return '<tr><td>' + esc(it.n) + (it.w ? ' – ' + esc(it.w) : '') + '</td><td class="r angka">' + fmt(it.sisa) + ' / ' + fmt(it.q) + '</td></tr>'; }).join('') + '</tbody></table></div>';
    }).join('') + '<p class="sb">Pengembalian dicatat staf toko di formulirnya. Angka sisa = dipinjam − sudah kembali.</p>';
  }

  // ---------- Potret dari fungsi lama: titipan staf, marketplace, bagi hasil ----------
  J.mktB = 'ini'; J.bhB = null; J.bhToko = null; J.ubahTtp = null;
  function nAjuanTitip() { var t = D.titip; return t ? (t.ajuanBrg || []).length + (t.ajuanStok || []).length : 0; }
  function waktuPotret(k) { var w = D.waktu[k]; return w ? new Date(w).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '–'; }
  function pilihBulan(nama, nilai, labelLalu) {
    return '<div class="pilih2" role="group" aria-label="Pilih bulan">' + [['ini', 'Bulan ini'], ['lalu', labelLalu || 'Bulan lalu']].map(function (b) {
      return '<button type="button" class="tbl" data-' + nama + '="' + b[0] + '" aria-pressed="' + (nilai === b[0]) + '">' + b[1] + '</button>'; }).join('') + '</div>';
  }
  function antreTtp() {
    var o = {};
    D.aksi.forEach(function (a) {
      if (a.fungsi !== 'ttpPutus' && a.fungsi !== 'ttpBarangUbah') return;
      var id = a.fungsi === 'ttpPutus' ? a.param.id : a.param.kode;
      if (!(id in o)) o[id] = a;
    });
    return o;
  }
  function catatanAntre(a, waktuPotretMs) {
    if (!a) return '';
    if (a.status === 'menunggu') return '<div class="msg tunggu" style="margin:6px 0 0">Sedang diterapkan: ' + esc(a.ringkas) + '</div>';
    if (new Date(a.dibuat).getTime() < waktuPotretMs - 60000) return '';
    if (a.status === 'gagal') return '<div class="msg bad" style="margin:6px 0 0">Gagal: ' + esc((a.hasil && a.hasil.pesan) || a.ringkas) + '</div>';
    return '<div class="msg ok" style="margin:6px 0 0">' + esc((a.hasil && a.hasil.pesan) || a.ringkas) + '</div>';
  }
  async function kirimJual(fungsi, param, ringkas, teksOk, b) {
    if (b) b.disabled = true;
    var r = await sb.from('md_aksi').insert({ fungsi: fungsi, param: param, ringkas: String(ringkas).slice(0, 200) });
    if (r.error) { $('msgJual').innerHTML = '<div class="msg bad">Gagal mengirim: ' + esc(r.error.message) + '</div>'; if (b) b.disabled = false; return; }
    await muatAksi(); J.ubahTtp = null; gambarJual(); gambarJualIsi();
    $('msgJual').innerHTML = '<div class="msg ok">' + esc(teksOk) + '</div>';
  }
  // Titipan staf: keputusan & ubah barang langsung tersimpan di Supabase (ttp_putus / ttp_barang_ubah); daftar dihitung ulang Apps Script.
  async function kirimTitipRpc(fn, arg, ringkas, b) {
    if (b) b.disabled = true;
    var r = await sb.rpc(fn, arg);
    var gagal = r.error ? r.error.message : (!r.data || !r.data.ok) ? ((r.data && r.data.pesan) || 'Gagal menyimpan.') : '';
    if (gagal) { $('msgJual').innerHTML = '<div class="msg bad">' + esc(gagal) + '</div>'; if (b) b.disabled = false; return; }
    salinKeSheetGaji();
    await sb.from('md_aksi').insert({ fungsi: 'segarkan', param: {}, ringkas: 'Hitung ulang sesudah ' + String(ringkas).slice(0, 150) });
    await muatAksi(); J.ubahTtp = null; gambarJual(); gambarJualIsi();
    $('msgJual').innerHTML = '<div class="msg ok">' + esc(r.data.pesan) + ' Daftar di halaman ini diperbarui paling lambat 10 menit lagi.</div>';
  }
  function angkaIsian(el) { var v = String(el.value).replace(/[^\d]/g, ''); return v === '' ? '' : Number(v); }

  function gambarPotretJual(el) {
    if (J.bagian === 'titip') el.innerHTML = isiTitip();
    else if (J.bagian === 'mkt') el.innerHTML = isiMkt();
    else el.innerHTML = isiBh();
    el.querySelectorAll('[data-mb]').forEach(function (b) { b.onclick = function () { J.mktB = b.getAttribute('data-mb'); gambarJualIsi(); }; });
    el.querySelectorAll('[data-bb]').forEach(function (b) { b.onclick = function () { J.bhB = b.getAttribute('data-bb'); gambarJualIsi(); }; });
    el.querySelectorAll('[data-bht]').forEach(function (b) { b.onclick = function () { J.bhToko = b.getAttribute('data-bht'); gambarJualIsi(); }; });
    el.querySelectorAll('[data-ttp-ubah]').forEach(function (b) { b.onclick = function () { var k = b.getAttribute('data-ttp-ubah'); J.ubahTtp = J.ubahTtp === k ? null : k; gambarJualIsi(); }; });
    el.querySelectorAll('[data-ttp]').forEach(function (b) { b.onclick = function () { putusTitip(b); }; });
    el.querySelectorAll('[data-ttp-simpan]').forEach(function (b) { b.onclick = function () { simpanBarangTitip(b); }; });
  }

  // Titipan staf (ttpPemilikData / ttpPutus / ttpBarangUbah lama)
  function isiTitip() {
    var t = D.titip;
    if (!t) return '<div class="msg w">Data titipan belum tersedia. Tekan "Hitung ulang sekarang".</div>';
    var ms = new Date(D.waktu.titip || 0).getTime(), antre = antreTtp(), rk = t.ringkas || { tot: {}, per: [] }, tot = rk.tot || {};
    var stokTot = (t.barang || []).reduce(function (s, b) { return s + (Number(b.stok) || 0); }, 0);
    var h = '<p class="tl">Barang titipan staf di ' + esc(t.toko) + ' · ' + esc(namaBulan(t.bulan)) + ' · diperbarui ' + waktuPotret('titip') + '</p>';
    h += '<div class="kp"><div class="kt"><span class="l">Penjualan titipan</span><span class="v angka">' + jt(tot.omzet || 0) + '</span><span class="k">' + rp(tot.omzet || 0) + ' · ' + fmt(tot.pcs || 0) + ' pcs</span></div>' +
      '<div class="kt"><span class="l">Laba titipan</span><span class="v angka' + ((tot.laba || 0) < 0 ? ' mn' : '') + '">' + jt(tot.laba || 0) + '</span><span class="k">HPP ' + rp(tot.hpp || 0) + '</span></div>' +
      '<div class="kt"><span class="l">Stok di toko</span><span class="v angka">' + fmt(stokTot) + '</span><span class="k">' + (t.barang || []).length + ' jenis barang</span></div>' +
      '<div class="kt"><span class="l">Ajuan menunggu</span><span class="v angka">' + nAjuanTitip() + '</span><span class="k">barang baru &amp; tambah stok</span></div></div>';
    var aB = t.ajuanBrg || [], aS = t.ajuanStok || [];
    if (aB.length || aS.length) {
      h += '<div class="cd"><div class="kpl"><h3>Ajuan dari staf</h3><span class="sb">Periksa angkanya, ubah bila perlu, lalu setujui atau tolak</span></div>';
      aB.forEach(function (b) {
        var a = antre[b.k], tunggu = a && a.status === 'menunggu';
        h += '<div class="grup" style="padding:10px 0"><h4>' + esc(b.n) + ' <span class="label biru">Barang baru</span></h4>' +
          '<div class="sb">' + esc(b.k) + ' · diajukan ' + esc(b.oleh || '–') + (b.awal ? ' · stok awal ' + fmt(b.awal) + ' pcs' : '') + (b.c ? ' · ' + esc(b.c) : '') + '</div>' +
          (tunggu ? '' : '<div class="mini"><label>HPP<input class="isian angka" inputmode="numeric" data-f="hpp" value="' + esc(b.hpp) + '"></label><label>Harga jual<input class="isian angka" inputmode="numeric" data-f="harga" value="' + esc(b.h) + '"></label><label>Stok awal (pcs)<input class="isian angka" inputmode="numeric" data-f="qty" value="' + esc(b.awal || 0) + '"></label></div>' +
          '<div class="aksi-baris"><button type="button" class="tbl pri" data-ttp="setuju" data-jenis="barang" data-id="' + esc(b.k) + '" data-nm="' + esc(b.n) + '">Setujui</button><button type="button" class="tbl" data-ttp="tolak" data-jenis="barang" data-id="' + esc(b.k) + '" data-nm="' + esc(b.n) + '">Tolak</button></div>') +
          catatanAntre(a, ms) + '</div>';
      });
      aS.forEach(function (x) {
        var a = antre[x.no], tunggu = a && a.status === 'menunggu';
        h += '<div class="grup" style="padding:10px 0"><h4>' + esc(x.n) + ' <span class="label w">Tambah stok</span></h4>' +
          '<div class="sb">' + esc(x.no) + ' · ' + esc(x.wm || '') + ' · diajukan ' + esc(x.oleh || '–') + (x.c ? ' · ' + esc(x.c) : '') + '</div>' +
          (tunggu ? '' : '<div class="mini"><label>Jumlah (pcs)<input class="isian angka" inputmode="numeric" data-f="qty" value="' + esc(x.q) + '"></label></div>' +
          '<div class="aksi-baris"><button type="button" class="tbl pri" data-ttp="setuju" data-jenis="stok" data-id="' + esc(x.no) + '" data-nm="' + esc(x.n) + '">Setujui</button><button type="button" class="tbl" data-ttp="tolak" data-jenis="stok" data-id="' + esc(x.no) + '" data-nm="' + esc(x.n) + '">Tolak</button></div>') +
          catatanAntre(a, ms) + '</div>';
      });
      h += '</div>';
    } else h += '<div class="cd"><div class="aman">Tidak ada ajuan barang atau stok dari staf.</div></div>';
    var brg = (t.barang || []).slice().sort(function (a, b) { return (a.st === b.st ? 0 : a.st === 'Aktif' ? -1 : 1) || b.jual - a.jual; });
    h += '<div class="cd"><div class="kpl"><h3>Barang titipan</h3><span class="sb">Terjual = ' + esc(namaBulan(t.bulan)) + '</span></div>';
    if (!brg.length) h += '<div class="ksg">Belum ada barang titipan.</div>';
    else h += '<div class="gulir"><table class="tabel"><thead><tr><th>Barang</th><th class="r">Stok</th><th class="r">Terjual</th><th class="r">HPP / harga</th><th></th></tr></thead><tbody>' + brg.map(function (b) {
      var a = antre[b.k], buka = J.ubahTtp === b.k, tunggu = a && a.status === 'menunggu' && a.fungsi === 'ttpBarangUbah';
      var baris = '<tr><td>' + esc(b.n) + '<small>' + esc(b.k) + (b.st !== 'Aktif' ? ' · <span class="label abu">Nonaktif</span>' : '') + '</small></td><td class="r angka' + (b.stok <= 0 ? ' mn' : '') + '">' + fmt(b.stok) + '</td><td class="r angka">' + fmt(b.jual) + '</td>' +
        '<td class="r angka">' + rp(b.h) + '<small>HPP ' + rp(b.hpp) + '</small></td><td class="r">' + (tunggu ? '<span class="label abu">diterapkan…</span>' : '<button type="button" class="tbl" data-ttp-ubah="' + esc(b.k) + '" aria-expanded="' + buka + '">' + (buka ? 'Tutup' : 'Ubah') + '</button>') + '</td></tr>';
      if (buka) baris += '<tr><td colspan="5" style="background:#F7F9FB"><div class="mini" data-ubah="' + esc(b.k) + '"><label>HPP<input class="isian angka" inputmode="numeric" data-f="hpp" value="' + esc(b.hpp) + '"></label><label>Harga jual<input class="isian angka" inputmode="numeric" data-f="harga" value="' + esc(b.h) + '"></label><label class="cek"><input type="checkbox" data-f="aktif"' + (b.st === 'Aktif' ? ' checked' : '') + '> Aktif dijual</label></div>' +
        '<div class="aksi-baris"><button type="button" class="tbl pri" data-ttp-simpan="' + esc(b.k) + '" data-nm="' + esc(b.n) + '">Simpan perubahan</button></div></td></tr>';
      else if (a && a.fungsi === 'ttpBarangUbah') { var c = catatanAntre(a, ms); if (c && !tunggu) baris += '<tr><td colspan="5">' + c + '</td></tr>'; }
      return baris;
    }).join('') + '</tbody></table></div>';
    h += '</div>';
    var per = rk.per || [];
    h += '<div class="dua"><div class="cd"><div class="kpl"><h3>Terjual bulan ini</h3><span class="sb angka">' + rp(tot.omzet || 0) + '</span></div>' + (per.length ? '<table class="tabel"><tbody>' + per.map(function (x) {
      return '<tr><td>' + esc(x.n) + '<small>' + fmt(x.q) + ' pcs · laba ' + rp(x.omzet - x.hpp) + '</small></td><td class="r angka">' + rp(x.omzet) + '</td></tr>'; }).join('') + '</tbody></table>' : '<div class="ksg">Belum ada penjualan titipan bulan ini.</div>') + '</div>';
    var rw = t.riwayat || [], JN = { JUAL: ['Jual', 'biru'], MASUK: ['Masuk', 'ok'], KELUAR: ['Keluar', 'w'] };
    h += '<div class="cd"><div class="kpl"><h3>Riwayat terakhir</h3><span class="sb">' + rw.length + ' catatan</span></div>' + (rw.length ? '<div class="gulir"><table class="tabel"><tbody>' + rw.map(function (x) {
      var j = JN[x.j] || [x.j, 'abu'];
      return '<tr><td>' + esc(x.n) + '<small>' + esc(x.t) + ' · ' + esc(x.no) + (x.oleh ? ' · ' + esc(x.oleh) : '') + (x.st && x.st !== 'Tercatat' && x.st !== 'Disetujui' ? ' · ' + esc(x.st) : '') + '</small></td><td class="r"><span class="label ' + j[1] + '">' + esc(j[0]) + '</span><small class="angka">' + fmt(x.q) + ' pcs' + (x.j === 'JUAL' ? ' · ' + rp(x.q * x.h) : '') + '</small></td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="ksg">Belum ada riwayat.</div>') + '</div></div>';
    return h + '<p class="sb">Penjualan titipan dicatat staf lewat formulir toko. Keputusan dari sini langsung tersimpan; daftar di halaman ini diperbarui paling lambat 10 menit kemudian.</p>';
  }
  function putusTitip(b) {
    var setuju = b.getAttribute('data-ttp') === 'setuju', jenis = b.getAttribute('data-jenis'), id = b.getAttribute('data-id'), nm = b.getAttribute('data-nm');
    var wadah = b.closest('.grup'), p = { jenis: jenis, id: id, aksi: setuju ? 'setuju' : 'tolak' }, isi = {};
    wadah.querySelectorAll('[data-f]').forEach(function (i) { isi[i.getAttribute('data-f')] = angkaIsian(i); });
    if (setuju) {
      if (jenis === 'barang') {
        if (!(isi.harga > 0)) { $('msgJual').innerHTML = '<div class="msg bad">Harga jual ' + esc(nm) + ' harus lebih dari 0.</div>'; return; }
        p.hpp = isi.hpp; p.harga = isi.harga; p.qty = isi.qty;
      } else {
        if (!(isi.qty > 0)) { $('msgJual').innerHTML = '<div class="msg bad">Jumlah tambah stok ' + esc(nm) + ' harus lebih dari 0.</div>'; return; }
        p.qty = isi.qty;
      }
    }
    var ringkas = (setuju ? 'Setujui ' : 'Tolak ') + (jenis === 'barang' ? 'barang titipan baru ' + nm + (setuju ? ' (harga ' + rp(p.harga) + (p.qty ? ', stok awal ' + p.qty + ' pcs' : '') + ')' : '') : 'tambah stok titipan ' + nm + (setuju ? ' ' + p.qty + ' pcs' : ''));
    kirimTitipRpc('ttp_putus', { p_jenis: p.jenis, p_id: p.id, p_aksi: p.aksi, p_hpp: p.hpp === undefined ? '' : String(p.hpp), p_harga: p.harga === undefined ? '' : String(p.harga),
      p_qty: p.qty === undefined ? '' : String(p.qty) }, ringkas, b);
  }
  function simpanBarangTitip(b) {
    var k = b.getAttribute('data-ttp-simpan'), nm = b.getAttribute('data-nm'), w = $('jIsi').querySelector('[data-ubah="' + k + '"]');
    var hpp = angkaIsian(w.querySelector('[data-f="hpp"]')), h = angkaIsian(w.querySelector('[data-f="harga"]')), aktif = w.querySelector('[data-f="aktif"]').checked;
    if (!(h > 0) || hpp === '') { $('msgJual').innerHTML = '<div class="msg bad">Isi HPP dan harga jual ' + esc(nm) + ' dengan angka.</div>'; return; }
    var ringkas = 'Ubah barang titipan ' + nm + ': HPP ' + rp(hpp) + ', harga ' + rp(h) + (aktif ? '' : ', nonaktif');
    kirimTitipRpc('ttp_barang_ubah', { p_kode: k, p_hpp: String(hpp), p_harga: String(h), p_aktif: aktif }, ringkas, b);
  }

  // Laporan marketplace toko official (mpRingkasOfficial lama)
  function isiMkt() {
    var d = J.mktB === 'ini' ? D.mkt : D.mktLalu, h = pilihBulan('mb', J.mktB);
    if (!d) return h + '<div class="msg w">Laporan marketplace belum tersedia. Tekan "Hitung ulang sekarang".</div>';
    var L = d.list || [], t = { psn: 0, batal: 0, pcs: 0, omzet: 0, hpp: 0, laba: 0, nret: 0, tanpaHpp: 0, belumKenal: 0 };
    L.forEach(function (x) { Object.keys(t).forEach(function (k) { t[k] += Number(x[k]) || 0; }); });
    var tgl = function (s) { return esc(String(s).split('-').reverse().join('/')); };
    h += '<p class="tl">Toko official · ' + tgl(d.dari) + ' – ' + tgl(d.sampai) + ' · diperbarui ' + waktuPotret(J.mktB === 'ini' ? 'mkt' : 'mktLalu') + '</p>';
    h += '<div class="kp"><div class="kt"><span class="l">Omzet marketplace</span><span class="v angka">' + jt(t.omzet) + '</span><span class="k">' + rp(t.omzet) + '</span></div>' +
      '<div class="kt"><span class="l">Laba kotor</span><span class="v angka">' + jt(t.laba) + '</span><span class="k">omzet − HPP ' + rp(t.hpp) + '</span></div>' +
      '<div class="kt"><span class="l">Pesanan</span><span class="v angka">' + fmt(t.psn) + '</span><span class="k">' + fmt(t.batal) + ' batal</span></div>' +
      '<div class="kt"><span class="l">Barang terjual</span><span class="v angka">' + fmt(t.pcs) + '</span><span class="k">pcs, sesudah return</span></div></div>';
    var cat = [];
    if (t.tanpaHpp) cat.push(fmt(t.tanpaHpp) + ' pcs terjual belum punya HPP, labanya terhitung terlalu besar');
    if (t.belumKenal) cat.push(fmt(t.belumKenal) + ' pcs dari produk marketplace yang belum dipasangkan ke kode barang');
    if (cat.length) h += '<div class="msg w">' + cat.map(esc).join('<br>') + '</div>';
    h += '<div class="cd"><h3>Per platform</h3><div class="gulir"><table class="tabel"><thead><tr><th>Platform</th><th class="r">Pesanan</th><th class="r">Pcs</th><th class="r">Omzet</th><th class="r">Laba kotor</th></tr></thead><tbody>' + L.map(function (x) {
      return '<tr><td><b>' + esc(x.pf) + '</b><small>Data terakhir ' + esc(x.terakhir || '–') + '</small></td><td class="r angka">' + fmt(x.psn) + (x.batal ? '<small>' + fmt(x.batal) + ' batal</small>' : '') + '</td><td class="r angka">' + fmt(x.pcs) + (x.ret ? '<small>return ' + fmt(x.ret) + ' pcs · ' + rp(x.nret) + '</small>' : '') + '</td>' +
        '<td class="r angka">' + rp(x.omzet) + '</td><td class="r angka">' + rp(x.laba) + '<small>HPP ' + rp(x.hpp) + '</small></td></tr>'; }).join('') + '</tbody></table></div></div>';
    var top = d.top || [], pf = d.pf || [];
    h += '<div class="cd"><div class="kpl"><h3>Barang terlaris</h3><span class="sb">' + top.length + ' teratas menurut omzet</span></div>' + (top.length ? '<div class="gulir"><table class="tabel"><thead><tr><th>Barang</th>' + pf.map(function (p) { return '<th class="r">' + esc(p) + '</th>'; }).join('') + '<th class="r">Omzet</th></tr></thead><tbody>' + top.map(function (b) {
      return '<tr><td>' + esc(b.n) + '<small>' + esc(b.k) + ' · ' + fmt(b.pcs) + ' pcs · laba ' + rp(b.omzet - b.hpp) + '</small></td>' + pf.map(function (p) { return '<td class="r angka">' + (b.q[p] ? fmt(b.q[p]) : '–') + '</td>'; }).join('') + '<td class="r angka">' + rp(b.omzet) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="ksg">Belum ada penjualan.</div>') + '</div>';
    return h + '<p class="sb">Angka mengikuti laporan pesanan yang terakhir diunggah. Unggah file pesanan lewat menu Upload laporan, dana cair consignment lewat <a href="form.html?f=mdlama&buka=g:toko,%23bhBtn,~dcKartu">Upload dana cair</a>. Omzet di sini belum dipotong biaya admin marketplace.</p>';
  }

  // Bagi hasil consignment (bagiHasilDataX lama, semua toko)
  function isiBh() {
    // Bulan lalu sudah final, jadi dibuka lebih dulu bila ada penjualannya.
    if (!J.bhB) J.bhB = D.bhLalu && (D.bhLalu.toko || []).some(function (t) { return t.omzet; }) ? 'lalu' : 'ini';
    var d = J.bhB === 'ini' ? D.bh : D.bhLalu, h = pilihBulan('bb', J.bhB);
    if (!d) return h + '<div class="msg w">Hitungan bagi hasil belum tersedia. Tekan "Hitung ulang sekarang".</div>';
    var T = d.toko || [];
    if (!J.bhToko || !T.some(function (x) { return x.toko === J.bhToko; })) J.bhToko = T.length ? T[0].toko : null;
    h += '<p class="tl">' + esc(namaBulan(d.bulan)) + (J.bhB === 'ini' ? ' sampai hari ini (belum final)' : '') + ' · diperbarui ' + waktuPotret(J.bhB === 'ini' ? 'bh' : 'bhLalu') + '</p>';
    h += '<div class="kp">' + T.map(function (x) {
      if (x.ok === false) return '<div class="kt"><span class="l">' + esc(x.toko) + '</span><span class="k">' + esc(x.pesan) + '</span></div>';
      return '<button type="button" class="kt tk' + (x.toko === J.bhToko ? ' on' : '') + '" data-bht="' + esc(x.toko) + '"><span class="l">' + esc(x.toko) + '</span><span class="v angka">' + jt(x.moscow) + '</span><span class="k">untuk Moscow · profit bersih ' + jt(x.bersih) + '</span></button>';
    }).join('') + '</div>';
    var x = T.filter(function (y) { return y.toko === J.bhToko; })[0];
    if (!x || x.ok === false) return h;
    var baris = function (l, v, kls) { return '<div' + (kls ? ' class="' + kls + '"' : '') + '><span>' + l + '</span><b class="angka">' + rp(v) + '</b></div>'; };
    var gs = '<div class="gs"></div>';
    var rumus = '<div class="rk">' + baris('Penjualan (' + fmt(x.qty) + ' pcs)', x.omzet) + baris('− Retur', -x.retur, x.retur ? 'mn' : '') + gs + baris('Penjualan bersih', x.penjualan, 'tb') +
      baris('− HPP barang terjual', -x.hpp, 'mn') + gs + baris('Laba kotor', x.kotor, 'tb') +
      baris('− Potongan marketplace', -x.potongan, x.potongan ? 'mn' : '') + baris('− Belanja toko', -x.belanja, x.belanja ? 'mn' : '') + baris('− Ongkir', -x.ongkir, x.ongkir ? 'mn' : '') + gs +
      baris('Profit bersih', x.bersih, 'hasil') + baris('Bagian toko (' + fmt(x.persen) + '%)', x.medan) + baris('Bagian Moscow (' + fmt(100 - x.persen) + '%)', x.moscowBagian) +
      (x.titipan ? gs + baris('Hasil barang titipan staf (' + fmt(x.titipan.pcs) + ' pcs, potongan aplikasi ' + String(x.titipan.pct).replace('.', ',') + '%)', x.titipan.bersih) + baris('Total untuk toko', x.medanTotal, 'tb') : '') + '</div>';
    var setor = (x.dc && x.dc.setoran) || (x.rn && x.rn.setoran) || null;
    var kanan = '<div class="rk">' + baris('HPP barang', x.hpp) + baris('Belanja toko (diganti)', x.belanja) + baris('Ongkir (diganti)', x.ongkir) + baris('Bagian Moscow', x.moscowBagian) + gs + baris('Total untuk Moscow', x.moscow, 'hasil') +
      (setor ? baris('Sudah tercatat masuk', setor.tercatat) + baris('Sisa belum disetor', setor.selisih, setor.selisih > 0 ? 'mn' : '') : '') + '</div>';
    h += '<div class="dua"><div class="cd"><div class="kpl"><h3>Hitungan ' + esc(x.toko) + '</h3><span class="sb">Bagian toko ' + fmt(x.persen) + '% dari profit bersih</span></div>' + rumus + '</div>';
    h += '<div class="cd"><div class="kpl"><h3>Yang diterima Moscow</h3>' + (setor ? '<span class="sb">ke ' + esc(setor.akun) + '</span>' : '') + '</div>' + kanan;
    var inv = x.bhi;
    if (inv) h += '<div style="margin-top:12px"><span class="label ' + (inv.terbit ? 'ok' : 'abu') + '">Invoice ' + esc(inv.no) + (inv.terbit ? ' terbit ' + esc(inv.waktu || '') : ' belum terbit') + '</span>' +
      (!inv.terbit && inv.kurang && inv.kurang.length ? '<div class="sb" style="margin-top:6px">Belum lengkap: ' + inv.kurang.map(esc).join(', ') + '</div>' : '') + '</div>';
    h += '</div></div>';
    var cat = [];
    if (x.tanpa && x.tanpa.length) cat.push(x.tanpa.length + ' barang belum punya HPP toko ini: ' + x.tanpa.slice(0, 5).join(', '));
    if (x.salur && x.salur.catatan) cat = cat.concat(x.salur.catatan);
    if (x.catatan) cat.push('Catatan: ' + x.catatan);
    if (cat.length) h += '<div class="msg w">' + cat.map(esc).join('<br>') + '</div>';
    if (x.salur && x.salur.baris && x.salur.baris.length) h += '<div class="cd"><div class="kpl"><h3>Potongan per saluran</h3>' + (x.salur.pctTot != null ? '<span class="sb">rata-rata ' + String(x.salur.pctTot).replace('.', ',') + '%</span>' : '') + '</div><table class="tabel"><thead><tr><th>Saluran</th><th class="r">Penjualan</th><th class="r">Dana diterima</th></tr></thead><tbody>' + x.salur.baris.map(function (s) {
      return '<tr><td>' + esc(s.l) + '<small>' + fmt(s.q) + ' pcs</small></td><td class="r angka">' + rp(s.jual) + '</td><td class="r angka">' + (s.dana == null ? '–' : rp(s.dana)) + '</td></tr>'; }).join('') + '</tbody></table></div>';
    var it = x.items || [];
    h += '<div class="dua"><div class="cd"><div class="kpl"><h3>Barang</h3><span class="sb">' + it.length + ' jenis</span></div>' + (it.length ? '<div class="gulir"><table class="tabel"><thead><tr><th>Barang</th><th class="r">Pcs</th><th class="r">Penjualan</th><th class="r">HPP</th></tr></thead><tbody>' + it.map(function (b) {
      return '<tr><td>' + esc(b.n) + '<small>' + esc(b.k) + (b.rq ? ' · retur ' + fmt(b.rq) + ' pcs' : '') + (b.ada ? '' : ' · <span class="label no">tanpa HPP</span>') + '</small></td><td class="r angka">' + fmt(b.q) + '</td><td class="r angka">' + rp(b.omzet) + '</td><td class="r angka">' + rp(b.hppTot) + '<small>@ ' + rp(b.hpp) + '</small></td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="ksg">Belum ada penjualan.</div>') + '</div>';
    var bi = x.biaya || [];
    h += '<div class="cd"><div class="kpl"><h3>Biaya toko</h3><span class="sb angka">' + rp(x.belanja + x.ongkirLap) + '</span></div>' + (bi.length ? '<table class="tabel"><tbody>' + bi.map(function (c) {
      return '<tr><td>' + esc(c.ket) + '<small>' + esc(c.t) + (c.o ? ' · ongkir' : '') + '</small></td><td class="r angka">' + rp(c.nom) + '</td></tr>'; }).join('') + '</tbody></table>' : '<div class="ksg">Tidak ada biaya.</div>') +
      (x.ongkirManual ? '<div class="sb">Ditambah ongkir isian manual ' + rp(x.ongkirManual) + '</div>' : '') + '</div></div>';
    return h + '<p class="sb">Isian potongan marketplace, dana diterima, setoran, dan penerbitan invoice bagi hasil masih lewat menu Bagi hasil di Master Data lama.</p>';
  }


  // ======================= PRODUKSI (ambilPantau, stokBahan, bahanBakuData, rencanaProduksi, rencanaBahan, pantauProduksi lama) =======================
  var PR = { bagian: 'prod', sp: 'ring', sb: 'ring', q: '', qb: '', fr: 'buat', fb: 'beli', pp: 'produksi' };
  function dec(n, d) { return angkaId(n, d === undefined ? 2 : d); }
  function jml(n, s) { if (s === 'gram' && Math.abs(n) >= 1000) return dec(n / 1000, 2) + ' kg'; return dec(n, 2) + ' ' + esc(s || ''); }
  function minBahan(b) { return b.min !== null && b.min !== undefined && b.min !== '' && b.ss <= Number(b.min); }
  function tandaBahan(b) { return b.ss < 0 ? ' <span class="label no">minus</span>' : minBahan(b) ? ' <span class="label w">perlu beli</span>' : ''; }
  function pilihSub(nama, nilai, opsi) { return '<div class="pilih2" role="group">' + opsi.map(function (o) { return '<button type="button" class="tbl" data-' + nama + '="' + o[0] + '" aria-pressed="' + (nilai === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div>'; }
  function baris2(kiri, kanan, kls) { return '<tr><td>' + kiri + '</td><td class="r angka' + (kls ? ' ' + kls : '') + '">' + kanan + '</td></tr>'; }
  function gambarProduksi() {
    var el = $('bProduksi'); if (!el) return;
    var rp2 = D.rpd, rb = D.rbb;
    var h = '<p class="tl">Data staf diperbarui sekitar 2 jam sekali; robot rencana dan pantau jam 07, 13, 19 · ' + waktuPotret('prod') + '</p>';
    h += '<div class="chip" role="group" aria-label="Bagian produksi">' + [['prod', 'Staf produksi', D.prod ? fmt(D.prod.produk.reduce(function (a, x) { return a + x.pr; }, 0)) + ' pcs bulan ini' : ''], ['bbk', 'Staf bahan baku', D.bbk ? (D.bbk.tunggu || []).length + ' pembelian belum sampai' : ''],
      ['rpd', 'Rencana produksi', rp2 ? (rp2.n['Kritis'] + rp2.n['Perlu dibuat']) + ' perlu dibuat' : ''], ['rbb', 'Rencana bahan baku', rb ? rb.n['Kurang'] + ' kurang' : ''], ['pp', 'Pantau produksi', '']].map(function (b) {
      return '<button type="button" data-prb="' + b[0] + '" aria-pressed="' + (PR.bagian === b[0]) + '"><span>' + b[1] + '</span><b>' + (b[2] || '&nbsp;') + '</b></button>'; }).join('') + '</div>';
    try { h += PR.bagian === 'prod' ? isiStafProd() : PR.bagian === 'bbk' ? isiStafBbk() : PR.bagian === 'rpd' ? isiRpd() : PR.bagian === 'rbb' ? isiRbb() : isiPantauProd(); }
    catch (e) { h += '<div class="msg bad">Bagian ini gagal ditampilkan: ' + esc(e.message) + '</div>'; }
    el.innerHTML = h;
    var pasang = function (attr, fn) { el.querySelectorAll('[data-' + attr + ']').forEach(function (b) { b.onclick = function () { fn(b.getAttribute('data-' + attr)); gambarProduksi(); }; }); };
    pasang('prb', function (v) { PR.bagian = v; }); pasang('sp', function (v) { PR.sp = v; }); pasang('sbk', function (v) { PR.sb = v; });
    pasang('fr', function (v) { PR.fr = v; }); pasang('fb', function (v) { PR.fb = v; }); pasang('ppj', function (v) { PR.pp = v; });
    ['prQ', 'prQb'].forEach(function (id) { var c = $(id); if (c) c.oninput = function () { var pos = c.selectionStart; if (id === 'prQ') PR.q = c.value; else PR.qb = c.value; gambarProduksi(); var c2 = $(id); c2.focus(); try { c2.setSelectionRange(pos, pos); } catch (e) { } }; });
    var on = el.querySelector('[data-prb][aria-pressed="true"]');
    if (on && on.parentNode.scrollWidth > on.parentNode.clientWidth) on.parentNode.scrollLeft = Math.max(0, on.offsetLeft - on.parentNode.offsetLeft - 16);
  }
  function isiStafProd() {
    var d = D.prod; if (!d) return '<div class="msg w">Data staf produksi belum tersedia. Tekan "Hitung ulang sekarang".</div>';
    var pr = d.produk || [], botol = (D.botol && D.botol.barang) || [], tp = 0, ts = 0, tsisa = 0, nsisa = 0, minus = 0, kj = [];
    pr.forEach(function (x) { tp += x.pr; ts += x.sa; tsisa += x.sisa; nsisa += x.sisa * (x.h || 0); if (x.sisa < 0) minus++; (x.kj || []).forEach(function (v, j) { kj[j] = (kj[j] || 0) + v; }); });
    var beli = botol.filter(minBahan);
    var h = pilihSub('sp', PR.sp, [['ring', 'Ringkas'], ['stok', 'Stok gudang produksi'], ['botol', 'Botol, stiker & packaging'], ['akt', 'Aktivitas']]);
    if (PR.sp === 'ring') {
      h += '<div class="kp"><div class="kt"><span class="l">Diproduksi bulan ini</span><span class="v angka">' + fmt(tp) + '</span><span class="k">pcs</span></div><div class="kt"><span class="l">Disalurkan bulan ini</span><span class="v angka">' + fmt(ts) + '</span><span class="k">pcs</span></div>' +
        '<div class="kt"><span class="l">Sisa gudang produksi</span><span class="v angka' + (tsisa < 0 ? ' mn' : '') + '">' + fmt(tsisa) + '</span><span class="k">pcs · nilai jual ' + rp(nsisa) + '</span></div></div>';
      var tj = kj.map(function (v, j) { return v ? baris2(esc((d.tujuan || [])[j] || '–'), fmt(v) + ' pcs') : ''; }).join('');
      var top = pr.filter(function (a) { return a.pr > 0; }).sort(function (a, b) { return b.pr - a.pr; }).slice(0, 8);
      h += '<div class="dua"><div class="cd"><h3>Disalurkan ke</h3>' + (tj ? '<table class="tabel"><tbody>' + tj + '</tbody></table>' : '<div class="ksg">Belum ada penyaluran bulan ini.</div>') + '</div>' +
        '<div class="cd"><h3>Produksi terbanyak bulan ini</h3>' + (top.length ? '<table class="tabel"><tbody>' + top.map(function (x) { return baris2(esc(x.n) + '<small>' + esc(x.k) + '</small>', fmt(x.pr) + ' pcs'); }).join('') + '</tbody></table>' : '<div class="ksg">Belum ada produksi bulan ini.</div>') + '</div></div>';
      var cek = [];
      if (minus) cek.push('<b>' + minus + ' barang sisa gudangnya minus.</b> Biasanya stok awal belum diisi atau ada penyaluran yang belum dicatat produksinya.');
      if (beli.length) cek.push('<b>' + beli.length + ' botol / stiker / packaging perlu dibeli:</b> ' + beli.slice(0, 10).map(function (a) { return esc(a.n) + ' (sisa ' + fmt(a.ss) + ')'; }).join(', '));
      if (cek.length) h += '<div class="msg w">' + cek.join('<br>') + '</div>';
    } else if (PR.sp === 'stok') {
      var list = pr.filter(function (x) { return cocok(x.n + ' ' + x.k, PR.q); });
      h += '<div class="cd"><div class="aksi-baris" style="margin-bottom:10px"><input class="isian" id="prQ" placeholder="Cari barang atau kode" value="' + esc(PR.q) + '"></div><p class="sb" style="margin-top:0">Diproduksi dan disalurkan = bulan ini. Sisa = stok sekarang.</p>' +
        (list.length ? '<div class="gulir"><table class="tabel"><thead><tr><th>Barang</th><th class="r">Produksi</th><th class="r">Salur</th><th class="r">Sisa</th></tr></thead><tbody>' + kelompok(list).map(function (g) {
          return '<tr><td colspan="4" style="background:#F7F9FB;font-weight:800">' + esc(g.kat) + '</td></tr>' + g.list.map(function (x) {
            var w = (x.w || []).filter(function (a) { return a.sisa; }).map(function (a) { return esc(a.w || 'tanpa warna') + ' ' + fmt(a.sisa); });
            return '<tr><td>' + esc(x.n) + '<small>' + esc(x.k) + (w.length ? ' · ' + w.join(', ') : '') + '</small></td><td class="r angka">' + fmt(x.pr) + '</td><td class="r angka">' + fmt(x.sa) + '</td><td class="r angka' + (x.sisa < 0 ? ' mn' : '') + '">' + fmt(x.sisa) + '</td></tr>'; }).join(''); }).join('') + '</tbody></table></div>' : '<div class="ksg">Barang tidak ditemukan.</div>') + '</div>';
    } else if (PR.sp === 'botol') {
      h += '<div class="cd"><div class="kpl"><h3>Stok botol, stiker &amp; packaging</h3><span class="sb">Bulan ' + esc((D.botol && D.botol.bulan) || '') + '</span></div><p class="sb" style="margin-top:-4px">Sisa = awal + masuk − pakai − rusak + penyesuaian.</p>';
      if (!botol.length) h += '<div class="ksg">Belum ada data.</div>';
      else h += '<div class="gulir"><table class="tabel"><thead><tr><th>Nama</th><th class="r hp-x">Awal</th><th class="r">Masuk</th><th class="r">Pakai</th><th class="r hp-x">Rusak</th><th class="r">Sisa</th></tr></thead><tbody>' + kelompok(botol.map(function (x) { return Object.assign({ kat: x.j }, x); })).map(function (g) {
        return '<tr><td colspan="6" style="background:#F7F9FB;font-weight:800">' + esc(g.kat) + '</td></tr>' + g.list.map(function (x) {
          return '<tr><td>' + esc(x.n) + tandaBahan(x) + (x.min !== null && x.min !== undefined && x.min !== '' ? '<small>min ' + fmt(x.min) + '</small>' : '') + '</td><td class="r angka hp-x">' + fmt(x.aw) + '</td><td class="r angka">' + fmt(x.ms) + '</td><td class="r angka">' + fmt(x.pk) + '</td><td class="r angka hp-x">' + fmt(x.rs) + '</td><td class="r angka' + (x.ss < 0 ? ' mn' : '') + '">' + fmt(x.ss) + '</td></tr>'; }).join(''); }).join('') + '</tbody></table></div>';
      h += '</div>';
    } else {
      var lg = d.log || [];
      h += '<div class="cd"><div class="kpl"><h3>Aktivitas staf produksi bulan ini</h3><span class="sb">terbaru di atas</span></div>' + (lg.length ? '<table class="tabel"><tbody>' + lg.slice(0, 80).map(function (x) {
        return '<tr><td><span class="label ' + (x.j === 'SALUR' ? 'biru' : x.j === 'PRODUKSI' ? 'ok' : 'abu') + '">' + esc(x.j) + '</span> ' + esc(x.n) + (x.wr ? ' – ' + esc(x.wr) : '') + '<small>' + esc(tglId(x.t)) + (x.w ? ' ' + esc(x.w) : '') + (x.p ? ' · ' + esc(String(x.p).replace(/^form:\s*/, '')) : '') + (x.tj ? ' · ke ' + esc(x.tj) : '') + '</small></td><td class="r angka">' + fmt(x.q) + '</td></tr>'; }).join('') + '</tbody></table>' + (lg.length > 80 || d.terpotong ? '<p class="sb">Menampilkan 80 aktivitas terbaru.</p>' : '') : '<div class="ksg">Belum ada aktivitas bulan ini.</div>') + '</div>';
    }
    return h;
  }
  function isiStafBbk() {
    var d = D.bbk; if (!d) return '<div class="msg w">Data staf bahan baku belum tersedia. Tekan "Hitung ulang sekarang".</div>';
    var br = d.barang || [], prod = d.prod || [], wl = d.warnaLog || [], b0 = (d.bulan || '').split('/'), bln = b0.length === 2 ? b0[1] + '-' + b0[0] : '';
    var diBulan = function (t) { return String(t || '').slice(0, 7) === bln; };
    var beli = br.filter(function (x) { return x.ss >= 0 && minBahan(x); }), minus = br.filter(function (x) { return x.ss < 0; });
    var h = pilihSub('sbk', PR.sb, [['ring', 'Ringkas'], ['stok', 'Stok bahan'], ['pig', 'Pigment campuran'], ['dasar', 'Cat dasar'], ['akt', 'Aktivitas']]);
    if (PR.sb === 'ring') {
      var kali = prod.filter(function (a) { return diBulan(a.t); }).reduce(function (s, a) { return s + (Number(a.kali) || 1); }, 0), tg = d.tunggu || [];
      h += '<div class="kp"><div class="kt"><span class="l">Kali produksi bahan</span><span class="v angka">' + fmt(kali) + '</span><span class="k">bulan ini</span></div><div class="kt"><span class="l">Kali campur warna</span><span class="v angka">' + fmt(wl.filter(function (a) { return diBulan(a.t); }).length) + '</span><span class="k">bulan ini</span></div>' +
        '<div class="kt"><span class="l">Pembelian belum sampai</span><span class="v angka' + (tg.length ? ' mn' : '') + '">' + tg.length + '</span><span class="k">pesanan</span></div><div class="kt"><span class="l">Perlu dicek</span><span class="v angka' + (minus.length || beli.length ? ' mn' : '') + '">' + (minus.length + beli.length) + '</span><span class="k">' + minus.length + ' minus · ' + beli.length + ' di bawah minimum</span></div></div>';
      if (tg.length) h += '<div class="cd"><h3>Pembelian belum sampai</h3><table class="tabel"><tbody>' + tg.map(function (x) { return baris2(esc(x.n) + '<small>' + esc(x.no) + ' · dipesan ' + esc(tglId(x.t)) + (x.sup ? ' · ' + esc(x.sup) : '') + '</small>', jml(x.q, x.s)); }).join('') + '</tbody></table></div>';
      var cek = [];
      if (minus.length) cek.push('<b>' + minus.length + ' bahan stoknya minus:</b> ' + minus.slice(0, 12).map(function (a) { return esc(a.n) + ' (' + jml(a.ss, a.s) + ')'; }).join(', ') + '. Biasanya stok awal belum diisi atau pembelian belum dicatat.');
      if (beli.length) cek.push('<b>' + beli.length + ' bahan di bawah stok minimum:</b> ' + beli.slice(0, 12).map(function (a) { return esc(a.n) + ' (sisa ' + jml(a.ss, a.s) + ')'; }).join(', '));
      if (d.warnaSalah && d.warnaSalah.length) cek.push('<b>' + d.warnaSalah.length + ' baris resep warna tidak dikenali.</b> Cek sheet BAHAN_WARNA.');
      if (cek.length) h += '<div class="msg w">' + cek.join('<br>') + '</div>';
      h += '<div class="dua"><div class="cd"><h3>Produksi bahan terakhir</h3>' + (prod.length ? '<table class="tabel"><tbody>' + prod.slice(0, 8).map(function (x) { return baris2(esc(x.n) + '<small>' + esc(tglId(x.t)) + (x.p ? ' · ' + esc(String(x.p).replace(/^form:\s*/, '')) : '') + (x.c ? ' · ' + esc(x.c) : '') + '</small>', jml(x.q, x.s) + (x.kali > 1 ? '<small>' + x.kali + '×</small>' : '')); }).join('') + '</tbody></table>' : '<div class="ksg">Belum ada.</div>') + '</div>' +
        '<div class="cd"><h3>Campur warna terakhir</h3>' + (wl.length ? '<table class="tabel"><tbody>' + wl.slice(0, 8).map(function (x) { return baris2(esc(x.n) + '<small>' + esc(x.kel) + ' · ' + esc(tglId(x.t)) + (x.c ? ' · ' + esc(x.c) : '') + '</small>', jml(x.ml, 'gram')); }).join('') + '</tbody></table>' : '<div class="ksg">Belum ada.</div>') + '</div></div>';
    } else if (PR.sb === 'stok') {
      var list = br.filter(function (x) { return cocok(x.n + ' ' + x.k + ' ' + (x.kel || ''), PR.qb); });
      h += '<div class="cd"><div class="aksi-baris" style="margin-bottom:10px"><input class="isian" id="prQb" placeholder="Cari bahan atau kelompok" value="' + esc(PR.qb) + '"></div><p class="sb" style="margin-top:0">Bulan ' + esc(d.bulan || '') + '. Sisa = awal + masuk − pakai − rusak + penyesuaian.</p>' +
        (list.length ? '<div class="gulir"><table class="tabel"><thead><tr><th>Bahan</th><th class="r">Masuk</th><th class="r">Pakai</th><th class="r">Sisa</th></tr></thead><tbody>' + kelompok(list.map(function (x) { return Object.assign({ kat: x.kel }, x); })).map(function (g) {
          return '<tr><td colspan="4" style="background:#F7F9FB;font-weight:800">' + esc(g.kat) + '</td></tr>' + g.list.map(function (x) {
            return '<tr><td>' + esc(x.n) + tandaBahan(x) + '<small>' + esc(x.k) + (x.min !== null && x.min !== undefined && x.min !== '' ? ' · min ' + jml(x.min, x.s) : '') + '</small></td><td class="r angka">' + dec(x.ms) + '</td><td class="r angka">' + dec(x.pk) + '</td><td class="r angka' + (x.ss < 0 ? ' mn' : '') + '">' + jml(x.ss, x.s) + '</td></tr>'; }).join(''); }).join('') + '</tbody></table></div>' : '<div class="ksg">Bahan tidak ditemukan.</div>') + '</div>';
    } else if (PR.sb === 'pig') {
      var pc = br.filter(function (a) { return /pigment campuran/i.test(a.kel || ''); }), lp = wl.filter(function (a) { return /pigment campuran/i.test(a.kel || ''); });
      h += '<div class="cd"><h3>Stok pigment campuran</h3><p class="sb" style="margin-top:-4px">Pigment yang dicampur sendiri. Dibuat = hasil campuran bulan ini; terpakai = dipakai untuk campur warna cat bulan ini.</p>' +
        (pc.length ? '<div class="gulir"><table class="tabel"><thead><tr><th>Pigment</th><th class="r hp-x">Awal</th><th class="r">Dibuat</th><th class="r">Terpakai</th><th class="r">Sisa</th></tr></thead><tbody>' + pc.map(function (x) {
          return '<tr><td>' + esc(x.n) + tandaBahan(x) + '</td><td class="r angka hp-x">' + dec(x.aw) + '</td><td class="r angka">' + dec(x.ms) + '</td><td class="r angka">' + dec(x.pk + x.rs) + '</td><td class="r angka' + (x.ss < 0 ? ' mn' : '') + '">' + jml(x.ss, x.s) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="ksg">Belum ada bahan berkelompok Pigment Campuran.</div>') + '</div>';
      h += '<div class="cd"><h3>Riwayat pembuatan pigment campuran</h3>' + (lp.length ? '<table class="tabel"><tbody>' + lp.slice(0, 40).map(function (x) { return baris2(esc(x.n) + '<small>' + esc(tglId(x.t)) + (x.c ? ' · ' + esc(x.c) : '') + '</small>', jml(x.ml, 'gram')); }).join('') + '</tbody></table>' : '<div class="ksg">Belum ada pigment campuran yang dibuat.</div>') + '</div>';
    } else if (PR.sb === 'dasar') {
      var ds = d.dasar || [];
      h += '<div class="cd"><h3>Stok cat dasar (siap campur warna)</h3><p class="sb" style="margin-top:-4px">Dibuat dari menu Produksi staf bahan baku, terpakai saat campur warna.</p>' +
        (ds.length ? '<table class="tabel"><thead><tr><th>Cat dasar</th><th class="r">Dibuat bulan ini</th><th class="r">Terpakai bulan ini</th><th class="r">Sisa</th></tr></thead><tbody>' + ds.map(function (x) {
          return '<tr><td>' + esc(x.n) + '<small>' + esc(x.kel || '') + '</small></td><td class="r angka">' + dec(x.prB / 1000) + ' kg</td><td class="r angka">' + dec(x.pkB / 1000) + ' kg</td><td class="r angka' + (x.sisa < 0 ? ' mn' : '') + '">' + dec(x.sisa / 1000) + ' kg</td></tr>'; }).join('') + '</tbody></table>' : '<div class="ksg">Belum ada data cat dasar.</div>') + '</div>';
    } else {
      var semua = [];
      (d.pakai || []).forEach(function (a) { semua.push({ t: a.t, j: a.j || 'Terpakai', w: 'abu', isi: esc(a.n) + (a.u ? ' untuk ' + esc(a.u) : ''), q: jml(a.q, a.s), p: a.p, c: a.c }); });
      prod.forEach(function (a) { semua.push({ t: a.t, j: 'Produksi', w: 'ok', isi: esc(a.n) + (a.kali > 1 ? ' (' + a.kali + '×)' : ''), q: jml(a.q, a.s), p: a.p, c: a.c }); });
      wl.forEach(function (a) { semua.push({ t: a.t, j: 'Campur warna', w: 'biru', isi: esc(a.n) + ' · ' + esc(a.kel), q: jml(a.ml, 'gram'), p: a.p, c: a.c }); });
      (d.beliBulan || []).forEach(function (a) { semua.push({ t: a.ts || a.t, j: 'Barang sampai', w: 'w', isi: esc(a.n) + (a.sup ? ' dari ' + esc(a.sup) : ''), q: jml(a.qt || a.q, a.s), p: a.pt || a.pg, c: a.ct }); });
      semua.sort(function (a, b) { return String(a.t) < String(b.t) ? 1 : String(a.t) > String(b.t) ? -1 : 0; });
      h += '<div class="cd"><div class="kpl"><h3>Aktivitas staf bahan baku</h3><span class="sb">terbaru di atas</span></div>' + (semua.length ? '<table class="tabel"><tbody>' + semua.slice(0, 80).map(function (x) {
        return '<tr><td><span class="label ' + x.w + '">' + esc(x.j) + '</span> ' + x.isi + '<small>' + esc(tglId(x.t)) + (x.p ? ' · ' + esc(String(x.p).replace(/^form:\s*/, '')) : '') + (x.c ? ' · ' + esc(x.c) : '') + '</small></td><td class="r angka">' + x.q + '</td></tr>'; }).join('') + '</tbody></table>' : '<div class="ksg">Belum ada aktivitas.</div>') + '</div>';
    }
    return h;
  }
  var WARNA_RPD = { 'Kritis': 'no', 'Perlu dibuat': 'w', 'Aman': 'ok', 'Berlebih': 'abu', 'Belum laku': 'abu', 'Belum ada data': 'abu', 'Kurang': 'no', 'Tunggu barang': 'biru', 'Mepet': 'w', 'Cukup': 'ok' };
  function isiRpd() {
    var d = D.rpd; if (!d) return '<div class="msg w">Rencana produksi belum tersedia. Tekan "Hitung ulang sekarang".</div>';
    var h = '<div class="kp"><div class="kt"><span class="l">Kritis</span><span class="v angka' + (d.n['Kritis'] ? ' mn' : '') + '">' + d.n['Kritis'] + '</span><span class="k">stok cukup &lt; ' + d.batas.kritis + ' hari</span></div><div class="kt"><span class="l">Perlu dibuat</span><span class="v angka">' + d.n['Perlu dibuat'] + '</span><span class="k">cukup &lt; ' + d.batas.perlu + ' hari</span></div>' +
      '<div class="kt"><span class="l">Aman</span><span class="v angka">' + d.n['Aman'] + '</span><span class="k">barang</span></div><div class="kt"><span class="l">Berlebih</span><span class="v angka">' + d.n['Berlebih'] + '</span><span class="k">cukup &gt; ' + d.batas.aman + ' hari</span></div></div>';
    h += '<p class="tl">Total saran produksi <b>' + fmt(d.totSaran) + ' pcs</b> supaya stok cukup ' + d.target + ' hari · dari penjualan ' + d.hari + ' hari terakhir · dihitung ' + esc(d.diperbarui) + '</p>';
    h += pilihSub('fr', PR.fr, [['buat', 'Perlu dibuat'], ['lebih', 'Jangan dibuat dulu'], ['semua', 'Semua']]);
    var l = d.list.filter(function (x) { return PR.fr === 'buat' ? (x.st === 'Kritis' || x.st === 'Perlu dibuat') : PR.fr === 'lebih' ? (x.st === 'Berlebih' || x.st === 'Belum laku') : true; });
    h += l.length ? l.map(function (x) {
      var stok = 'Stok total <b class="angka">' + fmt(x.tot) + '</b> (gudang ' + fmt(x.gd + x.prod) + ' · toko ' + fmt(x.toko) + ')', isi;
      if (x.st === 'Belum ada data') isi = 'Belum ada data penjualan. ' + stok + '.';
      else if (x.st === 'Belum laku') isi = stok + '. Belum terjual ' + d.hari + ' hari terakhir. <b>Jangan dibuat dulu.</b>';
      else isi = stok + ' · laku ' + dec(x.r) + '/hari · cukup ±' + fmt(x.cukup) + ' hari' + (x.saran > 0 ? '' : x.st === 'Berlebih' ? '<br><b>Jangan dibuat dulu</b>, stok masih banyak.' : '<br>Belum perlu dibuat.');
      var w = x.saran > 0 && x.warna ? x.warna.filter(function (y) { return y.saran > 0; }) : [];
      return '<div class="cd"><div class="rq-kpl"><h3>' + esc(x.n) + '</h3><span class="sb">' + esc(x.k) + ' · ' + esc(x.kat) + '</span></div><div class="rq-mt" style="margin-top:6px"><span class="label ' + (WARNA_RPD[x.st] || 'abu') + '">' + esc(x.st) + '</span>' + (x.saran > 0 ? '<span class="label biru">Saran produksi ' + fmt(x.saran) + ' pcs</span>' : '') + '</div>' +
        '<div class="sb" style="margin-top:6px;color:var(--teks2)">' + isi + '</div>' + (w.length ? '<div class="rq-mt" style="margin-top:8px">' + w.map(function (y) { return '<span class="label abu">' + esc(y.w) + ' ' + fmt(y.saran) + '</span>'; }).join('') + '</div>' : '') + '</div>';
    }).join('') : '<div class="cd"><div class="aman">' + (PR.fr === 'buat' ? 'Tidak ada barang yang perlu dibuat saat ini.' : 'Tidak ada barang.') + '</div></div>';
    return h + '<p class="sb">Stok total = gudang + semua toko. Penjualan online diperkirakan dari kiriman ke Kantor Packing.</p>';
  }
  function isiRbb() {
    var d = D.rbb; if (!d) return '<div class="msg w">Rencana bahan baku belum tersedia. Tekan "Hitung ulang sekarang".</div>';
    var h = '<div class="kp"><div class="kt"><span class="l">Kurang</span><span class="v angka' + (d.n['Kurang'] ? ' mn' : '') + '">' + d.n['Kurang'] + '</span><span class="k">harus dibeli / dibuat</span></div><div class="kt"><span class="l">Tunggu barang</span><span class="v angka">' + d.n['Tunggu barang'] + '</span><span class="k">cukup kalau pesanan datang</span></div>' +
      '<div class="kt"><span class="l">Mepet</span><span class="v angka">' + d.n['Mepet'] + '</span><span class="k">di bawah stok minimum</span></div><div class="kt"><span class="l">Cukup</span><span class="v angka">' + d.n['Cukup'] + '</span><span class="k">bahan</span></div></div>';
    h += '<p class="tl">Untuk membuat <b>' + fmt(d.totPcs) + ' pcs</b> sesuai saran produksi (stok cukup ' + d.target + ' hari) · dihitung ' + esc(d.diperbarui) + '</p>';
    var cat = [];
    if (d.masalah.length) cat.push(d.masalah.length + ' barang belum bisa dihitung bahannya (lihat Perlu dicek).');
    if (d.minus) cat.push(d.minus + ' bahan stoknya tercatat minus, kemungkinan ada pembelian atau pembuatan yang belum dicatat.');
    if (cat.length) h += '<div class="msg w">' + cat.map(esc).join('<br>') + '</div>';
    h += pilihSub('fb', PR.fb, [['beli', 'Perlu disiapkan'], ['jadi', 'Bahan jadi'], ['cek', 'Perlu dicek' + (d.masalah.length ? ' (' + d.masalah.length + ')' : '')], ['semua', 'Semua bahan']]);
    if (PR.fb === 'jadi') {
      if (d.ecer && d.ecer.length) h += '<div class="cd"><h3>Bahan curah untuk diecer</h3><table class="tabel"><tbody>' + d.ecer.map(function (e) { return baris2(esc(e.n) + '<small>Belum ada di daftar bahan baku</small>', dec(e.kg) + ' kg'); }).join('') + '</tbody></table></div>';
      h += '<div class="cd"><h3>Bahan jadi yang perlu dibuat</h3>' + (d.jadi.length ? '<table class="tabel"><thead><tr><th>Bahan jadi</th><th class="r">Butuh</th><th class="r">Kali produksi</th></tr></thead><tbody>' + d.jadi.map(function (j) {
        return '<tr><td>' + esc(j.n) + '<small>' + esc(j.kel) + (j.batch ? ' · 1× produksi ' + dec(j.batch) + ' kg' : '') + '</small></td><td class="r angka">' + dec(j.kg) + ' kg</td><td class="r angka">' + (j.kali === null ? '–' : '±' + dec(j.kali, 1) + '×') + '</td></tr>'; }).join('') + '</tbody></table><p class="sb">Kali produksi = butuh ÷ berat hasil 1× produksi. Stok bahan jadi yang sudah ada belum dikurangi.</p>' : '<div class="ksg">Tidak ada bahan jadi yang perlu dibuat.</div>') + '</div>';
      var b = d.barang.slice().sort(function (a, c) { return c.kg - a.kg; });
      h += '<div class="cd"><div class="kpl"><h3>Dari saran produksi</h3><span class="sb">' + b.length + ' barang</span></div><div class="gulir"><table class="tabel"><thead><tr><th>Barang</th><th class="r">Pcs</th><th class="r">Berat</th></tr></thead><tbody>' + b.map(function (x) {
        return '<tr><td>' + esc(x.n) + (x.w ? ' – ' + esc(x.w) : '') + '<small>' + esc(x.ket) + '</small></td><td class="r angka">' + fmt(x.pcs) + '</td><td class="r angka">' + dec(x.kg) + ' kg</td></tr>'; }).join('') + '</tbody></table></div></div>';
      return h;
    }
    if (PR.fb === 'cek') return h + (d.masalah.length ? '<div class="cd"><h3>Belum bisa dihitung</h3><table class="tabel"><tbody>' + d.masalah.map(function (m) { return baris2(esc(m.n) + (m.w ? ' – ' + esc(m.w) : '') + '<small>' + esc(m.al) + '</small>', m.pcs ? fmt(m.pcs) + ' pcs' : '–'); }).join('') + '</tbody></table><p class="sb">Lengkapi resep di formulir bahan baku, atau isi berat per pcs di sheet ' + esc(d.sheetIsi) + '.</p></div>' : '<div class="cd"><div class="aman">Semua saran produksi sudah bisa dihitung.</div></div>');
    var l = d.bahan.filter(function (x) { return PR.fb === 'semua' || x.st !== 'Cukup'; });
    h += l.length ? l.map(function (x) {
      var isi = 'Butuh <b>' + jml(x.butuh, x.s) + '</b> · ' + (x.minus ? 'stok tercatat <b>minus ' + jml(-x.stok, x.s) + '</b> (dihitung 0, cek pencatatan)' : 'stok sekarang ' + jml(x.stok, x.s)) + (x.dipesan > 0 ? ' · sedang dipesan ' + jml(x.dipesan, x.s) : '');
      if (x.st === 'Tunggu barang') isi += '<br>Stok kurang, tapi cukup kalau pesanan sudah datang.';
      else if (x.st === 'Mepet') isi += '<br>Cukup, tapi sisa ' + jml(x.sisa, x.s) + ' di bawah stok minimum (' + jml(x.min, x.s) + ').';
      else if (x.st === 'Cukup') isi += '<br>Cukup. Sisa setelah produksi ' + jml(x.sisa, x.s) + '.';
      return '<div class="cd"><div class="rq-kpl"><h3>' + esc(x.n) + '</h3><span class="sb">' + esc(x.k) + (x.kel ? ' · ' + esc(x.kel) : '') + '</span></div><div class="rq-mt" style="margin-top:6px"><span class="label ' + (WARNA_RPD[x.st] || 'abu') + '">' + esc(x.st) + '</span>' + (x.st === 'Kurang' ? '<span class="label biru">' + (x.buat ? 'Perlu dibuat (campur pigment)' : 'Perlu dibeli') + ' ' + jml(x.beli, x.s) + '</span>' : '') + '</div>' +
        '<div class="sb" style="margin-top:6px;color:var(--teks2)">' + isi + '</div>' + (x.untuk && x.untuk.length ? '<div class="rq-mt" style="margin-top:8px">' + x.untuk.map(function (y) { return '<span class="label abu">' + esc(y) + '</span>'; }).join('') + '</div>' : '') + '</div>';
    }).join('') : '<div class="cd"><div class="aman">' + (PR.fb === 'beli' ? 'Semua bahan cukup untuk rencana produksi.' : 'Tidak ada bahan.') + '</div></div>';
    return h + '<p class="sb">Angka masih perkiraan karena data penjualan baru ' + d.hari + ' hari.</p>';
  }
  function isiPantauProd() {
    var d = PR.pp === 'produksi' ? D.ppProd : D.ppBahan, h = pilihSub('ppj', PR.pp, [['produksi', 'Staf produksi (pcs)'], ['bahan', 'Staf bahan baku (kg)']]);
    if (!d) return h + '<div class="msg w">Data pantau produksi belum tersedia. Tekan "Hitung ulang sekarang".</div>';
    var pct = function (a, b) { if (!b) return a ? '<span class="sb">belum ada data pembanding</span>' : ''; var p = Math.round((a - b) / b * 1000) / 10; return '<b style="color:var(--' + (p >= 0 ? 'hijau' : 'merah') + ')">' + (p >= 0 ? '▲ +' : '▼ ') + String(p).replace('.', ',') + '%</b>'; };
    var dp = d.sat === 'kg' ? 2 : 0;
    h += '<div class="kp"><div class="kt"><span class="l">' + esc(d.lblIni) + '</span><span class="v angka">' + dec(d.ini, dp) + '</span><span class="k">' + esc(d.sat) + ' · ' + pct(d.ini, d.lalu) + '</span></div><div class="kt"><span class="l">' + esc(d.lblLalu) + '</span><span class="v angka">' + dec(d.lalu, dp) + '</span><span class="k">' + esc(d.sat) + ' (tanggal yang sama)</span></div>' +
      '<div class="kt"><span class="l">' + esc(d.lblPenuh) + ' sebulan penuh</span><span class="v angka">' + dec(d.penuh, dp) + '</span><span class="k">' + esc(d.sat) + '</span></div></div>';
    var mx = Math.max.apply(null, d.kat.map(function (k) { return k.ini; }).concat([1]));
    h += '<div class="dua"><div class="cd"><h3>Per kategori</h3>' + d.kat.map(function (k) {
      return '<div class="br"><div class="tx"><span>' + esc(k.n) + '</span><b class="angka">' + dec(k.ini, dp) + ' ' + esc(d.sat) + ' ' + (k.lalu ? pct(k.ini, k.lalu) : '') + '</b></div><div class="tr"><div class="is" style="width:' + Math.max(2, Math.round(k.ini / mx * 100)) + '%"></div></div></div>'; }).join('') + '</div>';
    h += '<div class="cd"><div class="kpl"><h3>Per barang</h3><span class="sb">' + d.item.length + ' barang</span></div><div class="gulir"><table class="tabel"><thead><tr><th>Barang</th><th class="r">Bulan ini</th><th class="r">Bulan lalu</th></tr></thead><tbody>' + d.item.map(function (x) {
      return '<tr><td>' + esc(x.n) + '<small>' + esc(x.kat) + '</small></td><td class="r angka">' + dec(x.ini, dp) + '</td><td class="r angka">' + dec(x.lalu, dp) + '</td></tr>'; }).join('') + '</tbody></table></div></div></div>';
    return h + '<p class="sb">Bulan berjalan dibandingkan dengan tanggal yang sama bulan lalu. Data di sistem baru mulai Oktober 2026, jadi pembanding September masih kosong.</p>';
  }


  // ======================= ACCOUNTING (akuntingLaporan, hargaBahanBakuMaster, hrgNaikData, tpbData lama) =======================
  var U = { bagian: 'lap', b: 'ini', arah: '', q: '', qh: '', qn: '' };
  function gambarUang() {
    var el = $('bUang'); if (!el) return;
    var t = D.tpb, nCek = t && t.cek ? t.cek.filter(function (c) { return !c.ok; }).length : 0;
    var h = '<p class="tl">Laporan bulan ini diperbarui sekitar 2 jam sekali; harga dan tutup buku jam 07, 13, 19 · ' + waktuPotret('acc') + '</p>';
    h += '<div class="chip" role="group" aria-label="Bagian accounting">' + [['lap', 'Laporan bulanan', D.acc ? 'laba ' + jt(D.acc.lr.bersih) : ''], ['alur', 'Alur kas', D.beranda ? 'keluar ' + jt(D.beranda.keluar) : ''], ['trx', 'Transaksi', D.acc ? D.acc.rinci.length + ' catatan' : ''], ['hbb', 'Harga bahan & kemasan', ''], ['naik', 'Kenaikan harga', D.hrgnaik ? D.hrgnaik.list.length + ' catatan' : ''], ['tpb', 'Tutup buku', t ? (nCek ? nCek + ' perlu dibereskan' : 'siap') : ''], ['gaji', 'Gaji', U.gaji && U.gaji.lalu ? (U.gaji.lalu.status === 'Menunggu' ? 'perlu disetujui' : U.gaji.lalu.nama) : '']].map(function (b) {
      return '<button type="button" data-ub="' + b[0] + '" aria-pressed="' + (U.bagian === b[0]) + '"><span>' + b[1] + '</span><b>' + (b[2] || '&nbsp;') + '</b></button>'; }).join('') + '</div>';
    if (U.bagian === 'gaji' && !U.gaji && !U.gajiMuat) muatGaji();
    try { h += U.bagian === 'lap' ? isiLapUang() : U.bagian === 'alur' ? isiAlur() : U.bagian === 'trx' ? isiTrx() : U.bagian === 'hbb' ? isiHbb() : U.bagian === 'naik' ? isiNaik() : U.bagian === 'gaji' ? isiGaji() : isiTpb(); }
    catch (e) { h += '<div class="msg bad">Bagian ini gagal ditampilkan: ' + esc(e.message) + '</div>'; }
    el.innerHTML = h;
    var pasang = function (attr, fn) { el.querySelectorAll('[data-' + attr + ']').forEach(function (b) { b.onclick = function () { fn(b.getAttribute('data-' + attr)); gambarUang(); }; }); };
    pasang('ub', function (v) { U.bagian = v; }); pasang('ubl', function (v) { U.b = v; }); pasang('uar', function (v) { U.arah = v; }); pasang('gjp', function (v) { U.gp = v; }); pasang('gjr', function (v) { U.gr = U.gr === v ? null : v; });
    el.querySelectorAll('[data-gja]').forEach(function (b) { b.onclick = function () { putusGaji(b); }; });
    ['uQ', 'uQh', 'uQn'].forEach(function (id) { var c = $(id); if (c) c.oninput = function () { var pos = c.selectionStart; U[{ uQ: 'q', uQh: 'qh', uQn: 'qn' }[id]] = c.value; gambarUang(); var c2 = $(id); c2.focus(); try { c2.setSelectionRange(pos, pos); } catch (e) { } }; });
    var on = el.querySelector('[data-ub][aria-pressed="true"]');
    if (on && on.parentNode.scrollWidth > on.parentNode.clientWidth) on.parentNode.scrollLeft = Math.max(0, on.offsetLeft - on.parentNode.offsetLeft - 16);
  }

  // ---------- Gaji (gjData / gjPutus lama; data di tabel gaji_potret, hanya manajemen) ----------
  U.gp = 'lalu'; U.gr = null; U.gaji = null; U.gajiMuat = false;
  async function muatGaji() {
    U.gajiMuat = true;
    // Data gaji langsung dari Supabase (gaji_data = gjData lama); bulan lalu dan bulan ini.
    var kini = new Date(), ini = kini.getFullYear() + '-' + ('0' + (kini.getMonth() + 1)).slice(-2);
    var h = await Promise.all([sb.rpc('gaji_data', { p_per: '' }), sb.rpc('gaji_data', { p_per: ini })]);
    U.gajiMuat = false;
    var salah = h[0].error || h[1].error;
    U.gaji = { galat: salah ? salah.message : (h[0].data && h[0].data.ok === false ? h[0].data.pesan : '') };
    if (!U.gaji.galat) { U.gaji.lalu = h[0].data; U.gaji.ini = h[1].data; U.gaji.wlalu = U.gaji.wini = kini.toISOString(); }
    gambarUang();
  }
  function isiGaji() {
    var G2 = U.gaji;
    if (!G2) return '<div class="ksg">Memuat data gaji…</div>';
    if (G2.galat) return '<div class="msg bad">Data gaji gagal dimuat: ' + esc(G2.galat) + '</div>';
    var d = G2[U.gp], h = pilihSub('gjp', U.gp, [['lalu', 'Bulan lalu'], ['ini', 'Bulan ini']]);
    if (!d) return h + '<div class="msg w">Data gaji belum tersedia. Tekan "Hitung ulang sekarang".</div>';
    var T = d.total || {}, st = d.status, warna = { Disetujui: 'ok', Menunggu: 'w', Draft: 'abu', Ditolak: 'no', Kosong: 'abu' }[st] || 'abu';
    var antre = null; D.aksi.forEach(function (a) { if (!antre && a.fungsi === 'gjPutus' && a.param && a.param.per === d.per) antre = a; });
    var tunggu = antre && antre.status === 'menunggu';
    h += '<div class="cd"><div class="rq-kpl"><h3>Gaji ' + esc(d.nama) + '</h3><span class="label ' + warna + '">' + esc(st === 'Kosong' ? 'Belum diisi admin' : st) + '</span></div><p class="sb" style="margin:6px 0 0">Diperbarui ' + (G2['w' + U.gp] ? new Date(G2['w' + U.gp]).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '–') + ' · THP = gaji pokok + uang makan + lembur + bonus − BPJS karyawan − telat − kasbon</p>' + catatanAntre(antre, new Date(G2['w' + U.gp] || 0).getTime());
    if (st !== 'Kosong') h += '<div class="kp" style="margin:12px 0 0"><div class="kt"><span class="l">Total THP dibayar</span><span class="v angka">' + jt(T.thp) + '</span><span class="k">' + rp(T.thp) + ' · ' + T.n + ' orang</span></div>' +
      '<div class="kt"><span class="l">Beban gaji</span><span class="v angka">' + jt(T.bruto) + '</span><span class="k">sebelum potongan BPJS karyawan &amp; kasbon</span></div>' +
      '<div class="kt"><span class="l">BPJS ditanggung PT</span><span class="v angka">' + jt(T.bp) + '</span><span class="k">' + rp(T.bp) + '</span></div>' +
      '<div class="kt"><span class="l">Total biaya gaji perusahaan</span><span class="v angka">' + jt(T.biaya) + '</span><span class="k">' + rp(T.biaya) + '</span></div></div>';
    if (!tunggu) {
      if (st === 'Menunggu') h += '<div class="mini" style="margin-top:12px"><label style="grid-column:1/-1">Catatan (wajib bila dikembalikan ke admin)<input class="isian" id="gjCat" maxlength="200"></label></div><div class="aksi-baris"><button type="button" class="tbl pri" data-gja="setuju">Setujui gaji ' + esc(d.nama) + '</button><button type="button" class="tbl" data-gja="tolak">Kembalikan ke admin</button></div>';
      else if (st === 'Disetujui') h += '<div class="mini" style="margin-top:12px"><label style="grid-column:1/-1">Alasan membuka kembali (wajib)<input class="isian" id="gjCat" maxlength="200"></label></div><div class="aksi-baris"><button type="button" class="tbl" data-gja="buka">Buka kembali (jadi Draft)</button></div>';
      else h += '<p class="sb" style="margin-top:10px">' + (st === 'Kosong' ? 'Admin payroll belum mengisi gaji periode ini.' : 'Admin payroll belum mengirim gaji periode ini untuk disetujui.') + ' Daftar di bawah ' + (st === 'Kosong' ? 'masih perkiraan dari data tetap tiap staf.' : 'masih bisa berubah.') + '</p>';
    }
    h += '</div>';
    var rows = d.rows || [], kel = [];
    rows.forEach(function (x) { if (kel.indexOf(x.kel) === -1) kel.push(x.kel); });
    h += '<div class="cd"><div class="kpl"><h3>Per staf</h3><span class="sb">klik nama untuk rincian</span></div><div class="gulir"><table class="tabel"><thead><tr><th>Nama</th><th class="r hp-x">Gaji pokok</th><th class="r hp-x">Tambahan</th><th class="r hp-x">Potongan</th><th class="r">THP</th></tr></thead><tbody>';
    kel.forEach(function (k) {
      h += '<tr><td colspan="5" style="background:#F7F9FB;font-weight:800">' + esc(k) + '</td></tr>';
      rows.filter(function (x) { return x.kel === k; }).forEach(function (x) {
        var tambah = (x.um || 0) + (x.lb || 0) + (x.bn || 0), potong = (x.bk || 0) + (x.tl || 0) + (x.ks || 0), buka = U.gr === x.n;
        h += '<tr><td><button type="button" data-gjr="' + esc(x.n) + '" style="all:unset;cursor:pointer;font-weight:700">' + esc(x.n) + '</button><small>' + esc(x.div || '') + (x.baru ? ' · belum diisi admin' : x.st && x.st !== st ? ' · ' + esc(x.st) : '') + '</small></td><td class="r angka hp-x">' + rp(x.gp) + '</td><td class="r angka hp-x">' + rp(tambah) + '</td><td class="r angka hp-x">' + (potong ? '−' + rp(potong) : rp(0)) + '</td><td class="r angka"><b>' + rp(x.thp) + '</b></td></tr>';
        if (buka) {
          var baris = [['Gaji pokok', x.gp], ['Uang makan', x.um], ['Lembur', x.lb], ['Bonus', x.bn], ['BPJS karyawan', -x.bk], ['Telat', -x.tl], ['Kasbon', -x.ks]].filter(function (b) { return b[1]; });
          h += '<tr><td colspan="5" style="background:#F7F9FB"><div class="rk" style="background:#fff">' + baris.map(function (b) { return '<div' + (b[1] < 0 ? ' class="mn"' : '') + '><span>' + b[0] + '</span><b class="angka">' + rp(b[1]) + '</b></div>'; }).join('') + '<div class="gs"></div><div class="hasil"><span>THP</span><b class="angka">' + rp(x.thp) + '</b></div>' + (x.bp ? '<div><span>BPJS ditanggung PT (tidak memotong THP)</span><b class="angka">' + rp(x.bp) + '</b></div>' : '') + '</div>' +
            (x.cat ? '<p class="sb">Catatan: ' + esc(x.cat) + '</p>' : '') + (x.oleh ? '<p class="sb">Diisi ' + esc(x.oleh) + (x.wi ? ' · ' + esc(x.wi) : '') + '</p>' : '') +
            (x.slip ? '<div class="aksi-baris" style="margin-top:8px">' + (x.wa ? '<a class="tbl pri" target="_blank" rel="noopener" href="https://wa.me/' + esc(x.wa) + '?text=' + encodeURIComponent('Halo ' + x.n + ', berikut slip gaji ' + d.nama + ' dari Moscow Supplies: ' + x.slip) + '">Kirim slip lewat WA</a>' : '<span class="sb">Nomor WA belum diisi di data staf.</span>') + '<a class="tbl" target="_blank" rel="noopener" href="' + esc(x.slip) + '">Buka slip</a></div>' : '') + '</td></tr>';
        }
      });
    });
    h += '</tbody></table></div></div>';
    var per = d.periode || [];
    h += '<div class="cd"><h3>Riwayat periode</h3>' + (per.length ? '<table class="tabel"><tbody>' + per.map(function (x) { return baris2('<b>' + esc(x.nama) + '</b><small>' + esc(x.st) + '</small>', rp(x.tot)); }).join('') + '</tbody></table>' : '<div class="ksg">Belum ada.</div>') + '</div>';
    return h + '<p class="sb">Data gaji disimpan terpisah dan hanya bisa dibuka akun manajemen. Isian lembur, bonus, telat, dan kasbon dikerjakan lewat aplikasi Payroll. Keputusan dari sini langsung tersimpan.</p>';
  }
  // Salin perubahan gaji ke Google Sheets sekarang (cadangan: sinkron otomatis tiap 30 menit).
  async function salinKeSheetGaji() {
    try {
      var s = await sb.auth.getSession(), t = s && s.data && s.data.session ? s.data.session.access_token : '';
      if (t) fetch('https://script.google.com/macros/s/AKfycbxcidGDrc33WJYcxzPf1dnRFzgafzbhwomXKlj3KjfYUHosPyI0qNpBcY9tvI7-PgI2/exec?app=balik', { method: 'POST', body: JSON.stringify({ t: t }), keepalive: true }).catch(function () { });
    } catch (e) { }
  }
  async function putusGaji(b) {
    var aksi = b.getAttribute('data-gja'), d = U.gaji[U.gp], cat = ($('gjCat') ? $('gjCat').value.trim() : '');
    var salah = function (t) { $('bUang').insertAdjacentHTML('afterbegin', '<div class="msg bad">' + esc(t) + '</div>'); window.scrollTo(0, 0); };
    if ((aksi === 'tolak' || aksi === 'buka') && cat.length < 3) { salah(aksi === 'tolak' ? 'Tulis alasan dikembalikan supaya admin tahu apa yang harus diperbaiki.' : 'Tulis alasan membuka kembali.'); return; }
    var kata = { setuju: 'Setujui gaji ' + d.nama + ' (total THP ' + rp(d.total.thp) + ')', tolak: 'Kembalikan gaji ' + d.nama + ' ke admin', buka: 'Buka kembali gaji ' + d.nama }[aksi];
    if (!confirm(kata + '?')) return;
    b.disabled = true;
    var r = await sb.rpc('gaji_putus', { p_per: d.per, p_aksi: aksi, p_catatan: cat });
    if (r.error) { salah('Gagal menyimpan: ' + r.error.message); b.disabled = false; return; }
    if (!r.data || !r.data.ok) { salah((r.data && r.data.pesan) || 'Gagal menyimpan.'); b.disabled = false; return; }
    salinKeSheetGaji();
    U.gaji = null; await muatGaji();
    $('bUang').insertAdjacentHTML('afterbegin', '<div class="msg ok">' + esc(r.data.pesan) + (aksi === 'setuju' ? ' Tombol kirim slip lewat WA muncul di rincian tiap staf beberapa menit lagi (muat ulang bagian Gaji).' : '') + '</div>');
  }

  function lapPilih() { return U.b === 'ini' ? D.acc : D.accLalu; }
  function isiLapUang() {
    var d = lapPilih(), h = pilihSub('ubl', U.b, [['ini', 'Bulan ini'], ['lalu', 'Bulan lalu']]);
    if (!d) return h + '<div class="msg w">Laporan accounting belum tersedia. Tekan "Hitung ulang sekarang".</div>';
    var L = d.lr;
    h += '<p class="tl">' + esc(namaBulan(d.bulan)) + ' · dihitung ' + esc(d.diperbarui) + '</p>';
    h += '<div class="kp"><div class="kt"><span class="l">Pendapatan</span><span class="v angka">' + jt(L.pend) + '</span><span class="k">' + rp(L.pend) + '</span></div><div class="kt"><span class="l">Pembelian barang &amp; bahan</span><span class="v angka">' + jt(L.beli) + '</span><span class="k">laba kotor ' + rp(L.kotor) + '</span></div>' +
      '<div class="kt"><span class="l">Biaya operasional</span><span class="v angka">' + jt(L.biaya) + '</span><span class="k">' + rp(L.biaya) + '</span></div><div class="kt"><span class="l">Laba bersih</span><span class="v angka' + (L.bersih < 0 ? ' mn' : '') + '">' + jt(L.bersih) + '</span><span class="k">' + rp(L.bersih) + '</span></div></div>';
    if ((d.peringatan || []).length || d.tanpaAkun) h += '<div class="msg w">' + (d.peringatan || []).map(esc).join('<br>') + (d.tanpaAkun ? (d.peringatan.length ? '<br>' : '') + 'Ada transaksi ' + rp(d.tanpaAkun) + ' tanpa akun.' : '') + '</div>';
    var akun = d.akun || [], sum = function (k) { return akun.reduce(function (s, a) { return s + (Number(a[k]) || 0); }, 0); };
    h += '<div class="cd"><div class="kpl"><h3>Saldo per akun</h3><span class="sb">Total akhir ' + rp(sum('akhir')) + '</span></div><div class="gulir"><table class="tabel"><thead><tr><th>Akun</th><th class="r hp-x">Awal</th><th class="r">Masuk</th><th class="r">Keluar</th><th class="r hp-x">Pindah</th><th class="r">Akhir</th></tr></thead><tbody>' + akun.map(function (a) {
      return '<tr' + (a.awal || a.akhir || a.masuk || a.keluar || a.pindah ? '' : ' style="opacity:.55"') + '><td><b>' + esc(a.n) + '</b><small>' + esc(a.j) + '</small></td><td class="r angka hp-x">' + rp(a.awal) + '</td><td class="r angka">' + rp(a.masuk) + '</td><td class="r angka">' + rp(a.keluar) + '</td><td class="r angka hp-x">' + (a.pindah ? (a.pindah > 0 ? '+' : '') + rp(a.pindah) : '–') + '</td><td class="r angka"><b>' + rp(a.akhir) + '</b></td></tr>'; }).join('') + '</tbody></table></div>' +
      '<p class="sb">Dana marketplace "belum cair" = penjualan yang uangnya masih di Shopee / Tokopedia / Lazada. Pindah = perpindahan antar akun (bukan pemasukan / pengeluaran).</p></div>';
    var kat = d.kat || [], blok = function (arah, judul) {
      var l = kat.filter(function (k) { return k.arah === arah; }), mx = Math.max.apply(null, l.map(function (k) { return k.v; }).concat([1])), tot = l.reduce(function (s, k) { return s + k.v; }, 0);
      return '<div class="cd"><div class="kpl"><h3>' + judul + '</h3><span class="sb angka">' + rp(tot) + '</span></div>' + (l.length ? l.map(function (k) {
        return '<div class="br"><div class="tx"><span>' + esc(k.n) + ' <span class="sb">· ' + esc(k.kel) + (k.auto ? ' · otomatis' : '') + '</span></span><b class="angka">' + rp(k.v) + '</b></div><div class="tr"><div class="is" style="width:' + Math.max(2, Math.round(k.v / mx * 100)) + '%"></div></div></div>'; }).join('') : '<div class="ksg">Belum ada.</div>') + '</div>';
    };
    h += '<div class="dua">' + blok('Masuk', 'Uang masuk per kategori') + blok('Keluar', 'Uang keluar per kategori') + '</div>';
    return h + '<p class="sb">Pencatatan uang masuk / keluar lewat <a href="form.html?f=akunting">form accounting</a>. Kategori "otomatis" berasal dari penjualan yang tercatat sendiri oleh sistem.</p>';
  }
  function isiTrx() {
    var d = lapPilih(), h = pilihSub('ubl', U.b, [['ini', 'Bulan ini'], ['lalu', 'Bulan lalu']]);
    if (!d) return h + '<div class="msg w">Laporan accounting belum tersedia.</div>';
    var l = (d.rinci || []).filter(function (r) { return (!U.arah || r.j === U.arah) && cocok([r.no, r.k, r.ket, r.a, r.a2, r.p].join(' '), U.q); });
    l = l.slice().sort(function (a, b) { return a.t < b.t ? 1 : a.t > b.t ? -1 : (a.no < b.no ? 1 : -1); });
    var tot = function (j) { return l.filter(function (r) { return r.j === j; }).reduce(function (s, r) { return s + r.v; }, 0); };
    h += '<div class="cd"><div class="aksi-baris" style="margin-bottom:8px"><input class="isian" id="uQ" placeholder="Cari no, kategori, keterangan, akun" value="' + esc(U.q) + '"></div>' + pilihSub('uar', U.arah, [['', 'Semua'], ['Masuk', 'Masuk'], ['Keluar', 'Keluar'], ['Pindah', 'Pindah akun']]) +
      '<p class="sb" style="margin:0 0 8px">' + l.length + ' transaksi · masuk ' + rp(tot('Masuk')) + ' · keluar ' + rp(tot('Keluar')) + '</p>';
    h += l.length ? '<div class="gulir"><table class="tabel"><tbody>' + l.slice(0, 300).map(function (r) {
      return '<tr><td><span class="label ' + (r.j === 'Masuk' ? 'ok' : r.j === 'Keluar' ? 'no' : 'biru') + '">' + esc(r.j) + '</span> ' + esc(r.k || (r.j === 'Pindah' ? r.a + ' → ' + r.a2 : '')) + '<small>' + esc(tglId(r.t)) + ' · ' + esc(r.no) + ' · ' + esc(r.j === 'Pindah' ? r.a + ' → ' + r.a2 : r.a) + (r.p ? ' · ' + esc(r.p) : '') + '</small>' + (r.ket ? '<small>' + esc(r.ket) + '</small>' : '') + '</td><td class="r angka"><b>' + rp(r.v) + '</b></td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="ksg">Tidak ada transaksi.</div>';
    if (d.rinciLebih) h += '<p class="sb">' + d.rinciLebih + ' transaksi lain tidak ikut ditampilkan (terlalu banyak).</p>';
    return h + '</div><p class="sb">Penjualan otomatis (marketplace, toko, reseller) tidak muncul satu per satu di sini; totalnya ada di Laporan bulanan.</p>';
  }
  function isiHbb() {
    var d = D.hbb; if (!d) return '<div class="msg w">Data harga belum tersedia. Tekan "Hitung ulang sekarang".</div>';
    var l = (d.harga || []).filter(function (x) { return cocok(x.n + ' ' + (x.k || '') + ' ' + (x.kel || '') + ' ' + (x.sup || ''), U.qh); });
    var h = '<div class="cd"><div class="kpl"><h3>Harga beli terakhir</h3><span class="sb">' + (d.harga || []).length + ' bahan &amp; kemasan</span></div><div class="aksi-baris" style="margin-bottom:8px"><input class="isian" id="uQh" placeholder="Cari bahan, kelompok, supplier" value="' + esc(U.qh) + '"></div>';
    h += l.length ? '<div class="gulir"><table class="tabel"><thead><tr><th>Bahan / kemasan</th><th class="r">Harga terakhir</th><th class="r">Sebelumnya</th></tr></thead><tbody>' + l.map(function (x) {
      return '<tr><td>' + esc(x.n) + '<small>' + esc(x.kel || '') + (x.k ? ' · ' + esc(x.k) : '') + (x.sup ? ' · ' + esc(x.sup) : '') + '</small></td><td class="r angka"><b>' + rp(x.hs) + '</b><small>/' + esc(x.s) + ' · ' + esc(tglId(x.t)) + '</small></td><td class="r angka">' + (x.hp ? rp(x.hp) + '<small>' + esc(tglId(x.tp)) + (x.pc !== null && x.pc !== undefined ? ' · <b style="color:var(--' + (x.pc > 0 ? 'merah' : x.pc < 0 ? 'hijau' : 'abu') + ')">' + (x.pc > 0 ? '+' : '') + String(x.pc).replace('.', ',') + '%</b>' : '') + '</small>' : '–') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="ksg">Belum ada data harga.</div>';
    h += '</div>';
    var u = d.ubah || [];
    if (u.length) h += '<div class="cd"><h3>Riwayat perubahan harga</h3><table class="tabel"><tbody>' + u.map(function (x) { return '<tr><td>' + esc(x.n) + '<small>' + esc(tglId(x.t)) + (x.sup ? ' · ' + esc(x.sup) : '') + '</small></td><td class="r angka">' + rp(x.hp) + ' → <b>' + rp(x.hs) + '</b>' + (x.pc ? '<small style="color:var(--' + (x.pc > 0 ? 'merah' : 'hijau') + ')">' + (x.pc > 0 ? '+' : '') + String(x.pc).replace('.', ',') + '%</small>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>';
    return h + '<p class="sb">Harga dari pembelian bahan baku (formulir staf bahan baku) dan stok masuk botol, stiker &amp; packaging (formulir staf produksi), per satuan.</p>';
  }
  function isiNaik() {
    var d = D.hrgnaik; if (!d) return '<div class="msg w">Data kenaikan harga belum tersedia.</div>';
    var l = d.list.filter(function (x) { return cocok(x.n + ' ' + x.kel + ' ' + x.sup + ' ' + x.sb, U.qn); });
    if (!d.list.length) return '<div class="cd"><div class="aman">Belum ada kenaikan harga beli yang tercatat.</div><p class="sb">Setiap PO, pengajuan, pembelian bahan baku, atau stok masuk kemasan yang harga satuannya lebih tinggi dari pembelian sebelumnya akan tercatat di sini dan dikirim ke grup Telegram.</p></div>';
    var naik = d.list.filter(function (x) { return x.pc > 0; }), rata = naik.length ? naik.reduce(function (s, x) { return s + x.pc; }, 0) / naik.length : 0, mx = naik.reduce(function (m, x) { return Math.max(m, x.pc); }, 0);
    var h = '<div class="kp"><div class="kt"><span class="l">Kenaikan tercatat</span><span class="v angka">' + d.list.length + '</span><span class="k">' + new Set(d.list.map(function (x) { return x.k || x.n; })).size + ' barang</span></div><div class="kt"><span class="l">Rata-rata naik</span><span class="v angka">' + dec(rata, 1) + '%</span><span class="k">tertinggi ' + dec(mx, 1) + '%</span></div></div>';
    h += '<div class="cd"><div class="aksi-baris" style="margin-bottom:8px"><input class="isian" id="uQn" placeholder="Cari barang, kelompok, supplier" value="' + esc(U.qn) + '"></div><div class="gulir"><table class="tabel"><tbody>' + l.slice(0, 300).map(function (x) {
      return '<tr><td>' + esc(x.n) + (x.w ? ' – ' + esc(x.w) : '') + '<small>' + esc(tglId(x.t)) + ' · ' + esc(x.kel) + ' · ' + esc(x.sb) + (x.no ? ' ' + esc(x.no) : '') + (x.sup ? ' · ' + esc(x.sup) : '') + (x.pg ? ' · ' + esc(x.pg) : '') + '</small></td><td class="r angka">' + rp(x.lama) + ' → <b>' + rp(x.baru) + '</b><small style="color:var(--merah)">+' + rp(x.sel) + ' · +' + dec(x.pc, 1) + '%</small></td></tr>'; }).join('') + '</tbody></table></div></div>';
    return h;
  }
  function isiTpb() {
    var d = D.tpb; if (!d) return '<div class="msg w">Data tutup buku belum tersedia.</div>';
    var cek = d.cek || [], belum = cek.filter(function (c) { return !c.ok; });
    var h = '<div class="cd"><div class="kpl"><h3>Persiapan tutup buku ' + esc(d.nb || '') + '</h3><span class="label ' + (d.tutup ? 'ok' : 'abu') + '">' + (d.tutup ? 'Sudah ditutup' : 'Belum ditutup') + '</span></div>' +
      (d.boleh ? '' : '<p class="sb" style="margin-top:-4px">Bulan berjalan belum bisa ditutup. Daftar ini menunjukkan apa saja yang perlu dibereskan sebelum akhir bulan.</p>') +
      (d.ring ? '<div class="kp" style="margin:8px 0"><div class="kt"><span class="l">Omzet</span><span class="v angka">' + jt(d.ring.omzet) + '</span></div><div class="kt"><span class="l">Pendapatan accounting</span><span class="v angka">' + jt(d.ring.pend) + '</span></div><div class="kt"><span class="l">Pembelian</span><span class="v angka">' + jt(d.ring.beli) + '</span></div><div class="kt"><span class="l">Biaya operasional</span><span class="v angka">' + jt(d.ring.ops) + '</span></div></div>' : '') +
      '<table class="tabel"><tbody>' + cek.map(function (c) {
        return '<tr><td><b>' + esc(c.j) + '</b>' + (c.berat && !c.ok ? ' <span class="label no">wajib</span>' : '') + '<small>' + esc(c.ket) + '</small></td><td class="r"><span class="label ' + (c.ok ? 'ok' : c.berat ? 'no' : 'w') + '">' + (c.ok ? 'Beres' : 'Belum') + '</span></td></tr>'; }).join('') + '</tbody></table>' +
      '<p class="sb">' + (belum.length ? belum.length + ' hal belum beres. ' : 'Semua sudah beres. ') + 'Penyeimbang stok dan tombol tutup buku tetap di menu Tutup Buku Master Data lama, karena mengubah banyak catatan sekaligus.</p></div>';
    var df = d.daftar || [];
    h += '<div class="cd"><h3>Riwayat tutup buku</h3>' + (df.length ? '<table class="tabel"><tbody>' + df.map(function (x) { return baris2('<b>' + esc(x.nb) + '</b><small>' + esc(x.oleh || '') + ' · ' + esc(x.w || '') + (x.c ? ' · ' + esc(x.c) : '') + '</small>', '<span class="label ' + (x.st === 'Tutup' || x.st === 'Ditutup' ? 'ok' : 'abu') + '">' + esc(x.st) + '</span>'); }).join('') + '</tbody></table>' : '<div class="ksg">Belum ada bulan yang ditutup.</div>') + '</div>';
    return h;
  }


  // ======================= RIWAYAT LAPORAN (riwayatLaporan lama, dihitung dari tabel yang disinkron) =======================
  var RW = { mulai: false, toko: '', jenis: '', buka: {}, data: null };
  var RW_JENIS = ['Penjualan', 'Biaya', 'Return', 'Hitung stok', 'Re-stock', 'Stok dipinjam', 'Penyesuaian stok'];
  var RW_WARNA = { 'Penjualan': 'ok', 'Biaya': 'w', 'Return': 'no', 'Hitung stok': 'biru', 'Re-stock': 'biru', 'Stok dipinjam': 'abu', 'Penyesuaian stok': 'abu' };
  function geserHari(t, n) { var d = new Date(t + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function isoMks(t, akhir) { return t + (akhir ? 'T23:59:59.999+08:00' : 'T00:00:00+08:00'); }
  function jamMks(iso) { try { return new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Makassar', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)).replace(/\./g, ':'); } catch (e) { return String(iso).slice(0, 16).replace('T', ' '); } }
  function hariMks(iso) { try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date(iso)); } catch (e) { return String(iso).slice(0, 10); } }
  function namaPengisi(p) { p = tr(p).replace(/^(form|kasir|staf)\s*:?\s*/i, ''); return p || 'formulir toko (tanpa nama)'; }
  function siapRiwayat() { var hi = hariIniMks(); RW.dari = geserHari(hi, -6); RW.sampai = hi; gambarRiwayat(); muatRiwayat(); }
  async function muatRiwayat() {
    var el = $('rwIsi'); if (el) el.innerHTML = '<div class="ksg">Memuat riwayat…</div>';
    try {
      var a = isoMks(RW.dari), b = isoMks(RW.sampai, true);
      var q = function (t, kol, w) { return ambilSemua(function () { return sb.from(t).select(kol).gte(w, a).lte(w, b).order('id'); }); };
      var akhir = function (t, w, kt) { return sb.from(t).select(kt + ',' + w).order(w, { ascending: false }).limit(800); };
      var h = await Promise.all([
        q('toko_jual_log', 'tanggal,toko,kode,nama_barang,qty_terjual,total,waktu_masuk,pengisi,warna,no_nota,diskon_persen', 'waktu_masuk'),
        q('toko_biaya_log', 'tanggal,toko,keterangan,nominal,waktu_masuk,pengisi', 'waktu_masuk'),
        q('toko_retur_log', 'tanggal,toko,kode,nama_barang,qty,nilai,waktu_masuk,pengisi,warna,kondisi,catatan', 'waktu_masuk'),
        q('toko_hitung_log', 'waktu_hitung,toko,kode,nama_barang,warna,qty_hitung,pengisi,catatan', 'waktu_hitung'),
        q('order_log', 'no_order,tanggal,pelanggan,kode,nama,qty,total,status,waktu_masuk,pengisi,catatan', 'waktu_masuk'),
        q('toko_pinjam_log', 'no_pinjam,jenis,tanggal,toko,kode,nama_barang,warna,qty,peminjam,catatan,waktu_masuk,pengisi', 'waktu_masuk'),
        q('toko_sesuai_log', 'no,waktu_ajuan,toko,kode,nama_barang,warna,stok_sistem,hasil_hitung,selisih,alasan,pengaju,status', 'waktu_ajuan'),
        sb.from('pelanggan').select('nama_pelanggan,tipe').order('baris_sheet'),
        akhir('toko_jual_log', 'waktu_masuk', 'toko'), akhir('toko_biaya_log', 'waktu_masuk', 'toko'), akhir('toko_retur_log', 'waktu_masuk', 'toko'),
        akhir('toko_hitung_log', 'waktu_hitung', 'toko'), akhir('order_log', 'waktu_masuk', 'pelanggan'), akhir('toko_pinjam_log', 'waktu_masuk', 'toko'), akhir('toko_sesuai_log', 'waktu_ajuan', 'toko')
      ]);
      var toko = ((h[7] && h[7].data) || []).filter(function (x) { return tr(x.tipe) === 'Consignment'; }).map(function (x) { return tr(x.nama_pelanggan); });
      var terakhir = {};
      [[8, 'waktu_masuk', 'toko'], [9, 'waktu_masuk', 'toko'], [10, 'waktu_masuk', 'toko'], [11, 'waktu_hitung', 'toko'], [12, 'waktu_masuk', 'pelanggan'], [13, 'waktu_masuk', 'toko'], [14, 'waktu_ajuan', 'toko']].forEach(function (z) {
        ((h[z[0]] && h[z[0]].data) || []).forEach(function (r) { var t = tr(r[z[2]]), w = r[z[1]]; if (w && (!terakhir[t] || w > terakhir[t])) terakhir[t] = w; });
      });
      var grup = {}, urut = [];
      var masuk = function (jenis, t, waktu, pengisi, tetap) {
        t = tr(t); if (toko.indexOf(t) === -1 || !waktu) return null;
        var ms = new Date(waktu).getTime(), k = jenis + '|' + t + '|' + (tetap || (Math.floor(ms / 1000) + '|' + tr(pengisi)));
        if (!grup[k]) { grup[k] = { j: jenis, toko: t, ms: ms, w: jamMks(waktu), p: namaPengisi(pengisi), t1: '', t2: '', n: 0, q: 0, tot: 0, ket: '', items: [] }; urut.push(grup[k]); }
        return grup[k];
      };
      var tgl = function (g, v) { if (!v) return; if (!g.t1 || v < g.t1) g.t1 = v; if (!g.t2 || v > g.t2) g.t2 = v; };
      var n = function (v) { v = Number(v); return isFinite(v) ? v : 0; };
      h[0].forEach(function (r) { var nota = tr(r.no_nota), g = masuk('Penjualan', r.toko, r.waktu_masuk, r.pengisi, nota ? 'nota|' + nota : ''); if (!g) return; tgl(g, r.tanggal); g.n++; g.q += n(r.qty_terjual); g.tot += n(r.total); if (nota) g.ket = 'Nota ' + nota + (n(r.diskon_persen) ? ', diskon ' + n(r.diskon_persen) + '%' : ''); g.items.push({ k: tr(r.kode), n: tr(r.nama_barang), w: tr(r.warna), q: n(r.qty_terjual), tot: n(r.total) }); });
      h[1].forEach(function (r) { var g = masuk('Biaya', r.toko, r.waktu_masuk, r.pengisi, ''); if (!g) return; tgl(g, r.tanggal); g.n++; g.tot += n(r.nominal); g.items.push({ n: tr(r.keterangan), tot: n(r.nominal) }); });
      h[2].forEach(function (r) { var g = masuk('Return', r.toko, r.waktu_masuk, r.pengisi, ''); if (!g) return; tgl(g, r.tanggal); g.n++; g.q += n(r.qty); g.tot += n(r.nilai); g.items.push({ k: tr(r.kode), n: tr(r.nama_barang), w: tr(r.warna), q: n(r.qty), tot: n(r.nilai), x: tr(r.kondisi) + (tr(r.catatan) ? ' – ' + tr(r.catatan) : '') }); });
      h[3].forEach(function (r) { var g = masuk('Hitung stok', r.toko, r.waktu_hitung, r.pengisi, ''); if (!g) return; g.n++; g.q += n(r.qty_hitung); if (!g.ket && tr(r.catatan)) g.ket = 'Catatan: ' + tr(r.catatan); g.items.push({ k: tr(r.kode), n: tr(r.nama_barang), w: tr(r.warna), q: n(r.qty_hitung) }); });
      h[4].forEach(function (r) { var no = tr(r.no_order); if (!no) return; var g = masuk('Re-stock', r.pelanggan, r.waktu_masuk, r.pengisi, 'no|' + no); if (!g) return; tgl(g, r.tanggal); g.n++; g.q += n(r.qty); g.tot += n(r.total); g.ket = 'No ' + no + ', status ' + (tr(r.status) || 'Menunggu') + (tr(r.catatan) ? ', catatan: ' + tr(r.catatan) : ''); g.items.push({ k: tr(r.kode), n: tr(r.nama), q: n(r.qty), tot: n(r.total) }); });
      h[5].forEach(function (r) { var no = tr(r.no_pinjam), jn = tr(r.jenis).toUpperCase(), g = masuk('Stok dipinjam', r.toko, r.waktu_masuk, r.pengisi, no ? 'no|' + no + '|' + jn : ''); if (!g) return; tgl(g, r.tanggal); g.n++; g.q += n(r.qty); g.ket = (jn === 'KEMBALI' ? 'Dikembalikan' : 'Dipinjam') + (tr(r.peminjam) ? ' oleh ' + tr(r.peminjam) : '') + (no ? ', no ' + no : '') + (tr(r.catatan) ? ', catatan: ' + tr(r.catatan) : ''); g.items.push({ k: tr(r.kode), n: tr(r.nama_barang), w: tr(r.warna), q: n(r.qty) }); });
      h[6].forEach(function (r) { var no = tr(r.no), g = masuk('Penyesuaian stok', r.toko, r.waktu_ajuan, r.pengaju, no ? 'no|' + no : ''); if (!g) return; g.n++; g.q += n(r.hasil_hitung); g.ket = (no ? 'No ' + no + ', ' : '') + 'status ' + (tr(r.status) || 'Menunggu') + (tr(r.alasan) ? ', alasan: ' + tr(r.alasan) : ''); g.items.push({ k: tr(r.kode), n: tr(r.nama_barang), w: tr(r.warna), q: n(r.hasil_hitung), x: 'stok sistem ' + n(r.stok_sistem) + ', selisih ' + n(r.selisih) }); });
      urut.sort(function (x, y) { return y.ms - x.ms; });
      urut.forEach(function (g) { if (g.t1) g.t = g.t1 === g.t2 ? tglId(g.t1) : tglId(g.t1) + ' – ' + tglId(g.t2); });
      RW.data = { toko: toko, terakhir: terakhir, grup: urut };
      RW.buka = {};
    } catch (e) { if ($('rwIsi')) $('rwIsi').innerHTML = '<div class="msg bad">Riwayat gagal dimuat: ' + esc(e.message || e) + '</div>'; return; }
    gambarRiwayat();
  }
  function gambarRiwayat() {
    var el = $('bRiwayat'); if (!el || !RW.dari) return;
    var d = RW.data, h = '<div class="periode"><label>Dari<input class="isian" type="date" id="rwDari" value="' + RW.dari + '"></label><label>Sampai<input class="isian" type="date" id="rwSampai" value="' + RW.sampai + '"></label>' +
      '<button type="button" class="tbl" data-rwc="7">7 hari</button><button type="button" class="tbl" data-rwc="bulan">Bulan ini</button><button type="button" class="tbl pri" id="rwTampil">Tampilkan</button></div><div id="rwIsi">';
    if (!d) h += '<div class="ksg">Memuat riwayat…</div>';
    else {
      var hi = hariIniMks(), list = d.grup.filter(function (g) { return (!RW.toko || g.toko === RW.toko) && (!RW.jenis || g.j === RW.jenis); });
      h += '<div class="cd"><div class="kpl"><h3>Aktivitas tiap toko</h3><span class="sb">Terakhir mengisi dihitung dari semua waktu</span></div><table class="tabel"><thead><tr><th>Toko</th><th class="r">Laporan</th><th class="r">Terjual</th></tr></thead><tbody>' + d.toko.map(function (t) {
        var w = d.terakhir[t], lama = w ? Math.round((new Date(hi + 'T00:00:00Z') - new Date(hariMks(w) + 'T00:00:00Z')) / 86400000) : null;
        var g = d.grup.filter(function (x) { return x.toko === t; }), pcs = g.filter(function (x) { return x.j === 'Penjualan'; }).reduce(function (s, x) { return s + x.q; }, 0);
        return '<tr><td><b>' + esc(t) + '</b><small>' + (w ? 'Terakhir ' + esc(jamMks(w)) + ' <span class="label ' + (lama >= 2 ? 'no' : 'ok') + '">' + (lama <= 0 ? 'hari ini' : lama === 1 ? 'kemarin' : lama + ' hari lalu') + '</span>' : '<span class="label no">Belum pernah mengisi</span>') + '</small></td><td class="r angka">' + fmt(g.length) + '</td><td class="r angka">' + fmt(pcs) + ' pcs</td></tr>'; }).join('') + '</tbody></table></div>';
      h += '<div class="cd"><div class="aksi-baris" style="margin-bottom:8px"><select class="st-order" id="rwToko"><option value="">Semua toko</option>' + d.toko.map(function (t) { return '<option' + (RW.toko === t ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select>' +
        '<select class="st-order" id="rwJenis"><option value="">Semua jenis laporan</option>' + RW_JENIS.map(function (j) { return '<option' + (RW.jenis === j ? ' selected' : '') + '>' + j + '</option>'; }).join('') + '</select></div><p class="sb" style="margin:0">' + list.length + ' laporan · ' + esc(tglId(RW.dari)) + ' – ' + esc(tglId(RW.sampai)) + '</p></div>';
      h += list.length ? list.slice(0, 300).map(function (g, i) {
        var kanan = (g.j === 'Biaya' ? g.n + ' biaya' : g.n + ' barang · ' + fmt(g.q) + ' pcs') + (g.tot > 0 ? ' · ' + rp(g.tot) : '');
        var adaW = g.items.some(function (x) { return x.w; }), adaX = g.items.some(function (x) { return x.x; });
        return '<details class="cd"><summary style="cursor:pointer;list-style:none"><div class="rq-kpl"><h3 style="font-size:15px"><span class="label ' + (RW_WARNA[g.j] || 'abu') + '">' + esc(g.j) + '</span> ' + esc(g.toko) + '</h3><span class="sb angka">' + kanan + '</span></div>' +
          '<div class="sb" style="margin-top:4px">Diisi ' + esc(g.w) + ' oleh ' + esc(g.p) + (g.t ? ' · untuk tanggal ' + esc(g.t) : '') + '</div>' + (g.ket ? '<div class="sb">' + esc(g.ket) + '</div>' : '') + '</summary>' +
          '<div class="gulir"><table class="tabel" style="margin-top:8px"><tbody>' + g.items.slice(0, 200).map(function (x) {
            return '<tr><td>' + esc(x.n) + (adaW && x.w ? ' – ' + esc(x.w) : '') + '<small>' + esc(x.k || '') + (adaX && x.x ? ' · ' + esc(x.x) : '') + '</small></td>' + (g.j === 'Biaya' ? '' : '<td class="r angka">' + fmt(x.q) + '</td>') + '<td class="r angka">' + (x.tot !== undefined ? rp(x.tot) : '') + '</td></tr>'; }).join('') + '</tbody></table></div>' + (g.items.length > 200 ? '<p class="sb">' + (g.items.length - 200) + ' baris lain tidak ditampilkan.</p>' : '') + '</details>';
      }).join('') + (list.length > 300 ? '<p class="sb">Menampilkan 300 laporan terbaru. Persempit periodenya untuk melihat yang lain.</p>' : '') : '<div class="cd"><div class="ksg">Tidak ada laporan pada periode ini.</div></div>';
      h += '<p class="sb">Riwayat laporan toko & consignment yang diisi staf, dikelompokkan per kali kirim. Data masuk paling lambat 30 menit setelah staf mengirim. Riwayat laporan staf produksi dan bahan baku ada di menu Produksi (Aktivitas).</p>';
    }
    h += '</div>';
    el.innerHTML = h;
    $('rwTampil').onclick = function () { RW.dari = $('rwDari').value; RW.sampai = $('rwSampai').value; if (RW.dari > RW.sampai) { var t = RW.dari; RW.dari = RW.sampai; RW.sampai = t; } RW.data = null; gambarRiwayat(); muatRiwayat(); };
    el.querySelectorAll('[data-rwc]').forEach(function (b) { b.onclick = function () { var hi = hariIniMks(); RW.sampai = hi; RW.dari = b.getAttribute('data-rwc') === '7' ? geserHari(hi, -6) : hi.slice(0, 8) + '01'; RW.data = null; gambarRiwayat(); muatRiwayat(); }; });
    var st = $('rwToko'), sj = $('rwJenis');
    if (st) st.onchange = function () { RW.toko = st.value; gambarRiwayat(); };
    if (sj) sj.onchange = function () { RW.jenis = sj.value; gambarRiwayat(); };
  }

  // ======================= PENGATURAN (Pelanggan & Link) =======================
  var AT = { mulai: false, data: null, bagian: 'pel', stok: null, q: '', kat: '', buka: null, f: 'harga', ql: '' };
  async function muatAtur() {
    var h = await Promise.all([sb.from('pelanggan').select('nama_pelanggan,tipe,diskon_persen,catatan,link_order').order('baris_sheet'), sb.from('hasil_hitung').select('data,dibuat').eq('kunci', 'stok:semua'), sb.from('pengguna').select('email,nama,peran,lingkup,aktif,catatan,dibuat').order('dibuat')]);
    AT.peng = h[2].error ? null : h[2].data || [];
    AT.data = h[0].error ? { galat: h[0].error.message } : h[0].data || [];
    AT.stok = (!h[1].error && h[1].data && h[1].data[0]) ? h[1].data[0].data : null;
    gambarAtur();
    // Stok semua lokasi dihitung langsung (stoksemua.js); potret Apps Script dipakai dulu supaya cepat tampil.
    if (window.StokSemua) window.StokSemua.hitung(sb).then(function (d) { if (d && d.ok && !d.gagal.length) { AT.stok = d; gambarAtur(); } }, function () { });
  }
  function gambarAtur() {
    var el = $('bAtur'); if (!el) return;
    var B = D.barang;
    var h = '<div id="msgAtur"></div><div class="chip" role="group" aria-label="Bagian pengaturan">' + [['pel', 'Pelanggan & link', AT.data && AT.data.length ? AT.data.length + ' pelanggan' : ''], ['brg', 'Edit barang', B ? B.barang.length + ' barang' : ''], ['log', 'Riwayat perubahan', B ? B.log.length + ' catatan' : ''], ['akses', 'Akses & perangkat', D.akses && D.akses.tunggu ? D.akses.tunggu + ' minta izin' : (AT.peng ? AT.peng.length + ' akun' : '')]].map(function (x) {
      return '<button type="button" data-atb="' + x[0] + '" aria-pressed="' + (AT.bagian === x[0]) + '"><span>' + x[1] + '</span><b>' + (x[2] || '&nbsp;') + '</b></button>'; }).join('') + '</div>';
    try { h += AT.bagian === 'pel' ? isiPelanggan() : AT.bagian === 'brg' ? isiEditBarang() : AT.bagian === 'akses' ? isiAkses() : isiLogBarang(); }
    catch (e) { h += '<div class="msg bad">Bagian ini gagal ditampilkan: ' + esc(e.message) + '</div>'; }
    el.innerHTML = h;
    el.querySelectorAll('[data-atb]').forEach(function (b) { b.onclick = function () { AT.bagian = b.getAttribute('data-atb'); gambarAtur(); }; });
    var salin = function (teks) { var ok = function () { $('msgAtur').innerHTML = '<div class="msg ok">Link disalin.</div>'; }; if (navigator.clipboard) navigator.clipboard.writeText(teks).then(ok, function () { prompt('Salin link ini:', teks); }); else prompt('Salin link ini:', teks); };
    el.querySelectorAll('[data-salin]').forEach(function (b) { b.onclick = function () { salin(AT.data[Number(b.getAttribute('data-salin'))].link_order); }; });
    el.querySelectorAll('[data-salin-url]').forEach(function (b) { b.onclick = function () { salin(b.getAttribute('data-salin-url')); }; });
    el.querySelectorAll('[data-eb]').forEach(function (b) { b.onclick = function () { var k = b.getAttribute('data-eb'); AT.buka = AT.buka === k ? null : k; AT.f = 'harga'; gambarAtur(); }; });
    el.querySelectorAll('[data-ebf]').forEach(function (b) { b.onclick = function () { AT.f = b.getAttribute('data-ebf'); gambarAtur(); }; });
    el.querySelectorAll('[data-eb-simpan]').forEach(function (b) { b.onclick = function () { simpanBarang(b); }; });
    el.querySelectorAll('[data-akf]').forEach(function (b) { b.onclick = function () { AT.akf = b.getAttribute('data-akf'); gambarAtur(); }; });
    el.querySelectorAll('[data-pg]').forEach(function (b) { b.onclick = function () { var e = b.getAttribute('data-pg'); AT.pgBuka = AT.pgBuka === e ? null : e; gambarAtur(); }; });
    el.querySelectorAll('[data-pg-simpan]').forEach(function (b) { b.onclick = function () { simpanPengguna(b); }; });
    el.querySelectorAll('[data-pg-peran]').forEach(function (s2) { s2.onchange = function () { var w = s2.closest('[data-pgform]'), l = w.querySelector('[data-f="lingkup"]'); if (l) l.closest('label').style.display = s2.value === 'toko' ? '' : 'none'; }; });
    el.querySelectorAll('[data-ak]').forEach(function (b) { b.onclick = function () { putusPerangkat(b); }; });
    var lk = $('ebLok'); if (lk) lk.onchange = function () { AT.lok = lk.value; gambarAtur(); };
    var kt = $('ebKat'); if (kt) kt.onchange = function () { AT.kat = kt.value; gambarAtur(); };
    ['ebQ', 'ebQl'].forEach(function (id) { var c = $(id); if (c) c.oninput = function () { var pos = c.selectionStart; if (id === 'ebQ') AT.q = c.value; else AT.ql = c.value; gambarAtur(); var c2 = $(id); c2.focus(); try { c2.setSelectionRange(pos, pos); } catch (e) { } }; });
    var on = el.querySelector('[data-atb][aria-pressed="true"]');
    if (on && on.parentNode.scrollWidth > on.parentNode.clientWidth) on.parentNode.scrollLeft = Math.max(0, on.offsetLeft - on.parentNode.offsetLeft - 16);
  }
  function isiPelanggan() {
    var d = AT.data, dasar = location.href.replace(/[^\/]*([?#].*)?$/, ''), h = '';
    h += '<div class="cd"><div class="kpl"><h3>Pelanggan &amp; link formulir</h3><span class="sb">' + (d && d.length ? d.length + ' pelanggan' : '') + '</span></div>';
    if (!d) h += '<div class="ksg">Memuat…</div>';
    else if (d.galat) h += '<div class="msg bad">Gagal memuat: ' + esc(d.galat) + '</div>';
    else h += '<table class="tabel"><tbody>' + d.map(function (x, i) {
      return '<tr><td><b>' + esc(x.nama_pelanggan) + '</b><small>' + esc(x.tipe) + (x.diskon_persen ? ' · diskon ' + fmt(x.diskon_persen) + '%' : '') + (x.catatan ? ' · ' + esc(x.catatan) : '') + '</small></td><td class="r">' + (x.link_order ? '<button type="button" class="tbl" data-salin="' + i + '">Salin link</button>' : '<span class="sb">–</span>') + '</td></tr>'; }).join('') + '</tbody></table>' +
      '<p class="sb">Link formulir order / laporan untuk tiap toko dan reseller. Jangan bagikan link satu toko ke toko lain. Menambah pelanggan atau mengubah diskon masih lewat menu Pelanggan &amp; Link di Master Data lama.</p>';
    h += '</div><div class="cd"><h3>Aplikasi baru</h3><table class="tabel"><tbody>' + [['Master Data', 'master.html', 'manajemen Moscow Supplies'], ['Kendali Bisnis', 'kendali.html', 'manajemen, Mike, kendali bisnis'], ['Stok', 'stok.html', 'manajemen, accounting, gudang, staf toko (lokasinya sendiri)'], ['Kasir Toko Offline', 'kasir.html', 'staf toko offline'], ['Manager Kreatif', 'kreatif.html', 'manajemen, manager kreatif, tim kreatif']].map(function (a) {
      return '<tr><td><b>' + a[0] + '</b><small>Untuk ' + esc(a[2]) + ' · masuk dengan akun Google yang terdaftar</small></td><td class="r"><button type="button" class="tbl" data-salin-url="' + esc(dasar + a[1]) + '">Salin link</button></td></tr>'; }).join('') + '</tbody></table></div>';
    return h;
  }

  // ---------- Akses & perangkat ----------
  AT.akf = 'Menunggu'; AT.pgBuka = null;
  var PERAN = [['manajemen', 'Manajemen Moscow Supplies', 'Semua aplikasi'], ['kendali_bisnis', 'Kendali Bisnis', 'Kendali Bisnis, Stok'], ['accounting', 'Accounting', 'Stok, laporan keuangan'], ['gudang', 'Gudang Utama', 'Stok'], ['purchasing_shopeepay', 'Purchasing', 'Stok'], ['produksi', 'Staf produksi', 'Stok'], ['bahan_baku', 'Staf bahan baku', 'Stok'], ['payroll', 'Admin gaji', '–'], ['toko', 'Staf toko', 'Stok tokonya sendiri, Kasir (toko offline)'], ['kreatif_manager', 'Manager kreatif', 'Manager Kreatif (semua fitur)'], ['kreatif', 'Tim kreatif', 'Manager Kreatif (papan, tugas, catatan)']];
  function namaPeran(p) { for (var i = 0; i < PERAN.length; i++) if (PERAN[i][0] === p) return PERAN[i][1]; return p || '–'; }
  function emailSaya() { return D.email || ''; }
  function isiAkses() {
    var h = '', P2 = AT.peng, toko = (AT.data && !AT.data.galat ? AT.data : []).filter(function (x) { return x.tipe === 'Consignment'; }).map(function (x) { return x.nama_pelanggan; });
    // Akun aplikasi baru
    h += '<div class="cd"><div class="kpl"><h3>Akun aplikasi baru</h3><span class="sb">masuk dengan akun Google</span></div>';
    if (!P2) h += '<div class="msg bad">Daftar akun gagal dimuat.</div>';
    else {
      var form = function (x, baru) {
        var id = baru ? '__baru' : x.email, pr = x ? x.peran : 'toko';
        return '<div class="mini" data-pgform="' + esc(id) + '" style="background:#F7F9FB;padding:10px;border-radius:12px;margin:6px 0">' +
          (baru ? '<label>Email Google<input class="isian" type="email" data-f="email" placeholder="nama@gmail.com"></label>' : '') +
          '<label>Nama<input class="isian" data-f="nama" maxlength="60" value="' + esc(x ? x.nama || '' : '') + '"></label>' +
          '<label>Peran<select class="isian" data-f="peran" data-pg-peran="1">' + PERAN.map(function (r) { return '<option value="' + r[0] + '"' + (r[0] === pr ? ' selected' : '') + '>' + esc(r[1]) + '</option>'; }).join('') + '</select></label>' +
          '<label' + (pr === 'toko' ? '' : ' style="display:none"') + '>Toko<select class="isian" data-f="lingkup"><option value="">Pilih toko</option>' + toko.map(function (t) { return '<option' + (x && x.lingkup === t ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select></label>' +
          (baru ? '' : '<label class="cek"><input type="checkbox" data-f="aktif"' + (x.aktif !== false ? ' checked' : '') + '> Aktif (boleh masuk)</label>') +
          '<label style="grid-column:1/-1">Catatan<input class="isian" data-f="catatan" maxlength="200" value="' + esc(x ? x.catatan || '' : '') + '"></label>' +
          '<div class="aksi-baris" style="grid-column:1/-1"><button type="button" class="tbl pri" data-pg-simpan="' + esc(id) + '">' + (baru ? 'Tambah akun' : 'Simpan') + '</button></div></div>';
      };
      h += '<table class="tabel"><tbody>' + P2.map(function (x) {
        var saya = x.email === emailSaya();
        return '<tr' + (x.aktif === false ? ' style="opacity:.55"' : '') + '><td><b>' + esc(x.nama || x.email) + '</b>' + (saya ? ' <span class="label biru">akun ini</span>' : '') + (x.aktif === false ? ' <span class="label no">nonaktif</span>' : '') + '<small>' + esc(x.email) + '</small>' + (x.catatan ? '<small>' + esc(x.catatan) + '</small>' : '') + '</td>' +
          '<td>' + esc(namaPeran(x.peran)) + (x.lingkup ? '<small>' + esc(x.lingkup) + '</small>' : '') + '</td><td class="r">' + (saya ? '' : '<button type="button" class="tbl" data-pg="' + esc(x.email) + '">' + (AT.pgBuka === x.email ? 'Tutup' : 'Ubah') + '</button>') + '</td></tr>' +
          (AT.pgBuka === x.email ? '<tr><td colspan="3">' + form(x, false) + '</td></tr>' : '');
      }).join('') + '</tbody></table>';
      h += AT.pgBuka === '__baru' ? form(null, true) : '<div class="aksi-baris" style="margin-top:8px"><button type="button" class="tbl pri" data-pg="__baru">+ Tambah akun</button></div>';
      h += '<p class="sb">Akun baru juga perlu didaftarkan sebagai pengguna uji di Google selama aplikasi masih tahap uji; beri tahu saya emailnya. Akun sendiri tidak bisa diubah dari sini supaya tidak terkunci.</p>';
    }
    h += '</div>';
    // Perangkat link lama
    var A = D.akses;
    h += '<div class="cd"><div class="kpl"><h3>Izin perangkat link lama</h3><span class="sb">Diperbarui ' + waktuPotret('akses') + '</span></div>';
    if (!A) return h + '<div class="msg w">Daftar perangkat belum tersedia. Tekan "Hitung ulang sekarang".</div></div>';
    var hit = function (st) { return A.list.filter(function (x) { return st === 'lain' ? (x.st === 'Ditolak' || x.st === 'Dicabut') : x.st === st; }).length; };
    h += pilihSub('akf', AT.akf, [['Menunggu', 'Minta izin (' + hit('Menunggu') + ')'], ['Diizinkan', 'Diizinkan (' + hit('Diizinkan') + ')'], ['lain', 'Ditolak / dicabut (' + hit('lain') + ')']]);
    var antre = {}, ms = new Date(D.waktu.akses || 0).getTime();
    D.aksi.forEach(function (a) { if (a.fungsi === 'aksesPutus' && a.param && !(a.param.no in antre)) antre[a.param.no] = a; });
    var l = A.list.filter(function (x) { return AT.akf === 'lain' ? (x.st === 'Ditolak' || x.st === 'Dicabut') : x.st === AT.akf; });
    var grup = {}, urut = [];
    l.forEach(function (x) { if (!grup[x.n]) { grup[x.n] = []; urut.push(x.n); } grup[x.n].push(x); });
    if (!l.length) h += '<div class="ksg">' + (AT.akf === 'Menunggu' ? 'Tidak ada perangkat yang minta izin.' : 'Tidak ada.') + '</div>';
    urut.forEach(function (n) {
      h += '<h4 style="margin:12px 0 4px;font-size:13.5px">' + esc(n) + ' <span class="sb" style="font-weight:600">· ' + grup[n].length + '</span></h4><table class="tabel"><tbody>' + grup[n].map(function (x) {
        var a = antre[x.no], tunggu = a && a.status === 'menunggu', tombol = '';
        if (!tunggu) {
          if (x.st === 'Menunggu') tombol = '<button type="button" class="tbl pri" data-ak="izin" data-no="' + esc(x.no) + '">Izinkan</button> <button type="button" class="tbl" data-ak="tolak" data-no="' + esc(x.no) + '">Tolak</button>';
          else if (x.st === 'Diizinkan') tombol = '<button type="button" class="tbl" data-ak="cabut" data-no="' + esc(x.no) + '">Cabut</button>';
          else tombol = '<button type="button" class="tbl" data-ak="izin" data-no="' + esc(x.no) + '">Izinkan lagi</button>';
        }
        return '<tr><td><b>' + esc(x.nama || 'tanpa nama') + '</b><small>' + esc(x.ua || '') + '</small><small>' + esc(x.no) + ' · minta ' + esc(x.wm) + (x.wk ? ' · ' + esc(x.st.toLowerCase()) + ' ' + esc(x.wk) + (x.oleh ? ' oleh ' + esc(x.oleh) : '') : '') + (x.pakai ? ' · terakhir dipakai ' + esc(x.pakai) : '') + '</small>' + catatanAntre(a, ms) + '</td>' +
          '<td class="r" style="white-space:nowrap">' + (tunggu ? '<span class="label abu">diterapkan…</span>' : tombol) + '</td></tr>';
      }).join('') + '</tbody></table>';
    });
    return h + '<p class="sb">Perangkat = browser di HP/laptop yang membuka link formulir lama (Apps Script). Keputusan dari sini berlaku paling lambat 10 menit kemudian. "Cabut semua akses sekaligus" tetap lewat Keamanan Perangkat di Master Data lama (untuk keadaan darurat).</p></div>';
  }
  async function simpanPengguna(b) {
    var id = b.getAttribute('data-pg-simpan'), w = $('bAtur').querySelector('[data-pgform="' + id + '"]');
    var v = function (f) { var i = w.querySelector('[data-f="' + f + '"]'); return !i ? null : i.type === 'checkbox' ? i.checked : i.value.trim(); };
    var salah = function (t) { $('msgAtur').innerHTML = '<div class="msg bad">' + esc(t) + '</div>'; window.scrollTo(0, 0); };
    var email = id === '__baru' ? String(v('email') || '').toLowerCase() : id, peran = v('peran'), lingkup = peran === 'toko' ? v('lingkup') : null;
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(email)) { salah('Email tidak valid.'); return; }
    if (email === emailSaya()) { salah('Akun sendiri tidak bisa diubah dari sini.'); return; }
    if (id === '__baru' && AT.peng.some(function (x) { return x.email === email; })) { salah('Email ini sudah terdaftar.'); return; }
    if (!v('nama')) { salah('Nama belum diisi.'); return; }
    if (peran === 'toko' && !lingkup) { salah('Pilih tokonya untuk peran Staf toko.'); return; }
    if (peran === 'manajemen' && !confirm('Peran Manajemen bisa melihat dan mengubah semua data, termasuk gaji. Lanjutkan?')) return;
    var row = { email: email, nama: v('nama'), peran: peran, lingkup: lingkup || null, catatan: v('catatan') || null };
    if (id !== '__baru') row.aktif = v('aktif') !== false;
    b.disabled = true;
    var r = id === '__baru' ? await sb.from('pengguna').insert(Object.assign({ aktif: true }, row)) : await sb.from('pengguna').update(row).eq('email', email);
    if (r.error) { salah('Gagal menyimpan: ' + r.error.message); b.disabled = false; return; }
    AT.pgBuka = null; await muatAtur();
    $('msgAtur').innerHTML = '<div class="msg ok">' + esc(id === '__baru' ? 'Akun ' + email + ' ditambahkan sebagai ' + namaPeran(peran) + (lingkup ? ' (' + lingkup + ')' : '') + '. Beri tahu saya emailnya supaya didaftarkan sebagai pengguna uji di Google.' : 'Akun ' + email + ' disimpan.') + '</div>'; window.scrollTo(0, 0);
  }
  async function putusPerangkat(b) {
    var aksi = b.getAttribute('data-ak'), no = b.getAttribute('data-no'), x = D.akses.list.filter(function (y) { return y.no === no; })[0]; if (!x) return;
    var kata = { izin: 'Izinkan', tolak: 'Tolak', cabut: 'Cabut izin' }[aksi];
    if ((aksi === 'cabut' || aksi === 'tolak') && !confirm(kata + ' perangkat ' + (x.nama || '') + ' (' + x.n + ')?')) return;
    b.disabled = true;
    var ringkas = kata + ' perangkat ' + (x.nama || 'tanpa nama') + ' – ' + x.n;
    var r = await sb.from('md_aksi').insert({ fungsi: 'aksesPutus', param: { no: no, aksi: aksi }, ringkas: ringkas.slice(0, 200) });
    if (r.error) { $('msgAtur').innerHTML = '<div class="msg bad">Gagal mengirim: ' + esc(r.error.message) + '</div>'; b.disabled = false; return; }
    await muatAksi(); gambarAtur();
    $('msgAtur').innerHTML = '<div class="msg ok">' + esc(ringkas) + '. Berlaku paling lambat 10 menit lagi.</div>';
  }

  function antreBarang() { var o = {}; D.aksi.forEach(function (a) { if (a.fungsi === 'mdeSimpanBaru' && a.param && !(a.param.k in o)) o[a.param.k] = a; }); return o; }
  function stokBarang(k) { var S2 = AT.stok; if (!S2) return null; for (var i = 0; i < S2.barang.length; i++) if (S2.barang[i].k === k) return S2.barang[i]; return null; }
  function isiEditBarang() {
    var B = D.barang; if (!B) return '<div class="msg w">Daftar barang belum tersedia. Tekan "Hitung ulang sekarang".</div>';
    var antre = antreBarang(), ms = new Date(D.waktu.barang || 0).getTime();
    var list = B.barang.filter(function (x) { return (!AT.kat || x.kat === AT.kat) && cocok(x.k + ' ' + x.n, AT.q); });
    var h = '<div class="cd"><div class="aksi-baris" style="margin-bottom:8px"><input class="isian" id="ebQ" placeholder="Cari kode atau nama barang" value="' + esc(AT.q) + '"><select class="st-order" id="ebKat"><option value="">Semua kategori</option>' + B.kategori.map(function (k) { return '<option' + (AT.kat === k ? ' selected' : '') + '>' + esc(k) + '</option>'; }).join('') + '</select>' +
      '<button type="button" class="tbl pri" data-eb="__baru">+ Barang baru</button></div><p class="sb" style="margin:0">' + list.length + ' barang · ' + B.barang.filter(function (x) { return !x.hpp; }).length + ' belum punya HPP · daftar diperbarui ' + waktuPotret('barang') + '</p></div>';
    if (AT.buka === '__baru') h += formBarangBaru(B);
    h += '<div class="cd"><div class="gulir"><table class="tabel"><thead><tr><th>Barang</th><th class="r">Harga jual</th><th class="r">HPP</th><th class="r hp-x">Stok</th><th></th></tr></thead><tbody>' + list.slice(0, 250).map(function (x) {
      var a = antre[x.k], tunggu = a && a.status === 'menunggu', st = stokBarang(x.k), buka = AT.buka === x.k;
      var r = '<tr><td>' + esc(x.n) + '<small>' + esc(x.k) + ' · ' + esc(x.kat) + (x.w && x.w.length ? ' · ' + x.w.length + ' warna' : '') + (x.kt ? ' · katalog produksi' : '') + '</small></td><td class="r angka">' + rp(x.hj) + '</td><td class="r angka">' + (x.hpp ? rp(x.hpp) : '<span class="label no">belum ada</span>') + '</td><td class="r angka hp-x">' + (st ? fmt(st.tot) : '–') + '</td>' +
        '<td class="r">' + (tunggu ? '<span class="label abu">diterapkan…</span>' : '<button type="button" class="tbl" data-eb="' + esc(x.k) + '" aria-expanded="' + buka + '">' + (buka ? 'Tutup' : 'Ubah') + '</button>') + '</td></tr>';
      if (a && !tunggu && !buka) { var c = catatanAntre(a, ms); if (c) r += '<tr><td colspan="5">' + c + '</td></tr>'; }
      if (buka) r += '<tr><td colspan="5" style="background:#F7F9FB">' + formUbahBarang(x, B, st) + '</td></tr>';
      return r;
    }).join('') + '</tbody></table></div>' + (list.length > 250 ? '<p class="sb">Menampilkan 250 barang pertama. Persempit pencarian.</p>' : '') + '</div>';
    return h + '<p class="sb">Perubahan diterapkan ke Google Sheets paling lambat 10 menit kemudian dan tercatat di Riwayat perubahan. Harga jual berlaku di semua saluran; HPP berlaku mulai hari ini; qty dicatat sebagai penyesuaian yang langsung disetujui.</p>';
  }
  function formUbahBarang(x, B, st) {
    var f = AT.f, h = pilihSub('ebf', f, [['harga', 'Harga jual'], ['hpp', 'HPP'], ['qty', 'Qty stok'], ['info', 'Nama, kategori & warna']]);
    h += '<div data-ebform="' + esc(x.k) + '">';
    if (f === 'harga') h += '<div class="mini"><label>Harga jual baru<input class="isian angka" inputmode="numeric" data-f="nilai" value="' + esc(x.hj) + '"></label><label style="grid-column:span 2">Alasan perubahan (wajib)<input class="isian" data-f="alasan" maxlength="300"></label></div><p class="sb">Sekarang ' + rp(x.hj) + (x.hpp ? ' · HPP ' + rp(x.hpp) : '') + '. Berlaku di daftar barang, katalog, dan stok online.</p>';
    else if (f === 'hpp') h += '<div class="mini"><label>HPP baru<input class="isian angka" inputmode="numeric" data-f="nilai" value="' + esc(x.hpp || '') + '"></label><label style="grid-column:span 2">Alasan perubahan (wajib)<input class="isian" data-f="alasan" maxlength="300"></label></div><p class="sb">Sekarang ' + (x.hpp ? rp(x.hpp) : 'belum ada') + '. Berlaku mulai hari ini; penjualan sebelumnya tetap memakai HPP lama.</p>';
    else if (f === 'qty') {
      var lok = B.lokasi.filter(function (l) { return l.id === AT.lok; })[0] || B.lokasi[0]; AT.lok = lok.id;
      var sis = st && st.q ? (st.q[lok.id] || 0) : null;
      h += '<div class="mini"><label>Lokasi<select class="isian" id="ebLok" data-f="lok">' + B.lokasi.map(function (l) { return '<option value="' + esc(l.id) + '"' + (l.id === lok.id ? ' selected' : '') + '>' + esc(l.n) + '</option>'; }).join('') + '</select></label>' +
        (lok.warna && x.w && x.w.length ? '<label>Warna<select class="isian" data-f="w"><option value="">Pilih warna</option>' + x.w.map(function (w) { return '<option>' + esc(w) + '</option>'; }).join('') + '</select></label>' : '') +
        '<label>Qty sebenarnya (pcs)<input class="isian angka" inputmode="numeric" data-f="nilai"></label><label style="grid-column:1/-1">Alasan perubahan (wajib)<input class="isian" data-f="alasan" maxlength="300"></label></div>' +
        '<p class="sb">Stok sistem di ' + esc(lok.n) + ' sekarang ' + (sis === null ? 'belum terbaca' : fmt(sis) + ' pcs' + (x.w && x.w.length && lok.warna ? ' (semua warna)' : '')) + '. Selisihnya dihitung ulang saat diterapkan dan dicatat sebagai penyesuaian.</p>';
    } else h += '<div class="mini"><label style="grid-column:span 2">Nama barang<input class="isian" data-f="nama" maxlength="120" value="' + esc(x.n) + '"></label><label>Kategori<input class="isian" data-f="kat" list="ebKatList" maxlength="60" value="' + esc(x.kat) + '"></label>' +
      '<label style="grid-column:1/-1">Varian warna (pisahkan dengan koma)<input class="isian" data-f="warna" value="' + esc((x.w || []).join(', ')) + '"></label><label style="grid-column:1/-1">Alasan perubahan (wajib)<input class="isian" data-f="alasan" maxlength="300"></label></div><datalist id="ebKatList">' + B.kategori.map(function (k) { return '<option value="' + esc(k) + '">'; }).join('') + '</datalist>';
    return h + '<div class="aksi-baris"><button type="button" class="tbl pri" data-eb-simpan="' + esc(x.k) + '">Simpan perubahan</button></div></div>';
  }
  function formBarangBaru(B) {
    return '<div class="cd" data-ebform="__baru"><h3>Barang baru</h3><div class="mini"><label>Kode (huruf & angka)<input class="isian" data-f="k" maxlength="12" placeholder="contoh R59"></label><label style="grid-column:span 2">Nama barang<input class="isian" data-f="nama" maxlength="120"></label>' +
      '<label>Kategori<input class="isian" data-f="kat" list="ebKatList2" maxlength="60"></label><label>Harga jual<input class="isian angka" inputmode="numeric" data-f="hj"></label><label>HPP (boleh kosong)<input class="isian angka" inputmode="numeric" data-f="hpp"></label>' +
      '<label style="grid-column:1/-1">Varian warna (pisahkan dengan koma, boleh kosong)<input class="isian" data-f="warna"></label>' +
      '<label class="cek"><input type="checkbox" data-f="katalog"> Masuk katalog produksi</label><label>Kategori katalog (bila beda)<input class="isian" data-f="katKatalog" maxlength="60"></label><label class="cek"><input type="checkbox" data-f="online"> Masuk stok online (qty 0)</label>' +
      '<label style="grid-column:1/-1">Alasan / catatan (wajib)<input class="isian" data-f="alasan" maxlength="300"></label></div><datalist id="ebKatList2">' + B.kategori.map(function (k) { return '<option value="' + esc(k) + '">'; }).join('') + '</datalist>' +
      '<div class="aksi-baris"><button type="button" class="tbl pri" data-eb-simpan="__baru">Simpan barang baru</button><button type="button" class="tbl" data-eb="__baru">Batal</button></div><p class="sb">Stok awal barang baru 0. Isi qty lewat Ubah → Qty stok atau lewat formulir staf.</p></div>';
  }
  function bulat(v) { v = String(v || '').replace(/[.\s]/g, '').replace(',', '.'); var n = Number(v); return v === '' || !isFinite(n) || Math.floor(n) !== n ? NaN : n; }
  async function simpanBarang(btn) {
    var k = btn.getAttribute('data-eb-simpan'), w = $('bAtur').querySelector('[data-ebform="' + k + '"]'), B = D.barang;
    var v = function (f) { var i = w.querySelector('[data-f="' + f + '"]'); return !i ? '' : i.type === 'checkbox' ? i.checked : i.value.trim(); };
    var salah = function (t) { $('msgAtur').innerHTML = '<div class="msg bad">' + esc(t) + '</div>'; window.scrollTo(0, 0); };
    var alasan = v('alasan'); if (alasan.length < 3) { salah('Tulis alasan perubahan dulu (minimal 3 huruf), supaya riwayatnya jelas.'); return; }
    var x = k === '__baru' ? null : B.barang.filter(function (y) { return y.k === k; })[0], p, cek = [], ringkas;
    if (k === '__baru') {
      var kode = String(v('k')).toUpperCase().replace(/\s+/g, ''), hj = bulat(v('hj')), hpp = v('hpp') === '' ? 0 : bulat(v('hpp'));
      if (!/^[A-Z0-9]{2,12}$/.test(kode)) { salah('Kode hanya huruf & angka, 2–12 karakter, tanpa spasi (contoh: R59).'); return; }
      if (B.barang.some(function (y) { return y.k === kode; })) { salah('Kode ' + kode + ' sudah dipakai. Pakai kode lain.'); return; }
      if (String(v('nama')).length < 3) { salah('Nama barang minimal 3 huruf.'); return; }
      if (!v('kat')) { salah('Kategori belum diisi.'); return; }
      if (!(hj > 0)) { salah('Harga jual harus angka bulat lebih dari 0.'); return; }
      if (!(hpp >= 0)) { salah('HPP harus angka bulat (boleh dikosongkan).'); return; }
      if (B.barang.some(function (y) { return y.n.toUpperCase() === String(v('nama')).toUpperCase(); })) cek.push('Nama ini sudah dipakai barang lain.');
      if (B.kategori.indexOf(v('kat')) === -1) cek.push('Kategori "' + v('kat') + '" baru (belum pernah dipakai).');
      if (!hpp) cek.push('HPP masih kosong, jadi nilai stok & laba barang ini belum bisa dihitung.'); else if (hpp >= hj) cek.push('HPP sama atau lebih tinggi dari harga jual.');
      p = { jenis: 'baru', k: kode, nama: v('nama'), kat: v('kat'), warna: v('warna'), hj: hj, hpp: hpp || '', katalog: v('katalog') === true, katKatalog: v('katKatalog'), online: v('online') === true };
      ringkas = 'Barang baru ' + kode + ' – ' + v('nama') + ' (harga ' + rp(hj) + ')';
    } else if (AT.f === 'harga' || AT.f === 'hpp') {
      var n = bulat(v('nilai'));
      if (!(n > 0)) { salah((AT.f === 'harga' ? 'Harga jual' : 'HPP') + ' harus angka bulat lebih dari 0.'); return; }
      var lama = AT.f === 'harga' ? x.hj : x.hpp;
      if (n === lama) { salah((AT.f === 'harga' ? 'Harga jual ' : 'HPP ') + x.n + ' memang sudah ' + rp(n) + '.'); return; }
      if (AT.f === 'harga' && x.hpp && n <= x.hpp) cek.push('Harga jual baru tidak lebih tinggi dari HPP ' + rp(x.hpp) + ' (rugi per barang).');
      if (AT.f === 'hpp' && x.hj && n >= x.hj) cek.push('HPP baru sama atau lebih tinggi dari harga jual ' + rp(x.hj) + '.');
      if (lama > 0 && Math.abs(n - lama) / lama > 0.5) cek.push('Berubah ' + Math.round((n - lama) / lama * 100) + '% dari ' + rp(lama) + '. Pastikan tidak salah ketik.');
      p = { jenis: AT.f, k: k, nilai: n };
      ringkas = (AT.f === 'harga' ? 'Harga jual ' : 'HPP ') + x.n + ': ' + (lama ? rp(lama) : 'kosong') + ' → ' + rp(n);
    } else if (AT.f === 'qty') {
      var q = bulat(v('nilai')), lok = B.lokasi.filter(function (l) { return l.id === v('lok'); })[0], wr = v('w');
      if (!lok) { salah('Pilih lokasi stok dulu.'); return; }
      if (!(q >= 0)) { salah('Qty harus angka bulat, minimal 0.'); return; }
      if (lok.warna && x.w && x.w.length && !wr) cek.push('Barang ini punya varian warna tapi warna tidak dipilih, jadi selisihnya masuk ke "tanpa warna".');
      var st = stokBarang(k), sis = st && st.q ? st.q[lok.id] || 0 : null;
      if (sis !== null && !(x.w && x.w.length && lok.warna) && (Math.abs(q - sis) >= 100 || (sis > 0 && Math.abs(q - sis) / sis > 0.5))) cek.push('Stok akan berubah dari ' + fmt(sis) + ' menjadi ' + fmt(q) + ' pcs. Selisihnya besar, pastikan sudah benar.');
      p = { jenis: 'qty', k: k, lok: lok.id, w: wr, nilai: q };
      ringkas = 'Qty ' + x.n + (wr ? ' ' + wr : '') + ' di ' + lok.n + ' menjadi ' + fmt(q) + ' pcs';
    } else {
      var nama = v('nama'), kat = v('kat'), warna = String(v('warna')).split(',').map(function (s2) { return s2.trim().toUpperCase(); }).filter(String);
      if (nama.length < 3) { salah('Nama barang minimal 3 huruf.'); return; }
      if (!kat) { salah('Kategori belum diisi.'); return; }
      var hilang = (x.w || []).filter(function (c) { return warna.indexOf(String(c).toUpperCase()) === -1; });
      if (hilang.length) cek.push('Warna ' + hilang.join(', ') + ' akan dihapus dari daftar varian (stok yang sudah tercatat tetap ada).');
      if (nama !== x.n && B.barang.some(function (y) { return y.k !== k && y.n.toUpperCase() === nama.toUpperCase(); })) cek.push('Nama "' + nama + '" sudah dipakai barang lain.');
      p = { jenis: 'info', k: k, nama: nama, kat: kat, warna: v('warna') };
      ringkas = 'Ubah nama / kategori / warna ' + x.n + (nama !== x.n ? ' → ' + nama : '');
    }
    if (cek.length && !confirm(cek.join('\n') + '\n\nLanjutkan?')) return;
    p.alasan = alasan; p.yakin = true; p.token = 'md' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    btn.disabled = true;
    // Harga jual, HPP, nama/kategori/warna, barang baru, dan qty stok langsung tersimpan di Supabase.
    // Qty Kantor Packing (stok online) tetap lewat antrean Apps Script (fungsi menjawab {lewat:true}).
    var rq = null;
    if (p.jenis === 'qty') {
      var lokQ = B.lokasi.filter(function (l) { return l.id === p.lok; })[0] || {};
      rq = await sb.rpc('mde_qty', { p_k: p.k, p_lok: p.lok, p_toko: lokQ.n || '', p_w: p.w || '', p_nilai: String(p.nilai), p_alasan: p.alasan, p_token: p.token });
    }
    if (p.jenis === 'harga' || p.jenis === 'hpp' || p.jenis === 'info' || p.jenis === 'baru' || (rq && !(rq.data && rq.data.lewat))) {
      var rr = rq ? rq : (p.jenis === 'harga' || p.jenis === 'hpp')
        ? await sb.rpc('mde_simpan', { p_jenis: p.jenis, p_k: p.k, p_nilai: String(p.nilai), p_alasan: p.alasan, p_token: p.token })
        : await sb.rpc('mde_info_baru', { p_jenis: p.jenis, p_k: p.k, p_nama: p.nama || '', p_kat: p.kat || '', p_warna: p.warna || '',
            p_hj: p.hj === undefined ? '' : String(p.hj), p_hpp: p.hpp === undefined ? '' : String(p.hpp), p_katalog: p.katalog === true,
            p_kat_katalog: p.katKatalog || '', p_online: p.online === true, p_alasan: p.alasan, p_yakin: true, p_token: p.token });
      var gagal = rr.error ? rr.error.message : (!rr.data || !rr.data.ok) ? ((rr.data && rr.data.pesan) || 'Gagal menyimpan.') : '';
      if (gagal) { salah(gagal); btn.disabled = false; return; }
      salinKeSheetGaji();
      await sb.from('md_aksi').insert({ fungsi: 'segarkan', param: {}, ringkas: 'Hitung ulang sesudah ' + String(ringkas).slice(0, 150) });
      AT.buka = null; await muatAksi(); gambarAtur();
      $('msgAtur').innerHTML = '<div class="msg ok">' + esc(rr.data.pesan) + ' Daftar di halaman ini diperbarui paling lambat 10 menit lagi.</div>'; window.scrollTo(0, 0);
      return;
    }
    var r = await sb.from('md_aksi').insert({ fungsi: 'mdeSimpanBaru', param: p, ringkas: String(ringkas).slice(0, 200) });
    if (r.error) { salah('Gagal mengirim: ' + r.error.message); btn.disabled = false; return; }
    AT.buka = null; await muatAksi(); gambarAtur();
    $('msgAtur').innerHTML = '<div class="msg ok">' + esc(ringkas) + '. Diterapkan ke Google Sheets paling lambat 10 menit lagi.</div>'; window.scrollTo(0, 0);
  }
  function isiLogBarang() {
    var B = D.barang; if (!B) return '<div class="msg w">Riwayat perubahan belum tersedia.</div>';
    var l = B.log.filter(function (x) { return cocok([x.no, x.j, x.k, x.n, x.lok, x.al, x.oleh].join(' '), AT.ql); });
    var nil = function (x, v) { return v === '' || v === null || v === undefined ? '–' : (/Harga|HPP/i.test(x.j) && isFinite(Number(v)) ? rp(v) : esc(v)); };
    return '<div class="cd"><div class="aksi-baris" style="margin-bottom:8px"><input class="isian" id="ebQl" placeholder="Cari no, jenis, barang, lokasi, alasan" value="' + esc(AT.ql) + '"></div>' + (l.length ? '<div class="gulir"><table class="tabel"><tbody>' + l.map(function (x) {
      return '<tr><td><span class="label abu">' + esc(x.j) + '</span> ' + esc(x.n) + (x.w ? ' – ' + esc(x.w) : '') + '<small>' + esc(x.no) + ' · ' + esc(x.wk) + ' · ' + esc(x.k) + (x.lok ? ' · ' + esc(x.lok) : '') + (x.b ? ' · berlaku ' + esc(tglId(x.b)) : '') + '</small>' + (x.al ? '<small>Alasan: ' + esc(x.al) + '</small>' : '') + '<small>Oleh ' + esc(x.oleh) + '</small></td><td class="r angka">' + nil(x, x.lama) + ' → <b>' + nil(x, x.baru) + '</b></td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="ksg">Belum ada perubahan.</div>') + '</div>';
  }

  // ======================= GUDANG UTAMA (gdPemilikData lama, mode gudang) =======================
  var G = { bagian: 'stok', cari: '', cariOn: '' };
  var GDL = { data: null, muat: false, pesan: '' };
  function tglId(s) { var p = String(s || '').split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : String(s || ''); }
  function cocok(teks, q) { q = String(q || '').trim().toLowerCase(); return !q || String(teks).toLowerCase().indexOf(q) !== -1; }
  function kelompok(list) { var g = {}, u = []; list.forEach(function (x) { var k = x.kat || 'Lainnya'; if (!g[k]) { g[k] = []; u.push(k); } g[k].push(x); }); return u.map(function (k) { return { kat: k, list: g[k] }; }); }
  function gambarGudang() {
    var el = $('bGudang'), d = D.gudang;
    if (!d) { el.innerHTML = '<div class="msg w">Data gudang utama belum tersedia. Tekan "Hitung ulang sekarang".</div>'; return; }
    var O = d.online || {}, nKirim = (d.masukProd || []).length;
    var h = '<p class="tl">Diperbarui ' + waktuPotret('gudang') + ' · perubahan dari staf gudang masuk paling lambat 30 menit</p>';
    h += '<div class="chip" role="group" aria-label="Bagian gudang">' + [['stok', 'Stok gudang utama', fmt(d.stok.reduce(function (a, x) { return a + x.q; }, 0)) + ' pcs'], ['online', 'Stok online Kantor Packing', O.tot ? fmt(O.tot.pcs) + ' pcs' : ''], ['riwayat', 'Masuk & keluar', nKirim ? nKirim + ' kiriman menunggu' : (d.riwayat || []).length + ' catatan']].map(function (b) {
      return '<button type="button" data-gb="' + b[0] + '" aria-pressed="' + (G.bagian === b[0]) + '"><span>' + b[1] + '</span><b>' + (b[2] || '&nbsp;') + '</b></button>'; }).join('') + '</div>';
    h += '<div id="gIsi">' + (G.bagian === 'stok' ? isiStokGudang(d) : G.bagian === 'online' ? isiOnline(d) : isiRiwayatGudang(d)) + '</div>';
    el.innerHTML = h;
    el.querySelectorAll('[data-gb]').forEach(function (b) { b.onclick = function () { G.bagian = b.getAttribute('data-gb'); gambarGudang(); }; });
    el.onclick = function (e) {
      var t = e.target.closest ? e.target.closest('[data-gdb1],[data-gdb0],[data-gdb2]') : null; if (!t) return;
      var no = t.getAttribute('data-gdb1') || t.getAttribute('data-gdb0') || t.getAttribute('data-gdb2'), box = el.querySelector('[data-btl="' + no + '"]');
      if (!box) return;
      if (t.hasAttribute('data-gdb1')) {
        box.innerHTML = '<label for="gBtl" class="sb" style="width:100%">Alasan pembatalan ' + esc(no) + '</label><input class="isian" id="gBtl" maxlength="200" placeholder="Mis. dobel input, salah tujuan, salah jumlah" style="flex:1 1 240px">' +
          '<button type="button" class="tbl" data-gdb2="' + esc(no) + '" style="background:var(--merah);border-color:var(--merah);color:#fff">Ya, batalkan</button><button type="button" class="tbl" data-gdb0="' + esc(no) + '">Tidak jadi</button>';
        var i = $('gBtl'); if (i) i.focus(); return;
      }
      if (t.hasAttribute('data-gdb0')) { gambarGudang(); return; }
      var al = ($('gBtl') || {}).value || '';
      if (al.trim().length < 3) { box.insertAdjacentHTML('beforeend', '<div class="msg no" style="width:100%">Tulis alasan pembatalan dulu.</div>'); return; }
      t.disabled = true; t.textContent = 'Membatalkan…';
      sb.rpc('gudang_batal', { p_no: no, p_alasan: al, p_token: no + '|' + Date.now() }).then(function (r) {
        var h = r.data || {};
        if (r.error || !h.ok) { t.disabled = false; t.textContent = 'Ya, batalkan'; box.insertAdjacentHTML('beforeend', '<div class="msg no" style="width:100%">' + esc(r.error ? r.error.message : h.pesan) + '</div>'); return; }
        salinKeSheetGaji();
        if (window.Gudang) window.Gudang.lupakan();
        GDL.data = null; GDL.pesan = h.pesan; gambarGudang();
      });
    };
    if (GDL.pesan) { el.insertAdjacentHTML('afterbegin', '<div class="msg ok">' + esc(GDL.pesan) + '</div>'); GDL.pesan = ''; }
    var c = $('gCari'); if (c) c.oninput = function () { var pos = c.selectionStart; if (G.bagian === 'stok') G.cari = c.value; else G.cariOn = c.value; gambarGudang(); var c2 = $('gCari'); c2.focus(); try { c2.setSelectionRange(pos, pos); } catch (e) { } };
  }
  function isiStokGudang(d) {
    var tot = d.stok.reduce(function (a, x) { return a + x.q; }, 0), minus = d.stok.filter(function (x) { return x.q < 0; }).length;
    var h = '<div class="kp"><div class="kt"><span class="l">Nilai stok (HPP)</span><span class="v angka">' + jt(d.nilai.hpp) + '</span><span class="k">' + rp(d.nilai.hpp) + '</span></div>' +
      '<div class="kt"><span class="l">Nilai stok (harga jual)</span><span class="v angka">' + jt(d.nilai.jual) + '</span><span class="k">' + rp(d.nilai.jual) + '</span></div>' +
      '<div class="kt"><span class="l">Total di gudang</span><span class="v angka">' + fmt(tot) + '</span><span class="k">pcs · ' + d.stok.length + ' jenis barang</span></div>' +
      '<div class="kt"><span class="l">Perlu dicek</span><span class="v angka' + (minus || d.nilai.tanpaHpp ? ' mn' : '') + '">' + (minus + d.nilai.tanpaHpp) + '</span><span class="k">' + minus + ' stok minus · ' + d.nilai.tanpaHpp + ' tanpa HPP</span></div></div>';
    var list = d.stok.filter(function (x) { return cocok(x.k + ' ' + x.n + ' ' + x.kat, G.cari); });
    h += '<div class="cd"><div class="aksi-baris" style="margin-bottom:10px"><input class="isian" id="gCari" placeholder="Cari kode atau nama barang" value="' + esc(G.cari) + '"><a class="tbl" href="stok.html">Stok semua lokasi</a></div>';
    if (!list.length) return h + '<div class="ksg">Tidak ada barang.</div></div>';
    h += '<div class="gulir"><table class="tabel"><thead><tr><th>Barang</th><th class="r">Stok</th><th class="r">HPP</th><th class="r">Harga jual</th><th class="r">Nilai HPP</th></tr></thead><tbody>';
    kelompok(list).forEach(function (g) {
      h += '<tr><td colspan="5" style="background:#F7F9FB;font-weight:800">' + esc(g.kat) + '</td></tr>';
      g.list.forEach(function (x) {
        h += '<tr><td>' + esc(x.n) + '<small>' + esc(x.k) + (x.w && x.w.length ? ' · ' + x.w.map(function (w) { return esc(w.w) + ' ' + fmt(w.q); }).join(', ') : '') + '</small></td><td class="r angka' + (x.q < 0 ? ' mn' : '') + '">' + fmt(x.q) + '</td>' +
          '<td class="r angka">' + (x.hpp ? rp(x.hpp) + (x.hs === 'awal' ? '<small>stok awal</small>' : '') : '<span class="label no">belum ada</span>') + '</td><td class="r angka">' + rp(x.hj) + '</td><td class="r angka">' + (x.hpp ? rp(x.q * x.hpp) : '–') + '</td></tr>';
      });
    });
    return h + '</tbody></table></div><p class="sb">HPP dari PO terakhir (harga + bagian biaya tambahan). Barang yang belum punya PO memakai HPP stok awal. Harga jual dari daftar barang.</p></div>';
  }
  function isiOnline(d) {
    var O = d.online;
    if (!O || !O.ada) return '<div class="msg w">Stok awal online (sheet ONLINE_STOK_AWAL) belum diisi.</div>';
    var T = O.tot, h = '<div class="kp"><div class="kt"><span class="l">Nilai stok online (HPP)</span><span class="v angka">' + jt(T.hpp) + '</span><span class="k">' + rp(T.hpp) + '</span></div>' +
      '<div class="kt"><span class="l">Nilai (harga jual)</span><span class="v angka">' + jt(T.jual) + '</span><span class="k">selisih ' + rp(T.jual - T.hpp) + '</span></div>' +
      '<div class="kt"><span class="l">Total pcs</span><span class="v angka">' + fmt(T.pcs) + '</span><span class="k">' + fmt(T.barang) + ' barang · kiriman gudang ' + fmt(T.kirim || 0) + ' pcs</span></div>' +
      '<div class="kt"><span class="l">Terjual marketplace</span><span class="v angka">' + fmt(T.jualMp || 0) + '</span><span class="k">pcs sejak ' + esc(tglId(O.mulai)) + '</span></div></div>';
    var cat = [];
    if (T.minus) cat.push(T.minus + ' barang stoknya minus');
    if (T.tanpaHpp) cat.push(T.tanpaHpp + ' barang ada stok tapi belum ada HPP');
    if (T.tanpaHarga) cat.push(T.tanpaHarga + ' barang belum ada harga jual');
    if (O.mp && O.mp.aktif) cat.push('Penjualan marketplace terakhir terbaca ' + O.mp.aktif);
    if (cat.length) h += '<div class="msg w">' + cat.map(esc).join(' · ') + '</div>';
    var list = O.list.filter(function (x) { return cocok(x.k + ' ' + x.n + ' ' + x.kat, G.cariOn); });
    h += '<div class="cd"><div class="aksi-baris" style="margin-bottom:10px"><input class="isian" id="gCari" placeholder="Cari kode atau nama barang" value="' + esc(G.cariOn) + '"></div>';
    if (!list.length) return h + '<div class="ksg">Tidak ada barang.</div></div>';
    h += '<div class="gulir"><table class="tabel"><thead><tr><th>Barang</th><th class="r">Stok</th><th class="r">HPP</th><th class="r">Harga jual</th><th class="r">Nilai HPP</th></tr></thead><tbody>';
    kelompok(list).forEach(function (g) {
      var sub = 0, subQ = 0; g.list.forEach(function (x) { if (x.q > 0) { sub += x.q * x.hpp; subQ += x.q; } });
      h += '<tr><td colspan="5" style="background:#F7F9FB;font-weight:800">' + esc(g.kat) + ' <span class="sb" style="font-weight:600">· ' + fmt(subQ) + ' pcs · ' + rp(sub) + '</span></td></tr>';
      g.list.forEach(function (x) {
        var rinci = ['awal ' + fmt(x.awal)]; if (x.kirim) rinci.push('+ kiriman ' + fmt(x.kirim)); if (x.jualMp) rinci.push('− terjual ' + fmt(x.jualMp));
        h += '<tr' + (x.q ? '' : ' style="opacity:.55"') + '><td>' + esc(x.n) + '<small>' + esc(x.k) + ' · ' + rinci.join(' ') + '</small>' + (x.c ? '<small style="color:var(--merah)">' + esc(x.c) + '</small>' : '') + '</td><td class="r angka' + (x.q < 0 ? ' mn' : '') + '">' + fmt(x.q) + '</td>' +
          '<td class="r angka">' + (x.hpp ? rp(x.hpp) : '–') + '</td><td class="r angka">' + (x.hj ? rp(x.hj) : '–') + '</td><td class="r angka">' + (x.hpp && x.q > 0 ? rp(x.q * x.hpp) : '–') + '</td></tr>';
      });
    });
    return h + '</tbody></table></div><p class="sb">Stok siap kirim marketplace di Kantor Packing = stok awal + kiriman dari gudang utama − penjualan marketplace yang sudah diunggah.</p></div>';
  }
  function isiRiwayatGudang(d) {
    var h = '', M2 = d.masukProd || [];
    if (M2.length) h += '<div class="cd"><div class="kpl"><h3>Kiriman produksi belum diterima gudang</h3><span class="sb">' + M2.length + ' kiriman</span></div><table class="tabel"><tbody>' + M2.map(function (x) {
      var it = x.items || []; return '<tr><td><b>' + esc(x.no || '') + '</b><small>' + esc(tglId(x.t)) + (x.p ? ' · ' + esc(x.p) : '') + '</small>' + (it.length ? '<small>' + it.map(function (i) { return esc(i.n) + (i.w ? ' ' + esc(i.w) : '') + ' ' + fmt(i.q); }).join(', ') + '</small>' : '') + '</td><td class="r angka">' + fmt(it.reduce(function (a, i) { return a + (Number(i.q) || 0); }, 0) || x.q || 0) + ' pcs</td></tr>'; }).join('') + '</tbody></table></div>';
    // Riwayat langsung dari Supabase (gudang.js) supaya pembatalan langsung terlihat; sebelum termuat memakai potret.
    if (!GDL.data && !GDL.muat && window.Gudang) {
      GDL.muat = true;
      window.Gudang.gdData(sb).then(function (x) { GDL.data = x; GDL.muat = false; if (G.bagian === 'riwayat') gambarGudang(); }, function () { GDL.muat = false; });
    }
    var R = (GDL.data && GDL.data.riwayat) || d.riwayat || [], dibatal = {};
    R.forEach(function (x) { var m = /^(SJ-\d{6}-\d+)B$/.exec(x.no || ''); if (m) dibatal[m[1]] = true; });
    var bisaBatal = function (x, q) { return /^SJ-\d{6}-\d+$/.test(x.no || '') && /^keluar/i.test(x.j || '') && !/^RO-/i.test(x.ke || '') && !dibatal[x.no] && q > 0; };
    var warna = function (j) { return /masuk|terima/i.test(j) ? 'ok' : /keluar|kirim/i.test(j) ? 'biru' : 'abu'; };
    h += '<div class="cd"><div class="kpl"><h3>Masuk &amp; keluar gudang utama</h3><span class="sb">' + R.length + ' catatan terakhir</span></div>' + (R.length ? R.map(function (x) {
      var it = x.items || [], q = it.reduce(function (a, i) { return a + (Number(i.q) || 0); }, 0), rs = it.reduce(function (a, i) { return a + (Number(i.rs) || 0); }, 0);
      return '<details class="grup" style="padding:10px 0"><summary style="cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:10px"><span><b>' + esc(x.no) + '</b> <span class="label ' + warna(x.j) + '">' + esc(x.j) + '</span>' + (dibatal[x.no] ? ' <span class="label no">Dibatalkan</span>' : /B$/.test(x.no || '') ? ' <span class="label abu">Pembatalan</span>' : '') + '<small style="display:block;color:var(--abu);font-size:12.5px">' + esc(tglId(x.t)) + (x.st ? ' · ' + esc(x.st) : '') + (x.ke ? ' · ' + esc(x.ke) : '') + (x.p ? ' · ' + esc(x.p) : '') + '</small></span><span class="angka" style="white-space:nowrap">' + fmt(q) + ' pcs' + (rs ? ' <span class="label no">rusak ' + fmt(rs) + '</span>' : '') + '</span></summary>' +
        '<table class="tabel" style="margin-top:6px"><tbody>' + it.map(function (i) { return '<tr><td>' + esc(i.n) + (i.w ? ' – ' + esc(i.w) : '') + '<small>' + esc(i.k) + '</small></td><td class="r angka">' + fmt(i.q) + (i.rs ? '<small>rusak ' + fmt(i.rs) + '</small>' : '') + '</td></tr>'; }).join('') + '</tbody></table>' + (x.c ? '<div class="sb">Catatan: ' + esc(x.c) + '</div>' : '') +
        (bisaBatal(x, q) ? '<div class="aksi-baris" data-btl="' + esc(x.no) + '" style="margin-top:8px"><button type="button" class="tbl" data-gdb1="' + esc(x.no) + '">Batalkan penyaluran ini</button></div>' : '') + '</details>';
    }).join('') : '<div class="ksg">Belum ada catatan.</div>') + '</div>';
    return h + '<p class="sb">Terima barang, kirim keluar, dan stok opname dicatat staf gudang lewat formulirnya. Penyaluran (SJ) yang salah atau dobel bisa dibatalkan dari daftar ini: stok kembali seperti sebelum dikirim dan catatannya tetap tersimpan.</p>';
  }

  // ======================= PURCHASING (gdPemilikData lama, mode beli) =======================
  var P = { bagian: 'tindak', cari: '', filter: '', buka: {}, beliB: 'ini' };
  var PO_ST = ['Menunggu persetujuan', 'Disetujui', 'Dibayar', 'Dikirim supplier', 'Diterima sebagian', 'Selesai', 'Ditolak', 'Batal'];
  function stafBayar(b) { return b === 'ShopeePay' || b === 'Kas Tunai'; }
  function perluBayar(o) { return !stafBayar(o.bayar) && !o.wb && ['Menunggu persetujuan', 'Ditolak', 'Batal'].indexOf(o.st) === -1; }
  function biayaBelum(o) { return ['Ditolak', 'Batal'].indexOf(o.st) === -1 ? (o.biaya || []).filter(function (b) { return b.sb !== 'Dibayar' && b.sb !== 'Batal'; }) : []; }
  function warnaPo(st) { return /Menunggu/.test(st) ? 'w' : /Selesai/.test(st) ? 'ok' : /Ditolak|Batal/.test(st) ? 'no' : /Dikirim|sebagian/.test(st) ? 'biru' : 'abu'; }
  function antrePo() {
    var o = {};
    D.aksi.forEach(function (a) { if (!/^gdPo|^gdBiaya/.test(a.fungsi) || !a.param) return; var k = a.param.no; if (!(k in o)) o[k] = a; });
    return o;
  }
  function nTindakPo() { var d = D.gudang; return d ? d.po.filter(function (o) { return o.st === 'Menunggu persetujuan' || perluBayar(o) || biayaBelum(o).length; }).length : 0; }
  function nAjuanTunggu() { return (D.pengadaan ? D.pengadaan.tunggu || 0 : 0) + (D.tanpa ? D.tanpa.baru || 0 : 0); }
  function gambarPurch() {
    var el = $('bPurch'), d = D.gudang;
    M.badge('purch', nTindakPo() + nAjuanTunggu());
    if (P.bagian === 'ajuan' || P.bagian === 'rencana') { gambarPengadaan(el); return; }
    if (!d) { el.innerHTML = '<div class="msg w">Data purchasing belum tersedia. Tekan "Hitung ulang sekarang".</div>'; return; }
    var nT = nTindakPo();
    var h = '<div id="msgPurch"></div><p class="tl">Diperbarui ' + waktuPotret('gudang') + '</p>';
    h += chipPurch();
    h += '<div id="pIsi">' + (P.bagian === 'tindak' ? isiTindakPo(d) : P.bagian === 'po' ? isiSemuaPo(d) : P.bagian === 'beli' ? isiBeli(d) : isiHpp(d)) + '</div>';
    el.innerHTML = h;
    el.querySelectorAll('[data-pb]').forEach(function (b) { b.onclick = function () { P.bagian = b.getAttribute('data-pb'); gambarPurch(); }; });
    el.querySelectorAll('[data-bl]').forEach(function (b) { b.onclick = function () { P.beliB = b.getAttribute('data-bl'); gambarPurch(); }; });
    el.querySelectorAll('[data-po-a]').forEach(function (b) { b.onclick = function () { aksiPo(b); }; });
    var c = $('pCari'); if (c) c.oninput = function () { var pos = c.selectionStart; P.cari = c.value; gambarPurch(); var c2 = $('pCari'); c2.focus(); try { c2.setSelectionRange(pos, pos); } catch (e) { } };
    var f = $('pFilter'); if (f) f.onchange = function () { P.filter = f.value; gambarPurch(); };
  }
  function chipPurch() {
    var d = D.gudang, g = D.pengadaan, nT = nTindakPo(), nA = nAjuanTunggu(), nR = g ? (g.ring.Kritis || 0) + (g.ring['Saatnya pesan'] || 0) : 0;
    return '<div class="chip" role="group" aria-label="Bagian purchasing">' + [['tindak', 'PO perlu tindakan', d ? (nT ? nT + ' PO' : 'Beres') : ''], ['ajuan', 'Pengajuan staf', nA ? nA + ' menunggu' : 'Beres'], ['rencana', 'Rencana belanja', nR ? nR + ' perlu dibeli' : ''], ['po', 'Semua PO', d ? d.po.length + ' PO' : ''], ['beli', 'Laporan pembelian', ''], ['hpp', 'HPP barang', d ? d.hpp.akhir.length + ' barang' : '']].map(function (b) {
      return '<button type="button" data-pb="' + b[0] + '" aria-pressed="' + (P.bagian === b[0]) + '"><span>' + b[1] + '</span><b>' + (b[2] || '&nbsp;') + '</b></button>'; }).join('') + '</div>';
  }
  function kartuPo(o, d, perlu) {
    var antre = antrePo()[o.no], tunggu = antre && antre.status === 'menunggu', ms = new Date(D.waktu.gudang || 0).getTime();
    var biaya = (o.biaya || []).reduce(function (a, b) { return a + b.v; }, 0), belum = biayaBelum(o), buka = perlu || P.buka[o.no], hi = d.hariIni;
    var h = '<div class="cd" data-no="' + esc(o.no) + '"><div class="rq-kpl"><h3>' + esc(o.sup) + '</h3><span class="sb">' + esc(o.no) + ' · ' + esc(tglId(o.t)) + ' · ' + esc(o.asal) + ' · ' + esc(o.bayar) + ' · oleh ' + esc(o.p) + '</span></div>' +
      '<div class="rq-mt" style="margin-top:6px"><span class="label ' + warnaPo(o.st) + '">' + esc(o.st) + '</span><span class="label biru">' + rp(o.tot) + '</span>' + (biaya ? '<span class="label abu">+ biaya ' + rp(biaya) + '</span>' : '') +
      (perluBayar(o) ? '<span class="label no">belum dibayar</span>' : '') + (belum.length ? '<span class="label no">' + belum.length + ' biaya belum dibayar</span>' : '') +
      (o.sisa > 0 && ['Ditolak', 'Batal'].indexOf(o.st) === -1 ? '<span class="label abu">belum datang ' + fmt(o.sisa) + ' pcs</span>' : '') + (o.rusak ? '<span class="label no">rusak ' + fmt(o.rusak) + '</span>' : '') + '</div>';
    if (buka) {
      h += '<div class="gulir"><table class="tabel"><thead><tr><th>Barang</th><th class="r">Qty</th><th class="r">Datang</th><th class="r">Harga</th><th class="r">Subtotal</th></tr></thead><tbody>' + o.items.map(function (it) {
        return '<tr><td>' + esc(it.n) + (it.w ? ' – ' + esc(it.w) : '') + '<small>' + esc(it.k) + '</small></td><td class="r angka">' + fmt(it.q) + '</td><td class="r angka">' + fmt(it.d) + '</td><td class="r angka">' + rp(it.h) + '</td><td class="r angka">' + rp(it.s) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      if ((o.biaya || []).length) h += '<table class="tabel"><tbody>' + o.biaya.map(function (b) { return '<tr><td>' + esc(b.j) + '<small>' + esc(tglId(b.t)) + (b.c ? ' · ' + esc(b.c) : '') + ' · ' + esc(b.bayar) + '</small></td><td class="r angka">' + rp(b.v) + '<small>' + esc(b.sb) + (b.tr ? ' (' + esc(b.tr) + ')' : '') + '</small></td></tr>'; }).join('') + '</tbody></table>';
      h += (o.c ? '<div class="sb">Catatan staf: ' + esc(o.c) + '</div>' : '') + (o.cp ? '<div class="sb">Catatan manajemen Moscow Supplies: ' + esc(o.cp) + '</div>' : '') + (o.resi ? '<div class="sb">Resi: ' + esc(o.resi) + '</div>' : '') +
        '<div class="sb">Diajukan ' + esc(o.wa) + (o.ws ? ' · diputuskan ' + esc(o.ws) : '') + (o.wb ? ' · dibayar ' + esc(o.wb) : '') + (o.tr ? ' (' + esc(o.tr) + ')' : '') + '</div>';
    }
    h += catatanAntre(antre, ms);
    if (tunggu) return h + '</div>';
    var ak = '';
    if (o.st === 'Menunggu persetujuan') {
      ak += '<div class="mini"><label>Catatan (wajib bila ditolak)<input class="isian" data-f="cat" maxlength="200"></label><label>Tanggal bayar<input class="isian" type="date" data-f="tgl" value="' + esc(hi) + '" max="' + esc(hi) + '"></label></div>' +
        '<div class="aksi-baris"><button type="button" class="tbl pri" data-po-a="setuju">Setujui</button><button type="button" class="tbl" data-po-a="setujuBayar">Setujui &amp; sudah dibayar</button><button type="button" class="tbl" data-po-a="tolak">Tolak</button></div>';
    } else if (perluBayar(o)) {
      ak += '<div class="aksi-baris" style="margin-top:8px"><input class="isian" type="date" data-f="tgl" value="' + esc(hi) + '" max="' + esc(hi) + '" style="flex:0 1 170px"><button type="button" class="tbl pri" data-po-a="bayar">Tandai sudah dibayar (' + rp(o.tot) + ')</button></div>';
    }
    belum.forEach(function (b) {
      ak += '<div class="aksi-baris" style="margin-top:8px"><span class="sb" style="flex:1 1 200px">' + esc(b.j) + ' ' + rp(b.v) + ' (' + esc(b.bayar) + ')</span><input class="isian" type="date" data-f="tgl-' + b.id + '" value="' + esc(hi) + '" max="' + esc(hi) + '" style="flex:0 1 170px"><button type="button" class="tbl" data-po-a="biaya" data-id="' + b.id + '">Tandai biaya dibayar</button></div>';
    });
    var bisaBatal = ['Batal', 'Ditolak'].indexOf(o.st) === -1 && !o.items.some(function (it) { return it.d > 0; });
    ak += '<div class="aksi-baris" style="margin-top:8px">' + (perlu ? '' : '<button type="button" class="tbl" data-po-a="detail">' + (buka ? 'Tutup rincian' : 'Rincian') + '</button>') +
      (bisaBatal ? '<button type="button" class="tbl" data-po-a="batal">Batalkan PO</button>' : '') + '</div>';
    if (bisaBatal && P.buka['batal:' + o.no]) ak += '<div class="mini" style="background:#FDF3F2;padding:10px;border-radius:12px"><label>Alasan pembatalan<input class="isian" data-f="alasan" maxlength="200"></label>' +
      (o.wb || (o.biaya || []).some(function (b) { return b.tr; }) ? '<label class="cek"><input type="checkbox" data-f="batalUang" checked> Batalkan juga uang keluarnya di accounting</label>' : '') +
      '<div class="aksi-baris" style="align-self:end"><button type="button" class="tbl pri" data-po-a="batalYa">Ya, batalkan PO ini</button></div></div>';
    return h + ak + '</div>';
  }
  function isiTindakPo(d) {
    var t = d.tindak, list = d.po.filter(function (o) { return o.st === 'Menunggu persetujuan' || perluBayar(o) || biayaBelum(o).length; });
    var h = '<div class="kp"><div class="kt"><span class="l">Menunggu persetujuan</span><span class="v angka">' + t.setuju + '</span><span class="k">PO</span></div>' +
      '<div class="kt"><span class="l">PO belum dibayar</span><span class="v angka">' + jt(t.nilaiBayar) + '</span><span class="k">' + t.bayar + ' PO</span></div>' +
      '<div class="kt"><span class="l">Biaya belum dibayar</span><span class="v angka">' + jt(t.nilaiBiaya) + '</span><span class="k">' + t.biaya + ' biaya</span></div>' +
      '<div class="kt"><span class="l">Dalam perjalanan</span><span class="v angka">' + t.jalan + '</span><span class="k">PO belum datang semua</span></div></div>';
    if (t.prod) h += '<div class="msg w">' + t.prod + ' kiriman produksi belum dikonfirmasi diterima staf gudang.</div>';
    h += list.length ? list.map(function (o) { return kartuPo(o, d, true); }).join('') : '<div class="cd"><div class="aman">Tidak ada PO yang perlu disetujui atau dibayar.</div></div>';
    return h + '<p class="sb">Keputusan dari sini diterapkan ke Google Sheets paling lambat 10 menit kemudian. Pembayaran otomatis tercatat di accounting. Cetak PO masih lewat menu Purchasing di Master Data lama.</p>';
  }
  function isiSemuaPo(d) {
    var list = d.po.filter(function (o) { return (!P.filter || o.st === P.filter) && cocok(o.no + ' ' + o.sup + ' ' + o.items.map(function (i) { return i.n; }).join(' '), P.cari); });
    var h = '<div class="cd"><div class="aksi-baris"><input class="isian" id="pCari" placeholder="Cari no PO, supplier, atau barang" value="' + esc(P.cari) + '"><select class="st-order" id="pFilter"><option value="">Semua status</option>' + PO_ST.map(function (s) { return '<option' + (s === P.filter ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div></div>';
    return h + (list.length ? list.slice(0, 120).map(function (o) { return kartuPo(o, d, false); }).join('') : '<div class="cd"><div class="ksg">Tidak ada PO.</div></div>');
  }
  function isiBeli(d) {
    var L = P.beliB === 'ini' ? d.laporan : (D.beliLalu && D.beliLalu.laporan), h = pilihBulan('bl', P.beliB);
    if (!L) return h + '<div class="msg w">Laporan bulan lalu belum tersedia. Tekan "Hitung ulang sekarang".</div>';
    h += '<p class="tl">' + esc(namaBulan(L.bulan)) + '</p><div class="kp"><div class="kt"><span class="l">Total pembelian</span><span class="v angka">' + jt(L.barang + L.biaya) + '</span><span class="k">' + rp(L.barang + L.biaya) + '</span></div>' +
      '<div class="kt"><span class="l">Nilai barang</span><span class="v angka">' + jt(L.barang) + '</span><span class="k">' + L.n + ' PO</span></div>' +
      '<div class="kt"><span class="l">Biaya tambahan</span><span class="v angka">' + jt(L.biaya) + '</span><span class="k">ongkir cargo, pajak, dll.</span></div></div>';
    h += '<div class="dua"><div class="cd"><h3>Per supplier</h3>' + (L.sup.length ? '<table class="tabel"><tbody>' + L.sup.map(function (s) { return '<tr><td><b>' + esc(s.n) + '</b><small>' + esc(s.asal) + ' · ' + s.po + ' PO' + (s.biaya ? ' · biaya ' + rp(s.biaya) : '') + '</small></td><td class="r angka">' + rp(s.tot) + '</td></tr>'; }).join('') + '</tbody></table>' : '<div class="ksg">Belum ada pembelian bulan ini.</div>') + '</div>';
    h += '<div class="cd"><h3>Perubahan harga beli</h3><p class="sb" style="margin-top:-4px">Dibanding PO sebelumnya untuk barang yang sama.</p>' + (L.naik.length ? '<table class="tabel"><tbody>' + L.naik.map(function (x) { return '<tr><td>' + esc(x.n) + '<small>' + esc(x.sup) + ' · ' + esc(tglId(x.t)) + ' (dulu ' + esc(tglId(x.tDulu)) + ')</small></td><td class="r angka">' + rp(x.kini) + '<small>dulu ' + rp(x.dulu) + ' · <b style="color:var(--' + (x.pc > 0 ? 'merah' : 'hijau') + ')">' + (x.pc > 0 ? '+' : '') + String(x.pc).replace('.', ',') + '%</b></small></td></tr>'; }).join('') + '</tbody></table>' : '<div class="ksg">Tidak ada perubahan harga.</div>') + '</div></div>';
    h += '<div class="cd"><div class="kpl"><h3>Per barang</h3><span class="sb">' + L.brg.length + ' barang</span></div>' + (L.brg.length ? '<div class="gulir"><table class="tabel"><thead><tr><th>Barang</th><th class="r">Qty</th><th class="r">Rata-rata</th><th class="r">Total</th></tr></thead><tbody>' + L.brg.map(function (x) { return '<tr><td>' + esc(x.n) + (x.w ? ' – ' + esc(x.w) : '') + '<small>' + esc(x.k) + '</small></td><td class="r angka">' + fmt(x.q) + '</td><td class="r angka">' + rp(x.q ? x.tot / x.q : 0) + '</td><td class="r angka">' + rp(x.tot) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="ksg">–</div>') + '</div>';
    return h;
  }
  function isiHpp(d) {
    var H = d.hpp, akhir = H.akhir.slice().sort(function (a, b) { return a.n < b.n ? -1 : 1; });
    var h = '<div class="cd"><div class="kpl"><h3>HPP terakhir per barang</h3><span class="sb">' + akhir.length + ' barang dari PO</span></div><p class="sb" style="margin-top:-4px">HPP = harga satuan + bagian biaya tambahan PO (ongkir cargo, bill kedua, pajak), dibagi menurut nilai barang.</p>' +
      (akhir.length ? '<div class="gulir"><table class="tabel"><thead><tr><th>Barang</th><th class="r">Harga beli</th><th class="r">HPP</th><th>PO</th></tr></thead><tbody>' + akhir.map(function (x) {
        return '<tr><td>' + esc(x.n) + '<small>' + esc(x.k) + '</small></td><td class="r angka">' + rp(x.h) + '</td><td class="r angka"><b>' + rp(x.hpp) + '</b></td><td>' + esc(x.no) + '<small>' + esc(tglId(x.t)) + ' · ' + esc(x.sup) + '</small></td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="ksg">Belum ada PO.</div>') + '</div>';
    H.perPo.slice(0, 20).forEach(function (p) {
      h += '<details class="cd"><summary style="cursor:pointer"><b>' + esc(p.no) + '</b> · ' + esc(tglId(p.t)) + ' · ' + esc(p.sup) + '<span class="sb" style="display:block">Barang ' + rp(p.barang) + ' + biaya ' + rp(p.biaya) + '</span></summary><table class="tabel"><thead><tr><th>Barang</th><th class="r">Qty</th><th class="r">Harga</th><th class="r">HPP / pcs</th></tr></thead><tbody>' + p.items.map(function (x) {
        return '<tr><td>' + esc(x.n) + (x.w ? ' – ' + esc(x.w) : '') + '</td><td class="r angka">' + fmt(x.q) + '</td><td class="r angka">' + rp(x.h) + '</td><td class="r angka"><b>' + rp(x.hpp) + '</b></td></tr>'; }).join('') + '</tbody></table></details>';
    });
    return h;
  }
  // ---------- Pengadaan: pengajuan staf & rencana belanja (pgdData / pgdAksi / pgsTanpaData lama) ----------
  P.ajF = 'aktif'; P.rSt = 'perlu'; P.rKel = ''; P.rCari = '';
  var WARNA_RB = { 'Kritis': 'no', 'Saatnya pesan': 'w', 'Aman': 'ok', 'Berlebih': 'w', 'Belum ada data': 'abu' };
  var WARNA_AJ = { 'Menunggu': 'w', 'Disetujui': 'biru', 'Dipesan': 'biru', 'Diterima': 'ok', 'Ditolak': 'no', 'Batal': 'no' };
  function angkaId(n, d) { n = Number(n) || 0; var f = Math.pow(10, d || 0); n = Math.round(n * f) / f; var p = String(Math.abs(n)).split('.'); return (n < 0 ? '-' : '') + p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (p[1] ? ',' + p[1] : ''); }
  function itemRobot(g, kel, k) { if (!k) return null; for (var i = 0; i < g.items.length; i++) if (g.items[i].kel === kel && g.items[i].k === k) return g.items[i]; return null; }
  function infoRobot(x) { return 'stok ' + angkaId(x.stok, 2) + ' ' + esc(x.s) + (x.transit ? ' + ' + angkaId(x.transit, 2) + ' di jalan' : '') + (x.hari !== null && x.hari !== undefined ? ' · cukup ' + x.hari + ' hari' : ''); }
  function antreAjuan() {
    var o = {};
    D.aksi.forEach(function (a) { if (a.fungsi === 'pgdAksi' && a.param && a.param.nos) a.param.nos.forEach(function (n) { if (!(n in o)) o[n] = a; }); else if (a.fungsi === 'pgsTanpaCek' && a.param) { if (!(a.param.no in o)) o[a.param.no] = a; } });
    return o;
  }
  function gambarPengadaan(el) {
    var g = D.pengadaan;
    var h = '<div id="msgPurch"></div><p class="tl">Diperbarui ' + waktuPotret('pengadaan') + ' · pengajuan baru dari staf masuk paling lambat 2 jam (jam 07–22)</p>' + chipPurch();
    if (!g) h += '<div class="msg w">Data pengadaan belum tersedia. Tekan "Hitung ulang sekarang".</div>';
    else h += P.bagian === 'ajuan' ? isiAjuan(g) : isiRencana(g);
    el.innerHTML = h;
    el.querySelectorAll('[data-pb]').forEach(function (b) { b.onclick = function () { P.bagian = b.getAttribute('data-pb'); gambarPurch(); }; });
    el.querySelectorAll('[data-ajf]').forEach(function (b) { b.onclick = function () { P.ajF = b.getAttribute('data-ajf'); gambarPurch(); }; });
    el.querySelectorAll('[data-aj-a]').forEach(function (b) { b.onclick = function () { aksiAjuan(b); }; });
    el.querySelectorAll('[data-tanpa]').forEach(function (b) { b.onclick = function () { cekTanpa(b); }; });
    var rs = $('rSt'), rk = $('rKel'), rc = $('rCari');
    if (rs) rs.onchange = function () { P.rSt = rs.value; gambarPurch(); };
    if (rk) rk.onchange = function () { P.rKel = rk.value; gambarPurch(); };
    if (rc) rc.oninput = function () { var pos = rc.selectionStart; P.rCari = rc.value; gambarPurch(); var c2 = $('rCari'); c2.focus(); try { c2.setSelectionRange(pos, pos); } catch (e) { } };
    var on = el.querySelector('[data-pb][aria-pressed="true"]');
    if (on && on.parentNode.scrollWidth > on.parentNode.clientWidth) on.parentNode.scrollLeft = Math.max(0, on.offsetLeft - on.parentNode.offsetLeft - 16);
  }
  function isiAjuan(g) {
    var antre = antreAjuan(), ms = new Date(D.waktu.pengadaan || 0).getTime(), h = '';
    var T = (D.tanpa && D.tanpa.list || []).filter(function (x) { return x.st !== 'Sudah dicek'; });
    if (T.length) {
      h += '<div class="cd" style="border-color:#F3C7C2"><div class="kpl"><h3>Pembelian tanpa pengajuan</h3><span class="sb">' + T.length + ' belum dicek</span></div><p class="sb" style="margin-top:-4px">Staf membeli tanpa pengajuan yang di-ACC dengan alasan mendesak.</p><table class="tabel"><tbody>' + T.map(function (x) {
        var a = antre[x.no], tunggu = a && a.status === 'menunggu';
        return '<tr><td><b>' + esc(x.n) + '</b><small>' + esc(x.no) + ' · ' + esc(x.bg || '') + (x.form ? ' · ' + esc(x.form) : '') + ' · ' + esc(x.pg || '') + ' · ' + esc(x.wk || '') + (x.ref ? ' · ' + esc(x.ref) : '') + '</small>' + (x.al ? '<small>Alasan: ' + esc(x.al) + '</small>' : '') + '</td><td class="r angka">' + angkaId(x.q, 2) + ' ' + esc(x.s || '') + (x.h ? '<small>' + rp(x.h) + '</small>' : '') + '</td><td class="r">' + (tunggu ? '<span class="label abu">diterapkan…</span>' : '<button type="button" class="tbl" data-tanpa="' + esc(x.no) + '">Sudah dicek</button>') + '</td></tr>'; }).join('') + '</tbody></table></div>';
    }
    var aktif = ['Menunggu', 'Disetujui', 'Dipesan'];
    var list = g.ajuan.filter(function (a) { return P.ajF === 'aktif' ? aktif.indexOf(a.st) > -1 : P.ajF === '' || a.st === P.ajF; });
    list.sort(function (a, b) { return aktif.indexOf(a.st) - aktif.indexOf(b.st) || b.ms - a.ms; });
    var tot = list.reduce(function (s, a) { return s + (a.qs !== null && a.qs !== undefined ? a.qs : a.q) * (a.h || 0); }, 0);
    h += '<div class="pilih2" role="group" aria-label="Saring pengajuan">' + [['aktif', 'Belum selesai'], ['Menunggu', 'Menunggu ACC'], ['', 'Semua']].map(function (b) { return '<button type="button" class="tbl" data-ajf="' + b[0] + '" aria-pressed="' + (P.ajF === b[0]) + '">' + b[1] + '</button>'; }).join('') + '</div>';
    h += '<p class="tl">' + list.length + ' pengajuan · perkiraan nilai ' + rp(tot) + '</p>';
    if (!list.length) return h + '<div class="cd"><div class="aman">' + (P.ajF === 'aktif' ? 'Tidak ada pengajuan yang belum selesai.' : 'Tidak ada pengajuan.') + '</div></div>' + catatanAjuan();
    h += list.map(function (a) {
      var x = itemRobot(g, a.kel, a.k), an = antre[a.no], tunggu = an && an.status === 'menunggu', qv = a.qs !== null && a.qs !== undefined ? a.qs : a.q, hi = g.hariIni;
      var c = '<div class="cd" data-aj="' + esc(a.no) + '"><div class="rq-kpl"><h3>' + esc(a.n) + '</h3><span class="sb">' + esc(a.no) + ' · ' + esc(a.wk) + '</span></div>' +
        '<div class="rq-mt" style="margin-top:6px"><span class="label ' + (WARNA_AJ[a.st] || 'abu') + '">' + esc(a.st) + '</span>' + (a.imp ? '<span class="label biru">Impor</span>' : '<span class="label abu">Lokal</span>') + '<span class="label abu">' + esc(a.kel) + '</span>' + (a.sr ? '<span class="label ' + (WARNA_RB[a.sr] || 'abu') + '">Robot: ' + esc(a.sr) + '</span>' : '') + '</div>' +
        '<div class="sb" style="margin-top:6px">' + esc(a.bg) + ' · diajukan ' + esc(a.pg) + (a.al ? ' · alasan: ' + esc(a.al) : '') + '</div>' +
        '<div style="margin-top:6px">Qty diajukan <b class="angka">' + angkaId(a.q, 2) + ' ' + esc(a.s) + '</b>' + (a.h ? ' × ' + rp(a.h) + ' = <b class="angka">' + rp(a.q * a.h) + '</b>' : '') + (a.qs !== null && a.qs !== undefined && a.qs !== a.q ? ' · disetujui <b class="angka">' + angkaId(a.qs, 2) + '</b>' : '') + '</div>' +
        '<div class="kirim" style="margin-top:8px"><div>Saat diajukan: ' + esc(a.an || '–') + '</div>' + (x ? '<div><b>Sekarang:</b> ' + infoRobot(x) + ', saran ' + (x.saran ? angkaId(x.saran) + ' ' + esc(x.s) : 'belum perlu beli') + '</div>' : '') + '</div>' +
        (a.oleh ? '<div class="sb" style="margin-top:6px">' + esc(/^(Ditolak|Batal)$/.test(a.st) ? a.st : 'Disetujui') + ' oleh ' + esc(a.oleh) + ' ' + esc(a.wp) + (a.cp ? ' · ' + esc(a.cp) : '') + '</div>' : '') +
        (a.ref || a.eta ? '<div class="sb">Pesan: ' + esc(a.ref) + (a.eta ? ' · perkiraan datang ' + esc(tglId(a.eta)) : '') + (a.wt ? ' · diterima ' + esc(a.wt) : '') + '</div>' : '') +
        catatanAntre(an, ms);
      if (!tunggu) {
        if (a.st === 'Menunggu') c += '<div class="mini"><label>Qty disetujui (' + esc(a.s) + ')<input class="isian angka" inputmode="decimal" data-f="qs" value="' + esc(String(qv).replace('.', ',')) + '"></label><label style="grid-column:span 2">Catatan (wajib bila ditolak)<input class="isian" data-f="cat" maxlength="300"></label></div>' +
          '<div class="aksi-baris"><button type="button" class="tbl pri" data-aj-a="setuju">Setujui</button><button type="button" class="tbl" data-aj-a="tolak">Tolak</button></div>';
        else if (a.st === 'Disetujui') c += '<div class="mini"><label>Dipesan ke / ref PO<input class="isian" data-f="ref" maxlength="120"></label><label>Perkiraan datang<input class="isian" type="date" data-f="eta" min="' + esc(hi) + '"></label><label>Alasan (wajib bila dibatalkan)<input class="isian" data-f="cat" maxlength="300"></label></div>' +
          '<div class="aksi-baris"><button type="button" class="tbl pri" data-aj-a="pesan">Tandai dipesan</button><button type="button" class="tbl" data-aj-a="batal">Batalkan</button></div>';
        else if (a.st === 'Dipesan') c += '<div class="mini"><label style="grid-column:span 2">Alasan (wajib bila dibatalkan)<input class="isian" data-f="cat" maxlength="300"></label></div>' +
          '<div class="aksi-baris"><button type="button" class="tbl pri" data-aj-a="terima">Tandai diterima</button><button type="button" class="tbl" data-aj-a="batal">Batalkan</button></div>';
      }
      return c + '</div>';
    }).join('');
    return h + catatanAjuan();
  }
  function catatanAjuan() { return '<p class="sb">Pengajuan dibuat staf dari formulirnya masing-masing. Barang lokal biasanya di-ACC Purchasing, barang impor oleh Mike; manajemen Moscow Supplies bisa keduanya. Keputusan dari sini langsung tersimpan; daftar di halaman ini diperbarui paling lambat 10 menit kemudian.</p>'; }
  function isiRencana(g) {
    var r = g.ring, h = '<div class="kp"><div class="kt"><span class="l">Kritis</span><span class="v angka' + (r.Kritis ? ' mn' : '') + '">' + r.Kritis + '</span><span class="k">stok habis sebelum barang datang</span></div>' +
      '<div class="kt"><span class="l">Saatnya pesan</span><span class="v angka">' + r['Saatnya pesan'] + '</span><span class="k">barang</span></div>' +
      '<div class="kt"><span class="l">Stok berlebih</span><span class="v angka">' + r.Berlebih + '</span><span class="k">barang</span></div>' +
      '<div class="kt"><span class="l">Perkiraan belanja perlu</span><span class="v angka">' + jt(r.nilaiSaran) + '</span><span class="k">' + rp(r.nilaiSaran) + '</span></div></div>';
    if (g.gagal && g.gagal.length) h += '<div class="msg w">Sebagian data robot tidak terbaca: ' + g.gagal.map(esc).join('; ') + '</div>';
    var adaAngg = g.kel.some(function (k) { return g.angg[k]; });
    h += '<div class="cd"><div class="kpl"><h3>Anggaran belanja bulan ini</h3><span class="sb">' + (adaAngg ? 'per kelompok' : 'belum diisi') + '</span></div><table class="tabel"><tbody>' + g.kel.map(function (k) {
      var a = g.angg[k] || 0, p = g.pakaiAngg[k] || 0, pc = a ? Math.min(100, Math.round(p / a * 100)) : 0;
      return '<tr><td><b>' + esc(k) + '</b>' + (a ? '<div class="prog" style="margin-top:6px"><i style="width:' + pc + '%;' + (p > a ? 'background:var(--merah)' : '') + '"></i></div>' : '') + '</td><td class="r angka">' + rp(p) + '<small>' + (a ? 'dari ' + rp(a) + ' · sisa ' + rp(a - p) : 'terpakai') + '</small></td></tr>'; }).join('') + '</tbody></table>' +
      '<p class="sb">Terpakai = pengajuan yang disetujui bulan ini. Anggaran diisi lewat menu Pengadaan di Master Data lama.</p></div>';
    var list = g.items.filter(function (x) {
      if (P.rKel && x.kel !== P.rKel) return false;
      if (P.rSt === 'perlu' && !(x.st === 'Kritis' || x.st === 'Saatnya pesan')) return false;
      if (P.rSt && P.rSt !== 'perlu' && x.st !== P.rSt) return false;
      return cocok(x.k + ' ' + x.n, P.rCari);
    });
    var urut = { 'Kritis': 0, 'Saatnya pesan': 1, 'Aman': 2, 'Berlebih': 3 };
    list.sort(function (a, b) { return (urut[a.st] === undefined ? 4 : urut[a.st]) - (urut[b.st] === undefined ? 4 : urut[b.st]) || (a.hari === null ? 9999 : a.hari) - (b.hari === null ? 9999 : b.hari); });
    h += '<div class="cd"><div class="aksi-baris" style="margin-bottom:10px"><input class="isian" id="rCari" placeholder="Cari kode atau nama" value="' + esc(P.rCari) + '">' +
      '<select class="st-order" id="rSt">' + [['perlu', 'Perlu dibeli'], ['', 'Semua status'], ['Kritis', 'Kritis'], ['Saatnya pesan', 'Saatnya pesan'], ['Aman', 'Aman'], ['Berlebih', 'Berlebih']].map(function (o) { return '<option value="' + o[0] + '"' + (P.rSt === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' +
      '<select class="st-order" id="rKel"><option value="">Semua kelompok</option>' + g.kel.map(function (k) { return '<option' + (P.rKel === k ? ' selected' : '') + '>' + esc(k) + '</option>'; }).join('') + '</select></div>';
    h += '<p class="sb" style="margin:0 0 8px">' + list.length + ' barang</p>';
    if (!list.length) h += '<div class="ksg">Tidak ada barang yang cocok.</div>';
    else h += '<div class="gulir"><table class="tabel"><thead><tr><th>Barang</th><th class="r">Stok</th><th class="r hp-x">Terpakai/hari</th><th class="r">Cukup</th><th class="r">Saran beli</th></tr></thead><tbody>' + list.slice(0, 300).map(function (x) {
      return '<tr><td>' + esc(x.n) + ' <span class="label ' + (WARNA_RB[x.st] || 'abu') + '">' + esc(x.st) + '</span><small>' + esc(x.kel) + ' · ' + esc(x.k) + '<span class="hp-x"> · tunggu ' + x.lead + ' + cadangan ' + x.cad + ' + beli untuk ' + x.siklus + ' hari</span></small>' + (x.ket && x.ket.length ? '<small>' + esc(x.ket.join(' ')) + '</small>' : '') + '</td>' +
        '<td class="r angka' + (x.stok < 0 ? ' mn' : '') + '">' + angkaId(x.stok, 2) + (x.transit ? '<small>+ ' + angkaId(x.transit, 2) + ' di jalan</small>' : '') + '</td><td class="r angka hp-x">' + angkaId(x.rata, 2) + '</td><td class="r angka">' + (x.hari !== null && x.hari !== undefined ? x.hari + ' hari' : '–') + '</td>' +
        '<td class="r angka"><b>' + (x.saran ? angkaId(x.saran) + ' ' + esc(x.s) : '–') + '</b>' + (x.nilai ? '<small>' + rp(x.nilai) + '</small>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>';
    h += '<p class="sb">Robot membaca stok semua lokasi, barang dalam perjalanan, dan rata-rata terpakai/terjual. Setelan waktu tunggu dan cadangan per barang diubah lewat menu Pengadaan di Master Data lama. Staf mengajukan pembelian dari formulirnya.</p></div>';
    var km = g.kemasan || {};
    if (km.q30 || (km.akhir || []).length) h += '<div class="cd"><div class="kpl"><h3>Packaging (belum ada catatan stok)</h3><span class="sb">30 hari ' + rp(km.q30 || 0) + ' · 90 hari ' + rp(km.q90 || 0) + '</span></div><table class="tabel"><tbody>' + (km.akhir || []).slice(0, 10).map(function (a) { return '<tr><td>' + esc(a.ket) + '<small>' + esc(tglId(a.t)) + '</small></td><td class="r angka">' + rp(a.v) + '</td></tr>'; }).join('') + '</tbody></table></div>';
    return h;
  }
  async function aksiAjuan(b) {
    var a = b.getAttribute('data-aj-a'), kartu = b.closest('[data-aj]'), no = kartu.getAttribute('data-aj'), g = D.pengadaan;
    var x = g.ajuan.filter(function (y) { return y.no === no; })[0]; if (!x) return;
    var nilai = function (f) { var i = kartu.querySelector('[data-f="' + f + '"]'); return i ? i.value.trim() : ''; };
    var salah = function (t) { $('msgPurch').innerHTML = '<div class="msg bad">' + esc(t) + '</div>'; window.scrollTo(0, 0); };
    var p = { nos: [no], aksi: a, catatan: nilai('cat') }, ringkas;
    if (a === 'setuju') {
      var qs = Number(nilai('qs').replace(/\./g, '').replace(',', '.'));
      if (!(qs > 0)) { salah('Qty disetujui ' + x.n + ' harus lebih dari 0.'); return; }
      p.qty = {}; p.qty[no] = qs;
      ringkas = 'Setujui pengajuan ' + x.n + ' ' + angkaId(qs, 2) + ' ' + x.s + ' (' + no + ')';
    } else if (a === 'tolak' || a === 'batal') {
      if (p.catatan.length < 3) { salah('Tulis alasan ' + (a === 'tolak' ? 'penolakan' : 'pembatalan') + ' pengajuan ' + x.n + '.'); return; }
      if (!confirm((a === 'tolak' ? 'Tolak' : 'Batalkan') + ' pengajuan ' + x.n + '?')) return;
      ringkas = (a === 'tolak' ? 'Tolak' : 'Batalkan') + ' pengajuan ' + x.n + ' (' + no + '): ' + p.catatan;
    } else if (a === 'pesan') {
      p.ref = nilai('ref'); p.eta = nilai('eta');
      if (!p.eta) { salah('Isi perkiraan tanggal ' + x.n + ' datang.'); return; }
      ringkas = 'Pengajuan ' + x.n + ' dipesan' + (p.ref ? ' ke ' + p.ref : '') + ', datang ' + tglId(p.eta);
    } else if (a === 'terima') {
      ringkas = 'Pengajuan ' + x.n + ' diterima (' + no + ')';
    } else return;
    b.disabled = true;
    // Keputusan langsung tersimpan di Supabase (pengadaan_aksi = pgdAksi); daftar di sini dihitung ulang Apps Script.
    var r = await sb.rpc('pengadaan_aksi', { p_aksi: a, p_nos: p.nos || [no], p_qty: p.qty || null, p_catatan: p.catatan || '', p_ref: p.ref || '', p_eta: p.eta || '', p_nama: '' });
    if (r.error) { salah('Gagal menyimpan: ' + r.error.message); b.disabled = false; return; }
    if (!r.data || !r.data.ok) { salah((r.data && r.data.pesan) || 'Gagal menyimpan.'); b.disabled = false; return; }
    salinKeSheetGaji();
    await sb.from('md_aksi').insert({ fungsi: 'segarkan', param: {}, ringkas: 'Hitung ulang sesudah ' + String(ringkas).slice(0, 150) });
    await muatAksi(); gambarPurch();
    $('msgPurch').innerHTML = '<div class="msg ok">' + esc(r.data.pesan) + ' Daftar di halaman ini diperbarui paling lambat 10 menit lagi.</div>';
  }
  async function cekTanpa(b) {
    var no = b.getAttribute('data-tanpa'); b.disabled = true;
    // Langsung tersimpan di Supabase (pgs_tanpa_cek = pgsTanpaCek).
    var r = await sb.rpc('pgs_tanpa_cek', { p_no: no });
    var gagal = r.error ? r.error.message : (!r.data || !r.data.ok) ? ((r.data && r.data.pesan) || 'Gagal menyimpan.') : '';
    if (gagal) { $('msgPurch').innerHTML = '<div class="msg bad">' + esc(gagal) + '</div>'; b.disabled = false; return; }
    salinKeSheetGaji();
    await sb.from('md_aksi').insert({ fungsi: 'segarkan', param: {}, ringkas: 'Hitung ulang sesudah cek pembelian tanpa pengajuan ' + no });
    $('msgPurch').innerHTML = '<div class="msg ok">' + esc(r.data.pesan) + ' Daftar diperbarui paling lambat 10 menit lagi.</div>';
    await muatAksi(); gambarPurch();
  }

  async function aksiPo(b) {
    var a = b.getAttribute('data-po-a'), kartu = b.closest('[data-no]'), no = kartu.getAttribute('data-no'), d = D.gudang;
    var o = d.po.filter(function (x) { return x.no === no; })[0]; if (!o) return;
    var nilai = function (f) { var i = kartu.querySelector('[data-f="' + f + '"]'); return i ? (i.type === 'checkbox' ? i.checked : i.value.trim()) : ''; };
    var pesanP = function (t, ok) { $('msgPurch').innerHTML = '<div class="msg ' + (ok ? 'ok' : 'bad') + '">' + esc(t) + '</div>'; window.scrollTo(0, 0); };
    if (a === 'detail') { P.buka[no] = !P.buka[no]; gambarPurch(); return; }
    if (a === 'batal') { P.buka['batal:' + no] = !P.buka['batal:' + no]; gambarPurch(); return; }
    var tok = function () { return 'md' + Date.now() + '-' + Math.random().toString(36).slice(2, 7); };
    var kirim = [];
    if (a === 'setuju' || a === 'setujuBayar') {
      kirim.push({ fungsi: 'gdPoPutus', param: { no: no, setuju: true, catatan: nilai('cat'), token: tok() }, ringkas: 'Setujui ' + no + ' (' + o.sup + ', ' + rp(o.tot) + ')' });
      if (a === 'setujuBayar') {
        var t1 = nilai('tgl') || d.hariIni;
        if (!confirm('Setujui ' + no + ' dan tandai sudah dibayar ' + rp(o.tot) + ' lewat ' + o.bayar + ' tanggal ' + tglId(t1) + '? Pembayaran otomatis tercatat di accounting.')) return;
        kirim.push({ fungsi: 'gdPoBayar', param: { no: no, tanggal: t1, token: tok() }, ringkas: no + ' dibayar ' + rp(o.tot) + ' (' + o.bayar + ', ' + tglId(t1) + ')' });
      }
    } else if (a === 'tolak') {
      var c = nilai('cat'); if (c.length < 3) { pesanP('Tulis alasan penolakan ' + no + ' di kolom catatan.'); return; }
      if (!confirm('Tolak ' + no + '?')) return;
      kirim.push({ fungsi: 'gdPoPutus', param: { no: no, setuju: false, catatan: c, token: tok() }, ringkas: 'Tolak ' + no + ': ' + c });
    } else if (a === 'bayar') {
      var t2 = nilai('tgl') || d.hariIni;
      if (!confirm('Tandai ' + no + ' sudah dibayar ' + rp(o.tot) + ' lewat ' + o.bayar + ' tanggal ' + tglId(t2) + '? Pembayaran otomatis tercatat di accounting.')) return;
      kirim.push({ fungsi: 'gdPoBayar', param: { no: no, tanggal: t2, token: tok() }, ringkas: no + ' dibayar ' + rp(o.tot) + ' (' + o.bayar + ', ' + tglId(t2) + ')' });
    } else if (a === 'biaya') {
      var id = Number(b.getAttribute('data-id')), bi = o.biaya.filter(function (x) { return x.id === id; })[0], t3 = nilai('tgl-' + id) || d.hariIni;
      if (!bi || !confirm('Tandai ' + bi.j + ' ' + rp(bi.v) + ' ' + no + ' sudah dibayar tanggal ' + tglId(t3) + '? Otomatis tercatat di accounting.')) return;
      kirim.push({ fungsi: 'gdBiayaBayar', param: { no: no, id: id, tanggal: t3, token: tok() }, ringkas: bi.j + ' ' + no + ' dibayar ' + rp(bi.v) });
    } else if (a === 'batalYa') {
      var al = nilai('alasan'); if (al.length < 3) { pesanP('Tulis alasan pembatalan ' + no + '.'); return; }
      var bu = kartu.querySelector('[data-f="batalUang"]') ? nilai('batalUang') : true;
      if (!confirm('Batalkan ' + no + ' (' + o.sup + ', ' + rp(o.tot) + ')?' + (bu && o.wb ? ' Uang keluarnya di accounting ikut dibatalkan.' : ''))) return;
      kirim.push({ fungsi: 'gdPoBatalMgmt', param: { no: no, alasan: al, batalUang: bu, token: tok() }, ringkas: 'Batalkan ' + no + ': ' + al });
    } else return;
    b.disabled = true;
    // Langsung tersimpan di Supabase (po_putus / po_bayar / po_biaya_bayar / po_batal); daftar di sini dihitung ulang Apps Script.
    var rpcPo = {
      gdPoPutus: function (x) { return ['po_putus', { p_no: x.no, p_setuju: !!x.setuju, p_catatan: x.catatan || '', p_token: x.token }]; },
      gdPoBayar: function (x) { return ['po_bayar', { p_no: x.no, p_tanggal: x.tanggal || '', p_token: x.token }]; },
      gdBiayaBayar: function (x) { return ['po_biaya_bayar', { p_no: x.no, p_id: x.id, p_tanggal: x.tanggal || '', p_token: x.token }]; },
      gdPoBatalMgmt: function (x) { return ['po_batal', { p_no: x.no, p_alasan: x.alasan || '', p_batal_uang: x.batalUang !== false, p_token: x.token }]; }
    };
    var hasil = [];
    for (var i = 0; i < kirim.length; i++) {
      var c = rpcPo[kirim[i].fungsi](kirim[i].param);
      var r = await sb.rpc(c[0], c[1]);
      var gagal = r.error ? 'Gagal menyimpan: ' + r.error.message : (!r.data || !r.data.ok) ? ((r.data && r.data.pesan) || 'Gagal menyimpan.') : '';
      if (gagal) {
        if (hasil.length) { salinKeSheetGaji(); await sb.from('md_aksi').insert({ fungsi: 'segarkan', param: {}, ringkas: 'Hitung ulang sesudah ' + String(kirim[0].ringkas).slice(0, 150) }); }
        pesanP((hasil.length ? hasil.join(' ') + ' ' : '') + gagal); b.disabled = false; return;
      }
      hasil.push(r.data.pesan);
    }
    salinKeSheetGaji();
    await sb.from('md_aksi').insert({ fungsi: 'segarkan', param: {}, ringkas: 'Hitung ulang sesudah ' + String(kirim.map(function (k) { return k.ringkas; }).join(' · ')).slice(0, 150) });
    P.buka['batal:' + no] = false;
    await muatAksi(); gambarPurch();
    pesanP(hasil.join(' ') + ' Daftar di halaman ini diperbarui paling lambat 10 menit lagi.', true);
  }

  // ======================= PERSETUJUAN: pembungkus 3 bagian =======================
  async function muatAksi() {
    var a = await sb.from('md_aksi').select('*').order('id', { ascending: false }).limit(15);
    if (!a.error) D.aksi = a.data || [];
  }
  // Memanggil fungsi Apps Script lewat jembatan aplikasi (form Master Data lama), dengan sesi masuk manajemen.
  var SERVER_AS = 'https://script.google.com/macros/s/AKfycbxcidGDrc33WJYcxzPf1dnRFzgafzbhwomXKlj3KjfYUHosPyI0qNpBcY9tvI7-PgI2/exec?app=';
  async function kirimAS(f, a) {
    var s = await sb.auth.getSession(), t = s && s.data && s.data.session ? s.data.session.access_token : '';
    if (!t) throw new Error('Sesi masuk habis. Muat ulang halaman lalu masuk lagi.');
    var r;
    try { r = await fetch(SERVER_AS + 'mdlama', { method: 'POST', body: JSON.stringify({ t: t, f: f, a: a || [] }), redirect: 'follow' }); }
    catch (e) { throw new Error('Tidak tersambung ke server. Periksa internet lalu coba lagi.'); }
    var teks = await r.text(), d = null;
    try { d = JSON.parse(teks); } catch (e) { throw new Error('Jawaban server tidak terbaca. Coba lagi sebentar lagi.'); }
    if (!d || d.ok !== true) throw new Error((d && d.pesan) || 'Server menolak permintaan.');
    return d;
  }
  function gambarUpload() {
    var el = $('bUpload'); if (!el || !window.UploadMP) return;
    UploadMP.gambar(el, { kirim: kirimAS, selesai: function () { BR.cache = {}; gambarBeranda(); } });
  }
  async function kirimAksi(fungsi, param, ringkas, tempatPesan, teksOk) {
    var r = await sb.from('md_aksi').insert({ fungsi: fungsi, param: param, ringkas: String(ringkas).slice(0, 200) });
    if (r.error) { if (tempatPesan) tempatPesan.innerHTML = '<div class="msg bad">Gagal mengirim: ' + esc(r.error.message) + '</div>'; return false; }
    await muatAksi(); gambarSetuju();
    var el = $('msgUtama'); if (el) el.innerHTML = '<div class="msg ok">' + esc(teksOk || 'Tercatat. Diterapkan ke Google Sheets paling lambat 10 menit lagi.') + '</div>';
    return true;
  }
  async function hitungUlang(b) {
    if (b) b.disabled = true;
    var r = await sb.from('md_aksi').insert({ fungsi: 'segarkan', param: {}, ringkas: 'Hitung ulang semua data Master Data' });
    if (b) b.disabled = false;
    await muatAksi(); gambarSetuju();
    alertMsg(r.error ? 'Gagal meminta hitung ulang: ' + r.error.message : 'Hitung ulang diminta. Angka baru muncul paling lambat 10 menit lagi (tekan Muat ulang).', !r.error);
  }
  function alertMsg(t, ok) {
    var tujuan = document.querySelector('#mIsi > section.on');
    if (!tujuan) return;
    var el = tujuan.querySelector('.msg-atas');
    if (!el) { el = document.createElement('div'); el.className = 'msg-atas'; tujuan.insertBefore(el, tujuan.firstChild); }
    el.innerHTML = '<div class="msg ' + (ok ? 'ok' : 'bad') + '">' + esc(t) + '</div>';
  }
  function antreNo() {
    var o = {};
    D.aksi.filter(function (a) { return a.status === 'menunggu'; }).forEach(function (a) {
      if (a.fungsi === 'rpPutus' || a.fungsi === 'rpTandai') o[a.param.no] = a.ringkas;
    });
    return o;
  }

  function gambarSetuju() {
    var el = $('bSetuju');
    var nR = D.request ? D.request.n || 0 : 0, nP = D.pantau ? (D.pantau.aktif || []).length : 0, nS = D.setuju ? D.setuju.menunggu || 0 : 0;
    var nK = window.KoreksiJual ? window.KoreksiJual.menunggu() : 0;
    M.badge('setuju', nR + nS + nK);
    var antre = D.aksi.filter(function (a) { return a.status === 'menunggu'; });
    var h = '<div id="msgUtama"></div>';
    if (antre.length) h += '<div class="msg tunggu">' + antre.length + ' keputusan sedang diterapkan ke Google Sheets (paling lambat 10 menit): ' + antre.slice(0, 3).map(function (a) { return esc(a.ringkas); }).join(' · ') + '</div>';
    h += '<div class="chip" role="group" aria-label="Bagian persetujuan">' +
      [['request', 'Request barang', nR + ' menunggu'], ['pantau', 'Pantau pengiriman', nP + ' berjalan'], ['sesuai', 'Penyesuaian stok', nS + ' menunggu'], ['koreksi', 'Koreksi penjualan', nK + ' menunggu']].map(function (b) {
        return '<button type="button" data-bg="' + b[0] + '" aria-pressed="' + (BAGIAN === b[0]) + '"><span>' + b[1] + '</span><b>' + b[2] + '</b></button>';
      }).join('') + '</div>';
    h += '<div id="bgRequest"' + (BAGIAN === 'request' ? '' : ' hidden') + '></div><div id="bgPantau"' + (BAGIAN === 'pantau' ? '' : ' hidden') + '></div><div id="bgSesuai"' + (BAGIAN === 'sesuai' ? '' : ' hidden') + '></div><div id="bgKoreksi"' + (BAGIAN === 'koreksi' ? '' : ' hidden') + '></div>';
    var log = D.aksi.filter(function (a) { return a.fungsi !== 'segarkan'; });
    if (log.length) {
      h += '<div class="cd"><h3>Keputusan dari aplikasi baru</h3><table class="tabel"><tbody>' + log.slice(0, 10).map(function (a) {
        var lbl = a.status === 'menunggu' ? '<span class="label abu">diterapkan…</span>' : a.status === 'selesai' ? '<span class="label ok">selesai</span>' : '<span class="label no">gagal</span>';
        return '<tr><td>' + esc(a.ringkas) + '<small>' + new Date(a.dibuat).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) + (a.hasil && a.hasil.pesan ? ' · ' + esc(a.hasil.pesan) : '') + '</small></td><td class="r">' + lbl + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    }
    el.innerHTML = h;
    el.querySelectorAll('[data-bg]').forEach(function (b) { b.onclick = function () { BAGIAN = b.getAttribute('data-bg'); gambarSetuju(); }; });
    gambarRequest(); gambarPantau(); gambarSesuai();
    if (window.KoreksiJual) window.KoreksiJual.gambarSetuju($('bgKoreksi'));
  }

  // ---------- Request barang toko & consignment (rpDaftar / rpPutus) ----------
  var WARNA_ST = { 'Kritis': 'no', 'Segera isi': 'w', 'Aman': 'ok', 'Berlebih': 'w', 'Belum laku': 'no', 'Belum dicoba': 'abu', 'Belum ada data': 'abu' };
  function gambarRequest() {
    var R = D.request, el = $('bgRequest'); if (!el) return;
    if (!R) { el.innerHTML = '<div class="msg w">Daftar request belum tersedia. Tekan "Hitung ulang sekarang".</div>'; return; }
    var antre = antreNo();
    if (!R.list || !R.list.length) { el.innerHTML = '<div class="cd"><div class="aman">Tidak ada request barang yang menunggu.</div></div>'; return; }
    el.innerHTML = R.list.map(function (o, i) {
      var q = antre[o.no];
      var tanda = [];
      if (o.kurang) tanda.push('<span class="label no">' + o.kurang + ' barang melebihi stok gudang</span>');
      if (o.lebih) tanda.push('<span class="label w">' + o.lebih + ' barang lebih dari ' + (R.batas || 60) + ' hari</span>');
      if (o.belumLaku) tanda.push('<span class="label w">' + o.belumLaku + ' barang belum laku</span>');
      return '<div class="cd"><div class="rq-kpl"><h3>' + esc(o.pl) + '</h3><span class="sb">' + esc(o.no) + ' · ' + esc(o.t) + (o.p ? ' · ' + esc(o.p) : '') + '</span></div>' +
        (o.c ? '<div class="sb">Catatan: ' + esc(o.c) + '</div>' : '') +
        '<div class="rq-mt"><span class="label biru">' + fmt(o.q) + ' pcs</span><span class="label abu">nilai HPP ' + rp(o.nilai) + '</span>' + tanda.join('') + '</div>' +
        '<div class="gulir"><table class="tabel rq-tbl"><thead><tr><th>Barang</th><th class="r">Minta</th><th class="r">Gudang</th><th class="r">Stok toko</th><th class="r">Laku 30 hr</th><th class="r">Cukup</th><th class="r">Saran</th></tr></thead><tbody>' +
        o.items.map(function (it) {
          return '<tr><td><b>' + esc(it.n) + '</b>' + (it.w ? '<small>' + esc(it.w) + '</small>' : '') + '<small><span class="label ' + (WARNA_ST[it.st] || 'abu') + '">' + esc(it.st) + '</span></small></td>' +
            '<td class="r"><b>' + fmt(it.q) + '</b></td><td class="r' + (it.q > it.gd ? ' kurang' : '') + '">' + fmt(it.gd) + '</td><td class="r">' + fmt(it.s) + '</td><td class="r">' + fmt(it.j30) + '</td>' +
            '<td class="r">' + (it.cukup === null || it.cukup === undefined ? '–' : fmt(it.cukup) + ' hr') + '</td><td class="r">' + fmt(it.saran) + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<p class="sb" style="margin:0">Cukup = perkiraan stok toko cukup berapa hari setelah barang diterima. Saran robot = jumlah supaya stok cukup ' + (R.target || 30) + ' hari. Data penjualan ' + fmt(o.hari) + ' hari terakhir.</p>' +
        (q ? '<div class="msg tunggu" style="margin:0">Sedang diterapkan: ' + esc(q) + '</div>'
          : '<div class="aksi-baris"><input class="isian" placeholder="Alasan (wajib kalau ditolak)" maxlength="200" data-alasan="' + i + '"><button type="button" class="tbl pri" data-rq="' + i + '" data-aksi="setuju">Setujui</button><button type="button" class="tbl mer" data-rq="' + i + '" data-aksi="tolak">Tolak</button></div><div data-pesan="' + i + '"></div>') +
        '</div>';
    }).join('');
    el.querySelectorAll('[data-rq]').forEach(function (b) {
      b.onclick = async function () {
        var i = +b.getAttribute('data-rq'), o = R.list[i], aksi = b.getAttribute('data-aksi');
        var alasan = (el.querySelector('[data-alasan="' + i + '"]').value || '').trim();
        var tempat = el.querySelector('[data-pesan="' + i + '"]');
        if (aksi === 'tolak' && !alasan) { tempat.innerHTML = '<div class="msg bad">Isi alasan penolakan dulu.</div>'; return; }
        b.disabled = true;
        // Langsung tersimpan di Supabase (order_status = rpPutus); Telegram dikirim Apps Script.
        var r = await sb.rpc('order_status', { p_no: o.no, p_status: '', p_rp: aksi, p_alasan: alasan });
        var gagal = r.error ? r.error.message : (!r.data || !r.data.ok) ? ((r.data && r.data.pesan) || 'Gagal menyimpan.') : '';
        if (gagal) { tempat.innerHTML = '<div class="msg bad">' + esc(gagal) + '</div>'; b.disabled = false; return; }
        salinKeSheetGaji();
        await sb.from('md_aksi').insert({ fungsi: 'segarkan', param: {}, ringkas: 'Hitung ulang sesudah ' + (aksi === 'setuju' ? 'setujui' : 'tolak') + ' request ' + o.no });
        tempat.innerHTML = '<div class="msg ok">' + esc(r.data.pesan) + ' Daftar diperbarui paling lambat 10 menit lagi.</div>';
        el.querySelectorAll('[data-rq="' + i + '"]').forEach(function (x) { x.disabled = true; });
      };
    });
  }

  // ---------- Pantau pengiriman (rpPantau / rpTandai) ----------
  function gambarPantau() {
    var P = D.pantau, el = $('bgPantau'); if (!el) return;
    if (!P) { el.innerHTML = '<div class="msg w">Data pengiriman belum tersedia. Tekan "Hitung ulang sekarang".</div>'; return; }
    var antre = antreNo();
    var h = '<p class="tl">Diperbarui ' + esc(P.diperbarui || '') + (P.nTahan ? ' · <b style="color:#B42318">' + P.nTahan + ' tertahan</b>' : '') + (P.nSelisih ? ' · ' + P.nSelisih + ' ada selisih terima' : '') + '</p>';
    if (!P.aktif || !P.aktif.length) h += '<div class="cd"><div class="aman">Tidak ada pengiriman yang sedang berjalan.</div></div>';
    (P.aktif || []).forEach(function (o, i) {
      var q = antre[o.no], pr = o.q ? Math.round(o.kirim / o.q * 100) : 0;
      var lbl = o.st === 'Dikirim' ? '<span class="label biru">Dikirim, menunggu toko</span>' : (o.dp ? '<span class="label w">Diproses gudang</span>' : '<span class="label abu">Disetujui, belum diproses</span>');
      var bisaSelesai = o.st === 'Dikirim' || (o.st === 'Disetujui' && o.kirim > 0 && o.sisa === 0);
      var bisaKirim = o.st === 'Disetujui' && o.kirim > 0, bisaBatal = o.st === 'Disetujui' && !o.kirim;
      h += '<div class="cd"><div class="rq-kpl"><h3>' + esc(o.pl) + '</h3><span class="sb">' + esc(o.no) + ' · ' + esc(o.t) + '</span></div>' +
        '<div class="rq-mt">' + lbl + (o.tahan ? '<span class="label no">' + esc(o.tahan) + '</span>' : '') + '</div>' +
        '<div><div class="tx" style="display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:5px"><span>Terkirim ' + fmt(o.kirim) + ' dari ' + fmt(o.q) + ' pcs</span><b>' + (o.sisa ? 'sisa ' + fmt(o.sisa) : 'lengkap') + '</b></div><div class="prog"><i style="width:' + pr + '%"></i></div></div>';
      var info = [];
      if (o.dp) info.push('Diproses ' + esc(o.dp.oleh || '') + ' · ' + esc(o.dp.t || ''));
      (o.kr || []).forEach(function (k) { info.push('Dikirim ' + esc(k.t || '') + (k.sj ? ' · ' + esc(k.sj) : '') + (k.kurir ? ' · ' + esc(k.kurir) : '') + (k.resi ? ' · resi ' + esc(k.resi) : '') + (k.ongkir ? ' · ongkir ' + rp(k.ongkir) : '') + (k.foto && /^https:\/\//.test(k.foto) ? ' · <a href="' + esc(k.foto) + '" target="_blank" rel="noopener">foto paket</a>' : '')); });
      if (!(o.kr || []).length && (o.sj || []).length) info.push('Surat jalan: ' + o.sj.map(esc).join(', '));
      if (o.tr) info.push('Diterima ' + esc(o.tr.oleh || '') + ' · ' + esc(o.tr.t || '') + (o.tr.selisih ? ' · <b style="color:#B42318">selisih ' + fmt(o.tr.selisih) + ' pcs</b>' : '') + (o.tr.c ? ' · ' + esc(o.tr.c) : ''));
      if (info.length) h += '<div class="kirim">' + info.map(function (t) { return '<div>' + t + '</div>'; }).join('') + '</div>';
      h += '<details><summary class="sb" style="cursor:pointer">Rincian ' + o.items.length + ' barang</summary><table class="tabel"><tbody>' + o.items.map(function (it) {
        return '<tr><td>' + esc(it.n) + (it.w ? ' – ' + esc(it.w) : '') + '</td><td class="r">' + fmt(it.kirim) + ' / ' + fmt(it.q) + '</td></tr>'; }).join('') + '</tbody></table></details>';
      if (q) h += '<div class="msg tunggu" style="margin:0">Sedang diterapkan: ' + esc(q) + '</div>';
      else if (bisaSelesai || bisaKirim || bisaBatal) {
        h += '<div class="aksi-baris"><input class="isian" placeholder="Catatan / alasan (alasan wajib kalau dibatalkan)" maxlength="200" data-pc="' + i + '">' +
          (bisaSelesai ? '<button type="button" class="tbl pri" data-pt="' + i + '" data-aksi="selesai">Tandai diterima toko</button>' : '') +
          (bisaKirim ? '<button type="button" class="tbl" data-pt="' + i + '" data-aksi="kirim">Tandai dikirim (sisa tidak dikirim)</button>' : '') +
          (bisaBatal ? '<button type="button" class="tbl mer" data-pt="' + i + '" data-aksi="batal">Batalkan</button>' : '') + '</div><div data-pp="' + i + '"></div>';
      }
      h += '</div>';
    });
    if ((P.selesai || []).length) {
      h += '<div class="cd"><h3>Selesai / batal 30 hari terakhir</h3><table class="tabel"><tbody>' + P.selesai.map(function (o) {
        return '<tr><td><b>' + esc(o.pl) + '</b><small>' + esc(o.no) + ' · ' + esc(o.t) + (o.tr && o.tr.selisih ? ' · selisih ' + fmt(o.tr.selisih) + ' pcs' : '') + '</small></td><td class="r"><span class="label ' + (o.st === 'Selesai' ? 'ok' : 'no') + '">' + esc(o.st) + '</span><small>' + fmt(o.kirim) + ' / ' + fmt(o.q) + ' pcs</small></td></tr>';
      }).join('') + '</tbody></table></div>';
    }
    el.innerHTML = h;
    el.querySelectorAll('[data-pt]').forEach(function (b) {
      b.onclick = async function () {
        var i = +b.getAttribute('data-pt'), o = P.aktif[i], aksi = b.getAttribute('data-aksi');
        var cat = (el.querySelector('[data-pc="' + i + '"]').value || '').trim(), tempat = el.querySelector('[data-pp="' + i + '"]');
        if (aksi === 'batal' && !cat) { tempat.innerHTML = '<div class="msg bad">Isi alasan pembatalan dulu.</div>'; return; }
        b.disabled = true;
        var nama = { selesai: 'Tandai diterima', kirim: 'Tandai dikirim', batal: 'Batalkan' }[aksi];
        // Langsung tersimpan di Supabase (rp_tandai = rpTandai); Telegram dikirim Apps Script.
        var r = await sb.rpc('rp_tandai', { p_no: o.no, p_aksi: aksi, p_catatan: cat, p_alasan: cat });
        var gagal = r.error ? r.error.message : (!r.data || !r.data.ok) ? ((r.data && r.data.pesan) || 'Gagal menyimpan.') : '';
        if (gagal) { tempat.innerHTML = '<div class="msg bad">' + esc(gagal) + '</div>'; b.disabled = false; return; }
        salinKeSheetGaji();
        await sb.from('md_aksi').insert({ fungsi: 'segarkan', param: {}, ringkas: 'Hitung ulang sesudah ' + nama + ' ' + o.no });
        tempat.innerHTML = '<div class="msg ok">' + esc(r.data.pesan) + ' Daftar diperbarui paling lambat 10 menit lagi.</div>';
        el.querySelectorAll('[data-pt="' + i + '"]').forEach(function (x) { x.disabled = true; });
      };
    });
  }

  // ======================= PERSETUJUAN =======================
  function gambarSesuai() {
    var ST = D.setuju, el = $('bgSesuai');
    if (!ST) { el.innerHTML = '<div class="msg w">Daftar persetujuan belum tersedia.</div>'; return; }
    var antre = D.aksi.filter(function (a) { return a.status === 'menunggu' && a.fungsi === 'mdSetujuPutus'; }), dalam = {};
    antre.forEach(function (a) { (a.param.toko || []).concat(a.param.prod || []).forEach(function (no) { dalam[no] = a.param.setuju ? 'disetujui' : 'ditolak'; }); });
    var h = '<p class="tl">Diperbarui ' + esc(ST.diperbarui) + '</p><div id="msgSetuju"></div>';
    h += '<div class="cd"><div class="kpl"><h3>Penyesuaian stok menunggu</h3><span class="sb">' + (ST.menunggu || 0) + ' ajuan</span></div>';
    if (!ST.grup || !ST.grup.length) h += '<div class="aman">Tidak ada ajuan yang menunggu.</div>';
    else {
      h += '<label class="sb" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="pilihSemua" style="width:18px;height:18px;accent-color:#1E78A8"> Pilih semua</label>';
      ST.grup.forEach(function (g) {
        h += '<div class="grup"><h4>' + esc(g.n) + ' <span class="label abu">' + g.items.length + '</span></h4>';
        g.items.forEach(function (x) {
          var sel = Number(x.sel) || 0, q = dalam[x.no];
          h += '<label class="ajuan"><input type="checkbox" data-jenis="' + esc(g.jenis) + '" data-no="' + esc(x.no) + '"' + (q ? ' disabled' : '') + '>' +
            '<div><b>' + esc(x.n) + (x.w ? ' – ' + esc(x.w) : '') + '</b><small>Sistem ' + fmt(x.sis) + ' · dihitung ' + fmt(x.hit) + (x.al ? ' · ' + esc(x.al) : '') + '</small><small>' + esc(x.pg || '') + ' · ' + esc(x.t || '') + (x.bg ? ' · ' + esc(x.bg) : '') + (q ? ' · <b>sedang ' + q + '</b>' : '') + '</small></div>' +
            '<span class="sel angka ' + (sel > 0 ? 'plus' : sel < 0 ? 'min' : '') + '">' + (sel > 0 ? '+' : '') + fmt(sel) + '</span></label>';
        });
        h += '</div>';
      });
      h += '<label class="sb">Catatan untuk pengaju (boleh kosong)<input class="isian" id="catatan" maxlength="160"></label>' +
        '<div class="baris"><button type="button" class="tbl pri lebar" id="tSetuju" disabled style="flex:1 1 160px">Setujui yang dipilih</button><button type="button" class="tbl mer lebar" id="tTolak" disabled style="flex:1 1 160px">Tolak yang dipilih</button></div>';
    }
    h += '</div>';
    var rw = ST.riwayat || [];
    if (rw.length) h += '<div class="cd"><h3>Keputusan terakhir</h3><div class="gulir"><table class="tabel"><tbody>' + rw.map(function (x) {
      var sel = Number(x.sel) || 0;
      return '<tr><td><b>' + esc(x.n) + (x.w ? ' – ' + esc(x.w) : '') + '</b><small>' + esc(x.dari) + ' · ' + esc(x.pg || '') + ' · ' + esc(x.tk || '') + (x.cat ? ' · ' + esc(x.cat) : '') + '</small></td>' +
        '<td class="r"><span class="sel angka ' + (sel > 0 ? 'plus' : sel < 0 ? 'min' : '') + '">' + (sel > 0 ? '+' : '') + fmt(sel) + '</span><small><span class="label ' + (/setuju/i.test(x.st) ? 'ok' : 'no') + '">' + esc(x.st) + '</span></small></td></tr>';
    }).join('') + '</tbody></table></div></div>';
    el.innerHTML = h;

    var kotak = el.querySelectorAll('input[data-no]');
    function hitung() {
      var n = 0; kotak.forEach(function (k) { if (k.checked) n++; });
      if ($('tSetuju')) { $('tSetuju').disabled = !n; $('tTolak').disabled = !n; $('tSetuju').textContent = n ? 'Setujui ' + n + ' ajuan' : 'Setujui yang dipilih'; $('tTolak').textContent = n ? 'Tolak ' + n + ' ajuan' : 'Tolak yang dipilih'; }
    }
    kotak.forEach(function (k) { k.onchange = hitung; });
    if ($('pilihSemua')) $('pilihSemua').onchange = function () { var on = this.checked; kotak.forEach(function (k) { if (!k.disabled) k.checked = on; }); hitung(); };
    if ($('tSetuju')) { $('tSetuju').onclick = function () { putuskan(true); }; $('tTolak').onclick = function () { putuskan(false); }; }
  }

  async function putuskan(setuju) {
    var toko = [], prod = [], nama = [];
    $('bgSesuai').querySelectorAll('input[data-no]:checked').forEach(function (k) {
      (k.dataset.jenis === 'toko' ? toko : prod).push(k.dataset.no);
      nama.push(k.closest('.ajuan').querySelector('b').textContent);
    });
    if (!toko.length && !prod.length) return;
    $('tSetuju').disabled = true; $('tTolak').disabled = true;
    var ringkas = (setuju ? 'Setujui ' : 'Tolak ') + (toko.length + prod.length) + ' ajuan: ' + nama.slice(0, 3).join(', ') + (nama.length > 3 ? ', …' : '');
    // Langsung tersimpan di Supabase (md_setuju_putus = mdSetujuPutus); Telegram dikirim Apps Script.
    var r = await sb.rpc('md_setuju_putus', { p_toko: toko, p_prod: prod, p_setuju: setuju, p_catatan: ($('catatan').value || '').trim().slice(0, 160) });
    var gagal = r.error ? r.error.message : (!r.data || !r.data.ok) ? ((r.data && r.data.pesan) || 'Gagal menyimpan.') : '';
    if (gagal) { $('msgSetuju').innerHTML = '<div class="msg bad">Gagal menyimpan keputusan: ' + esc(gagal) + ((r.data && r.data.gagal && r.data.gagal.length) ? ' (' + esc(r.data.gagal.join('; ')) + ')' : '') + '</div>'; $('tSetuju').disabled = false; $('tTolak').disabled = false; return; }
    salinKeSheetGaji();
    await sb.from('md_aksi').insert({ fungsi: 'segarkan', param: {}, ringkas: 'Hitung ulang sesudah ' + ringkas.slice(0, 150) });
    $('bgSesuai').querySelectorAll('input[data-no]:checked').forEach(function (k) { k.checked = false; k.disabled = true; });
    await muatAksi();
    $('msgSetuju').innerHTML = '<div class="msg ok">' + esc(r.data.pesan) + ((r.data.gagal && r.data.gagal.length) ? ' ' + esc(r.data.gagal.join('; ')) : '') + ' Daftar diperbarui paling lambat 10 menit lagi.</div>';
  }
})();
