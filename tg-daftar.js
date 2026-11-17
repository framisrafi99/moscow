/*
 * Moscow Supplies - Daftar akun Telegram pribadi ke Admin Accounting (17 Nov 2026).
 * Tampil di Master Data > Pusat agen > tab Sistem. Manajemen membuat kode 6 angka (berlaku 30 menit) untuk satu peran,
 * lalu orangnya mengirim "/daftar KODE" di chat pribadi dengan Admin Accounting. Kode dibuat oleh fungsi tg-tombol
 * (aksi "kode"), yang hanya menerima akun manajemen.
 */
(function () {
  'use strict';
  var PERAN = [['manajemen', 'Manajemen Moscow Supplies'], ['mike', 'Mike'], ['viory', 'Viory (Purchasing)']];
  var S = { st: null, memuat: false, pesan: '', kode: null, sb: null, kotak: null };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  async function panggil(body) {
    var r = await S.sb.functions.invoke('tg-tombol', { body: body });
    if (r.error) throw new Error((r.error && r.error.message) || 'Gagal menghubungi Admin Accounting.');
    return r.data || {};
  }
  function gambar() {
    if (!S.kotak) return;
    var terdaftar = {};
    ((S.st && S.st.terdaftar) || []).forEach(function (x) { terdaftar[x.peran] = x.nama || 'terdaftar'; });
    var h = '<div class="cd"><div class="kpl"><h3 style="margin:0">Akun Telegram Admin Accounting</h3>' +
      '<button type="button" class="tbl kcl" data-tgd="muat"' + (S.memuat ? ' disabled' : '') + '>' + (S.memuat ? 'Memuat…' : 'Periksa lagi') + '</button></div>' +
      '<p class="sb" style="margin:6px 0 10px">Akun pribadi yang terdaftar menerima pesan pribadi dari Admin Accounting dan bisa memakai tombol Setujui / Tolak di Telegram.</p>';
    if (S.pesan) h += '<div class="msg bad">' + esc(S.pesan) + '</div>';
    if (!S.st) h += '<div class="ksg">' + (S.memuat ? 'Memuat…' : 'Belum dimuat.') + '</div>';
    else h += PERAN.map(function (p) {
      var ada = terdaftar[p[0]];
      return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid #E6EAF0;flex-wrap:wrap">' +
        '<div><b>' + esc(p[1]) + '</b><br><span class="label ' + (ada ? 'ok' : 'w') + '">' + (ada ? 'Terdaftar: ' + esc(ada) : 'Belum terdaftar') + '</span></div>' +
        '<button type="button" class="tbl' + (ada ? '' : ' pri') + '" data-tgd="kode" data-peran="' + p[0] + '"' + (S.memuat ? ' disabled' : '') + '>' + (ada ? 'Daftar ulang' : 'Buat kode daftar') + '</button></div>';
    }).join('');
    if (S.kode) h += '<div class="msg ok" style="margin-top:10px">Kode daftar untuk <b>' + esc(S.kode.peran) + '</b>: <b style="font-size:20px;letter-spacing:2px">' + esc(S.kode.kode) + '</b><br>' +
      'Berlaku ' + esc(S.kode.berlaku || '30 menit') + '. Minta orangnya membuka chat pribadi dengan Admin Accounting, lalu mengirim: <b>/daftar ' + esc(S.kode.kode) + '</b><br>' +
      'Satu kode untuk satu orang. Membuat kode baru membatalkan kode ini.</div>';
    h += '</div>';
    S.kotak.innerHTML = h;
  }
  async function muat() {
    if (S.memuat) return;
    S.memuat = true; S.pesan = ''; gambar();
    try { S.st = await panggil({}); if (S.st && S.st.ok === false) { S.pesan = S.st.pesan || 'Akses ditolak.'; S.st = null; } }
    catch (e) { S.pesan = e.message; }
    S.memuat = false; gambar();
  }
  async function kode(peran) {
    if (S.memuat) return;
    S.memuat = true; S.pesan = ''; gambar();
    try {
      var r = await panggil({ aksi: 'kode', peran: peran });
      if (r && r.ok) S.kode = { kode: r.kode, peran: r.peran, berlaku: r.berlaku };
      else S.pesan = (r && r.pesan) || 'Gagal membuat kode.';
    } catch (e) { S.pesan = e.message; }
    S.memuat = false; gambar();
  }
  window.TgDaftar = {
    // Menempelkan kartu di akhir wadah. Dipanggil ulang setiap wadahnya digambar ulang; data yang sudah dimuat tetap dipakai.
    pasang: function (el, sb) {
      if (!el || !sb || !sb.functions) return;
      S.sb = sb;
      var k = document.createElement('div');
      k.addEventListener('click', function (e) {
        var b = e.target.closest('[data-tgd]'); if (!b) return;
        e.stopPropagation();
        if (b.getAttribute('data-tgd') === 'muat') muat(); else kode(b.getAttribute('data-peran'));
      });
      el.appendChild(k); S.kotak = k;
      if (!S.st && !S.memuat) muat(); else gambar();
    }
  };
})();
