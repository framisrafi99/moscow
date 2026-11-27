/*
 * Moscow Supplies - halaman Mike (Kendali Bisnis), 28 Nov 2026.
 *   KendaliImpor.keputusan(el, sb, opsi) : menu "Perlu keputusan" (halaman pertama): hanya hal yang menunggu Mike, dengan tombol ke menunya.
 *   KendaliImpor.impor(el, sb, opsi)     : menu "Impor" satu alur: 1 Perlu ACC -> 2 Belum dibayar -> 3 Sudah dibayar, dalam perjalanan -> 4 Diterima.
 *     Bagian 2 memakai impor-tg.js (bukti Telegram -> sudah dibayar, biaya impor -> PO).
 *     Bayar manual / DP / pelunasan tetap ada di menu "Bayar manual, DP & pelunasan" (tampilan lama).
 * Data: RPC kendali_ringkas + impor_bukti_calon; ACC: pengadaan_aksi (sama dengan tombol ACC lama).
 */
(function () {
  'use strict';
  var CSS = '.ki{max-width:860px;margin:0 auto;padding:12px 16px 40px;color:#1c2430;font-size:14.5px;line-height:1.45}' +
    '.ki h2{font-size:18px;margin:4px 0 2px}.ki .kc{font-size:12.5px;color:#5b6777}' +
    '.ki .kt{background:#fff;border:1px solid #e3e7ee;border-radius:14px;padding:12px 14px;margin-top:12px}' +
    '.ki .kt h3{margin:0 0 4px;font-size:15.5px;display:flex;gap:8px;align-items:center}.ki .no{display:inline-flex;width:24px;height:24px;border-radius:50%;background:#1a78a0;color:#fff;font-size:13px;align-items:center;justify-content:center;flex:none}' +
    '.ki .row{display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-top:1px solid #eef1f5}.ki .row:first-of-type{border-top:0}.ki .row .n{flex:1;min-width:0}' +
    '.ki input[type=checkbox]{width:20px;height:20px;margin-top:2px;flex:none}.ki input.q{width:84px;padding:7px 8px;border:1px solid #cfd8e3;border-radius:8px;font:inherit;text-align:right}' +
    '.ki input.tx{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #cfd8e3;border-radius:8px;font:inherit;margin-top:8px}' +
    '.ki .g2{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}.ki .bt{padding:11px;border:0;border-radius:10px;background:#1a78a0;color:#fff;font:inherit;font-weight:600;cursor:pointer}' +
    '.ki .bt.no{background:#fff;color:#b3261e;border:1px solid #b3261e}.ki .bt[disabled]{opacity:.55;cursor:default}' +
    '.ki .lk{border:0;background:none;color:#1a78a0;text-decoration:underline;padding:0;font:inherit;cursor:pointer}' +
    '.ki .chip{display:inline-block;border-radius:999px;padding:1px 9px;font-size:12px;font-weight:600;background:#eef1f5;color:#334155;white-space:nowrap}' +
    '.ki .chip.warn{background:#fde8d4;color:#8a3d00}.ki .chip.bad{background:#fdecea;color:#9b1c1c}.ki .chip.ok{background:#d9f2e1;color:#14532d}' +
    '.ki .ms{margin-top:10px;padding:9px 11px;border-radius:9px;font-size:13.5px}.ki .ms.ok{background:#e3f6e9;color:#14532d}.ki .ms.bad{background:#fdecea;color:#9b1c1c}' +
    '.ki .kp{display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:#fff;border:1px solid #e3e7ee;border-radius:14px;padding:12px 14px;margin-top:10px;font:inherit;color:inherit;cursor:pointer}' +
    '.ki .kp b.a{font-size:22px;min-width:38px;text-align:center}.ki .kp .t{flex:1}.ki .kp.nol{opacity:.6}.ki .kp.pen b.a{color:#b45309}.ki .kp.mer b.a{color:#b3261e}' +
    '.ki .robot{margin-top:4px;font-size:12px;color:#5b6777;background:#f6f8fb;border-radius:8px;padding:6px 8px}' +
    '.ki #ipKotak{max-width:none;margin:0;padding:0}' +
    '@media (max-width:560px){.ki .g2{grid-template-columns:1fr}}';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rp(v) { return 'Rp ' + Math.round(Number(v) || 0).toLocaleString('id-ID'); }
  function f(v) { return Number(v || 0).toLocaleString('id-ID'); }
  function tgl(t) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(t || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] : String(t || ''); }
  function css() { if (!document.getElementById('kiCss')) { var s = document.createElement('style'); s.id = 'kiCss'; s.textContent = CSS; document.head.appendChild(s); } }
  async function rpc(sb, n, a) { var r = await sb.rpc(n, a || {}); if (r.error) throw new Error(r.error.message); return r.data; }

  // ---------- Perlu keputusan ----------
  async function keputusan(el, sb, opsi) {
    css();
    el.innerHTML = '<div class="ki"><h2>Perlu keputusan</h2><div class="kc">Memuat…</div></div>';
    var R, C;
    try { var h = await Promise.all([rpc(sb, 'kendali_ringkas'), rpc(sb, 'impor_bukti_calon')]); R = h[0]; C = h[1]; }
    catch (e) { el.innerHTML = '<div class="ki"><h2>Perlu keputusan</h2><div class="ms bad">Gagal memuat. Periksa internet lalu buka lagi menu ini.</div></div>'; return; }
    if (!R || !R.ok || !C || !C.ok) { el.innerHTML = '<div class="ki"><div class="ms bad">' + esc((R && R.pesan) || (C && C.pesan) || 'Gagal memuat.') + '</div></div>'; return; }
    var bukti = (C.bukti || []), bb = bukti.filter(function (b) { return b.jenis !== 'biaya'; }).length, by = bukti.length - bb;
    var item = [
      { n: R.acc.length, t: 'Pengajuan impor menunggu ACC', k: 'impor', c: 'pen', s: R.acc.length ? 'Tertua: ' + tgl(R.acc[0].t) : '' },
      { n: (C.tunggu || []).length, t: 'Pengajuan impor sudah di-ACC, belum dibayar', k: 'impor', c: 'pen', s: bb ? bb + ' bukti bayar Telegram siap disambungkan' : 'Setelah bayar, kirim bukti + invoice ke Telegram Admin Accounting' },
      { n: by, t: 'Biaya impor dari Telegram belum masuk ke PO', k: 'impor', c: 'pen', s: 'Ongkir cargo, bill kedua, bea masuk: belum ikut dihitung ke HPP' },
      { n: (C.telat || []).length, t: 'PO impor sudah dibayar > 30 hari, belum diterima', k: 'impor', c: 'mer', s: (C.telat || []).map(function (o) { return o.no + ' (' + o.hari + ' hari)'; }).join(', ') },
      { n: R.hppNaik || 0, t: 'HPP naik menunggu ACC', k: 'naik', c: 'pen', s: 'Dari barang yang baru diterima gudang' },
      { n: R.barangBaru || 0, t: 'Barang baru belum punya harga jual', k: 'hpp', c: 'pen', s: 'Belum bisa dijual sebelum harga jualnya diisi' }
    ];
    var total = item.reduce(function (a, x) { return a + (x.n ? 1 : 0); }, 0);
    el.innerHTML = '<div class="ki"><h2>Perlu keputusan</h2><div class="kc">' + (total ? total + ' hal menunggu keputusan Mike. Tekan salah satu untuk membukanya.' : 'Tidak ada yang menunggu keputusan saat ini.') + '</div>' +
      item.map(function (x, i) {
        return '<button type="button" class="kp ' + (x.n ? x.c : 'nol') + '" data-ke="' + x.k + '"><b class="a">' + x.n + '</b><span class="t"><b>' + esc(x.t) + '</b>' +
          (x.n && x.s ? '<div class="kc">' + esc(x.s) + '</div>' : '') + '</span><span aria-hidden="true">›</span></button>';
      }).join('') +
      '<div class="kc" style="margin-top:14px">Laporan bulanan ada di menu Laporan. Barang impor dari ACC sampai diterima ada di menu Impor.</div></div>';
    el.onclick = function (e) { var b = e.target.closest('[data-ke]'); if (b && opsi && opsi.buka) opsi.buka(b.getAttribute('data-ke')); };
  }

  // ---------- Impor: satu alur ----------
  var S = { pil: {}, qty: {}, cat: '', msg: '', sibuk: false, tok: '' };
  async function impor(el, sb, opsi) {
    css();
    S = { pil: {}, qty: {}, cat: '', msg: '', sibuk: false, tok: '' };
    el.innerHTML = '<div class="ki"><h2>Impor</h2><div class="kc">Alur barang impor: ACC → dibayar → dalam perjalanan → diterima gudang.</div>' +
      '<div class="kt" id="kiAcc"><div class="kc">Memuat…</div></div>' +
      '<div class="kt"><h3><span class="no">2</span>Belum dibayar</h3><div class="kc">Bayar supplier, kirim bukti transfer + invoice ke Telegram Admin Accounting, lalu sambungkan di sini.</div><div id="kiBayar" style="margin-top:8px"></div></div>' +
      '<div class="kt" id="kiJalan"><div class="kc">Memuat…</div></div>' +
      '<div class="kt" id="kiSelesai"></div>' +
      '<div class="kc" style="margin-top:12px">Bayar tanpa bukti Telegram, DP, pelunasan, atau biaya PO manual: <button type="button" class="lk" data-ke="imporlama">menu Bayar manual, DP &amp; pelunasan</button>.</div></div>';
    el.onclick = function (e) {
      var k = e.target.closest('[data-ke]'); if (k && opsi && opsi.buka) return opsi.buka(k.getAttribute('data-ke'));
      var c = e.target.closest('input[data-pil]'); if (c) { S.pil[c.getAttribute('data-pil')] = c.checked; return; }
      var a = e.target.closest('[data-acc]'); if (a) return putus(el, sb, a.getAttribute('data-acc'), opsi);
    };
    el.oninput = function (e) {
      var q = e.target.closest('input[data-q]'); if (q) S.qty[q.getAttribute('data-q')] = q.value;
      if (e.target.id === 'kiCat') S.cat = e.target.value;
    };
    if (window.ImporTg) window.ImporTg.pasang({ sb: sb, app: 'mike', wadah: el.querySelector('#kiBayar'), selesai: function () { muatAlur(el, sb); } });
    await muatAlur(el, sb);
  }
  async function muatAlur(el, sb) {
    var R;
    try { R = await rpc(sb, 'kendali_ringkas'); } catch (e) { R = null; }
    var A = el.querySelector('#kiAcc'), J = el.querySelector('#kiJalan'), Z = el.querySelector('#kiSelesai');
    if (!A) return;
    if (!R || !R.ok) { A.innerHTML = '<div class="ms bad">Gagal memuat. Coba buka lagi menu ini.</div>'; return; }
    S.R = R; gambarAcc(el);
    var jl = R.dalamJalan || [];
    J.innerHTML = '<h3><span class="no">3</span>Sudah dibayar, dalam perjalanan (' + jl.length + ')</h3><div class="kc">PO impor yang belum diterima penuh oleh Gudang Utama. Resi dan penerimaan diisi Daffa di aplikasi Gudang Utama.</div>' +
      (jl.length ? jl.map(function (o) {
        var tel = o.hari > 30 && o.st !== 'Disetujui';
        return '<div class="row"><div class="n"><b>' + esc(o.no) + ' · ' + esc(o.sup) + '</b><div class="kc">' + tgl(o.t) + ' · ' + rp(o.tot) + (o.resi ? ' · resi ' + esc(o.resi) : ' · belum ada resi') + '</div></div>' +
          '<div style="text-align:right"><span class="chip ' + (tel ? 'bad' : o.st === 'Disetujui' ? 'warn' : '') + '">' + esc(o.st === 'Disetujui' ? 'DP, belum lunas' : o.st) + '</span>' +
          (tel ? '<div class="kc" style="color:#9b1c1c">' + o.hari + ' hari</div>' : '') + '</div></div>';
      }).join('') : '<div class="kc" style="margin-top:6px">Tidak ada.</div>');
    var sl = R.selesai || [];
    Z.innerHTML = '<h3><span class="no">4</span>Diterima gudang (terakhir)</h3>' +
      (sl.length ? sl.map(function (o) { return '<div class="row"><div class="n"><b>' + esc(o.no) + ' · ' + esc(o.sup) + '</b><div class="kc">' + tgl(o.t) + ' · ' + rp(o.tot) + '</div></div><span class="chip ok">Selesai</span></div>'; }).join('')
        : '<div class="kc">Belum ada.</div>');
  }
  function gambarAcc(el) {
    var A = el.querySelector('#kiAcc'), acc = (S.R && S.R.acc) || [];
    var h = '<h3><span class="no">1</span>Perlu ACC (' + acc.length + ')</h3>';
    if (!acc.length) h += '<div class="kc">Tidak ada pengajuan impor yang menunggu ACC.</div>';
    else {
      h += '<div class="kc">Centang pengajuan, ubah qty kalau perlu, lalu Setujui atau Tolak.</div>' + acc.map(function (a) {
        var q = S.qty[a.no] != null ? S.qty[a.no] : f(a.q);
        return '<div class="row"><input type="checkbox" data-pil="' + esc(a.no) + '"' + (S.pil[a.no] ? ' checked' : '') + ' aria-label="' + esc(a.n) + '">' +
          '<div class="n"><b>' + esc(a.n) + (a.w ? ' · ' + esc(a.w) : '') + '</b><div class="kc">' + esc(a.no) + ' · ' + tgl(a.t) + ' · ' + esc(a.pg || a.bg) +
          (a.h ? ' · perkiraan ' + rp(a.h * a.q) : '') + (a.al ? ' · alasan: ' + esc(a.al) : '') + '</div>' +
          (a.ar ? '<div class="robot">' + (a.sr ? '<b>' + esc(a.sr) + '</b> · ' : '') + esc(a.ar) + '</div>' : '') + '</div>' +
          '<div style="text-align:right"><input class="q" inputmode="numeric" data-q="' + esc(a.no) + '" value="' + esc(q) + '"><div class="kc">' + esc(a.s) + '</div></div></div>';
      }).join('') +
        '<input class="tx" id="kiCat" maxlength="300" placeholder="Catatan (wajib kalau menolak)" value="' + esc(S.cat) + '">' +
        '<div class="g2"><button type="button" class="bt" data-acc="setuju"' + (S.sibuk ? ' disabled' : '') + '>Setujui terpilih</button><button type="button" class="bt no" data-acc="tolak"' + (S.sibuk ? ' disabled' : '') + '>Tolak terpilih</button></div>';
    }
    A.innerHTML = h + S.msg;
  }
  async function putus(el, sb, aksi, opsi) {
    if (S.sibuk) return;
    var nos = Object.keys(S.pil).filter(function (k) { return S.pil[k]; }), qty = {};
    if (!nos.length) { S.msg = '<div class="ms bad">Centang dulu pengajuan yang mau diputuskan.</div>'; return gambarAcc(el); }
    if (aksi === 'tolak' && String(S.cat).trim().length < 3) { S.msg = '<div class="ms bad">Tulis alasan ditolak di catatan.</div>'; return gambarAcc(el); }
    nos.forEach(function (no) { if (S.qty[no] != null) qty[no] = String(S.qty[no]).replace(/[^0-9]/g, ''); });
    S.sibuk = true; S.msg = ''; gambarAcc(el);
    try {
      var d = await rpc(sb, 'pengadaan_aksi', { p_aksi: aksi, p_nos: nos, p_qty: Object.keys(qty).length ? qty : null, p_catatan: S.cat || '', p_ref: '', p_eta: '', p_nama: '' });
      S.msg = d && d.ok ? '<div class="ms ok">✓ ' + esc(d.pesan || 'Tersimpan.') + '</div>' : '<div class="ms bad">' + esc((d && d.pesan) || 'Gagal menyimpan.') + '</div>';
      if (d && d.ok) { S.pil = {}; S.qty = {}; S.cat = ''; }
    } catch (e) { S.msg = '<div class="ms bad">Gagal terhubung. Coba lagi.</div>'; }
    S.sibuk = false;
    await muatAlur(el, sb);
    if (window.ImporTg && aksi === 'setuju') window.ImporTg.pasang({ sb: sb, app: 'mike', wadah: el.querySelector('#kiBayar'), selesai: function () { muatAlur(el, sb); } });
  }

  window.KendaliImpor = { keputusan: keputusan, impor: impor };
})();
