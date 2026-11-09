/* Laporan laba bersih per periode (Kendali Bisnis). Angka dibaca dari tabel laporan_laba lewat RPC
 * laporan_laba_baca (hanya manajemen & kendali bisnis). Tidak ada angka keuangan di file ini. */
(function () {
  var BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var BLN3 = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function jt(n, tanda) {
    var v = Math.round((Number(n) || 0) / 1e5) / 10;
    var t = Math.abs(v).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    return (v < 0 ? '−' : (tanda && v > 0 ? '+' : '')) + t + ' jt';
  }
  function rp(n) { n = Math.round(Number(n) || 0); return (n < 0 ? '−Rp ' : 'Rp ') + Math.abs(n).toLocaleString('id-ID'); }
  function jml(L) { return (L || []).reduce(function (a, x) { return a + (Number(x[1]) || 0); }, 0); }
  function nmBln(b) { return BLN[Number(String(b).slice(5, 7)) - 1] || b; }
  function hitung(m) {
    var o = { pend: jml(m.pend), pot: jml(m.potmp), beli: jml(m.beli), biaya: jml(m.biaya), bonus: Number(m.bonus) || 0 };
    o.usaha = o.pend - o.pot - o.beli - o.biaya; o.bersih = o.usaha - o.bonus; return o;
  }
  function gabung(bulan, kunci) {
    var urut = [], idx = {};
    bulan.forEach(function (m) { (m[kunci] || []).forEach(function (x) { if (!(x[0] in idx)) { idx[x[0]] = urut.length; urut.push([x[0], 0]); } urut[idx[x[0]]][1] += Number(x[1]) || 0; }); });
    return urut.filter(function (x) { return Math.round(x[1]); });
  }

  var CSS = '.lb-hero{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:16px}' +
    '.lb-hero .k{border:1px solid var(--garis);border-radius:16px;padding:16px 18px;background:var(--kartu)}' +
    '.lb-hero .k .n{font-size:13px;color:var(--abu);font-weight:600}.lb-hero .k .v{font-size:26px;font-weight:800;letter-spacing:-.02em;margin-top:4px}' +
    '.lb-hero .k .s{font-size:12.5px;color:var(--abu);margin-top:4px}.lb-hero .k.utama{background:var(--navy);border-color:var(--navy);color:#fff}' +
    '.lb-hero .k.utama .n,.lb-hero .k.utama .s{color:#C9D3E3}' +
    '.lb-tg{width:100%;border-collapse:collapse;font-size:14px}.lb-tg td{padding:9px 0;border-bottom:1px solid var(--garis2);vertical-align:top}' +
    '.lb-tg td.r{text-align:right;white-space:nowrap;padding-left:12px;font-weight:700}.lb-tg td small{display:block;color:var(--abu);font-size:12.5px;font-weight:400;margin-top:2px}' +
    '.lb-tg tr.sub td{font-weight:800;border-bottom:2px solid var(--garis)}.lb-tg tr.akhir td{font-weight:800;font-size:16px;border-bottom:0}' +
    '.lb-tg tr.min td.r{color:var(--teks2)}.lb-tg tr.anak td{padding:5px 0 5px 14px;font-size:13px;color:var(--teks2);border-bottom:0}.lb-tg tr.anak td.r{font-weight:500}' +
    '.lb-bl{width:100%;border-collapse:collapse;font-size:13.5px;min-width:760px}.lb-bl th,.lb-bl td{padding:8px 6px;border-bottom:1px solid var(--garis2);text-align:right;white-space:nowrap}' +
    '.lb-bl th:first-child,.lb-bl td:first-child{text-align:left;position:sticky;left:0;background:var(--kartu)}.lb-bl th{font-size:12px;color:var(--abu)}' +
    '.lb-bl tr.sub td{font-weight:800}.lb-bl tr.akhir td{font-weight:800;border-top:2px solid var(--garis)}.lb-bl td.neg{color:var(--merah)}' +
    '.lb-cat{margin:0;padding-left:18px;font-size:13.5px;color:var(--teks2);display:flex;flex-direction:column;gap:6px}';

  function barisTangga(nama, ket, nilai, kelas, tanda) {
    return '<tr class="' + (kelas || '') + '"><td>' + esc(nama) + (ket ? '<small>' + esc(ket) + '</small>' : '') + '</td><td class="r angka">' + (tanda || '') + jt(nilai).replace('−', '') + '</td></tr>';
  }
  function anak(L) { return L.map(function (x) { return '<tr class="anak"><td>' + esc(x[0]) + '</td><td class="r angka">' + jt(x[1]) + '</td></tr>'; }).join(''); }

  function gambar(el, lap) {
    var isi = lap.isi || {}, bulan = isi.bulan || [], stok = isi.stok || {};
    var H = bulan.map(hitung), T = { pend: 0, pot: 0, beli: 0, biaya: 0, bonus: 0, usaha: 0 };
    H.forEach(function (h) { Object.keys(T).forEach(function (k) { T[k] += h[k]; }); });
    var dStok = (Number(stok.akhir) || 0) - (Number(stok.awal) || 0);
    var usaha = T.usaha + dStok, bersih = usaha - T.bonus;
    var bonusBln = bulan.filter(function (m) { return Number(m.bonus); }).map(function (m) { return BLN3[Number(m.b.slice(5, 7)) - 1] + ' ' + jt(m.bonus).replace(' jt', ''); }).join(' · ');
    var awal = bulan[0] ? nmBln(bulan[0].b) : '', akhir = bulan.length ? nmBln(bulan[bulan.length - 1].b) : '';
    var aset = bulan.reduce(function (a, m) { return a + (Number(m.aset) || 0); }, 0);

    var h = '<style>' + CSS + '</style>';
    h += '<p class="tl">' + esc(awal + ' – ' + akhir + ' 2026') + ' · ' + bulan.length + ' bulan · disusun ' + esc(new Date(lap.dibuat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })) + '</p>';
    h += '<div class="lb-hero">' +
      '<div class="k"><div class="n">Laba usaha (sebelum bonus direksi)</div><div class="v angka">' + jt(usaha) + '</div><div class="s">Hasil usaha yang sebenarnya</div></div>' +
      '<div class="k"><div class="n">Bonus direksi</div><div class="v angka">' + jt(-T.bonus) + '</div><div class="s">' + esc(bonusBln) + '</div></div>' +
      '<div class="k utama"><div class="n">Laba bersih setelah bonus direksi</div><div class="v angka">' + jt(bersih) + '</div><div class="s">Rata-rata ' + jt(bersih / (bulan.length || 1)) + ' per bulan</div></div></div>';

    var pend = gabung(bulan, 'pend'), pot = gabung(bulan, 'potmp'), beli = gabung(bulan, 'beli'), biaya = gabung(bulan, 'biaya');
    h += '<div class="cd"><div class="kpl"><h3>Ringkasan ' + bulan.length + ' bulan</h3><button class="tbl kcl" type="button" id="lbUnduh">Unduh CSV</button></div><table class="lb-tg"><tbody>' +
      barisTangga('Pendapatan penjualan', 'Semua uang hasil penjualan dari marketplace, consignment, toko dan reseller.', T.pend, 'sub') + anak(pend) +
      barisTangga('Potongan marketplace', 'Biaya admin, komisi, ongkir dan iklan yang dipotong langsung oleh Shopee, Tokopedia/TikTok dan Lazada.', T.pot, 'min', '−') + anak(pot) +
      barisTangga('Pembelian barang & bahan', 'Barang dagang, bahan baku dan kemasan yang dibeli.', T.beli, 'min', '−') + anak(beli) +
      barisTangga('Biaya usaha', 'Iklan, gaji karyawan, pajak dan operasional.', T.biaya, 'min', '−') + anak(biaya) +
      barisTangga('Kenaikan stok barang', 'Stok barang naik dari ' + jt(stok.awal) + ' (1 Jan) ke ' + jt(stok.akhir) + ' (31 Okt). Barang yang dibeli tapi belum terjual masih jadi milik usaha.', dStok, 'min', dStok < 0 ? '−' : '+') +
      barisTangga('Laba usaha (sebelum bonus direksi)', 'Hasil usaha yang sebenarnya, sebelum dibagikan ke direksi.', usaha, 'sub') +
      barisTangga('Bonus direksi', isi.bonus_ket || '', T.bonus, 'min', '−') +
      barisTangga('Laba bersih setelah bonus direksi', 'Laba usaha dikurangi bonus direksi ' + jt(T.bonus) + '.', bersih, 'akhir') +
      '</tbody></table></div>';

    var kol = bulan.map(function (m) { return BLN3[Number(m.b.slice(5, 7)) - 1]; });
    function sel(v, tebal, biasa) {
      var s = Math.round(v) ? jt(v).replace(' jt', '') : '–';
      return '<td class="angka' + (v < 0 && !biasa ? ' neg' : '') + '">' + (tebal ? '<b>' + s + '</b>' : s) + '</td>';
    }
    function br(nama, ambil, kelas, minus) {
      var f = function (x, i) { var v = ambil(x, i); return minus ? -v : v; }, tot = 0;
      return '<tr class="' + (kelas || '') + '"><td>' + esc(nama) + '</td>' + H.map(function (x, i) { var v = f(x, i); tot += v; return sel(v, false, minus); }).join('') + sel(tot, true, minus) + '</tr>';
    }
    h += '<div class="cd"><div class="kpl"><h3>Per bulan</h3><span class="sb">dalam juta rupiah</span></div><div class="gulir"><table class="lb-bl"><thead><tr><th></th>' + kol.map(function (k) { return '<th>' + k + '</th>'; }).join('') + '<th>Total</th></tr></thead><tbody>' +
      br('Pendapatan', function (x) { return x.pend; }) +
      br('Potongan marketplace', function (x) { return x.pot; }, '', true) +
      br('Pembelian barang & bahan', function (x) { return x.beli; }, '', true) +
      br('Biaya usaha', function (x) { return x.biaya; }, '', true) +
      br('Laba usaha', function (x) { return x.usaha; }, 'sub') +
      br('Bonus direksi', function (x) { return x.bonus; }, '', true) +
      br('Laba bersih', function (x) { return x.bersih; }, 'akhir') +
      '</tbody></table></div><p class="sb" style="margin:0">Laba per bulan belum memasukkan kenaikan stok (' + jt(dStok, true) + '), yang hanya bisa dihitung untuk seluruh periode. Pembelian aset/peralatan ' + jt(aset) + ' tidak dihitung sebagai biaya.</p></div>';

    h += '<div class="cd"><h3>Cara menghitung</h3><ul class="lb-cat">' + (isi.catatan || []).map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '<li>' + esc(stok.ket || '') + '</li></ul></div>';
    el.innerHTML = h;

    var t = el.querySelector('#lbUnduh');
    if (t) t.onclick = function () {
      var hd = ['Pos'].concat(bulan.map(function (m) { return m.b; })).concat(['Total']), L = [hd];
      function tambah(nama, kunci, tanda) {
        var nm = {}; bulan.forEach(function (m) { (m[kunci] || []).forEach(function (x) { nm[x[0]] = 1; }); });
        Object.keys(nm).forEach(function (n) {
          var v = bulan.map(function (m) { var x = (m[kunci] || []).filter(function (y) { return y[0] === n; })[0]; return x ? tanda * Math.round(x[1]) : 0; });
          L.push([nama + ' - ' + n].concat(v).concat([v.reduce(function (a, b) { return a + b; }, 0)]));
        });
      }
      tambah('Pendapatan', 'pend', 1); tambah('Potongan marketplace', 'potmp', -1); tambah('Pembelian', 'beli', -1); tambah('Biaya', 'biaya', -1);
      var u = H.map(function (x) { return Math.round(x.usaha); }), b = H.map(function (x) { return -Math.round(x.bonus); });
      L.push(['Laba usaha per bulan (tanpa kenaikan stok)'].concat(u).concat([u.reduce(function (a, c) { return a + c; }, 0)]));
      L.push(['Kenaikan stok barang (seluruh periode)'].concat(bulan.map(function () { return ''; })).concat([Math.round(dStok)]));
      L.push(['Laba usaha (sebelum bonus direksi)'].concat(bulan.map(function () { return ''; })).concat([Math.round(usaha)]));
      L.push(['Bonus direksi'].concat(b).concat([-Math.round(T.bonus)]));
      L.push(['Laba bersih setelah bonus direksi'].concat(bulan.map(function () { return ''; })).concat([Math.round(bersih)]));
      var csv = '﻿' + L.map(function (r) { return r.map(function (c) { c = String(c); return /[;"\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(';'); }).join('\n');
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      a.download = 'Laba bersih ' + (lap.periode || '') + '.csv'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    };
  }

  window.LabaBersih = {
    muat: async function (el, sb) {
      el.innerHTML = '<div class="ksg">Memuat laporan laba…</div>';
      var r = await sb.rpc('laporan_laba_baca');
      if (r.error || !r.data || !r.data.ok) { el.innerHTML = '<div class="msg bad">Laporan laba gagal dimuat: ' + esc((r.error && r.error.message) || (r.data && r.data.pesan) || '') + '</div>'; return; }
      var L = r.data.laporan || [];
      if (!L.length) { el.innerHTML = '<div class="msg w">Belum ada laporan laba.</div>'; return; }
      gambar(el, L[0]);
    }
  };
})();
