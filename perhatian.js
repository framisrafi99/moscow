/* Beranda Master Data › "Perlu perhatian" (7 Nov 2026): tiap peringatan dibuka sebagai jendela tindakan,
 * jadi bisa langsung dibereskan dari Beranda:
 *  - nota      : nota Toko Offline tanpa metode bayar → pilih Tunai / QRIS per nota (simpan_metode_bayar).
 *  - saldo:<akun> : saldo akun minus → penjelasan, transaksi terakhir akun itu, lanjut ke Cocok mutasi bank / Form accounting.
 *  - lapor:<toko> : toko belum lapor → status hari ini, kirim pengingat ke HP toko (toko_ingatkan), tandai tidak ada penjualan.
 *  - po        : PO lewat batas penerimaan → daftar PO yang perlu dicek, lanjut ke Gudang Utama / Purchasing.
 */
(function () {
  var S = { sb: null, opsi: null, el: null, jenis: '', arg: '', d: null, pesan: null, sibuk: false };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function f(n) { n = Math.round(Number(n) || 0); return (n < 0 ? '-' : '') + String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function rp(n) { return 'Rp' + f(n); }
  var BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  function tgl(t) { var p = String(t || '').slice(0, 10).split('-'); return p.length === 3 ? Number(p[2]) + ' ' + BLN[Number(p[1]) - 1] + ' ' + p[0] : (t || '–'); }
  function hariLalu(t) { if (!t) return null; var a = new Date(String(t).slice(0, 10) + 'T00:00:00+08:00'), b = new Date(Date.now() + 8 * 3600e3); return Math.floor((Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()) - a.getTime() - 8 * 3600e3) / 864e5); }

  var CSS = '#phLatar{position:fixed;inset:0;background:rgba(15,27,42,.45);z-index:9000;display:flex;align-items:flex-end;justify-content:center}' +
    '#phKotak{background:#fff;width:100%;max-width:640px;max-height:88vh;overflow:auto;border-radius:18px 18px 0 0;padding:18px 18px 28px;box-shadow:0 -8px 30px rgba(0,0,0,.18)}' +
    '@media(min-width:760px){#phLatar{align-items:center}#phKotak{border-radius:18px}}' +
    '#phKotak h3{margin:0;font-size:18px;font-weight:800}#phKotak .ph-kp{display:flex;gap:10px;align-items:flex-start;justify-content:space-between;margin-bottom:8px}' +
    '#phKotak .ph-x{border:0;background:#EEF2F6;border-radius:999px;width:34px;height:34px;font-size:18px;cursor:pointer;flex:none}' +
    '#phKotak .ph-r{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:10px 0;border-top:1px solid #E6EBF0}' +
    '#phKotak .ph-r .n{flex:1;min-width:0}#phKotak .ph-r .n b{display:block}#phKotak .sb{font-size:13px;color:#5A6677}' +
    '#phKotak .ph-m{display:flex;gap:6px;flex:none}#phKotak .ph-m button{border:1.5px solid #C9D6E2;background:#fff;border-radius:10px;padding:8px 12px;font:inherit;font-weight:700;cursor:pointer}' +
    '#phKotak .ph-m button:disabled{opacity:.5}#phKotak .ph-aksi{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}' +
    '#phKotak .ph-aksi .tbl,#phKotak .ph-aksi a.tbl{text-decoration:none}#phKotak .ph-info{background:#F6F8FA;border-radius:12px;padding:10px 12px;font-size:14px;margin:8px 0}' +
    '#phKotak .ph-ok{background:#EAF6EE;color:#145C34;border-radius:12px;padding:10px 12px;margin:8px 0}#phKotak .ph-bad{background:#FDECEA;color:#7A1C12;border-radius:12px;padding:10px 12px;margin:8px 0}';

  function tutup() { var l = document.getElementById('phLatar'); if (l) l.remove(); document.removeEventListener('keydown', esc_); S.d = null; S.pesan = null; }
  function esc_(e) { if (e.key === 'Escape') tutup(); }
  function kotak(judul, isi) {
    var l = document.getElementById('phLatar');
    if (!l) {
      if (!document.getElementById('phCss')) { var s = document.createElement('style'); s.id = 'phCss'; s.textContent = CSS; document.head.appendChild(s); }
      l = document.createElement('div'); l.id = 'phLatar'; l.innerHTML = '<div id="phKotak" role="dialog" aria-modal="true"></div>'; document.body.appendChild(l);
      l.addEventListener('click', function (e) { if (e.target === l) tutup(); });
      l.addEventListener('click', klik);
      document.addEventListener('keydown', esc_);
    }
    l.querySelector('#phKotak').innerHTML = '<div class="ph-kp"><h3>' + esc(judul) + '</h3><button type="button" class="ph-x" data-ph="tutup" aria-label="Tutup">✕</button></div>' +
      (S.pesan ? '<div class="ph-' + S.pesan[0] + '">' + esc(S.pesan[1]) + '</div>' : '') + isi;
  }
  function memuat(judul) { kotak(judul, '<div class="ksg">Memuat…</div>'); }

  // ---------- Nota Toko Offline tanpa metode bayar ----------
  async function nota() {
    var J = 'Nota toko offline belum ada metode bayar';
    if (!S.d) { memuat(J); try { S.d = await window.Akunting.mbDaftar(S.sb); } catch (e) { S.d = { ok: false, pesan: e.message }; } }
    var d = S.d;
    if (!d || d.ok === false) return kotak(J, '<div class="ph-bad">Daftar nota gagal dimuat' + (d && d.pesan ? ': ' + esc(d.pesan) : '') + '.</div>');
    var L = d.belum || [];
    var h = '<p class="sb" style="margin:0 0 6px">Pilih cara pembeli membayar. Tunai masuk saldo <b>' + esc(d.tunai || 'Kas Toko Offline') + '</b>, QRIS masuk <b>' + esc(d.qris || 'Rekening PT') + '</b>. Tersimpan begitu tombol ditekan.</p>';
    if (!L.length) h += '<div class="ph-ok">✓ Semua nota sudah punya metode bayar.</div>';
    L.forEach(function (n) {
      h += '<div class="ph-r"><div class="n"><b>' + (n.tanpa ? 'Penjualan tanpa nomor nota' : esc(n.no)) + '</b><span class="sb" style="display:block">' + esc(tgl(n.t)) + (n.kasir ? ' · kasir ' + esc(n.kasir) : '') + (n.pembeli ? ' · ' + esc(n.pembeli) : '') + '</span>' +
        '<span class="sb" style="display:block"><b style="display:inline;color:#0F1B2A">' + rp(n.total + n.ongkir) + '</b>' + (n.ongkir ? ' (termasuk ongkir ' + rp(n.ongkir) + ')' : '') + '</span></div>' +
        '<div class="ph-m"><button type="button" data-ph-m="Tunai" data-no="' + esc(n.no) + '"' + (S.sibuk ? ' disabled' : '') + '>Tunai</button><button type="button" data-ph-m="QRIS" data-no="' + esc(n.no) + '"' + (S.sibuk ? ' disabled' : '') + '>QRIS</button></div></div>';
    });
    h += '<div class="ph-aksi"><button type="button" class="tbl" data-ph="uang-trx">Buka Accounting</button></div>';
    kotak(J, h);
  }
  async function simpanMetode(no, m) {
    S.sibuk = true; nota();
    var r = await S.sb.rpc('simpan_metode_bayar', { p_ubah: [{ no: no, m: m }] });
    S.sibuk = false;
    if (r.error || !r.data || !r.data.ok) { S.pesan = ['bad', (r.data && r.data.pesan) || (r.error && r.error.message) || 'Gagal menyimpan.']; nota(); return; }
    S.pesan = ['ok', '✓ Nota ' + (no.indexOf('TANPA-NOTA|') === 0 ? 'tanpa nomor' : no) + ' ditandai ' + m + '. Saldo diperbarui di Beranda.'];
    S.d.belum = (S.d.belum || []).filter(function (x) { return x.no !== no; });
    nota(); berubah();
  }

  // ---------- Saldo akun minus ----------
  async function saldo() {
    var akun = S.arg, J = 'Saldo ' + akun.replace(/^saldo /i, '') + ' minus';
    var a = ((S.opsi.beranda && S.opsi.beranda.akun) || []).filter(function (x) { return x.n === akun; })[0];
    if (!S.d) {
      memuat(J);
      var r = await S.sb.from('acc_log').select('no,tanggal,jenis,akun,akun_tujuan,kategori,keterangan,nominal,status').or('akun.eq."' + akun.replace(/"/g, '') + '",akun_tujuan.eq."' + akun.replace(/"/g, '') + '"').neq('status', 'Batal').order('tanggal', { ascending: false }).order('id', { ascending: false }).limit(12);
      S.d = { list: r.error ? null : (r.data || []), galat: r.error ? r.error.message : '' };
    }
    var h = '<div class="ph-info">Saldo sekarang <b style="color:#B42318">' + rp(a ? a.v : 0) + '</b>. Artinya uang keluar yang tercatat lebih besar dari saldo awal + uang masuk. Biasanya karena <b>ada uang masuk yang belum dicatat</b> (mis. dana cair marketplace, setoran, transfer dari Mike / Junior) atau <b>saldo awal bulan belum diisi</b>.' +
      (/rekening pt/i.test(akun) ? '<br><br>Untuk Rekening PT, cara paling cepat: upload mutasi rekening PT di <b>Cocok mutasi bank</b>, lalu catat uang masuk yang belum tercatat.' : '') + '</div>';
    if (S.d.galat) h += '<div class="ph-bad">Transaksi gagal dimuat: ' + esc(S.d.galat) + '</div>';
    else if (S.d.list) {
      h += '<h4 style="margin:12px 0 2px">Transaksi terakhir akun ini</h4>' + (S.d.list.length ? S.d.list.map(function (x) {
        var masuk = x.jenis === 'Masuk' || (x.jenis === 'Pindah' && x.akun_tujuan === akun);
        return '<div class="ph-r"><div class="n"><b>' + esc(x.keterangan || x.kategori || '-') + '</b><span class="sb">' + esc(tgl(x.tanggal)) + ' · ' + esc(x.kategori || x.jenis) + ' · ' + esc(x.no || '') + '</span></div><b style="color:' + (masuk ? '#146C43' : '#B42318') + '">' + (masuk ? '+' : '−') + rp(x.nominal) + '</b></div>';
      }).join('') : '<div class="ksg">Belum ada transaksi manual di akun ini.</div>');
    }
    h += '<div class="ph-aksi"><button type="button" class="tbl pri" data-ph="uang-mutasi">Cocok mutasi bank</button><a class="tbl" href="form.html?f=akunting">Catat uang masuk / saldo awal</a><button type="button" class="tbl" data-ph="uang-trx">Lihat semua transaksi</button></div>';
    kotak(J, h);
  }

  // ---------- Toko belum lapor ----------
  async function lapor() {
    var toko = S.arg, J = toko + ' belum lapor';
    if (!S.d) {
      memuat(J);
      var r = await S.sb.rpc('toko_lapor_status', { p_toko: toko });
      S.d = r.error || !r.data || !r.data.ok ? { galat: r.error ? r.error.message : 'Status toko tidak terbaca.' } : r.data;
    }
    var d = S.d, h = '';
    if (d.galat) return kotak(J, '<div class="ph-bad">' + esc(d.galat) + '</div>');
    var n = hariLalu(d.terakhir);
    h += '<div class="ph-info">Penjualan terakhir yang tercatat: <b>' + (d.terakhir ? esc(tgl(d.terakhir)) + (n != null ? ' (' + n + ' hari lalu)' : '') : 'belum ada') + '</b>.<br>Hari ini: <b>' + (d.status === 'isi' ? 'sudah lapor' : d.status === 'nihil' ? 'ditandai tidak ada penjualan' : 'belum lapor') + '</b>.<br>' +
      'Pengingat di HP toko: <b>' + (d.hp ? d.hp + ' HP aktif' : 'belum diaktifkan') + '</b>' + (d.hp ? ' (otomatis tiap jam 09.00–17.00 WITA selama belum lapor).' : '. Minta staf toko membuka aplikasinya lalu menekan "Aktifkan pengingat".') + '</div>';
    h += '<div class="ph-aksi">' + (d.hp ? '<button type="button" class="tbl pri" data-ph="ingatkan"' + (S.sibuk ? ' disabled' : '') + '>Kirim pengingat ke HP toko sekarang</button>' : '') +
      (d.status === '' ? '<button type="button" class="tbl" data-ph="nihil"' + (S.sibuk ? ' disabled' : '') + '>Tandai hari ini tidak ada penjualan</button>' : '') +
      '<a class="tbl" href="consignment.html?toko=' + encodeURIComponent(toko) + '">Buka aplikasi ' + esc(toko) + '</a></div>' +
      '<p class="sb" style="margin:10px 0 0">"Buka aplikasi" untuk mengisi atau mengupload penjualan atas nama toko kalau staf toko mengirim laporannya lewat WhatsApp.</p>';
    kotak(J, h);
  }
  async function ingatkan() {
    S.sibuk = true; lapor();
    var r = await S.sb.rpc('toko_ingatkan', { p_toko: S.arg });
    S.sibuk = false;
    S.pesan = r.error ? ['bad', r.error.message] : [r.data.ok ? 'ok' : 'bad', (r.data.ok ? '✓ ' : '') + r.data.pesan];
    lapor();
  }
  async function nihil() {
    if (!confirm('Tandai hari ini TIDAK ADA penjualan di ' + S.arg + '?')) return;
    S.sibuk = true; lapor();
    var r = await S.sb.rpc('toko_lapor_nihil', { p_toko: S.arg, p_nama: 'manajemen Moscow Supplies' });
    S.sibuk = false;
    if (r.error || !r.data || !r.data.ok) { S.pesan = ['bad', (r.data && r.data.pesan) || (r.error && r.error.message) || 'Gagal.']; lapor(); return; }
    S.pesan = ['ok', '✓ ' + r.data.pesan]; S.d = null; lapor(); berubah();
  }

  // ---------- PO lewat batas penerimaan ----------
  function po() {
    var B = S.opsi.data || {}, semua = (B.po || []).map(function (p) { p.j = 'dagang'; return p; }).concat((B.bb || []).map(function (p) { p.j = 'bahan'; return p; }));
    var L = semua.filter(function (p) { var batas = /impor/i.test(p.asal) ? 45 : 7; return p.umur > batas; }).sort(function (a, b) { return b.umur - a.umur; });
    var h = '<p class="sb" style="margin:0 0 6px">PO lokal lebih dari 7 hari atau impor lebih dari 45 hari yang belum ditandai diterima. Cek apakah barangnya sudah datang (minta gudang menandai diterima), masih di jalan (tanya supplier / resi), atau batal.</p>';
    h += L.length ? L.map(function (p) {
      return '<div class="ph-r"><div class="n"><b>' + esc(p.bar || p.no) + '</b><span class="sb" style="display:block">' + esc(p.no) + ' · ' + esc(p.sup || '-') + ' · ' + esc(p.j === 'bahan' ? 'Bahan baku' : p.asal || '') + ' · ' + esc(p.st || '') + (p.resi ? ' · resi ' + esc(p.resi) : '') + '</span><span class="sb" style="display:block">Tanggal PO ' + esc(tgl(p.tg)) + '</span></div>' +
        '<div style="text-align:right;flex:none"><b>' + rp(p.v) + '</b><span class="sb" style="display:block;color:#B42318;font-weight:700">' + p.umur + ' hari</span></div></div>';
    }).join('') : '<div class="ph-ok">✓ Tidak ada PO yang lewat batas.</div>';
    h += '<div class="ph-aksi"><a class="tbl pri" href="form.html?f=gudang">Buka Gudang Utama (tandai diterima)</a><a class="tbl" href="form.html?f=purchasing">Buka Purchasing</a></div>';
    kotak(L.length + ' PO melewati batas penerimaan', h);
  }

  function gambar() { if (S.jenis === 'nota') nota(); else if (S.jenis === 'saldo') saldo(); else if (S.jenis === 'lapor') lapor(); else if (S.jenis === 'po') po(); }
  function berubah() { if (S.opsi && S.opsi.segarkan) S.opsi.segarkan(); }
  function klik(e) {
    var t = e.target.closest ? e.target.closest('[data-ph],[data-ph-m]') : null; if (!t || S.sibuk) return;
    var m = t.getAttribute('data-ph-m');
    if (m) { simpanMetode(t.getAttribute('data-no'), m); return; }
    var a = t.getAttribute('data-ph');
    if (a === 'tutup') tutup();
    else if (a === 'ingatkan') ingatkan();
    else if (a === 'nihil') nihil();
    else if (a === 'uang-mutasi' || a === 'uang-trx') { tutup(); if (S.opsi.keUang) S.opsi.keUang(a === 'uang-mutasi' ? 'mutasi' : 'trx'); }
  }

  window.Perhatian = {
    // kode: 'nota' | 'saldo:<akun>' | 'lapor:<toko>' | 'po'; opsi: { sb, beranda, data, keUang(bagian), segarkan() }
    buka: function (kode, opsi) {
      var i = kode.indexOf(':');
      S.jenis = i < 0 ? kode : kode.slice(0, i); S.arg = i < 0 ? '' : kode.slice(i + 1);
      S.opsi = opsi || {}; S.sb = S.opsi.sb; S.d = null; S.pesan = null; S.sibuk = false;
      gambar();
    }
  };
})();
