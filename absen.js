/* =====================================================================
   UPLOAD ABSENSI (Payroll): ambil absen dari aplikasi Absensi (absensi.html, Supabase absen_rekap)
   atau baca file export mesin absensi (.xlsx / .xls / .csv), hitung telat, lembur, alpa, dan uang makan
   per staf, lalu masukkan ke Gaji staf (Draft). Izin / cuti / sakit yang disetujui di aplikasi tidak dihitung alpa.
   Aturan hitung (manajemen Moscow Supplies, Okt 2026):
   - Jam kerja 10.00-17.00. Gaji per menit = gaji pokok / 26 / 8 / 60.
   - Telat: toleransi 15 menit; lewat toleransi semua menit telat dipotong (gaji per menit x menit).
   - Lembur (PP 35/2021): upah per jam = gaji pokok / 173; dihitung per hari sejak 17.20 (scan pulang
     lewat lebih dari 20 menit), per menit; jam ke-1 1,5x, sisanya 2x. Tidak ada lembur di hari libur.
   - Uang makan Rp 20.000 x 26 hari (tetap); alpa dipotong gaji per hari (gaji pokok / 26) + uang makan per hari.
     Izin / cuti yang disetujui tetap dibayar: kurangi angka alpa di tabel.
   Potongan alpa disimpan di kolom Telat (gaji_log belum punya kolom alpa); rinciannya di catatan.
   ===================================================================== */
