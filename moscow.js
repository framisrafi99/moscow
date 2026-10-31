/* =====================================================================
   BINGKAI BERSAMA APLIKASI MOSCOW
   Moscow.mulai({...}) membuat layar masuk Google, menu samping (laptop),
   kepala + menu bawah (HP), lalu memanggil siap(ctx) setelah akses dicek.
   ===================================================================== */
(function () {
  var URL_SB = 'https://ufhuvwfudblbyrwzugaa.supabase.co';
  var KUNCI_SB = 'sb_publishable_A8aEpcDck6ZOix9lrM727A_tI7QZ1xw';
  var IK = {
    beranda: 'M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5', dasbor: 'M4 20V10M10 20V4M16 20v-7M22 20H2', setuju: 'M20 6 9 17l-5-5',
    produksi: 'M3 21V10l6 4V10l6 4V6l6 4v11z', gudang: 'M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
    purch: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M9 13h6M9 17h4',
    jual: 'M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 8H6', uang: 'M3 6h18v13H3zM3 10h18M16 14.5h2',
    riwayat: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
    atur: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1',
    lain: 'M4 6h16M4 12h16M4 18h16', muat: 'M21 12a9 9 0 1 1-2.6-6.4L21 8M21 3v5h-5', plus: 'M12 5v14M5 12h14', kiri: 'm15 18-6-6 6-6',
    laporan: 'M4 19h16M7 16V9M12 16V5M17 16v-4', harga: 'M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8zM7.5 7.5h.01',
    kasir: 'M4 4h16v12H4zM8 20h8M12 16v4M8 8h3M8 11h5', nota: 'M6 2h12v20l-3-2-3 2-3-2-3 2zM9 7h6M9 11h6M9 15h4',
    stok: 'M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8', toko: 'M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6',
    pemasok: 'M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', pelanggan: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 7.5M22 21a7 7 0 0 0-4.5-6.5', produk: 'M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8', keluar: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9', app: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z'
  };
  var GOOGLE = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>';

  var root = document.documentElement, O = null, S = { aktif: '', badge: {} };
  var sb = window.supabase.createClient(URL_SB, KUNCI_SB, { auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce' } });
  function $(i) { return document.getElementById(i); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function svg(k, w) { return '<svg width="' + (w || 20) + '" height="' + (w || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + (IK[k] || IK.lain) + '"></path></svg>'; }
  function fmt(n) { n = Math.round(Number(n) || 0); return (n < 0 ? '-' : '') + String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function rp(n) { n = Math.round(Number(n) || 0); return (n < 0 ? '-Rp' : 'Rp') + fmt(Math.abs(n)); }
  function jt(n) { n = Number(n) || 0; var a = Math.abs(n), s = n < 0 ? '-' : ''; if (a >= 1e9) return s + 'Rp' + (a / 1e9).toFixed(1).replace('.', ',') + ' M'; if (a >= 1e6) return s + 'Rp' + (a / 1e6).toFixed(1).replace('.', ',') + ' jt'; if (a >= 1e3) return s + 'Rp' + Math.round(a / 1e3) + ' rb'; return s + 'Rp' + fmt(a); }

  // Logo putih untuk latar gelap: bagian hitam jadi putih, latar putih jadi transparan.
  // Logo untuk latar biru gelap (menu samping, kepala HP): file PNG tajam beresolusi tinggi.
  function logoPutih() { root.style.setProperty('--mLogo', 'url(logo-putih.png)'); }


  function mode() {
    var d = window.innerWidth >= 900;
    root.classList.toggle('m-d', d); root.classList.toggle('m-m', !d);
  }

  // Ilustrasi panel kaca (hiasan saja: tidak ada angka atau data asli). Dua panel dimiringkan dengan CSS 3D.
  var IK_PANEL = {
    box: 'M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
    dok: 'M14 3H6v18h12V7zM14 3v4h4M9 12h6M9 16h6',
    org: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
    atur: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z'
  };
  // Gambar panel halaman masuk: latar + panel melayang, batang tumbuh, donat, garis cahaya, logo berkilap (file masuk-*.jpg/webp).
  var ILUS = '<div class="mm-seni" aria-hidden="true"><svg viewBox="0 0 1400 1308" preserveAspectRatio="xMidYMax meet"><defs><clipPath id="mmCb1"><rect x="620" y="941" width="29" height="53" rx="2"/></clipPath><clipPath id="mmCb2"><rect x="656" y="910" width="30" height="83" rx="2"/></clipPath><clipPath id="mmCb3"><rect x="694" y="878" width="30" height="114" rx="2"/></clipPath><clipPath id="mmCb4"><rect x="731" y="912" width="31" height="80" rx="2"/></clipPath><clipPath id="mmCb5"><rect x="770" y="879" width="32" height="112" rx="2"/></clipPath><clipPath id="mmCb6"><rect x="810" y="843" width="36" height="146" rx="2"/></clipPath><mask id="mmDonat" maskUnits="userSpaceOnUse" x="880" y="740" width="240" height="250"><g transform="translate(997 861) scale(1 1.17) rotate(-90)"><circle class="sapu" r="64"/></g></mask><linearGradient id="mmKg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><mask id="mmKilap" maskUnits="userSpaceOnUse" x="-110" y="-50" width="220" height="100"><rect class="kilap" x="-170" y="-60" width="70" height="120" fill="url(#mmKg)"/></mask></defs><image href="masuk-latar.jpg" x="0" y="0" width="1400" height="1308"/><path class="alir" d="M1400 272 L1290 330 Q1237 362 1236 425 L1236 498"/><path class="alir a2" d="M1236 500 L1086 518"/><path class="alir a3" d="M1400 812 C1330 860 1290 868 1210 872"/><path class="alir a4" d="M0 536 C120 590 250 625 320 645 Q350 655 351 690 L351 730"/><path class="alir a5" d="M0 803 C60 815 120 835 165 858"/><rect class="kotakNyala" x="1228" y="491" width="17" height="19" rx="3"/><line class="kilat" x1="1038" y1="522" x2="1038" y2="568"/><g class="apung"><image href="masuk-panel.webp" x="150" y="535" width="1072" height="600"/><g transform="translate(694 674) skewY(-7.5)"><image href="logo-putih.png" x="-100" y="-36" width="200" height="72" opacity=".38"/><image href="logo-putih.png" x="-100" y="-36" width="200" height="72" mask="url(#mmKilap)"/></g><g class="bt" style="transform-origin:634px 993px;animation-delay:0.00s"><image href="masuk-isi.webp" x="610" y="750" width="480" height="250" clip-path="url(#mmCb1)"/></g><g class="bt" style="transform-origin:671px 992px;animation-delay:0.15s"><image href="masuk-isi.webp" x="610" y="750" width="480" height="250" clip-path="url(#mmCb2)"/></g><g class="bt" style="transform-origin:709px 991px;animation-delay:0.30s"><image href="masuk-isi.webp" x="610" y="750" width="480" height="250" clip-path="url(#mmCb3)"/></g><g class="bt" style="transform-origin:746px 991px;animation-delay:0.45s"><image href="masuk-isi.webp" x="610" y="750" width="480" height="250" clip-path="url(#mmCb4)"/></g><g class="bt" style="transform-origin:786px 990px;animation-delay:0.60s"><image href="masuk-isi.webp" x="610" y="750" width="480" height="250" clip-path="url(#mmCb5)"/></g><g class="bt" style="transform-origin:828px 988px;animation-delay:0.75s"><image href="masuk-isi.webp" x="610" y="750" width="480" height="250" clip-path="url(#mmCb6)"/></g><image href="masuk-isi.webp" x="610" y="750" width="480" height="250" mask="url(#mmDonat)"/><path class="alir a6" d="M518 980 L560 980 Q574 981 574 996 L574 1084"/><rect class="kotakNyala" x="568" y="1078" width="13" height="14" rx="2.5"/></g></svg></div>';
  var KUNCI_IK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

  // Layar memuat: saat aplikasi dibuka / dimuat ulang, saat akses diperiksa, dan saat membuka halaman Google.
  function muat(teks) {
    var el = $('mMuat');
    if (teks === false) { if (el) el.hidden = true; return; }
    if (!el) {
      el = document.createElement('div'); el.id = 'mMuat'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
      el.innerHTML = '<span class="lgM" role="img" aria-label="Moscow Supplies"></span><span class="spin" aria-hidden="true"></span><span id="mMuatT"></span>';
      document.body.insertBefore(el, document.body.firstChild);
    }
    $('mMuatT').textContent = teks || 'Memuat…';
    el.hidden = false;
  }

  // Status sistem di layar masuk: hanya "siap" bila layanan masuk (Supabase Auth) benar-benar menjawab.
  function cekSistem(el) {
    if (!el) return;
    el.className = 'mm-status'; el.textContent = 'Memeriksa sistem…';
    var selesai = false, batas = setTimeout(function () { if (!selesai) { selesai = true; el.className = 'mm-status mati'; el.textContent = 'Sistem belum bisa dihubungi. Periksa internet lalu muat ulang.'; } }, 8000);
    fetch(URL_SB + '/auth/v1/health', { headers: { apikey: KUNCI_SB }, cache: 'no-store' })
      .then(function (r) { if (selesai) return; selesai = true; clearTimeout(batas);
        if (r.ok) { el.className = 'mm-status ok'; el.textContent = 'Sistem siap digunakan'; }
        else { el.className = 'mm-status mati'; el.textContent = 'Sistem sedang gangguan. Coba lagi sebentar.'; } })
      .catch(function () { if (selesai) return; selesai = true; clearTimeout(batas); el.className = 'mm-status mati'; el.textContent = 'Sistem belum bisa dihubungi. Periksa internet lalu muat ulang.'; });
  }

  function layarMasuk(pesan) {
    muat(false);
    var el = $('mMasuk');
    if (!el) {
      el = document.createElement('div'); el.id = 'mMasuk';
      el.innerHTML = '<section class="mm-kiri"><span class="mm-garis" aria-hidden="true"></span>' +
        '<h2>Sistem Manajemen <span>Moscow Supplies</span></h2><p class="sub">Semua operasional dalam satu kendali.</p>' + ILUS + '</section>' +
        '<section class="mm-kanan"><div class="kotak"><span class="lg" role="img" aria-label="Moscow Supplies"></span><span class="ey">' + esc(O.aplikasi) + '</span>' +
        '<h1>Selamat datang</h1><p>Masuk menggunakan akun Google yang sudah terdaftar.</p>' +
        '<button type="button" class="google" id="mTMasuk">' + GOOGLE + '<span>Masuk dengan Google</span></button>' +
        '<div class="pesan" id="mPesan" role="alert"></div>' +
        '<p class="mm-akses">' + KUNCI_IK + '<span>Akses aman untuk tim terdaftar</span></p>' +
        '<a class="priv" href="privasi.html">Kebijakan privasi</a></div><p class="mm-status" id="mStatus" role="status"></p></section>';
      document.body.insertBefore(el, document.body.firstChild);
      $('mTMasuk').onclick = function () {
        var b = this;
        $('mPesan').textContent = '';
        b.disabled = true; b.innerHTML = '<span class="spin" aria-hidden="true"></span><span>Membuka Google…</span>';
        sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname, queryParams: { prompt: 'select_account' } } })
          .then(function (r) { if (r.error) gagalBuka('Gagal membuka Google: ' + r.error.message); })
          .catch(function (e) { gagalBuka('Gagal membuka Google. Periksa internet lalu coba lagi.' + (e && e.message ? ' (' + e.message + ')' : '')); });
        function gagalBuka(t) { b.disabled = false; b.innerHTML = GOOGLE + '<span>Masuk dengan Google</span>'; $('mPesan').textContent = t; }
      };
    }
    el.hidden = false;
    cekSistem($('mStatus'));
    $('mPesan').textContent = pesan || '';
    if ($('mApp')) $('mApp').hidden = true;
  }

  function itemMenu(m, kelas) {
    if (m.grup) return '<div class="grp">' + esc(m.grup) + '</div>';
    var isi = svg(m.ik || m.k) + '<span class="nm">' + esc(m.nm) + '</span>' + (m.tanda ? '<span class="tg">' + esc(m.tanda) + '</span>' : '') + '<span class="bd" data-bd="' + esc(m.k) + '" hidden></span>';
    if (m.href) return '<a class="' + kelas + '" href="' + esc(m.href) + '" title="' + esc(m.nm) + '">' + isi + '</a>';
    return '<button type="button" class="' + kelas + '" data-k="' + esc(m.k) + '" title="' + esc(m.nm) + '">' + isi + '</button>';
  }

  function bangun(ctx) {
    var app = document.createElement('div'); app.id = 'mApp';
    var main = $('mIsi');
    // Menu samping
    var side = document.createElement('aside'); side.id = 'mSide'; side.setAttribute('aria-label', 'Menu utama');
    var h = '<span class="lg" role="img" aria-label="Moscow Supplies"></span><nav>';
    O.menu.forEach(function (m) { h += itemMenu(m, 'it'); });
    h += '</nav><div class="bw"><span class="vr">' + esc(ctx.email) + '</span>' +
      '<button type="button" class="it" id="mKeluar">' + svg('keluar', 18) + '<span class="nm">Keluar</span></button>' +
      '<button type="button" class="it" id="mMini">' + svg('kiri', 18) + '<span class="nm">Sembunyikan menu</span></button></div>';
    side.innerHTML = h;
    // Kepala
    var head = document.createElement('header'); head.id = 'mHead';
    head.innerHTML = '<span class="lgH" role="img" aria-label="Moscow Supplies"></span><div class="jdl"><span class="ey">' + esc(O.aplikasi) + '</span><span class="jd" id="mJudul"></span></div>' +
      '<div id="mAksi"></div>';
    // Menu bawah (HP)
    var bawah = document.createElement('nav'); bawah.id = 'mBawah'; bawah.setAttribute('aria-label', 'Menu bawah');
    var pilihan = O.menu.filter(function (m) { return !m.grup && !m.href; });
    var bw = O.bawah ? O.bawah.map(function (k) { return k === 'lain' ? { k: 'lain', nm: 'Menu', ik: 'lain' } : pilihan.filter(function (m) { return m.k === k; })[0]; }).filter(Boolean)
      : (pilihan.length <= 5 && !O.menu.some(function (m) { return m.href; }) ? pilihan : pilihan.slice(0, 4).concat([{ k: 'lain', nm: 'Menu', ik: 'lain' }]));
    bawah.innerHTML = bw.map(function (m) { return '<button type="button" data-k="' + esc(m.k) + '">' + svg(m.ik || m.k, 22) + '<span>' + esc(m.pendek || m.nm) + '</span><span class="bd" data-bd="' + esc(m.k) + '" hidden></span></button>'; }).join('');

    document.body.insertBefore(app, main);
    app.appendChild(side); app.appendChild(head); app.appendChild(main); app.appendChild(bawah);

    side.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button') : null; if (!b) return;
      if (b.id === 'mMini') { root.classList.toggle('m-mini'); try { localStorage.setItem('mMini', root.classList.contains('m-mini') ? '1' : ''); } catch (x) { } return; }
      if (b.id === 'mKeluar') { keluar(); return; }
      buka(b.getAttribute('data-k'));
    });
    bawah.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button') : null; if (!b) return;
      if (b.getAttribute('data-k') === 'lain') { lembar(); return; }
      buka(b.getAttribute('data-k'));
    });
    try { if (localStorage.getItem('mMini') === '1') root.classList.add('m-mini'); } catch (x) { }
    root.classList.add('m-siap');
  }

  function lembar() {
    var el = document.createElement('div'); el.id = 'mLembar';
    var h = '<div class="isi" role="dialog" aria-label="Menu"><h3>Menu</h3>';
    O.menu.forEach(function (m) {
      if (m.grup) { h += '<div class="grp">' + esc(m.grup) + '</div>'; return; }
      var isi = svg(m.ik || m.k, 20) + '<span>' + esc(m.nm) + '</span>' + (m.tanda ? '<span class="tg">' + esc(m.tanda) + '</span>' : '');
      h += m.href ? '<a class="it" href="' + esc(m.href) + '">' + isi + '</a>' : '<button type="button" class="it' + (m.k === S.aktif ? ' on' : '') + '" data-k="' + esc(m.k) + '">' + isi + '</button>';
    });
    h += '<div class="grp">Akun</div><button type="button" class="it" data-k="__keluar">' + svg('keluar', 20) + '<span>Keluar</span><span class="tg">' + esc(S.email || '') + '</span></button></div>';
    el.innerHTML = h;
    document.body.appendChild(el);
    el.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-k]') : null;
      if (b) { var k = b.getAttribute('data-k'); el.remove(); if (k === '__keluar') keluar(); else buka(k); return; }
      if (e.target === el) el.remove();
    });
  }

  function keluar() { sb.auth.signOut({ scope: 'local' }).then(function () { location.reload(); }); }

  function buka(k, diam) {
    var m = O.menu.filter(function (x) { return x.k === k && !x.grup; })[0];
    if (!m) return;
    S.aktif = k;
    document.querySelectorAll('#mSide [data-k], #mBawah [data-k]').forEach(function (b) {
      var on = b.getAttribute('data-k') === k; b.classList.toggle('on', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    $('mJudul').textContent = m.judul || m.nm;
    var adaBagian = false;
    document.querySelectorAll('#mIsi > section[data-bagian]').forEach(function (s) {
      var on = s.getAttribute('data-bagian') === (m.bagian || k); s.classList.toggle('on', on); if (on) adaBagian = true;
    });
    if (!adaBagian) { var p = document.querySelector('#mIsi > section[data-bagian="__lama"]'); if (p) p.classList.add('on'); }
    try { history.replaceState(null, '', location.pathname + (k === O.menu.filter(function (x) { return !x.grup && !x.href; })[0].k ? '' : '#' + k)); } catch (x) { }
    if (!diam) try { window.scrollTo(0, 0); } catch (x) { }
    if (O.pindah) O.pindah(k, m);
  }

  function aksi(daftar) {
    var el = $('mAksi'); if (!el) return;
    el.innerHTML = (daftar || []).map(function (a, i) {
      return '<button type="button" class="tbl ' + (a.kelas || '') + '" data-i="' + i + '">' + (a.ik ? svg(a.ik, 17) : '') + esc(a.nm) + '</button>';
    }).join('');
    el.querySelectorAll('button').forEach(function (b) { b.onclick = function () { var a = daftar[+b.getAttribute('data-i')]; if (a && a.klik) a.klik(b); }; });
  }

  function badge(k, n) {
    S.badge[k] = n;
    document.querySelectorAll('[data-bd="' + k + '"]').forEach(function (x) { x.textContent = n || ''; x.hidden = !n; });
  }

  // Pita kecil di atas isi halaman: belum absen masuk (atau pulang) hari ini.
  function pengingatAbsen(a) {
    if ($('mAbsen') || !$('mIsi')) return;
    var masuk = !a.masuk, el = document.createElement('a');
    el.id = 'mAbsen'; el.href = 'absensi.html';
    el.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;margin:12px 16px 0;padding:12px 14px;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px;' +
      (masuk ? 'background:var(--biru);color:#fff' : 'background:var(--kuningMuda);color:var(--kuning)');
    el.innerHTML = '<span>' + (masuk ? 'Kamu belum absen masuk hari ini' : 'Jangan lupa absen pulang') + (a.uji ? ' <small style="font-weight:600;opacity:.85">(uji coba)</small>' : '') + '</span><span>Absen ›</span>';
    $('mIsi').insertBefore(el, $('mIsi').firstChild);
  }

  async function periksa(sesi) {
    muat('Memeriksa akses…');
    // peran & lingkup diperiksa bersamaan (dulu berurutan)
    // Absensi: staf terdaftar mendapat menu Absensi + pengingat di semua halaman aplikasi (kecuali halaman Absensi sendiri).
    var diAbsen = /absensi\.html$/.test(location.pathname);
    var dua = await Promise.all([sb.rpc('peran_saya'), sb.rpc('lingkup_saya').then(function (x) { return x; }, function () { return { data: null }; }),
      diAbsen ? Promise.resolve({ data: null }) : sb.rpc('absen_saya').then(function (x) { return x; }, function () { return { data: null }; })]), r = dua[0];
    var abs = dua[2] && dua[2].data && dua[2].data.ok ? dua[2].data : null;
    if (abs && !O.menu.some(function (m) { return m.href === 'absensi.html'; })) O.menu = O.menu.concat([{ grup: 'ABSENSI' }, { k: '__absen', nm: 'Absen masuk / pulang', ik: 'setuju', href: 'absensi.html' }]);
    if (r.error) { layarMasuk('Tidak bisa memeriksa akses: ' + r.error.message); return; }
    var ctx = { sb: sb, email: sesi.user.email, peran: r.data, sesi: sesi, lingkup: (dua[1] && dua[1].data) || null };
    S.email = ctx.email;
    var izin = O.izin ? await O.izin(ctx) : true;
    if (izin !== true) {
      // Hanya di perangkat ini: akun yang salah buka halaman tidak boleh ikut mengeluarkan HP / laptop lain.
      await sb.auth.signOut({ scope: 'local' });
      layarMasuk(typeof izin === 'string' ? izin : (r.data ? 'Akun ' + ctx.email + ' tidak punya akses ke halaman ini.' : 'Akun ' + ctx.email + ' belum didaftarkan. Minta master data menambahkan email ini.'));
      return;
    }
    if ($('mMasuk')) $('mMasuk').hidden = true;
    muat(false);
    if (!$('mApp')) bangun(ctx);
    $('mApp').hidden = false;
    if (abs && !abs.libur && (!abs.masuk || !abs.pulang)) pengingatAbsen(abs);   // libur = hari ini bukan hari kerja staf (mis. Sabtu WFH)
    var awal = (location.hash || '').slice(1);
    if (location.search) try { history.replaceState(null, '', location.pathname + location.hash); } catch (x) { }
    var pertama = O.menu.filter(function (x) { return !x.grup && !x.href; })[0].k;
    buka(O.menu.some(function (x) { return x.k === awal; }) ? awal : pertama, true);
    if (O.siap) O.siap(ctx);
  }

  window.Moscow = {
    sb: sb, esc: esc, fmt: fmt, rp: rp, jt: jt, svg: svg,
    // Dipakai halaman masuk satu link (index.html) supaya tampilannya sama.
    logoPutih: logoPutih, muat: muat, ILUS: ILUS, KUNCI_IK: KUNCI_IK, GOOGLE: GOOGLE, cekSistem: cekSistem,
    buka: buka, aksi: aksi, badge: badge, judul: function (t) { $('mJudul').textContent = t; },
    aktif: function () { return S.aktif; },
    mulai: function (opsi) {
      O = opsi;
      // Pesan gagal dari Google / Supabase yang dikembalikan lewat alamat halaman (mis. akses dibatalkan).
      var galatMasuk = '';
      try {
        var cari = new URLSearchParams(location.search), hash = new URLSearchParams((location.hash || '').replace(/^#/, ''));
        var g = cari.get('error_description') || hash.get('error_description') || cari.get('error') || hash.get('error');
        if (g) galatMasuk = 'Masuk gagal: ' + String(g).replace(/\+/g, ' ').slice(0, 200) + '. Coba lagi.';
      } catch (x) { }
      mode(); logoPutih(); muat('Memuat aplikasi…');
      var tunda; window.addEventListener('resize', function () { clearTimeout(tunda); tunda = setTimeout(mode, 120); });
      var sudah = false;
      sb.auth.onAuthStateChange(function (ev, sesi) {
        if (ev === 'SIGNED_OUT') { sudah = false; return; }
        if ((ev === 'INITIAL_SESSION' || ev === 'SIGNED_IN') && !sudah) {
          if (!sesi) { if (ev === 'INITIAL_SESSION') layarMasuk(galatMasuk); return; }
          sudah = true; setTimeout(function () { periksa(sesi); }, 0);
        }
      });
    }
  };
})();
