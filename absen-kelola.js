/* =====================================================================
   ABSENSI STAF (Payroll › Absensi staf) — khusus manajemen Moscow Supplies.
   Hari ini : siapa sudah absen, jam, jarak, foto selfie, percobaan yang ditolak, koreksi jam.
   Izin     : setujui / tolak izin, cuti, sakit.
   Staf & lokasi : daftar staf (nama sama dengan Payroll + email Google + lokasi), titik lokasi kerja.
   Data dari Supabase (sql/absensi.sql). Hitungan gaji tetap di menu Hitung absensi (absen.js).
   ===================================================================== */
(function () {
  'use strict';
  var TZ = 'Asia/Makassar';
  var HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  var BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var JAM = { masuk: 600, toleransi: 15, lembur: 1040 };
  var NAMA_IZIN = { izin: 'Izin', cuti: 'Cuti', sakit: 'Sakit' };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function hariIni() { try { return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date()); } catch (e) { return new Date().toISOString().slice(0, 10); } }
  function tgl(iso) { var p = String(iso).split('-'), d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); return HARI[d.getUTCDay()].slice(0, 3) + ', ' + (+p[2]) + ' ' + BLN[+p[1] - 1]; }
  function menit(j) { if (!j) return null; var p = String(j).split(/[.:]/); return +p[0] * 60 + (+p[1]); }

  var CSS = '' +
    '.ak{max-width:1100px}.ak h2{font-size:18px;margin:0 0 4px}.ak .sb{color:var(--abu);font-size:13.5px;line-height:1.5;margin:0 0 12px}' +
    '.ak-tab{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}.ak-tab button{height:40px;padding:0 16px;border:1px solid var(--garis);border-radius:999px;background:#fff;font-weight:700;font-size:14px;color:var(--teks2);cursor:pointer;position:relative}' +
    '.ak-tab button[aria-pressed=true]{background:var(--navy);border-color:var(--navy);color:#fff}.ak-tab .bd{display:inline-block;min-width:20px;height:20px;line-height:20px;border-radius:10px;background:var(--merah);color:#fff;font-size:11.5px;margin-left:6px;padding:0 5px}' +
    '.ak-kotak{background:#fff;border:1px solid var(--garis);border-radius:14px;padding:14px 16px;margin-bottom:14px}' +
    '.ak-kp{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:14px}.ak-kp div{background:#fff;border:1px solid var(--garis);border-radius:14px;padding:12px 14px}' +
    '.ak-kp span{display:block;font-size:12.5px;color:var(--abu);font-weight:600}.ak-kp b{display:block;font-size:22px;font-weight:800;margin-top:2px}' +
    '.ak-gl{overflow-x:auto;background:#fff;border:1px solid var(--garis);border-radius:14px;margin-bottom:14px}' +
    '.ak-t{width:100%;border-collapse:collapse;font-size:13.5px}.ak-t th{text-align:left;font-size:12px;color:var(--abu);padding:10px 8px;border-bottom:1px solid var(--garis);white-space:nowrap}' +
    '.ak-t td{padding:9px 8px;border-bottom:1px solid var(--garis2);vertical-align:middle}.ak-t small{display:block;color:var(--abu);font-size:12px}' +
    '.ak-t input,.ak-t select{height:38px;border:1px solid var(--garis);border-radius:10px;font-size:14px;padding:0 10px;background:#fff}.ak-t input[type=email]{min-width:220px}' +
    '.ak-jam{display:flex;align-items:center;gap:8px}.ak-jam img{width:40px;height:40px;border-radius:10px;object-fit:cover;cursor:zoom-in;background:var(--garis2)}' +
    '.ak-jam b{font-size:15px;font-variant-numeric:tabular-nums}.ak-belum{color:#A0A9B5;font-weight:700}' +
    '.ak-f{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;align-items:end}.ak-f label{display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:700;color:var(--teks2)}' +
    '.ak-f input,.ak-f select{height:42px;padding:0 12px;border:1px solid var(--garis);border-radius:12px;font-size:15px;background:#fff}' +
    '.ak-iz{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:12px 0;border-bottom:1px solid var(--garis2);flex-wrap:wrap}.ak-iz:last-child{border-bottom:0}.ak-iz small{display:block;color:var(--abu);font-size:12.5px;margin-top:2px}' +
    '.ak-iz .tb{display:flex;gap:8px}' +
    '#akZoom{position:fixed;inset:0;z-index:300;background:rgba(5,16,31,.88);display:flex;align-items:center;justify-content:center;padding:20px;cursor:zoom-out}#akZoom img{max-width:100%;max-height:100%;border-radius:16px}';

  var A = { el: null, sb: null, tab: 'hari', tanggal: hariIni(), data: null, pesan: '', kelas: 'ok', sibuk: false, url: {}, koreksi: null, payroll: null };

  async function rpc(f, arg) {
    var r = await A.sb.rpc(f, arg || {});
    if (r.error) throw new Error(/does not exist|schema cache/i.test(r.error.message) ? 'Fitur absensi belum aktif: jalankan sql/absensi.sql di Supabase (SQL Editor).' : r.error.message);
    if (!r.data || r.data.ok === false) throw new Error((r.data && r.data.pesan) || 'Gagal.');
    return r.data;
  }
  async function muat() {
    A.sibuk = true; gambar();
    try {
      A.data = await rpc('absen_kelola_data', { p_tanggal: A.tanggal });
      try { A.daftar = (await rpc('absen_daftar_list')).daftar || []; } catch (e) { A.daftar = null; }
      // Foto selfie: alamat sementara (10 menit) untuk semua foto hari itu sekaligus.
      var jalur = [];
      (A.data.hari || []).forEach(function (h) { if (h.masuk_foto) jalur.push(h.masuk_foto); if (h.pulang_foto) jalur.push(h.pulang_foto); });
      (A.data.ditolak || []).forEach(function (g) { if (g.foto) jalur.push(g.foto); });
      A.url = {};
      if (jalur.length) {
        var u = await A.sb.storage.from('absen').createSignedUrls(jalur, 600);
        (u.data || []).forEach(function (x) { if (x.signedUrl) A.url[x.path] = x.signedUrl; });
      }
    } catch (e) { A.pesan = esc(e.message || e); A.kelas = 'bad'; }
    finally { A.sibuk = false; gambar(); }
  }
  async function muatPayroll() {
    // Nama staf di Payroll bulan ini (supaya nama di Absensi sama persis).
    try {
      var r = await A.sb.rpc('gaji_data', { p_per: hariIni().slice(0, 7) });
      A.payroll = !r.error && r.data && r.data.ok ? (r.data.rows || []).filter(function (x) { return x.kel !== 'Direksi'; }).map(function (x) { return x.n; }) : [];
    } catch (e) { A.payroll = []; }
  }

  function staf(id) { return ((A.data && A.data.staf) || []).filter(function (s) { return s.id === id; })[0] || null; }
  function lokasi(id) { return ((A.data && A.data.lokasi) || []).filter(function (l) { return l.id === id; })[0] || null; }
  function foto(p, label) { return p && A.url[p] ? '<img src="' + esc(A.url[p]) + '" alt="Selfie ' + esc(label) + '" data-zoom="' + esc(A.url[p]) + '">' : ''; }

  /* ---------- tampilan ---------- */
  function gambar() {
    var el = A.el; if (!el) return;
    var d = A.data, tunggu = d ? (d.izin || []).filter(function (i) { return i.status === 'menunggu'; }).length : 0;
    var tDaftar = (A.daftar || []).filter(function (x) { return x.status === 'menunggu'; }).length;
    var h = '<div class="ak"><h2>Absensi staf</h2><p class="sb">Staf absen dari aplikasi Absensi (lokasi GPS + selfie, jam dari server). Hitungan ke gaji ada di menu <b>Hitung absensi</b>.</p>' +
      '<div class="ak-tab" role="group" aria-label="Bagian absensi">' +
      [['hari', 'Hari ini'], ['izin', 'Izin & cuti'], ['atur', 'Staf & lokasi']].map(function (t) {
        return '<button type="button" data-tab="' + t[0] + '" aria-pressed="' + (A.tab === t[0]) + '">' + t[1] + (t[0] === 'izin' && tunggu ? '<span class="bd">' + tunggu + '</span>' : '') + (t[0] === 'atur' && tDaftar ? '<span class="bd">' + tDaftar + '</span>' : '') + '</button>';
      }).join('') + '</div>';
    if (A.pesan) h += '<div class="msg ' + A.kelas + '" role="status">' + A.pesan + '</div>';
    if (!d) h += '<div class="ksg">' + (A.sibuk ? 'Memuat…' : '') + '</div>';
    else if (A.tab === 'hari') h += tabHari(d);
    else if (A.tab === 'izin') h += tabIzin(d);
    else h += tabAtur(d);
    h += '</div>';
    el.innerHTML = h;
    pasang();
  }

  function tabHari(d) {
    var aktif = (d.staf || []).filter(function (s) { return s.aktif; });
    var hari = {}, izin = {};
    (d.hari || []).forEach(function (x) { hari[x.staf_id] = x; });
    (d.izin_hari || []).forEach(function (x) { izin[x.staf_id] = x.jenis; });
    var hadir = 0, telat = 0, belum = 0, nIzin = 0;
    var baris = aktif.map(function (s) {
      var x = hari[s.id] || {}, m = menit(x.masuk), p = menit(x.pulang), ket = [], l = lokasi(s.lokasi_id);
      if (x.masuk) hadir++;
      if (m != null && m > JAM.masuk + JAM.toleransi) { telat++; ket.push('<span class="label no">Telat ' + (m - JAM.masuk) + ' mnt</span>'); }
      if (p != null && p > JAM.lembur) ket.push('<span class="label biru">Lembur ' + (p - JAM.lembur) + ' mnt</span>');
      if (!x.masuk && izin[s.id]) { nIzin++; ket.push('<span class="label ok">' + NAMA_IZIN[izin[s.id]] + '</span>'); }
      else if (!x.masuk) { belum++; ket.push('<span class="label abu">Belum absen</span>'); }
      if (x.masuk && !x.pulang && d.tanggal !== d.hari_ini) ket.push('<span class="label w">Tidak absen pulang</span>');
      if (x.koreksi) ket.push('<span class="label abu" title="' + esc(x.catatan) + '">Dikoreksi</span>');
      var sel = function (j, f, jr, ak) {
        return j ? '<div class="ak-jam">' + foto(f, s.nama) + '<div><b>' + esc(j) + '</b>' + (jr != null ? '<small>' + jr + ' m' + (ak ? ' · GPS ±' + Math.round(ak) + ' m' : '') + '</small>' : '') + '</div></div>' : '<span class="ak-belum">–</span>';
      };
      var kr = A.koreksi === s.id;
      return '<tr><td><b>' + esc(s.nama) + '</b><small>' + esc(l ? l.nama : 'Lokasi belum dipilih') + '</small></td>' +
        '<td>' + sel(x.masuk, x.masuk_foto, x.masuk_jarak, x.masuk_akurasi) + '</td><td>' + sel(x.pulang, x.pulang_foto, x.pulang_jarak, x.pulang_akurasi) + '</td>' +
        '<td>' + ket.join(' ') + '</td><td><button type="button" class="tbl kcl" data-koreksi="' + s.id + '">' + (kr ? 'Tutup' : 'Koreksi') + '</button></td></tr>' +
        (kr ? '<tr><td colspan="5" style="background:var(--latar)"><div class="ak-f">' +
          '<label>Jam masuk<input type="time" id="krMasuk" value="' + esc(String(x.masuk || '').replace('.', ':')) + '"></label>' +
          '<label>Jam pulang<input type="time" id="krPulang" value="' + esc(String(x.pulang || '').replace('.', ':')) + '"></label>' +
          '<label style="grid-column:span 2">Alasan koreksi<input type="text" id="krAlasan" maxlength="300" placeholder="mis. lupa absen pulang, HP rusak"></label>' +
          '<button type="button" class="tbl pri" id="krSimpan" data-staf="' + s.id + '"' + (A.sibuk ? ' disabled' : '') + '>Simpan koreksi</button></div>' +
          '<p class="sb" style="margin:8px 0 0">Kosongkan jam untuk menghapusnya. Koreksi dicatat atas nama akunmu.</p></td></tr>' : '');
    }).join('');
    var h = (d.uji ? '<div class="msg w"><b>' + esc(d.uji) + '.</b> Absen tanggal ini hanya uji coba, tidak dihitung ke gaji.</div>' : '') +
      '<div class="ak-kotak"><div class="ak-f"><label>Tanggal<input type="date" id="akTgl" value="' + esc(A.tanggal) + '" max="' + esc(d.hari_ini) + '"></label>' +
      '<button type="button" class="tbl" id="akMuat"' + (A.sibuk ? ' disabled' : '') + '>Muat ulang</button></div></div>';
    h += '<div class="ak-kp"><div><span>' + esc(tgl(d.tanggal)) + '</span><b>' + hadir + '/' + aktif.length + '</b><span>hadir</span></div>' +
      '<div><span>Telat</span><b>' + telat + '</b></div><div><span>Izin / cuti / sakit</span><b>' + nIzin + '</b></div><div><span>Belum absen</span><b>' + belum + '</b></div></div>';
    if (!aktif.length) return h + '<div class="msg w">Belum ada staf terdaftar. Buka bagian <b>Staf & lokasi</b>.</div>';
    h += '<div class="ak-gl"><table class="ak-t"><thead><tr><th>Staf</th><th>Masuk</th><th>Pulang</th><th>Keterangan</th><th></th></tr></thead><tbody>' + baris + '</tbody></table></div>';
    var tolak = d.ditolak || [];
    if (tolak.length) {
      h += '<div class="ak-kotak"><b>Percobaan absen yang ditolak</b><p class="sb" style="margin:4px 0 8px">Di luar lokasi atau GPS lemah. Kalau sering terjadi pada orang yang sama, periksa fotonya.</p><table class="ak-t"><tbody>' +
        tolak.map(function (g) {
          var s = staf(g.staf_id);
          return '<tr><td><div class="ak-jam">' + foto(g.foto, s ? s.nama : '') + '<div><b>' + esc(g.jam) + '</b><small>' + esc(s ? s.nama : '') + ' · absen ' + esc(g.jenis) + '</small></div></div></td>' +
            '<td>' + (g.jarak != null ? g.jarak + ' m dari lokasi' : '') + (g.akurasi != null ? '<small>GPS ±' + Math.round(g.akurasi) + ' m</small>' : '') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    return h;
  }

  function tabIzin(d) {
    var daf = d.izin || [];
    if (!daf.length) return '<div class="ak-kotak"><div class="ksg">Belum ada pengajuan izin, cuti, atau sakit.</div></div>';
    var ST = { menunggu: ['Menunggu', 'w'], disetujui: ['Disetujui', 'ok'], ditolak: ['Ditolak', 'no'] };
    return '<div class="ak-kotak">' + daf.map(function (i) {
      var s = staf(i.staf_id), st = ST[i.status] || [i.status, 'abu'];
      return '<div class="ak-iz"><div><b>' + esc(s ? s.nama : '?') + '</b> · ' + esc(NAMA_IZIN[i.jenis] || i.jenis) + ' <span class="label ' + st[1] + '">' + st[0] + '</span>' +
        '<small>' + esc(tgl(i.mulai)) + (i.selesai !== i.mulai ? ' – ' + esc(tgl(i.selesai)) : '') + ' · ' + esc(i.alasan) + '</small>' +
        (i.oleh ? '<small>Diputus ' + esc(i.oleh) + (i.catatan ? ': ' + esc(i.catatan) : '') + '</small>' : '') + '</div>' +
        '<div class="tb">' + (i.status !== 'disetujui' ? '<button type="button" class="tbl kcl pri" data-setuju="' + i.id + '">Setujui</button>' : '') +
        (i.status !== 'ditolak' ? '<button type="button" class="tbl kcl mer" data-tolak="' + i.id + '">Tolak</button>' : '') + '</div></div>';
    }).join('') + '</div>';
  }

  // Mencari nama Payroll yang paling mirip dengan nama yang diketik staf.
  function namaMirip(n) {
    var t = String(n || '').toLowerCase().split(/\s+/).filter(Boolean), terbaik = '', skor = 0;
    (A.payroll || []).forEach(function (p) {
      var q = p.toLowerCase().split(/\s+/), k = t.filter(function (x) { return q.some(function (y) { return y === x || (x.length >= 3 && y.indexOf(x) === 0); }); }).length;
      if (k > skor) { skor = k; terbaik = p; }
    });
    return terbaik;
  }
  function kotakDaftar(d) {
    var tunggu = (A.daftar || []).filter(function (x) { return x.status === 'menunggu'; });
    if (A.daftar === null) return '<div class="msg w">Pendaftaran mandiri belum aktif: jalankan sql/absensi-daftar.sql di Supabase.</div>';
    if (!tunggu.length) return '';
    var lok = d.lokasi || [], terpakai = {};
    (d.staf || []).forEach(function (s) { if (s.email && s.aktif) terpakai[s.nama] = 1; });
    return '<div class="ak-kotak" style="border-color:var(--kuning)"><b>Pendaftaran baru</b><p class="sb" style="margin:4px 0 10px">Staf mendaftar sendiri dari aplikasi. Cocokkan dengan nama di Payroll, pilih lokasi, lalu setujui. Tolak kalau bukan staf Moscow Supplies.</p>' +
      tunggu.map(function (x) {
        var mirip = namaMirip(x.nama);
        return '<div class="ak-iz"><div><b>' + esc(x.nama) + '</b><small>' + esc(x.email) + '</small></div><div class="ak-f" style="flex:1;min-width:260px">' +
          '<label>Nama di Payroll<select data-dfnama="' + x.id + '"><option value="">— pilih —</option>' + (A.payroll || []).map(function (p) {
            return '<option' + (p === mirip ? ' selected' : '') + '>' + esc(p) + (terpakai[p] ? ' (sudah punya email)' : '') + '</option>';
          }).join('') + '</select></label>' +
          '<label>Lokasi<select data-dflok="' + x.id + '"><option value="">— pilih —</option>' + lok.map(function (l) { return '<option value="' + l.id + '">' + esc(l.nama) + '</option>'; }).join('') + '</select></label>' +
          '<div class="tb" style="display:flex;gap:8px"><button type="button" class="tbl kcl pri" data-dfya="' + x.id + '">Setujui</button><button type="button" class="tbl kcl mer" data-dftidak="' + x.id + '">Tolak</button></div></div></div>';
      }).join('') + '</div>';
  }

  function tabAtur(d) {
    var lok = d.lokasi || [];
    var h = kotakDaftar(d) + '<div class="ak-kotak"><b>Lokasi kerja</b><p class="sb" style="margin:4px 0 10px">Cara paling mudah: berdiri di lokasi itu, lalu tekan <b>Pakai posisi saya</b>. Bisa juga tempel titik dari Google Maps (tekan lama di peta, salin angka seperti -8.6705, 115.1680).</p>' +
      lok.map(function (l) {
        var titik = l.lat != null ? l.lat + ', ' + l.lng : '';
        return '<div class="ak-f" style="margin-bottom:12px"><label>' + esc(l.nama) + '<input type="text" id="lkTitik' + l.id + '" value="' + esc(titik) + '" placeholder="lat, lng" inputmode="decimal"></label>' +
          '<label>Radius (meter)<input type="number" id="lkRadius' + l.id + '" value="' + esc(l.radius_m) + '" min="20" max="1000"></label>' +
          '<button type="button" class="tbl" data-posisi="' + l.id + '">Pakai posisi saya</button>' +
          '<button type="button" class="tbl pri" data-lokasi="' + l.id + '"' + (A.sibuk ? ' disabled' : '') + '>Simpan</button>' +
          (titik ? '<a class="tbl" target="_blank" rel="noopener" href="https://www.google.com/maps?q=' + encodeURIComponent(titik) + '">Lihat di peta</a>' : '<span class="label w">Belum diatur</span>') + '</div>';
      }).join('') + '</div>';
    // Daftar staf: semua nama di Payroll + yang sudah terdaftar di Absensi.
    var ada = {}, nama = [];
    (d.staf || []).forEach(function (s) { ada[s.nama] = s; nama.push(s.nama); });
    (A.payroll || []).forEach(function (n) { if (!ada[n]) nama.push(n); });
    nama.sort(function (a, b) { return a.localeCompare(b, 'id'); });
    h += '<div class="ak-kotak"><b>Staf yang absen</b><p class="sb" style="margin:4px 0 10px">Isi email Google yang dipakai staf untuk masuk aplikasi, pilih lokasinya, lalu simpan. Nama mengikuti Payroll supaya gaji terhitung otomatis. Staf consignment tidak perlu didaftarkan.</p>';
    if (!nama.length) h += '<div class="ksg">' + (A.payroll ? 'Belum ada staf di Payroll.' : 'Memuat daftar staf Payroll…') + '</div>';
    else h += '<div class="ak-gl" style="border:0"><table class="ak-t"><thead><tr><th>Nama (Payroll)</th><th>Email Google</th><th>Lokasi</th><th>Absen</th></tr></thead><tbody>' +
      nama.map(function (n, i) {
        var s = ada[n] || {};
        return '<tr><td><b>' + esc(n) + '</b>' + (A.payroll && A.payroll.indexOf(n) < 0 ? '<small style="color:var(--merah)">Tidak ada di Payroll bulan ini</small>' : '') + '</td>' +
          '<td><input type="email" data-email="' + i + '" value="' + esc(s.email || '') + '" placeholder="nama@gmail.com" autocomplete="off"></td>' +
          '<td><select data-lok="' + i + '"><option value="">— pilih —</option>' + lok.map(function (l) { return '<option value="' + l.id + '"' + (s.lokasi_id === l.id ? ' selected' : '') + '>' + esc(l.nama) + '</option>'; }).join('') + '</select></td>' +
          '<td><input type="checkbox" data-aktif="' + i + '"' + (s.id ? (s.aktif ? ' checked' : '') : '') + ' style="width:22px;height:22px" aria-label="' + esc(n) + ' ikut absen"></td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div style="margin-top:10px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><button type="button" class="tbl pri" id="stSimpan"' + (A.sibuk ? ' disabled' : '') + '>Simpan daftar staf</button>' +
      '<span class="sb" style="margin:0">Centang "Absen" untuk staf yang wajib absen.</span></div>';
    h += '</div>';
    A._nama = nama;
    return h;
  }

  /* ---------- aksi ---------- */
  function pasang() {
    var el = A.el;
    el.querySelectorAll('[data-tab]').forEach(function (b) {
      b.onclick = function () { A.tab = b.getAttribute('data-tab'); A.pesan = ''; A.koreksi = null; gambar(); if (A.tab === 'atur' && !A.payroll) muatPayroll().then(gambar); };
    });
    el.querySelectorAll('[data-zoom]').forEach(function (im) {
      im.onclick = function () {
        var z = document.createElement('div'); z.id = 'akZoom'; z.innerHTML = '<img src="' + esc(im.getAttribute('data-zoom')) + '" alt="">';
        z.onclick = function () { z.remove(); }; document.body.appendChild(z);
      };
    });
    var t = el.querySelector('#akTgl'); if (t) t.onchange = function () { if (t.value) { A.tanggal = t.value; A.koreksi = null; A.pesan = ''; muat(); } };
    var m = el.querySelector('#akMuat'); if (m) m.onclick = function () { A.pesan = ''; muat(); };
    el.querySelectorAll('[data-koreksi]').forEach(function (b) {
      b.onclick = function () { var id = +b.getAttribute('data-koreksi'); A.koreksi = A.koreksi === id ? null : id; gambar(); };
    });
    var ks = el.querySelector('#krSimpan');
    if (ks) ks.onclick = function () {
      var x = ((A.data.hari || []).filter(function (h) { return h.staf_id === A.koreksi; })[0]) || {};
      var vm = el.querySelector('#krMasuk').value, vp = el.querySelector('#krPulang').value;
      var lamaM = String(x.masuk || '').replace('.', ':'), lamaP = String(x.pulang || '').replace('.', ':');
      jalankan('absen_koreksi', { p_staf_id: A.koreksi, p_tanggal: A.tanggal, p_masuk: vm === lamaM ? null : vm, p_pulang: vp === lamaP ? null : vp, p_alasan: el.querySelector('#krAlasan').value },
        'Koreksi tersimpan.', function () { A.koreksi = null; });
    };
    el.querySelectorAll('[data-setuju]').forEach(function (b) {
      b.onclick = function () { jalankan('absen_izin_putus', { p_id: +b.getAttribute('data-setuju'), p_status: 'disetujui', p_catatan: '' }, 'Pengajuan disetujui.'); };
    });
    el.querySelectorAll('[data-tolak]').forEach(function (b) {
      b.onclick = function () {
        var c = prompt('Alasan penolakan (dibaca staf):'); if (c == null) return;
        jalankan('absen_izin_putus', { p_id: +b.getAttribute('data-tolak'), p_status: 'ditolak', p_catatan: c }, 'Pengajuan ditolak.');
      };
    });
    el.querySelectorAll('[data-posisi]').forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-posisi'), inp = el.querySelector('#lkTitik' + id);
        if (!navigator.geolocation) { alert('Perangkat ini tidak bisa membaca lokasi.'); return; }
        b.disabled = true; b.textContent = 'Membaca GPS…';
        navigator.geolocation.getCurrentPosition(function (p) {
          inp.value = p.coords.latitude.toFixed(6) + ', ' + p.coords.longitude.toFixed(6);
          b.disabled = false; b.textContent = 'Pakai posisi saya';
          A.pesan = 'Posisi terbaca (akurasi ±' + Math.round(p.coords.accuracy) + ' m). Tekan Simpan untuk memakainya.' + (p.coords.accuracy > 40 ? ' Akurasi kurang baik: sebaiknya ulangi di luar ruangan, atau tempel titik dari Google Maps.' : '');
          A.kelas = p.coords.accuracy > 40 ? 'w' : 'ok';
          var msg = el.querySelector('.ak > .msg'); if (msg) msg.outerHTML = ''; el.querySelector('.ak-tab').insertAdjacentHTML('afterend', '<div class="msg ' + A.kelas + '" role="status">' + esc(A.pesan) + '</div>');
        }, function () { b.disabled = false; b.textContent = 'Pakai posisi saya'; alert('Lokasi tidak terbaca. Izinkan akses lokasi lalu coba lagi.'); },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
      };
    });
    el.querySelectorAll('[data-lokasi]').forEach(function (b) {
      b.onclick = function () {
        var id = +b.getAttribute('data-lokasi'), v = String(el.querySelector('#lkTitik' + id).value).match(/-?\d+(?:[.,]\d+)?/g) || [];
        var lat = parseFloat(String(v[0] || '').replace(',', '.')), lng = parseFloat(String(v[1] || '').replace(',', '.'));
        if (!isFinite(lat) || !isFinite(lng)) { A.pesan = 'Titik lokasi harus seperti -8.6705, 115.1680.'; A.kelas = 'bad'; gambar(); return; }
        jalankan('absen_lokasi_simpan', { p_id: id, p_lat: lat, p_lng: lng, p_radius: parseInt(el.querySelector('#lkRadius' + id).value, 10) || 100 }, 'Lokasi tersimpan.');
      };
    });
    el.querySelectorAll('[data-dfya]').forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-dfya'), sn = el.querySelector('[data-dfnama="' + id + '"]'), lk = el.querySelector('[data-dflok="' + id + '"]');
        var nama = sn.value.replace(/ \(sudah punya email\)$/, '');
        if (!nama || !lk.value) { A.pesan = 'Pilih nama di Payroll dan lokasinya dulu.'; A.kelas = 'bad'; gambar(); return; }
        jalankan('absen_daftar_putus', { p_id: +id, p_setuju: true, p_nama_payroll: nama, p_lokasi_id: +lk.value }, 'Pendaftaran disetujui. Staf bisa langsung absen.', null, function (r) {
          return r.akun_baru ? ' Kalau login Google masih mode uji, tambahkan emailnya sebagai test user di Google Cloud.' : '';
        });
      };
    });
    el.querySelectorAll('[data-dftidak]').forEach(function (b) {
      b.onclick = function () {
        if (!confirm('Tolak pendaftaran ini?')) return;
        jalankan('absen_daftar_putus', { p_id: +b.getAttribute('data-dftidak'), p_setuju: false, p_nama_payroll: '', p_lokasi_id: null }, 'Pendaftaran ditolak.');
      };
    });
    var ss = el.querySelector('#stSimpan');
    if (ss) ss.onclick = function () {
      var items = [];
      (A._nama || []).forEach(function (n, i) {
        var email = el.querySelector('[data-email="' + i + '"]').value.trim(), lok = el.querySelector('[data-lok="' + i + '"]').value, aktif = el.querySelector('[data-aktif="' + i + '"]').checked;
        var lama = ((A.data.staf || []).filter(function (s) { return s.nama === n; })[0]);
        if (!lama && !email && !aktif) return;
        items.push({ nama: n, email: email, lokasi_id: lok, aktif: aktif });
      });
      var kurang = items.filter(function (x) { return x.aktif && (!x.email || !x.lokasi_id); }).map(function (x) { return x.nama; });
      if (kurang.length) { A.pesan = 'Lengkapi email dan lokasi untuk: ' + esc(kurang.join(', ')) + '.'; A.kelas = 'bad'; gambar(); return; }
      jalankan('absen_staf_simpan', { p_items: items }, 'Daftar staf tersimpan.', null, function (d) {
        var t = '';
        if (d.akun_baru && d.akun_baru.length) t += ' Akun baru (peran Absensi): ' + d.akun_baru.join(', ') + '. Kalau login Google masih mode uji, tambahkan email ini sebagai test user di Google Cloud.';
        if (d.akun_gagal && d.akun_gagal.length) t += ' Belum bisa didaftarkan otomatis, tambahkan manual di Master Data: ' + d.akun_gagal.join(', ') + '.';
        return t;
      });
    };
  }
  async function jalankan(f, arg, ok, sebelum, tambah) {
    if (A.sibuk) return;
    A.sibuk = true; A.pesan = 'Menyimpan…'; A.kelas = 'ok'; gambar();
    try {
      var d = await rpc(f, arg);
      if (sebelum) sebelum();
      A.pesan = esc(ok + (tambah ? tambah(d) : '')); A.kelas = 'ok';
    } catch (e) { A.pesan = esc(e.message || e); A.kelas = 'bad'; A.sibuk = false; gambar(); return; }
    A.sibuk = false; await muat();
  }

  window.AbsenKelola = {
    gambar: function (el, sb) {
      A.el = el; A.sb = sb;
      if (!document.getElementById('akGaya')) { var g = document.createElement('style'); g.id = 'akGaya'; g.textContent = CSS; document.head.appendChild(g); }
      A.pesan = ''; muat(); if (!A.payroll) muatPayroll().then(function () { if (A.tab === 'atur') gambar(); });
    }
  };
})();
