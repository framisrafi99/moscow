/* =====================================================================
   COCOK MUTASI BANK (Master Data › Accounting › Cocok mutasi bank) — 6 Nov 2026
   Upload PDF / foto mutasi rekening -> dibaca AI (Edge Function mutasi-baca) -> dicocokkan dengan accounting (rpc mutasi_cocok).
   Baris yang belum tercatat bisa langsung dicatat (rpc mutasi_catat): pengeluaran / pemasukan berkategori, atau pindah dana antar akun.
   ===================================================================== */
(function () {
  var BLS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var BANK = ['Rekening Belanja', 'Rekening PT', 'Rekening Danamon'];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rp(n) { n = Math.round(Number(n) || 0); return (n < 0 ? '−Rp' : 'Rp') + Math.abs(n).toLocaleString('id-ID'); }
  function tgl(d) { var p = String(d || '').slice(0, 10).split('-'); return p.length < 3 ? '' : Number(p[2]) + ' ' + BLS[Number(p[1]) - 1]; }
  var S = { el: null, sb: null, akun: 'Rekening Belanja', M: null, C: null, P: null, sibuk: '', pesan: null, buka: {} };
  try { var simpan = JSON.parse(sessionStorage.getItem('mutasiTerakhir') || 'null'); if (simpan && simpan.M) { S.M = simpan.M; S.akun = simpan.akun || S.akun; } } catch (e) { }

  var CSS = '.mt-chip{display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:700;white-space:nowrap}' +
    '.mt-ok{background:#E6F4EA;color:#1E6B34}.mt-geser{background:#FFF4D6;color:#8A5A00}.mt-belum{background:#FDE8E6;color:#A12B1F}' +
    '.mt-db{color:#A12B1F}.mt-cr{color:#1E6B34}.mt-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin-top:8px}' +
    '.mt-ring{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin:8px 0}.mt-ring div{border:1px solid var(--garis,#e3e6ea);border-radius:10px;padding:8px 10px}' +
    '.mt-ring b{display:block;font-size:18px}.mt-row{border-top:1px solid var(--garis,#e3e6ea);padding:10px 0}.mt-row:first-child{border-top:0}' +
    '.mt-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.mt-ket{font-size:13px;color:var(--teks2,#5b6470);margin-top:2px;word-break:break-word}';

  function pesan(c, t) { S.pesan = t ? [c, t] : null; gambar(); }
  function baris() { return S.M ? S.M.baris || [] : []; }
  function hasilKe(i) { return S.C ? (S.C.baris || []).filter(function (x) { return x.i === i; })[0] : null; }

  function gambar() {
    if (!S.el) return;
    var h = '<div class="cd"><h3 style="margin-top:0">Cocok mutasi bank</h3><p class="sb" style="margin:0 0 8px">Upload PDF atau foto mutasi rekening (BCA mobile / KlikBCA / rekening koran). Admin Accounting membaca semua transaksinya, lalu dicocokkan dengan catatan accounting: nominal sama, tanggal maksimal beda 4 hari. Yang belum tercatat bisa langsung dicatat dari sini.</p>' +
      '<div class="mt-form"><label>Rekening<select class="isian" id="mtAkun">' + BANK.map(function (a) { return '<option' + (a === S.akun ? ' selected' : '') + '>' + esc(a) + '</option>'; }).join('') + '</select></label>' +
      '<label>File mutasi (PDF / foto)<input class="isian" type="file" id="mtFile" accept="application/pdf,image/jpeg,image/png"></label></div>' +
      '<div class="aksi-baris" style="margin-top:8px"><button type="button" class="tbl pri" data-mt="baca"' + (S.sibuk ? ' disabled' : '') + '>' + (S.sibuk === 'baca' ? 'Membaca mutasi… (±1 menit)' : 'Baca &amp; cocokkan') + '</button>' +
      (S.M ? ' <button type="button" class="tbl" data-mt="ulang"' + (S.sibuk ? ' disabled' : '') + '>Cocokkan ulang</button>' : '') + '</div></div>';
    if (S.pesan) h += '<div class="msg ' + S.pesan[0] + '">' + esc(S.pesan[1]) + '</div>';
    if (S.M && S.C) h += isiHasil();
    S.el.innerHTML = h;
  }

  function isiHasil() {
    var B = baris(), n = { cocok: 0, geser: 0, belum: 0, gabung: 0 }, db = 0, cr = 0;
    B.forEach(function (b, i) { var c = hasilKe(i); n[c ? c.st : 'belum']++; if (b.arah === 'DB') db += b.v; else cr += b.v; });
    var L = S.C.lain || [];
    var h = '<div class="cd"><div class="kpl"><h3 style="margin:0">' + esc(S.akun) + ' · ' + tgl(S.C.dari) + ' – ' + tgl(S.C.sampai) + '</h3><span class="sb">' + B.length + ' transaksi bank</span></div>' +
      (S.M.terpotong ? '<div class="msg w">Mutasinya panjang sekali; sebagian baris mungkin belum terbaca. Upload per minggu supaya lengkap.</div>' : '') +
      '<div class="mt-ring"><div><span class="sb">Cocok</span><b>' + n.cocok + '</b></div><div><span class="sb">Cocok, tanggal beda</span><b>' + n.geser + '</b></div><div><span class="sb">Cocok gabungan</span><b>' + n.gabung + '</b></div>' +
      '<div><span class="sb">Belum tercatat</span><b style="color:#A12B1F">' + n.belum + '</b></div><div><span class="sb">Di accounting, tidak ada di bank</span><b>' + L.length + '</b></div></div>' +
      '<p class="sb" style="margin:0">Uang keluar ' + rp(db) + ' · uang masuk ' + rp(cr) + (S.M.saldo_awal != null ? ' · saldo awal bank ' + rp(S.M.saldo_awal) : '') + (S.M.saldo_akhir != null ? ' · saldo akhir bank ' + rp(S.M.saldo_akhir) : '') + '</p></div>';
    var urut = B.map(function (b, i) { return i; }).sort(function (a, b) { var o = { belum: 0, gabung: 1, geser: 2, cocok: 3 }; var ca = hasilKe(a), cb = hasilKe(b); return (o[ca ? ca.st : 'belum'] - o[cb ? cb.st : 'belum']) || a - b; });
    h += '<div class="cd"><h3 style="margin-top:0">Transaksi di mutasi bank</h3>' + urut.map(function (i) { return barisMutasi(B[i], i, hasilKe(i)); }).join('') + '</div>';
    if (L.length) h += '<div class="cd"><h3 style="margin-top:0">Ada di accounting, tidak ada di mutasi</h3><p class="sb" style="margin:0 0 6px">Cek apakah rekeningnya benar, nominalnya beda, atau memang belum masuk periode mutasi ini.</p>' +
      L.map(function (x) {
        return '<div class="mt-row"><div class="mt-top"><div><b>' + esc(x.no) + '</b> · ' + tgl(x.t) + ' · ' + esc(x.jenis) + (x.kat ? ' · ' + esc(x.kat) : '') + '<div class="mt-ket">' + esc(x.ket) + '</div></div>' +
          '<b class="' + (x.arah === 'DB' ? 'mt-db' : 'mt-cr') + '">' + (x.arah === 'DB' ? '−' : '+') + rp(x.v) + '</b></div></div>';
      }).join('') + '</div>';
    return h;
  }

  function barisMutasi(b, i, c) {
    var st = c ? c.st : 'belum', chip = st === 'cocok' ? '<span class="mt-chip mt-ok">Cocok</span>' : st === 'geser' ? '<span class="mt-chip mt-geser">Cocok · dicatat ' + tgl(c.tc) + '</span>' : st === 'gabung' ? '<span class="mt-chip mt-ok">Cocok gabungan</span>' : '<span class="mt-chip mt-belum">Belum tercatat</span>';
    var h = '<div class="mt-row"><div class="mt-top"><div>' + tgl(b.t) + ' · ' + chip + '<div class="mt-ket">' + esc(b.ket) + '</div>' +
      (c && c.st === 'gabung' ? '<div class="mt-ket">↳ ' + esc(c.ket) + '</div>' : c && c.no ? '<div class="mt-ket">↳ <b>' + esc(c.no) + '</b> ' + esc(c.jenis === 'Pindah' ? 'Pindah dana ' + (b.arah === 'DB' ? 'ke ' : 'dari ') + (c.lawan || '') : (c.kat || '')) + ' · ' + esc(c.ket) + '</div>' : '') +
      '</div><b class="' + (b.arah === 'DB' ? 'mt-db' : 'mt-cr') + '">' + (b.arah === 'DB' ? '−' : '+') + rp(b.v) + '</b></div>';
    if (st === 'belum') {
      if (!S.buka[i]) h += '<div class="aksi-baris" style="margin-top:6px"><button type="button" class="tbl kcl" data-mt="buka" data-i="' + i + '">Catat di accounting</button></div>';
      else {
        var P = S.P || { akun: [], keluar: [], masuk: [] }, kat = b.arah === 'DB' ? P.keluar : P.masuk;
        h += '<div class="mt-form"><label>Dicatat sebagai<select class="isian" data-mtj="' + i + '"><option value="">' + (b.arah === 'DB' ? 'Pengeluaran' : 'Pemasukan') + ' (pilih kategori)</option>' +
          (P.akun || []).filter(function (a) { return a !== S.akun; }).map(function (a) { return '<option value="@' + esc(a) + '">Pindah dana ' + (b.arah === 'DB' ? 'ke ' : 'dari ') + esc(a) + '</option>'; }).join('') + '</select></label>' +
          '<label>Kategori<select class="isian" data-mtk="' + i + '"><option value="">Pilih…</option>' + (kat || []).map(function (k) { return '<option>' + esc(k) + '</option>'; }).join('') + '</select></label>' +
          '<label style="grid-column:1/-1">Keterangan<input class="isian" maxlength="190" data-mtt="' + i + '" value="' + esc(b.ket + ' (mutasi ' + tgl(b.t) + ')') + '"></label></div>' +
          '<div class="aksi-baris" style="margin-top:6px"><button type="button" class="tbl pri" data-mt="catat" data-i="' + i + '"' + (S.sibuk ? ' disabled' : '') + '>Catat ' + rp(b.v) + '</button> <button type="button" class="tbl" data-mt="tutup" data-i="' + i + '">Batal</button></div>';
      }
    }
    return h + '</div>';
  }

  function keBase64(f) {
    return new Promise(function (ok, gagal) { var r = new FileReader(); r.onload = function () { ok(String(r.result).split(',')[1] || ''); }; r.onerror = gagal; r.readAsDataURL(f); });
  }
  async function baca() {
    var f = S.el.querySelector('#mtFile'); f = f && f.files && f.files[0];
    if (!f) { pesan('bad', 'Pilih file mutasi dulu.'); return; }
    if (f.size > 10e6) { pesan('bad', 'File terlalu besar (maks 10 MB).'); return; }
    S.sibuk = 'baca'; S.pesan = null; gambar();
    try {
      var data = await keBase64(f);
      var r = await S.sb.functions.invoke('mutasi-baca', { body: { file: data, mime: f.type || 'application/pdf', akun: S.akun } });
      var d = r.data;
      if (r.error || !d || !d.ok) { S.sibuk = ''; pesan('bad', (d && d.pesan) || 'Mutasi gagal dibaca. Coba lagi.'); return; }
      if (!d.baris.length) { S.sibuk = ''; pesan('bad', 'Tidak ada transaksi yang terbaca di file ini.'); return; }
      S.M = d; S.buka = {};
      try { sessionStorage.setItem('mutasiTerakhir', JSON.stringify({ M: d, akun: S.akun })); } catch (e) { }
      await cocok();
    } catch (e) { S.sibuk = ''; pesan('bad', 'Gagal: ' + (e && e.message || e)); }
  }
  async function cocok() {
    S.sibuk = 'cocok'; gambar();
    if (!S.P) { var p = await S.sb.rpc('mutasi_pilihan'); S.P = p.data || null; }
    var r = await S.sb.rpc('mutasi_cocok', { p_akun: S.akun, p_rows: baris() });
    S.sibuk = '';
    if (r.error || !r.data || !r.data.ok) { pesan('bad', (r.data && r.data.pesan) || (r.error && r.error.message) || 'Gagal mencocokkan.'); return; }
    S.C = r.data; gabung(); gambar();
  }
  // Cocok gabungan: satu baris bank = beberapa catatan (VA dipecah per barang), atau beberapa baris bank = satu catatan (biaya admin dijumlah).
  function selisihHari(a, b) { return Math.abs((new Date(a) - new Date(b)) / 864e5); }
  function cariJumlah(L, target, maks) {
    var hasil = null, n = Math.min(L.length, 24), langkah = 0;
    (function dfs(i, sisa, pilih) {
      if (hasil || ++langkah > 200000) return;
      if (Math.abs(sisa) < 1 && pilih.length > 1) { hasil = pilih.slice(); return; }
      if (sisa < 0 || i >= n || pilih.length >= maks) return;
      pilih.push(i); dfs(i + 1, sisa - L[i].v, pilih); pilih.pop(); dfs(i + 1, sisa, pilih);
    })(0, target, []);
    return hasil;
  }
  function gabung() {
    var B = baris(), lain = (S.C.lain || []).map(function (x) { return { no: x.no, t: x.t, arah: x.arah, v: Math.round(Number(x.v) || 0), jenis: x.jenis, kat: x.kat, ket: x.ket, pakai: false }; });
    var belum = function () { return B.map(function (b, i) { return i; }).filter(function (i) { var c = hasilKe(i); return !c || c.st === 'belum'; }); };
    var set = function (i, o) { var c = hasilKe(i); if (c) { for (var k in o) c[k] = o[k]; } else S.C.baris.push(Object.assign({ i: i }, o)); };
    // 1) satu baris bank = beberapa catatan accounting
    belum().forEach(function (i) {
      var b = B[i], L = lain.filter(function (x) { return !x.pakai && x.arah === b.arah && x.v <= b.v && selisihHari(x.t, b.t) <= 4; }).sort(function (p, q) { return selisihHari(p.t, b.t) - selisihHari(q.t, b.t); });
      var p = cariJumlah(L, b.v, 6); if (!p) return;
      var dipilih = p.map(function (k) { return L[k]; }); dipilih.forEach(function (x) { x.pakai = true; });
      set(i, { st: 'gabung', no: dipilih.map(function (x) { return x.no; }).join(', '), jenis: '', kat: '', ket: dipilih.map(function (x) { return x.no + ' ' + (x.kat || x.jenis) + ' ' + rp(x.v); }).join(' + '), tc: dipilih[0].t });
    });
    // 2) beberapa baris bank = satu catatan accounting (mis. biaya admin + biaya transfer dijumlah)
    lain.filter(function (x) { return !x.pakai; }).forEach(function (x) {
      var idx = belum().filter(function (i) { return B[i].arah === x.arah && B[i].v <= x.v && selisihHari(B[i].t, x.t) <= 4; }).sort(function (p, q) { return selisihHari(B[p].t, x.t) - selisihHari(B[q].t, x.t); });
      var L = idx.map(function (i) { return { v: B[i].v, i: i }; });
      var p = cariJumlah(L, x.v, 10); if (!p) return;
      x.pakai = true;
      p.forEach(function (k) { set(L[k].i, { st: 'gabung', no: x.no, jenis: x.jenis, kat: x.kat, ket: 'bagian dari ' + x.no + ' ' + rp(x.v) + ' · ' + (x.ket || ''), tc: x.t }); });
    });
    S.C.lain = (S.C.lain || []).filter(function (y) { return !lain.some(function (x) { return x.pakai && x.no === y.no; }); });
  }
  async function catat(i) {
    var b = baris()[i]; if (!b) return;
    var j = S.el.querySelector('[data-mtj="' + i + '"]').value, k = S.el.querySelector('[data-mtk="' + i + '"]').value, t = S.el.querySelector('[data-mtt="' + i + '"]').value.trim();
    var lawan = j.charAt(0) === '@' ? j.slice(1) : '';
    if (!lawan && !k) { pesan('bad', 'Pilih kategori, atau pilih pindah dana.'); return; }
    if (!window.confirm('Catat ' + (b.arah === 'DB' ? 'uang keluar ' : 'uang masuk ') + rp(b.v) + ' tanggal ' + tgl(b.t) + ' di ' + S.akun + (lawan ? ' (pindah dana ' + (b.arah === 'DB' ? 'ke ' : 'dari ') + lawan + ')' : ' · ' + k) + '?')) return;
    S.sibuk = 'catat'; gambar();
    var r = await S.sb.rpc('mutasi_catat', { p_akun: S.akun, p_t: b.t, p_arah: b.arah, p_v: b.v, p_kat: lawan ? '' : k, p_ket: t, p_lawan: lawan });
    S.sibuk = '';
    if (r.error || !r.data || !r.data.ok) { pesan('bad', (r.data && r.data.pesan) || (r.error && r.error.message) || 'Gagal mencatat.'); return; }
    delete S.buka[i]; S.pesan = ['ok', r.data.pesan]; await cocok();
  }

  function pasang(el) {
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-mt]'); if (!b || S.sibuk) return;
      var a = b.getAttribute('data-mt'), i = Number(b.getAttribute('data-i'));
      if (a === 'baca') baca();
      else if (a === 'ulang') { S.pesan = null; cocok(); }
      else if (a === 'buka') { S.buka[i] = true; gambar(); }
      else if (a === 'tutup') { delete S.buka[i]; gambar(); }
      else if (a === 'catat') catat(i);
    });
    el.addEventListener('change', function (e) {
      if (e.target.id === 'mtAkun') { S.akun = e.target.value; if (S.M) cocok(); }
    });
  }

  window.MutasiBank = {
    gambar: function (el, opsi) {
      if (!document.getElementById('mtCss')) { var s = document.createElement('style'); s.id = 'mtCss'; s.textContent = CSS; document.head.appendChild(s); }
      if (S.el !== el) { S.el = el; pasang(el); }
      S.sb = (opsi && opsi.sb) || S.sb;
      gambar();
      if (S.M && !S.C && !S.sibuk) cocok();
    }
  };
})();
