/* Peringatan darurat (9 Nov 2026) untuk Kendali Bisnis (Mike & Junior):
 * tindakan prioritas 1 dari agen Moscow (gm_tindakan) + ringkasan pagi Penjaga bisnis. Bisa memberi tanggapan (dikirim ke Telegram).
 * Data: rpc peringatan_data, peringatan_tanggapi.
 */
(function () {
  var S = { el: null, sb: null, nama: '', d: null, galat: '', buka: {}, sibuk: false, pesan: null };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  function tgl(t) { var p = String(t || '').slice(0, 10).split('-'); return p.length === 3 ? Number(p[2]) + ' ' + BLN[Number(p[1]) - 1] : ''; }
  function jam(t) { try { return new Date(t).toLocaleString('id-ID', { timeZone: 'Asia/Makassar', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  function hariIni() { try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date()); } catch (e) { return new Date().toISOString().slice(0, 10); } }
  var CSS = '.dr{display:flex;flex-direction:column;gap:12px}.dr .dr-it{border:1px solid #F3C1BA;background:#FFF7F6;border-radius:14px;padding:14px}' +
    '.dr .dr-it h4{margin:0 0 4px;font-size:16px;color:#7A1C12}.dr .dr-it p{margin:6px 0 0;font-size:14px;line-height:1.5;white-space:pre-line}' +
    '.dr .dr-m{font-size:12.5px;color:#5A6677}.dr .dr-lewat{color:#B42318;font-weight:700}.dr .dr-cat{background:#fff;border-radius:10px;padding:8px 10px;font-size:13px;margin-top:8px;white-space:pre-line}' +
    '.dr textarea{width:100%;box-sizing:border-box;border:1px solid #C9D6E2;border-radius:10px;padding:8px 10px;font:inherit;min-height:60px;margin-top:8px}' +
    '.dr .dr-pagi{border:1px solid #E3E8EE;background:#fff;border-radius:14px;padding:14px}.dr .dr-pagi p{white-space:pre-line;font-size:14px;line-height:1.5;margin:6px 0 0}';

  async function muat() {
    S.galat = ''; S.d = null; gambar();
    var r = await S.sb.rpc('peringatan_data');
    if (r.error) S.galat = r.error.message; else if (!r.data || !r.data.ok) S.galat = (r.data && r.data.pesan) || 'Tidak terbaca.'; else S.d = r.data;
    gambar(); if (S.onJumlah) S.onJumlah(S.d ? S.d.darurat.length : 0);
  }
  function gambar() {
    var el = S.el; if (!el) return;
    if (!document.getElementById('drCss')) { var st = document.createElement('style'); st.id = 'drCss'; st.textContent = CSS; document.head.appendChild(st); }
    if (S.galat) { el.innerHTML = '<div class="msg bad">Peringatan gagal dimuat: ' + esc(S.galat) + '</div>'; return; }
    if (!S.d) { el.innerHTML = '<div class="ksg">Memuat peringatan…</div>'; return; }
    var d = S.d, h = '<div class="dr">', hi = hariIni();
    if (S.pesan) h += '<div class="msg ' + S.pesan[0] + '">' + esc(S.pesan[1]) + '</div>';
    h += '<div class="cd" style="margin:0"><h3 style="margin:0">Peringatan darurat</h3><p class="sb" style="margin:4px 0 0">Hal mendesak yang perlu keputusan atau tindakan segera, dari pemeriksaan otomatis harian (stok, uang, penjualan) dan general manager. Tulis tanggapan kalau perlu memberi arahan; tanggapan langsung dikirim ke Telegram.</p></div>';
    if (!d.darurat.length) h += '<div class="msg ok">✓ Tidak ada peringatan darurat saat ini.</div>';
    d.darurat.forEach(function (x) {
      var lewat = x.tenggat && x.tenggat < hi;
      h += '<div class="dr-it"><h4>⚠️ ' + esc(x.judul) + '</h4><div class="dr-m">' + (x.tenggat ? '<span class="' + (lewat ? 'dr-lewat' : '') + '">Tenggat ' + esc(tgl(x.tenggat)) + (lewat ? ' (lewat)' : '') + '</span> · ' : '') + 'Dicatat ' + esc(jam(x.dibuat)) + '</div>' +
        (x.ket ? '<p>' + esc(x.ket) + '</p>' : '') + (x.catatan ? '<div class="dr-cat"><b>Catatan &amp; tanggapan</b>\n' + esc(x.catatan) + '</div>' : '') +
        (S.bisaTanggap ? (S.buka[x.id] ? '<textarea id="drT' + x.id + '" maxlength="500" placeholder="Arahan atau keputusan…"></textarea><div class="aksi-baris" style="margin-top:8px"><button type="button" class="tbl" data-dr-batal="' + x.id + '">Batal</button><button type="button" class="tbl pri" data-dr-kirim="' + x.id + '"' + (S.sibuk ? ' disabled' : '') + '>Kirim tanggapan</button></div>'
          : '<div style="margin-top:10px"><button type="button" class="tbl" data-dr-tulis="' + x.id + '">Beri tanggapan</button></div>') : '') + '</div>';
    });
    if (d.pagi) h += '<div class="dr-pagi"><h3 style="margin:0">Ringkasan pagi Penjaga bisnis</h3><div class="dr-m">' + esc(jam(d.pagi.waktu)) + '</div><p><b>' + esc(d.pagi.ringkas) + '</b></p>' + (d.pagi.tindakan ? '<p>' + esc(d.pagi.tindakan) + '</p>' : '') + '</div>';
    if (d.lain && d.lain.length) h += '<div class="dr-pagi"><h3 style="margin:0">Perlu perhatian (tidak darurat)</h3>' + d.lain.map(function (x) { return '<p style="margin:8px 0 0">• ' + esc(x.judul) + (x.tenggat ? ' <span class="dr-m">(tenggat ' + esc(tgl(x.tenggat)) + ')</span>' : '') + '</p>'; }).join('') + '</div>';
    if (d.selesai && d.selesai.length) h += '<div class="dr-pagi"><h3 style="margin:0">Sudah ditangani (7 hari)</h3>' + d.selesai.map(function (x) { return '<p style="margin:8px 0 0">✓ ' + esc(x.judul) + ' <span class="dr-m">' + esc(jam(x.waktu)) + '</span></p>'; }).join('') + '</div>';
    el.innerHTML = h + '</div>';
  }
  async function kirim(id) {
    var t = (document.getElementById('drT' + id) || {}).value || '';
    S.sibuk = true; gambar();
    var r = await S.sb.rpc('peringatan_tanggapi', { p_id: id, p_teks: t, p_nama: S.nama });
    S.sibuk = false;
    if (r.error || !r.data || !r.data.ok) { S.pesan = ['bad', (r.data && r.data.pesan) || (r.error && r.error.message) || 'Gagal mengirim.']; gambar(); return; }
    S.pesan = ['ok', '✓ ' + r.data.pesan]; S.buka[id] = false; muat();
  }
  function pasang(el) {
    if (el.dataset.dr) return; el.dataset.dr = '1';
    el.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-dr-tulis],[data-dr-batal],[data-dr-kirim]') : null; if (!t || S.sibuk) return;
      if (t.hasAttribute('data-dr-tulis')) { S.buka[+t.getAttribute('data-dr-tulis')] = true; S.pesan = null; gambar(); var a = document.getElementById('drT' + t.getAttribute('data-dr-tulis')); if (a) a.focus(); }
      else if (t.hasAttribute('data-dr-batal')) { S.buka[+t.getAttribute('data-dr-batal')] = false; gambar(); }
      else kirim(+t.getAttribute('data-dr-kirim'));
    });
  }
  window.Darurat = {
    // opsi: { nama, bisaTanggap, onJumlah(n) }
    gambar: function (el, sb, opsi) { opsi = opsi || {}; S.el = el; S.sb = sb; S.nama = opsi.nama || ''; S.bisaTanggap = !!opsi.bisaTanggap; S.onJumlah = opsi.onJumlah; pasang(el); muat(); },
    jumlah: async function (sb) { var r = await sb.rpc('peringatan_data'); return r.data && r.data.ok ? r.data.darurat : []; }
  };
})();
