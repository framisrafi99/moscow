/* Koreksi laporan penjualan toko (consignment + Toko Offline), 31 Okt 2026.
 * - Form toko (consignment.html): menu "Koreksi penjualan" -> staf mengajukan koreksi satu baris penjualan + alasan.
 * - Master Data (master.html): Persetujuan › Koreksi penjualan -> manajemen Moscow Supplies menyetujui / menolak.
 * Data & aturan ada di Supabase (sql/117_koreksi_jual.sql): toko_koreksi_data, toko_koreksi_ajukan, toko_koreksi_daftar, toko_koreksi_putus.
 */
(function () {
  var M = window.Moscow, sb = M.sb, esc = M.esc, fmt = M.fmt, rp = M.rp;
  var BALIK = 'https://script.google.com/macros/s/AKfycbxcidGDrc33WJYcxzPf1dnRFzgafzbhwomXKlj3KjfYUHosPyI0qNpBcY9tvI7-PgI2/exec?app=balik';

  function tgl(s) { var p = String(s || '').split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : String(s || ''); }
  function hariNama(s) {
    var d = new Date(String(s) + 'T00:00:00');
    return isNaN(d) ? tgl(s) : d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  function namaBrg(x) { return (x.nama || x.kode || '') + (x.warna ? ' – ' + x.warna : ''); }
  function batal(x) { return /DIBATALKAN/i.test(x.pengisi || ''); }
  function persen(v) { return String(Number(v) || 0).replace('.', ',') + '%'; }
  function token() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
  function angka(v) { var n = Number(String(v === undefined || v === null ? '' : v).replace(/[^\d.-]/g, '')); return isFinite(n) ? n : 0; }
  async function salinKeSheet() {
    try {
      var s = await sb.auth.getSession(), t = s && s.data && s.data.session ? s.data.session.access_token : '';
      if (t) fetch(BALIK, { method: 'POST', body: JSON.stringify({ t: t }), keepalive: true }).catch(function () { });
    } catch (e) { }
  }
  function hasil(r) {
    if (r.error) return { ok: false, pesan: /function .* does not exist|Could not find the function/i.test(r.error.message) ? 'Fitur koreksi belum dipasang di database. Hubungi manajemen Moscow Supplies.' : r.error.message };
    return r.data || { ok: false, pesan: 'Tidak ada jawaban dari server.' };
  }
  // Ringkasan isi satu baris: "2 × Rp23.880 · diskon 15% = Rp40.596 · ongkir Rp29.000"
  function rincian(x) {
    var t = fmt(x.qty) + ' × ' + rp(x.harga);
    if (Number(x.diskon)) t += ' · diskon ' + persen(x.diskon);
    t += ' = <b>' + rp(x.total) + '</b>';
    if (Number(x.ongkir)) t += ' · ongkir ' + rp(x.ongkir);
    return t;
  }

  // =====================================================================
  // FORM TOKO
  // =====================================================================
  var T = { el: null, toko: '', nama: '', hari: 14, cari: '', d: null, pilih: null, kirim: false };

  async function muatToko() {
    T.el.innerHTML = '<div class="cd"><div class="sb">Memuat laporan penjualan ' + esc(T.toko) + '…</div></div>';
    var r = hasil(await sb.rpc('toko_koreksi_data', { p_toko: T.toko, p_hari: T.hari }));
    if (!r.ok) { T.el.innerHTML = '<div class="msg bad">' + esc(r.pesan || 'Gagal memuat.') + '</div><button type="button" class="tbl" id="kjUlang">Coba lagi</button>'; T.el.querySelector('#kjUlang').onclick = muatToko; return; }
    T.d = r;
    var tunggu = {};
    (r.ajuan || []).forEach(function (a) { if (a.status === 'Menunggu') tunggu[a.jual_id] = a.no; });
    T.tunggu = tunggu;
    if (T.pilih) { var x = (r.baris || []).filter(function (b) { return b.id === T.pilih.id; })[0]; T.pilih = x && !batal(x) && !tunggu[x.id] ? x : null; }
    gambarToko();
  }

  function gambarToko() {
    if (T.pilih) { gambarForm(); return; }
    var d = T.d, q = T.cari.toLowerCase();
    var h = '<div id="kjPesan"></div><div class="cd"><div class="kpl"><h3>Koreksi laporan penjualan</h3><span class="sb">' + esc(T.toko) + '</span></div>' +
      '<p class="sb" style="margin:0">Salah isi qty, barang, warna, harga, diskon, atau ongkir? Atau ada laporan yang terinput dua kali? Pilih barisnya, isi koreksi dan alasannya. ' +
      'Laporan baru berubah setelah disetujui manajemen Moscow Supplies.</p>' +
      '<div class="baris"><label>Tampilkan<select class="isian" id="kjHari">' + [7, 14, 31, 62].map(function (n) { return '<option value="' + n + '"' + (n === T.hari ? ' selected' : '') + '>' + n + ' hari terakhir</option>'; }).join('') + '</select></label>' +
      '<label>Cari barang / nota<input class="isian" id="kjCari" type="search" placeholder="mis. M02, BLACK, TO-2610…" value="' + esc(T.cari) + '"></label></div></div>';

    var baris = (d.baris || []).filter(function (x) {
      if (!q) return true;
      return [x.kode, x.nama, x.warna, x.nota, x.saluran, x.pembeli].join(' ').toLowerCase().indexOf(q) !== -1;
    });
    if (!baris.length) h += '<div class="cd"><div class="sb">' + (q ? 'Tidak ada penjualan yang cocok dengan pencarian.' : 'Belum ada laporan penjualan dalam ' + T.hari + ' hari terakhir.') + '</div></div>';
    var hari = null, buka = false;
    baris.forEach(function (x) {
      if (x.tanggal !== hari) {
        if (buka) h += '</tbody></table></div></div>';
        hari = x.tanggal; buka = true;
        h += '<div class="cd"><h3 style="font-size:15px">' + esc(hariNama(x.tanggal)) + '</h3><div class="gulir"><table class="tabel"><tbody>';
      }
      var no = T.tunggu[x.id], bt = batal(x);
      var ket = [x.nota, x.saluran, x.pembeli, String(x.pengisi || '').replace(/^form:?\s*/i, '')].filter(Boolean).map(esc).join(' · ');
      h += '<tr' + (bt ? ' style="opacity:.55"' : '') + '><td><b>' + esc(namaBrg(x)) + '</b><small>' + rincian(x) + '</small>' + (ket ? '<small>' + ket + '</small>' : '') + '</td>' +
        '<td class="r">' + (bt ? '<span class="label no">dibatalkan</span>' : no ? '<span class="label w">menunggu ' + esc(no) + '</span>'
          : '<button type="button" class="tbl kcl" data-kj="' + x.id + '">Koreksi</button>') + '</td></tr>';
    });
    if (buka) h += '</tbody></table></div></div>';
    h += gambarAjuan();
    T.el.innerHTML = h;
    T.el.querySelector('#kjHari').onchange = function () { T.hari = +this.value; muatToko(); };
    var c = T.el.querySelector('#kjCari'), tunda;
    c.oninput = function () { clearTimeout(tunda); var v = this.value; tunda = setTimeout(function () { T.cari = v; gambarToko(); var n = T.el.querySelector('#kjCari'); n.focus(); n.setSelectionRange(v.length, v.length); }, 250); };
    T.el.querySelectorAll('[data-kj]').forEach(function (b) {
      b.onclick = function () { var id = +b.getAttribute('data-kj'); T.pilih = (T.d.baris || []).filter(function (x) { return x.id === id; })[0] || null; gambarToko(); window.scrollTo(0, 0); };
    });
  }

  function gambarAjuan() {
    var a = (T.d.ajuan || []).slice(0, 30);
    if (!a.length) return '';
    return '<div class="cd"><h3>Ajuan koreksi</h3><div class="gulir"><table class="tabel"><tbody>' + a.map(function (k) {
      var lbl = k.status === 'Menunggu' ? 'w' : k.status === 'Disetujui' ? 'ok' : 'no';
      var isi = k.jenis === 'batal' ? 'Batalkan baris' : 'Jadi: ' + esc(namaBrg(k.baru)) + ' · ' + rincian(k.baru);
      return '<tr><td><b>' + esc(namaBrg(k.lama)) + '</b><small>' + esc(k.no) + ' · penjualan ' + esc(tgl(k.lama.tanggal)) + ' · diajukan ' + esc(k.waktu) + ' oleh ' + esc(k.pengaju) + '</small>' +
        '<small>' + isi + '</small><small>Alasan: ' + esc(k.alasan) + '</small>' + (k.catatan ? '<small>Catatan manajemen: ' + esc(k.catatan) + '</small>' : '') + '</td>' +
        '<td class="r"><span class="label ' + lbl + '">' + esc(k.status) + '</span>' + (k.putus ? '<small>' + esc(k.putus) + '</small>' : '') + '</td></tr>';
    }).join('') + '</tbody></table></div></div>';
  }

  function gambarForm() {
    var x = T.pilih, d = T.d, BR = {};
    (d.barang || []).forEach(function (b) { BR[b.k] = b; });
    if (!BR[x.kode]) BR[x.kode] = { k: x.kode, n: x.nama, h: x.harga, w: x.warna ? [x.warna] : [] };
    var pakaiDisk = d.offline || Number(x.diskon) || Number(x.ongkir) || x.nota;
    var h = '<div id="kjPesan"></div><div class="cd"><div class="kpl"><h3>Koreksi penjualan</h3><button type="button" class="tbl kcl" id="kjKembali">‹ Kembali</button></div>' +
      '<div class="msg tunggu" style="margin:0"><b>Isi laporan sekarang</b><br>' + esc(hariNama(x.tanggal)) + (x.nota ? ' · ' + esc(x.nota) : '') + (x.saluran ? ' · ' + esc(x.saluran) : '') +
      '<br>' + esc(namaBrg(x)) + '<br>' + rincian(x) + '</div>' +
      '<div class="baris" role="radiogroup" aria-label="Jenis koreksi">' +
      '<label style="display:flex;gap:8px;align-items:center;font-size:14px;color:var(--teks)"><input type="radio" name="kjJenis" value="ubah" checked style="width:18px;height:18px"> Ubah isi laporan</label>' +
      '<label style="display:flex;gap:8px;align-items:center;font-size:14px;color:var(--teks)"><input type="radio" name="kjJenis" value="batal" style="width:18px;height:18px"> Batalkan baris (dobel / salah input)</label></div>' +
      '<div id="kjUbah"><div class="baris"><label style="flex-basis:100%">Barang<select class="isian" id="kjKode">' +
      Object.keys(BR).sort().map(function (k) { return '<option value="' + esc(k) + '"' + (k === x.kode ? ' selected' : '') + '>' + esc(k + ' – ' + BR[k].n) + '</option>'; }).join('') + '</select></label>' +
      '<label id="kjWarnaL">Warna<select class="isian" id="kjWarna"></select></label>' +
      '<label>Qty terjual<input class="isian" id="kjQty" type="number" inputmode="numeric" min="1" step="1" value="' + esc(x.qty) + '"></label>' +
      '<label>Harga satuan (Rp)<input class="isian" id="kjHarga" type="number" inputmode="numeric" min="0" step="1" value="' + esc(x.harga) + '"></label>' +
      (pakaiDisk ? '<label>Diskon (%)<input class="isian" id="kjDisk" type="number" inputmode="decimal" min="0" max="100" step="0.5" value="' + esc(x.diskon || 0) + '"></label>' +
        '<label>Ongkir (Rp)<input class="isian" id="kjOngkir" type="number" inputmode="numeric" min="0" step="1" value="' + esc(x.ongkir || 0) + '"></label>' : '') +
      '</div><div class="msg tunggu" id="kjJadi" style="margin:0"></div></div>' +
      '<label class="sb">Alasan koreksi (wajib)<textarea class="isian" id="kjAlasan" rows="2" maxlength="200" placeholder="mis. salah pilih warna, seharusnya WHITE"></textarea></label>' +
      '<label class="sb">Nama pengaju<input class="isian" id="kjNama" maxlength="40" value="' + esc(T.nama || '') + '"></label>' +
      '<button type="button" class="tbl pri lebar" id="kjKirim">Kirim ajuan koreksi</button></div>';
    T.el.innerHTML = h;
    var $ = function (id) { return T.el.querySelector('#' + id); };

    function isiWarna(pertama) {
      var b = BR[$('kjKode').value] || { w: [] }, w = b.w || [];
      $('kjWarnaL').hidden = !w.length;
      var pilih = pertama ? x.warna : '';
      $('kjWarna').innerHTML = '<option value="">– pilih warna –</option>' + w.map(function (v) { return '<option' + (v === pilih ? ' selected' : '') + '>' + esc(v) + '</option>'; }).join('');
    }
    function jadi() {
      var ubah = T.el.querySelector('input[name="kjJenis"]:checked').value === 'ubah';
      $('kjUbah').hidden = !ubah;
      if (!ubah) return;
      var b = BR[$('kjKode').value] || {}, q = angka($('kjQty').value), hg = angka($('kjHarga').value);
      var dk = $('kjDisk') ? angka($('kjDisk').value) : 0, ok = $('kjOngkir') ? angka($('kjOngkir').value) : 0;
      $('kjJadi').innerHTML = '<b>Setelah dikoreksi</b><br>' + esc(namaBrg({ nama: b.n, kode: b.k, warna: $('kjWarna').value })) + '<br>' +
        rincian({ qty: q, harga: hg, diskon: dk, ongkir: ok, total: Math.round(q * hg * (1 - dk / 100)) });
    }
    isiWarna(true); jadi();
    $('kjKode').onchange = function () { var b = BR[this.value]; if (b && this.value !== x.kode) $('kjHarga').value = b.h || 0; else $('kjHarga').value = x.harga; isiWarna(this.value === x.kode); jadi(); };
    ['kjWarna', 'kjQty', 'kjHarga', 'kjDisk', 'kjOngkir'].forEach(function (id) { if ($(id)) $(id).oninput = jadi; if ($(id)) $(id).onchange = jadi; });
    T.el.querySelectorAll('input[name="kjJenis"]').forEach(function (r) { r.onchange = jadi; });
    $('kjKembali').onclick = function () { T.pilih = null; gambarToko(); };
    var tok = token();
    $('kjKirim').onclick = async function () {
      if (T.kirim) return;
      var jenis = T.el.querySelector('input[name="kjJenis"]:checked').value, alasan = $('kjAlasan').value.trim(), nama = $('kjNama').value.trim();
      var pesan = function (t, ok) { $('kjPesan').innerHTML = '<div class="msg ' + (ok ? 'ok' : 'bad') + '">' + esc(t) + '</div>'; window.scrollTo(0, 0); };
      if (alasan.length < 5) { pesan('Tulis alasan koreksinya dulu.'); return; }
      if (!nama) { pesan('Isi nama pengaju dulu.'); return; }
      var baru = null;
      if (jenis === 'ubah') {
        baru = { kode: $('kjKode').value, warna: $('kjWarna').value, qty: $('kjQty').value, harga: $('kjHarga').value,
          diskon: $('kjDisk') ? $('kjDisk').value : '0', ongkir: $('kjOngkir') ? $('kjOngkir').value : '0' };
      }
      T.kirim = true; this.disabled = true; this.textContent = 'Mengirim…';
      var r = hasil(await sb.rpc('toko_koreksi_ajukan', { p_toko: T.toko, p_jual_id: x.id, p_jenis: jenis, p_baru: baru, p_alasan: alasan, p_nama: nama, p_token: tok }));
      T.kirim = false;
      if (!r.ok) { pesan(r.pesan || 'Gagal mengirim.'); this.disabled = false; this.textContent = 'Kirim ajuan koreksi'; return; }
      T.nama = nama; T.pilih = null;
      await muatToko();
      var p = T.el.querySelector('#kjPesan'); if (p) p.innerHTML = '<div class="msg ok">' + esc(r.pesan) + '</div>';
      window.scrollTo(0, 0);
    };
  }

  // =====================================================================
  // MASTER DATA › PERSETUJUAN
  // =====================================================================
  var S = { d: null, el: null, setelah: null };

  async function muatSetuju() {
    var r = hasil(await sb.rpc('toko_koreksi_daftar'));
    S.d = r.ok ? r : { ok: false, pesan: r.pesan, menunggu: 0, tunggu: [], riwayat: [] };
    return S.d;
  }

  function barisBanding(lbl, a, b) {
    var beda = String(a) !== String(b);
    return '<tr><td>' + lbl + '</td><td class="r">' + a + '</td><td class="r"' + (beda ? ' style="color:var(--biruTua);font-weight:800"' : '') + '>' + b + '</td></tr>';
  }

  function gambarSetuju(el) {
    S.el = el || S.el; el = S.el; if (!el) return;
    var d = S.d;
    if (!d) { el.innerHTML = '<div class="sb">Memuat koreksi penjualan…</div>'; return; }
    if (!d.ok) { el.innerHTML = '<div class="msg bad">' + esc(d.pesan || 'Gagal memuat koreksi penjualan.') + '</div>'; return; }
    var h = '<div id="kjMsg"></div>';
    if (!d.tunggu.length) h += '<div class="cd"><div class="aman">Tidak ada koreksi penjualan yang menunggu.</div></div>';
    d.tunggu.forEach(function (k, i) {
      var L = k.lama, B = k.baru;
      h += '<div class="cd"><div class="rq-kpl"><h3>' + esc(k.toko) + '</h3><span class="sb">' + esc(k.no) + ' · diajukan ' + esc(k.waktu) + ' · ' + esc(k.pengaju) + '</span></div>' +
        '<div class="sb">Penjualan ' + esc(tgl(L.tanggal)) + (L.nota ? ' · ' + esc(L.nota) : '') + (L.saluran ? ' · ' + esc(L.saluran) : '') + ' · diisi ' + esc(String(L.pengisi || '').replace(/^form:?\s*/i, '')) + '</div>';
      if (k.berubah) h += '<div class="msg w" style="margin:0">Baris penjualan ini sudah berubah sejak diajukan. Sebaiknya ditolak, lalu minta staf mengajukan ulang.</div>';
      if (k.jenis === 'batal') {
        h += '<div class="msg w" style="margin:0"><b>Minta baris dibatalkan</b><br>' + esc(namaBrg(L)) + '<br>' + rincian(L) + '</div>';
      } else {
        h += '<div class="gulir"><table class="tabel"><thead><tr><th></th><th class="r">Sekarang</th><th class="r">Diminta</th></tr></thead><tbody>' +
          barisBanding('Barang', esc(L.kode + ' ' + L.nama), esc(B.kode + ' ' + B.nama)) +
          barisBanding('Warna', esc(L.warna || '–'), esc(B.warna || '–')) +
          barisBanding('Qty', fmt(L.qty), fmt(B.qty)) +
          barisBanding('Harga', rp(L.harga), rp(B.harga)) +
          (Number(L.diskon) || Number(B.diskon) ? barisBanding('Diskon', persen(L.diskon), persen(B.diskon)) : '') +
          (Number(L.ongkir) || Number(B.ongkir) ? barisBanding('Ongkir', rp(L.ongkir), rp(B.ongkir)) : '') +
          barisBanding('<b>Total</b>', '<b>' + rp(L.total) + '</b>', '<b>' + rp(B.total) + '</b>') + '</tbody></table></div>';
      }
      h += '<div class="sb">Alasan: ' + esc(k.alasan) + '</div>' +
        '<div class="aksi-baris"><input class="isian" placeholder="Catatan (wajib kalau ditolak)" maxlength="160" data-kjc="' + i + '">' +
        '<button type="button" class="tbl pri" data-kjp="' + i + '" data-aksi="setuju"' + (k.berubah ? ' disabled' : '') + '>Setujui</button>' +
        '<button type="button" class="tbl mer" data-kjp="' + i + '" data-aksi="tolak">Tolak</button></div><div data-kjm="' + i + '"></div></div>';
    });
    if (d.riwayat.length) {
      h += '<div class="cd"><h3>Keputusan terakhir</h3><div class="gulir"><table class="tabel"><tbody>' + d.riwayat.map(function (k) {
        return '<tr><td><b>' + esc(namaBrg(k.lama)) + '</b><small>' + esc(k.toko) + ' · ' + esc(k.no) + ' · ' + esc(k.pengaju) + '</small>' +
          '<small>' + (k.jenis === 'batal' ? 'Batalkan baris' : 'Jadi ' + esc(namaBrg(k.baru)) + ' · ' + fmt(k.baru.qty) + ' pcs · ' + rp(k.baru.total)) + '</small>' +
          (k.catatan ? '<small>Catatan: ' + esc(k.catatan) + '</small>' : '') + '</td>' +
          '<td class="r"><span class="label ' + (k.status === 'Disetujui' ? 'ok' : 'no') + '">' + esc(k.status) + '</span><small>' + esc(k.putus || '') + (k.oleh ? ' · ' + esc(k.oleh) : '') + '</small></td></tr>';
      }).join('') + '</tbody></table></div></div>';
    }
    el.innerHTML = h;
    el.querySelectorAll('[data-kjp]').forEach(function (b) {
      b.onclick = async function () {
        var i = +b.getAttribute('data-kjp'), k = d.tunggu[i], setuju = b.getAttribute('data-aksi') === 'setuju';
        var cat = (el.querySelector('[data-kjc="' + i + '"]').value || '').trim(), tempat = el.querySelector('[data-kjm="' + i + '"]');
        if (!setuju && cat.length < 3) { tempat.innerHTML = '<div class="msg bad">Isi alasan penolakan dulu.</div>'; return; }
        el.querySelectorAll('[data-kjp="' + i + '"]').forEach(function (x) { x.disabled = true; });
        var r = hasil(await sb.rpc('toko_koreksi_putus', { p_no: k.no, p_setuju: setuju, p_catatan: cat }));
        if (!r.ok) { tempat.innerHTML = '<div class="msg bad">' + esc(r.pesan || 'Gagal menyimpan.') + '</div>'; el.querySelectorAll('[data-kjp="' + i + '"]').forEach(function (x) { x.disabled = false; }); return; }
        salinKeSheet();
        if (setuju && S.setelah) try { S.setelah(k); } catch (e) { }
        await muatSetuju(); gambarSetuju();
        var m = el.querySelector('#kjMsg'); if (m) m.innerHTML = '<div class="msg ok">' + esc(r.pesan) + '</div>';
        if (S.badge) S.badge();
      };
    });
  }

  window.KoreksiJual = {
    // Form toko: tampilkan di elemen el untuk toko itu.
    bukaToko: function (el, toko, nama) {
      var ganti = T.toko !== toko;
      T.el = el; T.toko = toko; if (nama && !T.nama) T.nama = nama;
      if (ganti) { T.pilih = null; T.cari = ''; T.d = null; }
      muatToko();
    },
    // Master Data: data & tampilan bagian Persetujuan › Koreksi penjualan.
    muatSetuju: muatSetuju,
    gambarSetuju: gambarSetuju,
    menunggu: function () { return S.d && S.d.ok ? S.d.menunggu || 0 : 0; },
    pasang: function (o) { S.setelah = o.setelah || null; S.badge = o.badge || null; }
  };
})();
