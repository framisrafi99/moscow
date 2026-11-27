/*
 * Moscow Supplies - Gudang Utama: Daftar produk (27 Nov 2026).
 * Tab per kategori (Kuas, Sikat, Retail, Moscow, Kenka, Benang, Tali Sepatu, Electric): daftar produk dengan harga & stok Gudang Utama,
 * dan form "Tambah produk baru" (kode otomatis per kategori). Data: rpc produk_daftar_gu, simpan: rpc produk_baru_gu.
 */
(function () {
  'use strict';
  var KAT = [
    ['Produk Kuas', 'Kuas'], ['Produk Sikat', 'Sikat'], ['Produk Retail', 'Retail'], ['Produk Cat Moscow', 'Moscow'],
    ['Produk Kenka by Moscow', 'Kenka'], ['Produk Benang', 'Benang'], ['Produk Tali Sepatu', 'Tali Sepatu'], ['Produk Electric', 'Electric']
  ];
  var S = { el: null, sb: null, d: null, kat: 'Produk Kuas', cari: '', form: false, f: {}, tok: '', sibuk: false, pesan: null, tanya: '', memuat: false, nama: '' };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rp(n) { return 'Rp ' + Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function f(n) { return Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function token() { return 'prgu-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  var CSS = '.prg{max-width:900px;margin:0 auto;padding:16px 16px 40px}.prg h2{margin:0 0 4px;font-size:19px;font-weight:800}.prg .sb{font-size:13px;color:var(--abu)}' +
    '.prg .tab{display:flex;gap:6px;overflow-x:auto;padding:10px 0 6px;scrollbar-width:none}.prg .tab button{flex:0 0 auto;border:1px solid var(--garis2);background:#fff;border-radius:999px;padding:7px 12px;font:inherit;font-size:14px;cursor:pointer;white-space:nowrap}' +
    '.prg .tab button.on{background:var(--biru,#1F4E8C);border-color:var(--biru,#1F4E8C);color:#fff}.prg .tab button i{font-style:normal;opacity:.75;margin-left:4px;font-size:12px}' +
    '.prg .alat{display:flex;gap:8px;align-items:center;margin:6px 0 10px;flex-wrap:wrap}.prg .alat input{flex:1 1 200px}' +
    '.prg .brg{display:flex;gap:10px;align-items:flex-start;border-top:1px solid var(--garis2);padding:9px 0}.prg .brg:first-child{border-top:0}' +
    '.prg .brg .k{flex:0 0 52px;font-weight:700;font-size:13px;color:var(--abu);padding-top:1px}.prg .brg .n{flex:1;min-width:0}.prg .brg .n small{display:block;color:var(--abu);font-size:12px}' +
    '.prg .brg .r{text-align:right;white-space:nowrap;font-size:14px}.prg .brg .r small{display:block;color:var(--abu);font-size:12px}' +
    '.prg .frm{border:1px solid var(--garis2);border-radius:14px;padding:12px;margin:4px 0 12px;background:#F8FAFC;display:grid;gap:10px}' +
    '.prg .frm label{display:grid;gap:4px;font-size:13px;color:var(--abu)}.prg .frm .baris{display:grid;grid-template-columns:1fr 1fr;gap:10px}@media (max-width:520px){.prg .frm .baris{grid-template-columns:1fr}}' +
    '.prg .kode{font-size:20px;font-weight:800;color:var(--teks,#0F1B2A)}.prg .msg{margin:8px 0}';

  async function muat() {
    if (S.memuat) return; S.memuat = true; gambar();
    try {
      var r = await S.sb.rpc('produk_daftar_gu');
      if (r.error) throw new Error(r.error.message);
      if (!r.data || !r.data.ok) throw new Error((r.data && r.data.pesan) || 'Data tidak terbaca.');
      S.d = r.data;
    } catch (e) { S.pesan = { ok: false, t: 'Gagal memuat daftar produk: ' + e.message }; }
    S.memuat = false; gambar();
  }
  function items(kat) { var x = ((S.d && S.d.kategori) || []).filter(function (k) { return k.kat === kat; })[0]; return x ? x.items : []; }
  function kodeBerikut(kat) { return (S.d && S.d.kode_berikut && S.d.kode_berikut[kat]) || '–'; }
  function gambar() {
    var el = S.el; if (!el) return;
    var nmKat = (KAT.filter(function (k) { return k[0] === S.kat; })[0] || [S.kat, S.kat])[1];
    var semua = items(S.kat), q = S.cari.trim().toLowerCase();
    var tampil = q ? semua.filter(function (x) { return (x.k + ' ' + x.n).toLowerCase().indexOf(q) !== -1; }) : semua;
    var h = '<div class="prg"><h2>Daftar produk</h2><div class="sb">Produk yang dijual Moscow Supplies per kategori, dengan harga jual dan stok Gudang Utama. Produk baru bisa ditambahkan di kategorinya.</div>';
    h += '<div class="tab" role="tablist">' + KAT.map(function (k) {
      return '<button type="button" role="tab" data-kat="' + esc(k[0]) + '" class="' + (k[0] === S.kat ? 'on' : '') + '" aria-selected="' + (k[0] === S.kat) + '">' + esc(k[1]) + '<i>' + (S.d ? items(k[0]).length : '') + '</i></button>';
    }).join('') + '</div>';
    if (S.pesan) h += '<div class="msg ' + (S.pesan.ok ? 'ok' : 'bad') + '">' + esc(S.pesan.t) + '</div>';
    if (S.form) {
      h += '<div class="frm"><div><span class="sb">Produk baru · ' + esc(nmKat) + '</span><div class="kode">' + esc(kodeBerikut(S.kat)) + '</div><span class="sb">Kode dibuat otomatis.</span></div>' +
        '<label>Nama produk<input class="isian" data-p="nama" maxlength="120" value="' + esc(S.f.nama || '') + '" placeholder="Contoh: Kuas Detail Nilon No. 2"></label>' +
        '<label>Varian warna (pisahkan dengan koma, kosongkan kalau tidak ada)<input class="isian" data-p="warna" maxlength="200" value="' + esc(S.f.warna || '') + '" placeholder="Contoh: Hitam, Putih"></label>' +
        '<div class="baris"><label>Harga jual (Rp)<input class="isian" data-p="hj" inputmode="numeric" value="' + esc(S.f.hj || '') + '" placeholder="45000"></label>' +
        '<label>HPP / harga beli per pcs (Rp, boleh kosong)<input class="isian" data-p="hpp" inputmode="numeric" value="' + esc(S.f.hpp || '') + '" placeholder="20000"></label></div>' +
        '<label>Nama staf<input class="isian" data-p="staf" maxlength="40" value="' + esc(S.f.staf || S.nama || '') + '"></label>' +
        (S.tanya ? '<div class="msg bad">' + esc(S.tanya) + ' Tekan "Tetap simpan" kalau sudah benar.</div>' : '') +
        '<div class="aksi-baris"><button type="button" class="tbl pri" data-a="simpan"' + (S.sibuk ? ' disabled' : '') + '>' + (S.sibuk ? 'Menyimpan…' : (S.tanya ? 'Tetap simpan' : 'Simpan produk baru')) + '</button>' +
        '<button type="button" class="tbl" data-a="batal">Batal</button></div></div>';
    } else {
      h += '<div class="alat"><input class="isian" data-a="cari" placeholder="Cari kode atau nama di ' + esc(nmKat) + '…" value="' + esc(S.cari) + '">' +
        '<button type="button" class="tbl pri" data-a="tambah">+ Tambah produk ' + esc(nmKat) + '</button></div>';
    }
    if (S.memuat && !S.d) h += '<div class="sb">Memuat…</div>';
    else if (!tampil.length) h += '<div class="sb">' + (q ? 'Tidak ada produk yang cocok.' : 'Belum ada produk di kategori ini.') + '</div>';
    else h += '<div>' + tampil.map(function (x) {
      return '<div class="brg"><div class="k">' + esc(x.k) + '</div><div class="n">' + esc(x.n) + (x.w ? '<small>Warna: ' + esc(x.w) + '</small>' : '') + '</div>' +
        '<div class="r">' + rp(x.h) + '<small>stok GU ' + f(x.stok) + '</small></div></div>';
    }).join('') + '</div>';
    el.innerHTML = h + '</div>';
    el.querySelectorAll('[data-kat]').forEach(function (b) { b.onclick = function () { S.kat = b.getAttribute('data-kat'); S.form = false; S.tanya = ''; S.cari = ''; S.pesan = null; gambar(); }; });
    var c = el.querySelector('[data-a="cari"]');
    if (c) c.oninput = function () { var p = c.selectionStart; S.cari = c.value; gambar(); var c2 = el.querySelector('[data-a="cari"]'); if (c2) { c2.focus(); try { c2.setSelectionRange(p, p); } catch (e) { } } };
    el.querySelectorAll('[data-p]').forEach(function (i) { i.oninput = function () { S.f[i.getAttribute('data-p')] = i.value; if (S.tanya) { S.tanya = ''; gambar(); } }; });
    var t = el.querySelector('[data-a="tambah"]'); if (t) t.onclick = function () { S.form = true; S.f = {}; S.tok = token(); S.tanya = ''; S.pesan = null; gambar(); var n = el.querySelector('[data-p="nama"]'); if (n) n.focus(); };
    var bt = el.querySelector('[data-a="batal"]'); if (bt) bt.onclick = function () { S.form = false; S.tanya = ''; gambar(); };
    var sv = el.querySelector('[data-a="simpan"]'); if (sv) sv.onclick = simpan;
  }
  async function simpan() {
    if (S.sibuk) return;
    var x = S.f, staf = (x.staf || S.nama || '').trim();
    if ((x.nama || '').trim().length < 3) { S.pesan = { ok: false, t: 'Isi nama produk (minimal 3 huruf).' }; gambar(); return; }
    if (!(x.hj || '').trim()) { S.pesan = { ok: false, t: 'Isi harga jual.' }; gambar(); return; }
    if (staf.length < 2) { S.pesan = { ok: false, t: 'Isi nama staf.' }; gambar(); return; }
    S.sibuk = true; S.pesan = null; gambar();
    var r; try { r = await S.sb.rpc('produk_baru_gu', { p_kat: S.kat, p_nama: x.nama, p_warna: x.warna || '', p_hj: x.hj, p_hpp: x.hpp || '', p_staf: staf, p_yakin: !!S.tanya, p_token: S.tok }); } catch (e) { r = { error: e }; }
    S.sibuk = false;
    var d = r && r.data;
    if (r.error || !d) { S.pesan = { ok: false, t: 'Gagal menyimpan: ' + ((r.error && r.error.message) || 'coba lagi.') }; gambar(); return; }
    if (d.tanya) { S.tanya = d.pesan; gambar(); return; }
    if (!d.ok) { S.pesan = { ok: false, t: d.pesan }; gambar(); return; }
    S.form = false; S.tanya = ''; S.f = {}; S.pesan = { ok: true, t: d.pesan }; S.d = null;
    await muat();
  }
  window.ProdukGU = {
    gambar: function (el, sb, opsi) {
      S.el = el; S.sb = sb; S.nama = (opsi && opsi.nama) || S.nama;
      if (!document.getElementById('prgCss')) { var st = document.createElement('style'); st.id = 'prgCss'; st.textContent = CSS; document.head.appendChild(st); }
      gambar(); muat();
    }
  };
})();
