/* =====================================================================
   STOK PACKING (kebutuhan tim packing), dipegang staf produksi.
   Bagian dari menu "Botol, stiker & packaging" di form staf produksi.
   Data: tabel packing_barang & packing_log (Supabase), simpan lewat rpc packing_*.
   ===================================================================== */
(function () {
  var BLS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n) { return (Math.round((Number(n) || 0) * 100) / 100).toLocaleString('id-ID'); }
  function rp(n) { return 'Rp' + Math.round(Number(n) || 0).toLocaleString('id-ID'); }
  function tgl(d) { var p = String(d || '').slice(0, 10).split('-'); return p.length < 3 ? '' : Number(p[2]) + ' ' + BLS[Number(p[1]) - 1] + ' ' + p[0]; }
  function hariIni() { var d = new Date(Date.now() + 8 * 3600e3); return d.toISOString().slice(0, 10); }
  function angka(v) { v = String(v || '').trim().replace(/\./g, '').replace(',', '.'); return v === '' ? null : Number(v); }

  var CSS = '' +
    '.pk-tab{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 14px}' +
    '.pk-tab button{height:40px;padding:0 16px;border:1px solid var(--garis);border-radius:999px;background:#fff;font-weight:700;font-size:14px;color:var(--teks2);cursor:pointer}' +
    '.pk-tab button[aria-pressed="true"]{background:var(--navy);border-color:var(--navy);color:#fff}' +
    '.pk-kp{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:14px}' +
    '.pk-kp div{background:#fff;border:1px solid var(--garis);border-radius:14px;padding:12px 14px}.pk-kp span{display:block;font-size:12.5px;color:var(--abu);font-weight:600}' +
    '.pk-kp b{display:block;font-size:22px;font-weight:800;margin-top:2px}' +
    '.pk-t{width:100%;border-collapse:collapse;font-size:14px}.pk-t th{text-align:left;font-size:12px;color:var(--abu);padding:8px 8px 8px 0;border-bottom:1px solid var(--garis)}' +
    '.pk-t td{padding:10px 8px 10px 0;border-bottom:1px solid var(--garis2);vertical-align:top}.pk-t .r{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}' +
    '.pk-t small{display:block;color:var(--abu);font-size:12px}.pk-t tr.batal td{color:var(--abu);text-decoration:line-through}' +
    '.pk-lbl{display:inline-block;padding:1px 8px;border-radius:999px;font-size:12px;font-weight:700}' +
    '.pk-lbl.Masuk{background:var(--hijauMuda);color:var(--hijau)}.pk-lbl.Keluar{background:var(--biruMuda);color:var(--biruTua)}.pk-lbl.Rusak{background:var(--merahMuda);color:var(--merah)}.pk-lbl.SO{background:var(--kuningMuda);color:var(--kuning)}' +
    '.pk-min{color:var(--merah);font-weight:700}' +
    '.pk-f{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}.pk-f label{display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:700;color:var(--teks2)}' +
    '.pk-f input,.pk-f select,.pk-f textarea{height:44px;padding:0 12px;border:1px solid var(--garis);border-radius:12px;font-size:15px;background:#fff}.pk-f textarea{height:70px;padding:10px 12px}' +
    '.pk-f .pn{grid-column:1/-1}.pk-aksi{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}' +
    '.pk-so input{width:110px;height:40px;padding:0 10px;border:1px solid var(--garis);border-radius:10px;text-align:right;font-size:15px}' +
    '.pk-gl{overflow-x:auto}';

  var P = { el: null, sb: null, tab: 'stok', barang: [], log: [], pesan: '', kelas: 'ok', bulan: '', ubah: null };

  // Sama dengan packing_stok di server: patokan = SO terakhir (atau stok awal), lalu + masuk − keluar − rusak sesudahnya.
  function stokSemua() {
    var S = {}, so = {};
    P.log.forEach(function (l) {
      if (l.batal || l.jenis !== 'SO') return;
      var x = so[l.barang_id]; if (!x || l.tanggal > x.tanggal || (l.tanggal === x.tanggal && l.id > x.id)) so[l.barang_id] = l;
    });
    P.barang.forEach(function (b) { S[b.id] = so[b.id] ? Number(so[b.id].qty) : Number(b.stok_awal) || 0; });
    P.log.forEach(function (l) {
      if (l.batal || l.jenis === 'SO' || S[l.barang_id] == null) return;
      var p = so[l.barang_id]; if (p && (l.tanggal < p.tanggal || (l.tanggal === p.tanggal && l.id < p.id))) return;
      S[l.barang_id] += (l.jenis === 'Masuk' ? 1 : -1) * (Number(l.qty) || 0);
    });
    return S;
  }
  function namaBrg(id) { var b = P.barang.filter(function (x) { return x.id === id; })[0]; return b ? b.nama : '#' + id; }
  function satuan(id) { var b = P.barang.filter(function (x) { return x.id === id; })[0]; return b ? b.satuan : ''; }

  async function muat() {
    var r = await Promise.all([P.sb.from('packing_barang').select('*').order('nama'), P.sb.from('packing_log').select('*').order('id', { ascending: false })]);
    if (r[0].error || r[1].error) { P.el.innerHTML = '<div class="msg bad">Data packing gagal dimuat: ' + esc((r[0].error || r[1].error).message) + '</div>'; return; }
    P.barang = r[0].data || []; P.log = r[1].data || []; gambar();
  }

  function pilihBarang(id, aktifSaja) {
    return '<select id="' + id + '"><option value="">Pilih barang…</option>' + P.barang.filter(function (b) { return !aktifSaja || b.aktif; }).map(function (b) {
      return '<option value="' + b.id + '">' + esc(b.nama) + ' (' + esc(b.satuan) + ')</option>'; }).join('') + '</select>';
  }

  function isiStok() {
    var S = stokSemua(), aktif = P.barang.filter(function (b) { return b.aktif; });
    var habis = aktif.filter(function (b) { return b.stok_minimum != null && S[b.id] <= Number(b.stok_minimum); });
    var bln = hariIni().slice(0, 7), keluarBln = P.log.filter(function (l) { return !l.batal && l.jenis === 'Keluar' && String(l.tanggal).slice(0, 7) === bln; });
    var h = '<div class="pk-kp"><div><span>Jenis barang</span><b>' + aktif.length + '</b></div><div><span>Di bawah stok minimum</span><b class="' + (habis.length ? 'pk-min' : '') + '">' + habis.length + '</b></div>' +
      '<div><span>Pengambilan bulan ini</span><b>' + keluarBln.length + 'x</b></div></div>';
    if (!aktif.length) return h + '<div class="cd"><div class="ksg">Belum ada barang packing. Tambahkan lewat tab "Daftar barang" (misalnya lakban, kardus, bubble wrap, plastik, kertas resi).</div></div>';
    h += '<div class="cd pk-gl"><table class="pk-t"><thead><tr><th>Barang</th><th class="r">Sisa stok</th><th class="r">Minimum</th><th>Terakhir</th></tr></thead><tbody>' + aktif.map(function (b) {
      var akhir = P.log.filter(function (l) { return l.barang_id === b.id && !l.batal; })[0], kurang = b.stok_minimum != null && S[b.id] <= Number(b.stok_minimum);
      return '<tr><td><b>' + esc(b.nama) + '</b>' + (b.catatan ? '<small>' + esc(b.catatan) + '</small>' : '') + '</td><td class="r' + (kurang ? ' pk-min' : '') + '">' + fmt(S[b.id]) + ' ' + esc(b.satuan) + (kurang ? '<small>perlu beli</small>' : '') + '</td>' +
        '<td class="r">' + (b.stok_minimum != null ? fmt(b.stok_minimum) : '–') + '</td><td>' + (akhir ? '<span class="pk-lbl ' + akhir.jenis + '">' + akhir.jenis + '</span> ' + tgl(akhir.tanggal) : '<small>belum ada catatan</small>') + '</td></tr>';
    }).join('') + '</tbody></table></div>';
    return h + '<p class="sb">Sisa stok = hasil SO terakhir (atau stok awal) + masuk − keluar − rusak sesudahnya. Barang yang perlu dibeli diajukan lewat menu Pengajuan pembelian (kelompok "Packaging & lainnya").</p>';
  }

  function formCatat(jenis) {
    var j = { Keluar: 'Ambil barang (keluar ke tim packing)', Masuk: 'Barang masuk (pembelian datang)', Rusak: 'Barang rusak / hilang' }[jenis];
    var h = '<div class="cd"><h3>' + j + '</h3><div class="pk-f"><label>Tanggal<input type="date" id="pkTgl" value="' + hariIni() + '" max="' + hariIni() + '"></label>' +
      '<label>Barang' + pilihBarang('pkBrg', true) + '</label><label>Jumlah<input id="pkQty" inputmode="decimal" placeholder="0"></label>';
    if (jenis === 'Keluar') h += '<label>Diambil oleh<input id="pkAmbil" placeholder="Nama tim packing" list="pkNama"></label>';
    if (jenis === 'Masuk') h += '<label>Total harga (Rp)<input id="pkHarga" inputmode="numeric" placeholder="contoh 150.000"></label><label>Supplier / toko<input id="pkSup" placeholder="opsional"></label>';
    h += '<label class="pn">Catatan<textarea id="pkCat" placeholder="opsional"></textarea></label></div><p class="sb" id="pkSisa" style="margin:8px 0 0"></p>' +
      '<div class="pk-aksi"><button type="button" class="tbl pri" id="pkSimpan">Simpan</button></div></div>';
    var nama = {}; P.log.forEach(function (l) { if (l.pengambil) nama[l.pengambil] = 1; });
    h += '<datalist id="pkNama">' + Object.keys(nama).map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist>';
    return h + riwayat(jenis, 15);
  }

  function isiSO() {
    var S = stokSemua(), aktif = P.barang.filter(function (b) { return b.aktif; });
    if (!aktif.length) return '<div class="cd"><div class="ksg">Belum ada barang packing untuk dihitung.</div></div>';
    var h = '<div class="cd"><h3>Stock opname (SO) akhir bulan</h3><p class="sb" style="margin:0 0 10px">Hitung fisik setiap barang di gudang, isi jumlahnya. Kosongkan barang yang tidak dihitung. Selisih dengan stok sistem tercatat otomatis.</p>' +
      '<div class="pk-f" style="margin-bottom:12px"><label>Tanggal SO<input type="date" id="pkTgl" value="' + hariIni() + '" max="' + hariIni() + '"></label><label class="pn">Catatan<textarea id="pkCat" placeholder="opsional, misalnya: SO akhir Oktober"></textarea></label></div>' +
      '<div class="pk-gl"><table class="pk-t pk-so"><thead><tr><th>Barang</th><th class="r">Stok sistem</th><th class="r">Hasil hitung</th><th class="r">Selisih</th></tr></thead><tbody>' + aktif.map(function (b) {
        return '<tr data-id="' + b.id + '" data-sis="' + S[b.id] + '"><td><b>' + esc(b.nama) + '</b><small>' + esc(b.satuan) + '</small></td><td class="r">' + fmt(S[b.id]) + '</td>' +
          '<td class="r"><input inputmode="decimal" aria-label="Hasil hitung ' + esc(b.nama) + '"></td><td class="r sel">–</td></tr>';
      }).join('') + '</tbody></table></div><div class="pk-aksi"><button type="button" class="tbl pri" id="pkSO">Simpan hasil SO</button></div></div>';
    return h + riwayat('SO', 30);
  }

  function isiDaftar() {
    var b = P.ubah ? P.barang.filter(function (x) { return x.id === P.ubah; })[0] : null;
    var h = '<div class="cd"><h3>' + (b ? 'Ubah barang' : 'Tambah barang packing') + '</h3><div class="pk-f">' +
      '<label>Nama barang<input id="pkNm" value="' + esc(b ? b.nama : '') + '" placeholder="contoh: Lakban bening 2 inch"></label>' +
      '<label>Satuan<input id="pkSat" value="' + esc(b ? b.satuan : 'pcs') + '" list="pkSatL"></label>' +
      '<label>Stok awal<input id="pkAwal" inputmode="decimal" value="' + (b ? fmt(b.stok_awal) : '') + '" placeholder="jumlah saat ini"></label>' +
      '<label>Stok minimum<input id="pkMin" inputmode="decimal" value="' + (b && b.stok_minimum != null ? fmt(b.stok_minimum) : '') + '" placeholder="batas perlu beli (opsional)"></label>' +
      '<label class="pn">Catatan<input id="pkKet" value="' + esc(b && b.catatan || '') + '" placeholder="opsional, misalnya ukuran / merek"></label>' +
      (b ? '<label><span>Status</span><select id="pkAktif"><option value="1"' + (b.aktif ? ' selected' : '') + '>Dipakai</option><option value="0"' + (!b.aktif ? ' selected' : '') + '>Tidak dipakai lagi</option></select></label>' : '') +
      '</div><datalist id="pkSatL"><option value="pcs"><option value="roll"><option value="pack"><option value="lembar"><option value="kg"><option value="meter"><option value="dus"></datalist>' +
      '<div class="pk-aksi"><button type="button" class="tbl pri" id="pkBrgSimpan">' + (b ? 'Simpan perubahan' : 'Tambah barang') + '</button>' + (b ? '<button type="button" class="tbl" id="pkBatalUbah">Batal</button>' : '') + '</div>' +
      '<p class="sb">Stok awal = jumlah fisik saat barang pertama kali didaftarkan. Setelah itu stok berubah lewat catatan masuk, keluar, rusak, dan SO.</p></div>';
    var S = stokSemua();
    h += '<div class="cd pk-gl"><h3>Daftar barang (' + P.barang.length + ')</h3>' + (P.barang.length ? '<table class="pk-t"><thead><tr><th>Barang</th><th>Satuan</th><th class="r">Stok awal</th><th class="r">Sisa</th><th></th></tr></thead><tbody>' + P.barang.map(function (x) {
      return '<tr' + (x.aktif ? '' : ' class="batal"') + '><td><b>' + esc(x.nama) + '</b>' + (x.catatan ? '<small>' + esc(x.catatan) + '</small>' : '') + '</td><td>' + esc(x.satuan) + '</td><td class="r">' + fmt(x.stok_awal) + '</td><td class="r">' + fmt(S[x.id]) + '</td>' +
        '<td class="r"><button type="button" class="tbl kcl" data-ubah="' + x.id + '">Ubah</button></td></tr>'; }).join('') + '</tbody></table>' : '<div class="ksg">Belum ada barang.</div>') + '</div>';
    return h;
  }

  function riwayat(jenis, maks) {
    var L = P.log.filter(function (l) { return !jenis || l.jenis === jenis; });
    if (P.tab === 'riwayat' && P.bulan) L = L.filter(function (l) { return String(l.tanggal).slice(0, 7) === P.bulan; });
    var tampil = maks ? L.slice(0, maks) : L;
    var h = '<div class="cd pk-gl"><h3>' + (jenis ? 'Catatan ' + jenis.toLowerCase() + ' terakhir' : 'Riwayat') + '</h3>';
    if (!tampil.length) return h + '<div class="ksg">Belum ada catatan.</div></div>';
    h += '<table class="pk-t"><thead><tr><th>Tanggal</th><th>Jenis</th><th>Barang</th><th class="r">Jumlah</th><th>Keterangan</th><th></th></tr></thead><tbody>' + tampil.map(function (l) {
      var ket = l.jenis === 'Keluar' ? 'diambil ' + esc(l.pengambil || '-') : l.jenis === 'Masuk' ? (l.harga_total ? rp(l.harga_total) : 'tanpa harga') + (l.supplier ? ' · ' + esc(l.supplier) : '')
        : l.jenis === 'SO' ? 'sistem ' + fmt(l.stok_sistem) + ' · selisih ' + (Number(l.qty) - Number(l.stok_sistem) > 0 ? '+' : '') + fmt(Number(l.qty) - Number(l.stok_sistem)) : '';
      var oleh = String(l.oleh || '').split('@')[0];
      return '<tr' + (l.batal ? ' class="batal"' : '') + '><td>' + tgl(l.tanggal) + '</td><td><span class="pk-lbl ' + l.jenis + '">' + l.jenis + '</span></td><td>' + esc(namaBrg(l.barang_id)) + '</td>' +
        '<td class="r">' + fmt(l.qty) + ' ' + esc(satuan(l.barang_id)) + '</td><td>' + ket + (l.catatan ? '<small>' + esc(l.catatan) + '</small>' : '') + '<small>dicatat ' + esc(oleh) + (l.batal ? ' · dibatalkan ' + esc(String(l.batal_oleh || '').split('@')[0]) : '') + '</small></td>' +
        '<td class="r">' + (l.batal ? '' : '<button type="button" class="tbl kcl" data-batal="' + l.id + '">Batalkan</button>') + '</td></tr>';
    }).join('') + '</tbody></table>';
    if (maks && L.length > maks) h += '<p class="sb">' + (L.length - maks) + ' catatan lain ada di tab Riwayat.</p>';
    return h + '</div>';
  }

  function isiRiwayat() {
    var bln = {}; P.log.forEach(function (l) { bln[String(l.tanggal).slice(0, 7)] = 1; });
    var daftar = Object.keys(bln).sort().reverse(); if (!P.bulan) P.bulan = daftar[0] || hariIni().slice(0, 7);
    var L = P.log.filter(function (l) { return !l.batal && String(l.tanggal).slice(0, 7) === P.bulan; });
    var rek = {}; L.forEach(function (l) { var r = rek[l.barang_id] = rek[l.barang_id] || { m: 0, k: 0, r: 0, h: 0 }; if (l.jenis === 'Masuk') { r.m += Number(l.qty); r.h += Number(l.harga_total) || 0; } if (l.jenis === 'Keluar') r.k += Number(l.qty); if (l.jenis === 'Rusak') r.r += Number(l.qty); });
    var h = '<div class="cd pk-gl"><div class="pk-f" style="margin-bottom:10px"><label>Bulan<select id="pkBln">' + (daftar.length ? daftar : [P.bulan]).map(function (m) {
      var p = m.split('-'); return '<option value="' + m + '"' + (m === P.bulan ? ' selected' : '') + '>' + BLS[Number(p[1]) - 1] + ' ' + p[0] + '</option>'; }).join('') + '</select></label></div>';
    var ids = Object.keys(rek);
    h += '<h3>Rekap bulan ini</h3>' + (ids.length ? '<table class="pk-t"><thead><tr><th>Barang</th><th class="r">Masuk</th><th class="r">Keluar</th><th class="r">Rusak</th><th class="r">Nilai beli</th></tr></thead><tbody>' + ids.map(function (id) {
      var r = rek[id]; id = Number(id); return '<tr><td>' + esc(namaBrg(id)) + '</td><td class="r">' + fmt(r.m) + '</td><td class="r">' + fmt(r.k) + '</td><td class="r">' + fmt(r.r) + '</td><td class="r">' + (r.h ? rp(r.h) : '–') + '</td></tr>'; }).join('') + '</tbody></table>' : '<div class="ksg">Tidak ada catatan di bulan ini.</div>') + '</div>';
    return h + riwayat('', 0);
  }

  function gambar() {
    if (!document.getElementById('pkCss')) { var s = document.createElement('style'); s.id = 'pkCss'; s.textContent = CSS; document.head.appendChild(s); }
    var T = [['stok', 'Stok'], ['keluar', 'Ambil (keluar)'], ['masuk', 'Barang masuk'], ['rusak', 'Rusak'], ['so', 'SO akhir bulan'], ['riwayat', 'Riwayat'], ['daftar', 'Daftar barang']];
    var h = '<div class="pk-tab" role="group" aria-label="Bagian packing">' + T.map(function (t) { return '<button type="button" data-pt="' + t[0] + '" aria-pressed="' + (P.tab === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>';
    if (P.pesan) h += '<div class="msg ' + P.kelas + '">' + esc(P.pesan) + '</div>';
    h += P.tab === 'stok' ? isiStok() : P.tab === 'keluar' ? formCatat('Keluar') : P.tab === 'masuk' ? formCatat('Masuk') : P.tab === 'rusak' ? formCatat('Rusak') : P.tab === 'so' ? isiSO() : P.tab === 'riwayat' ? isiRiwayat() : isiDaftar();
    P.el.innerHTML = h;
    pasang();
  }

  function q(id) { return P.el.querySelector('#' + id); }
  function lapor(r, ok) { P.pesan = r.error ? 'Gagal: ' + r.error.message : (r.data && r.data.pesan) || ''; P.kelas = r.error || !(r.data && r.data.ok) ? 'bad' : 'ok'; if (!r.error && r.data && r.data.ok && ok) ok(); }

  function pasang() {
    P.el.querySelectorAll('[data-pt]').forEach(function (b) { b.onclick = function () { P.tab = b.getAttribute('data-pt'); P.pesan = ''; P.ubah = null; gambar(); }; });
    var S = stokSemua();
    if (q('pkBrg') && q('pkSisa')) q('pkBrg').onchange = function () { var id = Number(this.value); q('pkSisa').textContent = id ? 'Sisa stok sekarang: ' + fmt(S[id]) + ' ' + satuan(id) : ''; };
    if (q('pkSimpan')) q('pkSimpan').onclick = async function () {
      var jenis = { keluar: 'Keluar', masuk: 'Masuk', rusak: 'Rusak' }[P.tab], btn = this; btn.disabled = true;
      var r = await P.sb.rpc('packing_catat', { p_jenis: jenis, p_barang: Number(q('pkBrg').value) || null, p_qty: angka(q('pkQty').value), p_tanggal: q('pkTgl').value || null,
        p_harga: q('pkHarga') ? angka(q('pkHarga').value) : null, p_supplier: q('pkSup') ? q('pkSup').value : null, p_pengambil: q('pkAmbil') ? q('pkAmbil').value : null, p_catatan: q('pkCat').value });
      lapor(r); btn.disabled = false; await muat();
    };
    P.el.querySelectorAll('.pk-so input').forEach(function (inp) {
      inp.oninput = function () { var tr = inp.closest('tr'), v = angka(inp.value), sel = tr.querySelector('.sel'); if (v == null || isNaN(v)) { sel.textContent = '–'; return; } var d = v - Number(tr.getAttribute('data-sis')); sel.textContent = (d > 0 ? '+' : '') + fmt(d); sel.className = 'r sel' + (d ? ' pk-min' : ''); };
    });
    if (q('pkSO')) q('pkSO').onclick = async function () {
      var isi = []; P.el.querySelectorAll('.pk-so tbody tr').forEach(function (tr) { var v = angka(tr.querySelector('input').value); if (v != null && !isNaN(v)) isi.push({ id: Number(tr.getAttribute('data-id')), fisik: v }); });
      if (!isi.length) { P.pesan = 'Isi hasil hitung minimal satu barang.'; P.kelas = 'bad'; gambar(); return; }
      if (!confirm('Simpan hasil SO untuk ' + isi.length + ' barang? Stok sistem akan disesuaikan dengan hasil hitung.')) return;
      this.disabled = true; var r = await P.sb.rpc('packing_so', { p_tanggal: q('pkTgl').value || null, p_isi: isi, p_catatan: q('pkCat').value }); lapor(r); await muat();
    };
    if (q('pkBrgSimpan')) q('pkBrgSimpan').onclick = async function () {
      this.disabled = true;
      var r = await P.sb.rpc('packing_barang_simpan', { p_id: P.ubah, p_nama: q('pkNm').value, p_satuan: q('pkSat').value, p_stok_awal: angka(q('pkAwal').value) || 0,
        p_min: angka(q('pkMin').value), p_catatan: q('pkKet').value, p_aktif: q('pkAktif') ? q('pkAktif').value === '1' : true });
      lapor(r, function () { P.ubah = null; }); await muat();
    };
    if (q('pkBatalUbah')) q('pkBatalUbah').onclick = function () { P.ubah = null; gambar(); };
    P.el.querySelectorAll('[data-ubah]').forEach(function (b) { b.onclick = function () { P.ubah = Number(b.getAttribute('data-ubah')); P.pesan = ''; gambar(); window.scrollTo(0, 0); }; });
    P.el.querySelectorAll('[data-batal]').forEach(function (b) { b.onclick = async function () {
      if (!confirm('Batalkan catatan ini? Catatan tetap terlihat di riwayat dengan tanda dibatalkan.')) return;
      var r = await P.sb.rpc('packing_batal', { p_id: Number(b.getAttribute('data-batal')) }); lapor(r); await muat();
    }; });
    if (q('pkBln')) q('pkBln').onchange = function () { P.bulan = this.value; gambar(); };
  }

  window.StokPacking = { gambar: function (el, sb) { P.el = el; P.sb = sb; if (!P.barang.length && !P.log.length) el.innerHTML = '<div class="ksg">Memuat stok packing…</div>'; muat(); } };
})();