(function () {
  'use strict';
  var BLS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var NAMA_IZIN = { izin: 'Izin', cuti: 'Cuti', sakit: 'Sakit' };
  var HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  var ATUR = { masuk: 600, toleransi: 15, pulang: 1020, batasLembur: 1040, hariKerja: 26, jamSehari: 8, pembagiLembur: 173, makanSehari: 20000 };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rp(n) { return 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID'); }
  function jam(m) { if (m == null) return '–'; m = Math.round(m); return ('0' + Math.floor(m / 60)).slice(-2) + '.' + ('0' + (m % 60)).slice(-2); }
  function durasi(m) { m = Math.round(m || 0); var j = Math.floor(m / 60), s = m % 60; return (j ? j + ' jam ' : '') + (s || !j ? s + ' mnt' : ''); }
  function rapiNama(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  function ymd(y, m, d) { return y + '-' + ('0' + m).slice(-2) + '-' + ('0' + d).slice(-2); }
  function simpanLokal(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  function bacaLokal(k, b) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? b : v; } catch (e) { return b; } }

  var CSS = '' +
    '.ab{max-width:1100px}.ab h2{font-size:18px;margin:0 0 4px}.ab .sb{color:var(--abu);font-size:13.5px;line-height:1.5;margin:0 0 14px}' +
    '.ab-kotak{background:#fff;border:1px solid var(--garis);border-radius:14px;padding:14px 16px;margin-bottom:14px}' +
    '.ab-f{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}.ab-f label{display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:700;color:var(--teks2)}' +
    '.ab-f input[type=text]{height:44px;padding:0 12px;border:1px solid var(--garis);border-radius:12px;font-size:15px;background:#fff}' +
    '.ab-f input[type=file]{font-size:14px}.ab-hr{display:flex;flex-wrap:wrap;gap:6px}.ab-hr label{flex-direction:row;align-items:center;gap:4px;font-weight:600}' +
    '.ab-kp{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:14px}' +
    '.ab-kp div{background:#fff;border:1px solid var(--garis);border-radius:14px;padding:12px 14px}.ab-kp span{display:block;font-size:12.5px;color:var(--abu);font-weight:600}.ab-kp b{display:block;font-size:20px;font-weight:800;margin-top:2px}' +
    '.ab-gl{overflow-x:auto;background:#fff;border:1px solid var(--garis);border-radius:14px}' +
    '.ab-t{width:100%;border-collapse:collapse;font-size:13.5px}.ab-t th{text-align:left;font-size:12px;color:var(--abu);padding:10px 8px;border-bottom:1px solid var(--garis);white-space:nowrap}' +
    '.ab-t td{padding:10px 8px;border-bottom:1px solid var(--garis2);vertical-align:top}.ab-t .r{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}' +
    '.ab-t small{display:block;color:var(--abu);font-size:12px}.ab-t select{max-width:190px;height:36px;border:1px solid var(--garis);border-radius:10px;font-size:13.5px;background:#fff}' +
    '.ab-t input{width:58px;height:36px;padding:0 8px;border:1px solid var(--garis);border-radius:10px;text-align:right;font-size:14px}' +
    '.ab-t tr.lewat td{color:var(--abu)}.ab-merah{color:var(--merah);font-weight:700}.ab-hijau{color:var(--hijau);font-weight:700}' +
    '.ab-rinci summary{cursor:pointer;color:var(--biruTua);font-size:12.5px;font-weight:700;margin-top:4px}' +
    '.ab-rinci table{border-collapse:collapse;font-size:12.5px;margin-top:6px}.ab-rinci td,.ab-rinci th{padding:3px 10px 3px 0;border:0;white-space:nowrap}' +
    '.ab-aksi{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:14px}' +
    '.ab-pre{overflow:auto;max-height:260px;font-size:12px;background:var(--latar);border-radius:10px;padding:8px}.ab-pre td{padding:2px 8px;border-bottom:1px solid var(--garis2);white-space:nowrap}';

  var A = { el: null, sb: null, opsi: {}, file: '', scan: null, izin: {}, uji: {}, jamStaf: {}, sumber: '', perPilih: '', per: '', gaji: null, peta: {}, alpa: {}, pesan: '', kelas: 'ok', sibuk: false, mentah: null,
            libur: bacaLokal('abLibur', [0]), merah: '' };

  /* ---------- membaca file ---------- */
  function muatXlsx() {
    if (window.XLSX) return Promise.resolve();
    return new Promise(function (ok, gagal) {
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = function () { ok(); }; s.onerror = function () { gagal(new Error('Pembaca Excel gagal dimuat. Periksa internet lalu coba lagi.')); };
      document.head.appendChild(s);
    });
  }
  // Satu sel -> { d: 'yyyy-mm-dd' | null, t: [menit, ...] }
  function bacaSel(v) {
    var hasil = { d: null, t: [] };
    if (v == null || v === '') return hasil;
    if (v instanceof Date && !isNaN(v)) {
      var y = v.getFullYear();
      if (y > 1900) hasil.d = ymd(y, v.getMonth() + 1, v.getDate());
      var mn = v.getHours() * 60 + v.getMinutes();
      if (mn || y <= 1900) hasil.t.push(mn);
      return hasil;
    }
    if (typeof v === 'number') {
      var hari = Math.floor(v), pecahan = v - hari;
      if (hari >= 20000) { var dt = new Date(Math.round((hari - 25569) * 86400000)); hasil.d = ymd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()); }
      if (pecahan > 0) hasil.t.push(Math.round(pecahan * 1440));
      return hasil;
    }
    var s = String(v).trim();
    var m = /(\d{1,4})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/.exec(s);
    if (m) {
      var a = +m[1], b = +m[2], c = +m[3];
      if (m[1].length === 4) hasil.d = ymd(a, b, c);
      else { if (c < 100) c += 2000; hasil.d = a > 12 || b <= 12 ? ymd(c, b, a) : ymd(c, a, b); }
      s = s.slice(0, m.index) + ' ' + s.slice(m.index + m[0].length);
    }
    var re = /(\d{1,2})[:.](\d{2})(?:[:.]\d{2})?\s*(am|pm)?/gi, t;
    while ((t = re.exec(s))) {
      var j = +t[1], n = +t[2];
      if (t[3]) { var pm = /pm/i.test(t[3]); if (pm && j < 12) j += 12; if (!pm && j === 12) j = 0; }
      if (j < 24 && n < 60) hasil.t.push(j * 60 + n);
    }
    return hasil;
  }
  function cariKolom(kepala, re, kecuali) {
    for (var i = 0; i < kepala.length; i++) if (re.test(kepala[i]) && !(kecuali && kecuali.test(kepala[i]))) return i;
    return -1;
  }
  // Mengembalikan { scan: { nama: { 'yyyy-mm-dd': [menit...] } }, baris: n } atau null kalau formatnya belum dikenali.
  function bacaLembar(rows) {
    for (var h = 0; h < Math.min(rows.length, 30); h++) {
      var kepala = rows[h].map(function (x) { return String(x == null ? '' : x).toLowerCase().replace(/\s+/g, ' ').trim(); });
      var kNama = cariKolom(kepala, /^(nama|name|nama karyawan|nama pegawai|nama staf|employee|employee name|nama lengkap)$/);
      if (kNama < 0) kNama = cariKolom(kepala, /nama|name/, /dept|departemen|bagian|jabatan/);
      if (kNama < 0) continue;
      var kGabung = cariKolom(kepala, /(tanggal|tgl|date).*(jam|waktu|time)|date ?time|waktu scan|scan time|check ?time|^waktu$|^time$/);
      var kTgl = cariKolom(kepala, /^(tanggal|tgl|date|hari\/tanggal|tanggal scan)$|tanggal|^tgl/);
      var kMasuk = cariKolom(kepala, /masuk|scan in|clock ?in|check ?in|^in$|datang|jam kerja masuk/, /pulang|keluar|out/);
      var kPulang = cariKolom(kepala, /pulang|keluar|scan out|clock ?out|check ?out|^out$/);
      var kJam = cariKolom(kepala, /^(jam|waktu|time|jam scan|scan)$/);
      if (kGabung < 0 && kTgl < 0 && kMasuk < 0) continue;
      var scan = {}, n = 0;
      for (var i = h + 1; i < rows.length; i++) {
        var r = rows[i], nama = String(r[kNama] == null ? '' : r[kNama]).replace(/\s+/g, ' ').trim();
        if (!nama || /^(total|jumlah)/i.test(nama)) continue;
        var tgl = kTgl > -1 ? bacaSel(r[kTgl]).d : null, waktu = [];
        [kGabung, kMasuk, kPulang, kJam].forEach(function (k) {
          if (k < 0 || (k === kTgl && k !== kGabung)) return;
          var x = bacaSel(r[k]); if (x.d && !tgl) tgl = x.d; waktu = waktu.concat(x.t);
        });
        if (!tgl || !waktu.length) continue;
        var o = scan[nama] || (scan[nama] = {}); (o[tgl] || (o[tgl] = [])).push.apply(o[tgl], waktu); n++;
      }
      if (n) return { scan: scan, baris: n };
    }
    return null;
  }
  async function bacaFile(f) {
    await muatXlsx();
    var buf = await f.arrayBuffer();
    var wb = XLSX.read(buf, { type: 'array', cellDates: true });
    var semua = { scan: {}, baris: 0 }, contoh = null;
    wb.SheetNames.forEach(function (nm) {
      var rows = XLSX.utils.sheet_to_json(wb.Sheets[nm], { header: 1, raw: true, defval: '' });
      if (!contoh && rows.length) contoh = rows.slice(0, 12);
      var h = bacaLembar(rows); if (!h) return;
      semua.baris += h.baris;
      Object.keys(h.scan).forEach(function (n) {
        var o = semua.scan[n] || (semua.scan[n] = {});
        Object.keys(h.scan[n]).forEach(function (d) { (o[d] || (o[d] = [])).push.apply(o[d], h.scan[n][d]); });
      });
    });
    return { hasil: semua.baris ? semua.scan : null, contoh: contoh };
  }

  /* ---------- menghitung ---------- */
  function periodeDari(scan) {
    var hit = {};
    Object.keys(scan).forEach(function (n) { Object.keys(scan[n]).forEach(function (d) { var p = d.slice(0, 7); hit[p] = (hit[p] || 0) + 1; }); });
    return Object.keys(hit).sort(function (a, b) { return hit[b] - hit[a]; })[0] || '';
  }
  function tanggalMerah() {
    var s = {}; String(A.merah || '').split(/[^0-9]+/).forEach(function (x) { if (x && +x >= 1 && +x <= 31) s[+x] = 1; }); return s;
  }
  function hitungStaf(namaMesin, staf) {
    var per = A.per, y = +per.slice(0, 4), b = +per.slice(5, 7), jml = new Date(y, b, 0).getDate();
    var merah = tanggalMerah(), data = A.scan[namaMesin] || {}, gp = staf ? Number(staf.gp) || 0 : 0;
    var perMenit = gp / ATUR.hariKerja / ATUR.jamSehari / 60, perJamLembur = gp / ATUR.pembagiLembur;
    // Jam kerja staf ini (aplikasi Absensi); file mesin memakai bawaan 10.00–17.00. Lembur mulai 20 menit sesudah jam pulang.
    var js = A.jamStaf[namaMesin] || {}, jMasuk = js.masuk != null ? Number(js.masuk) : ATUR.masuk, jLembur = js.pulang != null ? Number(js.pulang) + 20 : ATUR.batasLembur;
    var r = { hadir: 0, kerja: 0, alpaOtomatis: 0, telatHari: 0, telatMenit: 0, lemburHari: 0, lemburMenit: 0, lemburRp: 0, kurang: 0, libur: 0, hari: [] };
    for (var d = 1; d <= jml; d++) {
      var tg = ymd(y, b, d), dow = new Date(y, b - 1, d).getDay(), libur = A.libur.indexOf(dow) > -1 || !!merah[d] ||
        (Array.isArray(js.hari) && js.hari.indexOf(dow) === -1);   // hari kerja per staf (mis. tim kreatif Senin–Jumat, Sabtu WFH)
      if (A.uji[tg]) continue; // hari uji coba aplikasi Absensi: tidak dihitung (bukan hari kerja, bukan alpa)
      var t = (data[tg] || []).slice().sort(function (p, q) { return p - q; });
      if (!libur) r.kerja++;
      var baris = { tg: tg, d: d, dow: dow, libur: libur, masuk: null, pulang: null, telat: 0, lembur: 0, ket: '' };
      if (!t.length) {
        var iz = (A.izin[namaMesin] || {})[tg];
        if (!libur && iz) { r.izin = (r.izin || 0) + 1; baris.ket = NAMA_IZIN[iz] + ' (disetujui)'; r.hari.push(baris); }
        else if (!libur) { r.alpaOtomatis++; baris.ket = A.sumber === 'app' ? 'Tidak absen' : 'Tidak ada scan'; r.hari.push(baris); }
        continue;
      }
      if (t.length === 1 || t[t.length - 1] - t[0] < 60) {
        if (t[0] < 13 * 60) baris.masuk = t[0]; else baris.pulang = t[t.length - 1];
        baris.ket = A.sumber === 'app' ? (baris.pulang == null ? 'Tidak absen pulang' : 'Tidak absen masuk') : 'Scan cuma sekali'; r.kurang++;
      } else { baris.masuk = t[0]; baris.pulang = t[t.length - 1]; }
      if (libur) { r.libur++; baris.ket = (baris.ket ? baris.ket + '; ' : '') + 'Hari libur (tidak dihitung lembur)'; r.hari.push(baris); continue; }
      r.hadir++;
      if (baris.masuk != null && baris.masuk > jMasuk + ATUR.toleransi) { baris.telat = baris.masuk - jMasuk; r.telatHari++; r.telatMenit += baris.telat; }
      if (baris.pulang != null && baris.pulang > jLembur) {
        baris.lembur = baris.pulang - jLembur; r.lemburHari++; r.lemburMenit += baris.lembur;
        r.lemburRp += perJamLembur * (1.5 * Math.min(baris.lembur, 60) / 60 + 2 * Math.max(baris.lembur - 60, 0) / 60);
      }
      if (baris.telat || baris.lembur || baris.ket) r.hari.push(baris);
    }
    r.telatRp = perMenit * r.telatMenit;
    return r;
  }
  function stafList() { return ((A.gaji && A.gaji.rows) || []).filter(function (x) { return x.kel !== 'Direksi'; }); }
  function cocokOtomatis(namaMesin) {
    var simpan = bacaLokal('abPeta', {});
    var daftar = stafList();
    if (simpan[namaMesin] && daftar.some(function (s) { return s.n === simpan[namaMesin]; })) return simpan[namaMesin];
    var m = rapiNama(namaMesin), tm = m.split(' ');
    var pas = daftar.filter(function (s) { return rapiNama(s.n) === m; })[0]; if (pas) return pas.n;
    var skor = daftar.map(function (s) {
      var ts = rapiNama(s.n).split(' '), n = 0;
      tm.forEach(function (t) { if (t && ts.some(function (x) { return x === t || (t.length >= 3 && x.indexOf(t) === 0); })) n++; });
      return { n: s.n, s: n, depan: ts.some(function (x) { return x === tm[0]; }) };
    }).filter(function (x) { return x.s > 0 && x.depan; }).sort(function (a, b) { return b.s - a.s; });
    if (skor.length && (skor.length === 1 || skor[0].s > skor[1].s)) return skor[0].n;
    return '';
  }
  function hasilSemua() {
    var daftar = stafList();
    return Object.keys(A.scan).sort().map(function (nm) {
      var stafNama = A.peta[nm], staf = daftar.filter(function (s) { return s.n === stafNama; })[0] || null;
      var r = hitungStaf(nm, staf);
      var alpa = A.alpa[nm] != null ? A.alpa[nm] : r.alpaOtomatis;
      var gp = staf ? Number(staf.gp) || 0 : 0, dapatMakan = staf ? Number(staf.um) > 0 : false;
      r.alpa = alpa; r.alpaRp = gp / ATUR.hariKerja * alpa;
      r.um = dapatMakan ? Math.max(0, ATUR.makanSehari * (ATUR.hariKerja - alpa)) : 0;
      r.tl = Math.round(r.telatRp + r.alpaRp); r.lb = Math.round(r.lemburRp);
      return { mesin: nm, staf: staf, r: r };
    });
  }

  /* ---------- tampilan ---------- */
  function gambar() {
    var el = A.el; if (!el) return;
    var h = '<div class="ab"><h2>Hitung absensi ke gaji</h2><p class="sb">Ambil absen bulan ini dari aplikasi Absensi (atau unggah file mesin absensi lama). Sistem menghitung telat, lembur, alpa, dan uang makan per staf, lalu kamu periksa sebelum dimasukkan ke Gaji staf sebagai Draft.</p>';
    h += '<div class="ab-kotak"><div class="ab-f">' +
      '<label>Periode aplikasi Absensi<span style="display:flex;gap:8px"><input type="month" id="abPer" value="' + esc(A.perPilih || bulanIni()) + '" style="height:44px;padding:0 10px;border:1px solid var(--garis);border-radius:12px;font-size:15px">' +
        '<button type="button" class="tbl pri" id="abAmbil"' + (A.sibuk ? ' disabled' : '') + '>Ambil absen</button></span></label>' +
      '<label>Atau file mesin absensi<input type="file" id="abFile" accept=".xlsx,.xls,.csv,.txt"' + (A.sibuk ? ' disabled' : '') + '></label>' +
      '<label>Hari libur rutin<span class="ab-hr">' + HARI.map(function (nm, i) {
        return '<label><input type="checkbox" data-libur="' + i + '"' + (A.libur.indexOf(i) > -1 ? ' checked' : '') + '>' + nm.slice(0, 3) + '</label>';
      }).join('') + '</span></label>' +
      '<label>Tanggal merah bulan ini<input type="text" id="abMerah" inputmode="numeric" placeholder="mis. 17, 25" value="' + esc(A.merah) + '"></label>' +
      '</div></div>';
    if (A.pesan) h += '<div class="msg ' + A.kelas + '" role="status">' + A.pesan + '</div>';
    if (A.mentah) {
      h += '<div class="ab-kotak"><b>Format file belum dikenali.</b><p class="sb" style="margin:6px 0 10px">Sistem mencari kolom Nama dan kolom Tanggal / Jam (atau Jam masuk & Jam pulang). Ini 12 baris pertama file kamu. Kirimkan file ini ke Claude supaya pembacanya disesuaikan.</p><div class="ab-pre"><table>' +
        A.mentah.map(function (r) { return '<tr>' + r.slice(0, 12).map(function (c) { return '<td>' + esc(c instanceof Date ? c.toLocaleString('id-ID') : c) + '</td>'; }).join('') + '</tr>'; }).join('') +
        '</table></div></div>';
    }
    if (A.scan && A.gaji) {
      var hs = hasilSemua(), y = A.per.slice(0, 4), b = +A.per.slice(5, 7);
      var cocok = hs.filter(function (x) { return x.staf; });
      var tot = cocok.reduce(function (s, x) { s.lb += x.r.lb; s.tl += x.r.tl; s.alpa += x.r.alpa; return s; }, { lb: 0, tl: 0, alpa: 0 });
      h += '<div class="ab-kp"><div><span>Periode</span><b>' + BLS[b - 1] + ' ' + y + '</b></div>' +
        '<div><span>Staf terbaca</span><b>' + hs.length + '</b></div>' +
        '<div><span>Total lembur</span><b>' + rp(tot.lb) + '</b></div>' +
        '<div><span>Potongan telat & alpa</span><b>' + rp(tot.tl) + '</b></div></div>';
      if (A.gaji.status === 'Disetujui') h += '<div class="msg bad">Gaji ' + esc(A.gaji.nama) + ' sudah disetujui, jadi tidak bisa diubah dari absensi. Buka kembali dulu di menu Gaji staf kalau ada yang salah.</div>';
      else if (A.gaji.status === 'Menunggu') h += '<div class="msg w">Gaji ' + esc(A.gaji.nama) + ' sedang menunggu persetujuan. Kalau absensi dimasukkan, statusnya kembali Draft.</div>';
      var opsiStaf = stafList();
      h += '<div class="ab-gl"><table class="ab-t"><thead><tr><th>' + (A.sumber === 'app' ? 'Nama di Absensi' : 'Nama di mesin') + '</th><th>Staf di Payroll</th><th class="r">Hadir</th><th class="r">Alpa (hari)</th><th class="r">Telat</th><th class="r">Lembur</th><th class="r">Uang makan</th><th class="r">Potong telat + alpa</th></tr></thead><tbody>';
      hs.forEach(function (x, i) {
        var r = x.r;
        h += '<tr' + (x.staf ? '' : ' class="lewat"') + '><td><b>' + esc(x.mesin) + '</b>' + (r.kurang ? '<small class="ab-merah">' + r.kurang + (A.sumber === 'app' ? ' hari absen tidak lengkap' : ' hari scan cuma sekali') + '</small>' : '') + (r.izin ? '<small>' + r.izin + ' hari izin/cuti/sakit disetujui</small>' : '') +
          (r.hari.length ? '<details class="ab-rinci"><summary>Rincian per hari</summary><table><tr><th>Tanggal</th><th>Masuk</th><th>Pulang</th><th>Telat</th><th>Lembur</th><th>Ket.</th></tr>' +
            r.hari.map(function (d) {
              return '<tr><td>' + HARI[d.dow].slice(0, 3) + ' ' + d.d + '</td><td>' + jam(d.masuk) + '</td><td>' + jam(d.pulang) + '</td><td>' + (d.telat ? '<span class="ab-merah">' + d.telat + ' mnt</span>' : '') +
                '</td><td>' + (d.lembur ? durasi(d.lembur) : '') + '</td><td>' + esc(d.ket) + '</td></tr>';
            }).join('') + '</table></details>' : '') + '</td>' +
          '<td><select data-peta="' + i + '"><option value="">— tidak dihitung —</option>' + opsiStaf.map(function (s) {
            return '<option' + (x.staf && x.staf.n === s.n ? ' selected' : '') + '>' + esc(s.n) + '</option>';
          }).join('') + '</select>' + (x.staf ? '<small>Gaji pokok ' + rp(x.staf.gp) + '</small>' : '') + '</td>' +
          '<td class="r">' + r.hadir + '/' + r.kerja + '</td>' +
          '<td class="r"><input type="text" inputmode="numeric" data-alpa="' + i + '" value="' + r.alpa + '" aria-label="Hari alpa ' + esc(x.mesin) + '">' +
            (r.alpaOtomatis ? '<small>' + r.alpaOtomatis + (A.sumber === 'app' ? ' hari tidak absen' : ' hari tanpa scan') + '</small>' : '') + '</td>' +
          '<td class="r">' + (r.telatMenit ? r.telatMenit + ' mnt<small>' + r.telatHari + ' hari</small>' : '–') + '</td>' +
          '<td class="r">' + (r.lemburMenit ? (x.staf ? rp(r.lb) : '') + '<small>' + durasi(r.lemburMenit) + ', ' + r.lemburHari + ' hari</small>' : '–') + '</td>' +
          '<td class="r">' + (x.staf ? rp(r.um) : '') + '</td>' +
          '<td class="r">' + (x.staf ? rp(r.tl) + (r.alpa ? '<small>alpa ' + rp(r.alpaRp) + '</small>' : '') : '') + '</td></tr>';
      });
      h += '</tbody></table></div>';
      var belum = stafList().filter(function (s) { return !hs.some(function (x) { return x.staf && x.staf.n === s.n; }); });
      if (belum.length) h += '<p class="sb" style="margin-top:10px">' + (A.sumber === 'app' ? 'Belum terdaftar di Absensi' : 'Tidak ada di file absensi') + ' (angkanya tidak diubah): ' + belum.map(function (s) { return esc(s.n); }).join(', ') + '.</p>';
      h += '<p class="sb" style="margin-top:10px">Alpa terisi otomatis dari hari kerja tanpa absen' + (A.sumber === 'app' ? ' dan tanpa izin/cuti/sakit yang disetujui' : '') + '. Kalau masih ada izin yang belum tercatat, kurangi angkanya. Potongan alpa dimasukkan ke kolom Telat, rinciannya ditulis di catatan.</p>';
      h += '<div class="ab-aksi"><button type="button" class="tbl pri" id="abSimpan"' + (A.sibuk || A.gaji.status === 'Disetujui' || !cocok.length ? ' disabled' : '') + '>Masukkan ke Gaji staf (Draft)</button>' +
        '<span class="sb" style="margin:0">' + cocok.length + ' staf akan diperbarui: uang makan, lembur, dan potongan telat.</span></div>';
    }
    h += '</div>';
    el.innerHTML = h;
    pasangAksi();
  }
  function pasangAksi() {
    var el = A.el, f = el.querySelector('#abFile');
    if (f) f.onchange = function () { if (f.files && f.files[0]) proses(f.files[0]); };
    var pa = el.querySelector('#abPer'); if (pa) pa.onchange = function () { A.perPilih = pa.value; };
    var ba = el.querySelector('#abAmbil'); if (ba) ba.onclick = function () { ambilAplikasi((pa && pa.value) || bulanIni()); };
    el.querySelectorAll('[data-libur]').forEach(function (c) {
      c.onchange = function () {
        var i = +c.getAttribute('data-libur');
        A.libur = A.libur.filter(function (x) { return x !== i; }); if (c.checked) A.libur.push(i);
        simpanLokal('abLibur', A.libur); A.alpa = {}; gambar();
      };
    });
    var mr = el.querySelector('#abMerah');
    if (mr) mr.onchange = function () { A.merah = mr.value; A.alpa = {}; gambar(); };
    var hs = A.scan ? Object.keys(A.scan).sort() : [];
    el.querySelectorAll('[data-peta]').forEach(function (s) {
      s.onchange = function () {
        var nm = hs[+s.getAttribute('data-peta')]; A.peta[nm] = s.value;
        var simpan = bacaLokal('abPeta', {}); simpan[nm] = s.value; simpanLokal('abPeta', simpan); gambar();
      };
    });
    el.querySelectorAll('[data-alpa]').forEach(function (inp) {
      inp.onchange = function () {
        var nm = hs[+inp.getAttribute('data-alpa')], v = parseInt(String(inp.value).replace(/[^0-9]/g, ''), 10);
        A.alpa[nm] = isFinite(v) ? Math.min(v, ATUR.hariKerja) : 0; gambar();
      };
    });
    var bt = el.querySelector('#abSimpan'); if (bt) bt.onclick = simpan;
  }
  async function muatGaji() {
    var r = await A.sb.rpc('gaji_data', { p_per: A.per });
    if (r.error) throw new Error(r.error.message);
    if (!r.data || !r.data.ok) throw new Error((r.data && r.data.pesan) || 'Data gaji gagal dimuat.');
    A.gaji = r.data;
  }
  function bulanIni() { try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date()).slice(0, 7); } catch (e) { return new Date().toISOString().slice(0, 7); } }
  // Sumber baru: aplikasi Absensi (jam masuk & pulang dari server, izin yang disetujui).
  async function ambilAplikasi(per) {
    A.sibuk = true; A.pesan = 'Mengambil absen ' + BLS[+per.slice(5, 7) - 1] + ' ' + per.slice(0, 4) + '…'; A.kelas = 'ok'; A.mentah = null; A.scan = null; A.gaji = null; A.alpa = {}; A.izin = {}; gambar();
    try {
      var r = await A.sb.rpc('absen_rekap', { p_per: per });
      if (r.error) throw new Error(/does not exist|schema cache/i.test(r.error.message) ? 'Fitur absensi belum aktif: jalankan sql/absensi.sql di Supabase.' : r.error.message);
      if (!r.data || !r.data.ok) throw new Error((r.data && r.data.pesan) || 'Absen gagal diambil.');
      var scan = {}, izin = {}, uji = {};
      (r.data.uji || []).forEach(function (x) { uji[x.tanggal] = x.keterangan; });
      (r.data.staf || []).forEach(function (n) { scan[n] = {}; });
      (r.data.hari || []).forEach(function (x) {
        var o = scan[x.nama] || (scan[x.nama] = {}), t = o[x.tanggal] || (o[x.tanggal] = []);
        if (x.masuk != null) t.push(Number(x.masuk)); if (x.pulang != null) t.push(Number(x.pulang));
      });
      (r.data.izin || []).forEach(function (x) { (izin[x.nama] || (izin[x.nama] = {}))[x.tanggal] = x.jenis; });
      if (!Object.keys(scan).length) throw new Error('Belum ada staf terdaftar di Absensi. Daftarkan di menu Absensi staf › Staf & lokasi.');
      A.scan = scan; A.izin = izin; A.uji = uji; A.jamStaf = r.data.jam || {}; A.per = per; A.perPilih = per; A.sumber = 'app'; A.file = '';
      await muatGaji();
      A.peta = {}; Object.keys(A.scan).forEach(function (nm) { A.peta[nm] = cocokOtomatis(nm); });
      var belum = Object.keys(A.peta).filter(function (k) { return !A.peta[k]; }).length;
      A.pesan = 'Absen ' + BLS[+per.slice(5, 7) - 1] + ' ' + per.slice(0, 4) + ' terambil: ' + Object.keys(scan).length + ' staf.' +
        (belum ? ' ' + belum + ' nama tidak sama dengan nama di Payroll, pilih di kolom "Staf di Payroll".' : '') +
        (Object.keys(uji).length ? ' Tanggal ' + Object.keys(uji).map(function (t) { return +t.slice(8); }).join(', ') + ' adalah uji coba, tidak dihitung.' : '');
      A.kelas = belum ? 'w' : 'ok';
    } catch (e) { A.pesan = esc(e.message || e); A.kelas = 'bad'; A.scan = null; }
    finally { A.sibuk = false; gambar(); }
  }
  async function proses(f) {
    A.sumber = 'file'; A.izin = {}; A.uji = {}; A.jamStaf = {};
    A.sibuk = true; A.pesan = 'Membaca ' + esc(f.name) + '…'; A.kelas = 'ok'; A.mentah = null; A.scan = null; A.gaji = null; A.alpa = {}; gambar();
    try {
      var h = await bacaFile(f);
      if (!h.hasil) { A.mentah = h.contoh || []; A.pesan = ''; return; }
      A.scan = h.hasil; A.per = periodeDari(A.scan); A.file = f.name;
      await muatGaji();
      A.peta = {}; Object.keys(A.scan).forEach(function (nm) { A.peta[nm] = cocokOtomatis(nm); });
      var belum = Object.keys(A.peta).filter(function (k) { return !A.peta[k]; }).length;
      A.pesan = esc(f.name) + ' terbaca: ' + Object.keys(A.scan).length + ' nama, periode ' + BLS[+A.per.slice(5, 7) - 1] + ' ' + A.per.slice(0, 4) + '.' +
        (belum ? ' ' + belum + ' nama belum dicocokkan dengan staf Payroll, pilih di kolom "Staf di Payroll".' : '');
      A.kelas = belum ? 'w' : 'ok';
    } catch (e) { A.pesan = esc(e.message || e); A.kelas = 'bad'; A.scan = null; }
    finally { A.sibuk = false; gambar(); }
  }
  async function simpan() {
    if (A.sibuk) return;
    var hs = hasilSemua().filter(function (x) { return x.staf; }), per = {};
    hs.forEach(function (x) { per[x.staf.n] = x; });
    var items = (A.gaji.rows || []).map(function (s) {
      var x = per[s.n], cat = String(s.cat || '').replace(/\s*Absensi:[^|]*\|?\s*/g, ' ').trim();
      var it = { n: s.n, um: s.um, lb: s.lb, bn: s.bn, bk: s.bk, bp: s.bp, tl: s.tl, ks: s.ks, cat: cat };
      if (x) {
        var r = x.r;
        it.um = r.um; it.lb = r.lb; it.tl = r.tl;
        var c = 'Absensi: telat ' + r.telatMenit + ' mnt, alpa ' + r.alpa + ' hr (' + rp(r.alpaRp) + '), lembur ' + r.lemburMenit + ' mnt';
        it.cat = (c + (cat ? ' | ' + cat : '')).slice(0, 200);
      }
      return it;
    });
    A.sibuk = true; A.pesan = 'Menyimpan…'; A.kelas = 'ok'; gambar();
    try {
      var r = await A.sb.rpc('gaji_simpan', { p_per: A.per, p_oleh: '', p_kirim: false, p_yakin: true, p_tarik: false, p_items: items,
                                             p_token: 'abs-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) });
      if (r.error) throw new Error(r.error.message);
      if (!r.data || !r.data.ok) throw new Error((r.data && (Array.isArray(r.data.pesan) ? r.data.pesan.join(' ') : r.data.pesan)) || 'Gagal menyimpan.');
      A.pesan = 'Absensi ' + hs.length + ' staf sudah masuk ke Gaji ' + esc(A.gaji.nama) + ' (Draft). Periksa di menu Gaji staf, lalu kirim untuk disetujui.';
      A.kelas = 'ok';
      await muatGaji();
      if (A.opsi.tersimpan) try { A.opsi.tersimpan(A.per); } catch (e) { }
    } catch (e) { A.pesan = 'Gagal menyimpan: ' + esc(e.message || e); A.kelas = 'bad'; }
    finally { A.sibuk = false; gambar(); }
  }

  window.Absensi = {
    gambar: function (el, sb, opsi) {
      A.el = el; A.sb = sb; A.opsi = opsi || {};
      if (!document.getElementById('abGaya')) { var g = document.createElement('style'); g.id = 'abGaya'; g.textContent = CSS; document.head.appendChild(g); }
      gambar();
    },
    // untuk uji: hitung dari data scan tanpa tampilan
    _uji: { bacaSel: bacaSel, bacaLembar: bacaLembar, hitung: function (scan, per, staf, libur, merah, izin) { A.scan = scan; A.per = per; A.libur = libur || [0]; A.merah = merah || ''; A.izin = izin || {}; A.sumber = izin ? 'app' : ''; A.jamStaf = arguments[6] || {}; return hitungStaf(Object.keys(scan)[0], staf); } }
  };
})();
