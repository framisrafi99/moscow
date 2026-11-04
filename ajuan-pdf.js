/* Laporan pengajuan pembelian per tanggal (Gudang Utama, Staf Produksi, Staf Bahan Baku).
 * Staf memilih tanggal, lalu mengunduh PDF atau mengirimnya lewat WhatsApp ke Purchasing.
 * Data diambil dari pengajuan yang sudah tersimpan di aplikasi (pengadaan.js, Supabase).
 */
(function () {
  var NAMA_BAGIAN = { gudang: 'Gudang Utama', produksi: 'Produksi', bahanbaku: 'Bahan Baku' };
  var S = { el: null, sb: null, app: '', list: null, tgl: '', pg: '', memuat: false, pesan: null };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function f(n) { n = Math.round((Number(n) || 0) * 100) / 100; var p = String(Math.abs(n)).split('.'); return (n < 0 ? '-' : '') + p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (p[1] ? ',' + p[1] : ''); }
  function rp(n) { return 'Rp' + f(Math.round(Number(n) || 0)); }
  var BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  function tglPanjang(t) { var p = String(t || '').split('-'); return p.length === 3 ? Number(p[2]) + ' ' + BLN[Number(p[1]) - 1] + ' ' + p[0] : t; }
  function hariIni() { var d = new Date(Date.now() + 8 * 3600e3); return d.toISOString().slice(0, 10); }
  function qOf(a) { return a.qs !== null && a.qs !== undefined ? a.qs : a.q; }
  function jamDari(wk) { var m = /(\d{2}:\d{2})/.exec(String(wk || '')); return m ? m[1] : ''; }

  function pilihan() {
    var L = (S.list || []).filter(function (a) { return a.t === S.tgl && a.st !== 'Batal'; });
    var orang = []; L.forEach(function (a) { if (a.pg && orang.indexOf(a.pg) < 0) orang.push(a.pg); });
    if (S.pg && orang.indexOf(S.pg) < 0) S.pg = '';
    var tampil = L.filter(function (a) { return !S.pg || a.pg === S.pg; }).sort(function (a, b) { return a.ms - b.ms; });
    return { semua: L, orang: orang, tampil: tampil };
  }

  var CSS = '.aj{max-width:900px;margin:0 auto;padding:16px 16px 40px}.aj h2{margin:0;font-size:19px;font-weight:800}' +
    '.aj .sb{font-size:13px;color:var(--abu)}.aj .row{display:flex;gap:12px;justify-content:space-between;padding:10px 0;border-top:1px solid var(--garis2)}' +
    '.aj .row:first-child{border-top:0}.aj .row .n{flex:1;min-width:0}.aj .row .r{text-align:right;white-space:nowrap}.aj .tot{font-size:17px;font-weight:800}';

  async function muat() {
    if (S.memuat) return; S.memuat = true; S.pesan = null;
    try { S.list = await window.Pengadaan.ajuanBagian(S.sb, S.app); }
    catch (e) { S.list = null; S.pesan = ['bad', 'Data pengajuan gagal dimuat: ' + (e.message || e) + '. Tekan Muat ulang.']; }
    S.memuat = false; gambar();
  }

  function gambar() {
    var el = S.el; if (!el) return;
    var h = '<div class="aj"><div id="ajMsg">' + (S.pesan ? '<div class="msg ' + S.pesan[0] + '">' + esc(S.pesan[1]) + '</div>' : '') + '</div>';
    h += '<div class="cd"><h2>Laporan pengajuan ke Purchasing</h2><p class="sb" style="margin:0">Pilih tanggal pengajuan, lalu unduh PDF atau kirim lewat WhatsApp ke Purchasing. Isinya diambil dari pengajuan yang sudah kamu kirim di aplikasi ini.</p>' +
      '<div class="mini"><label>Tanggal pengajuan<input class="isian" type="date" id="ajTgl" max="' + hariIni() + '" value="' + esc(S.tgl) + '"></label>';
    if (!S.list) {
      el.innerHTML = h + '</div><div class="cd"><div class="ksg">' + (S.memuat ? 'Memuat pengajuan…' : 'Belum termuat.') + '</div></div></div>';
      pasang(); if (!S.memuat && !S.pesan) muat(); return;
    }
    var P = pilihan();
    h += '<label>Diajukan oleh<select class="isian" id="ajPg"><option value="">Semua (' + P.orang.length + ' orang)</option>' + P.orang.map(function (o) { return '<option' + (o === S.pg ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select></label></div>' +
      '<p class="tl" style="margin:0"><a href="#" id="ajMuat">Muat ulang</a></p></div>';
    if (!P.tampil.length) {
      h += '<div class="cd"><div class="ksg">Tidak ada pengajuan pada ' + esc(tglPanjang(S.tgl)) + '.</div></div>';
    } else {
      var tot = 0;
      h += '<div class="cd"><div class="kpl"><h3>' + P.tampil.length + ' barang · ' + esc(tglPanjang(S.tgl)) + '</h3></div>' + P.tampil.map(function (a) {
        var q = qOf(a), sub = (a.h || 0) * q; tot += sub;
        return '<div class="row"><div class="n"><b>' + esc(a.n) + '</b><div class="sb">' + esc(a.no) + ' · ' + esc(jamDari(a.wk)) + ' · ' + esc(a.pg) + ' · ' + esc(a.kel) + (a.imp ? ' · Impor' : ' · Lokal') + '</div>' +
          (a.al ? '<div class="sb">Alasan: ' + esc(a.al) + '</div>' : '') + '</div><div class="r"><b>' + f(q) + ' ' + esc(a.s) + '</b><div class="sb">' + (a.h ? rp(sub) : 'harga belum ada') + '</div><span class="label abu">' + esc(a.st) + '</span></div></div>';
      }).join('') + '<div class="row"><div class="n"><b>Perkiraan total</b></div><div class="r tot">' + rp(tot) + '</div></div></div>';
      h += '<div class="cd"><div class="aksi-baris"><button type="button" class="tbl pri" id="ajWa">Kirim ke WhatsApp</button><button type="button" class="tbl" id="ajPdf">Unduh PDF</button></div>' +
        '<p class="sb" style="margin:6px 0 0">Di HP, "Kirim ke WhatsApp" membuka pilihan bagikan; pilih WhatsApp lalu kontak Purchasing. Kalau HP tidak mendukung, PDF diunduh dan WhatsApp terbuka dengan ringkasan daftar; lampirkan PDF-nya dari folder unduhan.</p></div>';
    }
    el.innerHTML = h + '</div>'; pasang();
  }

  function pasang() {
    var q = function (i) { return S.el.querySelector('#' + i); };
    if (q('ajTgl')) q('ajTgl').onchange = function () { S.tgl = this.value || hariIni(); gambar(); };
    if (q('ajPg')) q('ajPg').onchange = function () { S.pg = this.value; gambar(); };
    if (q('ajMuat')) q('ajMuat').onclick = function (e) { e.preventDefault(); S.list = null; gambar(); };
    if (q('ajPdf')) q('ajPdf').onclick = function () { kirim(this, false); };
    if (q('ajWa')) q('ajWa').onclick = function () { kirim(this, true); };
  }

  function skrip(src) { return new Promise(function (ok, gagal) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { gagal(new Error('Gagal memuat ' + src)); }; document.head.appendChild(s); }); }
  async function siapPdf() {
    if (!(window.jspdf && window.jspdf.jsPDF)) await skrip('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    if (!window.jspdf.jsPDF.API.autoTable) await skrip('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
    return window.jspdf.jsPDF;
  }
  function logo() {
    return new Promise(function (ok) {
      var im = new Image(); im.onload = function () { var c = document.createElement('canvas'); c.width = im.width; c.height = im.height; c.getContext('2d').drawImage(im, 0, 0); ok({ data: c.toDataURL('image/png'), w: im.width, h: im.height }); };
      im.onerror = function () { ok(null); }; im.src = 'logo-warna.png';
    });
  }

  async function buatPdf(P) {
    var JsPDF = await siapPdf(), lg = await logo();
    var doc = new JsPDF({ unit: 'mm', format: 'a4' }), W = 210, L = 14, R = W - 14, NAVY = [12, 31, 64], BIRU = [30, 120, 168];
    var bagian = NAMA_BAGIAN[S.app] || S.app, nomor = 'LPA-' + S.tgl.slice(2).replace(/-/g, '') + '-' + (S.app === 'gudang' ? 'GD' : S.app === 'produksi' ? 'PR' : 'BB');
    if (lg) doc.addImage(lg.data, 'PNG', L, 11, 40, 40 * lg.h / lg.w);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor.apply(doc, NAVY);
    doc.text('DAFTAR PENGAJUAN PEMBELIAN', R, 16, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(90, 102, 119);
    doc.text('No. ' + nomor, R, 21.5, { align: 'right' });
    doc.text('Untuk: Purchasing Moscow Supplies', R, 26, { align: 'right' });
    doc.setDrawColor.apply(doc, NAVY); doc.setLineWidth(0.8); doc.line(L, 31, R, 31);
    var info = [['Bagian', bagian], ['Tanggal pengajuan', tglPanjang(S.tgl)], ['Diajukan oleh', S.pg || P.orang.join(', ') || '-'], ['Jumlah barang', P.tampil.length + ' barang']];
    doc.setFontSize(9); var y = 38;
    info.forEach(function (r, i) {
      var x = L + (i % 2) * 92, yy = y + Math.floor(i / 2) * 9;
      doc.setTextColor(30, 120, 168); doc.setFont('helvetica', 'bold'); doc.text(r[0].toUpperCase(), x, yy);
      doc.setTextColor(15, 27, 42); doc.setFont('helvetica', 'normal'); doc.text(doc.splitTextToSize(String(r[1]), 88)[0], x, yy + 4.2);
    });
    var tot = 0, body = P.tampil.map(function (a, i) {
      var q = qOf(a), sub = (a.h || 0) * q; tot += sub;
      return [String(i + 1), a.n + (a.k ? '\n' + a.k : '') + (a.al ? '\nAlasan: ' + a.al : ''), f(q) + ' ' + a.s, a.h ? f(a.h) : '-', a.h ? f(sub) : '-', (a.imp ? 'Impor' : 'Lokal') + '\n' + a.st, a.no + '\n' + jamDari(a.wk) + ' · ' + a.pg];
    });
    doc.autoTable({
      startY: 59, head: [['No', 'Barang', 'Qty', 'Perkiraan harga', 'Subtotal', 'Asal / status', 'No. pengajuan']], body: body,
      foot: [['', 'PERKIRAAN TOTAL', '', '', f(tot), '', '']],
      margin: { left: L, right: 14 }, styles: { font: 'helvetica', fontSize: 8.2, cellPadding: 2, textColor: [15, 27, 42], lineColor: [226, 231, 238], lineWidth: 0.2, valign: 'top' },
      headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold' }, footStyles: { fillColor: [231, 243, 249], textColor: NAVY, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 0: { cellWidth: 8, halign: 'center' }, 2: { cellWidth: 20, halign: 'right' }, 3: { cellWidth: 23, halign: 'right' }, 4: { cellWidth: 23, halign: 'right' }, 5: { cellWidth: 20 }, 6: { cellWidth: 32, textColor: [90, 102, 119] } }
    });
    var yEnd = doc.lastAutoTable.finalY + 8;
    if (yEnd > 262) { doc.addPage(); yEnd = 20; }
    doc.setFontSize(8.5); doc.setTextColor(90, 102, 119);
    doc.text(doc.splitTextToSize('Daftar ini dibuat otomatis dari pengajuan yang tersimpan di aplikasi Moscow Supplies. Harga adalah perkiraan dari staf; Purchasing mencatat qty dan harga sebenarnya saat membelanjakan. Barang impor di-ACC Mike.', R - L - 70), L, yEnd);
    doc.setTextColor(15, 27, 42); doc.text('Diajukan oleh,', R - 30, yEnd, { align: 'center' });
    doc.setDrawColor(15, 27, 42); doc.setLineWidth(0.2); doc.line(R - 55, yEnd + 20, R - 5, yEnd + 20);
    doc.setFont('helvetica', 'bold'); doc.text(S.pg || bagian, R - 30, yEnd + 24.5, { align: 'center' });
    var n = doc.getNumberOfPages();
    for (var i = 1; i <= n; i++) {
      doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(90, 102, 119);
      doc.text('Moscow Supplies · ' + nomor + ' · dicetak ' + new Date().toLocaleString('id-ID'), L, 290);
      doc.text('Halaman ' + i + ' / ' + n, R, 290, { align: 'right' });
    }
    return { doc: doc, nama: 'Pengajuan ' + bagian + ' ' + S.tgl + (S.pg ? ' ' + S.pg : '') + '.pdf', tot: tot };
  }

  function ringkasWa(P, tot) {
    var t = '*Daftar pengajuan pembelian ' + (NAMA_BAGIAN[S.app] || '') + '*\nTanggal: ' + tglPanjang(S.tgl) + (S.pg ? '\nDiajukan oleh: ' + S.pg : '') + '\n\n';
    t += P.tampil.map(function (a, i) { return (i + 1) + '. ' + a.n + ' — ' + f(qOf(a)) + ' ' + a.s + (a.imp ? ' (impor)' : ''); }).join('\n');
    return t + '\n\nPerkiraan total: ' + rp(tot) + '\nPDF terlampir.';
  }

  async function kirim(bt, wa) {
    var P = pilihan(); if (!P.tampil.length) return;
    bt.disabled = true; var lama = bt.textContent; bt.textContent = 'Menyiapkan PDF…';
    try {
      var r = await buatPdf(P), blob = r.doc.output('blob'), file = new File([blob], r.nama, { type: 'application/pdf' });
      if (wa && navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: r.nama, text: ringkasWa(P, r.tot) }); }
        catch (e) { if (e && e.name !== 'AbortError') throw e; }
      } else {
        r.doc.save(r.nama);
        if (wa) window.open('https://wa.me/?text=' + encodeURIComponent(ringkasWa(P, r.tot)), '_blank');
      }
    } catch (e) {
      var m = S.el.querySelector('#ajMsg'); if (m) m.innerHTML = '<div class="msg bad">PDF gagal dibuat: ' + esc(e.message || e) + '</div>';
    }
    bt.disabled = false; bt.textContent = lama;
  }

  window.AjuanPdf = {
    gambar: function (el, sb, app) {
      if (!document.getElementById('ajCss')) { var s = document.createElement('style'); s.id = 'ajCss'; s.textContent = CSS; document.head.appendChild(s); }
      S.el = el; S.sb = sb; if (S.app !== app) { S.app = app; S.list = null; }
      if (!S.tgl) S.tgl = hariIni();
      gambar(); window.scrollTo(0, 0);
    }
  };
})();
