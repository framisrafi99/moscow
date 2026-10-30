/* Diambil dari kasir.html supaya tersimpan di perangkat (lebih cepat dibuka). */
(function () {
  var DISK = 15, TZ = 'Asia/Makassar';
  var sb = Moscow.sb;
  function $(i) { return document.getElementById(i); }

  var D = { toko: '', items: [], setelan: {} };
  var S = { cart: [], stok: {}, stokW: {}, stokOk: false, nota: [], sibuk: false, token: tok(), terakhir: null, metode: '' };
  var IDX = {};

  function tok() { return String(Date.now()) + '-' + Math.random().toString(36).slice(2, 12); }
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function fmt(n) { n = Math.round(Number(n) || 0); return (n < 0 ? '-' : '') + Math.abs(n).toLocaleString('id-ID'); }
  function rp(n) { return 'Rp ' + fmt(n); }
  function tglIndo(iso) { var p = String(iso).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso; }
  function hariIni() { try { return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date()); } catch (e) { return new Date().toISOString().slice(0, 10); } }
  function jamDari(iso) { try { return new Intl.DateTimeFormat('id-ID', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso)).replace('.', ':'); } catch (e) { return ''; } }
  function lokal(k, v) { try { if (v === undefined) return localStorage.getItem(k) || ''; if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return ''; } }
  function pesan(t, baik) {
    $('ksMsg').innerHTML = t ? '<div class="msg ' + (baik ? 'ok' : 'bad') + '">' + esc(t) + '</div>' : '';
    if (t) { try { $('ksMsg').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { } }
  }
  function totalBaris(c) { var b = IDX[c.k]; return Math.round(c.q * b.h * (100 - (c.d ? DISK : 0)) / 100); }

  // ----- masuk (bingkai bersama) -----
  Moscow.mulai({
    aplikasi: 'KASIR TOKO OFFLINE', masukJudul: 'Kasir toko offline', masukTeks: 'Catat penjualan dan cetak struk. Masuk memakai akun Google yang sudah didaftarkan.',
    izin: async function (ctx) {
      var r = await sb.rpc('kasir_toko_saya', { minta: null });
      if (r.error) return 'Tidak bisa memeriksa akses: ' + r.error.message;
      if (!r.data) return 'Akun ' + ctx.email + ' tidak punya akses kasir toko offline.';
      D.toko = r.data; return true;
    },
    menu: [{ k: 'kasir', nm: 'Kasir', judul: 'Nota baru' }, { k: 'nota', nm: 'Nota per hari' }, { k: 'atur', nm: 'Pengaturan nota', ik: 'atur' }],
    pindah: function (k) { $('bilah').hidden = k !== 'kasir' || !S.cart.length; if (k === 'nota' && D.items.length) muatNota(); },
    siap: function (ctx) {
      document.querySelector('#mHead .ey').textContent = 'KASIR · ' + D.toko.toUpperCase();
      if (ctx.peran === 'manajemen') {
        var nav = document.querySelector('#mSide nav');
        if (nav) nav.insertAdjacentHTML('beforeend', '<div class="grp">APLIKASI LAIN</div><a class="it" href="master.html">' + Moscow.svg('beranda') + '<span class="nm">Master Data</span></a>');
      }
      mulai();
    }
  });

  async function mulai() {
    $('ksHasil').innerHTML = '<div class="petunjuk">Memuat daftar barang…</div>';
    var h = await Promise.all([
      sb.from('barang_order').select('kode,nama_barang,harga_jual,kategori,varian_warna,baris_sheet').order('baris_sheet'),
      sb.from('kasir_setelan').select('data').eq('toko', D.toko).maybeSingle()
    ]);
    if (h[0].error) { pesan('Daftar barang gagal dimuat: ' + h[0].error.message, false); return; }
    D.items = barangDari(h[0].data || []);
    D.items.forEach(function (b) { IDX[b.k] = b; });
    D.setelan = (h[1].data && h[1].data.data) || {};
    siapkan();
    muatStok(); muatNota();
  }

  // Sama dengan bacaBarangOrder_(true) di sistem lama.
  function barangDari(rows) {
    var out = [], lihat = {};
    rows.forEach(function (r) {
      var k = String(r.kode || '').trim().toUpperCase();
      if (!k || k.indexOf('-') !== -1 || lihat[k]) return;
      lihat[k] = 1;
      var h = Number(r.harga_jual), w = [], ada = {};
      String(r.varian_warna || '').split(',').forEach(function (x) {
        x = x.replace(/-/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
        if (x && x !== 'LAINNYA' && !ada[x]) { ada[x] = 1; w.push(x); }
      });
      out.push({ k: k, n: String(r.nama_barang || '').trim(), h: isFinite(h) && h > 0 ? h : 0, kat: String(r.kategori || '').trim() || 'Lainnya', w: w });
    });
    return out;
  }

  // ----- stok: hitungan terakhir dikurangi nota baru yang belum masuk hitungan -----
  async function muatStok() {
    var h = await Promise.all([
      sb.from('hasil_hitung').select('data,dibuat').eq('kunci', 'stok:lokasi:' + D.toko).maybeSingle(),
      sb.from('kasir_nota').select('items,status,diproses').eq('toko', D.toko).gte('tanggal', geserHari(hariIni(), -3))
    ]);
    if (h[0].error || !h[0].data) { $('infoStok').textContent = 'stok belum tersedia'; return; }
    var dibuat = new Date(h[0].data.dibuat).getTime(), stok = {}, stokW = {};
    (h[0].data.data.barang || []).forEach(function (b) { stok[b.k] = b.q; });
    var sw = h[0].data.data.stokW || {};
    Object.keys(sw).forEach(function (k) { stokW[k] = {}; Object.keys(sw[k]).forEach(function (w) { stokW[k][w] = sw[k][w]; }); });
    (h[1].data || []).forEach(function (n) {
      if (n.status === 'tercatat' && n.diproses && new Date(n.diproses).getTime() < dibuat) return;
      (n.items || []).forEach(function (it) {
        stok[it.k] = (stok[it.k] || 0) - it.q;
        if (stokW[it.k]) stokW[it.k][it.w || ''] = (stokW[it.k][it.w || ''] || 0) - it.q;
      });
    });
    S.stok = stok; S.stokW = stokW; S.stokOk = true;
    $('infoStok').textContent = 'stok per ' + (h[0].data.data.diperbarui || '');
    gambarHasil(); gambarCart();
  }
  function geserHari(iso, n) { var d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function stokBarang(k) { var v = Number(S.stok[k]); return isFinite(v) ? v : 0; }
  function stokWarna(k, w) { var o = S.stokW[k]; if (!o) return null; var v = Number(o[w]); return isFinite(v) ? v : 0; }

  // ----- pilih barang -----
  function siapkan() {
    var ada = {}, h = '<option value="">Semua kategori</option>';
    D.items.forEach(function (b) { if (!ada[b.kat]) { ada[b.kat] = 1; h += '<option value="' + esc(b.kat) + '">' + esc(b.kat) + '</option>'; } });
    $('ksKat').innerHTML = h;
    isiSetelan(D.setelan);
    $('ksKasir').value = D.setelan.kasir || lokal('ks_kasir');
    $('ksTgl').value = hariIni(); $('ksTglNota').value = hariIni();
    arsipBaca(); gambarHasil(); gambarCart();
  }
  function gambarHasil() {
    var q = $('ksCari').value.toLowerCase().trim(), kat = $('ksKat').value, h = '', n = 0, lebih = 0;
    if (!q && !kat) { $('ksHasil').innerHTML = '<div class="petunjuk">Ketik nama barang atau pilih kategori untuk menampilkan barang.</div>'; return; }
    D.items.forEach(function (b) {
      if (kat && b.kat !== kat) return;
      if (q && b.n.toLowerCase().indexOf(q) < 0 && b.k.toLowerCase().indexOf(q) < 0) return;
      if (n >= 40) { lebih++; return; }
      n++;
      var s = stokBarang(b.k);
      var st = S.stokOk ? ' · stok ' + fmt(s) : '';
      h += '<div class="brg"><div class="a"><b>' + esc(b.n) + '</b><small class="' + (S.stokOk && s <= 0 ? 'habis' : '') + '">' + esc(b.k) + ' · ' + (b.h > 0 ? rp(b.h) : 'harga belum diisi') + st + '</small></div>';
      if (b.w.length) {
        h += '<select data-w="' + esc(b.k) + '" aria-label="Warna ' + esc(b.n) + '"><option value="">Pilih warna</option>';
        b.w.forEach(function (w) { var sw = S.stokOk ? stokWarna(b.k, w) : null; h += '<option value="' + esc(w) + '">' + esc(w) + (sw === null ? '' : ' (' + fmt(sw) + ')') + '</option>'; });
        h += '</select>';
      }
      h += '<button type="button" class="btn kecil" data-add="' + esc(b.k) + '"' + (b.h > 0 ? '' : ' disabled') + '>Tambah</button></div>';
    });
    if (!n) h = '<div class="petunjuk">Barang tidak ditemukan. Coba kata lain.</div>';
    if (lebih) h += '<div class="petunjuk">' + lebih + ' barang lain tidak ditampilkan. Persempit pencarian.</div>';
    $('ksHasil').innerHTML = h;
  }
  $('ksCari').addEventListener('input', gambarHasil);
  $('ksKat').addEventListener('change', gambarHasil);
  $('ksHasil').addEventListener('click', function (e) {
    var el = e.target, k = el.getAttribute ? el.getAttribute('data-add') : null;
    if (!k || !IDX[k]) return;
    var b = IDX[k], w = '';
    if (b.w.length) {
      var sel = el.parentNode.querySelector('select');
      w = sel ? sel.value : '';
      if (!w) { pesan('Pilih warna dulu untuk ' + b.n + '.', false); if (sel) sel.focus(); return; }
    }
    pesan('', true);
    for (var j = 0; j < S.cart.length; j++) if (S.cart[j].k === k && S.cart[j].w === w) { S.cart[j].q += 1; gambarCart(); kedip(el); return; }
    S.cart.push({ k: k, w: w, q: 1, d: $('ksSemua').checked });
    gambarCart(); kedip(el);
  });
  function kedip(el) { var t = el.textContent; el.textContent = 'Ditambah'; setTimeout(function () { el.textContent = t; }, 700); }

  // ----- isi nota -----
  function hitung() {
    var bruto = 0, total = 0, pcs = 0;
    S.cart.forEach(function (c) { bruto += c.q * IDX[c.k].h; total += totalBaris(c); pcs += c.q; });
    var o = Math.floor(Number($('ksOngkir').value));
    if ($('ksOngkir').value === '' || !isFinite(o) || o < 0) o = 0;
    return { bruto: bruto, total: total, diskon: bruto - total, ongkir: o, akhir: total + o, pcs: pcs };
  }
  function gambarRingkas() {
    var t = hitung();
    var h = '<div class="rk"><span>Subtotal (' + fmt(t.pcs) + ' pcs)</span><span class="angka">' + rp(t.bruto) + '</span></div>';
    if (t.diskon) h += '<div class="rk"><span>Diskon ' + DISK + '%</span><span class="angka">−' + rp(t.diskon) + '</span></div>';
    if (t.ongkir) h += '<div class="rk"><span>Ongkos kirim</span><span class="angka">' + rp(t.ongkir) + '</span></div>';
    h += '<div class="rk tot"><span>Total</span><span class="angka">' + rp(t.akhir) + '</span></div>';
    var bayar = Number($('ksBayar').value);
    if ($('ksBayar').value !== '' && isFinite(bayar) && S.cart.length) {
      h += bayar >= t.akhir ? '<div class="rk"><span>Kembalian</span><span class="angka">' + rp(bayar - t.akhir) + '</span></div>'
        : '<div class="rk kurang"><span>Uang kurang</span><span class="angka">' + rp(t.akhir - bayar) + '</span></div>';
    }
    $('ksRingkas').innerHTML = S.cart.length ? h : '';
    $('bilah').hidden = !S.cart.length || Moscow.aktif() !== 'kasir';
    $('bilahPcs').textContent = fmt(t.pcs) + ' pcs';
    $('bilahTotal').textContent = rp(t.akhir);
  }
  function gambarCart() {
    var h = '';
    S.cart.forEach(function (c, j) {
      var b = IDX[c.k], kotor = c.q * b.h, tot = totalBaris(c);
      var sisa = c.w && stokWarna(c.k, c.w) !== null ? stokWarna(c.k, c.w) : stokBarang(c.k);
      var lebih = S.stokOk && c.q > sisa;
      h += '<div class="ker"><div class="n"><b>' + esc(b.n) + (c.w ? ' – ' + esc(c.w) : '') + '</b><small>' + esc(c.k) + ' · ' + rp(b.h) +
        (lebih ? ' · <span class="lebih">melebihi stok tercatat</span>' : '') + '</small></div>' +
        '<div class="t angka">' + (c.d ? '<s>' + rp(kotor) + '</s>' : '') + rp(tot) + '</div>' +
        '<div class="qty"><button type="button" data-min="' + j + '" aria-label="Kurangi">−</button><input type="number" min="1" inputmode="numeric" data-q="' + j + '" value="' + c.q + '" aria-label="Jumlah"><button type="button" data-plus="' + j + '" aria-label="Tambah">+</button>' +
        '<label class="disc' + (c.d ? ' on' : '') + '"><input type="checkbox" data-d="' + j + '"' + (c.d ? ' checked' : '') + '> Disc ' + DISK + '%</label></div>' +
        '<button type="button" class="hapus" data-del="' + j + '">Hapus</button></div>';
    });
    $('ksKeranjang').innerHTML = h || '<div class="petunjuk">Belum ada barang. Tambahkan dari daftar di atas.</div>';
    gambarRingkas();
    arsipSimpan();
  }
  $('ksKeranjang').addEventListener('click', function (e) {
    var el = e.target; if (!el.getAttribute) return;
    var a = el.getAttribute('data-min'), b = el.getAttribute('data-plus'), d = el.getAttribute('data-del');
    if (a !== null) { if (S.cart[a].q > 1) S.cart[a].q -= 1; gambarCart(); }
    else if (b !== null) { S.cart[b].q += 1; gambarCart(); }
    else if (d !== null) { S.cart.splice(Number(d), 1); gambarCart(); }
  });
  $('ksKeranjang').addEventListener('change', function (e) {
    var el = e.target; if (!el.getAttribute) return;
    var q = el.getAttribute('data-q'), d = el.getAttribute('data-d');
    if (q !== null) { var v = Math.floor(Number(el.value)); S.cart[q].q = (isFinite(v) && v >= 1) ? v : 1; gambarCart(); }
    else if (d !== null) {
      S.cart[d].d = el.checked;
      var semua = S.cart.length > 0; S.cart.forEach(function (c) { if (!c.d) semua = false; });
      $('ksSemua').checked = semua; $('ksSemuaL').className = 'disc' + (semua ? ' on' : '');
      gambarCart();
    }
  });
  $('ksSemua').addEventListener('change', function () {
    var on = this.checked; S.cart.forEach(function (c) { c.d = on; });
    $('ksSemuaL').className = 'disc' + (on ? ' on' : ''); gambarCart();
  });
  $('ksBayar').addEventListener('input', gambarRingkas);
  $('ksOngkir').addEventListener('input', gambarRingkas);
  document.querySelectorAll('.metode button').forEach(function (b) {
    b.onclick = function () { pilihMetode(b.dataset.m); arsipSimpan(); };
  });
  function pilihMetode(m) {
    S.metode = m || '';
    document.querySelectorAll('.metode button').forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.m === S.metode)); });
  }
  $('bilahKe').onclick = function () { $('kartuNota').scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  // ----- arsip: isi nota yang belum disimpan tetap ada di HP ini -----
  function kunciArsip() { return 'ks_arsip_' + D.toko; }
  function arsipSimpan() {
    if (!D.toko) return;
    if (!S.cart.length) { lokal(kunciArsip(), null); return; }
    lokal(kunciArsip(), JSON.stringify({ w: Date.now(), cart: S.cart, token: S.token, tgl: $('ksTgl').value, pembeli: $('ksPembeli').value,
      ongkir: $('ksOngkir').value, bayar: $('ksBayar').value, semua: $('ksSemua').checked, metode: S.metode }));
  }
  function arsipBaca() {
    var a = null; try { a = JSON.parse(lokal(kunciArsip()) || 'null'); } catch (e) { a = null; }
    if (!a || !a.cart || !a.cart.length) return;
    var cart = a.cart.filter(function (c) { return c && IDX[c.k] && Number(c.q) >= 1; }).map(function (c) { return { k: c.k, w: c.w || '', q: Math.floor(Number(c.q)), d: !!c.d }; });
    if (!cart.length) return;
    S.cart = cart; if (a.token) S.token = a.token;
    if (a.tgl) $('ksTgl').value = a.tgl;
    $('ksPembeli').value = a.pembeli || ''; $('ksOngkir').value = a.ongkir || ''; $('ksBayar').value = a.bayar || '';
    $('ksSemua').checked = !!a.semua; $('ksSemuaL').className = 'disc' + (a.semua ? ' on' : '');
    pilihMetode(a.metode);
    var jam = new Date(a.w), teks = ('0' + jam.getHours()).slice(-2) + ':' + ('0' + jam.getMinutes()).slice(-2);
    $('ksMsg').innerHTML = '<div class="msg ok">Isi nota yang belum disimpan (' + cart.length + ' barang, terakhir diubah ' + teks + ') sudah dipulihkan. ' +
      '<button type="button" class="btn dua kecil" id="ksBuangArsip">Buang isi nota ini</button></div>';
    $('ksBuangArsip').onclick = function () { kosongkan(); pesan('Isi nota yang dipulihkan sudah dibuang.', true); };
  }
  ['ksPembeli', 'ksOngkir', 'ksBayar', 'ksTgl'].forEach(function (id) { $(id).addEventListener('input', arsipSimpan); });
  function kosongkan() {
    S.cart = []; S.token = tok(); pilihMetode('');
    $('ksBayar').value = ''; $('ksOngkir').value = ''; $('ksPembeli').value = '';
    $('ksSemua').checked = false; $('ksSemuaL').className = 'disc';
    gambarCart(); gambarHasil();
  }

  // ----- simpan -----
  function kunci(sibuk) {
    S.sibuk = sibuk;
    $('ksSimpan').disabled = sibuk; $('ksSimpanCetak').disabled = sibuk;
    $('ksSimpanCetak').textContent = sibuk ? 'Menyimpan…' : 'Simpan & cetak struk';
  }
  // Nota sudah tercatat di Supabase; minta Apps Script menyalinnya ke Google Sheet sekarang (tidak ditunggu).
  var BALIK = 'https://script.google.com/macros/s/AKfycbxcidGDrc33WJYcxzPf1dnRFzgafzbhwomXKlj3KjfYUHosPyI0qNpBcY9tvI7-PgI2/exec?app=balik';
  async function salinKeSheet() {
    try {
      var s = await sb.auth.getSession(), t = s && s.data && s.data.session ? s.data.session.access_token : '';
      if (t) fetch(BALIK, { method: 'POST', body: JSON.stringify({ t: t }), keepalive: true }).catch(function () { });
    } catch (e) { }
  }
  async function simpan(denganCetak) {
    if (S.sibuk) return;
    var kasir = $('ksKasir').value.trim();
    if (!S.cart.length) { pesan('Belum ada barang di nota.', false); return; }
    if (!kasir) { pesan('Isi nama kasir terlebih dahulu.', false); $('ksKasir').focus(); return; }
    if (!S.metode) { pesan('Pilih metode bayar: Tunai atau QRIS.', false); return; }
    var t = hitung(), bayarTeks = $('ksBayar').value, bayar = Number(bayarTeks);
    if ($('ksOngkir').value !== '' && !(Number($('ksOngkir').value) >= 0)) { pesan('Ongkos kirim tidak valid.', false); return; }
    if (bayarTeks !== '' && isFinite(bayar) && bayar < t.akhir) { pesan('Uang diterima kurang dari total.', false); return; }
    lokal('ks_kasir', kasir);
    var items = S.cart.map(function (c) { return { kode: c.k, warna: c.w, qty: c.q, disk: !!c.d }; });
    kunci(true); pesan('', true);
    var r;
    try {
      r = await sb.rpc('kasir_simpan', { p: { toko: D.toko, tanggal: $('ksTgl').value, kasir: kasir, pembeli: $('ksPembeli').value,
        metode: S.metode, ongkir: t.ongkir, token: S.token, items: items } });
    } catch (e) { r = { error: e }; }
    kunci(false);
    if (r.error) { pesan('Gagal terhubung. Periksa internet lalu tekan simpan lagi (nota tidak akan tercatat dua kali).', false); return; }
    var h = r.data || {};
    if (!h.ok) { pesan(h.pesan || 'Gagal menyimpan.', false); return; }
    if (!h.ulang) salinKeSheet();
    S.terakhir = notaDari(h.nota);
    if (bayarTeks !== '' && isFinite(bayar)) S.terakhir.bayar = bayar;
    kosongkan(); tampilStruk();
    pesan(h.pesan, true);
    $('ksTglNota').value = $('ksTgl').value; muatNota(); muatStok();
    if (denganCetak) cetak();
  }
  $('ksSimpan').onclick = function () { simpan(false); };
  $('ksSimpanCetak').onclick = function () { simpan(true); };

  function notaDari(x) {
    return { no: x.no_nota, t: x.tanggal, jam: x.jam, kasir: x.kasir, pembeli: x.pembeli || '', metode: x.metode, ongkir: Number(x.ongkir) || 0,
      items: x.items || [], bruto: Number(x.bruto), diskon: Number(x.diskon), total: Number(x.total), status: x.status, baru: true };
  }
  function akhirNota(n) { return n.total + (Number(n.ongkir) || 0); }

  // ----- nota per hari: nota aplikasi baru + nota kasir lama (dari sheet) -----
  async function muatNota() {
    var tgl = $('ksTglNota').value;
    $('ksNota').innerHTML = '<div class="petunjuk">Memuat…</div>';
    var h = await Promise.all([
      sb.from('kasir_nota').select('*').eq('toko', D.toko).eq('tanggal', tgl).order('dibuat', { ascending: false }),
      sb.from('toko_jual_log').select('kode,nama_barang,qty_terjual,harga_jual,total,waktu_masuk,pengisi,warna,no_nota,diskon_persen,pembeli,ongkir').eq('toko', D.toko).eq('tanggal', tgl).not('no_nota', 'is', null),
      sb.from('toko_nota_bayar').select('no_nota,metode').eq('toko', D.toko).eq('tanggal', tgl)
    ]);
    if (h[0].error) { $('ksNota').innerHTML = '<div class="petunjuk">Gagal memuat nota: ' + esc(h[0].error.message) + '</div>'; return; }
    var baru = (h[0].data || []).map(notaDari), waktuBaru = (h[0].data || []).map(function (x) { return new Date(x.dibuat).getTime(); });
    var metode = {}; (h[2].data || []).forEach(function (m) { metode[m.no_nota] = m.metode; });
    var lama = {}, urut = [];
    (h[1].data || []).forEach(function (r) {
      var ms = r.waktu_masuk ? new Date(r.waktu_masuk).getTime() : 0;
      if (waktuBaru.some(function (w) { return Math.abs(w - ms) < 2000; })) return;   // sudah tampil sebagai nota baru
      var no = r.no_nota;
      if (!lama[no]) { lama[no] = { no: no, t: tgl, jam: r.waktu_masuk ? jamDari(r.waktu_masuk) : '', ms: ms, kasir: String(r.pengisi || '').replace(/^kasir:\s*/i, ''),
        pembeli: r.pembeli || '', metode: metode[no] || '', ongkir: 0, items: [], bruto: 0, diskon: 0, total: 0 }; urut.push(no); }
      var n = lama[no], q = Number(r.qty_terjual) || 0, hj = Number(r.harga_jual) || 0, tot = Number(r.total) || 0;
      if (Number(r.ongkir) > 0) n.ongkir += Number(r.ongkir);
      n.items.push({ k: r.kode, n: r.nama_barang, w: r.warna || '', q: q, h: hj, d: Number(r.diskon_persen) || 0, tot: tot });
      n.bruto += q * hj; n.total += tot; n.diskon += q * hj - tot;
    });
    var semua = baru.concat(urut.map(function (no) { return lama[no]; }).sort(function (a, b) { return b.ms - a.ms; }));
    S.nota = semua; gambarNota();
  }
  function gambarNota() {
    var h = '', total = 0, ongkir = 0, tunai = 0, qris = 0;
    S.nota.forEach(function (n, j) {
      total += n.total; ongkir += n.ongkir || 0;
      if (n.metode === 'Tunai') tunai += akhirNota(n); else if (n.metode === 'QRIS') qris += akhirNota(n);
      var lbl = n.metode ? '<span class="label ' + n.metode.toLowerCase() + '">' + esc(n.metode) + '</span>' : '<span class="label tanpa">tanpa metode</span>';
      if (n.baru && n.status === 'menunggu') lbl += '<span class="label antre" title="Masuk ke Google Sheets paling lambat 10 menit">antre ke sheet</span>';
      h += '<div class="nt"><div><b>' + esc(n.no) + '</b>' + lbl + '<small>' + esc(n.jam) + ' · ' + esc(n.kasir) + (n.pembeli ? ' · ' + esc(n.pembeli) : '') + ' · ' + n.items.length + ' barang' + (n.ongkir ? ' · ongkir ' + rp(n.ongkir) : '') + '</small></div>' +
        '<div class="kanan"><b class="angka">' + rp(akhirNota(n)) + '</b><br><button type="button" class="btn dua kecil" data-nota="' + j + '">Cetak ulang</button></div></div>';
    });
    $('ringkasHari').textContent = S.nota.length ? S.nota.length + ' nota · ' + rp(total + ongkir) : '';
    $('ksNota').innerHTML = S.nota.length
      ? '<div class="rk"><span>Penjualan barang</span><b class="angka">' + rp(total) + '</b></div>' +
        (ongkir ? '<div class="rk"><span>Ongkos kirim</span><b class="angka">' + rp(ongkir) + '</b></div>' : '') +
        '<div class="rk"><span>Tunai / QRIS</span><span class="angka">' + rp(tunai) + ' / ' + rp(qris) + '</span></div>' + h
      : '<div class="petunjuk">Belum ada nota pada tanggal ini.</div>';
  }
  $('ksTglNota').addEventListener('change', muatNota);
  $('ksNota').addEventListener('click', function (e) {
    var j = e.target.getAttribute ? e.target.getAttribute('data-nota') : null;
    if (j === null || !S.nota[j]) return;
    S.terakhir = S.nota[j]; tampilStruk(); cetak();
  });

  // ----- struk (sama dengan kasir lama) -----
  function setelanForm() {
    var hf = $('ksHuruf').value;
    return { judul: $('ksJudul').value.trim(), alamat: $('ksKepala').value.trim(), kontak: $('ksKontak').value.trim(),
      kasir: $('ksKasirSet').value.trim(), kaki: $('ksKaki').value.trim(), lebar: lebar(),
      logo: $('ksLogo').checked ? 'ya' : 'tidak', kode: $('ksKode').checked ? 'ya' : 'tidak', huruf: (hf === 'kecil' || hf === 'besar') ? hf : 'normal' };
  }
  function lebar() { return $('ksLebar').value === '80' ? '80' : '58'; }
  function kelasStruk() { return 'ksr k' + lebar() + ' h' + setelanForm().huruf; }
  function strukHtml(n) {
    var st = setelanForm(), logo = st.logo === 'ya' ? $('logoImg').src : '';
    var h = (logo ? '<img src="' + logo + '" alt="">' : '<div class="j">MOSCOW SUPPLIES</div>') +
      '<div class="j">' + esc(st.judul || D.toko) + '</div>' + (st.alamat ? '<div class="c p">' + esc(st.alamat) + '</div>' : '') +
      (st.kontak ? '<div class="c">' + esc(st.kontak) + '</div>' : '') + '<div class="g"></div>' +
      '<div class="b"><span>No</span><span>' + esc(n.no) + '</span></div>' +
      '<div class="b"><span>Tanggal</span><span>' + tglIndo(n.t) + (n.jam ? ' ' + esc(n.jam) : '') + '</span></div>' +
      '<div class="b"><span>Kasir</span><span>' + esc(n.kasir) + '</span></div>' +
      (n.pembeli ? '<div class="b"><span>Pembeli</span><span>' + esc(n.pembeli) + '</span></div>' : '') + '<div class="g"></div>';
    n.items.forEach(function (it) {
      var kotor = it.q * it.h;
      h += '<div class="n">' + esc(it.n) + (it.w ? ' - ' + esc(it.w) : '') + (st.kode === 'ya' && it.k ? ' (' + esc(it.k) + ')' : '') + '</div>' +
        '<div class="b"><span>' + fmt(it.q) + ' x ' + fmt(it.h) + '</span><span>' + fmt(kotor) + '</span></div>';
      if (it.d) h += '<div class="b"><span>Disc ' + fmt(it.d) + '%</span><span>-' + fmt(kotor - it.tot) + '</span></div>';
    });
    h += '<div class="g"></div><div class="b"><span>Subtotal</span><span>' + fmt(n.bruto) + '</span></div>';
    if (n.diskon) h += '<div class="b"><span>Diskon</span><span>-' + fmt(n.diskon) + '</span></div>';
    var akhir = akhirNota(n);
    if (n.ongkir) h += '<div class="b"><span>Ongkos kirim</span><span>' + fmt(n.ongkir) + '</span></div>';
    h += '<div class="b T"><span>TOTAL</span><span>Rp ' + fmt(akhir) + '</span></div>';
    if (n.metode) h += '<div class="b"><span>Bayar dengan</span><span>' + esc(n.metode) + '</span></div>';
    if (n.bayar !== undefined && n.bayar !== null && n.bayar >= akhir) h += '<div class="b"><span>Bayar</span><span>' + fmt(n.bayar) + '</span></div><div class="b"><span>Kembali</span><span>' + fmt(n.bayar - akhir) + '</span></div>';
    if (st.kaki) h += '<div class="g"></div><div class="f">' + esc(st.kaki) + '</div>';
    return h;
  }
  function tampilStruk() {
    if (!S.terakhir) { $('ksStrukC').hidden = true; return; }
    $('ksPrev').className = kelasStruk(); $('ksPrev').innerHTML = strukHtml(S.terakhir); $('ksStrukC').hidden = false;
  }
  function cetak() {
    if (!S.terakhir) return;
    var w = lebar(), isi = strukHtml(S.terakhir);
    var u = $('ksUkur'); u.className = kelasStruk(); u.innerHTML = isi;
    var tinggi = Math.ceil(u.offsetHeight * 25.4 / 96) + 14; u.innerHTML = '';
    var c = $('ksCetak'); c.className = kelasStruk(); c.innerHTML = isi;
    var lama = $('ksPage'); if (lama) lama.parentNode.removeChild(lama);
    var st = document.createElement('style'); st.id = 'ksPage'; st.textContent = '@page{size:' + w + 'mm ' + tinggi + 'mm;margin:0}';
    document.head.appendChild(st); document.body.classList.add('ks-print');
    var beres = false;
    function selesai() { if (beres) return; beres = true; document.body.classList.remove('ks-print'); var x = $('ksPage'); if (x) x.parentNode.removeChild(x); window.removeEventListener('afterprint', selesai); }
    window.addEventListener('afterprint', selesai);
    setTimeout(function () { try { window.print(); } catch (e) { selesai(); pesan('Perangkat ini tidak bisa membuka jendela cetak.', false); } }, 200);
  }
  $('ksCetakLagi').onclick = cetak;

  function ascii(t) { return String(t == null ? '' : t).replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/[^\x20-\x7e\n]/g, ''); }
  function strukTeks(n) {
    var st = setelanForm(), L = st.lebar === '80' ? 48 : 32, out = [], ESC = '\x1b', GS = '\x1d';
    function tengah(t) { return ESC + 'a\x01' + t + '\n' + ESC + 'a\x00'; }
    function potong(t) { var a = [], s = ascii(t); while (s.length > L) { a.push(s.slice(0, L)); s = s.slice(L); } a.push(s); return a.join('\n'); }
    function kk(a, b) { a = ascii(a); b = ascii(b); var sp = L - a.length - b.length; if (sp < 1) return potong(a) + '\n' + new Array(Math.max(0, L - b.length) + 1).join(' ') + b; return a + new Array(sp + 1).join(' ') + b; }
    var garis = new Array(L + 1).join('-');
    out.push(ESC + '@');
    out.push(ESC + 'E\x01' + GS + '!\x11' + tengah('MOSCOW') + GS + '!\x00' + ESC + 'E\x00');
    out.push(ESC + 'E\x01' + tengah(potong(st.judul || D.toko)) + ESC + 'E\x00');
    if (st.alamat) out.push(tengah(potong(st.alamat)));
    if (st.kontak) out.push(tengah(potong(st.kontak)));
    out.push(garis);
    out.push(kk('No', n.no)); out.push(kk('Tanggal', tglIndo(n.t) + (n.jam ? ' ' + n.jam : '')));
    out.push(kk('Kasir', n.kasir || '')); if (n.pembeli) out.push(kk('Pembeli', n.pembeli));
    out.push(garis);
    n.items.forEach(function (it) {
      var kotor = it.q * it.h;
      out.push(ESC + 'E\x01' + potong(it.n + (it.w ? ' - ' + it.w : '') + (st.kode === 'ya' && it.k ? ' (' + it.k + ')' : '')) + ESC + 'E\x00');
      out.push(kk(fmt(it.q) + ' x ' + fmt(it.h), fmt(kotor)));
      if (it.d) out.push(kk('Disc ' + fmt(it.d) + '%', '-' + fmt(kotor - it.tot)));
    });
    out.push(garis); out.push(kk('Subtotal', fmt(n.bruto)));
    if (n.diskon) out.push(kk('Diskon', '-' + fmt(n.diskon)));
    var akhir = akhirNota(n);
    if (n.ongkir) out.push(kk('Ongkos kirim', fmt(n.ongkir)));
    out.push(ESC + 'E\x01' + GS + '!\x01' + kk('TOTAL', 'Rp ' + fmt(akhir)) + GS + '!\x00' + ESC + 'E\x00');
    if (n.metode) out.push(kk('Bayar dengan', n.metode));
    if (n.bayar !== undefined && n.bayar !== null && n.bayar >= akhir) { out.push(kk('Bayar', fmt(n.bayar))); out.push(kk('Kembali', fmt(n.bayar - akhir))); }
    if (st.kaki) { out.push(garis); out.push(tengah(potong(st.kaki))); }
    out.push('\n\n\n' + GS + 'V\x42\x00');
    return out.join('\n').split('\x1ba\x00\n').join('\x1ba\x00');
  }
  $('ksRawbt').onclick = function () {
    if (!S.terakhir) { pesan('Belum ada struk untuk dicetak.', false); return; }
    var b64; try { b64 = btoa(strukTeks(S.terakhir)); } catch (e) { pesan('Struk tidak bisa disiapkan untuk RawBT.', false); return; }
    var url = 'intent:base64,' + b64 + '#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;';
    try { window.location.href = url; } catch (e) { }
    pesan('Struk dikirim ke RawBT. Kalau tidak tercetak, pastikan aplikasi RawBT terpasang dan tersambung ke printer.', true);
  };

  // ----- pengaturan nota -----
  function isiSetelan(st) {
    st = st || {};
    $('ksJudul').value = st.judul || D.toko; $('ksKepala').value = st.alamat || ''; $('ksKontak').value = st.kontak || '';
    $('ksKasirSet').value = st.kasir || ''; $('ksKaki').value = st.kaki === undefined ? 'Terima kasih' : st.kaki;
    $('ksLebar').value = st.lebar === '80' ? '80' : '58'; $('ksHuruf').value = (st.huruf === 'kecil' || st.huruf === 'besar') ? st.huruf : 'normal';
    $('ksLogo').checked = st.logo !== 'tidak'; $('ksKode').checked = st.kode === 'ya';
  }
  function contohNota() {
    var st = setelanForm(), items = [], bruto = 0, total = 0;
    for (var j = 0; j < D.items.length && items.length < 2; j++) {
      var b = D.items[j]; if (!(b.h > 0)) continue;
      var q = items.length ? 1 : 2, d = items.length ? 0 : DISK, tot = Math.round(q * b.h * (100 - d) / 100);
      items.push({ k: b.k, n: b.n, w: b.w.length ? b.w[0] : '', q: q, h: b.h, d: d, tot: tot }); bruto += q * b.h; total += tot;
    }
    var akhir = total + 10000;
    return { no: 'TO-CONTOH', t: hariIni(), jam: '10:30', kasir: st.kasir || 'Nama kasir', pembeli: 'Nama pembeli', metode: 'Tunai', items: items,
      bruto: bruto, diskon: bruto - total, total: total, ongkir: 10000, bayar: Math.ceil(akhir / 50000) * 50000 };
  }
  function tampilContoh() { if ($('ksSetPrevC').hidden) return; $('ksSetPrev').className = kelasStruk(); $('ksSetPrev').innerHTML = strukHtml(contohNota()); }
  ['ksJudul', 'ksKepala', 'ksKontak', 'ksKasirSet', 'ksKaki', 'ksLebar', 'ksHuruf', 'ksLogo', 'ksKode'].forEach(function (id) {
    $(id).addEventListener('input', function () { tampilStruk(); tampilContoh(); });
    $(id).addEventListener('change', function () { tampilStruk(); tampilContoh(); });
  });
  function pesanSet(t, baik) { $('ksSetMsg').innerHTML = t ? '<div class="msg ' + (baik ? 'ok' : 'bad') + '">' + esc(t) + '</div>' : ''; }
  $('ksSetContoh').onclick = function () {
    var buka = $('ksSetPrevC').hidden; $('ksSetPrevC').hidden = !buka;
    this.textContent = buka ? 'Sembunyikan contoh nota' : 'Lihat contoh nota'; tampilContoh();
  };
  $('ksSetSimpan').onclick = async function () {
    var tombol = this; tombol.disabled = true; pesanSet('', true);
    var r; try { r = await sb.rpc('kasir_simpan_setelan', { p: { toko: D.toko, setelan: setelanForm() } }); } catch (e) { r = { error: e }; }
    tombol.disabled = false;
    if (r.error || !r.data || !r.data.ok) { pesanSet((r.data && r.data.pesan) || 'Gagal menyimpan. Periksa internet lalu simpan lagi.', false); return; }
    D.setelan = r.data.setelan; isiSetelan(D.setelan); tampilStruk(); tampilContoh();
    if (D.setelan.kasir) { $('ksKasir').value = D.setelan.kasir; lokal('ks_kasir', D.setelan.kasir); }
    pesanSet(r.data.pesan, true);
  };

})();
