/* Pemantauan iklan Shopee & TikTok/Tokopedia (Kendali Bisnis › Iklan). Data dari RPC iklan_baca (manajemen & kendali bisnis).
 * Tidak ada angka di file ini. Jan–Okt 2026 dari laporan yang disusun manajemen; mulai Nov dihitung dari data sistem. */
(function () {
  var BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var B3 = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var PL = [{ k: 'Shopee', n: 'Iklan Shopee', c: '#E8833A' }, { k: 'affiliate', n: 'Affiliate Shopee (AMS)', c: '#C9A227' },
    { k: 'TikTok/Tokopedia', n: 'Iklan TikTok (GMV Pay)', c: '#0C1F40' }, { k: 'Iklan lain (Meta, eksternal, rekening)', n: 'Iklan lain (Meta, eksternal)', c: '#5FA8D3' }];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function jt(n) { var v = Math.round((Number(n) || 0) / 1e5) / 10; return (v < 0 ? '−' : '') + Math.abs(v).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' jt'; }
  function rpL(n) { return 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID'); }
  function pr(a, b) { return b ? (Math.round(a / b * 1000) / 10).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%' : '–'; }
  function kali(a, b) { return a ? (Math.round(b / a * 10) / 10).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '×' : '–'; }
  function nm(b) { return BLN[Number(String(b).slice(5, 7)) - 1] + ' ' + String(b).slice(0, 4); }
  function tgl(d) { if (!d) return '–'; var x = String(d).slice(0, 10).split('-'); return Number(x[2]) + ' ' + B3[Number(x[1]) - 1] + ' ' + x[0]; }

  function olah(d) {
    var per = {}, urut = [];
    (d.bulan || []).forEach(function (r) {
      if (!per[r.bulan]) { per[r.bulan] = { b: r.bulan, Shopee: 0, affiliate: 0, 'TikTok/Tokopedia': 0, 'Iklan lain (Meta, eksternal, rekening)': 0, jSh: 0, jTt: 0, sumber: r.sumber }; urut.push(r.bulan); }
      var x = per[r.bulan]; x[r.platform] += Number(r.iklan) || 0; x.affiliate += Number(r.affiliate) || 0;
      if (r.platform === 'Shopee') x.jSh = Number(r.penjualan) || 0; if (r.platform === 'TikTok/Tokopedia') x.jTt = Number(r.penjualan) || 0;
    });
    urut.sort();
    var M = urut.map(function (b) { var x = per[b]; x.tot = x.Shopee + x.affiliate + x['TikTok/Tokopedia'] + x['Iklan lain (Meta, eksternal, rekening)']; x.jual = x.jSh + x.jTt; x.shTot = x.Shopee + x.affiliate; return x; });
    var W = {}, wu = [];
    (d.minggu || []).forEach(function (r) {
      if (!W[r.mulai]) { W[r.mulai] = { m: r.mulai, ik: 0, af: 0, sh: 0, tt: 0, ikSh: 0, ikTt: 0 }; wu.push(r.mulai); }
      var w = W[r.mulai]; w.ik += Number(r.iklan) || 0; w.af += Number(r.affiliate) || 0;
      if (r.platform === 'Shopee') { w.sh = Number(r.penjualan) || 0; w.ikSh = (Number(r.iklan) || 0) + (Number(r.affiliate) || 0); }
      if (r.platform === 'TikTok/Tokopedia') { w.tt = Number(r.penjualan) || 0; w.ikTt = Number(r.iklan) || 0; }
    });
    return { M: M, W: wu.sort().map(function (k) { return W[k]; }), cat: d.catatan || [], data: d.data || {} };
  }

  function grafik(D) {
    var M = D.M, W = 680, H = 270, ki = 44, ka = 44, at = 14, bw = 32, n = M.length || 1;
    var maks = Math.max.apply(null, M.map(function (x) { return x.tot; }).concat([1])), lang = 20e6;
    while (maks / lang > 6) lang *= 2; maks = Math.ceil(maks / lang) * lang;
    var mr = Math.max.apply(null, M.map(function (x) { return x.jual ? x.tot / x.jual : 0; }).concat([0.05])); mr = Math.ceil(mr * 20) / 20;
    var tg = H - at - bw, y = function (v) { return at + (maks - v) / maks * tg; }, yr = function (r) { return at + (mr - r) / mr * tg; };
    var kol = (W - ki - ka) / n, lb = Math.min(26, kol * 0.55), s = '';
    for (var g = 0; g <= maks + 1; g += lang) s += '<line x1="' + ki + '" x2="' + (W - ka) + '" y1="' + y(g).toFixed(1) + '" y2="' + y(g).toFixed(1) + '" class="ik-grid"/><text x="' + (ki - 6) + '" y="' + (y(g) + 4).toFixed(1) + '" text-anchor="end" class="ik-sb">' + Math.round(g / 1e6) + '</text>';
    for (var r = 0; r <= mr + 1e-9; r += mr / 4) s += '<text x="' + (W - ka + 6) + '" y="' + (yr(r) + 4).toFixed(1) + '" class="ik-sb">' + Math.round(r * 100) + '%</text>';
    var titik = [];
    M.forEach(function (x, i) {
      var cx = ki + kol * (i + 0.5), dasar = 0, bar = '';
      PL.forEach(function (p) { var v = x[p.k]; if (!v) return; var a = y(dasar + v), b = y(dasar); bar += '<rect x="' + (cx - lb / 2).toFixed(1) + '" y="' + a.toFixed(1) + '" width="' + lb.toFixed(1) + '" height="' + Math.max(0.5, b - a).toFixed(1) + '" fill="' + p.c + '"/>'; dasar += v; });
      if (x.jual) titik.push([cx, yr(x.tot / x.jual)]);
      s += '<g class="ik-kol" data-i="' + i + '" tabindex="0" role="button" aria-label="' + esc(nm(x.b) + ': iklan ' + jt(x.tot) + ', ' + pr(x.tot, x.jual) + ' dari penjualan') + '">' +
        '<rect class="ik-hit" x="' + (cx - kol / 2).toFixed(1) + '" y="' + at + '" width="' + kol.toFixed(1) + '" height="' + (tg + bw) + '"/>' + bar +
        '<text x="' + cx.toFixed(1) + '" y="' + (H - 10) + '" text-anchor="middle" class="ik-bl">' + B3[Number(x.b.slice(5, 7)) - 1] + (/berjalan/.test(x.sumber || '') ? '*' : '') + '</text></g>';
    });
    if (titik.length > 1) s += '<polyline fill="none" stroke="#B42318" stroke-width="2.2" points="' + titik.map(function (t) { return t[0].toFixed(1) + ',' + t[1].toFixed(1); }).join(' ') + '"/>';
    titik.forEach(function (t) { s += '<circle cx="' + t[0].toFixed(1) + '" cy="' + t[1].toFixed(1) + '" r="3.5" fill="#B42318"/>'; });
    return '<svg class="ik-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Biaya iklan per bulan dan rasio iklan terhadap penjualan">' + s + '</svg>';
  }
  function rinci(x) {
    var br = function (a, b, c) { return '<tr><td>' + a + '</td><td class="r">' + b + '</td><td class="r">' + c + '</td></tr>'; };
    return '<div class="ik-rk"><b>' + esc(nm(x.b)) + '</b><span>' + (/berjalan/.test(x.sumber || '') ? 'bulan berjalan, dari data sistem' : 'dari laporan') + '</span></div>' +
      '<table class="ik-rt"><thead><tr><th></th><th class="r">Biaya</th><th class="r">Penjualan per Rp1 iklan</th></tr></thead><tbody>' +
      br('Shopee (iklan + affiliate)', jt(x.shTot), kali(x.shTot, x.jSh)) +
      br('<small>iklan</small>', jt(x.Shopee), '') + br('<small>affiliate</small>', jt(x.affiliate), '') +
      br('TikTok/Tokopedia', jt(x['TikTok/Tokopedia']), kali(x['TikTok/Tokopedia'], x.jTt)) +
      br('Iklan lain (Meta, eksternal)', jt(x['Iklan lain (Meta, eksternal, rekening)']), '') +
      '<tr class="tot"><td>Total iklan</td><td class="r">' + jt(x.tot) + '</td><td class="r">' + kali(x.tot, x.jual) + '</td></tr></tbody></table>' +
      '<p class="ik-kt">Penjualan Shopee ' + jt(x.jSh) + ' · TikTok/Tokopedia ' + jt(x.jTt) + '. Biaya iklan = <b>' + pr(x.tot, x.jual) + '</b> dari penjualan.</p>';
  }

  var CSS = '.ik{--ikN:#0C1F40;display:flex;flex-direction:column;gap:16px}' +
    '.ik-kop{background:var(--ikN);color:#fff;border-radius:18px;padding:20px 22px;display:flex;flex-wrap:wrap;gap:12px 24px;justify-content:space-between;align-items:flex-end}' +
    '.ik-kop h2{margin:0;font-size:22px;font-weight:800;letter-spacing:-.02em}.ik-kop p{margin:4px 0 0;font-size:13px;color:#B9C6DB}.ik-kop .dt{font-size:12.5px;color:#B9C6DB;text-align:right}.ik-kop .dt b{color:#fff}' +
    '.ik-kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.ik-kpi div{border:1px solid var(--garis);border-top:4px solid #E8833A;border-radius:14px;padding:14px 16px;background:var(--kartu)}' +
    '.ik-kpi div:nth-child(2){border-top-color:var(--ikN)}.ik-kpi div:nth-child(3){border-top-color:#B42318}.ik-kpi div:nth-child(4){border-top-color:#146C43}' +
    '.ik-kpi .n{font-size:12.5px;color:var(--abu);font-weight:600}.ik-kpi .v{font-size:23px;font-weight:800;margin-top:4px;letter-spacing:-.02em}.ik-kpi .s{font-size:12px;color:var(--abu);margin-top:4px}' +
    '.ik-gr{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(250px,1fr);gap:16px;align-items:start}.ik-svg{width:100%;height:auto;display:block}' +
    '.ik-grid{stroke:var(--garis2)}.ik-sb{font-size:11px;fill:var(--abu)}.ik-bl{font-size:12px;fill:var(--teks2);font-weight:600}.ik-hit{fill:transparent}.ik-kol{cursor:pointer;outline:none}' +
    '.ik-kol:hover .ik-hit,.ik-kol:focus-visible .ik-hit{fill:rgba(12,31,64,.05)}.ik-kol.on .ik-hit{fill:rgba(12,31,64,.1)}.ik-kol.on .ik-bl{fill:var(--ikN);font-weight:800}' +
    '.ik-lg{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12.5px;color:var(--teks2);margin-top:4px}.ik-lg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}' +
    '.ik-box{background:var(--latar);border-radius:14px;padding:14px 16px}.ik-rk{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:6px}.ik-rk b{font-size:15px}.ik-rk span{font-size:12px;color:var(--abu)}' +
    '.ik-rt{width:100%;border-collapse:collapse;font-size:13px}.ik-rt th{font-size:11.5px;color:var(--abu);font-weight:600;padding:4px 0}.ik-rt td{padding:5px 0;border-bottom:1px solid var(--garis)}.ik-rt .r{text-align:right;white-space:nowrap;padding-left:8px}' +
    '.ik-rt small{padding-left:12px;color:var(--abu)}.ik-rt tr.tot td{font-weight:800;border-bottom:0}.ik-kt{margin:8px 0 0;font-size:12.5px;color:var(--teks2)}' +
    '.ik-t{width:100%;border-collapse:collapse;font-size:13px;min-width:720px}.ik-t th,.ik-t td{padding:8px 6px;border-bottom:1px solid var(--garis2);text-align:right;white-space:nowrap}' +
    '.ik-t th:first-child,.ik-t td:first-child{text-align:left}.ik-t thead th{background:var(--ikN);color:#fff;font-size:12px}.ik-t tr.tot td{font-weight:800;border-top:2px solid var(--ikN)}' +
    '.ik-t td.naik{color:#B42318;font-weight:700}.ik-t td.turun{color:#146C43;font-weight:700}' +
    '.ik-cat{display:flex;flex-direction:column;gap:10px}.ik-cat div{border-left:4px solid var(--ikN);background:var(--latar);border-radius:0 12px 12px 0;padding:10px 14px;font-size:13.5px;white-space:pre-line}.ik-cat small{display:block;color:var(--abu);margin-bottom:4px}' +
    '.ik-ul{margin:0;padding-left:18px;font-size:13.5px;color:var(--teks2);display:flex;flex-direction:column;gap:5px}' +
    '@media (max-width:900px){.ik-kpi{grid-template-columns:repeat(2,minmax(0,1fr))}.ik-gr{grid-template-columns:minmax(0,1fr)}}@media (max-width:520px){.ik-kpi{grid-template-columns:minmax(0,1fr)}}';

  function gambar(el, d) {
    var D = olah(d), M = D.M, L = M.filter(function (x) { return !/berjalan/.test(x.sumber || ''); }), lalu = L[L.length - 1], kini = M[M.length - 1];
    var sum = function (k) { return L.reduce(function (a, x) { return a + x[k]; }, 0); };
    var tIk = sum('tot'), tJ = sum('jual');
    var h = '<style>' + CSS + '</style><div class="ik">';
    h += '<div class="ik-kop"><div><h2>Pemantauan Iklan</h2><p>Shopee & TikTok/Tokopedia Official · biaya iklan dibanding penjualan</p></div>' +
      '<div class="dt">Data iklan terakhir: <b>' + esc(tgl(D.data.iklan_terakhir)) + '</b><br>Data pesanan terakhir: <b>' + esc(tgl(D.data.pesanan_terakhir)) + '</b></div></div>';
    if (lalu) h += '<div class="ik-kpi">' +
      '<div><div class="n">Biaya iklan ' + esc(nm(lalu.b)) + '</div><div class="v">' + jt(lalu.tot) + '</div><div class="s">' + pr(lalu.tot, lalu.jual) + ' dari penjualan marketplace</div></div>' +
      '<div><div class="n">Penjualan per Rp1 iklan</div><div class="v">' + kali(lalu.tot, lalu.jual) + '</div><div class="s">Shopee ' + kali(lalu.shTot, lalu.jSh) + ' · TikTok ' + kali(lalu['TikTok/Tokopedia'], lalu.jTt) + '</div></div>' +
      '<div><div class="n">Total iklan ' + L.length + ' bulan</div><div class="v">' + jt(tIk) + '</div><div class="s">rata-rata ' + jt(tIk / (L.length || 1)) + ' per bulan</div></div>' +
      '<div><div class="n">Rasio iklan ' + L.length + ' bulan</div><div class="v">' + pr(tIk, tJ) + '</div><div class="s">dari penjualan ' + jt(tJ) + '</div></div></div>';
    h += '<div class="cd"><div class="kpl"><h3>Biaya iklan per bulan</h3><span class="sb">juta rupiah · garis merah = % dari penjualan · klik bulan untuk rinciannya</span></div>' +
      '<div class="ik-gr"><div>' + grafik(D) + '<div class="ik-lg">' + PL.map(function (p) { return '<span><i style="background:' + p.c + '"></i>' + esc(p.n) + '</span>'; }).join('') +
      '<span><i style="background:#B42318;border-radius:50%"></i>% dari penjualan</span></div>' + (M.some(function (x) { return /berjalan/.test(x.sumber || ''); }) ? '<p class="sb" style="margin:6px 0 0">* bulan berjalan, angkanya bertambah sesuai data yang masuk.</p>' : '') +
      '</div><div class="ik-box" id="ikRinci"></div></div></div>';
    // per minggu
    var ada = D.W.some(function (w) { return w.ik || w.sh || w.tt; });
    h += '<div class="cd"><div class="kpl"><h3>Per minggu (8 minggu terakhir)</h3><span class="sb">Senin–Minggu · dari data sistem</span></div>';
    if (!ada) h += '<p class="sb">Belum ada data mingguan.</p>';
    else {
      h += '<div class="gulir"><table class="ik-t"><thead><tr><th>Minggu mulai</th><th>Iklan Shopee + affiliate</th><th>Penjualan Shopee</th><th>% Shopee</th><th>Iklan TikTok</th><th>Penjualan TikTok/Tokopedia</th><th>% TikTok</th><th>Total iklan</th><th>% total</th></tr></thead><tbody>';
      var sebelum = null;
      D.W.forEach(function (w) {
        var tot = w.ik + w.af, j = w.sh + w.tt, r = j ? tot / j : null, kosong = !w.ik && !w.af;
        var arah = sebelum != null && r != null ? (r > sebelum + 0.01 ? 'naik' : r < sebelum - 0.01 ? 'turun' : '') : '';
        h += '<tr><td>' + esc(tgl(w.m)) + '</td><td>' + (w.ikSh ? jt(w.ikSh) : '–') + '</td><td>' + (w.sh ? jt(w.sh) : '–') + '</td><td>' + (w.ikSh && w.sh ? pr(w.ikSh, w.sh) : '–') + '</td>' +
          '<td>' + (w.ikTt ? jt(w.ikTt) : '–') + '</td><td>' + (w.tt ? jt(w.tt) : '–') + '</td><td>' + (w.ikTt && w.tt ? pr(w.ikTt, w.tt) : '–') + '</td><td>' + (tot ? jt(tot) : '–') + '</td>' +
          '<td class="' + arah + '">' + (kosong ? '<small>data iklan belum masuk</small>' : r != null ? pr(tot, j) : '–') + '</td></tr>';
        if (r != null && !kosong) sebelum = r;
      });
      h += '</tbody></table></div>';
    }
    h += '</div>';
    // tabel per bulan
    h += '<div class="cd"><div class="kpl"><h3>Per bulan</h3><span class="sb">juta rupiah</span></div><div class="gulir"><table class="ik-t"><thead><tr><th>Bulan</th><th>Iklan Shopee</th><th>Affiliate Shopee</th><th>Iklan TikTok</th><th>Iklan lain</th><th>Total iklan</th><th>Penjualan</th><th>% dari penjualan</th><th>Penjualan per Rp1</th></tr></thead><tbody>' +
      M.map(function (x) { return '<tr><td>' + esc(nm(x.b)) + (/berjalan/.test(x.sumber || '') ? '*' : '') + '</td><td>' + jt(x.Shopee) + '</td><td>' + jt(x.affiliate) + '</td><td>' + jt(x['TikTok/Tokopedia']) + '</td><td>' + jt(x['Iklan lain (Meta, eksternal, rekening)']) + '</td><td><b>' + jt(x.tot) + '</b></td><td>' + jt(x.jual) + '</td><td>' + pr(x.tot, x.jual) + '</td><td>' + kali(x.tot, x.jual) + '</td></tr>'; }).join('') +
      '<tr class="tot"><td>Total ' + L.length + ' bulan</td><td>' + jt(sum('Shopee')) + '</td><td>' + jt(sum('affiliate')) + '</td><td>' + jt(sum('TikTok/Tokopedia')) + '</td><td>' + jt(sum('Iklan lain (Meta, eksternal, rekening)')) + '</td><td>' + jt(tIk) + '</td><td>' + jt(tJ) + '</td><td>' + pr(tIk, tJ) + '</td><td>' + kali(tIk, tJ) + '</td></tr></tbody></table></div></div>';
    // catatan mingguan
    h += '<div class="cd"><h3>Catatan mingguan</h3>' + (D.cat.length ? '<div class="ik-cat">' + D.cat.map(function (c) { return '<div><small>Minggu ' + esc(c.minggu) + ' · ' + esc(tgl(c.dibuat)) + '</small>' + esc(c.teks) + '</div>'; }).join('') + '</div>'
      : '<p class="sb">Catatan analisis ditulis otomatis setiap Senin pagi.</p>') + '</div>';
    h += '<div class="cd"><h3>Cara membaca</h3><ul class="ik-ul">' +
      '<li><b>% dari penjualan</b>: biaya iklan dibagi penjualan platform itu. Makin kecil makin hemat. Kalau naik terus tapi penjualan tidak ikut naik, iklannya perlu dievaluasi.</li>' +
      '<li><b>Penjualan per Rp1 iklan</b>: setiap Rp1 iklan diikuti berapa rupiah penjualan (semua penjualan, bukan hanya dari iklan). Makin besar makin baik.</li>' +
      '<li>Iklan Shopee = isi saldo iklan + isi saldo otomatis. Affiliate = komisi AMS. Iklan TikTok = GMV Pay yang dipotong dari saldo TikTok. Iklan lain = Meta, iklan eksternal Shopee, dan iklan yang dibayar dari rekening.</li>' +
      '<li>Penjualan Jan–Okt dari laporan dana dilepas Shopee dan laporan settlement TikTok/Tokopedia; mulai November dari pesanan yang diunggah ke sistem.</li>' +
      '<li>Hasil per iklan / per produk (ROAS, klik) belum tersedia: perlu laporan Shopee Ads dan TikTok GMV Max yang diunggah.</li></ul></div></div>';
    el.innerHTML = h;
    var pilih = function (i) { el.querySelectorAll('.ik-kol').forEach(function (g) { g.classList.toggle('on', Number(g.getAttribute('data-i')) === i); }); var r = el.querySelector('#ikRinci'); if (r && M[i]) r.innerHTML = rinci(M[i]); };
    el.querySelectorAll('.ik-kol').forEach(function (g) {
      g.addEventListener('click', function () { pilih(Number(g.getAttribute('data-i'))); });
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pilih(Number(g.getAttribute('data-i'))); } });
    });
    pilih(L.length ? M.indexOf(lalu) : M.length - 1);
  }

  window.Iklan = {
    muat: async function (el, sb) {
      el.innerHTML = '<div class="ksg">Memuat data iklan…</div>';
      var r = await sb.rpc('iklan_baca');
      if (r.error || !r.data || !r.data.ok) { el.innerHTML = '<div class="msg bad">Data iklan gagal dimuat: ' + esc((r.error && r.error.message) || (r.data && r.data.pesan) || '') + '</div>'; return; }
      gambar(el, r.data);
    }
  };
})();
