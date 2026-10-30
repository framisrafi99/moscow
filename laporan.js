/* =====================================================================
   LAPORAN BULANAN UNTUK KONSULTAN PAJAK (Master Data › Laporan)
   Data: rpc laporan_pajak(bulan). Unduh Excel (satu bagian per sheet) dan Cetak / Simpan PDF.
   ===================================================================== */
(function () {
  var BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var BLS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var NAMA_PF = { Shopee: 'Shopee', Tokopedia: 'Tokopedia / TikTok Shop', Lazada: 'Lazada' };
  var URUT_LOK = ['kp', 'gudang', 't3', 't0', 't1', 't2', 'prod'];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n) { return (Math.round((Number(n) || 0) * 100) / 100).toLocaleString('id-ID'); }
  function rp(n) { n = Math.round(Number(n) || 0); return (n < 0 ? '−Rp' : 'Rp') + Math.abs(n).toLocaleString('id-ID'); }
  function tgl(d) { var p = String(d || '').slice(0, 10).split('-'); return p.length < 3 ? '' : Number(p[2]) + ' ' + BLS[Number(p[1]) - 1] + ' ' + p[0]; }
  function namaBulan(b) { var p = String(b || '').split('-'); return (BLN[Number(p[1]) - 1] || '') + ' ' + p[0]; }
  function jml(arr, f) { return (arr || []).reduce(function (t, x) { return t + (Number(f(x)) || 0); }, 0); }

  var CSS = '' +
    '.lp-top{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:12px;margin:0 0 14px}' +
    '.lp-top h2{margin:0;font-size:20px;font-weight:800}.lp-top p{margin:2px 0 0;font-size:13px;color:var(--abu)}' +
    '.lp-aksi{display:flex;flex-wrap:wrap;gap:8px;align-items:center}' +
    '.lp-aksi select{height:42px;padding:0 12px;border:1px solid var(--garis);border-radius:12px;background:#fff;font-weight:700}' +
    '.lp-kp{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:16px}' +
    '.lp-kp div{background:#fff;border:1px solid var(--garis);border-radius:14px;padding:14px 16px}' +
    '.lp-kp span{display:block;font-size:12.5px;color:var(--abu);font-weight:600}.lp-kp b{display:block;font-size:22px;font-weight:800;margin-top:4px;font-variant-numeric:tabular-nums}' +
    '.lp-kp small{display:block;font-size:12px;color:var(--abu);margin-top:2px}' +
    '.lp-sec h3 .no{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:8px;background:var(--biruMuda);color:var(--biruTua);font-size:13px;margin-right:8px}' +
    '.lp-t{width:100%;border-collapse:collapse;font-size:13.5px}' +
    '.lp-t th{text-align:left;font-size:12px;color:var(--abu);font-weight:700;padding:8px 8px 8px 0;border-bottom:1px solid var(--garis);white-space:nowrap}' +
    '.lp-t td{padding:8px 8px 8px 0;border-bottom:1px solid var(--garis2);vertical-align:top}' +
    '.lp-t .r{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}' +
    '.lp-t tr.sub td{font-weight:800;background:#F7F9FB}.lp-t tr.tot td{font-weight:800;border-top:2px solid var(--tinta);border-bottom:0;font-size:14.5px}' +
    '.lp-t tr.g td{font-weight:800;color:var(--teks2);padding-top:14px}' +
    '.lp-t small{display:block;color:var(--abu);font-size:12px}' +
    '.lp-gl{overflow-x:auto}' +
    '.lp-cat{font-size:12.5px;color:var(--abu);margin:6px 0 0;line-height:1.5}' +
    '.lp-w{background:var(--kuningMuda);color:#6B4300;border-radius:10px;padding:10px 12px;font-size:13px;margin:4px 0}' +
    '.lp-sec details summary{cursor:pointer;font-weight:700;color:var(--biru);font-size:13px;padding:6px 0;list-style:none}' +
    '.lp-sec details summary::-webkit-details-marker{display:none}' +
    '.lp-akun{border:1px solid var(--garis);border-radius:12px;padding:12px 14px;margin-top:10px}' +
    '.lp-akun h4{margin:0 0 6px;font-size:15px;display:flex;justify-content:space-between;gap:8px}' +
    '.lp-print-only{display:none}' +
    '@media (max-width:600px){.lp-t{font-size:12px}.lp-t th,.lp-t td{padding:7px 6px 7px 0}.lp-t small{font-size:11px}.lp-kp{grid-template-columns:1fr 1fr;gap:8px}.lp-kp b{font-size:17px}.lp-aksi .tbl{flex:1 1 auto}}' +
    '@media print{' +
    '  @page{size:A4;margin:12mm}' +
    '  body{background:#fff!important;padding:0!important}' +
    '  #mSide,#mHead,#mBawah,.lp-aksi,.msg-atas,#mMuat{display:none!important}' +
    '  main#mIsi{padding:0!important;max-width:none!important}' +
    '  main#mIsi>section{display:none!important}main#mIsi>section#bLaporan{display:block!important}' +
    '  .cd{break-inside:auto;border:0!important;padding:0!important;margin-bottom:14px!important}' +
    '  .lp-sec{break-before:page}.lp-sec:first-of-type{break-before:auto}' +
    '  .lp-t{font-size:10.5px}.lp-t th,.lp-t td{padding:4px 6px 4px 0}' +
    '  .lp-gl{overflow:visible}.lp-print-only{display:block}' +
    '  .lp-kp div{border:1px solid #ccc}' +
    '}';

  var S = { data: null, bulan: '', memuat: false };

  // Posisi stok / bagi hasil: dari hitungan terbaru (bulan berjalan) atau arsip bulan itu.
  function posisi(D) {
    var st = D.stok || (D.arsip && D.arsip.stok) || null, bh = D.bh || (D.arsip && D.arsip.bh) || null;
    return { stok: st, bh: bh, dariArsip: !D.stok && !!(D.arsip && D.arsip.stok) };
  }
  function nilaiLokasi(st) {
    var out = {};
    (st && st.barang || []).forEach(function (b) {
      Object.keys(b.q || {}).forEach(function (id) {
        var q = Number(b.q[id]) || 0; if (!q) return;
        if (!out[id]) out[id] = { q: 0, v: 0, n: 0, tanpa: 0, min: 0, minQ: 0 };
        if (q < 0) { out[id].min++; out[id].minQ += q; return; }
        out[id].q += q; out[id].n++;
        if (b.hpp > 0) out[id].v += q * b.hpp; else out[id].tanpa++;
      });
    });
    return out;
  }
  function namaLok(st, id) { var l = (st && st.lokasi || []).filter(function (x) { return x.id === id; })[0]; return l ? l.n : id; }

  function hitung(D) {
    var O = D.omzet, P = posisi(D);
    var off = jml(O.official, function (x) { return x.v; });
    var tk = O.toko || [], cons = tk.filter(function (x) { return /^Consignment/.test(x.toko); }), offl = tk.filter(function (x) { return x.toko === 'Toko Offline'; })[0] || { jual: 0, retur: 0, bersih: 0 };
    var consB = jml(cons, function (x) { return x.bersih; }), res = jml(O.reseller, function (x) { return x.v; });
    var keluar = jml(D.keluar, function (x) { return x.total; });
    var kel = {}; (D.kelompok || []).forEach(function (k) { kel[k.kel] = k.v; });
    var moscow = P.bh ? jml(P.bh, function (t) { return t.moscow; }) : null;
    var terima = off + offl.bersih + res + (moscow == null ? 0 : moscow);
    var op = kel['Biaya operasional'] || 0, beli = kel['Pembelian barang & bahan'] || 0;
    return { off: off, cons: cons, consB: consB, offl: offl, res: res, omzet: off + consB + offl.bersih + res, keluar: keluar, kel: kel,
      moscow: moscow, terima: terima, op: op, beli: beli, bersihOp: terima - op, bersihSemua: terima - op - beli, P: P };
  }

  function tabel(kepala, baris, kanan) {
    kanan = kanan || [];
    return '<div class="lp-gl"><table class="lp-t"><thead><tr>' + kepala.map(function (h, i) { return '<th' + (kanan.indexOf(i) >= 0 ? ' class="r"' : '') + '>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      baris.join('') + '</tbody></table></div>';
  }
  function tr(sel, kanan, kelas) {
    return '<tr' + (kelas ? ' class="' + kelas + '"' : '') + '>' + sel.map(function (s, i) { return '<td' + (kanan.indexOf(i) >= 0 ? ' class="r"' : '') + '>' + s + '</td>'; }).join('') + '</tr>';
  }

  function bagian1(D, H) {
    var O = D.omzet, b = [], K = [2, 3, 4];
    b.push(tr(['<b>Official (marketplace)</b>', '', '', '', rp(H.off)], [4], 'g'));
    O.official.forEach(function (x) { b.push(tr([esc(NAMA_PF[x.pf]) + '<small>' + (x.akhir ? 'data file pesanan s/d ' + tgl(x.akhir) : 'belum ada file pesanan') + '</small>', fmt(x.psn) + ' pesanan', fmt(x.pcs), x.ret ? rp(-x.ret) : '–', rp(x.v)], [2, 3, 4])); });
    b.push(tr(['<b>Consignment</b>', '', '', '', rp(H.consB)], [4], 'g'));
    H.cons.forEach(function (x) { b.push(tr([esc(x.toko.replace('Consignment ', '')) + '<small>penjualan dilaporkan staf' + (x.akhir ? ', terakhir ' + tgl(x.akhir) : '') + '</small>', rp(x.jual), fmt(x.pcs), x.retur ? rp(-x.retur) : '–', rp(x.bersih)], [1, 2, 3, 4])); });
    b.push(tr(['<b>Toko Offline</b>', rp(H.offl.jual), fmt(H.offl.pcs), H.offl.retur ? rp(-H.offl.retur) : '–', rp(H.offl.bersih)], [1, 2, 3, 4], 'g'));
    b.push(tr(['<b>Reseller (sudah dibayar)</b><small>order berstatus Dikirim / Selesai, sama dengan pencatatan Accounting</small>', fmt(O.reseller.length) + ' order', fmt(jml(O.reseller, function (x) { return x.pcs; })), '–', rp(H.res)], [1, 2, 3, 4], 'g'));
    O.reseller.forEach(function (x) { b.push(tr(['<small style="color:var(--teks2)">' + esc(x.no) + ' · ' + tgl(x.t) + ' · ' + esc(x.pel) + ' · ' + esc(x.st) + '</small>', '', fmt(x.pcs), '', rp(x.v)], [2, 4])); });
    b.push(tr(['TOTAL OMZET', '', '', '', rp(H.omzet)], [4], 'tot'));
    return '<div class="cd lp-sec" id="lp1"><h3><span class="no">1</span>Omzet</h3>' +
      tabel(['Saluran', 'Penjualan / pesanan', 'Pcs', 'Retur', 'Omzet bersih'], b, [1, 2, 3, 4]) +
      '<p class="lp-cat">Official = file ekspor pesanan marketplace (tanpa pesanan batal / belum bayar, dikurangi retur). Consignment & Toko Offline = penjualan yang dilaporkan staf, dikurangi barang retur. Reseller = order yang sudah dibayar (Dikirim / Selesai).</p></div>';
  }

  function bagian2(D, H) {
    var h = '<div class="cd lp-sec" id="lp2"><h3><span class="no">2</span>Pengeluaran per sumber dana</h3>';
    var ring = D.keluar.map(function (a) { return tr([esc(a.akun), fmt(a.list.length) + ' transaksi', rp(jml(a.topup, function (x) { return x.v; })), rp(a.total)], [1, 2, 3]); });
    ring.push(tr(['TOTAL', '', rp(jml(D.keluar, function (a) { return jml(a.topup, function (x) { return x.v; }); })), rp(H.keluar)], [2, 3], 'tot'));
    h += tabel(['Sumber dana', 'Jumlah', 'Top up masuk', 'Uang keluar'], ring, [1, 2, 3]);
    D.keluar.forEach(function (a) {
      h += '<div class="lp-akun"><h4><span>' + esc(a.akun) + '</span><span>' + rp(a.total) + '</span></h4>';
      if (!a.list.length && !a.topup.length) { h += '<div class="ksg">Tidak ada uang keluar atau top up bulan ini.</div></div>'; return; }
      if (a.kat.length) h += tabel(['Kategori', 'Transaksi', 'Nominal'], a.kat.map(function (k) { return tr([esc(k.k), fmt(k.n), rp(k.v)], [1, 2]); }), [1, 2]);
      if (a.topup.length) h += '<p class="lp-cat" style="font-weight:700;color:var(--teks2)">Riwayat top up ke ' + esc(a.akun) + '</p>' +
        tabel(['Tanggal', 'No', 'Dari akun', 'Keterangan', 'Nominal'], a.topup.map(function (t) { return tr([tgl(t.t), esc(t.no), esc(t.dari), esc(t.ket || '-'), rp(t.v)], [4]); }), [4]);
      if (a.pindah.length) h += '<p class="lp-cat" style="font-weight:700;color:var(--teks2)">Pindah dana dari ' + esc(a.akun) + ' (bukan pengeluaran)</p>' +
        tabel(['Tanggal', 'No', 'Ke akun', 'Keterangan', 'Nominal'], a.pindah.map(function (t) { return tr([tgl(t.t), esc(t.no), esc(t.ke), esc(t.ket || '-'), rp(t.v)], [4]); }), [4]);
      if (a.list.length) h += '<details class="lp-rinci"><summary>Rincian ' + fmt(a.list.length) + ' transaksi ›</summary>' +
        tabel(['Tanggal', 'No', 'Kategori', 'Keterangan', 'Dicatat oleh', 'Nominal'], a.list.map(function (t) { return tr([tgl(t.t), esc(t.no), esc(t.k || '-'), esc(t.ket || '-'), esc(t.o || '-'), rp(t.v)], [5]); }), [5]) + '</details>';
      h += '</div>';
    });
    return h + '</div>';
  }

  function bagian3(D) {
    var P = D.pakai, bh = P.bahan || [], km = P.kemasan || [];
    var vb = jml(bh, function (x) { return x.v; }), vk = jml(km, function (x) { return x.v; });
    var tb = bh.filter(function (x) { return !(x.h > 0); }).length, tk = km.filter(function (x) { return !(x.h > 0); }).length;
    var h = '<div class="cd lp-sec" id="lp3"><h3><span class="no">3</span>Pemakaian bahan baku, botol, stiker & packaging</h3>';
    h += tabel(['Kelompok', 'Item dipakai', 'Item berharga', 'Nilai pemakaian (yang berharga)', 'Pembelian bulan ini'], [
      tr(['Bahan baku', fmt(bh.length), fmt(bh.length - tb), rp(vb), rp(P.beli['Pembelian bahan baku'] || 0)], [1, 2, 3, 4]),
      tr(['Botol, stiker & packaging', fmt(km.length), fmt(km.length - tk), rp(vk), rp(P.beli['Botol, stiker & kemasan'] || 0)], [1, 2, 3, 4]),
      tr(['TOTAL', '', '', rp(vb + vk), rp((P.beli['Pembelian bahan baku'] || 0) + (P.beli['Botol, stiker & kemasan'] || 0))], [3, 4], 'tot')], [1, 2, 3, 4]);
    if (tb || tk) h += '<div class="lp-w">' + (tb ? fmt(tb) + ' bahan baku' : '') + (tb && tk ? ' dan ' : '') + (tk ? fmt(tk) + ' botol / stiker / packaging' : '') +
      ' belum punya harga beli di sistem, jadi nilai pemakaiannya belum terhitung. Harga diambil dari catatan pembelian terakhir yang ada nominalnya (form staf bahan baku: Beli bahan; form staf produksi: Barang masuk dengan harga). Sebagai pembanding, kolom "Pembelian bulan ini" adalah uang keluar di Accounting untuk kategori itu.</div>';
    h += '<details class="lp-rinci"><summary>Rincian bahan baku (' + fmt(bh.length) + ') ›</summary>' +
      tabel(['Kode', 'Bahan', 'Dipakai', 'Satuan', 'Harga satuan', 'Nilai'], bh.map(function (x) { return tr([esc(x.k), esc(x.n), fmt(x.q), esc(x.s || ''), x.h > 0 ? rp(x.h) : '<span style="color:var(--kuning)">belum ada</span>', x.v ? rp(x.v) : '–'], [2, 4, 5]); }), [2, 4, 5]) + '</details>';
    h += '<details class="lp-rinci"><summary>Rincian botol, stiker & packaging (' + fmt(km.length) + ') ›</summary>' +
      tabel(['Barang', 'Jenis', 'Dipakai', 'Rusak', 'Harga satuan', 'Nilai'], km.map(function (x) { return tr([esc(x.n), esc(x.j || ''), fmt(x.q), fmt(x.rusak), x.h > 0 ? rp(x.h) : '<span style="color:var(--kuning)">belum ada</span>', x.v ? rp(x.v) : '–'], [2, 3, 4, 5]); }), [2, 3, 4, 5]) + '</details>';
    return h + '</div>';
  }

  function bagian4(D, H) {
    var st = H.P.stok, h = '<div class="cd lp-sec" id="lp4"><h3><span class="no">4</span>Sisa stok produk & produk yang bertambah</h3>';
    if (!st) h += '<div class="lp-w">Posisi stok ' + esc(namaBulan(D.bulan)) + ' tidak tersedia: bulan ini sudah lewat dan arsip posisi akhir bulannya belum dibuat. Mulai bulan ini, tekan "Arsipkan posisi akhir bulan" pada tanggal terakhir bulan.</div>';
    else {
      var B = st.barang.filter(function (b) { return b.tot > 0; }).sort(function (a, b) { return String(a.kat).localeCompare(String(b.kat)) || String(a.n).localeCompare(String(b.n)); });
      var tq = jml(B, function (b) { return b.tot; }), tv = jml(B, function (b) { return b.hpp > 0 ? b.tot * b.hpp : 0; });
      h += '<p class="lp-cat">Posisi stok ' + (H.P.dariArsip ? 'arsip akhir bulan, ' : 'saat ini, ') + 'diperbarui ' + esc(st.diperbarui) + '. Nilai = qty × HPP.</p>';
      h += tabel(['Ringkasan', 'Jenis produk', 'Total pcs', 'Nilai (HPP)'], [tr(['Semua lokasi', fmt(B.length), fmt(tq), rp(tv)], [1, 2, 3], 'tot')], [1, 2, 3]);
      h += '<details class="lp-rinci"><summary>Daftar sisa stok per produk (' + fmt(B.length) + ') ›</summary>' +
        tabel(['Kode', 'Produk', 'Kategori', 'Sisa', 'HPP', 'Nilai'], B.map(function (b) { return tr([esc(b.k), esc(b.n), esc(b.kat || ''), fmt(b.tot), b.hpp > 0 ? rp(b.hpp) : '–', b.hpp > 0 ? rp(b.tot * b.hpp) : '–'], [3, 4, 5]); }), [3, 4, 5]) + '</details>';
    }
    var T = D.tambah || [];
    h += '<p class="lp-cat" style="font-weight:800;color:var(--teks2);font-size:14px;margin-top:14px">Produk yang bertambah di ' + esc(namaBulan(D.bulan)) + ' (' + fmt(T.length) + ')</p>';
    h += T.length ? tabel(['Tanggal', 'Kode', 'Produk', 'Qty', 'Sumber', 'Keterangan'], T.map(function (x) { return tr([tgl(x.t), esc(x.k), esc(x.n), fmt(x.q), esc(x.sumber), esc(x.ket)], [3]); }), [3])
      : '<div class="ksg">Tidak ada produk masuk dari produksi atau PO di bulan ini.</div>';
    h += '<p class="lp-cat">Hasil produksi = laporan staf produksi. Pembelian = barang PO yang diterima gudang; keterangan menunjukkan apakah dibelanjakan bulan ini atau berasal dari PO bulan sebelumnya.</p>';
    return h + '</div>';
  }

  function bagian5(D, H) {
    var b = [], bh = H.P.bh;
    b.push(tr(['<b>Official (marketplace)</b><small>potongan biaya platform Official belum tercatat: laporan dana cair Official belum diupload</small>', rp(H.off), '–', rp(H.off)], [1, 2, 3], 'g'));
    D.omzet.official.forEach(function (x) { b.push(tr([esc(NAMA_PF[x.pf]), rp(x.v), '–', rp(x.v)], [1, 2, 3])); });
    b.push(tr(['<b>Consignment (setoran ke Moscow)</b><small>penjualan − potongan platform − bagian profit toko</small>', '', '', H.moscow == null ? 'belum tersedia' : rp(H.moscow)], [1, 2, 3], 'g'));
    if (bh) bh.forEach(function (t) {
      b.push(tr([esc(t.toko.replace('Consignment ', '')) + '<small>setoran ke Moscow = modal HPP ' + rp(t.hpp || 0) + ' + biaya yang ditalangi Moscow ' + rp(jml(t.biaya, function (x) { return x.nom; })) + ' + bagian profit Moscow ' + (100 - (t.persen || 0)) + '% ' + rp(t.moscowBagian || 0) + '</small>',
        rp(t.penjualan || t.omzet || 0), t.potongan ? rp(-t.potongan) : '–', rp(t.moscow || 0)], [1, 2, 3]));
    });
    else b.push(tr(['<small>Hitungan bagi hasil bulan ini tidak tersedia (bulan sudah lewat tanpa arsip).</small>', '', '', ''], []));
    b.push(tr(['<b>Toko Offline</b>', rp(H.offl.bersih), '–', rp(H.offl.bersih)], [1, 2, 3], 'g'));
    b.push(tr(['<b>Reseller (dibayar)</b>', rp(H.res), '–', rp(H.res)], [1, 2, 3], 'g'));
    b.push(tr(['TOTAL PENERIMAAN', '', '', rp(H.terima)], [3], 'tot'));
    b.push(tr(['− Biaya operasional Moscow', '', '', rp(-H.op)], [3]));
    b.push(tr(['PENERIMAAN BERSIH setelah biaya operasional', '', '', rp(H.bersihOp)], [3], 'tot'));
    b.push(tr(['− Pembelian barang & bahan', '', '', rp(-H.beli)], [3]));
    b.push(tr(['Setelah biaya operasional & pembelian', '', '', rp(H.bersihSemua)], [3], 'sub'));
    var kel = (D.kelompok || []).map(function (k) { return tr([esc(k.kel) + '<small>' + esc((k.det || []).join(', ')) + '</small>', rp(k.v)], [1]); });
    var dn = (D.dana || []).length ? tabel(['Toko', 'Platform', 'Pendapatan', 'Biaya platform', 'Dana cair', 'Pesanan'], D.dana.map(function (x) { return tr([esc(x.toko), esc(NAMA_PF[x.pf] || x.pf), rp(x.pend), rp(x.biaya), rp(x.cair), fmt(x.psn)], [2, 3, 4, 5]); }), [2, 3, 4, 5])
      : '<div class="ksg">Belum ada laporan dana cair yang diupload untuk bulan ini.</div>';
    return '<div class="cd lp-sec" id="lp5"><h3><span class="no">5</span>Penerimaan bersih</h3>' +
      tabel(['Sumber', 'Penjualan', 'Potongan platform', 'Diterima Moscow'], b, [1, 2, 3]) +
      '<p class="lp-cat" style="font-weight:800;color:var(--teks2);font-size:14px;margin-top:14px">Pengeluaran Moscow per kelompok (semua akun)</p>' + tabel(['Kelompok', 'Nominal'], kel, [1]) +
      '<p class="lp-cat">Pembelian aset / peralatan ada di kelompok "Di luar laba rugi" dan tidak mengurangi penerimaan bersih.</p>' +
      '<p class="lp-cat" style="font-weight:800;color:var(--teks2);font-size:14px;margin-top:14px">Laporan dana cair marketplace consignment</p>' + dn + '</div>';
  }

  function bagian6(D, H) {
    var st = H.P.stok, h = '<div class="cd lp-sec" id="lp6"><h3><span class="no">6</span>Aset barang per lokasi</h3>';
    if (!st) return h + '<div class="lp-w">Posisi stok per lokasi tidak tersedia untuk ' + esc(namaBulan(D.bulan)) + ' (arsip akhir bulan belum dibuat).</div></div>';
    var N = nilaiLokasi(st), ids = URUT_LOK.filter(function (id) { return N[id]; }).concat(Object.keys(N).filter(function (id) { return URUT_LOK.indexOf(id) < 0; }));
    var ring = ids.map(function (id) { var x = N[id]; return tr([esc(namaLok(st, id)) + (id === 'kp' ? '<small>stok online / marketplace</small>' : ''), fmt(x.n), fmt(x.q), rp(x.v) + (x.tanpa ? '<small>' + x.tanpa + ' produk tanpa HPP</small>' : '')], [1, 2, 3]); });
    ring.push(tr(['TOTAL', '', fmt(jml(ids, function (id) { return N[id].q; })), rp(jml(ids, function (id) { return N[id].v; }))], [2, 3], 'tot'));
    h += '<p class="lp-cat">Posisi ' + (H.P.dariArsip ? 'arsip akhir bulan' : 'saat ini') + ', diperbarui ' + esc(st.diperbarui) + '. Nilai = qty × HPP.</p>' +
      tabel(['Lokasi', 'Jenis produk', 'Pcs', 'Nilai aset (HPP)'], ring, [1, 2, 3]);
    var mins = ids.filter(function (id) { return N[id].min; });
    if (mins.length) h += '<div class="lp-w">' + mins.map(function (id) { return esc(namaLok(st, id)) + ': ' + fmt(N[id].min) + ' produk stoknya minus (total ' + fmt(N[id].minQ) + ' pcs)'; }).join('; ') +
      '. Stok minus tidak dihitung sebagai aset. Biasanya terjadi karena penjualan sudah tercatat tetapi kiriman barang ke lokasi itu belum dicatat; perlu dicek sebelum laporan diserahkan.</div>';
    ids.forEach(function (id) {
      var B = st.barang.filter(function (b) { return Number(b.q && b.q[id]) > 0; }).sort(function (a, b) { return String(a.n).localeCompare(String(b.n)); });
      h += '<details class="lp-rinci"><summary>' + esc(namaLok(st, id)) + ': ' + fmt(B.length) + ' produk · ' + rp(N[id].v) + ' ›</summary>' +
        tabel(['Kode', 'Produk', 'Qty', 'HPP', 'Nilai'], B.map(function (b) { var q = Number(b.q[id]); return tr([esc(b.k), esc(b.n), fmt(q), b.hpp > 0 ? rp(b.hpp) : '–', b.hpp > 0 ? rp(q * b.hpp) : '–'], [2, 3, 4]); }), [2, 3, 4]) + '</details>';
    });
    return h + '</div>';
  }

  function gambar(el, opsi) {
    if (!document.getElementById('lpCss')) { var s = document.createElement('style'); s.id = 'lpCss'; s.textContent = CSS; document.head.appendChild(s); }
    var D = S.data;
    if (!D) { el.innerHTML = '<div class="ksg">Memuat laporan…</div>'; muat(el, opsi, ''); return; }
    var H = hitung(D), bulan = (D.bulanAda || [D.bulan]).slice(); if (bulan.indexOf(D.bulan) < 0) bulan.unshift(D.bulan);
    var h = '<div class="lp-top"><div><h2>Laporan bulanan · ' + esc(namaBulan(D.bulan)) + '</h2><p>Untuk konsultan pajak · PT. Toentoenan Langkah Elohim (Moscow Supplies) · periode ' + tgl(D.dari) + ' – ' + tgl(D.sampai) + (D.berjalan ? ' (bulan berjalan)' : '') + '</p></div>' +
      '<div class="lp-aksi"><select id="lpBulan" aria-label="Pilih bulan">' + bulan.map(function (m) { return '<option value="' + esc(m) + '"' + (m === D.bulan ? ' selected' : '') + '>' + esc(namaBulan(m)) + '</option>'; }).join('') + '</select>' +
      '<button type="button" class="tbl" id="lpExcel">Unduh Excel</button><button type="button" class="tbl" id="lpPdf">Cetak / Simpan PDF</button>' +
      (D.berjalan ? '<button type="button" class="tbl" id="lpArsip" title="Simpan posisi stok & bagi hasil saat ini untuk laporan bulan ini">Arsipkan posisi akhir bulan</button>' : '') + '</div></div>';
    if (S.pesan) h += '<div class="msg ' + (S.kelas || 'ok') + '">' + esc(S.pesan) + '</div>';
    if (D.arsip) h += '<p class="lp-cat" style="margin:-6px 0 12px">Arsip posisi akhir bulan dibuat ' + esc(String(D.arsip.dibuat || '').slice(0, 16).replace('T', ' ')) + (D.arsip.oleh ? ' oleh ' + esc(D.arsip.oleh) : '') + '.</p>';
    else if (D.berjalan) h += '<p class="lp-cat" style="margin:-6px 0 12px">Sisa stok dan aset per lokasi di bawah adalah posisi saat ini. Pada tanggal terakhir bulan (setelah hitung fisik), tekan "Arsipkan posisi akhir bulan" supaya laporan ' + esc(namaBulan(D.bulan)) + ' tetap bisa dibuka bulan depan.</p>';
    h += '<div class="lp-kp"><div><span>Omzet</span><b>' + rp(H.omzet) + '</b><small>semua saluran</small></div>' +
      '<div><span>Uang keluar (3 sumber dana)</span><b>' + rp(H.keluar) + '</b><small>Rekening Belanja, ShopeePay, Kas Tunai</small></div>' +
      '<div><span>Total penerimaan</span><b>' + rp(H.terima) + '</b><small>setelah potongan platform & bagian toko</small></div>' +
      '<div><span>Penerimaan bersih</span><b>' + rp(H.bersihOp) + '</b><small>setelah biaya operasional</small></div></div>';
    h += bagian1(D, H) + bagian2(D, H) + bagian3(D) + bagian4(D, H) + bagian5(D, H) + bagian6(D, H);
    h += '<p class="lp-cat lp-print-only">Dicetak dari Master Data Moscow Supplies, ' + tgl(D.hari) + '.</p>';
    el.innerHTML = h;
    var q = function (i) { return el.querySelector('#' + i); };
    q('lpBulan').onchange = function () { S.pesan = ''; muat(el, opsi, this.value); };
    q('lpPdf').onclick = function () { cetak(el); };
    q('lpExcel').onclick = function () { excel(D, H, this); };
    if (q('lpArsip')) q('lpArsip').onclick = async function () {
      if (!confirm('Simpan posisi stok dan bagi hasil saat ini sebagai posisi akhir ' + namaBulan(D.bulan) + '?\nLakukan setelah hitung fisik akhir bulan. Arsip lama bulan ini (kalau ada) diganti.')) return;
      this.disabled = true;
      var r = await opsi.sb.rpc('laporan_arsip_simpan', { p_bulan: D.bulan });
      S.pesan = r.error ? 'Gagal mengarsipkan: ' + r.error.message : (r.data && r.data.pesan) || 'Tersimpan.'; S.kelas = r.error || !(r.data && r.data.ok) ? 'bad' : 'ok';
      muat(el, opsi, D.bulan);
    };
  }

  async function muat(el, opsi, bulan) {
    if (S.memuat) return; S.memuat = true;
    if (S.data) el.style.opacity = '.55';
    var r = await opsi.sb.rpc('laporan_pajak', { p_bulan: bulan || '' });
    S.memuat = false; el.style.opacity = '';
    if (r.error) { el.innerHTML = '<div class="msg bad">Laporan gagal dimuat: ' + esc(r.error.message) + '</div>'; return; }
    S.data = r.data; gambar(el, opsi);
  }

  function cetak(el) {
    var d = el.querySelectorAll('details'), buka = [];
    d.forEach(function (x) { buka.push(x.open); x.open = true; });
    var judul = document.title; document.title = 'Laporan Moscow Supplies ' + namaBulan(S.data.bulan);
    setTimeout(function () {
      window.print();
      document.title = judul;
      d.forEach(function (x, i) { x.open = buka[i]; });
    }, 50);
  }

  function muatXlsx(cb, gagal) {
    if (window.XLSX) { cb(); return; }
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = function () { cb(); }; s.onerror = gagal;
    document.head.appendChild(s);
  }
  function excel(D, H, tombol) {
    tombol.disabled = true; tombol.textContent = 'Menyiapkan…';
    muatXlsx(function () {
      try {
        var wb = XLSX.utils.book_new(), nb = namaBulan(D.bulan);
        var tambah = function (nama, aoa, lebar) { var ws = XLSX.utils.aoa_to_sheet(aoa); ws['!cols'] = (lebar || []).map(function (w) { return { wch: w }; }); XLSX.utils.book_append_sheet(wb, ws, nama); };
        tambah('Ringkasan', [['Laporan bulanan Moscow Supplies (PT. Toentoenan Langkah Elohim)'], ['Bulan', nb], ['Periode', D.dari + ' s/d ' + D.sampai], [],
          ['Omzet (semua saluran)', H.omzet], ['Uang keluar (Rekening Belanja, ShopeePay, Kas Tunai)', H.keluar], ['Total penerimaan', H.terima],
          ['Biaya operasional', H.op], ['Penerimaan bersih setelah biaya operasional', H.bersihOp], ['Pembelian barang & bahan', H.beli], ['Setelah biaya operasional & pembelian', H.bersihSemua]], [52, 22]);
        var o = [['Kelompok', 'Saluran', 'Pesanan / penjualan', 'Pcs', 'Retur', 'Omzet bersih', 'Keterangan']];
        D.omzet.official.forEach(function (x) { o.push(['Official', NAMA_PF[x.pf], x.psn, x.pcs, -x.ret, x.v, x.akhir ? 'data s/d ' + x.akhir : 'belum ada file']); });
        H.cons.forEach(function (x) { o.push(['Consignment', x.toko, x.jual, x.pcs, -x.retur, x.bersih, 'penjualan dilaporkan staf']); });
        o.push(['Toko Offline', 'Toko Offline', H.offl.jual, H.offl.pcs, -H.offl.retur, H.offl.bersih, '']);
        D.omzet.reseller.forEach(function (x) { o.push(['Reseller (dibayar)', x.no + ' ' + x.pel, x.t, x.pcs, 0, x.v, x.st]); });
        o.push([], ['TOTAL OMZET', '', '', '', '', H.omzet]);
        tambah('1 Omzet', o, [18, 30, 18, 8, 12, 16, 26]);
        var k = [['Sumber dana', 'Jenis', 'Tanggal', 'No', 'Kategori / akun', 'Keterangan', 'Dicatat oleh', 'Nominal']];
        D.keluar.forEach(function (a) {
          a.topup.forEach(function (t) { k.push([a.akun, 'Top up masuk', t.t, t.no, 'dari ' + t.dari, t.ket || '', '', t.v]); });
          a.list.forEach(function (t) { k.push([a.akun, 'Uang keluar', t.t, t.no, t.k || '', t.ket || '', t.o || '', t.v]); });
          a.pindah.forEach(function (t) { k.push([a.akun, 'Pindah dana keluar', t.t, t.no, 'ke ' + t.ke, t.ket || '', '', t.v]); });
          k.push([a.akun, 'TOTAL UANG KELUAR', '', '', '', '', '', a.total], []);
        });
        tambah('2 Pengeluaran', k, [18, 20, 12, 16, 30, 44, 18, 14]);
        var p = [['Kelompok', 'Kode / jenis', 'Nama', 'Dipakai', 'Rusak', 'Satuan', 'Harga satuan', 'Nilai']];
        D.pakai.bahan.forEach(function (x) { p.push(['Bahan baku', x.k, x.n, x.q, '', x.s || '', x.h || '', x.v || '']); });
        D.pakai.kemasan.forEach(function (x) { p.push(['Botol, stiker & packaging', x.j || '', x.n, x.q, x.rusak, '', x.h || '', x.v || '']); });
        p.push([], ['Pembelian bahan baku bulan ini (Accounting)', '', '', '', '', '', '', D.pakai.beli['Pembelian bahan baku'] || 0], ['Pembelian botol, stiker & kemasan bulan ini (Accounting)', '', '', '', '', '', '', D.pakai.beli['Botol, stiker & kemasan'] || 0]);
        tambah('3 Pemakaian', p, [26, 14, 34, 10, 8, 8, 14, 14]);
        var st = H.P.stok, s4 = [['Kode', 'Produk', 'Kategori', 'Sisa (pcs)', 'HPP', 'Nilai']];
        if (st) st.barang.filter(function (b) { return b.tot > 0; }).forEach(function (b) { s4.push([b.k, b.n, b.kat || '', b.tot, b.hpp || '', b.hpp > 0 ? b.tot * b.hpp : '']); });
        else s4.push(['Posisi stok tidak tersedia (arsip akhir bulan belum dibuat)']);
        s4.push([], ['PRODUK BERTAMBAH ' + nb.toUpperCase()], ['Tanggal', 'Kode', 'Produk', 'Qty', 'Sumber', 'Keterangan']);
        (D.tambah || []).forEach(function (x) { s4.push([x.t, x.k, x.n, x.q, x.sumber, x.ket]); });
        tambah('4 Stok', s4, [12, 12, 40, 12, 22, 60]);
        var t5 = [['Sumber', 'Penjualan', 'Potongan platform', 'Diterima Moscow', 'Keterangan']];
        D.omzet.official.forEach(function (x) { t5.push(['Official ' + NAMA_PF[x.pf], x.v, '', x.v, 'potongan platform Official belum tercatat']); });
        (H.P.bh || []).forEach(function (t) { t5.push([t.toko, t.penjualan || t.omzet || 0, -(t.potongan || 0), t.moscow || 0, 'modal HPP ' + (t.hpp || 0) + ' + biaya ditalangi ' + jml(t.biaya, function (x) { return x.nom; }) + ' + bagian profit Moscow ' + (100 - (t.persen || 0)) + '% ' + (t.moscowBagian || 0)]); });
        t5.push(['Toko Offline', H.offl.bersih, '', H.offl.bersih, ''], ['Reseller (dibayar)', H.res, '', H.res, ''], [], ['TOTAL PENERIMAAN', '', '', H.terima],
          ['Biaya operasional', '', '', -H.op], ['PENERIMAAN BERSIH setelah biaya operasional', '', '', H.bersihOp], ['Pembelian barang & bahan', '', '', -H.beli], ['Setelah biaya operasional & pembelian', '', '', H.bersihSemua], [], ['Pengeluaran per kelompok']);
        (D.kelompok || []).forEach(function (x) { t5.push([x.kel, '', '', x.v, (x.det || []).join(', ')]); });
        if ((D.dana || []).length) { t5.push([], ['Dana cair consignment', 'Pendapatan', 'Biaya platform', 'Dana cair', 'Platform']); D.dana.forEach(function (x) { t5.push([x.toko, x.pend, x.biaya, x.cair, x.pf]); }); }
        tambah('5 Penerimaan bersih', t5, [44, 16, 18, 18, 50]);
        var t6 = [['Lokasi', 'Kode', 'Produk', 'Qty', 'HPP', 'Nilai']];
        if (st) {
          var N = nilaiLokasi(st), ids = URUT_LOK.filter(function (id) { return N[id]; });
          ids.forEach(function (id) {
            st.barang.filter(function (b) { return Number(b.q && b.q[id]) > 0; }).forEach(function (b) { var q = Number(b.q[id]); t6.push([namaLok(st, id), b.k, b.n, q, b.hpp || '', b.hpp > 0 ? q * b.hpp : '']); });
            t6.push([namaLok(st, id), 'TOTAL', '', N[id].q, '', N[id].v], []);
          });
        } else t6.push(['Posisi stok per lokasi tidak tersedia (arsip akhir bulan belum dibuat)']);
        tambah('6 Aset per lokasi', t6, [22, 12, 40, 10, 12, 16]);
        XLSX.writeFile(wb, 'Laporan Moscow Supplies ' + nb + '.xlsx');
      } catch (e) { alert('Gagal membuat Excel: ' + e.message); }
      tombol.disabled = false; tombol.textContent = 'Unduh Excel';
    }, function () { tombol.disabled = false; tombol.textContent = 'Unduh Excel'; alert('Gagal memuat pembuat Excel. Periksa internet lalu coba lagi.'); });
  }

  window.LaporanPajak = { gambar: gambar, segarkan: function (el, opsi) { S.data = null; gambar(el, opsi); } };
})();
