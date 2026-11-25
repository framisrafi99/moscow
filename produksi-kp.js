/* Aplikasi Staf Produksi (7 Nov 2026):
 *  - "Kirim ke Kantor Packing": staf produksi mencatat produk Moscow & Kenka yang dibawa dari Gudang Utama ke Kantor Packing
 *    (gudang_kirim, tujuan Kantor Packing). Stok Gudang Utama langsung berkurang.
 *  - "Stok Gudang Utama": stok barang hasil produksi di Gudang Utama, dihitung langsung saat dibuka (produksi_stok_gu).
 *  - 25 Nov 2026 "Penyesuaian stok Gudang Utama": staf produksi mengajukan penyesuaian dari hasil hitung fisik produk Moscow & Kenka
 *    (gudang_sesuai, bagian Gudang). Stok berubah setelah disetujui manajemen Moscow Supplies.
 */
(function () {
  var ALASAN = ['Salah input', 'Barang ditemukan', 'Barang rusak', 'Barang hilang', 'Sampel / promosi', 'Retur dari pelanggan', 'Lainnya'];
  var S = { h: {}, al: '', ajuan: [], el: null, sb: null, mode: '', d: null, memuat: false, pesan: null, q: {}, buka: {}, cari: '', tgl: '', nama: '', cat: '', cek: false, kirim: false, salin: null };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function f(n) { return Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  var BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  function tglId(t) { var p = String(t || '').split('-'); return p.length === 3 ? Number(p[2]) + ' ' + BLN[Number(p[1]) - 1] : t; }
  function kunci(k, w) { return k + '|' + (w || ''); }
  function stokDari(it, w) { return Number((it.stok || {})[w || ''] || 0); }
  function totalStok(it) { var t = 0; Object.keys(it.stok || {}).forEach(function (w) { t += Number(it.stok[w]) || 0; }); return t; }
  function warnaAda(it) { return Object.keys(it.stok || {}).filter(function (w) { return w && Number(it.stok[w]) > 0; }).sort(); }
  function punyaWarna(it) { return (it.w && it.w.length) || warnaAda(it).length > 0; }
  function token() { return 'pkp-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  var CSS = '.pkp{max-width:900px;margin:0 auto;padding:16px 16px 40px}.pkp h2{margin:0 0 4px;font-size:19px;font-weight:800}.pkp .sb{font-size:13px;color:var(--abu)}' +
    '.pkp .brg{border-top:1px solid var(--garis2);padding:10px 0}.pkp .brg:first-child{border-top:0}.pkp .bh{display:flex;gap:10px;align-items:center}' +
    '.pkp .bh .n{flex:1;min-width:0}.pkp .bh .n b{display:block}.pkp .st{font-size:13px;color:var(--abu);white-space:nowrap}.pkp .st b{color:var(--teks,#0F1B2A)}' +
    '.pkp input.q{width:84px;text-align:right}.pkp .wr{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-top:8px}' +
    '.pkp .wr label{display:flex;justify-content:space-between;align-items:center;gap:6px;border:1px solid var(--garis2);border-radius:10px;padding:6px 8px;font-size:13px}' +
    '.pkp .wr label i{font-style:normal;color:var(--abu);font-size:12px;display:block}.pkp .chip{display:inline-block;border:1px solid var(--garis2);border-radius:999px;padding:2px 8px;margin:4px 4px 0 0;font-size:12px}' +
    '.pkp .chip.nol{opacity:.55}.pkp .bar{position:sticky;bottom:0;background:var(--latar,#fff);padding:10px 0;border-top:1px solid var(--garis2);display:flex;gap:10px;align-items:center;justify-content:space-between}' +
    '.pkp table{width:100%;border-collapse:collapse}.pkp td,.pkp th{padding:6px 4px;border-top:1px solid var(--garis2);font-size:14px;text-align:left}.pkp td.r,.pkp th.r{text-align:right}' +
    '.pkp .kosong0{color:#B42318;font-weight:700}';

  async function muat() {
    if (S.memuat) return; S.memuat = true; S.pesan = null; gambar();
    try {
      var r = await S.sb.rpc('produksi_stok_gu');
      if (r.error) throw new Error(r.error.message);
      if (!r.data || !r.data.ok) throw new Error((r.data && r.data.pesan) || 'Data tidak terbaca.');
      S.d = r.data; if (!S.tgl) S.tgl = r.data.hari;
      if (S.mode === 'sesuaigu') {
        var a = await S.sb.from('produksi_sesuai_log').select('no,waktu_ajuan,kode,nama_barang,warna,stok_sistem,hasil_hitung,selisih,alasan,pengaju,status')
          .eq('bagian', 'Gudang').gte('waktu_ajuan', new Date(Date.now() - 30 * 86400e3).toISOString()).order('waktu_ajuan', { ascending: false }).limit(200);
        var ada = {}; S.d.items.forEach(function (it) { ada[it.k] = 1; });
        S.ajuan = (a.data || []).filter(function (x) { return ada[String(x.kode || '').toUpperCase()]; });
      }
    } catch (e) { S.pesan = ['bad', 'Stok gagal dimuat: ' + (e.message || e) + '. Tekan Muat ulang.']; }
    S.memuat = false; gambar();
  }

  function cocok(it) { var q = S.cari.toLowerCase(); return !q || (it.k + ' ' + it.n).toLowerCase().indexOf(q) > -1; }

  function rinci() {
    var out = [], salah = '';
    (S.d ? S.d.items : []).forEach(function (it) {
      var ws = punyaWarna(it) ? warnaAda(it) : [''];
      ws.forEach(function (w) {
        var v = S.q[kunci(it.k, w)]; if (v === undefined || v === '') return;
        var q = Number(v), nm = it.n + (w ? ' ' + w : '');
        if (!isFinite(q) || q < 0 || Math.floor(q) !== q) { salah = salah || 'Jumlah ' + nm + ' harus angka bulat.'; return; }
        if (!q) return;
        if (q > stokDari(it, w)) { salah = salah || nm + ': jumlah (' + f(q) + ') melebihi stok Gudang Utama (' + f(stokDari(it, w)) + ').'; return; }
        out.push({ k: it.k, w: w, q: q, n: nm });
      });
    });
    return { items: out, salah: salah, pcs: out.reduce(function (a, x) { return a + x.q; }, 0) };
  }

  function kepala(judul, ket) {
    return '<div class="cd"><h2>' + esc(judul) + '</h2><p class="sb" style="margin:0">' + ket + '</p>' +
      '<p class="tl" style="margin:6px 0 0">' + (S.d ? 'Stok dihitung ' + esc(S.d.waktu) + ' · ' : '') + '<a href="#" data-pkp="muat">Muat ulang</a></p></div>';
  }

  function gambarKirim() {
    var h = kepala('Kirim ke Kantor Packing', 'Catat produk Moscow &amp; Kenka yang kamu bawa dari Gudang Utama ke Kantor Packing. Stok Gudang Utama langsung berkurang, stok Kantor Packing bertambah.');
    if (!S.d) return h + '<div class="cd"><div class="ksg">' + (S.memuat ? 'Memuat stok…' : 'Belum termuat.') + '</div></div>';
    if (S.cek) {
      var R = rinci();
      h += '<div class="cd"><h3 style="margin:0 0 6px">Periksa dulu sebelum disimpan</h3><p class="sb" style="margin:0 0 8px">Tanggal: <b>' + esc(tglId(S.tgl)) + '</b> · Pengisi: <b>' + esc(S.nama) + '</b>' + (S.cat ? ' · Catatan: ' + esc(S.cat) : '') + '</p>' +
        '<table><tr><th>Barang</th><th class="r">Jumlah</th><th class="r">Sisa di Gudang Utama</th></tr>' + R.items.map(function (x) {
          var it = S.d.items.filter(function (i) { return i.k === x.k; })[0];
          return '<tr><td>' + esc(x.n) + ' <span class="sb">(' + esc(x.k) + ')</span></td><td class="r"><b>' + f(x.q) + '</b></td><td class="r">' + f(stokDari(it, x.w) - x.q) + '</td></tr>';
        }).join('') + '<tr><td><b>Total</b></td><td class="r"><b>' + f(R.pcs) + ' pcs</b></td><td></td></tr></table>' +
        '<div class="aksi-baris" style="margin-top:12px"><button type="button" class="tbl" data-pkp="ubah"' + (S.kirim ? ' disabled' : '') + '>Ubah</button><button type="button" class="tbl pri" data-pkp="simpan"' + (S.kirim ? ' disabled' : '') + '>' + (S.kirim ? 'Menyimpan…' : 'Simpan, barang sudah dibawa ke Kantor Packing') + '</button></div></div>';
      return h;
    }
    h += '<div class="cd"><div class="mini"><label>Tanggal dibawa<input class="isian" type="date" id="pkpTgl" max="' + esc(S.d.hari) + '" value="' + esc(S.tgl) + '"></label>' +
      '<label>Nama pengisi<input class="isian" type="text" id="pkpNama" maxlength="40" placeholder="Nama staf" value="' + esc(S.nama) + '"></label></div>' +
      '<label class="sb" style="display:block;margin-top:8px">Catatan (opsional)<input class="isian" type="text" id="pkpCat" maxlength="200" value="' + esc(S.cat) + '"></label></div>';
    h += '<div class="cd"><input class="isian" type="search" id="pkpCari" placeholder="Cari barang (nama atau kode)" value="' + esc(S.cari) + '"><div id="pkpDaftar">' + daftarKirim() + '</div>' +
      '<div class="bar"><span class="sb" id="pkpJml">' + ringkas() + '</span><button type="button" class="tbl pri" data-pkp="periksa">Periksa &amp; simpan</button></div></div>';
    h += riwayat();
    return h;
  }
  function ringkas() { var R = rinci(); return R.items.length ? R.items.length + ' baris · ' + f(R.pcs) + ' pcs' : 'Belum ada jumlah diisi'; }
  function daftarKirim() {
    var h = '';
    S.d.items.forEach(function (it) {
      if (!cocok(it)) return;
      var tot = totalStok(it);
      if (!punyaWarna(it)) {
        var v = S.q[kunci(it.k, '')]; v = v === undefined ? '' : v;
        h += '<div class="brg"><div class="bh"><div class="n"><b>' + esc(it.n) + '</b><span class="sb">' + esc(it.k) + '</span></div>' +
          '<span class="st">stok <b' + (tot <= 0 ? ' class="kosong0"' : '') + '>' + f(tot) + '</b></span>' +
          '<input class="isian q" type="number" inputmode="numeric" min="0" step="1" placeholder="0" data-q="' + esc(kunci(it.k, '')) + '" value="' + esc(v) + '"' + (tot <= 0 ? ' disabled' : '') + '></div></div>';
        return;
      }
      var ws = warnaAda(it), terbuka = !!S.buka[it.k];
      h += '<div class="brg"><div class="bh"><div class="n"><b>' + esc(it.n) + '</b><span class="sb">' + esc(it.k) + ' · ' + ws.length + ' warna ada stok</span></div>' +
        '<span class="st">stok <b' + (tot <= 0 ? ' class="kosong0"' : '') + '>' + f(tot) + '</b></span>' +
        '<button type="button" class="tbl" data-pkp-buka="' + esc(it.k) + '"' + (ws.length ? '' : ' disabled') + '>' + (terbuka ? 'Tutup' : 'Isi per warna') + '</button></div>';
      if (terbuka) {
        h += '<div class="wr">' + ws.map(function (w) {
          var v = S.q[kunci(it.k, w)]; v = v === undefined ? '' : v;
          return '<label><span>' + esc(w) + '<i>stok ' + f(stokDari(it, w)) + '</i></span><input class="isian q" type="number" inputmode="numeric" min="0" step="1" placeholder="0" data-q="' + esc(kunci(it.k, w)) + '" value="' + esc(v) + '"></label>';
        }).join('') + '</div>';
      }
      h += '</div>';
    });
    return h || '<div class="ksg">Barang tidak ditemukan.</div>';
  }
  function riwayat() {
    var L = (S.d && S.d.kirim) || [];
    if (!L.length) return '<div class="cd"><h3 style="margin:0">Kiriman ke Kantor Packing (14 hari)</h3><div class="ksg">Belum ada kiriman.</div></div>';
    var grup = [], idx = {};
    L.forEach(function (x) { var g = x.sj || (x.t + x.jam); if (!idx[g]) { idx[g] = { sj: x.sj, t: x.t, jam: x.jam, p: x.p, b: [], tot: 0 }; grup.push(idx[g]); } idx[g].b.push(x); idx[g].tot += Number(x.q) || 0; });
    return '<div class="cd"><h3 style="margin:0 0 6px">Kiriman ke Kantor Packing (14 hari)</h3>' + grup.slice(0, 40).map(function (g) {
      return '<details class="brg"><summary><b>' + esc(tglId(g.t)) + ' ' + esc(g.jam) + '</b> · ' + f(g.tot) + ' pcs · ' + esc(g.p) + (g.sj ? ' <span class="sb">' + esc(g.sj) + '</span>' : '') + '</summary>' +
        '<table>' + g.b.map(function (x) { return '<tr><td>' + esc(x.n) + (x.w ? ' ' + esc(x.w) : '') + '</td><td class="r">' + f(x.q) + '</td></tr>'; }).join('') + '</table></details>';
    }).join('') + '</div>';
  }

  function gambarStok() {
    var h = kepala('Stok Gudang Utama', 'Stok produk Moscow &amp; Kenka yang ada di Gudang Utama saat ini: hasil produksi yang sudah dilaporkan, dikurangi yang dibawa ke Kantor Packing, toko, dan pengiriman order.');
    if (!S.d) return h + '<div class="cd"><div class="ksg">' + (S.memuat ? 'Menghitung stok…' : 'Belum termuat.') + '</div></div>';
    var tot = 0, habis = 0; S.d.items.forEach(function (it) { var t = totalStok(it); tot += t; if (t <= 0) habis++; });
    h += '<div class="cd"><p style="margin:0"><b>' + f(tot) + ' pcs</b> di Gudang Utama · <span class="kosong0">' + habis + ' barang kosong</span></p>' +
      '<input class="isian" type="search" id="pkpCari" placeholder="Cari barang (nama atau kode)" value="' + esc(S.cari) + '" style="margin-top:8px"><div id="pkpDaftar">' + daftarStok() + '</div></div>';
    return h;
  }
  function daftarStok() {
    var h = '', kat = '';
    S.d.items.forEach(function (it) {
      if (!cocok(it)) return;
      if (it.kat !== kat) { kat = it.kat; h += '<h3 style="margin:14px 0 2px;font-size:15px">' + esc(kat || 'Lainnya') + '</h3>'; }
      var t = totalStok(it), ws = Object.keys(it.stok || {}).filter(function (w) { return w; }).sort();
      h += '<div class="brg"><div class="bh"><div class="n"><b>' + esc(it.n) + '</b><span class="sb">' + esc(it.k) + '</span></div><span class="st"><b' + (t <= 0 ? ' class="kosong0"' : '') + '>' + f(t) + '</b> pcs</span></div>' +
        (ws.length ? '<div>' + ws.map(function (w) { var q = Number(it.stok[w]) || 0; return '<span class="chip' + (q <= 0 ? ' nol' : '') + '">' + esc(w) + ' <b>' + f(q) + '</b></span>'; }).join('') + '</div>' : '') + '</div>';
    });
    return h || '<div class="ksg">Barang tidak ditemukan.</div>';
  }

  // ----- Penyesuaian stok Gudang Utama (hasil hitung fisik) -----
  function warnaSemua(it) {
    var w = (it.w || []).slice(); Object.keys(it.stok || {}).forEach(function (x) { if (x && w.indexOf(x) === -1) w.push(x); });
    return w.sort();
  }
  function rinciSesuai() {
    var out = [], salah = '';
    (S.d ? S.d.items : []).forEach(function (it) {
      var ws = punyaWarna(it) ? warnaSemua(it) : [''];
      ws.forEach(function (w) {
        var v = S.h[kunci(it.k, w)]; if (v === undefined || v === '') return;
        var h = Number(v), nm = it.n + (w ? ' ' + w : '');
        if (!isFinite(h) || h < 0 || Math.floor(h) !== h) { salah = salah || 'Hasil hitung ' + nm + ' harus angka bulat, minimal 0.'; return; }
        var sis = stokDari(it, w), d = h - sis; if (!d) return;
        out.push({ k: it.k, w: w, n: nm, sis: sis, hit: h, d: d });
      });
    });
    return { items: out, salah: salah };
  }
  function ringkasSesuai() { var R = rinciSesuai(); return R.items.length ? R.items.length + ' barang berbeda dengan stok sistem' : 'Isi hasil hitung fisik barang yang dihitung'; }
  function gambarSesuai() {
    var h = kepala('Penyesuaian stok Gudang Utama', 'Khusus produk Moscow &amp; Kenka. Isi <b>hasil hitung fisik</b> di Gudang Utama; selisih dengan stok sistem diajukan ke manajemen Moscow Supplies. Stok baru berubah setelah disetujui.');
    if (!S.d) return h + '<div class="cd"><div class="ksg">' + (S.memuat ? 'Menghitung stok…' : 'Belum termuat.') + '</div></div>';
    if (S.cek) {
      var R = rinciSesuai();
      h += '<div class="cd"><h3 style="margin:0 0 6px">Periksa dulu sebelum diajukan</h3><p class="sb" style="margin:0 0 8px">Pengaju: <b>' + esc(S.nama) + '</b> · Alasan: <b>' + esc(S.al) + '</b>' + (S.cat ? ' · ' + esc(S.cat) : '') + '</p>' +
        '<table><tr><th>Barang</th><th class="r">Stok sistem</th><th class="r">Hitung fisik</th><th class="r">Selisih</th></tr>' + R.items.map(function (x) {
          return '<tr><td>' + esc(x.n) + ' <span class="sb">(' + esc(x.k) + ')</span></td><td class="r">' + f(x.sis) + '</td><td class="r"><b>' + f(x.hit) + '</b></td><td class="r"><b style="color:' + (x.d > 0 ? '#1E7B3A' : '#B42318') + '">' + (x.d > 0 ? '+' : '−') + f(Math.abs(x.d)) + '</b></td></tr>';
        }).join('') + '</table>' +
        '<div class="aksi-baris" style="margin-top:12px"><button type="button" class="tbl" data-pkp="ubah"' + (S.kirim ? ' disabled' : '') + '>Ubah</button><button type="button" class="tbl pri" data-pkp="ajukan"' + (S.kirim ? ' disabled' : '') + '>' + (S.kirim ? 'Mengirim…' : 'Ajukan penyesuaian') + '</button></div></div>';
      return h;
    }
    h += '<div class="cd"><div class="mini"><label>Nama pengaju<input class="isian" type="text" id="pkpNama" maxlength="40" placeholder="Nama staf" value="' + esc(S.nama) + '"></label>' +
      '<label>Alasan<select class="isian" id="pkpAl"><option value="">Pilih alasan</option>' + ALASAN.map(function (a) { return '<option' + (a === S.al ? ' selected' : '') + '>' + esc(a) + '</option>'; }).join('') + '</select></label></div>' +
      '<label class="sb" style="display:block;margin-top:8px">Keterangan (wajib untuk alasan Lainnya)<input class="isian" type="text" id="pkpCat" maxlength="200" value="' + esc(S.cat) + '"></label></div>';
    h += '<div class="cd"><input class="isian" type="search" id="pkpCari" placeholder="Cari barang (nama atau kode)" value="' + esc(S.cari) + '"><div id="pkpDaftar">' + daftarSesuai() + '</div>' +
      '<div class="bar"><span class="sb" id="pkpJml">' + ringkasSesuai() + '</span><button type="button" class="tbl pri" data-pkp="periksaS">Periksa &amp; ajukan</button></div></div>';
    h += riwayatSesuai();
    return h;
  }
  function daftarSesuai() {
    var h = '';
    S.d.items.forEach(function (it) {
      if (!cocok(it)) return;
      var tot = totalStok(it);
      if (!punyaWarna(it)) {
        var v = S.h[kunci(it.k, '')]; v = v === undefined ? '' : v;
        h += '<div class="brg"><div class="bh"><div class="n"><b>' + esc(it.n) + '</b><span class="sb">' + esc(it.k) + '</span></div>' +
          '<span class="st">sistem <b>' + f(tot) + '</b></span>' +
          '<input class="isian q" type="number" inputmode="numeric" min="0" step="1" placeholder="hitung" data-h="' + esc(kunci(it.k, '')) + '" value="' + esc(v) + '"></div></div>';
        return;
      }
      var ws = warnaSemua(it), terbuka = !!S.buka[it.k];
      h += '<div class="brg"><div class="bh"><div class="n"><b>' + esc(it.n) + '</b><span class="sb">' + esc(it.k) + ' · ' + ws.length + ' warna</span></div>' +
        '<span class="st">sistem <b>' + f(tot) + '</b></span>' +
        '<button type="button" class="tbl" data-pkp-buka="' + esc(it.k) + '">' + (terbuka ? 'Tutup' : 'Isi per warna') + '</button></div>';
      if (terbuka) {
        h += '<div class="wr">' + ws.map(function (w) {
          var v = S.h[kunci(it.k, w)]; v = v === undefined ? '' : v;
          return '<label><span>' + esc(w) + '<i>sistem ' + f(stokDari(it, w)) + '</i></span><input class="isian q" type="number" inputmode="numeric" min="0" step="1" placeholder="hitung" data-h="' + esc(kunci(it.k, w)) + '" value="' + esc(v) + '"></label>';
        }).join('') + '</div>';
      }
      h += '</div>';
    });
    return h || '<div class="ksg">Barang tidak ditemukan.</div>';
  }
  function riwayatSesuai() {
    var L = S.ajuan || [];
    if (!L.length) return '<div class="cd"><h3 style="margin:0">Pengajuan penyesuaian (30 hari)</h3><div class="ksg">Belum ada pengajuan.</div></div>';
    var warna = { Menunggu: '#9A6700', Disetujui: '#1E7B3A', Ditolak: '#B42318' };
    return '<div class="cd"><h3 style="margin:0 0 6px">Pengajuan penyesuaian (30 hari)</h3><table><tr><th>Barang</th><th class="r">Selisih</th><th>Status</th></tr>' + L.slice(0, 60).map(function (x) {
      var d = Number(x.selisih) || 0, t = new Date(x.waktu_ajuan);
      return '<tr><td>' + esc(x.nama_barang) + (x.warna ? ' ' + esc(x.warna) : '') + '<br><span class="sb">' + esc(x.no) + ' · ' + t.getDate() + ' ' + BLN[t.getMonth()] + ' · ' + esc(x.pengaju || '') + '</span></td>' +
        '<td class="r"><b>' + (d > 0 ? '+' : '−') + f(Math.abs(d)) + '</b></td><td><b style="color:' + (warna[x.status] || 'inherit') + '">' + esc(x.status || '') + '</b></td></tr>';
    }).join('') + '</table></div>';
  }
  async function ajukan() {
    var R = rinciSesuai(); if (R.salah || !R.items.length) { S.cek = false; S.pesan = ['bad', R.salah || 'Tidak ada barang yang berbeda dengan stok sistem.']; gambar(); return; }
    S.kirim = true; gambar();
    try {
      var r = await S.sb.rpc('gudang_sesuai', { p_nama: S.nama, p_catatan: S.cat, p_token: S.tok,
        p_items: R.items.map(function (x) { return { k: x.k, w: x.w, q: Math.abs(x.d), a: x.d > 0 ? '+' : '-', al: S.al }; }) });
      if (r.error) throw new Error(r.error.message + '. Tekan ajukan sekali lagi; aman, tidak akan tercatat dua kali.');
      if (!r.data || !r.data.ok) throw new Error((r.data && r.data.pesan) || 'Gagal mengirim.');
      S.pesan = ['ok', '✓ ' + r.data.pesan]; S.h = {}; S.cat = ''; S.al = ''; S.cek = false; S.tok = null;
      try { localStorage.setItem('nama_pengisi', S.nama); } catch (e) { }
      S.kirim = false; S.d = null; muat(); return;
    } catch (e) { S.pesan = ['bad', e.message || String(e)]; }
    S.kirim = false; gambar();
  }

  function gambar() {
    var el = S.el; if (!el) return;
    var h = '<div class="pkp">' + (S.pesan ? '<div class="msg ' + S.pesan[0] + '">' + esc(S.pesan[1]) + '</div>' : '');
    h += S.mode === 'stokgu' ? gambarStok() : S.mode === 'sesuaigu' ? gambarSesuai() : gambarKirim();
    el.innerHTML = h + '</div>';
  }
  function gambarDaftar() {
    var d = S.el && S.el.querySelector('#pkpDaftar'); if (!d || !S.d) return;
    d.innerHTML = S.mode === 'stokgu' ? daftarStok() : S.mode === 'sesuaigu' ? daftarSesuai() : daftarKirim();
  }

  async function simpan() {
    var R = rinci(); if (R.salah || !R.items.length) { S.cek = false; S.pesan = ['bad', R.salah || 'Belum ada jumlah yang diisi.']; gambar(); return; }
    S.kirim = true; gambar();
    try {
      var r = await S.sb.rpc('gudang_kirim', { p_tanggal: S.tgl, p_tujuan: 'Kantor Packing', p_nama: S.nama, p_catatan: S.cat, p_order: '',
        p_items: R.items.map(function (x) { return { k: x.k, w: x.w, q: x.q }; }), p_token: S.tok });
      if (r.error) throw new Error(r.error.message + '. Tekan simpan sekali lagi; aman, tidak akan tercatat dua kali.');
      if (!r.data || !r.data.ok) throw new Error((r.data && r.data.pesan) || 'Gagal menyimpan.');
      S.pesan = ['ok', '✓ ' + r.data.pesan]; S.q = {}; S.cat = ''; S.cek = false; S.tok = null;
      try { localStorage.setItem('nama_pengisi', S.nama); } catch (e) { }
      if (S.salin) S.salin();
      S.kirim = false; S.d = null; muat(); return;
    } catch (e) { S.pesan = ['bad', e.message || String(e)]; }
    S.kirim = false; gambar();
  }

  function pasang() {
    var el = S.el; if (el.dataset.pkp) return; el.dataset.pkp = '1';
    el.addEventListener('click', function (e) {
      if (!S.el || !S.el.querySelector('.pkp')) return;
      var t = e.target.closest ? e.target.closest('[data-pkp],[data-pkp-buka]') : null; if (!t) return;
      var a = t.getAttribute('data-pkp'), b = t.getAttribute('data-pkp-buka');
      if (b) { S.buka[b] = !S.buka[b]; gambarDaftar(); return; }
      if (a === 'muat') { e.preventDefault(); S.d = null; muat(); }
      else if (a === 'periksa') {
        S.pesan = null; S.nama = String(S.nama || '').trim();
        if (S.nama.length < 2) { S.pesan = ['bad', 'Isi nama pengisi dulu.']; gambar(); return; }
        if (!S.tgl) { S.pesan = ['bad', 'Isi tanggal dulu.']; gambar(); return; }
        var R = rinci(); if (R.salah) { S.pesan = ['bad', R.salah]; gambar(); return; }
        if (!R.items.length) { S.pesan = ['bad', 'Belum ada jumlah yang diisi.']; gambar(); return; }
        S.cek = true; if (!S.tok) S.tok = token(); gambar(); window.scrollTo(0, 0);
      }
      else if (a === 'periksaS') {
        S.pesan = null; S.nama = String(S.nama || '').trim();
        if (S.nama.length < 2) { S.pesan = ['bad', 'Isi nama pengaju dulu.']; gambar(); return; }
        if (!S.al) { S.pesan = ['bad', 'Pilih alasan penyesuaian dulu.']; gambar(); return; }
        if (S.al === 'Lainnya' && String(S.cat || '').trim().length < 3) { S.pesan = ['bad', 'Untuk alasan Lainnya, tulis keterangannya.']; gambar(); return; }
        var RS = rinciSesuai(); if (RS.salah) { S.pesan = ['bad', RS.salah]; gambar(); return; }
        if (!RS.items.length) { S.pesan = ['bad', 'Belum ada hasil hitung yang berbeda dengan stok sistem.']; gambar(); return; }
        S.cek = true; if (!S.tok) S.tok = token(); gambar(); window.scrollTo(0, 0);
      }
      else if (a === 'ubah') { S.cek = false; gambar(); }
      else if (a === 'ajukan') ajukan();
      else if (a === 'simpan') simpan();
    });
    el.addEventListener('input', function (e) {
      if (!S.el || !S.el.querySelector('.pkp')) return;
      var t = e.target;
      if (t.id === 'pkpCari') { S.cari = t.value; gambarDaftar(); return; }
      if (t.id === 'pkpNama') { S.nama = t.value; return; }
      if (t.id === 'pkpCat') { S.cat = t.value; return; }
      if (t.id === 'pkpTgl') { S.tgl = t.value; return; }
      if (t.id === 'pkpAl') { S.al = t.value; return; }
      var hk = t.getAttribute && t.getAttribute('data-h');
      if (hk) { if (t.value === '') delete S.h[hk]; else S.h[hk] = t.value; S.tok = null; var js = S.el.querySelector('#pkpJml'); if (js) js.textContent = ringkasSesuai(); return; }
      var k = t.getAttribute && t.getAttribute('data-q');
      if (k) { if (t.value === '') delete S.q[k]; else S.q[k] = t.value; S.tok = null; var j = S.el.querySelector('#pkpJml'); if (j) j.textContent = ringkas(); }
    });
  }

  window.ProduksiKP = {
    // mode: 'kirimkp' | 'stokgu' | 'sesuaigu'; opsi: { nama, salin }
    gambar: function (el, sb, mode, opsi) {
      S.el = el; S.sb = sb; S.mode = mode; opsi = opsi || {};
      S.salin = opsi.salin || null; S.cek = false; S.pesan = null; S.cari = '';
      if (!S.nama) { try { S.nama = localStorage.getItem('nama_pengisi') || ''; } catch (e) { } if (!S.nama) S.nama = opsi.nama || ''; }
      if (!document.getElementById('pkpCss')) { var s = document.createElement('style'); s.id = 'pkpCss'; s.textContent = CSS; document.head.appendChild(s); }
      pasang(); S.d = null; muat();
    }
  };
})();
