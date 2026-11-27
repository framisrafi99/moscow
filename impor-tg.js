/*
 * Moscow Supplies - status bayar pengajuan impor di halaman Mike (27 Nov 2026).
 * Pengajuan impor yang sudah di-ACC punya dua keadaan yang jelas:
 *   "Belum dibayar"  : sudah di-ACC, belum ada pembayaran.
 *   "Sudah dibayar"  : sudah dibayar, menunggu barang datang (PO impor masuk ke Gudang Utama).
 * Bukti bayar yang Mike kirim ke Telegram (uang keluar sudah tercatat di accounting) dicocokkan otomatis dengan pengajuan
 * yang belum dibayar memakai rincian invoice-nya. Mike cukup memeriksa lalu tekan "Tandai sudah dibayar":
 * uang keluar TIDAK dicatat ulang, pengajuan jadi "Sudah dibayar", PO impor otomatis dibuat.
 * Data: RPC impor_bukti_calon, simpan: impor_tandai_bayar (sql 230).
 */
(function () {
  'use strict';
  var BY = {}, O = null, D = null, BUKA = {}, MSG = '', SIBUK = false, LIHAT = false, TUTUP_MS = 60 * 60000, PIL = {}, TOT = {}, SUP = {}, ETA = {}, TOKEN = {};
  var CSS = '#ipKotak{max-width:860px;margin:10px auto 0;padding:0 16px}' +
    '#ipKotak .ip{position:relative;border:1px solid #b9d3f0;background:#f2f8ff;color:#0f2f52;border-radius:14px;padding:12px 44px 12px 14px;font-size:14px;line-height:1.45}' +
    '#ipKotak b.j{display:block;margin-bottom:4px;font-size:15px}#ipKotak .kc{font-size:12px;color:#46617f}' +
    '#ipKotak .ipX{position:absolute;top:6px;right:6px;width:36px;height:36px;border:0;background:transparent;font-size:20px;line-height:1;cursor:pointer;opacity:.6;border-radius:10px;padding:0}' +
    '#ipKotak .ipX:hover{opacity:1;background:rgba(0,0,0,.06)}' +
    '#ipKotak .lbl{display:inline-block;border-radius:999px;padding:1px 9px;font-size:12px;font-weight:600;white-space:nowrap}' +
    '#ipKotak .belum{background:#fde8d4;color:#8a3d00}#ipKotak .sudah{background:#d9f2e1;color:#14532d}' +
    '#ipKotak .ringkas{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 2px}' +
    '#ipKotak .bk{background:#fff;border:1px solid #cfe0f3;border-radius:12px;padding:10px 12px;margin-top:10px}' +
    '#ipKotak .bk h4{margin:0 0 2px;font-size:14px}#ipKotak .it{display:flex;gap:8px;align-items:flex-start;padding:6px 0;border-top:1px solid #eef3f9}' +
    '#ipKotak .it:first-of-type{border-top:0}#ipKotak .it .n{flex:1;min-width:0}#ipKotak .it input[type=checkbox]{width:20px;height:20px;margin-top:2px;flex:none}' +
    '#ipKotak input.rp{width:130px;padding:6px 8px;border:1px solid #c5d3e3;border-radius:8px;font:inherit;text-align:right}' +
    '#ipKotak input.tx{width:100%;box-sizing:border-box;padding:7px 9px;border:1px solid #c5d3e3;border-radius:8px;font:inherit}' +
    '#ipKotak .g2{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}#ipKotak label.k{display:block;font-size:12px;color:#46617f;margin-bottom:2px}' +
    '#ipKotak .tb{margin-top:10px;width:100%;padding:11px;border:0;border-radius:10px;background:#1d5fa8;color:#fff;font:inherit;font-weight:600;cursor:pointer}' +
    '#ipKotak .tb[disabled]{opacity:.55;cursor:default}#ipKotak .lk{border:0;background:none;color:#1d5fa8;text-decoration:underline;padding:0;font:inherit;cursor:pointer}' +
    '#ipKotak .jml{margin-top:8px;font-size:13px}#ipKotak .ok{color:#14532d}#ipKotak .bad{color:#9b1c1c}' +
    '#ipKotak .ms{margin-top:8px;padding:8px 10px;border-radius:8px;font-size:13px}#ipKotak .ms.ok{background:#e3f6e9}#ipKotak .ms.bad{background:#fdecea}' +
    '#ipKotak ul{margin:6px 0 0;padding-left:18px}#ipKotak li{margin:3px 0}' +
    '#ipKotak .telat{margin-top:8px;padding:8px 10px;border-radius:10px;background:#fdecea;color:#7f1d1d;font-size:13px}' +
    '#ipKotak .tb2{margin-top:8px;padding:9px 12px;border:1px solid #1d5fa8;border-radius:10px;background:#fff;color:#1d5fa8;font:inherit;font-weight:600;cursor:pointer}' +
    '@media (max-width:560px){#ipKotak .g2{grid-template-columns:1fr}#ipKotak input.rp{width:110px}}';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rp(v) { return 'Rp ' + Math.round(Number(v) || 0).toLocaleString('id-ID'); }
  function angka(s) { return Number(String(s == null ? '' : s).replace(/[^0-9]/g, '')) || 0; }
  function tgl(t) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(t || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] : String(t || ''); }
  function kunci() { return 'ipTutup|' + O.app; }
  function tertutup() { try { return Date.now() < Number(localStorage.getItem(kunci()) || 0); } catch (e) { return O.tt && Date.now() < O.tt; } }
  function tutup() { O.tt = Date.now() + TUTUP_MS; try { localStorage.setItem(kunci(), String(O.tt)); } catch (e) { } gambar(); }

  // Pencocokan nama barang di invoice dengan nama pengajuan (kata yang sama; "ulih" ~ "ulir").
  function kata(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(function (w) { return w && !/^(pcs|set|isi|dan|warna|colour|color)$/.test(w); }); }
  function samaKata(a, b) { return a === b || (a.length >= 4 && b.length >= 4 && a.slice(0, 3) === b.slice(0, 3) && Math.abs(a.length - b.length) <= 1 && a.slice(0, a.length - 1) === b.slice(0, b.length - 1)); }
  function skor(a, b) {
    var A = kata(a), B = kata(b); if (!A.length || !B.length) return 0;
    var c = A.filter(function (w) { return B.some(function (x) { return samaKata(w, x); }); }).length;
    return c / Math.min(A.length, B.length);
  }
  function cocokkan(bukti, tunggu, lepas) {
    var hasil = {}, pakai = {};
    (bukti.barang || []).forEach(function (it) {
      var cal = tunggu.filter(function (a) { return !pakai[a.no]; }).map(function (a) { return { a: a, s: skor(it.nama, a.n + ' ' + (a.w || '')) }; })
        .filter(function (x) { return x.s >= 0.6; }).sort(function (x, y) { return y.s - x.s; });
      if (!cal.length) { if (lepas) lepas.push(it); return; }
      var m = /(\d+)\s*warna/i.exec(it.nama || ''), n = m ? Number(m[1]) : 1;
      var top = cal.filter(function (x) { return x.s >= cal[0].s - 0.01; }).slice(0, n);
      if (top.length < n) top = cal.slice(0, n);
      var tot = Math.round(Number(it.total) || 0), bagi = Math.floor(tot / top.length), sisa = tot - bagi * top.length;
      top.forEach(function (x, i) { pakai[x.a.no] = 1; hasil[x.a.no] = bagi + (i < sisa ? 1 : 0); });
    });
    return hasil;
  }

  function kotak() {
    // 28 Nov 2026: di halaman Mike kotak ini tampil di dalam menu Impor (O.wadah), bukan di atas form.
    if (O.wadah) {
      var w = O.wadah;
      if (!w._ip) { w._ip = 1; w.id = 'ipKotak'; w.addEventListener('click', klik); w.addEventListener('input', ketik); w.addEventListener('change', ketik); }
      return w.isConnected ? w : null;
    }
    var el = document.getElementById('ipKotak');
    if (!el) {
      var fr = document.getElementById('bingkai'); if (!fr || !fr.parentNode) return null;
      el = document.createElement('div'); el.id = 'ipKotak';
      fr.parentNode.insertBefore(el, fr);
      el.addEventListener('click', klik);
      el.addEventListener('input', ketik);
      el.addEventListener('change', ketik);
    }
    return el;
  }
  function siapkan() {
    (D.bukti || []).forEach(function (b) {
      if (PIL[b.tr]) return;
      var lepas = [], c = cocokkan(b, D.tunggu || [], lepas);
      b.cocok = Object.keys(c).length;
      // Barang di invoice yang belum ada pengajuannya: produk ditebak dari nama, qty diisi Mike.
      b.baru = lepas.map(function (it, i) {
        var best = null, sk = 0;
        (D.produk || []).forEach(function (p) { var x = skor(it.nama, p.n); if (x > sk) { sk = x; best = p; } });
        return { id: 'n' + i, nama: it.nama, pil: true, pk: best && sk >= 0.6 ? best.k : '', w: '', q: it.qty ? angka(it.qty) : '', v: Math.round(Number(it.total) || 0) };
      });
      PIL[b.tr] = {}; TOT[b.tr] = {};
      Object.keys(c).forEach(function (no) { PIL[b.tr][no] = true; TOT[b.tr][no] = c[no]; });
      SUP[b.tr] = b.sup || ''; ETA[b.tr] = '';
      TOKEN[b.tr] = b.tr + '|' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    });
    D.bukti.sort(function (x, y) { return ((y.cocok || 0) + (y.baru || []).length) - ((x.cocok || 0) + (x.baru || []).length); });
  }
  function bukti(tr) { return ((D && D.bukti) || []).filter(function (x) { return x.tr === tr; })[0]; }
  function baruDipakai(b) { return (b.baru || []).filter(function (x) { return x.pil && x.pk !== '-'; }); }
  function jumlah(tr) {
    var t = 0, P = PIL[tr] || {}, T = TOT[tr] || {}, b = bukti(tr);
    Object.keys(P).forEach(function (no) { if (P[no]) t += Number(T[no]) || 0; });
    if (b) baruDipakai(b).forEach(function (x) { t += Number(x.v) || 0; });
    return t;
  }
  var JENIS = [['', 'Pilih produk…'], ['@Bahan baku', 'Bahan baku (tanpa kode)'], ['@Botol & stiker', 'Botol & stiker (tanpa kode)'], ['@Packaging & lainnya', 'Lainnya (tanpa kode)'], ['-', 'Bukan barang (biaya) — jangan dicatat']];
  function pilihProduk(x) {
    var o = JENIS.map(function (j) { return '<option value="' + esc(j[0]) + '"' + (x.pk === j[0] ? ' selected' : '') + '>' + esc(j[1]) + '</option>'; }).join('');
    o += '<optgroup label="Produk (Master Data)">' + (D.produk || []).map(function (p) { return '<option value="' + esc(p.k) + '"' + (x.pk === p.k ? ' selected' : '') + '>' + esc(p.k + ' · ' + p.n) + '</option>'; }).join('') + '</optgroup>';
    return '<select class="tx" data-bpk="' + esc(x.id) + '">' + o + '</select>';
  }
  function produk(k) { return (D.produk || []).filter(function (p) { return p.k === k; })[0]; }
  function kartuBaru(b) {
    if (!(b.baru || []).length) return '';
    return '<div style="margin-top:8px;padding-top:6px;border-top:1px dashed #cfe0f3"><b>Belum ada pengajuannya (' + b.baru.length + ')</b>' +
      '<div class="kc">Barang ini ada di invoice tapi tidak ada di daftar pengajuan. Pilih produknya dan isi qty; pengajuannya dibuat otomatis (disetujui ' + esc(b.oleh || 'Mike') + ') dan langsung ditandai sudah dibayar.</div>' +
      b.baru.map(function (x) {
        var p = produk(x.pk), warna = p && p.w && p.w.length ? '<select class="tx" data-bw="' + esc(x.id) + '"><option value="">Pilih warna…</option>' + p.w.map(function (w) { return '<option' + (x.w === w ? ' selected' : '') + '>' + esc(w) + '</option>'; }).join('') + '</select>' : '';
        return '<div class="it"><input type="checkbox" data-bpil="' + esc(x.id) + '"' + (x.pil ? ' checked' : '') + ' aria-label="' + esc(x.nama) + '">' +
          '<div class="n"><b>' + esc(x.nama) + '</b><div class="kc">Dari invoice · total ' + rp(x.v) + '</div>' +
          (x.pil ? '<div style="margin-top:4px">' + pilihProduk(x) + '</div>' + (warna ? '<div style="margin-top:4px">' + warna + '</div>' : '') : '') + '</div>' +
          (x.pil && x.pk !== '-' ? '<div><input class="rp" inputmode="decimal" data-bq="' + esc(x.id) + '" placeholder="Qty" value="' + esc(x.q) + '" style="width:80px;margin-bottom:4px"><br>' +
            '<input class="rp" inputmode="numeric" data-bv="' + esc(x.id) + '" placeholder="Total Rp" value="' + (x.v ? Number(x.v).toLocaleString('id-ID') : '') + '"></div>' : '') + '</div>';
      }).join('') + '</div>';
  }

  function kartuBukti(b) {
    var P = PIL[b.tr], T = TOT[b.tr], tunggu = D.tunggu || [];
    var urut = tunggu.slice().sort(function (x, y) { return (P[y.no] ? 1 : 0) - (P[x.no] ? 1 : 0); });
    var tot = jumlah(b.tr), selisih = b.v - tot, n = Object.keys(P).filter(function (k) { return P[k]; }).length + baruDipakai(b).length;
    var h = '<div class="bk" data-tr="' + esc(b.tr) + '"><h4>🧾 Bukti Telegram ' + esc(b.oleh || '') + ' · ' + tgl(b.t) + ' · ' + rp(b.v) + '</h4>' +
      '<div class="kc">' + esc(b.tr) + ' · ' + esc(b.akun) + (b.sup ? ' · ke ' + esc(b.sup) : '') + '</div>' +
      (b.cocok ? '<div class="kc ok" style="margin-top:4px">Cocok otomatis dengan ' + b.cocok + ' pengajuan dari rincian invoice. Periksa centang dan totalnya.</div>'
        : (b.baru || []).length ? '' : '<div class="kc" style="margin-top:4px">Invoice-nya tidak terbaca. Centang barang yang dibayar dengan bukti ini dan isi totalnya.</div>');
    h += kartuBaru(b);
    if (urut.length && (b.baru || []).length) h += '<div style="margin-top:8px"><b>Pengajuan yang belum dibayar</b></div>';
    h += urut.map(function (a) {
      return '<div class="it"><input type="checkbox" data-no="' + esc(a.no) + '"' + (P[a.no] ? ' checked' : '') + ' aria-label="' + esc(a.n) + '">' +
        '<div class="n"><b>' + esc(a.n) + (a.w && String(a.n).toUpperCase().indexOf(String(a.w).toUpperCase()) < 0 ? ' · ' + esc(a.w) : '') + '</b>' +
        '<div class="kc">' + esc(a.no) + ' · ' + Number(a.q).toLocaleString('id-ID') + ' ' + esc(a.s) + (a.h ? ' · perkiraan ' + rp(a.h * a.q) : '') + '</div></div>' +
        '<input class="rp" inputmode="numeric" data-tot="' + esc(a.no) + '" placeholder="Total Rp" value="' + (T[a.no] ? Number(T[a.no]).toLocaleString('id-ID') : '') + '"></div>';
    }).join('');
    h += '<div class="jml">' + n + ' barang dicentang · total ' + rp(tot) + ' dari bukti ' + rp(b.v) +
      (n ? (Math.abs(selisih) <= 5000 ? ' <span class="ok">✓ pas</span>' : selisih > 0 ? ' <span class="kc">(sisa ' + rp(selisih) + ', misalnya biaya transfer atau barang lain)</span>' : ' <span class="bad">(lebih ' + rp(-selisih) + ', periksa lagi)</span>') : '') + '</div>' +
      '<div class="g2"><div><label class="k">Supplier</label><input class="tx" data-sup value="' + esc(SUP[b.tr]) + '"></div>' +
      '<div><label class="k">Perkiraan datang (boleh kosong)</label><input class="tx" type="date" data-eta value="' + esc(ETA[b.tr]) + '"></div></div>' +
      '<button type="button" class="tb" data-simpan' + (SIBUK || !n || selisih < -5000 ? ' disabled' : '') + '>' + (SIBUK ? 'Menyimpan…' : 'Tandai sudah dibayar') + '</button>' +
      '<div class="kc" style="margin-top:4px">Uang keluar tidak dicatat ulang (sudah ada di ' + esc(b.tr) + '). PO impor otomatis masuk ke Gudang Utama.</div></div>';
    return h;
  }

  // Bukti biaya impor (ongkir cargo, bill kedua, bea masuk): dimasukkan ke biaya PO supaya ikut HPP.
  var JB = ['Ongkir cargo', 'Bill kedua / IMP', 'Pajak & bea masuk', 'Lainnya'];
  var ALASAN = ['Biaya barang lama tanpa PO', 'Ongkir lokal / bukan impor', 'Transfer uji coba', 'Sudah dicatat dengan cara lain'];
  function siapBiaya(b) {
    if (BY[b.tr]) return BY[b.tr];
    var ket = String(b.ket || '');
    // PO sengaja tidak dipilih otomatis: salah PO membuat HPP barang lain ikut naik.
    return (BY[b.tr] = { po: '', j: /bea|pajak/i.test(ket) ? 'Pajak & bea masuk' : /cargo|kargo|ongkir/i.test(ket) ? 'Ongkir cargo' : /bill|bil kedua|\bimp ?\d/i.test(ket) ? 'Bill kedua / IMP' : 'Ongkir cargo',
      v: b.v, c: '', al: '', mode: '', tok: b.tr + '|' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) });
  }
  function kartuBiaya(b) {
    var x = siapBiaya(b);
    var h = '<div class="bk" data-by="' + esc(b.tr) + '"><h4>🧾 ' + esc(b.oleh || 'Telegram') + ' · ' + tgl(b.t) + ' · ' + rp(b.v) + '</h4><div class="kc">' + esc(b.tr) + ' · ' + esc(b.ket) + '</div>';
    if (x.mode === 'abaikan') {
      return h + '<label class="k" style="margin-top:6px">Kenapa bukan untuk PO?</label><select class="tx" data-yal><option value="">Pilih alasan…</option>' +
        ALASAN.map(function (a) { return '<option' + (x.al === a ? ' selected' : '') + '>' + esc(a) + '</option>'; }).join('') + '</select>' +
        '<button type="button" class="tb" data-yabaikan' + (SIBUK ? ' disabled' : '') + '>Sembunyikan bukti ini</button>' +
        '<button type="button" class="lk" data-ymode="" style="margin-top:6px">Batal</button><div class="kc" style="margin-top:4px">Uang keluarnya tetap tercatat di accounting; bukti hanya tidak ditampilkan di sini.</div></div>';
    }
    h += '<div class="g2"><div><label class="k">PO impor</label><select class="tx" data-ypo><option value="">Pilih PO…</option>' + (D.po || []).map(function (o) {
        return '<option value="' + esc(o.no) + '"' + (x.po === o.no ? ' selected' : '') + '>' + esc(o.no + ' · ' + o.sup + ' · ' + o.st) + '</option>'; }).join('') + '</select></div>' +
      '<div><label class="k">Jenis biaya</label><select class="tx" data-yj>' + JB.map(function (j) { return '<option' + (x.j === j ? ' selected' : '') + '>' + esc(j) + '</option>'; }).join('') + '</select></div>' +
      '<div><label class="k">Nominal</label><input class="tx" inputmode="numeric" data-yv value="' + Number(x.v || 0).toLocaleString('id-ID') + '"></div>' +
      '<div><label class="k">Catatan' + (x.j === 'Lainnya' ? ' (wajib)' : '') + '</label><input class="tx" data-yc value="' + esc(x.c) + '"></div></div>' +
      '<button type="button" class="tb" data-ysimpan' + (SIBUK || !x.po ? ' disabled' : '') + '>Masukkan ke biaya PO</button>' +
      '<button type="button" class="lk" data-ymode="abaikan" style="margin-top:6px">Bukan untuk PO impor</button>' +
      '<div class="kc" style="margin-top:4px">Uang keluar tidak dicatat ulang. Biaya ini ikut dihitung ke HPP barang PO yang dipilih.</div></div>';
    return h;
  }
  async function simpanBiaya(tr, abaikan) {
    if (SIBUK) return;
    var b = bukti(tr), x = BY[tr]; if (!b || !x) return;
    if (abaikan && !x.al) { MSG = '<div class="ms bad">Pilih alasannya.</div>'; return gambar(); }
    if (!abaikan && !x.po) { MSG = '<div class="ms bad">Pilih PO impornya.</div>'; return gambar(); }
    if (!abaikan && x.j === 'Lainnya' && String(x.c).trim().length < 3) { MSG = '<div class="ms bad">Tulis keterangan untuk biaya "Lainnya".</div>'; return gambar(); }
    SIBUK = true; MSG = ''; gambar();
    try {
      var r = abaikan ? await O.sb.rpc('impor_bukti_abaikan_simpan', { p_tr: tr, p_alasan: x.al })
        : await O.sb.rpc('impor_biaya_tandai', { p_tr: tr, p_bukti: b.bukti || null, p_po: x.po, p_jenis: x.j, p_nominal: String(x.v || ''), p_catatan: x.c || '', p_token: x.tok });
      var d = r && r.data;
      MSG = r.error || !d || !d.ok ? '<div class="ms bad">' + esc((d && d.pesan) || (r.error && r.error.message) || 'Gagal menyimpan. Coba lagi.') + '</div>' : '<div class="ms ok">✓ ' + esc(d.pesan) + '</div>';
      if (d && d.ok) { delete BY[tr]; if (O.selesai) try { O.selesai(); } catch (e3) { } await muat(); }
    } catch (err) { MSG = '<div class="ms bad">Gagal terhubung. Coba lagi.</div>'; }
    SIBUK = false; gambar();
  }

  function gambar() {
    var el = kotak(); if (!el) return;
    var tg = (D && D.tunggu) || [], sd = (D && D.dibayar) || [], bk = (D && D.bukti) || [];
    var biaya = bk.filter(function (b) { return b.jenis === 'biaya'; }), telat = (D && D.telat) || [];
    bk = bk.filter(function (b) { return b.jenis !== 'biaya'; });
    var cocok = bk.filter(function (b) { return b.cocok || (b.baru || []).length; }), lain = bk.filter(function (b) { return !b.cocok && !(b.baru || []).length; });
    if (O.wadah && !D) { el.innerHTML = '<div class="ip"><div class="kc">Memuat…</div></div>'; return; }
    if (O.wadah && !tg.length && !cocok.length && !biaya.length && !MSG) { el.innerHTML = '<div class="ip"><div class="kc">Tidak ada pengajuan impor yang belum dibayar dan tidak ada bukti Telegram yang perlu disambungkan.</div></div>'; return; }
    if (!O.wadah && (!D || (!tg.length && !cocok.length && !biaya.length && !telat.length && !MSG) || tertutup())) { el.innerHTML = ''; if (O.ubah) O.ubah(); return; }
    if (O.wadah) telat = [];
    var h = '<div class="ip"' + (O.wadah ? ' style="padding-right:14px"' : '') + '>' + (O.wadah ? '' : '<button type="button" class="ipX" aria-label="Tutup (muncul lagi 1 jam lagi)" title="Tutup (muncul lagi 1 jam lagi)">✕</button>') +
      '<b class="j">' + (O.wadah ? '💳 Belum dibayar & bukti Telegram' : '🌏 Status bayar pengajuan impor') + '</b>' +
      '<div class="ringkas"><span class="lbl belum">' + tg.length + ' belum dibayar</span><span class="lbl sudah">' + sd.length + ' sudah dibayar, menunggu barang datang</span>' +
      (biaya.length ? '<span class="lbl belum">' + biaya.length + ' biaya impor belum masuk PO</span>' : '') + '</div>';
    if (telat.length) h += '<div class="telat"><b>⏰ PO impor belum diterima lebih dari 30 hari</b>' + telat.map(function (o) {
      return '<div>' + esc(o.no) + ' · ' + esc(o.sup) + ' · ' + esc(o.st) + ' · ' + rp(o.tot) + ' · ' + o.hari + ' hari</div>'; }).join('') +
      '<div class="kc" style="color:#7f1d1d">Tanyakan ke supplier atau gudang: masih di jalan, sudah datang tapi belum diterima di aplikasi, atau perlu ditutup.</div></div>';
    if (cocok.length) h += '<div style="margin-top:6px">Ada bukti bayar impor dari Telegram yang belum tercatat di pengajuan. Periksa lalu tekan <b>Tandai sudah dibayar</b>.</div>';
    else h += '<div class="kc" style="margin-top:6px">Setelah membayar supplier, kirim bukti transfer dan invoice-nya ke Telegram Admin Accounting. Bukti itu akan muncul di sini untuk disambungkan ke pengajuannya.</div>';
    h += MSG;
    cocok.forEach(function (b) { h += kartuBukti(b); });
    if (lain.length) {
      h += '<div style="margin-top:8px"><button type="button" class="lk" data-lain>' + (BUKA.lain ? 'Sembunyikan' : 'Pakai bukti Telegram lain (' + lain.length + ')') + '</button></div>';
      if (BUKA.lain) lain.forEach(function (b) {
        h += BUKA[b.tr] ? kartuBukti(b) : '<div class="bk"><h4>🧾 ' + esc(b.oleh || '') + ' · ' + tgl(b.t) + ' · ' + rp(b.v) + '</h4><div class="kc">' + esc(b.tr) + ' · ' + esc(b.ket) + '</div>' +
          '<button type="button" class="lk" data-pakai="' + esc(b.tr) + '" style="margin-top:4px">Pakai bukti ini</button></div>';
      });
    }
    if (biaya.length) {
      h += '<div style="margin-top:10px"><button type="button" class="tb2" data-biaya>' + (BUKA.biaya ? 'Sembunyikan biaya impor' : 'Masukkan biaya impor ke PO (' + biaya.length + ')') + '</button>' +
        '<div class="kc" style="margin-top:4px">Ongkir cargo, bill kedua, dan bea masuk dari Telegram yang belum masuk ke PO mana pun, sehingga belum ikut dihitung ke HPP.</div></div>';
      if (BUKA.biaya) biaya.forEach(function (b) { h += kartuBiaya(b); });
    }
    h += '<div style="margin-top:8px"><button type="button" class="lk" data-lihat>' + (LIHAT ? 'Sembunyikan daftar' : 'Lihat daftar status (' + (tg.length + sd.length) + ')') + '</button></div>';
    if (LIHAT) {
      h += '<ul>' + tg.map(function (a) { return '<li><b>' + esc(a.n) + '</b> — <span class="lbl belum">Belum dibayar</span><div class="kc">' + esc(a.no) + ' · ' + Number(a.q).toLocaleString('id-ID') + ' ' + esc(a.s) + '</div></li>'; }).join('') +
        sd.map(function (a) { return '<li><b>' + esc(a.n) + '</b> — <span class="lbl sudah">Sudah dibayar</span><div class="kc">' + esc(a.no) + ' · ' + esc(a.ref || '') + '</div></li>'; }).join('') + '</ul>';
    }
    el.innerHTML = h + '</div>';
    if (O.ubah) O.ubah();
  }

  function ketik(e) {
    var by = e.target.closest('.bk[data-by]');
    if (by) {
      var x = BY[by.getAttribute('data-by')], t2 = e.target; if (!x) return;
      if (t2.matches('[data-ypo]')) { x.po = t2.value; if (e.type === 'change') gambar(); }
      else if (t2.matches('[data-yj]')) { x.j = t2.value; if (e.type === 'change') gambar(); }
      else if (t2.matches('[data-yv]')) x.v = angka(t2.value);
      else if (t2.matches('[data-yc]')) x.c = t2.value;
      else if (t2.matches('[data-yal]')) x.al = t2.value;
      return;
    }
    var bk = e.target.closest('.bk[data-tr]'); if (!bk) return;
    var tr = bk.getAttribute('data-tr'), t = e.target;
    if (t.matches('input[type=checkbox][data-no]')) { PIL[tr][t.getAttribute('data-no')] = t.checked; if (e.type === 'change') gambar(); return; }
    if (t.matches('[data-tot]')) { TOT[tr][t.getAttribute('data-tot')] = angka(t.value); if (e.type === 'change') { if (TOT[tr][t.getAttribute('data-tot')] > 0) PIL[tr][t.getAttribute('data-tot')] = true; gambar(); } return; }
    var b = bukti(tr), cari = function (a) { var id = t.getAttribute(a); return (b.baru || []).filter(function (x) { return x.id === id; })[0]; }, x;
    if (t.matches('[data-bpil]')) { x = cari('data-bpil'); x.pil = t.checked; if (e.type === 'change') gambar(); return; }
    if (t.matches('[data-bpk]')) { x = cari('data-bpk'); x.pk = t.value; x.w = ''; if (e.type === 'change') gambar(); return; }
    if (t.matches('[data-bw]')) { x = cari('data-bw'); x.w = t.value; return; }
    if (t.matches('[data-bq]')) { x = cari('data-bq'); x.q = t.value; return; }
    if (t.matches('[data-bv]')) { x = cari('data-bv'); x.v = angka(t.value); if (e.type === 'change') gambar(); return; }
    if (t.matches('[data-sup]')) SUP[tr] = t.value;
    if (t.matches('[data-eta]')) ETA[tr] = t.value;
  }
  function klik(e) {
    var t = e.target;
    if (t.closest('.ipX')) return tutup();
    if (t.closest('[data-lihat]')) { LIHAT = !LIHAT; return gambar(); }
    if (t.closest('[data-lain]')) { BUKA.lain = !BUKA.lain; return gambar(); }
    if (t.closest('[data-biaya]')) { BUKA.biaya = !BUKA.biaya; return gambar(); }
    var yb = t.closest('.bk[data-by]');
    if (yb) {
      var tr = yb.getAttribute('data-by');
      var md = t.closest('[data-ymode]'); if (md) { BY[tr].mode = md.getAttribute('data-ymode'); return gambar(); }
      if (t.closest('[data-ysimpan]')) return simpanBiaya(tr, false);
      if (t.closest('[data-yabaikan]')) return simpanBiaya(tr, true);
      return;
    }
    var p = t.closest('[data-pakai]'); if (p) { BUKA[p.getAttribute('data-pakai')] = true; return gambar(); }
    var s = t.closest('[data-simpan]'); if (s) return simpan(s.closest('.bk').getAttribute('data-tr'));
  }
  async function simpan(tr) {
    if (SIBUK) return;
    var b = bukti(tr); if (!b) return;
    var nos = Object.keys(PIL[tr]).filter(function (k) { return PIL[tr][k]; }), tot = {}, baru = [], salah = '';
    baruDipakai(b).forEach(function (x) {
      var q = Number(String(x.q || '').replace(',', '.')) || 0, p = x.pk && x.pk.charAt(0) !== '@' ? produk(x.pk) : null;
      if (!x.pk) salah = salah || 'Pilih produk untuk "' + x.nama + '" (atau pilih "Bukan barang").';
      else if (p && p.w && p.w.length && !x.w) salah = salah || 'Pilih warna untuk ' + p.n + '.';
      else if (!(q > 0)) salah = salah || 'Isi qty untuk "' + x.nama + '".';
      else if (!(x.v > 0)) salah = salah || 'Isi total untuk "' + x.nama + '".';
      baru.push(p ? { k: x.pk, w: x.w, q: q, v: x.v } : { kel: String(x.pk).slice(1), n: x.nama, q: q, v: x.v });
    });
    if (salah) { MSG = '<div class="ms bad">' + esc(salah) + '</div>'; return gambar(); }
    var kosong = nos.filter(function (no) { tot[no] = Number(TOT[tr][no]) || 0; return !(tot[no] > 0); });
    if (!nos.length && !baru.length) { MSG = '<div class="ms bad">Centang barang yang dibayar dengan bukti ini.</div>'; return gambar(); }
    if (kosong.length) { MSG = '<div class="ms bad">Isi total yang dibayar untuk setiap barang yang dicentang.</div>'; return gambar(); }
    if (String(SUP[tr] || '').trim().length < 2) { MSG = '<div class="ms bad">Isi nama supplier.</div>'; return gambar(); }
    SIBUK = true; MSG = ''; gambar();
    try {
      var r = await O.sb.rpc('impor_bukti_catat', { p_nos: nos, p_total: tot, p_baru: baru, p_tr: tr, p_bukti: b.bukti || null, p_supplier: String(SUP[tr]).trim(),
        p_eta: ETA[tr] || '', p_catatan: '', p_token: TOKEN[tr] });
      var d = r && r.data;
      if (r.error || !d || !d.ok) { MSG = '<div class="ms bad">' + esc((d && d.pesan) || (r.error && r.error.message) || 'Gagal menyimpan. Coba lagi.') + '</div>'; }
      else {
        MSG = '<div class="ms ok">✓ ' + esc(d.pesan) + '</div>';
        delete PIL[tr]; if (O.selesai) try { O.selesai(); } catch (e3) { }
        try { var fr = document.getElementById('bingkai'); if (fr && fr.contentWindow) fr.contentWindow.location.reload(); } catch (e2) { }
        await muat();
      }
    } catch (err) { MSG = '<div class="ms bad">Gagal terhubung. Coba lagi.</div>'; }
    SIBUK = false; gambar();
  }
  async function muat() {
    try {
      var r = await O.sb.rpc('impor_bukti_calon');
      D = r && r.data && r.data.ok ? r.data : null;
      if (D) siapkan();
    } catch (e) { D = null; }
    gambar();
  }
  window.ImporTg = {
    // opsi: { sb, app: 'mike' | 'mikelama', ubah: fn }
    pasang: function (opsi) {
      var baru = !O; O = opsi;
      if (!document.getElementById('ipCss')) { var s = document.createElement('style'); s.id = 'ipCss'; s.textContent = CSS; document.head.appendChild(s); }
      if (baru) document.addEventListener('visibilitychange', function () { if (!document.hidden && !SIBUK) muat(); });
      muat();
    },
    _uji: { skor: skor, cocokkan: cocokkan, kartuBiaya: function (b) { return kartuBiaya(b); } }
  };
})();
