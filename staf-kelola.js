/* =====================================================================
   DATA STAF (Payroll › Data staf) — khusus manajemen Moscow Supplies.
   Tambah karyawan baru, ubah jabatan / gaji tetap, tandai staf resign.
   Sumber data tetap sheet GAJI_STAF: perubahan dikirim lewat antrean md_aksi
   (fungsi Apps Script gjStafUbah), diproses tiap ±5 menit, lalu tersalin ke aplikasi.
   Staf resign tidak dihapus (riwayat gaji tetap ada): kolom Aktif = Tidak.
   ===================================================================== */
(function () {
  'use strict';
  var TZ = 'Asia/Makassar';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rp(n) { return 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID'); }
  function angka(v) { var n = Number(String(v == null ? '' : v).replace(/[^\d]/g, '')); return isFinite(n) ? n : 0; }
  function hariIni() { try { return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date()); } catch (e) { return new Date().toISOString().slice(0, 10); } }
  function waktu(ts) { try { return new Date(ts).toLocaleString('id-ID', { timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }

  var CSS = '' +
    '.sk{max-width:1100px}.sk h2{font-size:18px;margin:0 0 4px}.sk .sb{color:var(--abu);font-size:13.5px;line-height:1.5;margin:0 0 12px}' +
    '.sk-kotak{background:#fff;border:1px solid var(--garis);border-radius:14px;padding:14px 16px;margin-bottom:14px}' +
    '.sk-gl{overflow-x:auto}.sk-t{width:100%;border-collapse:collapse;font-size:13.5px}' +
    '.sk-t th{text-align:left;font-size:12px;color:var(--abu);padding:10px 8px;border-bottom:1px solid var(--garis);white-space:nowrap}' +
    '.sk-t td{padding:9px 8px;border-bottom:1px solid var(--garis2);vertical-align:middle}.sk-t td.r{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}' +
    '.sk-t small{display:block;color:var(--abu);font-size:12px}.sk-tb{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}' +
    '.sk-f{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;align-items:end}' +
    '.sk-f label{display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:700;color:var(--teks2)}' +
    '.sk-f input,.sk-f select{height:42px;padding:0 12px;border:1px solid var(--garis);border-radius:12px;font-size:15px;background:#fff;min-width:0}' +
    '.sk-r{display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid var(--garis2);font-size:13.5px}.sk-r:last-child{border-bottom:0}.sk-r small{display:block;color:var(--abu);font-size:12px}.sk-r .label{white-space:nowrap;align-self:flex-start}';

  var S = { el: null, sb: null, rows: null, aksi: [], ubah: null, tambah: false, pesan: '', kelas: 'ok', sibuk: false };

  async function muat() {
    S.sibuk = true; gambar();
    try {
      var h = await Promise.all([
        S.sb.rpc('gaji_data', { p_per: hariIni().slice(0, 7) }),
        S.sb.from('md_aksi').select('id,ringkas,status,hasil,dibuat,diproses').eq('fungsi', 'gjStafUbah').order('id', { ascending: false }).limit(15)
      ]);
      if (h[0].error) throw new Error(h[0].error.message);
      if (!h[0].data || h[0].data.ok === false) throw new Error((h[0].data && h[0].data.pesan) || 'Data staf gagal dimuat.');
      S.rows = (h[0].data.rows || []).slice().sort(function (a, b) { return (a.kel === 'Direksi') - (b.kel === 'Direksi') || a.n.localeCompare(b.n, 'id'); });
      S.aksi = h[1].error ? [] : (h[1].data || []);
    } catch (e) { S.pesan = esc(e.message || e); S.kelas = 'bad'; }
    finally { S.sibuk = false; gambar(); }
  }

  function formStaf(x, baru) {
    x = x || {};
    var v = function (k) { return x[k] != null && x[k] !== '' ? x[k] : ''; };
    return '<div class="sk-f">' +
      (baru ? '<label>Nama lengkap<input id="skNama" maxlength="80" placeholder="sesuai KTP"></label>' : '') +
      '<label>Jabatan / divisi<input id="skDiv" maxlength="60" value="' + esc(v('div')) + '" placeholder="mis. Staf Produksi"></label>' +
      '<label>Kelompok<select id="skKel"><option' + (x.kel !== 'Direksi' ? ' selected' : '') + '>Karyawan</option><option' + (x.kel === 'Direksi' ? ' selected' : '') + '>Direksi</option></select></label>' +
      '<label>Gaji pokok<input id="skGp" inputmode="numeric" value="' + esc(v('gp')) + '" placeholder="mis. 3000000"></label>' +
      '<label>Uang makan / bulan<input id="skUm" inputmode="numeric" value="' + esc(v('um')) + '" placeholder="mis. 520000"></label>' +
      (baru ? '<label>Paket BPJS<select id="skPk"><option value="">–</option><option>A</option><option>B</option></select></label>' : '') +
      '<label>BPJS karyawan / bulan<input id="skBk" inputmode="numeric" value="' + esc(v('bk')) + '" placeholder="0"></label>' +
      '<label>BPJS ditanggung PT / bulan<input id="skBp" inputmode="numeric" value="' + esc(v('bp')) + '" placeholder="0"></label>' +
      '<label>No WA (untuk slip gaji)<input id="skWa" inputmode="tel" maxlength="30" value="' + esc(v('wa')) + '" placeholder="08…"></label>' +
      '</div>';
  }
  function bacaForm(baru) {
    var el = S.el, q = function (id) { var e = el.querySelector('#' + id); return e ? e.value.trim() : ''; };
    var p = { divisi: q('skDiv'), kelompok: q('skKel'), gp: angka(q('skGp')), um: angka(q('skUm')), bk: angka(q('skBk')), bp: angka(q('skBp')), wa: q('skWa') };
    if (baru) { p.nama = q('skNama').replace(/\s+/g, ' '); p.pk = q('skPk'); }
    return p;
  }

  function gambar() {
    var el = S.el; if (!el) return;
    var h = '<div class="sk"><h2>Data staf</h2><p class="sb">Tambah karyawan baru, ubah jabatan atau gaji tetap, dan tandai staf yang resign. Perubahan tersimpan ke sheet GAJI_STAF dalam ±5 menit, lalu otomatis ikut ke Gaji staf. Staf resign tidak dihapus supaya riwayat gajinya tetap ada.</p>';
    if (S.pesan) h += '<div class="msg ' + S.kelas + '" role="status">' + S.pesan + '</div>';
    // tambah staf
    h += '<div class="sk-kotak">' + (S.tambah ? '<b>Tambah karyawan baru</b>' + formStaf({ kel: 'Karyawan' }, true) +
        '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button type="button" class="tbl pri" id="skSimpanBaru"' + (S.sibuk ? ' disabled' : '') + '>Simpan karyawan baru</button><button type="button" class="tbl" id="skBatal">Batal</button></div>' +
        '<p class="sb" style="margin:10px 0 0">Setelah tersimpan, daftarkan juga di <b>Absensi staf › Staf & lokasi</b> (email Google, lokasi, jam kerja), atau minta staf mendaftar sendiri lewat aplikasi.</p>'
      : '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><b>Karyawan baru masuk?</b><button type="button" class="tbl pri" id="skTambah">+ Tambah karyawan</button></div>') + '</div>';
    // daftar staf aktif
    if (!S.rows) h += '<div class="ksg">' + (S.sibuk ? 'Memuat…' : '') + '</div>';
    else {
      h += '<div class="sk-kotak"><b>Staf aktif (' + S.rows.length + ')</b><div class="sk-gl"><table class="sk-t"><thead><tr><th>Nama</th><th>Jabatan</th><th class="r">Gaji pokok</th><th class="r">Uang makan</th><th></th></tr></thead><tbody>' +
        S.rows.map(function (x, i) {
          var buka = S.ubah === i, keluar = S.aksi.some(function (a) { return a.status === 'menunggu' && a.ringkas.indexOf('Resign: ' + x.n) === 0; });
          return '<tr><td><b>' + esc(x.n) + '</b>' + (x.kel === 'Direksi' ? '<small>Direksi</small>' : '') + (keluar ? '<small style="color:var(--merah,#B42318)">Sedang diproses resign</small>' : '') + '</td><td>' + esc(x.div || '–') + '</td>' +
            '<td class="r">' + rp(x.gp) + '</td><td class="r">' + rp(x.um) + '</td>' +
            '<td><div class="sk-tb"><button type="button" class="tbl kcl" data-ubah="' + i + '">' + (buka ? 'Tutup' : 'Ubah') + '</button>' +
            (x.kel === 'Direksi' || keluar ? '' : '<button type="button" class="tbl kcl mer" data-resign="' + i + '">Resign</button>') + '</div></td></tr>' +
            (buka ? '<tr><td colspan="5" style="background:var(--latar)">' + formStaf(x, false) +
              '<div style="margin-top:10px"><button type="button" class="tbl pri" id="skSimpanUbah" data-i="' + i + '"' + (S.sibuk ? ' disabled' : '') + '>Simpan perubahan</button></div></td></tr>' : '');
        }).join('') + '</tbody></table></div></div>';
    }
    // riwayat
    if (S.aksi.length) {
      var ST = { menunggu: ['Diproses ±5 menit', 'w'], selesai: ['Tersimpan', 'ok'], gagal: ['Gagal', 'no'] };
      h += '<div class="sk-kotak"><b>Riwayat perubahan</b>' + S.aksi.map(function (a) {
        var st = ST[a.status] || [a.status, 'abu'], ps = a.hasil && a.hasil.pesan ? a.hasil.pesan : '';
        return '<div class="sk-r"><div>' + esc(a.ringkas) + '<small>' + esc(waktu(a.dibuat)) + (a.status === 'gagal' && ps ? ' · ' + esc(ps) : '') + '</small></div><span class="label ' + st[1] + '">' + st[0] + '</span></div>';
      }).join('') + (S.aksi.some(function (a) { return a.status === 'menunggu'; }) ? '<p class="sb" style="margin:8px 0 0">Tekan <button type="button" class="tbl kcl" id="skMuat">Muat ulang</button> beberapa menit lagi untuk melihat hasilnya.</p>' : '') + '</div>';
    }
    h += '</div>';
    el.innerHTML = h;
    pasang();
  }

  async function antre(param, ringkas, ok) {
    if (S.sibuk) return;
    S.sibuk = true; S.pesan = 'Mengirim…'; S.kelas = 'ok'; gambar();
    try {
      var r = await S.sb.from('md_aksi').insert({ fungsi: 'gjStafUbah', param: param, ringkas: String(ringkas).slice(0, 200) });
      if (r.error) throw new Error(r.error.message);
      S.pesan = esc(ok) + ' Akan tersimpan di sheet dalam ±5 menit.'; S.kelas = 'ok'; S.ubah = null; S.tambah = false;
    } catch (e) { S.pesan = 'Gagal mengirim: ' + esc(e.message || e); S.kelas = 'bad'; S.sibuk = false; gambar(); return false; }
    S.sibuk = false; await muat(); return true;
  }

  // Staf resign yang terdaftar di Absensi ikut dinonaktifkan (tidak bisa absen lagi, tidak dikirimi pengingat).
  async function lepasAbsensi(nama) {
    try {
      var d = await S.sb.rpc('absen_kelola_data', { p_tanggal: hariIni() });
      var s = d.data && d.data.ok ? (d.data.staf || []).filter(function (x) { return x.nama === nama; })[0] : null;
      if (!s || !s.aktif) return '';
      var r = await S.sb.rpc('absen_staf_simpan', { p_items: [{ nama: s.nama, email: s.email || '', lokasi_id: s.lokasi_id || '', aktif: false, jam_masuk: s.jam_masuk || '', jam_pulang: s.jam_pulang || '' }] });
      return r.error || !r.data || !r.data.ok ? ' Nonaktifkan juga di Absensi staf.' : ' Absensinya juga sudah dinonaktifkan.';
    } catch (e) { return ' Nonaktifkan juga di Absensi staf.'; }
  }

  function pasang() {
    var el = S.el;
    var b = el.querySelector('#skTambah'); if (b) b.onclick = function () { S.tambah = true; S.pesan = ''; gambar(); };
    b = el.querySelector('#skBatal'); if (b) b.onclick = function () { S.tambah = false; gambar(); };
    b = el.querySelector('#skMuat'); if (b) b.onclick = function () { S.pesan = ''; muat(); };
    b = el.querySelector('#skSimpanBaru');
    if (b) b.onclick = function () {
      var p = bacaForm(true);
      if (p.nama.length < 3) { S.pesan = 'Tulis nama lengkap karyawan.'; S.kelas = 'bad'; gambar(); return; }
      if (!p.divisi) { S.pesan = 'Isi jabatan / divisi.'; S.kelas = 'bad'; gambar(); return; }
      if (!p.gp) { S.pesan = 'Isi gaji pokok.'; S.kelas = 'bad'; gambar(); return; }
      if ((S.rows || []).some(function (x) { return x.n.toLowerCase() === p.nama.toLowerCase(); })) { S.pesan = esc(p.nama) + ' sudah ada di daftar staf.'; S.kelas = 'bad'; gambar(); return; }
      p.aksi = 'tambah';
      antre(p, 'Tambah karyawan: ' + p.nama + ' (' + p.divisi + ', gaji pokok ' + rp(p.gp) + ')', p.nama + ' dikirim untuk ditambahkan.');
    };
    el.querySelectorAll('[data-ubah]').forEach(function (x) {
      x.onclick = function () { var i = +x.getAttribute('data-ubah'); S.ubah = S.ubah === i ? null : i; S.tambah = false; S.pesan = ''; gambar(); };
    });
    b = el.querySelector('#skSimpanUbah');
    if (b) b.onclick = function () {
      var x = S.rows[+b.getAttribute('data-i')], p = bacaForm(false), beda = [];
      var lama = { divisi: x.div || '', kelompok: x.kel || 'Karyawan', gp: x.gp || 0, um: x.um || 0, bk: x.bk || 0, bp: x.bp || 0, wa: x.wa || '' };
      var label = { divisi: 'jabatan', kelompok: 'kelompok', gp: 'gaji pokok', um: 'uang makan', bk: 'BPJS karyawan', bp: 'BPJS PT', wa: 'No WA' };
      var kirim = { aksi: 'ubah', nama: x.n };
      Object.keys(lama).forEach(function (k) {
        if (String(p[k]) !== String(lama[k])) { kirim[k] = p[k] === 0 ? '0' : p[k]; beda.push(label[k] + ' → ' + (typeof p[k] === 'number' ? rp(p[k]) : p[k])); }
      });
      if (!beda.length) { S.pesan = 'Tidak ada yang berubah.'; S.kelas = 'w'; gambar(); return; }
      antre(kirim, 'Ubah ' + x.n + ': ' + beda.join(', '), 'Perubahan data ' + x.n + ' dikirim.');
    };
    el.querySelectorAll('[data-resign]').forEach(function (x) {
      x.onclick = async function () {
        var s = S.rows[+x.getAttribute('data-resign')];
        var tgl = prompt('Tanggal ' + s.n + ' resign (mis. 31/10/2026):', new Date().toLocaleDateString('id-ID', { timeZone: TZ }));
        if (tgl == null) return;
        var cat = prompt('Catatan (boleh dikosongkan):', '') || '';
        if (!confirm('Tandai ' + s.n + ' resign? Namanya tidak muncul lagi di Gaji staf bulan berikutnya.')) return;
        var ok = await antre({ aksi: 'resign', nama: s.n, tanggal: tgl, catatan: cat }, 'Resign: ' + s.n + (tgl ? ' (' + tgl + ')' : ''), s.n + ' dikirim untuk ditandai resign.');
        if (ok) { var t = await lepasAbsensi(s.n); if (t) { S.pesan += esc(t); gambar(); } }
      };
    });
  }

  window.StafKelola = {
    gambar: function (el, sb) {
      S.el = el; S.sb = sb;
      if (!document.getElementById('skGaya')) { var g = document.createElement('style'); g.id = 'skGaya'; g.textContent = CSS; document.head.appendChild(g); }
      S.pesan = ''; muat();
    }
  };
})();
