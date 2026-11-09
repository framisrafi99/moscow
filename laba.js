/* Laporan laba bersih per periode (Kendali Bisnis & Master Data). Angka dibaca dari tabel laporan_laba lewat RPC
 * laporan_laba_baca (hanya manajemen & kendali bisnis). Tidak ada angka keuangan di file ini.
 * Tampilan: kepala navy bergaya perusahaan, tiga angka utama, grafik laba per bulan (bisa diklik),
 * dua diagram donat (pendapatan per saluran, pengeluaran per pos), ringkasan, tabel per bulan, unduh PDF/CSV. */
(function () {
  var BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var BLN3 = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var WARNA = ['#0C1F40', '#1E78A8', '#5FA8D3', '#E8833A', '#146C43', '#C9A227', '#8EA3C4', '#B42318', '#6B4FA0', '#2F8F83'];
  var PT = 'PT. Toentoenan Langkah Elohim';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function angka(n, des) { return Math.abs(n).toLocaleString('id-ID', { minimumFractionDigits: des, maximumFractionDigits: des }); }
  function jt(n, tanda) {
    var v = Math.round((Number(n) || 0) / 1e5) / 10;
    return (v < 0 ? '−' : (tanda && v > 0 ? '+' : '')) + angka(v, 1) + ' jt';
  }
  function jtA(n) { var v = Math.round((Number(n) || 0) / 1e5) / 10; return Math.round(v * 10) ? (v < 0 ? '−' : '') + angka(v, 1) : '–'; }
  function rpL(n) { n = Math.round(Number(n) || 0); return (n < 0 ? '−' : '') + 'Rp ' + Math.abs(n).toLocaleString('id-ID'); }
  function rpA(n) { n = Math.round(Number(n) || 0); return n ? (n < 0 ? '−' : '') + Math.abs(n).toLocaleString('id-ID') : '–'; }
  var SAT = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
  function tb(n) {
    n = Math.floor(n); var sisa = function (x, d) { return x % d ? ' ' + tb(x % d) : ''; };
    if (n < 12) return SAT[n];
    if (n < 20) return tb(n - 10) + ' belas';
    if (n < 100) return tb(n / 10) + ' puluh' + sisa(n, 10);
    if (n < 200) return 'seratus' + sisa(n, 100);
    if (n < 1000) return tb(n / 100) + ' ratus' + sisa(n, 100);
    if (n < 2000) return 'seribu' + sisa(n, 1000);
    if (n < 1e6) return tb(n / 1000) + ' ribu' + sisa(n, 1000);
    if (n < 1e9) return tb(n / 1e6) + ' juta' + sisa(n, 1e6);
    if (n < 1e12) return tb(n / 1e9) + ' miliar' + sisa(n, 1e9);
    return tb(n / 1e12) + ' triliun' + sisa(n, 1e12);
  }
  function terbilang(n) { n = Math.round(Number(n) || 0); if (!n) return 'Nol rupiah'; var t = (n < 0 ? 'minus ' : '') + tb(Math.abs(n)) + ' rupiah'; return t.charAt(0).toUpperCase() + t.slice(1); }
  function pr(a, b) { return b ? angka(Math.round(a / b * 1000) / 10, 1) + '%' : '–'; }
  function jml(L) { return (L || []).reduce(function (a, x) { return a + (Number(x[1]) || 0); }, 0); }
  function nmBln(b) { return BLN[Number(String(b).slice(5, 7)) - 1] || b; }
  function bln3(b) { return BLN3[Number(String(b).slice(5, 7)) - 1] || b; }
  function hitung(m) {
    var o = { pend: jml(m.pend), pot: jml(m.potmp), beli: jml(m.beli), biaya: jml(m.biaya), bonus: Number(m.bonus) || 0 };
    o.usaha = o.pend - o.pot - o.beli - o.biaya; o.bersih = o.usaha - o.bonus; return o;
  }
  function gabung(bulan, kunci) {
    var urut = [], idx = {};
    bulan.forEach(function (m) { (m[kunci] || []).forEach(function (x) { if (!(x[0] in idx)) { idx[x[0]] = urut.length; urut.push([x[0], 0]); } urut[idx[x[0]]][1] += Number(x[1]) || 0; }); });
    return urut.filter(function (x) { return Math.round(x[1]); });
  }
  function pendekNama(n) { return String(n).replace(/\s*\(.*\)$/, ''); }

  // ---------- Olah data ----------
  function olah(lap) {
    var isi = lap.isi || {}, bulan = isi.bulan || [], stok = isi.stok || {};
    var H = bulan.map(hitung), T = { pend: 0, pot: 0, beli: 0, biaya: 0, bonus: 0, usaha: 0 };
    H.forEach(function (h) { Object.keys(T).forEach(function (k) { T[k] += h[k]; }); });
    var dStok = (Number(stok.akhir) || 0) - (Number(stok.awal) || 0), usaha = T.usaha + dStok;
    var pend = gabung(bulan, 'pend'), pot = gabung(bulan, 'potmp'), beli = gabung(bulan, 'beli'), biaya = gabung(bulan, 'biaya');
    var keluar = [['Potongan marketplace', T.pot]].concat(beli).concat(biaya).map(function (x) { return [pendekNama(x[0]), x[1]]; });
    return {
      lap: lap, isi: isi, bulan: bulan, stok: stok, H: H, T: T, dStok: dStok, usaha: usaha, bersih: usaha - T.bonus,
      pend: pend, pot: pot, beli: beli, biaya: biaya,
      dPend: pend.map(function (x, i) { return { n: x[0], v: x[1], c: WARNA[i % WARNA.length] }; }),
      dKeluar: keluar.map(function (x, i) { return { n: x[0], v: x[1], c: WARNA[i % WARNA.length] }; }),
      bonusBln: bulan.filter(function (m) { return Number(m.bonus); }).map(function (m) { return bln3(m.b) + ' ' + jt(m.bonus).replace(' jt', ''); }).join(' · '),
      sal: saluran(bulan),
      aset: bulan.reduce(function (a, m) { return a + (Number(m.aset) || 0); }, 0),
      periode: bulan.length ? nmBln(bulan[0].b) + ' – ' + nmBln(bulan[bulan.length - 1].b) + ' ' + String(bulan[bulan.length - 1].b).slice(0, 4) : '',
      dibuat: new Date(lap.dibuat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    };
  }

  // ---------- Diagram donat (SVG) ----------
  function donat(items, id, interaktif) {
    var tot = items.reduce(function (a, x) { return a + Math.max(0, x.v); }, 0), R = 70, K = 2 * Math.PI * R, jalan = 0;
    var seg = items.map(function (x, i) {
      var p = tot ? Math.max(0, x.v) / tot : 0, pj = p * K, celah = items.length > 1 && pj > 3 ? 1.5 : 0;
      var s = '<circle class="lb-sg" data-i="' + i + '" r="' + R + '" cx="100" cy="100" fill="none" stroke="' + x.c + '" stroke-width="30" stroke-dasharray="' +
        Math.max(0, pj - celah).toFixed(2) + ' ' + K.toFixed(2) + '" stroke-dashoffset="' + (-jalan).toFixed(2) + '" transform="rotate(-90 100 100)"' +
        (interaktif ? ' tabindex="0" role="button" aria-label="' + esc(x.n + ' ' + jt(x.v) + ', ' + pr(x.v, tot)) + '"' : '') + '><title>' + esc(x.n + ': ' + jt(x.v) + ' (' + pr(x.v, tot) + ')') + '</title></circle>';
      jalan += pj; return s;
    }).join('');
    return '<svg class="lb-donat" id="' + id + '" viewBox="0 0 200 200" role="img" aria-label="Diagram donat">' + seg +
      '<text class="lb-dn1" x="100" y="92" text-anchor="middle">Total</text><text class="lb-dn2" x="100" y="114" text-anchor="middle">' + esc(jt(tot)) + '</text>' +
      '<text class="lb-dn3" x="100" y="132" text-anchor="middle"></text></svg>';
  }
  function legenda(items, id, interaktif) {
    var tot = items.reduce(function (a, x) { return a + Math.max(0, x.v); }, 0);
    return '<ul class="lb-lg" id="' + id + '">' + items.map(function (x, i) {
      var isi = '<i style="background:' + x.c + '"></i><span class="n">' + esc(x.n) + '</span><span class="v angka">' + jt(x.v) + '</span><span class="p angka">' + pr(x.v, tot) + '</span>';
      return '<li>' + (interaktif ? '<button type="button" data-i="' + i + '">' + isi + '</button>' : isi) + '</li>';
    }).join('') + '</ul>';
  }

  // ---------- Grafik batang laba per bulan (SVG) ----------
  function batang(M, interaktif, sempit) {
    var W = sempit ? 360 : 660, Hh = sempit ? 230 : 260, kiri = 46, kanan = 8, atas = 14, bawah = 30, n = M.H.length || 1;
    var nilai = []; M.H.forEach(function (h) { nilai.push(h.usaha, h.bersih); });
    var maks = Math.max.apply(null, nilai.concat([0])), min = Math.min.apply(null, nilai.concat([0]));
    var langkah = 50e6; while ((maks - min) / langkah > 6) langkah *= 2;
    maks = Math.ceil(maks / langkah) * langkah || langkah; min = Math.floor(min / langkah) * langkah;
    var tinggi = Hh - atas - bawah, y = function (v) { return atas + (maks - v) / (maks - min) * tinggi; };
    var lebarKol = (W - kiri - kanan) / n, bw = Math.min(22, lebarKol * 0.3), s = '';
    for (var g = min; g <= maks + 1; g += langkah) {
      s += '<line x1="' + kiri + '" x2="' + (W - kanan) + '" y1="' + y(g).toFixed(1) + '" y2="' + y(g).toFixed(1) + '" class="' + (g === 0 ? 'lb-nol' : 'lb-grid') + '"/>' +
        '<text x="' + (kiri - 8) + '" y="' + (y(g) + 4).toFixed(1) + '" text-anchor="end" class="lb-sumbu">' + Math.round(g / 1e6) + '</text>';
    }
    M.H.forEach(function (h, i) {
      var cx = kiri + lebarKol * (i + 0.5), y0 = y(0);
      var bar = function (v, x, kelas) { var a = y(Math.max(v, 0)), b = y(Math.min(v, 0)); return '<rect class="' + kelas + (v < 0 ? ' neg' : '') + '" x="' + x.toFixed(1) + '" y="' + a.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(1, b - a).toFixed(1) + '" rx="3"/>'; };
      s += '<g class="lb-kol" data-m="' + i + '"' + (interaktif ? ' tabindex="0" role="button" aria-label="' + esc(nmBln(M.bulan[i].b) + ': laba usaha ' + jt(h.usaha) + ', laba bersih ' + jt(h.bersih)) + '"' : '') + '>' +
        '<rect class="lb-hit" x="' + (cx - lebarKol / 2).toFixed(1) + '" y="' + atas + '" width="' + lebarKol.toFixed(1) + '" height="' + (tinggi + bawah) + '"/>' +
        bar(h.usaha, cx - bw - 1.5, 'lb-b1') + bar(h.bersih, cx + 1.5, 'lb-b2') +
        (h.bonus ? '<circle cx="' + cx.toFixed(1) + '" cy="' + (y(Math.max(h.usaha, 0)) - 9).toFixed(1) + '" r="3.5" class="lb-tb"/>' : '') +
        '<text x="' + cx.toFixed(1) + '" y="' + (Hh - 10) + '" text-anchor="middle" class="lb-bl3">' + bln3(M.bulan[i].b) + '</text></g>';
      void y0;
    });
    return '<svg class="lb-bt" viewBox="0 0 ' + W + ' ' + Hh + '" role="img" aria-label="Grafik laba usaha dan laba bersih per bulan, juta rupiah">' + s + '</svg>';
  }
  function rinciBulan(M, i) {
    var m = M.bulan[i], h = M.H[i]; if (!m) return '';
    var top = (m.pend || []).slice().sort(function (a, b) { return b[1] - a[1]; }).slice(0, 3).map(function (x) { return esc(pendekNama(x[0])) + ' ' + jt(x[1]); }).join(' · ');
    var br = function (n, v, kelas, minus) { return '<tr class="' + (kelas || '') + '"><td>' + n + '</td><td class="r angka">' + (minus && v ? '−' : '') + jt(minus ? Math.abs(v) : v) + '</td></tr>'; };
    return '<div class="lb-rb-kp"><b>' + esc(nmBln(m.b) + ' ' + m.b.slice(0, 4)) + '</b><span>Margin laba usaha ' + pr(h.usaha, h.pend) + '</span></div>' +
      '<table class="lb-rb"><tbody>' + br('Pendapatan', h.pend) + br('Potongan marketplace', h.pot, '', true) + br('Pembelian barang & bahan', h.beli, '', true) +
      br('Biaya usaha', h.biaya, '', true) + br('Laba usaha', h.usaha, 'sub') + (h.bonus ? br('Bonus direksi', h.bonus, '', true) : '') + br('Laba bersih', h.bersih, 'akhir') +
      '</tbody></table><p class="lb-rb-ket">Penjualan terbesar: ' + top + '</p>';
  }


  // ---------- Penjualan per saluran (penjualan, potongan, diterima bersih) ----------
  var KEL = [
    { n: 'Shopee', c: '#E8833A', cocok: /^shopee/i },
    { n: 'Tokopedia/TikTok', c: '#146C43', cocok: /^tokopedia|tiktok/i },
    { n: 'Lazada', c: '#6B4FA0', cocok: /^lazada/i },
    { n: 'Consignment', c: '#1E78A8', cocok: /^consignment/i, anak: true, ket: 'Bagi hasil yang diterima Moscow; bagian toko consignment tidak tercatat.' },
    { n: 'Toko offline', c: '#0C1F40', cocok: /^toko offline/i, ket: 'Potongan QRIS ±0,3%, tidak dipisahkan.' },
    { n: 'Reseller & lainnya', c: '#8EA3C4', cocok: /reseller|pembeli lain/i, ket: 'Diskon reseller tidak tercatat terpisah.' }
  ];
  function kelOf(nama) { for (var i = 0; i < KEL.length; i++) if (KEL[i].cocok.test(nama)) return i; return KEL.length - 1; }
  function potKel(nama) { var t = String(nama).replace(/^potongan\s+/i, ''); for (var i = 0; i < 3; i++) if (KEL[i].cocok.test(t)) return i; return -1; }
  function saluran(bulan) {
    var bar = KEL.map(function (k) { return { n: k.n, c: k.c, ket: k.ket || '', jual: 0, pot: 0, anak: {}, bln: bulan.map(function () { return { jual: 0, pot: 0 }; }) }; });
    bulan.forEach(function (m, i) {
      (m.pend || []).forEach(function (x) { var k = kelOf(x[0]), v = Number(x[1]) || 0; bar[k].jual += v; bar[k].bln[i].jual += v; if (KEL[k].anak) bar[k].anak[x[0]] = (bar[k].anak[x[0]] || 0) + v; });
      (m.potmp || []).forEach(function (x) { var k = potKel(x[0]), v = Number(x[1]) || 0; if (k < 0) return; bar[k].pot += v; bar[k].bln[i].pot += v; });
    });
    var tot = bar.reduce(function (a, b) { return a + b.jual; }, 0);
    bar.forEach(function (b) { b.bersih = b.jual - b.pot; b.porsi = tot ? b.jual / tot : 0; b.adaPot = KEL.indexOf(KEL.filter(function (k) { return k.n === b.n; })[0]) < 3; });
    return { daftar: bar.filter(function (b) { return Math.round(b.jual); }), tot: tot };
  }
  function tabelSaluran(M) {
    var S = M.sal, tj = 0, tp = 0;
    var rows = S.daftar.map(function (b) {
      tj += b.jual; tp += b.pot;
      var r = '<tr><td><i class="lb-tt" style="background:' + b.c + '"></i>' + esc(b.n) + (b.ket ? '<small>' + esc(b.ket) + '</small>' : '') + '</td>' +
        '<td class="angka">' + rpA(b.jual) + '</td><td class="angka">' + (b.adaPot ? '−' + rpA(b.pot) : '–') + '</td><td class="angka"><b>' + rpA(b.bersih) + '</b></td>' +
        '<td class="angka">' + (b.adaPot ? pr(b.pot, b.jual) : '–') + '</td><td class="angka">' + pr(b.jual, S.tot) + '</td></tr>';
      Object.keys(b.anak).forEach(function (n) { r += '<tr class="anak"><td>' + esc(n.replace(/^Consignment\s+/i, '')) + '</td><td class="angka">' + rpA(b.anak[n]) + '</td><td class="angka">–</td><td class="angka">' + rpA(b.anak[n]) + '</td><td></td><td class="angka">' + pr(b.anak[n], S.tot) + '</td></tr>'; });
      return r;
    }).join('');
    return '<table class="lb-sl"><thead><tr><th>Saluran</th><th>Penjualan</th><th>Potongan</th><th>Diterima bersih</th><th>% potongan</th><th>Bagian</th></tr></thead><tbody>' + rows +
      '<tr class="akhir"><td>Total</td><td class="angka">' + rpA(tj) + '</td><td class="angka">−' + rpA(tp) + '</td><td class="angka">' + rpA(tj - tp) + '</td><td class="angka">' + pr(tp, tj) + '</td><td class="angka">100%</td></tr></tbody></table>';
  }
  function grafikSaluran(M, interaktif, sempit) {
    var D = M.sal.daftar, n = M.bulan.length || 1, W = sempit ? 360 : 660, Hh = sempit ? 230 : 250, kiri = 46, kanan = 8, atas = 12, bawah = 30;
    var totB = M.bulan.map(function (m, i) { return D.reduce(function (a, b) { return a + b.bln[i].jual; }, 0); });
    var maks = Math.max.apply(null, totB.concat([1])), langkah = 100e6; while (maks / langkah > 6) langkah *= 2; maks = Math.ceil(maks / langkah) * langkah;
    var tinggi = Hh - atas - bawah, y = function (v) { return atas + (maks - v) / maks * tinggi; }, lk = (W - kiri - kanan) / n, bw = Math.min(34, lk * 0.62), s = '';
    for (var g = 0; g <= maks + 1; g += langkah) s += '<line x1="' + kiri + '" x2="' + (W - kanan) + '" y1="' + y(g).toFixed(1) + '" y2="' + y(g).toFixed(1) + '" class="' + (g ? 'lb-grid' : 'lb-nol') + '"/><text x="' + (kiri - 8) + '" y="' + (y(g) + 4).toFixed(1) + '" text-anchor="end" class="lb-sumbu">' + Math.round(g / 1e6) + '</text>';
    M.bulan.forEach(function (m, i) {
      var cx = kiri + lk * (i + 0.5), dasar = 0, tumpuk = '';
      D.forEach(function (b, k) { var v = b.bln[i].jual; if (v <= 0) return; tumpuk += '<rect class="lb-st" data-k="' + k + '" x="' + (cx - bw / 2).toFixed(1) + '" y="' + y(dasar + v).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(0.6, y(dasar) - y(dasar + v)).toFixed(1) + '" fill="' + b.c + '"/>'; dasar += v; });
      s += '<g class="lb-kol2" data-m="' + i + '"' + (interaktif ? ' tabindex="0" role="button" aria-label="' + esc(nmBln(m.b) + ': penjualan ' + jt(totB[i])) + '"' : '') + '><rect class="lb-hit" x="' + (cx - lk / 2).toFixed(1) + '" y="' + atas + '" width="' + lk.toFixed(1) + '" height="' + (tinggi + bawah) + '"/>' + tumpuk +
        '<text x="' + cx.toFixed(1) + '" y="' + (Hh - 10) + '" text-anchor="middle" class="lb-bl3">' + bln3(m.b) + '</text></g>';
    });
    var lg = '<div class="lb-lgk lb-lgs">' + D.map(function (b, k) { return interaktif ? '<button type="button" data-k="' + k + '"><i style="background:' + b.c + '"></i>' + esc(b.n) + '</button>' : '<span><i style="background:' + b.c + '"></i>' + esc(b.n) + '</span>'; }).join('') + '</div>';
    return '<svg class="lb-bt lb-sgr" viewBox="0 0 ' + W + ' ' + Hh + '" role="img" aria-label="Grafik penjualan per bulan per saluran, juta rupiah">' + s + '</svg>' + lg;
  }
  function rinciSaluranBulan(M, i) {
    var m = M.bulan[i]; if (!m) return '';
    var D = M.sal.daftar, tj = 0, tp = 0;
    var rows = D.map(function (b) { var x = b.bln[i]; tj += x.jual; tp += x.pot; if (!Math.round(x.jual)) return ''; return '<tr><td><i class="lb-tt" style="background:' + b.c + '"></i>' + esc(b.n) + '</td><td class="r angka">' + jtA(x.jual) + '</td><td class="r angka">' + (b.adaPot ? '−' + jtA(x.pot) : '–') + '</td><td class="r angka"><b>' + jtA(x.jual - x.pot) + '</b></td></tr>'; }).join('');
    return '<div class="lb-rb-kp"><b>' + esc(nmBln(m.b) + ' ' + m.b.slice(0, 4)) + '</b><span>juta rupiah</span></div><table class="lb-rb lb-rb4"><thead><tr><th></th><th>Jual</th><th>Potongan</th><th>Bersih</th></tr></thead><tbody>' + rows +
      '<tr class="akhir"><td>Total</td><td class="r angka">' + jtA(tj) + '</td><td class="r angka">−' + jtA(tp) + '</td><td class="r angka">' + jtA(tj - tp) + '</td></tr></tbody></table>';
  }

  // ---------- Tangga ringkasan & tabel per bulan (dipakai layar dan PDF) ----------
  function tangga(M) {
    var baris = function (nama, ket, nilai, kelas, tanda) {
      var kata = /sub|akhir/.test(kelas || '') || /^Bonus/.test(nama) ? '<tr class="lb-kata"><td colspan="2">' + esc((tanda === '−' ? 'Minus ' + terbilang(Math.abs(nilai)).toLowerCase() : terbilang(Math.abs(nilai)))) + '</td></tr>' : '';
      return '<tr class="' + (kelas || '') + (kata ? ' ada-kata' : '') + '"><td>' + esc(nama) + (ket ? '<small>' + esc(ket) + '</small>' : '') + '</td><td class="r angka">' + (tanda || '') + rpL(Math.abs(nilai)) + '</td></tr>' + kata;
    };
    var anak = function (L) { return L.map(function (x) { return '<tr class="anak"><td>' + esc(x[0]) + '</td><td class="r angka">' + rpL(x[1]) + '</td></tr>'; }).join(''); };
    var T = M.T, st = M.stok;
    return '<table class="lb-tg"><tbody>' +
      baris('Pendapatan penjualan', 'Semua uang hasil penjualan dari marketplace, consignment, toko dan reseller.', T.pend, 'sub') + anak(M.pend) +
      baris('Potongan marketplace', 'Biaya admin, komisi, ongkir dan iklan yang dipotong langsung oleh Shopee, Tokopedia/TikTok dan Lazada.', T.pot, 'min', '−') + anak(M.pot) +
      baris('Pembelian barang & bahan', 'Barang dagang, bahan baku dan kemasan yang dibeli.', T.beli, 'min', '−') + anak(M.beli) +
      baris('Biaya usaha', 'Iklan, gaji karyawan, pajak dan operasional.', T.biaya, 'min', '−') + anak(M.biaya) +
      baris('Kenaikan stok barang', 'Stok barang naik dari ' + jt(st.awal) + ' (1 Jan) ke ' + jt(st.akhir) + ' (31 Okt). Barang yang dibeli tapi belum terjual masih jadi milik usaha.', M.dStok, 'min', M.dStok < 0 ? '−' : '+') +
      baris('Laba usaha (sebelum bonus direksi)', 'Hasil usaha yang sebenarnya, sebelum dibagikan ke direksi.', M.usaha, 'sub') +
      baris('Bonus direksi', M.isi.bonus_ket || '', T.bonus, 'min', '−') +
      baris('Laba bersih setelah bonus direksi', 'Laba usaha dikurangi bonus direksi ' + jt(T.bonus) + '.', M.bersih, 'akhir') + '</tbody></table>';
  }
  function tabelBulan(M) {
    var sel = function (v, tebal, biasa) { var s = jtA(v); return '<td class="angka' + (v < 0 && !biasa ? ' neg' : '') + '">' + (tebal ? '<b>' + s + '</b>' : s) + '</td>'; };
    var br = function (nama, ambil, kelas, minus) {
      var tot = 0; return '<tr class="' + (kelas || '') + '"><td>' + esc(nama) + '</td>' + M.H.map(function (x) { var v = ambil(x); v = minus ? -v : v; tot += v; return sel(v, false, minus); }).join('') + sel(tot, true, minus) + '</tr>';
    };
    return '<table class="lb-bl"><thead><tr><th></th>' + M.bulan.map(function (m) { return '<th>' + bln3(m.b) + '</th>'; }).join('') + '<th>Total</th></tr></thead><tbody>' +
      br('Pendapatan', function (x) { return x.pend; }) + br('Potongan marketplace', function (x) { return x.pot; }, '', true) +
      br('Pembelian barang & bahan', function (x) { return x.beli; }, '', true) + br('Biaya usaha', function (x) { return x.biaya; }, '', true) +
      br('Laba usaha', function (x) { return x.usaha; }, 'sub') + br('Bonus direksi', function (x) { return x.bonus; }, '', true) +
      br('Laba bersih', function (x) { return x.bersih; }, 'akhir') + '</tbody></table>';
  }
  function catatan(M) { return '<ul class="lb-cat">' + (M.isi.catatan || []).concat([M.stok.ket || '']).filter(Boolean).map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul>'; }

  // ---------- Gaya layar ----------
  var CSS =
    '.lb{--lbN:#0C1F40;--lbB:#1E78A8;display:flex;flex-direction:column;gap:16px}' +
    '.lb-kop{background:var(--lbN);color:#fff;border-radius:18px;padding:22px 24px;display:flex;flex-wrap:wrap;gap:18px 24px;align-items:center;justify-content:space-between;position:relative;overflow:hidden}' +
    '.lb-kop::after{content:"";position:absolute;right:-60px;top:-60px;width:220px;height:220px;border-radius:50%;border:34px solid rgba(255,255,255,.05);pointer-events:none}' +
    '.lb-kop .kiri{display:flex;flex-direction:column;gap:6px;min-width:0}.lb-kop img{height:34px;width:auto;align-self:flex-start;margin-bottom:6px}' +
    '.lb-kop h2{margin:0;font-size:24px;font-weight:800;letter-spacing:-.02em;line-height:1.15}.lb-kop p{margin:0;font-size:13px;color:#B9C6DB}' +
    '.lb-kop .tb{display:flex;gap:8px;flex-wrap:wrap;position:relative;z-index:1}' +
    '.lb-kop .tb button{height:42px;padding:0 18px;border-radius:11px;font:inherit;font-size:14px;font-weight:700;cursor:pointer;border:1px solid rgba(255,255,255,.28);background:transparent;color:#fff}' +
    '.lb-kop .tb button.utama{background:#fff;color:var(--lbN);border-color:#fff}.lb-kop .tb button:disabled{opacity:.55;cursor:default}' +
    '.lb-kpi{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}' +
    '.lb-kpi .k{border:1px solid var(--garis);border-radius:16px;padding:16px 18px;background:var(--kartu);border-top:4px solid var(--lbB)}' +
    '.lb-kpi .k.bonus{border-top-color:#B42318}.lb-kpi .k.utama{background:var(--lbN);border-color:var(--lbN);border-top-color:#5FA8D3;color:#fff}' +
    '.lb-kpi .n{font-size:13px;font-weight:600;color:var(--abu)}.lb-kpi .k.utama .n,.lb-kpi .k.utama .s{color:#B9C6DB}' +
    '.lb-kpi .lb-kt{font-size:12px;font-style:italic;margin-top:4px;color:var(--teks2);line-height:1.35}.lb-kpi .k.utama .lb-kt{color:#DCE6F5}.lb-tg tr.lb-kata td{padding:0 0 9px;text-align:right;font-size:12px;font-style:italic;color:var(--abu);border-bottom:1px solid var(--garis2)}.lb-tg tr.ada-kata td{border-bottom:0}.lb-tg tr.akhir+tr.lb-kata td{border-bottom:0;color:var(--lbN)}' +
    '.lb-kpi .v{font-size:23px;font-weight:800;letter-spacing:-.02em;margin-top:6px;line-height:1.1}.lb-kpi .s{font-size:12.5px;color:var(--abu);margin-top:6px}' +
    '.lb .cd{margin:0}.lb .cd h3{font-size:16.5px}' +
    '.lb-bt{width:100%;height:auto;display:block;font-family:inherit}.lb-grid{stroke:var(--garis2)}.lb-nol{stroke:#9AA6B6}.lb-sumbu{font-size:11px;fill:var(--abu)}' +
    '.lb-b1{fill:var(--lbN)}.lb-b2{fill:var(--lbB)}.lb-b2.neg{fill:#B42318}.lb-tb{fill:#B42318}.lb-bl3{font-size:12px;fill:var(--teks2);font-weight:600}' +
    '.lb-hit{fill:transparent}.lb-kol{cursor:pointer;outline:none}.lb-kol:hover .lb-hit,.lb-kol:focus-visible .lb-hit{fill:rgba(30,120,168,.06)}' +
    '.lb-kol.on .lb-hit{fill:rgba(30,120,168,.12)}.lb-kol.on .lb-bl3{fill:var(--lbN);font-weight:800}' +
    '.lb-gr{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(240px,1fr);gap:16px;align-items:start}' +
    '.lb-lgk{display:flex;gap:16px;flex-wrap:wrap;font-size:12.5px;color:var(--teks2)}.lb-lgk i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}' +
    '.lb-rbx{background:var(--latar);border-radius:14px;padding:14px 16px}.lb-rb-kp{display:flex;justify-content:space-between;gap:8px;align-items:baseline;margin-bottom:6px}' +
    '.lb-rb-kp b{font-size:15.5px}.lb-rb-kp span{font-size:12.5px;color:var(--abu)}.lb-rb{width:100%;border-collapse:collapse;font-size:13.5px}' +
    '.lb-rb td{padding:6px 0;border-bottom:1px solid var(--garis)}.lb-rb td.r{text-align:right;white-space:nowrap}.lb-rb tr.sub td{font-weight:800}' +
    '.lb-rb tr.akhir td{font-weight:800;border-bottom:0;font-size:15px}.lb-rb-ket{margin:8px 0 0;font-size:12.5px;color:var(--abu)}' +
    '.lb-dw{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}' +
    '.lb-dk{display:grid;grid-template-columns:170px minmax(0,1fr);gap:14px;align-items:center}' +
    '.lb-donat{width:170px;height:170px;display:block}.lb-sg{cursor:pointer;transition:opacity .15s,stroke-width .15s;outline:none}' +
    '.lb-donat.pilih .lb-sg{opacity:.28}.lb-donat.pilih .lb-sg.on{opacity:1;stroke-width:36}' +
    '.lb-dn1{font-size:11px;fill:var(--abu);font-weight:600}.lb-dn2{font-size:17px;font-weight:800;fill:var(--tinta)}.lb-dn3{font-size:11.5px;fill:var(--lbB);font-weight:700}' +
    '.lb-lg{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px}' +
    '.lb-lg button{width:100%;display:grid;grid-template-columns:12px minmax(0,1fr) auto 48px;gap:8px;align-items:center;padding:6px 8px;border:0;border-radius:8px;background:transparent;font:inherit;font-size:13px;text-align:left;cursor:pointer;color:var(--teks2)}' +
    '.lb-lg button:hover,.lb-lg button.on{background:var(--latar);color:var(--tinta)}.lb-lg i{width:12px;height:12px;border-radius:3px}' +
    '.lb-lg .n{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.lb-lg .v{font-weight:700;white-space:nowrap}.lb-lg .p{color:var(--abu);text-align:right}' +
    '.lb-tg{width:100%;border-collapse:collapse;font-size:14px}.lb-tg td{padding:9px 0;border-bottom:1px solid var(--garis2);vertical-align:top}' +
    '.lb-tg td.r{text-align:right;white-space:nowrap;padding-left:12px;font-weight:700}.lb-tg td small{display:block;color:var(--abu);font-size:12.5px;font-weight:400;margin-top:2px}' +
    '.lb-tg tr.sub td{font-weight:800;border-bottom:2px solid var(--garis)}.lb-tg tr.akhir td{font-weight:800;font-size:16px;border-bottom:0;padding-top:12px}' +
    '.lb-tg tr.akhir td.r{color:var(--lbN)}.lb-tg tr.anak td{padding:5px 0 5px 14px;font-size:13px;color:var(--teks2);border-bottom:0}.lb-tg tr.anak td.r{font-weight:500}' +
    '.lb-bl{width:100%;border-collapse:collapse;font-size:13.5px;min-width:760px}.lb-bl th,.lb-bl td{padding:8px 6px;border-bottom:1px solid var(--garis2);text-align:right;white-space:nowrap}' +
    '.lb-bl th:first-child,.lb-bl td:first-child{text-align:left;position:sticky;left:0;background:var(--kartu)}.lb-bl thead th{font-size:12px;color:#fff;background:var(--lbN)}' +
    '.lb-bl thead th:first-child{background:var(--lbN)}.lb-bl tr.sub td{font-weight:800;background:var(--latar)}.lb-bl tr.akhir td{font-weight:800;border-top:2px solid var(--lbN)}.lb-bl td.neg{color:#B42318}' +
    '.lb-cat{margin:0;padding-left:18px;font-size:13.5px;color:var(--teks2);display:flex;flex-direction:column;gap:6px}' +
    '.lb-sl{width:100%;border-collapse:collapse;font-size:13.5px;min-width:620px}.lb-sl th,.lb-sl td{padding:9px 8px;border-bottom:1px solid var(--garis2);text-align:right;white-space:nowrap;vertical-align:top}' +
    '.lb-sl th:first-child,.lb-sl td:first-child{text-align:left;white-space:normal}.lb-sl thead th{font-size:12px;color:#fff;background:var(--lbN)}.lb-sl td small{display:block;font-size:11.5px;color:var(--abu);margin:2px 0 0 18px}' +
    '.lb-sl tr.anak td{padding:3px 8px;font-size:12.5px;color:var(--teks2);border-bottom:0}.lb-sl tr.anak td:first-child{padding-left:26px}.lb-sl tr.akhir td{font-weight:800;border-top:2px solid var(--lbN)}' +
    '.lb-tt{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:8px;vertical-align:0}' +
    '.lb-kol2{cursor:pointer;outline:none}.lb-kol2:hover .lb-hit,.lb-kol2:focus-visible .lb-hit{fill:rgba(30,120,168,.06)}.lb-kol2.on .lb-hit{fill:rgba(30,120,168,.12)}.lb-kol2.on .lb-bl3{fill:var(--lbN);font-weight:800}' +
    '.lb-st{transition:opacity .15s}.lb-sgr.fokus .lb-st{opacity:.18}.lb-sgr.fokus .lb-st.on{opacity:1}' +
    '.lb-lgs button{border:0;background:transparent;font:inherit;font-size:12.5px;color:var(--teks2);padding:4px 6px;border-radius:7px;cursor:pointer}.lb-lgs button:hover,.lb-lgs button.on{background:var(--latar);color:var(--tinta)}' +
    '.lb-rb4 th{font-size:11.5px;color:var(--abu);text-align:right;padding:4px 0 6px;font-weight:600}.lb-rb4 td{padding:5px 0 5px 8px}.lb-rb4 td:first-child{padding-left:0}' +
    '@media (max-width:860px){.lb-gr,.lb-dw{grid-template-columns:minmax(0,1fr)}}' +
    '@media (max-width:620px){.lb-kpi{grid-template-columns:minmax(0,1fr)}.lb-kop{padding:18px}.lb-kop h2{font-size:20px}.lb-kop .tb{width:100%}.lb-kop .tb button{flex:1}' +
    '.lb-dk{grid-template-columns:minmax(0,1fr);justify-items:center}.lb-dk .lb-lg{width:100%}}';

  function layar(M) {
    var h = '<style>' + CSS + '</style><div class="lb">';
    h += '<div class="lb-kop"><div class="kiri"><img src="logo-putih.png" alt="Moscow Supplies"><h2>Laporan Laba Bersih</h2><p>' + esc(PT) + ' · ' + esc(M.periode) + ' · disusun ' + esc(M.dibuat) + '</p></div>' +
      '<div class="tb"><button type="button" class="utama" data-lbx="pdf">Unduh PDF</button><button type="button" data-lbx="csv">Unduh CSV</button></div></div>';
    h += '<div class="lb-kpi"><div class="k"><div class="n">Laba usaha (sebelum bonus direksi)</div><div class="v angka">' + rpL(M.usaha) + '</div><div class="lb-kt">' + esc(terbilang(M.usaha)) + '</div><div class="s">Margin ' + pr(M.usaha, M.T.pend) + ' dari pendapatan ' + jt(M.T.pend) + '</div></div>' +
      '<div class="k bonus"><div class="n">Bonus direksi</div><div class="v angka">' + rpL(-M.T.bonus) + '</div><div class="lb-kt">Minus ' + esc(terbilang(M.T.bonus).toLowerCase()) + '</div><div class="s">' + esc(M.bonusBln) + '</div></div>' +
      '<div class="k utama"><div class="n">Laba bersih setelah bonus direksi</div><div class="v angka">' + rpL(M.bersih) + '</div><div class="lb-kt">' + esc(terbilang(M.bersih)) + '</div><div class="s">Rata-rata ' + jt(M.bersih / (M.bulan.length || 1)) + ' per bulan</div></div></div>';
    h += '<div class="cd"><div class="kpl"><h3>Laba per bulan</h3><span class="sb">juta rupiah · klik bulan untuk rinciannya</span></div>' +
      '<div class="lb-gr"><div>' + batang(M, true, M.sempit) + '<div class="lb-lgk"><span><i style="background:#0C1F40"></i>Laba usaha</span><span><i style="background:#1E78A8"></i>Laba bersih</span><span><i style="background:#B42318;border-radius:50%"></i>Bulan ada bonus direksi</span></div></div>' +
      '<div class="lb-rbx" id="lbRinci"></div></div></div>';
    h += '<div class="lb-dw"><div class="cd"><div class="kpl"><h3>Pendapatan per saluran</h3><span class="sb">klik untuk melihat bagiannya</span></div><div class="lb-dk">' + donat(M.dPend, 'lbD1', true) + legenda(M.dPend, 'lbL1', true) + '</div></div>' +
      '<div class="cd"><div class="kpl"><h3>Ke mana uangnya keluar</h3><span class="sb">di luar bonus direksi</span></div><div class="lb-dk">' + donat(M.dKeluar, 'lbD2', true) + legenda(M.dKeluar, 'lbL2', true) + '</div></div></div>';
    h += '<div class="cd"><div class="kpl"><h3>Penjualan per saluran</h3><span class="sb">rupiah · ' + esc(M.periode) + '</span></div><div class="gulir">' + tabelSaluran(M) + '</div>' +
      '<div class="lb-gr" style="margin-top:6px"><div><div class="sb" style="margin-bottom:6px">Penjualan per bulan · klik bulan untuk rinciannya, klik nama saluran untuk menyorot</div>' + grafikSaluran(M, true, M.sempit) + '</div><div class="lb-rbx" id="lbRinci2"></div></div></div>';
    h += '<div class="cd"><h3>Ringkasan ' + M.bulan.length + ' bulan</h3>' + tangga(M) + '</div>';
    h += '<div class="cd"><div class="kpl"><h3>Per bulan</h3><span class="sb">dalam juta rupiah</span></div><div class="gulir">' + tabelBulan(M) + '</div>' +
      '<p class="sb" style="margin:0">Laba per bulan belum memasukkan kenaikan stok (' + jt(M.dStok, true) + '), yang hanya bisa dihitung untuk seluruh periode. Pembelian aset/peralatan ' + jt(M.aset) + ' tidak dihitung sebagai biaya.</p></div>';
    h += '<div class="cd"><h3>Cara menghitung</h3>' + catatan(M) + '</div></div>';
    return h;
  }

  function pasangDonat(el, items, svgId, lgId) {
    var svg = el.querySelector('#' + svgId), lg = el.querySelector('#' + lgId); if (!svg) return;
    var tot = items.reduce(function (a, x) { return a + Math.max(0, x.v); }, 0), aktif = -1;
    var t1 = svg.querySelector('.lb-dn1'), t2 = svg.querySelector('.lb-dn2'), t3 = svg.querySelector('.lb-dn3');
    function pilih(i) {
      aktif = aktif === i ? -1 : i;
      svg.classList.toggle('pilih', aktif > -1);
      svg.querySelectorAll('.lb-sg').forEach(function (s) { s.classList.toggle('on', Number(s.getAttribute('data-i')) === aktif); });
      lg.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', Number(b.getAttribute('data-i')) === aktif); });
      if (aktif < 0) { t1.textContent = 'Total'; t2.textContent = jt(tot); t3.textContent = ''; return; }
      var x = items[aktif], nm = pendekNama(x.n); t1.textContent = nm.length > 22 ? nm.slice(0, 21) + '…' : nm; t2.textContent = jt(x.v); t3.textContent = pr(x.v, tot);
    }
    svg.querySelectorAll('.lb-sg').forEach(function (s) {
      s.addEventListener('click', function () { pilih(Number(s.getAttribute('data-i'))); });
      s.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pilih(Number(s.getAttribute('data-i'))); } });
    });
    lg.querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { pilih(Number(b.getAttribute('data-i'))); }); });
  }

  // ---------- PDF (dicetak lewat dialog cetak: pilih "Simpan sebagai PDF") ----------
  function dokCetak(M) {
    var asal = location.origin + location.pathname.replace(/[^/]*$/, '');
    var css = '@page{size:A4;margin:12mm 12mm 14mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
      'body{margin:0;font-family:"Plus Jakarta Sans",system-ui,sans-serif;color:#0F1B2A;font-size:10.5pt;--garis:#E2E7EE;--garis2:#EEF2F6;--abu:#5A6677;--teks2:#344154;--latar:#F4F7FA;--kartu:#fff;--tinta:#0F1B2A}' +
      '.kop{background:#0C1F40;color:#fff;border-radius:10px;padding:16px 20px;display:flex;justify-content:space-between;align-items:flex-end;gap:16px}' +
      '.kop img{height:30px;display:block;margin-bottom:10px}.kop h1{margin:0;font-size:19pt;font-weight:800;letter-spacing:-.02em}.kop p{margin:4px 0 0;font-size:9pt;color:#B9C6DB}' +
      '.kop .kn{text-align:right;font-size:9pt;color:#B9C6DB}.kop .kn b{display:block;color:#fff;font-size:11pt}' +
      '.kpi{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}.kpi>div{border:1px solid #E2E7EE;border-top:3px solid #1E78A8;border-radius:8px;padding:10px 12px}' +
      '.kpi>div.b{border-top-color:#B42318}.kpi>div.u{background:#0C1F40;color:#fff;border-color:#0C1F40;border-top-color:#5FA8D3}' +
      '.kpi .n{font-size:8.5pt;color:#5A6677;font-weight:600}.kpi .u .n,.kpi .u .s{color:#B9C6DB}.kpi .lb-kt{font-size:7.5pt;font-style:italic;margin-top:2px;color:#344154}.kpi .u .lb-kt{color:#DCE6F5}.lb-tg tr.lb-kata td{padding:0 0 4px;text-align:right;font-size:7.5pt;font-style:italic;color:#5A6677;border-bottom:1px solid #EEF2F6}.lb-tg tr.ada-kata td{border-bottom:0}.kpi .v{font-size:14pt;font-weight:800;margin-top:3px}.kpi .s{font-size:8pt;color:#5A6677;margin-top:3px}' +
      'h2{font-size:12pt;margin:16px 0 6px;padding-bottom:5px;border-bottom:2px solid #0C1F40;color:#0C1F40}' +
      '.lb-bt{width:100%;height:auto;display:block}.lb-grid{stroke:#EEF2F6}.lb-nol{stroke:#9AA6B6}.lb-sumbu{font-size:11px;fill:#5A6677}.lb-b1{fill:#0C1F40}.lb-b2{fill:#1E78A8}.lb-b2.neg{fill:#B42318}' +
      '.lb-tb{fill:#B42318}.lb-bl3{font-size:12px;fill:#344154;font-weight:600}.lb-hit{fill:transparent}' +
      '.lgk{display:flex;gap:14px;font-size:8.5pt;color:#344154;margin-top:2px}.lgk i{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:5px}' +
      '.dw{display:grid;grid-template-columns:1fr 1fr;gap:16px}.dk{display:grid;grid-template-columns:104px 1fr;gap:8px;align-items:center}' +
      '.lb-donat{width:104px;height:104px}.lb-dn1{font-size:11px;fill:#5A6677}.lb-dn2{font-size:16px;font-weight:800;fill:#0F1B2A}' +
      '.lb-lg{list-style:none;margin:0;padding:0;font-size:8pt}.lb-lg li{display:grid;grid-template-columns:8px 1fr auto 32px;gap:5px;align-items:center;padding:1.5px 0}.lb-lg .n{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.lb-lg i{width:9px;height:9px;border-radius:2px}.lb-lg .v{font-weight:700}.lb-lg .p{color:#5A6677;text-align:right}' +
      '.lb-tg{width:100%;border-collapse:collapse;font-size:9.5pt}.lb-tg td{padding:5px 0;border-bottom:1px solid #EEF2F6;vertical-align:top}' +
      '.lb-tg td.r{text-align:right;white-space:nowrap;font-weight:700;padding-left:10px}.lb-tg td small{display:block;color:#5A6677;font-size:8pt;font-weight:400}' +
      '.lb-tg tr.sub td{font-weight:800;border-bottom:1.5px solid #C9D1DC}.lb-tg tr.akhir td{font-weight:800;font-size:11.5pt;border-bottom:0;color:#0C1F40}' +
      '.lb-tg tr.anak td{padding:2px 0 2px 12px;font-size:8.5pt;color:#344154;border-bottom:0}.lb-tg tr.anak td.r{font-weight:500}' +
      '.lb-bl{width:100%;border-collapse:collapse;font-size:8.5pt}.lb-bl th,.lb-bl td{padding:5px 4px;border-bottom:1px solid #EEF2F6;text-align:right;white-space:nowrap}' +
      '.lb-bl th:first-child,.lb-bl td:first-child{text-align:left}.lb-bl thead th{background:#0C1F40;color:#fff}.lb-bl tr.sub td{font-weight:800;background:#F4F7FA}' +
      '.lb-bl tr.akhir td{font-weight:800;border-top:1.5px solid #0C1F40}.lb-bl td.neg{color:#B42318}' +
      '.lb-cat{margin:0;padding-left:16px;font-size:8.5pt;color:#344154}.lb-cat li{margin:2px 0}.ket{font-size:8pt;color:#5A6677;margin:4px 0 0}' +
      '.lb-sl{width:100%;border-collapse:collapse;font-size:9pt}.lb-sl th,.lb-sl td{padding:5px 6px;border-bottom:1px solid #EEF2F6;text-align:right;white-space:nowrap;vertical-align:top}' +
      '.lb-sl th:first-child,.lb-sl td:first-child{text-align:left;white-space:normal}.lb-sl thead th{background:#0C1F40;color:#fff;font-size:8.5pt}.lb-sl td small{display:block;font-size:7.5pt;color:#5A6677;margin-left:16px}' +
      '.lb-sl tr.anak td{padding:2px 6px;font-size:8.5pt;color:#344154;border-bottom:0}.lb-sl tr.anak td:first-child{padding-left:22px}.lb-sl tr.akhir td{font-weight:800;border-top:1.5px solid #0C1F40}' +
      '.lb-tt{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:7px}.lb-st{}.lb-lgs{display:flex;flex-wrap:wrap;gap:12px;font-size:8.5pt;color:#344154}.lb-lgs i{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:5px}' +
      '.hal{break-before:page}.kaki{margin-top:14px;padding-top:6px;border-top:1px solid #E2E7EE;font-size:7.5pt;color:#5A6677;display:flex;justify-content:space-between}';
    var kaki = '<div class="kaki"><span>Moscow Supplies · ' + esc(PT) + '</span><span>Laporan Laba Bersih ' + esc(M.periode) + ' · disusun ' + esc(M.dibuat) + '</span></div>';
    return '<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Laporan Laba Bersih Moscow Supplies ' + esc(M.periode) + '</title><base href="' + esc(asal) + '">' +
      '<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet"><style>' + css + '</style></head><body>' +
      '<div class="kop"><div><img src="logo-putih.png" alt="Moscow Supplies"><h1>Laporan Laba Bersih</h1><p>' + esc(PT) + '</p></div><div class="kn"><b>' + esc(M.periode) + '</b>Disusun ' + esc(M.dibuat) + '</div></div>' +
      '<div class="kpi"><div><div class="n">Laba usaha (sebelum bonus direksi)</div><div class="v">' + rpL(M.usaha) + '</div><div class="lb-kt">' + esc(terbilang(M.usaha)) + '</div><div class="s">Margin ' + pr(M.usaha, M.T.pend) + ' dari pendapatan ' + jt(M.T.pend) + '</div></div>' +
      '<div class="b"><div class="n">Bonus direksi</div><div class="v">' + rpL(-M.T.bonus) + '</div><div class="lb-kt">Minus ' + esc(terbilang(M.T.bonus).toLowerCase()) + '</div><div class="s">' + esc(M.bonusBln) + '</div></div>' +
      '<div class="u"><div class="n">Laba bersih setelah bonus direksi</div><div class="v">' + rpL(M.bersih) + '</div><div class="lb-kt">' + esc(terbilang(M.bersih)) + '</div><div class="s">Rata-rata ' + jt(M.bersih / (M.bulan.length || 1)) + ' per bulan</div></div></div>' +
      '<h2>Laba per bulan (juta rupiah)</h2>' + batang(M, false) +
      '<div class="lgk"><span><i style="background:#0C1F40"></i>Laba usaha</span><span><i style="background:#1E78A8"></i>Laba bersih</span><span><i style="background:#B42318;border-radius:50%"></i>Bulan ada bonus direksi</span></div>' +
      '<div class="dw"><div><h2>Pendapatan per saluran</h2><div class="dk">' + donat(M.dPend, 'p1', false) + legenda(M.dPend, 'q1', false) + '</div></div>' +
      '<div><h2>Ke mana uangnya keluar</h2><div class="dk">' + donat(M.dKeluar, 'p2', false) + legenda(M.dKeluar, 'q2', false) + '</div></div></div>' + kaki +
      '<div class="hal"></div><h2>Penjualan per saluran (rupiah)</h2>' + tabelSaluran(M) +
      '<h2>Penjualan per bulan per saluran (juta rupiah)</h2>' + grafikSaluran(M, false, false) + kaki +
      '<div class="hal"></div><h2>Ringkasan ' + M.bulan.length + ' bulan</h2>' + tangga(M) + kaki +
      '<div class="hal"></div><h2>Per bulan (juta rupiah)</h2>' + tabelBulan(M) +
      '<p class="ket">Laba per bulan belum memasukkan kenaikan stok (' + jt(M.dStok, true) + '), yang hanya bisa dihitung untuk seluruh periode. Pembelian aset/peralatan ' + jt(M.aset) + ' tidak dihitung sebagai biaya.</p>' +
      '<h2>Cara menghitung</h2>' + catatan(M) + kaki + '</body></html>';
  }
  function unduhPdf(M, tombol) {
    var html = dokCetak(M), ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (tombol) { tombol.disabled = true; setTimeout(function () { tombol.disabled = false; }, 2500); }
    if (ios) {
      var w = window.open('', '_blank');
      if (w) { w.document.open(); w.document.write(html.replace('</body>', '<script>window.onload=function(){setTimeout(function(){window.print();},600);};<\/script></body>')); w.document.close(); return; }
    }
    var f = document.createElement('iframe');
    f.setAttribute('aria-hidden', 'true'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(f);
    var d = f.contentWindow.document; d.open(); d.write(html); d.close();
    var cetak = function () {
      var judulLama = document.title; document.title = d.title;
      try { f.contentWindow.focus(); f.contentWindow.print(); } finally { setTimeout(function () { document.title = judulLama; f.remove(); }, 1500); }
    };
    var tunggu = function () { var fs = d.fonts && d.fonts.ready ? d.fonts.ready : Promise.resolve(); fs.then(function () { setTimeout(cetak, 300); }); };
    if (d.readyState === 'complete') tunggu(); else f.onload = tunggu;
  }
  function unduhCsv(M) {
    var hd = ['Pos'].concat(M.bulan.map(function (m) { return m.b; })).concat(['Total']), L = [hd], kosong = M.bulan.map(function () { return ''; });
    function tambah(nama, kunci, tanda) {
      var nm = {}; M.bulan.forEach(function (m) { (m[kunci] || []).forEach(function (x) { nm[x[0]] = 1; }); });
      Object.keys(nm).forEach(function (n) {
        var v = M.bulan.map(function (m) { var x = (m[kunci] || []).filter(function (y) { return y[0] === n; })[0]; return x ? tanda * Math.round(x[1]) : 0; });
        L.push([nama + ' - ' + n].concat(v).concat([v.reduce(function (a, b) { return a + b; }, 0)]));
      });
    }
    tambah('Pendapatan', 'pend', 1); tambah('Potongan marketplace', 'potmp', -1); tambah('Pembelian', 'beli', -1); tambah('Biaya', 'biaya', -1);
    var u = M.H.map(function (x) { return Math.round(x.usaha); }), b = M.H.map(function (x) { return -Math.round(x.bonus); });
    L.push(['Laba usaha per bulan (tanpa kenaikan stok)'].concat(u).concat([u.reduce(function (a, c) { return a + c; }, 0)]));
    L.push(['Kenaikan stok barang (seluruh periode)'].concat(kosong).concat([Math.round(M.dStok)]));
    L.push(['Laba usaha (sebelum bonus direksi)'].concat(kosong).concat([Math.round(M.usaha)]));
    L.push(['Bonus direksi'].concat(b).concat([-Math.round(M.T.bonus)]));
    L.push(['Laba bersih setelah bonus direksi'].concat(kosong).concat([Math.round(M.bersih)]));
    var csv = '﻿' + L.map(function (r) { return r.map(function (c) { c = String(c); return /[;"\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(';'); }).join('\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'Laporan Laba Bersih Moscow Supplies ' + M.periode + '.csv'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function gambar(el, lap) {
    var M = olah(lap); M.sempit = (el.clientWidth || window.innerWidth) < 560;
    el.innerHTML = layar(M);
    var pilihBulan = function (i) {
      el.querySelectorAll('.lb-kol').forEach(function (g) { g.classList.toggle('on', Number(g.getAttribute('data-m')) === i); });
      var r = el.querySelector('#lbRinci'); if (r) r.innerHTML = rinciBulan(M, i);
    };
    el.querySelectorAll('.lb-kol').forEach(function (g) {
      g.addEventListener('click', function () { pilihBulan(Number(g.getAttribute('data-m'))); });
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pilihBulan(Number(g.getAttribute('data-m'))); } });
    });
    pilihBulan(M.H.length - 1);
    var pilihB2 = function (i) { el.querySelectorAll('.lb-kol2').forEach(function (g) { g.classList.toggle('on', Number(g.getAttribute('data-m')) === i); }); var r = el.querySelector('#lbRinci2'); if (r) r.innerHTML = rinciSaluranBulan(M, i); };
    el.querySelectorAll('.lb-kol2').forEach(function (g) {
      g.addEventListener('click', function () { pilihB2(Number(g.getAttribute('data-m'))); });
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pilihB2(Number(g.getAttribute('data-m'))); } });
    });
    pilihB2(M.H.length - 1);
    var sorot = -1, sgr = el.querySelector('.lb-sgr');
    el.querySelectorAll('.lb-lgs button').forEach(function (b) { b.addEventListener('click', function () {
      var k = Number(b.getAttribute('data-k')); sorot = sorot === k ? -1 : k;
      sgr.classList.toggle('fokus', sorot > -1);
      sgr.querySelectorAll('.lb-st').forEach(function (r) { r.classList.toggle('on', Number(r.getAttribute('data-k')) === sorot); });
      el.querySelectorAll('.lb-lgs button').forEach(function (x) { x.classList.toggle('on', Number(x.getAttribute('data-k')) === sorot); });
    }); });
    pasangDonat(el, M.dPend, 'lbD1', 'lbL1'); pasangDonat(el, M.dKeluar, 'lbD2', 'lbL2');
    el.querySelectorAll('[data-lbx]').forEach(function (b) { b.onclick = function () { if (b.getAttribute('data-lbx') === 'pdf') unduhPdf(M, b); else unduhCsv(M); }; });
  }

  window.LabaBersih = {
    muat: async function (el, sb) {
      el.innerHTML = '<div class="ksg">Memuat laporan laba…</div>';
      var r = await sb.rpc('laporan_laba_baca');
      if (r.error || !r.data || !r.data.ok) { el.innerHTML = '<div class="msg bad">Laporan laba gagal dimuat: ' + esc((r.error && r.error.message) || (r.data && r.data.pesan) || '') + '</div>'; return; }
      var L = r.data.laporan || [];
      if (!L.length) { el.innerHTML = '<div class="msg w">Belum ada laporan laba.</div>'; return; }
      gambar(el, L[0]);
    },
    _uji: { olah: olah, dokCetak: dokCetak }
  };
})();
