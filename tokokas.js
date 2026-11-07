/* Menu "Kas tunai" aplikasi Toko Offline (7 Nov 2026): uang tunai yang seharusnya dipegang kasir, dihitung sama dengan
 * Accounting (akun Kas Toko Offline): penjualan tunai per nota, dikurangi biaya / ongkir yang dibayar dari uang toko,
 * setoran ke Rekening PT, dan penyesuaian dari manajemen. Data: rpc toko_kas.
 */
(function () {
  var S = { el: null, sb: null, toko: '', d: null, galat: '', hitung: '' };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function f(n) { n = Math.round(Number(n) || 0); return (n < 0 ? '-' : '') + String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function rp(n) { return 'Rp ' + f(n); }
  var HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'], BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  function tgl(t) { var d = new Date(String(t).slice(0, 10) + 'T00:00:00'); return isNaN(d) ? t : HARI[d.getDay()] + ', ' + d.getDate() + ' ' + BLN[d.getMonth()]; }
  var CSS = '.kk{max-width:860px;margin:0 auto;padding:16px 16px 40px}.kk .kk-besar{border-radius:16px;padding:18px;background:#EAF6EE;border:1px solid #BFE3CB;color:#145C34}' +
    '.kk .kk-besar.min{background:#FDECEA;border-color:#F3C1BA;color:#7A1C12}.kk .kk-besar b{display:block;font-size:30px;line-height:1.15;margin:4px 0}' +
    '.kk .kk-r{display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-top:1px solid #E6EBF0}.kk .kk-r:first-child{border-top:0}' +
    '.kk .kk-r .n{flex:1;min-width:0}.kk .kk-r small{display:block;color:#5A6677;font-size:12.5px}.kk .p{color:#146C43;font-weight:700;white-space:nowrap}.kk .m{color:#B42318;font-weight:700;white-space:nowrap}' +
    '.kk .kk-cd{background:#fff;border:1px solid #E3E8EE;border-radius:14px;padding:14px 16px;margin-top:12px}.kk h3{margin:0 0 6px;font-size:16px}' +
    '.kk .sb{font-size:13px;color:#5A6677}.kk input{border:1px solid #C9D6E2;border-radius:10px;padding:10px 12px;font:inherit;width:100%;box-sizing:border-box}';

  async function muat() {
    S.d = null; S.galat = ''; gambar();
    var r = await S.sb.rpc('toko_kas', { p_toko: S.toko });
    if (r.error) S.galat = r.error.message; else if (!r.data || !r.data.ok) S.galat = (r.data && r.data.pesan) || 'Data kas tidak terbaca.'; else S.d = r.data;
    gambar();
  }
  function ringkas(G) {
    var j = 0, k = 0, s = 0, l = 0;
    G.forEach(function (x) { if (x.j === 'jual') j += x.v; else if (x.j === 'pindah' && x.v < 0) s += x.v; else if (x.v < 0) k += x.v; else l += x.v; });
    return { jual: j, keluar: k, setor: s, lain: l };
  }
  function gambar() {
    var el = S.el; if (!el) return;
    if (!document.getElementById('kkCss')) { var st = document.createElement('style'); st.id = 'kkCss'; st.textContent = CSS; document.head.appendChild(st); }
    var h = '<div class="kk">';
    if (S.galat) { el.innerHTML = h + '<div class="msg bad">Kas tunai gagal dimuat: ' + esc(S.galat) + '</div><p><a href="#" data-kk="muat">Coba lagi</a></p></div>'; return; }
    if (!S.d) { el.innerHTML = h + '<div class="ksg">Menghitung kas tunai…</div></div>'; return; }
    var d = S.d, G = d.gerak || [], R = ringkas(G), min = d.saldo < 0;
    h += '<div class="kk-besar' + (min ? ' min' : '') + '">Uang tunai yang seharusnya ada di laci kasir<b>' + rp(d.saldo) + '</b><span class="sb" style="color:inherit">Dihitung ' + esc(d.waktu) + ' · <a href="#" data-kk="muat">Muat ulang</a></span></div>';
    h += '<div class="kk-cd"><h3>Cocokkan dengan uang di laci</h3><p class="sb" style="margin:0 0 8px">Hitung uang tunai di laci, lalu ketik jumlahnya di sini untuk melihat selisihnya.</p>' +
      '<input type="number" inputmode="numeric" min="0" id="kkHitung" placeholder="Jumlah uang di laci" value="' + esc(S.hitung) + '"><div id="kkSelisih">' + selisih() + '</div></div>';
    h += '<div class="kk-cd"><h3>Bulan ini</h3>' +
      '<div class="kk-r"><span class="n">Uang tunai awal bulan</span><b>' + rp(d.awalBulan) + '</b></div>' +
      '<div class="kk-r"><span class="n">+ Penjualan tunai</span><span class="p">' + rp(R.jual) + '</span></div>' +
      (R.lain ? '<div class="kk-r"><span class="n">+ Uang masuk lain / penyesuaian</span><span class="p">' + rp(R.lain) + '</span></div>' : '') +
      '<div class="kk-r"><span class="n">− Biaya &amp; ongkir dibayar dari uang toko</span><span class="m">' + rp(-R.keluar) + '</span></div>' +
      '<div class="kk-r"><span class="n">− Disetor ke rekening</span><span class="m">' + rp(-R.setor) + '</span></div>' +
      '<div class="kk-r"><span class="n"><b>Uang tunai sekarang</b></span><b>' + rp(d.saldo) + '</b></div></div>';
    h += '<div class="kk-cd"><h3>Riwayat uang tunai bulan ini</h3>' + (G.length ? G.map(function (x) {
      return '<div class="kk-r"><span class="n">' + esc(x.ket) + '<small>' + esc(tgl(x.t)) + '</small></span><span class="' + (x.v < 0 ? 'm' : 'p') + '">' + (x.v < 0 ? '−' : '+') + rp(Math.abs(x.v)) + '</span></div>';
    }).join('') : '<div class="ksg">Belum ada gerak uang tunai bulan ini.</div>') + '</div>';
    h += '<p class="sb" style="margin-top:12px">Penjualan tunai dihitung dari nota kasir dengan metode bayar <b>Tunai</b>. Biaya yang kamu catat di menu <b>Biaya</b> otomatis mengurangi uang tunai. Kalau uang di laci berbeda dengan angka di atas, kabari manajemen Moscow Supplies.</p>';
    el.innerHTML = h + '</div>';
  }
  function selisih() {
    if (S.hitung === '' || !S.d) return '';
    var s = Number(S.hitung) - S.d.saldo;
    if (!isFinite(s)) return '';
    if (Math.round(s) === 0) return '<p class="p" style="margin:8px 0 0;white-space:normal">✓ Cocok, uang di laci sama dengan catatan.</p>';
    return '<p class="' + (s < 0 ? 'm' : 'p') + '" style="margin:8px 0 0;white-space:normal">' + (s < 0 ? 'Kurang ' : 'Lebih ') + rp(Math.abs(s)) + ' dari catatan. Periksa lagi nota tunai, biaya yang belum dicatat, atau kembalian.</p>';
  }
  function pasang(el) {
    if (el.dataset.kk) return; el.dataset.kk = '1';
    el.addEventListener('click', function (e) { var t = e.target.closest && e.target.closest('[data-kk="muat"]'); if (t) { e.preventDefault(); muat(); } });
    el.addEventListener('input', function (e) { if (e.target.id === 'kkHitung') { S.hitung = e.target.value; var x = document.getElementById('kkSelisih'); if (x) x.innerHTML = selisih(); } });
  }
  window.TokoKas = { buka: function (el, sb, toko) { S.el = el; S.sb = sb; S.toko = toko; pasang(el); muat(); } };
})();
