/* Bukti transfer setoran bagi hasil consignment (2 Nov 2026).
 * Form toko (consignment.html) menu "Bukti transfer": staf Medan / Sidoarjo / Renon mengupload foto atau PDF bukti transfer
 * bagian Moscow Supplies. Begitu tersimpan, setoran tercatat di accounting sebagai uang pindah dari
 * "Setoran <toko> (belum disetor)" ke Rekening PT (sql/132_setoran_otomatis.sql: setoran_bukti_simpan).
 * Angka yang harus disetor = invoice bagi hasil (bagihasil.js), sama dengan menu Penjualan & Bagi Hasil.
 */
(function () {
  var M = window.Moscow, sb = M.sb, esc = M.esc, rp = M.rp;
  var MULAI = '2026-10';
  var NB = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var S = { el: null, toko: '', nama: '', d: null, bulan: [], form: null, kirim: false };

  function namaBulan(b) { var a = String(b || '').split('-'); return a.length === 2 ? NB[Number(a[1]) - 1] + ' ' + a[0] : String(b || ''); }
  function tgl(s) { var p = String(s || '').slice(0, 10).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : String(s || ''); }
  function hariWita() { return new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10); }
  function bulanBerikut(x) { var a = x.split('-'), y = +a[0], m = +a[1] + 1; if (m > 12) { m = 1; y++; } return y + '-' + (m < 10 ? '0' : '') + m; }
  function token() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
  function angka(v) { var s = String(v || '').replace(/[^\d]/g, ''); return s ? Number(s) : 0; }
  function titik(n) { return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function pesan(teks, jenis) { var p = S.el.querySelector('#stPesan'); if (p) { p.className = 'msg ' + (jenis || 'ok'); p.textContent = teks; p.hidden = !teks; p.scrollIntoView({ block: 'nearest' }); } }
  function hasil(r) {
    if (r.error) return { ok: false, pesan: /does not exist|Could not find the function/i.test(r.error.message) ? 'Fitur bukti transfer belum dipasang di database. Hubungi manajemen Moscow Supplies.' : r.error.message };
    return r.data || { ok: false, pesan: 'Tidak ada jawaban dari server.' };
  }

  // Invoice bagi hasil per bulan (Oktober 2026 sampai bulan ini).
  async function invoiceBulan(b) {
    var r = await sb.rpc('toko_bahan_bagi_hasil', { p_toko: S.toko, p_bulan: b });
    if (r.error || !r.data || r.data.ok !== true || !window.BagiHasil || !window.BagiHasil.invoice) return { bulan: b, gagal: true };
    var v = window.BagiHasil.invoice(S.toko, b, r.data, true);
    if (!v || v.ok === false) return { bulan: b, gagal: true };
    return { bulan: b, terbit: !!v.terbit, kurang: v.kurang || [], harus: Math.round(v.setoran || 0), tercatat: Math.round(v.tercatat || 0), no: v.no };
  }

  async function muat() {
    S.el.innerHTML = '<div class="cd"><div class="sb">Memuat setoran ' + esc(S.toko) + '…</div></div>';
    var d = hasil(await sb.rpc('setoran_bukti_data', { p_toko: S.toko }));
    if (!d.ok) { S.el.innerHTML = '<div class="msg bad">' + esc(d.pesan || 'Gagal memuat.') + '</div><button type="button" class="tbl" id="stUlang">Coba lagi</button>'; S.el.querySelector('#stUlang').onclick = muat; return; }
    S.d = d;
    var daftar = [], kini = String(d.hari || hariWita()).slice(0, 7);
    for (var b = MULAI; b <= kini; b = bulanBerikut(b)) daftar.push(b);
    S.bulan = (await Promise.all(daftar.map(invoiceBulan))).reverse();
    gambar();
  }

  function kartuBulan(x) {
    var sisa = x.harus - x.tercatat, st;
    if (x.gagal) st = '<span class="label abu">gagal dihitung</span>';
    else if (!x.terbit) st = '<span class="label abu">invoice belum terbit</span>';
    else if (x.harus <= 0) st = '<span class="label abu">tidak ada setoran</span>';
    else if (Math.abs(sisa) < 1000) st = '<span class="label ok">lunas</span>';
    else if (sisa > 0) st = '<span class="label w">belum disetor ' + rp(sisa) + '</span>';
    else st = '<span class="label biru">lebih ' + rp(-sisa) + '</span>';
    var h = '<tr><td><b>' + esc(namaBulan(x.bulan)) + '</b>' + (x.no ? '<small>' + esc(x.no) + '</small>' : '') +
      (!x.gagal && !x.terbit && x.kurang.length ? '<small>Menunggu: ' + esc(x.kurang.join(', ')) + '</small>' : '') + '</td>' +
      '<td class="r">' + (x.terbit ? rp(x.harus) + '<small>tercatat ' + rp(x.tercatat) + '</small>' : '–') + '</td>' +
      '<td class="r">' + st + '</td></tr>';
    return h;
  }

  function gambar() {
    var d = S.d, adaSisa = S.bulan.filter(function (x) { return x.terbit && x.harus - x.tercatat >= 1000; });
    var h = '<div id="stPesan" class="msg ok" hidden></div>' +
      '<div class="cd"><div class="kpl"><h3>Bukti transfer setoran</h3><span class="sb">' + esc(S.toko) + '</span></div>' +
      '<p class="sb" style="margin:0">Setelah mentransfer bagian Moscow Supplies dari bagi hasil, upload foto atau PDF bukti transfernya di sini. ' +
      'Begitu tersimpan, setoran langsung tercatat masuk ke Rekening PT Moscow Supplies.</p>' +
      '<div class="gulir"><table class="tabel"><thead><tr><th>Bulan bagi hasil</th><th class="r">Harus disetor</th><th class="r">Status</th></tr></thead><tbody>' +
      S.bulan.map(kartuBulan).join('') + '</tbody></table></div>' +
      (adaSisa.length ? '<button type="button" class="tbl pri" id="stBaru">Upload bukti transfer</button>' : '<p class="sb" style="margin:0">Tidak ada setoran yang menunggu bukti transfer.</p>') +
      '</div>';
    if (S.form) h += formHtml();
    var bukti = d.bukti || [];
    h += '<div class="cd"><h3>Riwayat bukti transfer</h3>';
    if (!bukti.length) h += '<div class="sb">Belum ada bukti transfer yang diupload.</div>';
    else {
      h += '<div class="gulir"><table class="tabel"><tbody>' + bukti.map(function (b) {
        var batal = b.st === 'Batal';
        return '<tr' + (batal ? ' style="opacity:.55"' : '') + '><td><b>' + esc(b.no) + ' · ' + rp(b.v) + '</b>' +
          '<small>Bagi hasil ' + esc(namaBulan(b.bulan)) + ' · transfer ' + esc(tgl(b.t)) + '</small>' +
          '<small>' + esc(String(b.oleh || '').replace(/^staf:\s*/i, '')) + ' · ' + esc(b.w || '') + (b.acc ? ' · accounting ' + esc(b.acc) : '') + '</small>' +
          (b.cat ? '<small>' + esc(b.cat) + '</small>' : '') + (batal && b.alasan ? '<small>Dibatalkan: ' + esc(b.alasan) + '</small>' : '') + '</td>' +
          '<td class="r"><button type="button" class="tbl" data-lihat="' + esc(b.file) + '">Lihat bukti</button>' +
          (batal ? '<br><span class="label no">dibatalkan</span>' : (d.manajemen ? '<br><button type="button" class="tbl" data-batal="' + esc(b.no) + '" style="margin-top:6px">Batalkan</button>' : '<br><span class="label ok">tercatat</span>')) +
          '</td></tr>';
      }).join('') + '</tbody></table></div>';
    }
    var lain = (d.tercatat || []).filter(function (x) { return !bukti.some(function (b) { return b.acc === x.no && b.st !== 'Batal'; }); });
    if (lain.length) {
      h += '<p class="sb" style="margin:6px 0 0">Setoran yang dicatat langsung oleh manajemen Moscow Supplies:</p><div class="gulir"><table class="tabel"><tbody>' + lain.map(function (x) {
        return '<tr><td><b>' + esc(x.no) + ' · ' + rp(x.v) + '</b><small>Bagi hasil ' + esc(namaBulan(x.bulan)) + ' · ' + esc(tgl(x.t)) + ' · ' + esc(x.akun || '') + '</small></td><td class="r"><span class="label ok">tercatat</span></td></tr>';
      }).join('') + '</tbody></table></div>';
    }
    h += '</div>';
    S.el.innerHTML = h;
    var baru = S.el.querySelector('#stBaru');
    if (baru) baru.onclick = function () { var x = adaSisa[0]; S.form = { bulan: x.bulan, nominal: x.harus - x.tercatat, tanggal: hariWita(), cat: '', file: null }; gambar(); var f = S.el.querySelector('#stForm'); if (f) f.scrollIntoView({ block: 'start', behavior: 'smooth' }); };
    S.el.querySelectorAll('[data-lihat]').forEach(function (b) { b.onclick = function () { lihat(b.getAttribute('data-lihat'), b); }; });
    S.el.querySelectorAll('[data-batal]').forEach(function (b) { b.onclick = function () { batalkan(b.getAttribute('data-batal')); }; });
    if (S.form) pasangForm(adaSisa);
  }

  function formHtml() {
    var f = S.form, pilih = S.bulan.filter(function (x) { return x.terbit && x.harus - x.tercatat >= 1000; });
    return '<div class="cd" id="stForm"><h3>Upload bukti transfer</h3>' +
      '<label>Bagi hasil bulan<select class="isian" id="stBulan">' + pilih.map(function (x) {
        return '<option value="' + x.bulan + '"' + (x.bulan === f.bulan ? ' selected' : '') + '>' + esc(namaBulan(x.bulan)) + ' – sisa ' + esc(rp(x.harus - x.tercatat)) + '</option>';
      }).join('') + '</select></label>' +
      '<div class="baris"><label style="flex:1;min-width:150px">Tanggal transfer<input class="isian" type="date" id="stTgl" max="' + hariWita() + '" value="' + esc(f.tanggal) + '"></label>' +
      '<label style="flex:1;min-width:150px">Nominal transfer (Rp)<input class="isian" inputmode="numeric" id="stNom" value="' + esc(titik(f.nominal)) + '"></label></div>' +
      '<label>Foto / PDF bukti transfer<input class="isian" type="file" id="stFile" accept="image/*,application/pdf"></label>' +
      '<label>Catatan (boleh kosong)<input class="isian" id="stCat" maxlength="150" placeholder="mis. transfer dari rekening BCA staf" value="' + esc(f.cat) + '"></label>' +
      '<div class="baris"><button type="button" class="tbl pri" id="stKirim">Simpan bukti transfer</button><button type="button" class="tbl" id="stBatal">Batal</button></div></div>';
  }

  function pasangForm(pilih) {
    var q = function (id) { return S.el.querySelector('#' + id); };
    q('stBulan').onchange = function () { var x = pilih.filter(function (y) { return y.bulan === q('stBulan').value; })[0]; S.form.bulan = this.value; if (x) q('stNom').value = titik(x.harus - x.tercatat); };
    q('stNom').oninput = function () { var n = angka(this.value); this.value = n ? titik(n) : ''; };
    q('stBatal').onclick = function () { S.form = null; gambar(); };
    q('stKirim').onclick = function () { kirim(); };
  }

  // Foto besar dari HP diperkecil dulu supaya cepat terupload (PDF dan foto yang tidak bisa dibaca browser dikirim apa adanya).
  function perkecil(file) {
    return new Promise(function (ok) {
      if (!/^image\/(jpeg|png|webp)$/i.test(file.type) || file.size < 900000) { ok(file); return; }
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var sk = Math.min(1, 1800 / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * sk); c.height = Math.round(img.height * sk);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { ok(b && b.size < file.size ? new File([b], 'bukti.jpg', { type: 'image/jpeg' }) : file); }, 'image/jpeg', 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(url); ok(file); };
      img.src = url;
    });
  }

  async function kirim() {
    if (S.kirim) return;
    var q = function (id) { return S.el.querySelector('#' + id); };
    var bulan = q('stBulan').value, tanggal = q('stTgl').value, nominal = angka(q('stNom').value), cat = q('stCat').value, fl = q('stFile').files[0];
    S.form.tanggal = tanggal; S.form.nominal = nominal; S.form.cat = cat;
    if (!bulan) return pesan('Pilih bulan bagi hasil.', 'bad');
    if (!tanggal) return pesan('Isi tanggal transfer.', 'bad');
    if (!nominal) return pesan('Isi nominal transfer.', 'bad');
    if (!fl) return pesan('Pilih foto atau PDF bukti transfer.', 'bad');
    if (fl.size > 6 * 1024 * 1024 && !/^image\//.test(fl.type)) return pesan('File terlalu besar (maksimal 6 MB).', 'bad');
    var x = S.bulan.filter(function (y) { return y.bulan === bulan; })[0];
    if (x && nominal > (x.harus - x.tercatat) + 1000 && !confirm('Nominal Rp ' + titik(nominal) + ' lebih besar dari sisa setoran ' + namaBulan(bulan) + ' (Rp ' + titik(x.harus - x.tercatat) + '). Tetap simpan?')) return;
    var tbl = q('stKirim'); S.kirim = true; tbl.disabled = true; tbl.textContent = 'Mengupload bukti…';
    try {
      var file = await perkecil(fl);
      if (file.size > 6 * 1024 * 1024) throw new Error('File terlalu besar (maksimal 6 MB). Coba foto ulang dengan ukuran lebih kecil.');
      var ext = (file.type === 'application/pdf' ? 'pdf' : (String(file.name || '').split('.').pop() || 'jpg')).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'jpg';
      var path = S.d.folder + '/' + bulan + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
      var up = await sb.storage.from('setoran').upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false });
      if (up.error) throw new Error('Upload bukti gagal: ' + up.error.message);
      tbl.textContent = 'Menyimpan…';
      var r = hasil(await sb.rpc('setoran_bukti_simpan', { p_toko: S.toko, p_bulan: bulan, p_tanggal: tanggal, p_nominal: String(nominal), p_file: path,
        p_catatan: cat, p_nama: S.nama || '', p_token: token() }));
      if (!r.ok) throw new Error(r.pesan || 'Gagal menyimpan.');
      S.form = null;
      await muat();
      pesan(r.pesan, 'ok');
    } catch (e) {
      pesan(e.message || String(e), 'bad');
      tbl.disabled = false; tbl.textContent = 'Simpan bukti transfer';
    } finally { S.kirim = false; }
  }

  async function lihat(path, tbl) {
    var lama = tbl.textContent; tbl.disabled = true; tbl.textContent = 'Membuka…';
    var w = window.open('', '_blank');
    var r = await sb.storage.from('setoran').createSignedUrl(path, 600);
    tbl.disabled = false; tbl.textContent = lama;
    if (r.error || !r.data) { if (w) w.close(); pesan('Bukti tidak bisa dibuka: ' + ((r.error && r.error.message) || '-'), 'bad'); return; }
    if (w) w.location.href = r.data.signedUrl; else location.href = r.data.signedUrl;
  }

  async function batalkan(no) {
    var alasan = prompt('Batalkan bukti transfer ' + no + '? Catatan setoran di accounting ikut dibatalkan.\n\nAlasan pembatalan:');
    if (alasan === null) return;
    var r = hasil(await sb.rpc('setoran_bukti_batal', { p_no: no, p_alasan: alasan }));
    if (!r.ok) { pesan(r.pesan || 'Gagal membatalkan.', 'bad'); return; }
    await muat();
    pesan(r.pesan, 'ok');
  }

  window.SetoranBukti = {
    buka: function (el, toko, nama) {
      if (!el) return;
      var ganti = S.toko !== toko; S.el = el; S.toko = toko; S.nama = nama || '';
      if (ganti) S.form = null;
      muat();
    }
  };
})();
