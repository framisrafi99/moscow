/*
 * Moscow Supplies - pengingat barang tertunda di aplikasi Gudang Utama, Produksi, dan Bahan baku (26 Nov 2026).
 * Barang yang sudah dibayar lebih dari 7 hari tapi belum diterima, dengan statusnya:
 * belum datang sama sekali / baru datang sebagian / datang lewat PO lain. Staf menanyakannya ke Purchasing (Viory).
 * Kotak bisa ditutup (✕) dan muncul lagi 1 jam kemudian. Data dari RPC barang_tertunda_saya.
 */
(function () {
  'use strict';
  var O = null, D = null, TUTUP_MS = 60 * 60000;
  var CSS = '#tdKotak{max-width:860px;margin:10px auto 0;padding:0 16px}' +
    '#tdKotak .td{position:relative;border:1px solid #f3c98b;background:#fff8ec;color:#5c3b00;border-radius:14px;padding:12px 44px 12px 14px;font-size:14px;line-height:1.45}' +
    '#tdKotak .td b.j{display:block;margin-bottom:4px}#tdKotak ul{margin:6px 0 0;padding-left:18px}#tdKotak li{margin:3px 0}' +
    '#tdKotak .kc{font-size:12px;color:#7a5a1f}#tdKotak .st{font-weight:600}' +
    '#tdKotak .tdX{position:absolute;top:6px;right:6px;width:36px;height:36px;border:0;background:transparent;font-size:20px;line-height:1;cursor:pointer;opacity:.6;border-radius:10px;padding:0}' +
    '#tdKotak .tdX:hover{opacity:1;background:rgba(0,0,0,.06)}#tdKotak .tdL{margin-top:6px;border:0;background:none;color:#8a4b00;text-decoration:underline;padding:0;font:inherit;cursor:pointer}';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function kunci() { return 'tdTutup|' + O.app; }
  function tertutup() { try { return Date.now() < Number(localStorage.getItem(kunci()) || 0); } catch (e) { return O.tt && Date.now() < O.tt; } }
  function tutup() { O.tt = Date.now() + TUTUP_MS; try { localStorage.setItem(kunci(), String(O.tt)); } catch (e) { } gambar(); }

  function kotak() {
    var el = document.getElementById('tdKotak');
    if (!el) {
      var fr = document.getElementById('bingkai'); if (!fr || !fr.parentNode) return null;
      el = document.createElement('div'); el.id = 'tdKotak'; el.setAttribute('role', 'status');
      fr.parentNode.insertBefore(el, fr);
      el.addEventListener('click', function (e) {
        if (e.target.closest('.tdX')) tutup();
        else if (e.target.closest('.tdL')) { O.semua = !O.semua; gambar(); }
      });
    }
    return el;
  }
  function gambar() {
    var el = kotak(); if (!el) return;
    var it = (D && D.items) || [];
    if (!it.length || tertutup()) { el.innerHTML = ''; if (O.ubah) O.ubah(); return; }
    var tampil = O.semua ? it : it.slice(0, 4);
    el.innerHTML = '<div class="td"><button type="button" class="tdX" aria-label="Tutup pengingat (muncul lagi 1 jam lagi)" title="Tutup (muncul lagi 1 jam lagi)">✕</button>' +
      '<b class="j">📦 ' + it.length + ' barang sudah dibayar lebih dari 7 hari tapi belum diterima</b>' +
      'Tanyakan ke Purchasing (Viory): barangnya masih di jalan, perlu ditagih ke toko/supplier, atau dibatalkan. Kalau barangnya sudah datang, tekan tombol &#128230; <b>Barang dibayar &mdash; tandai diterima</b>.' +
      '<ul>' + tampil.map(function (x) {
        return '<li><b>' + esc(x.n) + '</b> (' + esc(x.q) + ' ' + esc(x.s) + ') — <span class="st">' + esc(x.st) + '</span>' +
          '<div class="kc">' + esc(x.no) + (x.po ? ' · ' + esc(x.po) : '') + (x.toko ? ' · ' + esc(x.toko) : '') + ' · dibayar ' + esc(x.hari) + ' hari lalu</div></li>';
      }).join('') + '</ul>' +
      (it.length > 4 ? '<button type="button" class="tdL">' + (O.semua ? 'Tampilkan lebih sedikit' : 'Tampilkan semua (' + it.length + ')') + '</button>' : '') + '</div>';
    if (O.ubah) O.ubah();
  }
  async function cek() {
    try {
      var r = await O.sb.rpc('barang_tertunda_saya', { p_app: O.app });
      D = r && r.data && r.data.ok ? r.data : null;
    } catch (e) { D = null; }
    gambar();
  }
  window.Tertunda = {
    // opsi: { sb, app: 'gudang' | 'produksi' | 'bahanbaku', ubah: fn (ukur ulang tampilan) }
    pasang: function (opsi) {
      var baru = !O; O = opsi;
      if (!document.getElementById('tdCss')) { var s = document.createElement('style'); s.id = 'tdCss'; s.textContent = CSS; document.head.appendChild(s); }
      if (baru) {
        setInterval(cek, 15 * 60000);
        setInterval(function () { if (D && D.items && D.items.length) gambar(); }, 60000); // muncul lagi tepat waktu setelah 1 jam
        document.addEventListener('visibilitychange', function () { if (!document.hidden) cek(); });
      }
      cek();
    }
  };
})();
