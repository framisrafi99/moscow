/* Moscow Supplies - Pembaruan aplikasi (12 Nov 2026).
 * Catatan "apa yang baru" per aplikasi staf (tabel app_pembaruan). Tampil sebagai menu "Pembaruan aplikasi" di menu samping,
 * tombol lonceng dengan angka yang belum dibaca, dan pengingat sekali saat ada pembaruan baru.
 * Manajemen Moscow Supplies bisa menulis pembaruan baru dari jendela yang sama.
 * Dipakai: form.html (form-app.js) dan consignment.html (consignment-app.js) lewat window.Pembaruan.pasang(app, peran).
 */
(function () {
  'use strict';
  var NAMA = { gudang: 'Gudang Utama', produksi: 'Staf Produksi', bahanbaku: 'Produksi Bahan Baku', purchasing: 'Purchasing', akunting: 'Accounting',
    payroll: 'Payroll', mike: 'Kendali Bisnis', toko: 'Form Toko' };
  var S = { app: '', peran: '', list: [], baca: 0 };
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function kunci() { return 'pembaruanDibaca:' + S.app; }
  function ambilBaca() { try { return Number(localStorage.getItem(kunci())) || 0; } catch (e) { return 0; } }
  function simpanBaca(id) { try { localStorage.setItem(kunci(), String(id)); } catch (e) { } S.baca = id; }
  function belum() { return S.list.filter(function (x) { return x.id > S.baca; }).length; }
  function tgl(w) { var d = new Date(w); return isNaN(d) ? '' : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Makassar' }); }
  function isiTeks(t) {
    var baris = String(t || '').split(/\n+/).map(function (b) { return b.trim(); }).filter(Boolean);
    var poin = baris.filter(function (b) { return /^[-•*]/.test(b); }).length === baris.length;
    if (poin) return '<ul style="margin:6px 0 0;padding-left:18px">' + baris.map(function (b) { return '<li style="margin:3px 0">' + esc(b.replace(/^[-•*]\s*/, '')) + '</li>'; }).join('') + '</ul>';
    return baris.map(function (b) { return '<p style="margin:6px 0 0">' + esc(b) + '</p>'; }).join('');
  }

  function gaya() {
    if (document.getElementById('pbGaya')) return;
    var st = document.createElement('style'); st.id = 'pbGaya';
    st.textContent = '#pbLonceng{position:fixed;right:14px;bottom:86px;z-index:60;border:0;border-radius:999px;background:#1E78A8;color:#fff;font-family:inherit;font-size:13px;font-weight:700;line-height:1;' +
      'padding:10px 14px;box-shadow:0 4px 14px rgba(15,27,42,.25);cursor:pointer;display:none}#pbLonceng.ada{display:block}' +
      '#pbLonceng i{font-style:normal;display:inline-block;min-width:18px;padding:2px 5px;margin-left:6px;border-radius:999px;background:#fff;color:#B42318;font-size:11px}' +
      '#pbLatar{position:fixed;inset:0;z-index:80;background:rgba(15,27,42,.45);display:flex;align-items:flex-end;justify-content:center}' +
      '#pbJendela{background:#fff;width:100%;max-width:640px;max-height:86vh;overflow:auto;border-radius:18px 18px 0 0;padding:18px 16px 26px;font-family:inherit;color:#0F1B2A}' +
      '@media(min-width:700px){#pbLatar{align-items:center}#pbJendela{border-radius:18px}}' +
      '#pbJendela h2{margin:0;font-size:18px}#pbJendela .pbIt{border:1px solid #E2E7EE;border-radius:14px;padding:12px 14px;margin-top:10px}' +
      '#pbJendela .pbIt.baru{border-color:#1E78A8;background:#F2F8FC}#pbJendela .pbTg{font-size:12px;color:#5A6677}' +
      '#pbJendela .pbBaru{display:inline-block;font-size:11px;font-weight:700;color:#fff;background:#1E78A8;border-radius:999px;padding:1px 7px;margin-left:6px}' +
      '#pbJendela input,#pbJendela textarea{width:100%;padding:9px 10px;border:1px solid #E2E7EE;border-radius:10px;font:inherit;margin-top:4px}' +
      '#pbJendela textarea{min-height:110px}#pbJendela button{font:inherit}' +
      '.pbTb{border:0;border-radius:10px;background:#1E78A8;color:#fff;padding:10px 14px;font-weight:700;cursor:pointer}' +
      '.pbTb.abu{background:#E2E7EE;color:#0F1B2A}';
    document.head.appendChild(st);
  }

  async function muat() {
    var sb = window.Moscow && window.Moscow.sb; if (!sb) return;
    var r = await sb.from('app_pembaruan').select('id,waktu,aplikasi,judul,isi').overlaps('aplikasi', [S.app, 'semua']).order('id', { ascending: false }).limit(60);
    if (r.error) return;
    S.list = r.data || [];
    perbarui();
  }
  function perbarui() {
    var n = belum();
    var lc = document.getElementById('pbLonceng');
    if (lc) { lc.className = n ? 'ada' : ''; lc.innerHTML = '&#128276; Pembaruan' + (n ? '<i>' + n + '</i>' : ''); }
    var mn = document.getElementById('pbMenu');
    if (mn) mn.querySelector('.nm').innerHTML = 'Pembaruan aplikasi' + (n ? ' <b style="color:#B42318">(' + n + ' baru)</b>' : '');
  }

  function buka() {
    gaya();
    var lama = document.getElementById('pbLatar'); if (lama) lama.remove();
    var batas = S.baca, n = belum();
    var h = '<div id="pbJendela" role="dialog" aria-label="Pembaruan aplikasi"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px">' +
      '<h2>&#128276; Pembaruan aplikasi ' + esc(NAMA[S.app] || '') + '</h2><button type="button" class="pbTb abu" id="pbTutup">Tutup</button></div>' +
      '<div class="pbTg" style="margin-top:4px">Fitur baru dan perubahan di aplikasi ini' + (n ? ' &middot; <b>' + n + ' belum dibaca</b>' : '') + '.</div>';
    if (S.peran === 'manajemen') {
      h += '<details style="margin-top:12px"><summary style="cursor:pointer;font-weight:700;color:#1E78A8">+ Tulis pembaruan baru (manajemen)</summary>' +
        '<div style="margin-top:8px"><label class="pbTg">Judul</label><input id="pbJudul" maxlength="120" placeholder="Contoh: Kolom bonus di Terima barang">' +
        '<label class="pbTg" style="display:block;margin-top:8px">Isi (satu poin per baris, awali dengan -)</label><textarea id="pbIsi" placeholder="- ...&#10;- ..."></textarea>' +
        '<label class="pbTg" style="display:block;margin-top:8px">Untuk aplikasi</label><div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px">' +
        Object.keys(NAMA).concat(['semua']).map(function (k) {
          return '<label style="display:flex;gap:4px;align-items:center;font-size:13px"><input type="checkbox" data-pba="' + k + '" style="width:auto;margin:0"' + (k === S.app ? ' checked' : '') + '>' + esc(NAMA[k] || 'Semua aplikasi') + '</label>';
        }).join('') + '</div><div style="margin-top:10px"><button type="button" class="pbTb" id="pbSimpan">Simpan pembaruan</button> <span class="pbTg" id="pbPesan"></span></div></div></details>';
    }
    h += S.list.length ? S.list.map(function (x) {
      var baru = x.id > batas;
      return '<div class="pbIt' + (baru ? ' baru' : '') + '"><b>' + esc(x.judul) + '</b>' + (baru ? '<span class="pbBaru">BARU</span>' : '') +
        '<div class="pbTg">' + tgl(x.waktu) + '</div>' + isiTeks(x.isi) + '</div>';
    }).join('') : '<div class="pbIt">Belum ada catatan pembaruan.</div>';
    h += '</div>';
    var lt = document.createElement('div'); lt.id = 'pbLatar'; lt.innerHTML = h; document.body.appendChild(lt);
    lt.addEventListener('click', function (e) { if (e.target === lt) tutup(); });
    document.getElementById('pbTutup').onclick = tutup;
    var sm = document.getElementById('pbSimpan'); if (sm) sm.onclick = simpan;
    if (S.list.length) simpanBaca(S.list[0].id);
    perbarui();
  }
  function tutup() { var lt = document.getElementById('pbLatar'); if (lt) lt.remove(); }
  async function simpan() {
    var sb = window.Moscow.sb, j = document.getElementById('pbJudul').value.trim(), i = document.getElementById('pbIsi').value.trim(), ps = document.getElementById('pbPesan');
    var apl = Array.prototype.map.call(document.querySelectorAll('[data-pba]:checked'), function (x) { return x.getAttribute('data-pba'); });
    if (j.length < 3 || i.length < 3 || !apl.length) { ps.textContent = 'Isi judul, isi, dan pilih aplikasinya.'; return; }
    ps.textContent = 'Menyimpan…';
    var r = await sb.from('app_pembaruan').insert({ aplikasi: apl, judul: j, isi: i, oleh: 'manajemen Moscow Supplies' });
    if (r.error) { ps.textContent = 'Gagal: ' + r.error.message; return; }
    await muat(); buka();
  }

  window.Pembaruan = {
    pasang: async function (app, peran) {
      S.app = app || ''; S.peran = peran || ''; if (!S.app) return;
      gaya(); S.baca = ambilBaca();
      if (!document.getElementById('pbLonceng')) {
        var b = document.createElement('button'); b.type = 'button'; b.id = 'pbLonceng'; b.onclick = buka; document.body.appendChild(b);
      }
      var nav = document.querySelector('#mSide nav');
      if (nav && !document.getElementById('pbMenu')) {
        var svg = window.Moscow && window.Moscow.svg ? window.Moscow.svg('laporan') : '';
        nav.insertAdjacentHTML('afterbegin', '<a class="it" href="#" id="pbMenu">' + svg + '<span class="nm">Pembaruan aplikasi</span></a>');
        document.getElementById('pbMenu').onclick = function (e) { e.preventDefault(); buka(); };
      }
      try { await muat(); } catch (e) { return; }
      // Pertama kali dipakai di perangkat ini: catatan lama tidak dianggap baru kecuali 7 hari terakhir.
      if (!S.baca && S.list.length) {
        var tua = S.list.filter(function (x) { return Date.now() - new Date(x.waktu).getTime() > 7 * 86400000; })[0];
        if (tua) simpanBaca(tua.id);
        perbarui();
      }
    },
    buka: buka
  };
})();
