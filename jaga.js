/* =====================================================================
   PENJAGA SISTEM (Master Data › Penjaga sistem) — 6 Nov 2026
   Kesehatan aplikasi: jadwal otomatis, error proses, kapasitas Supabase, antrean, dan riwayat laporan
   agen "Penjaga sistem Moscow" (tugas terjadwal tiap 4 jam). Data: rpc sistem_kesehatan (manajemen).
   ===================================================================== */
(function () {
  var NAMA = {
    'efek-hitung': 'Proses otomatis aplikasi (stok, pengajuan, pesan)', 'kirim-telegram': 'Kirim pesan Telegram',
    'hitung-potret': 'Hitung data Master Data (10 menit)', 'hitung-potret-laporan': 'Hitung laporan bulan ini',
    'hitung-potret-laporan-lalu': 'Hitung laporan bulan lalu', 'hitung-potret-tpb': 'Cek tutup buku',
    'bukti-bayar-periksa': 'Admin Accounting: periksa bukti', 'bukti-bayar-pengingat': 'Admin Accounting: pengingat harian',
    'absen-pengingat-masuk': 'Pengingat absen masuk', 'absen-pengingat-pulang': 'Pengingat absen pulang',
    'gaji-berjalan': 'Hitung gaji berjalan', 'cadang-harian': 'Cadangan data harian',
    'hitung-potret-uji-mp': 'Uji hitung penjualan marketplace di database', 'toko-pengingat-jual': 'Pengingat lapor penjualan toko',
    'toko-lapor-rekap': 'Rekap toko yang belum lapor'
  };
  // Daftar tindakan GM (sql/193, 7 Nov 2026): diisi Asisten GM / penjaga / Iqbal, dicentang di sini.
  var PRIO = { 1: ['Penting', 'jg-bad'], 2: ['Minggu ini', 'jg-warn'], 3: ['Nanti', 'jg-fix'] };
  function hariTeks(t) { if (!t) return ''; var p = String(t).split('-'); return p[2] + '/' + p[1]; }
  function tindakan() {
    var kini = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
    var h = '<div class="cd"><h3 style="margin-top:0">Daftar tindakan GM</h3>' +
      '<p class="sb" style="margin:0 0 6px">Dari Asisten GM, Penjaga sistem, Penjaga bisnis, dan Audit. Ketuk <b>Selesai</b> bila sudah dikerjakan.</p>';
    if (S.tPesan) h += '<div class="msg bad">' + esc(S.tPesan) + '</div>';
    h += S.T.length ? S.T.map(function (x) {
      var pr = PRIO[x.prioritas] || PRIO[2], lewat = x.tenggat && x.tenggat < kini;
      return '<div class="jg-row"><div class="jg-top"><div><b>' + esc(x.judul) + '</b> <span class="jg-chip ' + pr[1] + '">' + pr[0] + '</span>' +
        (x.tenggat ? ' <span class="jg-chip ' + (lewat ? 'jg-bad' : 'jg-ok') + '">' + (lewat ? 'Lewat ' : 's/d ') + hariTeks(x.tenggat) + '</span>' : '') +
        (x.ket ? '<div class="jg-ket">' + esc(x.ket) + '</div>' : '') + '<div class="jg-ket">dari ' + esc(x.sumber) + '</div></div>' +
        '<button type="button" class="tbl kcl" data-jgt="selesai" data-id="' + x.id + '"' + (S.tSimpan ? ' disabled' : '') + '>Selesai</button></div></div>';
    }).join('') : '<div class="ksg">Tidak ada tindakan yang terbuka.</div>';
    h += '<details style="margin-top:6px"><summary class="sb">Tambah tindakan</summary>' +
      '<div style="display:grid;gap:6px;margin-top:6px"><input id="jgtJudul" maxlength="160" placeholder="Apa yang perlu dilakukan?">' +
      '<input id="jgtKet" maxlength="400" placeholder="Keterangan (boleh kosong)">' +
      '<div style="display:flex;gap:6px"><select id="jgtPrio"><option value="1">Penting</option><option value="2" selected>Minggu ini</option><option value="3">Nanti</option></select>' +
      '<input id="jgtTgl" type="date"></div>' +
      '<button type="button" class="tbl" data-jgt="tambah"' + (S.tSimpan ? ' disabled' : '') + '>Simpan tindakan</button></div></details>';
    return h + '</div>';
  }
  async function aksiTindakan(b) {
    var jenis = b.getAttribute('data-jgt'), r, baru = null;
    var v = function (id) { var e = S.el.querySelector('#' + id); return e ? String(e.value || '').trim() : ''; };
    if (jenis === 'tambah') {
      if (!v('jgtJudul')) { S.tPesan = 'Tulis dulu tindakannya.'; gambar(); return; }
      baru = { judul: v('jgtJudul').slice(0, 160), ket: v('jgtKet').slice(0, 400) || null, sumber: 'iqbal', prioritas: Number(v('jgtPrio')) || 2, tenggat: v('jgtTgl') || null };
    }
    S.tSimpan = true; S.tPesan = ''; gambar();
    if (baru) r = await S.sb.from('gm_tindakan').insert(baru);
    else r = await S.sb.from('gm_tindakan').update({ status: 'selesai', selesai_waktu: new Date().toISOString() }).eq('id', Number(b.getAttribute('data-id')));
    S.tSimpan = false;
    if (r && r.error) { S.tPesan = 'Gagal menyimpan: ' + r.error.message; gambar(); return; }
    muat();
  }
  var STATUS_B = { aman: ['✅', 'Aman', 'jg-ok'], perhatian: ['🟡', 'Perlu perhatian', 'jg-warn'], mendesak: ['⚠️', 'Mendesak', 'jg-bad'] };
  var BAGIAN_B = [['uang', '💰 Uang'], ['stok', '📦 Stok'], ['penjualan', '📈 Penjualan'], ['tindakan', '✅ Yang perlu dilakukan']];
  // Penjaga bisnis (sql/192, 7 Nov 2026): ringkasan pagi agen "Penjaga bisnis Moscow" (07.00 WITA) — uang, stok, penjualan.
  function bisnis(D) {
    var B = D.bisnis || [], A = D.bisnis_atur || [], x = B[0];
    var h = '<div class="cd"><h3 style="margin-top:0">Penjaga bisnis</h3>' +
      '<p class="sb" style="margin:0 0 6px">Ringkasan pagi (07.00 WITA) dari agen <b>Penjaga bisnis Moscow</b>: uang, stok, dan penjualan. Agen hanya membaca data, tidak mengubah apa pun.</p>';
    if (!x) return h + '<div class="ksg">Belum ada ringkasan. Ringkasan pertama dikirim besok pagi.</div></div>';
    var st = STATUS_B[x.status] || STATUS_B.aman;
    h += '<div class="jg-top"><b>' + jam(x.waktu) + ' · ' + esc(x.ringkas || '') + '</b><span class="jg-chip ' + st[2] + '">' + st[0] + ' ' + st[1] + '</span></div>';
    BAGIAN_B.forEach(function (b) { if (x[b[0]]) h += '<div class="jg-row"><b>' + b[1] + '</b><div class="jg-ket" style="white-space:pre-line">' + esc(x[b[0]]) + '</div></div>'; });
    if (B.length > 1) h += '<details style="margin-top:6px"><summary class="sb">Ringkasan sebelumnya</summary>' + B.slice(1, 15).map(function (y) {
      var s2 = STATUS_B[y.status] || STATUS_B.aman;
      return '<div class="jg-row"><div class="jg-top"><div><b>' + jam(y.waktu) + '</b> · ' + esc(y.ringkas || '') + '</div><span class="jg-chip ' + s2[2] + '">' + s2[0] + ' ' + s2[1] + '</span></div>' +
        (y.tindakan ? '<div class="jg-ket" style="white-space:pre-line">' + esc(y.tindakan) + '</div>' : '') + '</div>';
    }).join('') + '</details>';
    if (A.length) h += '<details style="margin-top:6px"><summary class="sb">Batas peringatan</summary>' + A.map(function (a) {
      return '<div class="jg-row"><div class="jg-top"><span>' + esc(a.ket || a.k) + '</span><b>' + fmt(a.v) + '</b></div></div>';
    }).join('') + '<p class="sb">Ingin mengubah batas? Minta ke Claude, misalnya "stok tipis jadi 10 hari".</p></details>';
    return h + '</div>';
  }
  var STATUS = { sehat: ['✅', 'Sehat', 'jg-ok'], diperbaiki: ['🔧', 'Diperbaiki otomatis', 'jg-fix'], perlu_keputusan: ['🟡', 'Perlu keputusan', 'jg-warn'], mendesak: ['⚠️', 'Mendesak', 'jg-bad'] };
  var CSS = '.jg-ring{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin:8px 0}' +
    '.jg-ring>div{border:1px solid var(--garis,#e3e6ea);border-radius:10px;padding:8px 10px}.jg-ring b{display:block;font-size:18px}' +
    '.jg-bar{height:6px;border-radius:3px;background:#EEF1F4;margin-top:6px;overflow:hidden}.jg-bar i{display:block;height:100%;background:#2A9D8F}' +
    '.jg-chip{display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:700;white-space:nowrap}' +
    '.jg-ok{background:#E6F4EA;color:#1E6B34}.jg-fix{background:#E7F0FA;color:#1F4E7A}.jg-warn{background:#FFF4D6;color:#8A5A00}.jg-bad{background:#FDE8E6;color:#A12B1F}' +
    '.jg-row{border-top:1px solid var(--garis,#e3e6ea);padding:9px 0}.jg-row:first-child{border-top:0}.jg-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}' +
    '.jg-ket{font-size:13px;color:var(--teks2,#5b6470);margin-top:3px;word-break:break-word}';
  var S = { el: null, sb: null, D: null, T: [], memuat: false, pesan: '', tPesan: '', tSimpan: false };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function jam(t) { if (!t) return '–'; var d = new Date(new Date(t).getTime() + 8 * 3600e3), p = function (n) { return ('0' + n).slice(-2); }; return p(d.getUTCDate()) + '/' + p(d.getUTCMonth() + 1) + ' ' + p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()); }
  function fmt(n) { return (Math.round(Number(n) * 10) / 10).toLocaleString('id-ID'); }
  function persen(a, b) { return b ? Math.min(100, Math.round(a / b * 1000) / 10) : 0; }

  async function muat() {
    S.memuat = true; gambar();
    var h2 = await Promise.all([S.sb.rpc('sistem_kesehatan'),
      S.sb.from('gm_tindakan').select('id,judul,ket,sumber,prioritas,tenggat,dibuat').eq('status', 'buka').order('prioritas').order('tenggat', { ascending: true, nullsFirst: false }).limit(60)]);
    var r = h2[0];
    S.T = (h2[1] && !h2[1].error && h2[1].data) || [];
    S.memuat = false;
    if (r.error || !r.data || !r.data.ok) { S.pesan = (r.data && r.data.pesan) || (r.error && r.error.message) || 'Gagal memuat.'; S.D = null; }
    else { S.D = r.data; S.pesan = ''; }
    gambar();
  }

  function gambar() {
    if (!S.el) return;
    var D = S.D, h = '<div class="cd"><div class="kpl"><h3 style="margin:0">Penjaga sistem</h3><button type="button" class="tbl kcl" data-jg="muat"' + (S.memuat ? ' disabled' : '') + '>' + (S.memuat ? 'Memuat…' : 'Muat ulang') + '</button></div>' +
      '<p class="sb" style="margin:6px 0 0">Kesehatan aplikasi Moscow. Agen <b>Penjaga sistem Moscow</b> memeriksa tiap 4 jam (00.27, 04.27, 08.27, 12.27, 16.27, 20.27 WITA), memperbaiki masalah teknis, dan mencatat hasilnya di sini. Data bisnis tidak pernah diubah agen.</p></div>';
    if (S.pesan) h += '<div class="msg bad">' + esc(S.pesan) + '</div>';
    if (!D) { S.el.innerHTML = h + (S.memuat ? '' : '<div class="cd"><div class="ksg">Belum dimuat.</div></div>'); return; }
    h += tindakan();
    var J = D.jadwal || [], gagalJ = J.filter(function (x) { return x.gagal > 0; }), H = D.http || [], errH = H.reduce(function (t, x) { return t + x.n; }, 0);
    var A = D.antrean || {}, K = D.kapasitas || {}, L = D.log || [], akhir = L[0];
    var masalah = gagalJ.length + (errH ? 1 : 0) + (A.antre_macet ? 1 : 0) + (A.bukti_gagal ? 1 : 0) + (A.potret_basi ? 1 : 0);
    var basi = (A.potret_basi_daftar || []).map(function (x) { return esc(x.k) + ' (' + esc(x.w) + ')'; }).join(', ');
    var st = akhir && (Date.now() - new Date(akhir.waktu).getTime() < 5 * 3600e3) ? STATUS[akhir.status] || STATUS.sehat : null;
    h += '<div class="cd"><div class="jg-ring">' +
      '<div><span class="sb">Kondisi sekarang</span><b>' + (masalah ? '<span class="jg-chip jg-warn">' + masalah + ' perlu dicek</span>' : '<span class="jg-chip jg-ok">Semua berjalan</span>') + '</b></div>' +
      '<div><span class="sb">Pemeriksaan agen terakhir</span><b style="font-size:15px">' + (akhir ? (st ? st[0] + ' ' : '') + jam(akhir.waktu) : 'Belum ada') + '</b></div>' +
      '<div><span class="sb">Jadwal gagal (24 jam)</span><b>' + gagalJ.length + ' / ' + J.length + '</b></div>' +
      '<div><span class="sb">Proses error (24 jam)</span><b>' + errH + '</b></div>' +
      '<div><span class="sb">Antrean pesan macet</span><b>' + (A.antre_macet || 0) + '</b></div>' +
      '<div><span class="sb">Bukti gagal dibaca (7 hari)</span><b>' + (A.bukti_gagal || 0) + '</b></div>' +
      '<div><span class="sb">Bukti menunggu &gt; 1 hari</span><b>' + (A.bukti_tunggu || 0) + '</b></div>' +
      '<div><span class="sb">Pertanyaan staf (24 jam)</span><b>' + (A.tanya_staf || 0) + '</b></div>' +
      '<div><span class="sb">Hasil hitung terlambat</span><b>' + (A.potret_basi || 0) + '</b></div></div>' +
      (basi ? '<p class="sb" style="margin:0 0 4px">Belum ter-update: ' + basi + '</p>' : '') +
      '<p class="sb" style="margin:0">Diperbarui ' + jam(D.waktu) + ' · tampilan siap untuk staf: ' + (A.halaman_cache || 0) + ' dari 13</p></div>';
    h += bisnis(D);
    // kapasitas
    var kap = [['Database (semua data aplikasi)', K.db_mb, K.db_batas_mb, ' MB'], ['File bukti (foto / PDF, ' + (K.file_n || 0) + ' file)', K.file_mb, K.file_batas_mb, ' MB'],
      ['Proses otomatis (perkiraan sebulan)', (K.fungsi_hari || 0) * 30, K.fungsi_batas_bulan, '']];
    h += '<div class="cd"><h3 style="margin-top:0">Kapasitas Supabase (paket Pro)</h3>' + kap.map(function (x) {
      var p = persen(x[1], x[2]);
      return '<div class="jg-row"><div class="jg-top"><span>' + esc(x[0]) + '</span><b>' + fmt(x[1]) + x[3] + ' <span class="sb">dari ' + fmt(x[2]) + x[3] + ' · ' + String(p).replace('.', ',') + '%</span></b></div>' +
        '<div class="jg-bar"><i style="width:' + Math.max(1, p) + '%;' + (p > 70 ? 'background:#C8553D' : '') + '"></i></div></div>';
    }).join('') + '</div>';
    // riwayat agen
    h += '<div class="cd"><h3 style="margin-top:0">Riwayat pemeriksaan agen</h3>' + (L.length ? L.map(function (x) {
      var s = STATUS[x.status] || STATUS.sehat;
      return '<div class="jg-row"><div class="jg-top"><div><b>' + jam(x.waktu) + '</b> · ' + esc(x.ringkas || '') + '</div><span class="jg-chip ' + s[2] + '">' + s[0] + ' ' + s[1] + '</span></div>' +
        (x.diperbaiki ? '<div class="jg-ket">🔧 ' + esc(x.diperbaiki) + '</div>' : '') + (x.perlu_keputusan ? '<div class="jg-ket">🟡 ' + esc(x.perlu_keputusan) + '</div>' : '') + (x.rinci ? '<div class="jg-ket">' + esc(x.rinci) + '</div>' : '') + '</div>';
    }).join('') : '<div class="ksg">Belum ada pemeriksaan.</div>') + '</div>';
    // jadwal
    h += '<div class="cd"><h3 style="margin-top:0">Jadwal otomatis (24 jam terakhir)</h3>' + J.map(function (x) {
      return '<div class="jg-row"><div class="jg-top"><div>' + esc(NAMA[x.nama] || x.nama) + '<div class="jg-ket">' + esc(x.nama) + ' · terakhir ' + jam(x.terakhir) + ' · ' + x.jalan + ' kali</div></div>' +
        (x.gagal ? '<span class="jg-chip jg-bad">' + x.gagal + ' gagal</span>' : x.aktif ? '<span class="jg-chip jg-ok">OK</span>' : '<span class="jg-chip jg-warn">Nonaktif</span>') + '</div></div>';
    }).join('') + '</div>';
    if (H.length) h += '<div class="cd"><h3 style="margin-top:0">Proses yang error (24 jam terakhir)</h3>' + H.map(function (x) {
      return '<div class="jg-row"><div class="jg-top"><div>' + esc(x.jam) + '<div class="jg-ket">' + esc(x.contoh || '') + '</div></div><span class="jg-chip jg-bad">' + x.n + '× kode ' + esc(x.kode == null ? '–' : x.kode) + '</span></div></div>';
    }).join('') + '</div>';
    S.el.innerHTML = h;
  }

  window.PenjagaSistem = {
    gambar: function (el, opsi) {
      if (!document.getElementById('jgCss')) { var s = document.createElement('style'); s.id = 'jgCss'; s.textContent = CSS; document.head.appendChild(s); }
      if (S.el !== el) {
        S.el = el;
        el.addEventListener('click', function (e) {
          var t = e.target.closest('[data-jgt]'); if (t && !S.tSimpan) { aksiTindakan(t); return; }
          var b = e.target.closest('[data-jg]'); if (b && !S.memuat) muat();
        });
      }
      S.sb = (opsi && opsi.sb) || S.sb;
      if (!S.D && !S.memuat) muat(); else gambar();
    }
  };
})();
