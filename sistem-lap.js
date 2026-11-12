/* Moscow Supplies - Laporan sistem (Kendali Bisnis), 12 Nov 2026.
 * Catatan pekerjaan sistem per hari dari penanggung jawab sistem (tabel sistem_laporan), untuk Mike dan Junior.
 * Manajemen Moscow Supplies bisa menambah catatan dari halaman yang sama.
 * Dipakai: form.html (form-app.js, aplikasi mike, menu panel 'sistem') lewat window.LaporanSistem.gambar(el, sb, peran).
 */
(function () {
  'use strict';
  var S = { el: null, sb: null, peran: '', list: null, bulan: '', pesan: '', memuat: false };
  var BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function hariIni() { return new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10); }
  function tglPanjang(t) {
    var p = String(t || '').split('-'); if (p.length !== 3) return t;
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    return HARI[d.getUTCDay()] + ', ' + Number(p[2]) + ' ' + BLN[Number(p[1]) - 1] + ' ' + p[0];
  }
  function namaBulan(b) { var p = b.split('-'); return BLN[Number(p[1]) - 1] + ' ' + p[0]; }
  function isiTeks(t) {
    var baris = String(t || '').split(/\n+/).map(function (b) { return b.trim(); }).filter(Boolean);
    var poin = baris.length && baris.every(function (b) { return /^[-•*]/.test(b); });
    if (poin) return '<ul class="lsUl">' + baris.map(function (b) { return '<li>' + esc(b.replace(/^[-•*]\s*/, '')) + '</li>'; }).join('') + '</ul>';
    return baris.map(function (b) { return '<p class="lsP">' + esc(b) + '</p>'; }).join('');
  }

  var CSS = '.ls{max-width:900px;margin:0 auto;padding:16px 16px 40px;color:#0F1B2A}.ls h2{margin:0;font-size:19px;font-weight:800}' +
    '.ls .sb{font-size:13px;color:#5A6677;margin-top:4px}.ls .kt{background:#fff;border:1px solid #E2E7EE;border-radius:14px;padding:14px 16px;margin-top:12px}' +
    '.ls .hr{font-size:14px;font-weight:800;margin:22px 0 2px;display:flex;justify-content:space-between;gap:10px;align-items:baseline}' +
    '.ls .hr span{font-size:12px;font-weight:600;color:#5A6677}.ls .it{display:grid;grid-template-columns:52px 1fr;gap:10px;padding:12px 0;border-top:1px solid #EEF1F5}' +
    '.ls .it:first-child{border-top:0;padding-top:4px}.ls .jm{font-size:12px;font-weight:700;color:#1E78A8;padding-top:2px}' +
    '.ls .jd{font-weight:700;font-size:15px}.ls .bg{display:inline-block;font-size:11px;font-weight:600;color:#1E78A8;background:#E7F3F9;border-radius:999px;padding:1px 8px;margin:4px 4px 0 0}' +
    '.ls .lsUl{margin:6px 0 0;padding-left:18px;font-size:14px;line-height:1.5}.ls .lsUl li{margin:3px 0}.ls .lsP{margin:6px 0 0;font-size:14px;line-height:1.5}' +
    '.ls select,.ls input,.ls textarea{width:100%;box-sizing:border-box;padding:9px 10px;border:1px solid #E2E7EE;border-radius:10px;font:inherit;margin-top:4px;background:#fff}' +
    '.ls textarea{min-height:120px}.ls label{font-size:12px;color:#5A6677;display:block;margin-top:8px}' +
    '.ls .tb{border:0;border-radius:10px;background:#1E78A8;color:#fff;padding:10px 14px;font:inherit;font-weight:700;cursor:pointer;margin-top:10px}' +
    '.ls .ms{font-size:13px;margin-top:8px}.ls .ms.bad{color:#B3261E}.ls .rk{display:flex;gap:18px;flex-wrap:wrap;margin-top:10px;font-size:13px;color:#5A6677}.ls .rk b{display:block;font-size:20px;color:#0F1B2A}';

  async function muat() {
    if (S.memuat) return; S.memuat = true; S.pesan = '';
    try {
      var r = await S.sb.from('sistem_laporan').select('id,tanggal,jam,judul,isi,bagian,oleh').order('tanggal', { ascending: false }).order('jam', { ascending: false }).order('id', { ascending: false }).limit(1000);
      if (r.error) throw r.error;
      S.list = r.data || [];
    } catch (e) { S.list = null; S.pesan = 'Laporan gagal dimuat: ' + (e.message || e) + '. Tekan Muat ulang.'; }
    S.memuat = false; gambar();
  }

  function gambar() {
    var el = S.el; if (!el) return;
    var h = '<div class="ls"><h2>Laporan sistem</h2><div class="sb">Catatan pekerjaan sistem Moscow Supplies per hari dari penanggung jawab sistem: perbaikan, fitur baru, dan perubahan aturan di aplikasi.</div>';
    if (S.pesan) h += '<div class="kt ms bad">' + esc(S.pesan) + '</div>';
    if (!S.list) { el.innerHTML = h + '<div class="kt sb">' + (S.memuat ? 'Memuat laporan…' : 'Belum termuat.') + '</div></div>'; return; }
    var bulanAda = []; S.list.forEach(function (x) { var b = String(x.tanggal).slice(0, 7); if (bulanAda.indexOf(b) < 0) bulanAda.push(b); });
    if (!S.bulan || bulanAda.indexOf(S.bulan) < 0) S.bulan = bulanAda[0] || hariIni().slice(0, 7);
    var L = S.list.filter(function (x) { return String(x.tanggal).slice(0, 7) === S.bulan; });
    var hari = []; L.forEach(function (x) { if (hari.indexOf(x.tanggal) < 0) hari.push(x.tanggal); });
    h += '<div class="kt"><div style="display:flex;gap:10px;align-items:end;flex-wrap:wrap"><div style="flex:1;min-width:180px"><label style="margin-top:0">Bulan</label><select id="lsBln">' +
      (bulanAda.length ? bulanAda : [S.bulan]).map(function (b) { return '<option value="' + b + '"' + (b === S.bulan ? ' selected' : '') + '>' + namaBulan(b) + '</option>'; }).join('') + '</select></div>' +
      '<a href="#" id="lsMuat" style="font-size:13px;color:#1E78A8;padding-bottom:10px">Muat ulang</a></div>' +
      '<div class="rk"><div><b>' + L.length + '</b>pekerjaan</div><div><b>' + hari.length + '</b>hari kerja sistem</div></div></div>';
    if (S.peran === 'manajemen') {
      h += '<details class="kt"><summary style="cursor:pointer;font-weight:700;color:#1E78A8">+ Tambah catatan pekerjaan</summary>' +
        '<label>Tanggal</label><input type="date" id="lsTgl" value="' + hariIni() + '">' +
        '<label>Judul</label><input id="lsJudul" maxlength="140" placeholder="Contoh: Laporan bonus supplier di Gudang Utama">' +
        '<label>Isi (satu poin per baris, awali dengan -)</label><textarea id="lsIsi" placeholder="- Apa yang diubah&#10;- Manfaatnya untuk bisnis"></textarea>' +
        '<label>Bagian / aplikasi (pisahkan dengan koma)</label><input id="lsBagian" maxlength="120" placeholder="Gudang Utama, Accounting">' +
        '<button type="button" class="tb" id="lsSimpan">Simpan catatan</button><div class="ms" id="lsPesan"></div></details>';
    }
    if (!L.length) h += '<div class="kt sb">Belum ada catatan di ' + namaBulan(S.bulan) + '.</div>';
    hari.forEach(function (t) {
      var di = L.filter(function (x) { return x.tanggal === t; }).sort(function (a, b) { return String(a.jam || '').localeCompare(String(b.jam || '')) || a.id - b.id; });
      h += '<div class="hr">' + esc(tglPanjang(t)) + '<span>' + di.length + ' pekerjaan</span></div><div class="kt" style="margin-top:6px">' + di.map(function (x) {
        return '<div class="it"><div class="jm">' + esc(x.jam || '') + '</div><div><div class="jd">' + esc(x.judul) + '</div>' +
          (x.bagian && x.bagian.length ? '<div>' + x.bagian.map(function (b) { return '<span class="bg">' + esc(b) + '</span>'; }).join('') + '</div>' : '') +
          isiTeks(x.isi) + '</div></div>';
      }).join('') + '</div>';
    });
    el.innerHTML = h + '</div>';
    pasang();
  }

  function pasang() {
    var el = S.el;
    var bl = el.querySelector('#lsBln'); if (bl) bl.onchange = function () { S.bulan = bl.value; gambar(); };
    var mu = el.querySelector('#lsMuat'); if (mu) mu.onclick = function (e) { e.preventDefault(); S.list = null; gambar(); muat(); };
    var sm = el.querySelector('#lsSimpan'); if (sm) sm.onclick = simpan;
  }

  async function simpan() {
    var el = S.el, ps = el.querySelector('#lsPesan');
    var t = el.querySelector('#lsTgl').value, j = el.querySelector('#lsJudul').value.trim(), i = el.querySelector('#lsIsi').value.trim();
    var bg = el.querySelector('#lsBagian').value.split(',').map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 6);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t) || j.length < 3 || i.length < 3) { ps.className = 'ms bad'; ps.textContent = 'Isi tanggal, judul, dan isi catatan.'; return; }
    ps.className = 'ms'; ps.textContent = 'Menyimpan…';
    var jam = t === hariIni() ? new Date(Date.now() + 8 * 3600e3).toISOString().slice(11, 16) : null;
    var r = await S.sb.from('sistem_laporan').insert({ tanggal: t, jam: jam, judul: j, isi: i, bagian: bg });
    if (r.error) { ps.className = 'ms bad'; ps.textContent = 'Gagal: ' + r.error.message; return; }
    S.bulan = t.slice(0, 7); S.list = null; gambar(); muat();
  }

  window.LaporanSistem = {
    gambar: function (el, sb, peran) {
      if (!document.getElementById('lsCss')) { var s = document.createElement('style'); s.id = 'lsCss'; s.textContent = CSS; document.head.appendChild(s); }
      S.el = el; S.sb = sb; S.peran = peran || '';
      gambar(); window.scrollTo(0, 0);
      if (!S.list) muat();
    }
  };
})();
