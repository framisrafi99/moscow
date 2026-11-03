/* Link Purchasing (barang lokal) — tampilan sendiri di aplikasi, tidak lagi lewat Apps Script.
 * Data: pl.js (plxData, dihitung dari Supabase). Simpan: RPC Supabase (plx_bayar, pengadaan_aksi, pl_po_bayar, pengadaan_koreksi_qty).
 * Penyalinan ke Google Sheets dan Telegram tetap dijalankan Apps Script di belakang (tulis-balik & efek_antre).
 */
(function () {
  var S = { el: null, sb: null, tab: 'belanja', D: null, memuat: false, PIL: {}, IN: {}, PERLU: {}, KQ: {}, FIL: 'Semua', ACCF: 'Belum diterima', sibuk: false, pesan: null, nama: '', salin: null };
  var BAYAR_LIST = ['ShopeePay', 'Kas Tunai', 'Rekening Belanja'];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function f(n) { n = Math.round((Number(n) || 0) * 100) / 100; var p = String(Math.abs(n)).split('.'); return (n < 0 ? '-' : '') + p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (p[1] ? ',' + p[1] : ''); }
  function rp(n) { return 'Rp' + f(Math.round(Number(n) || 0)); }
  function tgl(s) { var p = String(s || '').slice(0, 10).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : String(s || ''); }
  function angka(v) { return Number(String(v == null ? '' : v).trim().replace(/\./g, '').replace(',', '.')); }
  function qOf(a) { return a.qs !== null && a.qs !== undefined ? a.qs : a.q; }
  var WARNA = { Menunggu: 'w', Disetujui: 'biru', Dipesan: 'biru', Dibayar: 'biru', Diterima: 'ok', Ditolak: 'no', Batal: 'no', 'Dikirim supplier': 'biru', Selesai: 'ok' };
  function chip(s) { return '<span class="label ' + (WARNA[s] || 'abu') + '">' + esc(s) + '</span>'; }
  function q(sel) { return S.el.querySelector(sel); }

  var CSS = '' +
    '.pu{max-width:900px;margin:0 auto;padding:16px 16px 40px}' +
    '.pu .kpl{display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px 12px;align-items:baseline}' +
    '.pu h2{margin:0;font-size:19px;font-weight:800}.pu .sb{font-size:13px;color:var(--abu)}' +
    '.pu .it{display:flex;gap:12px;padding:12px 0;border-top:1px solid var(--garis2)}.pu .it:first-child{border-top:0}' +
    '.pu .it>input[type=checkbox]{width:22px;height:22px;margin-top:2px;accent-color:var(--biru);flex:0 0 auto}' +
    '.pu .it .n{flex:1;min-width:0}.pu .it.on{background:#F3F8FC;margin:0 -12px;padding:12px;border-radius:12px}' +
    '.pu .rb{background:var(--kuningMuda);color:#6B4300;border-radius:10px;padding:8px 10px;font-size:13px;margin-top:6px}.pu .rb.bad{background:var(--merahMuda);color:var(--merah)}' +
    '.pu .row{display:flex;gap:12px;justify-content:space-between;padding:10px 0;border-top:1px solid var(--garis2)}.pu .row:first-child{border-top:0}' +
    '.pu .row .n{flex:1;min-width:0}.pu .row .r{text-align:right;white-space:nowrap}' +
    '.pu .tot{font-size:18px;font-weight:800;margin:10px 0}.pu .naik{color:var(--merah);font-weight:700}' +
    '.pu .kq{background:#F3F8FC;border-radius:12px;padding:10px;margin-top:8px}';

  function salinKeSheet() { if (S.salin) try { S.salin(); } catch (e) { } }

  async function muat(lalu) {
    if (S.memuat) return; S.memuat = true;
    try {
      var d = await window.Purchasing.plxData(S.sb);
      if (!d || !d.ok) throw new Error('Data purchasing belum bisa dibaca.');
      S.D = d;
    } catch (e) { S.pesan = ['bad', 'Gagal memuat: ' + (e.message || e) + ' Tekan Muat ulang.']; }
    S.memuat = false;
    if (lalu) lalu();
    gambar();
  }

  function kartuBelanja(a) {
    var v = S.IN[a.no] || {}, on = !!S.PIL[a.no], L = S.PERLU[a.no] || a.dobel || [], dob = L.length > 0;
    return '<div class="it' + (on ? ' on' : '') + '"><input type="checkbox" data-pc="' + esc(a.no) + '"' + (on ? ' checked' : '') + ' aria-label="Pilih ' + esc(a.n) + '">' +
      '<div class="n"><div class="kpl"><b>' + esc(a.n) + '</b>' + chip(a.st) + '</div>' +
      '<div class="sb">' + esc(a.no) + ' · ' + esc(a.wk) + ' · ' + esc(a.bg) + ' · ' + esc(a.pg) + ' · ' + esc(a.kel) + '</div>' +
      '<div>Diajukan <b>' + f(qOf(a)) + ' ' + esc(a.s) + '</b>' + (a.h ? ' · perkiraan ' + rp(a.h) + '/' + esc(a.s) : '') + '</div>' +
      (a.al ? '<div class="sb">Alasan staf: ' + esc(a.al) + '</div>' : '') +
      (dob ? '<div class="rb' + (S.PERLU[a.no] ? ' bad' : '') + '"><b>Barang ini sudah pernah dibelanjakan</b> (belum diterima / ' + (S.D.hariDobel || 14) + ' hari terakhir):' +
        L.map(function (d) { return '<div>• ' + esc(d.no) + ' · ' + esc(d.st) + ' ' + esc(tgl(d.t)) + ' · ' + f(d.q) + ' ' + esc(d.s || '') + ' · ' + esc(d.bg) + (d.pg ? ' (' + esc(d.pg) + ')' : '') + '</div>'; }).join('') +
        '<div style="margin-top:4px">Kalau tetap mau belanja lagi, isi alasannya.</div></div>' : '') +
      (on ? '<div class="mini"><label>Qty dibeli (' + esc(a.s) + ')<input class="isian angka" inputmode="decimal" data-iq="' + esc(a.no) + '" value="' + esc(v.q !== undefined ? v.q : String(qOf(a)).replace('.', ',')) + '"></label>' +
        '<label>Harga satuan (Rp)<input class="isian angka" inputmode="numeric" data-ih="' + esc(a.no) + '" value="' + esc(v.h !== undefined ? v.h : (a.h ? String(a.h) : '')) + '"></label>' +
        (dob ? '<label style="grid-column:1/-1">Alasan belanja lagi (wajib)<input class="isian" maxlength="200" data-ia="' + esc(a.no) + '" value="' + esc(v.a || '') + '"></label>' : '') + '</div>' : '') +
      '</div></div>';
  }
  function total() {
    var t = 0;
    (S.D ? S.D.belanja : []).forEach(function (a) { if (!S.PIL[a.no]) return; var v = S.IN[a.no] || {}; var qq = angka(v.q !== undefined ? v.q : qOf(a)), h = angka(v.h !== undefined ? v.h : a.h); if (qq > 0 && h > 0) t += Math.round(qq * h); });
    return t;
  }

  function isiBelanja(D) {
    var L = D.belanja, f0 = S.IN.__f || {};
    var h = '<div class="cd"><div class="kpl"><h2>Belanja pengajuan barang lokal</h2><span class="sb">' + L.length + ' pengajuan</span></div>' +
      '<p class="sb" style="margin:0">Pengajuan dari staf gudang utama, bahan baku, dan produksi. Belanjakan, centang barangnya, isi qty &amp; harga sebenarnya, lalu tekan Sudah dibelanjakan &amp; dibayar. Uang keluar tercatat otomatis.</p></div>';
    if (!L.length) return h + '<div class="cd"><div class="aman">Tidak ada pengajuan lokal yang menunggu dibelanjakan.</div></div>';
    var bl = D.bayarList || BAYAR_LIST;
    h += '<div class="cd">' + L.map(kartuBelanja).join('') + '</div>';
    h += '<div class="cd"><h3>Pembayaran barang terpilih</h3><div class="mini"><label>Toko / supplier<input class="isian" id="puToko" maxlength="80" value="' + esc(f0.toko || '') + '"></label>' +
      '<label>Cara bayar<select class="isian" id="puBy">' + bl.map(function (b) { return '<option' + (b === f0.by ? ' selected' : '') + '>' + esc(b) + '</option>'; }).join('') + '</select></label>' +
      '<label>Tanggal bayar<input class="isian" id="puTg" type="date" max="' + esc(D.hariIni) + '" value="' + esc(f0.tg || D.hariIni) + '"></label></div>' +
      '<div class="tot" id="puTot">Total ' + rp(total()) + '</div>' +
      '<div class="aksi-baris"><button type="button" class="tbl pri" data-pa="bayar">Sudah dibelanjakan &amp; dibayar</button></div>' +
      '<details style="margin-top:10px"><summary class="sb" style="cursor:pointer">Tolak barang terpilih</summary><div class="mini"><label style="grid-column:1/-1">Alasan penolakan (wajib)<input class="isian" id="puCat" maxlength="300"></label></div>' +
      '<div class="aksi-baris"><button type="button" class="tbl mer" data-pa="tolak">Tolak terpilih</button></div></details></div>';
    return h;
  }

  function isiAcc(D) {
    var AF = ['Belum diterima', 'Diterima', 'Semua'], ACC = ['Disetujui', 'Dipesan', 'Dibayar', 'Diterima'];
    var R = D.report.filter(function (a) { return ACC.indexOf(a.st) !== -1 && (S.ACCF === 'Semua' || (S.ACCF === 'Diterima' ? a.st === 'Diterima' : a.st !== 'Diterima')); });
    var h = '<div class="cd"><div class="kpl"><h2>Sudah di-ACC</h2><span class="sb">' + R.length + ' barang</span></div>' +
      '<p class="sb" style="margin:0">Barang lokal yang sudah di-ACC atau sudah dibelanjakan (60 hari terakhir). Kalau qty yang dibeli ternyata berbeda, tekan Koreksi qty dibeli dan tulis alasannya. Uang yang dibayar tidak berubah; koreksi tercatat di catatan pengajuan dan dikirim ke Telegram.</p>' +
      '<div class="pilih2" role="group" aria-label="Saring" style="margin:4px 0 0">' + AF.map(function (x) { return '<button type="button" class="tbl" data-af="' + x + '" aria-pressed="' + (x === S.ACCF) + '">' + x + '</button>'; }).join('') + '</div></div>';
    if (!R.length) return h + '<div class="cd"><div class="ksg">Tidak ada data.</div></div>';
    return h + '<div class="cd">' + R.map(function (a) {
      var bisa = /^Dibayar Viory/.test(a.ref || ''), buka = S.KQ[a.no];
      var kor = String(a.cp || '').split(' | ').filter(function (t) { return /^Koreksi qty/.test(t); });
      return '<div class="row"><div class="n"><b>' + esc(a.n) + '</b><div class="sb">' + esc(a.no) + ' · ' + esc(a.wk) + ' · ' + esc(a.bg) + ' · ' + esc(a.pg) + '</div>' +
        (a.ref ? '<div class="sb">' + esc(a.ref) + (a.wt ? ' · diterima ' + esc(a.wt) : '') + '</div>' : '') +
        (kor.length ? '<div class="sb">' + kor.map(esc).join('<br>') + '</div>' : '') +
        (bisa ? '<div class="aksi-baris" style="margin-top:6px"><button type="button" class="tbl kcl" data-pa="kq" data-no="' + esc(a.no) + '">' + (buka ? 'Tutup koreksi' : 'Koreksi qty dibeli') + '</button></div>'
          : '<div class="sb">Koreksi qty barang ini oleh manajemen Moscow Supplies.</div>') +
        (bisa && buka ? '<div class="kq"><div class="mini"><label>Qty dibeli (' + esc(a.s) + ')<input class="isian angka" inputmode="decimal" data-kq="' + esc(a.no) + '" value="' + esc(String(qOf(a)).replace('.', ',')) + '"></label>' +
          '<label style="grid-column:span 2">Alasan koreksi (wajib)<input class="isian" maxlength="200" data-ka="' + esc(a.no) + '"></label></div>' +
          '<div class="aksi-baris"><button type="button" class="tbl pri" data-pa="kqsimpan" data-no="' + esc(a.no) + '">Simpan koreksi qty</button></div></div>' : '') +
        '</div><div class="r">' + chip(a.st) + '<div style="margin-top:4px"><b>' + f(qOf(a)) + ' ' + esc(a.s) + '</b></div></div></div>';
    }).join('') + '</div>';
  }

  function isiReport(D) {
    var F = ['Semua', 'Menunggu', 'Dibayar', 'Diterima', 'Ditolak'];
    var R = D.report.filter(function (a) { return S.FIL === 'Semua' || a.st === S.FIL || (S.FIL === 'Menunggu' && a.st === 'Disetujui') || (S.FIL === 'Ditolak' && a.st === 'Batal'); });
    var h = '<div class="cd"><div class="kpl"><h2>Report PO barang lokal</h2><span class="sb">' + R.length + ' pengajuan</span></div><p class="sb" style="margin:0">Status semua pengajuan lokal 60 hari terakhir (dan yang masih berjalan).</p>' +
      '<div class="pilih2" role="group" aria-label="Saring" style="margin:4px 0 0">' + F.map(function (x) { return '<button type="button" class="tbl" data-fl="' + x + '" aria-pressed="' + (x === S.FIL) + '">' + x + '</button>'; }).join('') + '</div></div>';
    if (!R.length) return h + '<div class="cd"><div class="ksg">Tidak ada data.</div></div>';
    return h + '<div class="cd">' + R.map(function (a) {
      return '<div class="row"><div class="n"><b>' + esc(a.n) + '</b><div class="sb">' + esc(a.no) + ' · ' + esc(a.wk) + ' · ' + esc(a.bg) + ' · ' + esc(a.pg) + '</div>' +
        (a.st === 'Dibayar' || a.st === 'Diterima' || a.st === 'Dipesan' ? '<div class="sb">' + esc(a.ref || '') + (a.wt ? ' · diterima ' + esc(a.wt) : '') + '</div>' : '') +
        ((a.st === 'Ditolak' || a.st === 'Batal' || /BELANJA ULANG|Koreksi qty/.test(a.cp || '')) && a.cp ? '<div class="sb">Catatan: ' + esc(a.cp) + '</div>' : '') +
        '</div><div class="r">' + chip(a.st) + '<div style="margin-top:4px">' + f(qOf(a)) + ' ' + esc(a.s) + '</div></div></div>';
    }).join('') + '</div>';
  }

  function isiMike(D) {
    var MK = D.mike || [];
    var h = '<div class="cd"><h2>Transaksi yang dibayar Mike / Junior</h2><p class="sb" style="margin:0">Semua pembayaran oleh Mike atau Junior 90 hari terakhir (barang impor dan lainnya). Cek di sini sebelum belanja supaya tidak dobel.</p></div>';
    if (!MK.length) return h + '<div class="cd"><div class="ksg">Belum ada transaksi yang dibayar Mike / Junior.</div></div>';
    return h + '<div class="cd">' + MK.map(function (a) {
      return '<div class="row"><div class="n"><b>' + esc(a.ket) + '</b><div class="sb">' + tgl(a.t) + ' · ' + esc(a.no) + (a.kat ? ' · ' + esc(a.kat) : '') + (a.po ? ' · ' + esc(a.po) : '') + (a.resi ? ' · resi ' + esc(a.resi) : '') + '</div></div>' +
        '<div class="r"><b>' + rp(a.v) + '</b>' + (a.poSt ? '<div style="margin-top:4px">' + chip(a.poSt) + '</div>' : '') + '</div></div>';
    }).join('') + '</div>';
  }

  function isiBayarPo(D) {
    var PO = D.po || [], BL = D.bayarList || BAYAR_LIST;
    var h = '<div class="cd"><h2>Bayar PO lokal dari gudang</h2><p class="sb" style="margin:0">PO lokal yang dibuat staf gudang. Belanja sesuai PO, lalu tekan Sudah dibayar.</p></div>';
    if (!PO.length) return h + '<div class="cd"><div class="aman">Tidak ada PO lokal yang menunggu dibayar.</div></div>';
    return h + PO.map(function (o) {
      return '<div class="cd"><div class="kpl"><b>' + esc(o.no) + ' · ' + esc(o.sup) + '</b><b>' + rp(o.tot) + '</b></div>' +
        '<div class="sb">' + tgl(o.t) + ' · dibuat ' + esc(o.p) + (o.c ? ' · ' + esc(o.c) : '') + '</div>' +
        '<div>' + o.items.map(function (it) { return '<div class="row"><div class="n">' + esc(it.n) + (it.w ? ' · <b>' + esc(it.w) + '</b>' : '') + '</div><div class="r">' + f(it.q) + ' × ' + rp(it.h) + '<div><b>' + rp(it.s) + '</b></div></div></div>'; }).join('') + '</div>' +
        '<div class="mini"><label>Cara bayar<select class="isian" data-pb="' + esc(o.no) + '">' + BL.map(function (b) { return '<option' + (b === o.bayar ? ' selected' : '') + '>' + esc(b) + '</option>'; }).join('') + '</select></label>' +
        '<label>Tanggal bayar<input class="isian" type="date" data-pt="' + esc(o.no) + '" max="' + esc(D.hariIni) + '" value="' + esc(D.hariIni) + '"></label></div>' +
        '<div class="aksi-baris"><button type="button" class="tbl pri" data-pa="bayarpo" data-no="' + esc(o.no) + '">Sudah dibayar</button></div></div>';
    }).join('');
  }

  function isiHarga(D) {
    var N = D.naik || [];
    var h = '<div class="cd"><h2>Kenaikan harga beli</h2><p class="sb" style="margin:0">Tercatat otomatis saat harga beli lebih tinggi dari pembelian terakhir.</p></div>';
    if (!N.length) return h + '<div class="cd"><div class="ksg">Belum ada kenaikan harga tercatat.</div></div>';
    return h + '<div class="cd">' + N.map(function (x) {
      return '<div class="row"><div class="n"><b>' + esc(x.n) + (x.w ? ' ' + esc(x.w) : '') + '</b><div class="sb">' + esc(tgl(x.t)) + ' ' + esc(x.j || '') + ' · ' + esc(x.sb || '') + ' ' + esc(x.no || '') + (x.sup ? ' · ' + esc(x.sup) : '') + '</div></div>' +
        '<div class="r">' + rp(x.lama) + ' → <b>' + rp(x.baru) + '</b><div class="naik">+' + String(x.pc).replace('.', ',') + '%</div></div></div>';
    }).join('') + '</div>';
  }

  function gambar() {
    if (!S.el) return;
    var D = S.D, h = '<div class="pu"><div id="puMsg">' + (S.pesan ? '<div class="msg ' + S.pesan[0] + '">' + S.pesan[1] + '</div>' : '') + '</div>';
    if (!D) { S.el.innerHTML = h + '<div class="cd"><div class="ksg">' + (S.memuat ? 'Memuat…' : 'Data belum termuat.') + '</div></div></div>'; if (!S.memuat && !S.pesan) muat(); return; }
    h += '<p class="tl" style="margin:0 0 10px">Diperbarui ' + esc(D.diperbarui) + ' · <a href="#" data-pa="muat">Muat ulang</a></p>';
    h += S.tab === 'acc' ? isiAcc(D) : S.tab === 'report' ? isiReport(D) : S.tab === 'mike' ? isiMike(D) : S.tab === 'bayar' ? isiBayarPo(D) : S.tab === 'harga' ? isiHarga(D) : isiBelanja(D);
    S.el.innerHTML = h + '</div>';
  }
  function pesan(c, t) { S.pesan = t ? [c, esc(t)] : null; var m = q('#puMsg'); if (m) m.innerHTML = t ? '<div class="msg ' + c + '">' + esc(t) + '</div>' : ''; window.scrollTo(0, 0); }

  function simpanForm() {
    S.IN.__f = { toko: q('#puToko') ? q('#puToko').value : (S.IN.__f || {}).toko || '', by: q('#puBy') ? q('#puBy').value : (S.IN.__f || {}).by || '', tg: q('#puTg') ? q('#puTg').value : (S.IN.__f || {}).tg || '' };
  }
  async function rpc(fn, arg) {
    var r = await S.sb.rpc(fn, arg);
    if (r.error) return { ok: false, pesan: 'Gagal menyimpan: ' + r.error.message + '. Coba sekali lagi; aman, tidak akan tercatat dua kali.' };
    return r.data || { ok: false, pesan: 'Gagal menyimpan.' };
  }
  async function jalan(bt, fn, arg, sukses) {
    if (S.sibuk) return; S.sibuk = true; bt.disabled = true; var lama = bt.innerHTML; bt.textContent = 'Menyimpan…';
    var r = await rpc(fn, arg);
    S.sibuk = false; bt.disabled = false; bt.innerHTML = lama;
    if (r && r.perluAlasan) { S.PERLU = r.perluAlasan; gambar(); pesan('bad', r.pesan); return; }
    if (!r || !r.ok) { pesan('bad', (r && r.pesan) || 'Gagal menyimpan.'); return; }
    salinKeSheet();
    if (sukses) sukses();
    S.pesan = null; S.D = null; await muat(); pesan('ok', r.pesan || 'Tersimpan.');
  }
  function terpilih() { return (S.D ? S.D.belanja : []).filter(function (a) { return S.PIL[a.no]; }); }

  function bayar(bt) {
    simpanForm();
    var L = terpilih(), f0 = S.IN.__f, toko = String(f0.toko || '').trim(), items = [], err = '';
    if (!L.length) { pesan('bad', 'Centang barang yang sudah dibelanjakan.'); return; }
    if (toko.length < 2) { pesan('bad', 'Isi nama toko / supplier.'); return; }
    L.forEach(function (a) {
      if (err) return;
      var v = S.IN[a.no] || {}, qq = angka(v.q !== undefined ? v.q : qOf(a)), h = angka(v.h !== undefined ? v.h : a.h), al = String(v.a || '').trim();
      if (!(qq > 0)) err = 'Isi qty dibeli untuk ' + a.n + '.';
      else if (!(h > 0)) err = 'Isi harga satuan untuk ' + a.n + '.';
      else if (((a.dobel && a.dobel.length) || S.PERLU[a.no]) && al.length < 5) err = 'Isi alasan belanja lagi untuk ' + a.n + ' (minimal 5 huruf).';
      items.push({ no: a.no, q: qq, h: Math.round(h), alasan: al });
    });
    if (err) { pesan('bad', err); return; }
    if (!window.confirm('Tandai ' + items.length + ' barang sudah dibayar ' + rp(total()) + ' lewat ' + f0.by + ' di ' + toko + '? Akan tercatat di accounting.')) return;
    jalan(bt, 'plx_bayar', { p_toko: toko, p_bayar: f0.by, p_tanggal: f0.tg, p_nama: S.nama, p_items: items, p_token: 'plx' + Date.now() + Math.random().toString(36).slice(2, 6) }, function () {
      L.forEach(function (a) { delete S.PIL[a.no]; delete S.IN[a.no]; delete S.PERLU[a.no]; }); S.IN.__f.toko = '';
    });
  }
  function tolak(bt) {
    var L = terpilih(), cat = q('#puCat') ? q('#puCat').value.trim() : '';
    if (!L.length) { pesan('bad', 'Centang barang yang mau ditolak.'); return; }
    if (cat.length < 3) { pesan('bad', 'Tulis alasan penolakan.'); return; }
    if (!window.confirm('Tolak ' + L.length + ' pengajuan?')) return;
    jalan(bt, 'pengadaan_aksi', { p_aksi: 'tolak', p_nos: L.map(function (a) { return a.no; }), p_qty: null, p_catatan: cat, p_ref: '', p_eta: '', p_nama: S.nama }, function () {
      L.forEach(function (a) { delete S.PIL[a.no]; delete S.IN[a.no]; });
    });
  }
  function bayarPo(bt) {
    var no = bt.getAttribute('data-no'), sel = q('[data-pb="' + no + '"]'), tg = q('[data-pt="' + no + '"]');
    var o = (S.D.po || []).filter(function (x) { return x.no === no; })[0]; if (!o) return;
    if (!window.confirm('PO ' + no + ' sudah dibayar ' + rp(o.tot) + ' lewat ' + (sel ? sel.value : '') + '? Akan tercatat di accounting.')) return;
    jalan(bt, 'pl_po_bayar', { p_no: no, p_bayar: sel ? sel.value : '', p_tanggal: tg ? tg.value : '', p_nama: S.nama, p_token: 'pb' + no + (tg ? tg.value : '') });
  }
  function koreksi(bt) {
    var no = bt.getAttribute('data-no'), a = (S.D.report || []).filter(function (x) { return x.no === no; })[0]; if (!a) return;
    var qi = q('[data-kq="' + no + '"]'), ai = q('[data-ka="' + no + '"]'), qq = angka(qi ? qi.value : ''), al = ai ? ai.value.trim() : '';
    if (!(qq > 0)) { pesan('bad', 'Isi qty dibeli untuk ' + a.n + '.'); return; }
    if (al.length < 3) { pesan('bad', 'Tulis alasan koreksi qty ' + a.n + '.'); return; }
    if (!window.confirm('Koreksi qty ' + a.n + ' dari ' + f(qOf(a)) + ' menjadi ' + f(qq) + ' ' + a.s + '?')) return;
    jalan(bt, 'pengadaan_koreksi_qty', { p_no: no, p_qty: qq, p_alasan: al, p_nama: S.nama }, function () { delete S.KQ[no]; });
  }

  function pasang(el) {
    el.addEventListener('click', function (e) {
      var t = e.target;
      var fl = t.closest('[data-fl]'); if (fl) { S.FIL = fl.getAttribute('data-fl'); gambar(); return; }
      var af = t.closest('[data-af]'); if (af) { S.ACCF = af.getAttribute('data-af'); gambar(); return; }
      var b = t.closest('[data-pa]'); if (!b) return;
      var a = b.getAttribute('data-pa');
      if (a === 'muat') { e.preventDefault(); simpanForm(); S.pesan = null; S.D = null; gambar(); return; }
      if (a === 'bayar') bayar(b);
      else if (a === 'tolak') tolak(b);
      else if (a === 'bayarpo') bayarPo(b);
      else if (a === 'kq') { var kn = b.getAttribute('data-no'); S.KQ[kn] = !S.KQ[kn]; gambar(); }
      else if (a === 'kqsimpan') koreksi(b);
    });
    el.addEventListener('change', function (e) {
      var t = e.target, no = t.getAttribute && t.getAttribute('data-pc');
      if (no) { simpanForm(); S.PIL[no] = t.checked; gambar(); return; }
      if (t.id === 'puToko' || t.id === 'puBy' || t.id === 'puTg') simpanForm();
    });
    el.addEventListener('input', function (e) {
      var t = e.target, k = t.getAttribute && (t.getAttribute('data-iq') || t.getAttribute('data-ih') || t.getAttribute('data-ia'));
      if (!k) return;
      var v = S.IN[k] = S.IN[k] || {};
      if (t.hasAttribute('data-iq')) v.q = t.value; else if (t.hasAttribute('data-ih')) v.h = t.value; else v.a = t.value;
      var tot = q('#puTot'); if (tot) tot.textContent = 'Total ' + rp(total());
    });
  }

  window.PurchasingApp = {
    // opsi: { nama, salin } — nama pengisi (tercatat "Viory (nama)"), salin = jalankan tulis-balik ke Google Sheets.
    gambar: function (el, sb, tab, opsi) {
      if (!document.getElementById('puCss')) { var s = document.createElement('style'); s.id = 'puCss'; s.textContent = CSS; document.head.appendChild(s); }
      if (S.el !== el) { S.el = el; pasang(el); }
      S.sb = sb; opsi = opsi || {}; S.nama = opsi.nama || S.nama; S.salin = opsi.salin || S.salin;
      if (tab && tab !== S.tab) { if (S.tab === 'belanja') simpanForm(); S.tab = tab; S.pesan = null; }
      gambar(); window.scrollTo(0, 0);
    }
  };
})();
