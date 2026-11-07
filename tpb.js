/* Moscow Supplies - Tutup Buku (tpbData, Apps Script file 74 beserta tambahan pemeriksaan file 75, 76, 78), dihitung dari Supabase.
 * Sama dengan potret 'md:tpb' (SBM_POTRET_): daftar bulan yang pernah ditutup/dibuka + pemeriksaan kesiapan satu bulan.
 * Pemeriksaan (TPB_periksa_, urutan sama):
 *   file 74: ajuan stok menunggu, stok minus, terjual tanpa HPP, dana belum cair, penjualan belum dicatat, nota offline tanpa metode
 *   file 75: laporan dana marketplace consignment & setoran   file 76: uang tunai offline   file 78: laporan bulan Renon & setoran
 * Butuh: lembar.js, dasbor.js (Dasbor.dsData), bagihasil.js + bhmd.js (BagiHasilMd.hitung), akun.js (Akunting.mbDaftar), produksi.js.
 */
(function () {
  'use strict';
  var SAL_TOKO_ = { 'Consignment Medan': ['Shopee', 'Tokopedia'], 'Consignment Sidoarjo': ['Shopee', 'Langsung'] };
  var RN_TOKO_ = ['Consignment Renon'];
  var BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  function t(v, n) { return String(v === null || v === undefined ? '' : v).replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n || 200); }
  function bulanOk(b) { return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(b || '')); }
  function namaBulan(b) { return BULAN[Number(b.slice(5, 7)) - 1] + ' ' + b.slice(0, 4); }
  function akhirBulan(b) { var d = new Date(Date.UTC(Number(b.slice(0, 4)), Number(b.slice(5, 7)), 0)).getUTCDate(); return b + '-' + (d < 10 ? '0' : '') + d; }
  function GD_fmt_(n) {
    n = Math.round(Number(n) || 0);
    var s = String(Math.abs(n)), o = '';
    for (var i = 0; i < s.length; i++) { if (i > 0 && (s.length - i) % 3 === 0) o += '.'; o += s.charAt(i); }
    return (n < 0 ? '-' : '') + o;
  }
  function pasar(toko) { return (SAL_TOKO_[toko] || []).filter(function (s) { return ['Shopee', 'Tokopedia', 'TikTok', 'Lazada'].indexOf(s) !== -1; }); }
  function fmt(d, p) { return window.Lembar.format(d, p); }

  // TPB_baca_: baris terakhir per bulan di TUTUP_BUKU.
  async function bacaTutup(sb) {
    // Tabel tutup_buku tidak dibaca langsung dari aplikasi: lewat rpc tutup_buku_daftar (SQL 134, khusus manajemen).
    var r = await sb.rpc('tutup_buku_daftar');
    if (r.error) throw new Error(r.error.message);
    r.data = Array.isArray(r.data) ? r.data : [];
    var out = {};
    (r.data || []).forEach(function (x) {
      var b = t(x.bulan, 7);
      if (!bulanOk(b)) return;
      var ring = null; try { ring = x.ring ? JSON.parse(String(x.ring)) : null; } catch (e) { ring = null; }
      var w = x.waktu ? new Date(x.waktu) : null;
      out[b] = { st: t(x.status, 20), w: w && !isNaN(w.getTime()) ? fmt(w, 'dd/MM/yyyy HH:mm') : '', oleh: t(x.oleh, 60), ring: ring, c: t(x.catatan, 300) };
    });
    return out;
  }

  // opsi.bh (robot hitung, 7 Nov 2026): hasil BagiHasilMd.hitung bulan itu yang sudah dihitung (potret md:bh / md:bh:lalu).
  // opsi.gd: hasil gdPemilikData (potret md:gudang); Dasbor lalu dihitung mode 'tpb' (tanpa stok produksi/toko & tindakan).
  async function periksa(sb, bulan, opsi) {
    var bhSiap = opsi && opsi.bh && opsi.bh.ok && opsi.bh.bulan === bulan ? opsi.bh : null;
    var dari = bulan + '-01', sampai = akhirBulan(bulan), cek = [];
    var tambah = function (ok, judul, ket, berat) { cek.push({ ok: !!ok, j: judul, ket: ket || '', berat: !!berat }); };
    var h = await Promise.all([
      window.Produksi.prodSesuaiDaftar(sb, true).catch(function () { return null; }),
      window.Dasbor.dsData(sb, opsi && opsi.gd ? { dari: dari, sampai: sampai, ringan: 'tpb', gd: opsi.gd } : { dari: dari, sampai: sampai }).catch(function (e) { return { ok: false, pesan: e.message }; }),
      window.Akunting.mbDaftar(sb).catch(function () { return null; }),
      bhSiap || window.BagiHasilMd.hitung(sb, bulan).catch(function (e) { return { ok: false, pesan: e.message }; }),
      sb.from('toko_jual_log').select('toko').gte('tanggal', dari).lte('tanggal', sampai)
    ]);
    // file 74
    var tunggu = h[0] && h[0].ok ? h[0].list.filter(function (x) { return x.st === 'Menunggu'; }).length : 0;
    tambah(!tunggu, 'Ajuan stok yang menunggu persetujuan', tunggu ? tunggu + ' ajuan hitung / penyesuaian stok belum diputuskan (menu Persetujuan atau Penyeimbang).' : 'Tidak ada.', true);
    var d = h[1];
    if (d && d.ok) {
      var P = d.peringatan || { jml: {} };
      tambah(!P.jml.minus, 'Stok minus', P.jml.minus ? P.jml.minus + ' barang stoknya minus (lihat kartu Peringatan di Dasbor).' : 'Tidak ada.', true);
      var tanpa = (d.terjual && d.terjual.tanpaHpp) || [];
      tambah(!tanpa.length, 'Barang terjual tanpa HPP', tanpa.length ? tanpa.map(function (x) { return x.k; }).join(', ') : 'Semua barang terjual punya HPP.', false);
      var bc = 0; (d.akun || []).forEach(function (a) { if (/belum cair/i.test(a.n)) bc += a.v; });
      tambah(!bc, 'Dana marketplace belum cair', bc ? 'Rp ' + GD_fmt_(bc) + ' masih tercatat belum cair. Upload laporan dana dari Shopee, Tokopedia/TikTok, dan Lazada supaya biaya marketplace masuk.' : 'Sudah cair semua.', false);
      var luar = ((d.terjual && d.terjual.saluran) || []).filter(function (s) {
        var nm = s.n === 'Reseller' ? 'Penjualan reseller' : 'Penjualan ' + s.n;
        if (/\((batal|arsip)/i.test(s.n)) return false; // toko yang dibatalkan / diarsipkan (mis. rekap Renon diganti PDF)
        return s.omzet && !((d.uang && d.uang.saluran) || []).some(function (x) { return x.n.toLowerCase() === nm.toLowerCase(); });
      });
      tambah(!luar.length, 'Penjualan yang belum dicatat di accounting', luar.length ? luar.map(function (s) { return s.n + ' (omzet Rp ' + GD_fmt_(s.omzet) + ')'; }).join(', ') : 'Semua saluran sudah tercatat.', false);
    } else {
      tambah(false, 'Data Dasbor', 'Gagal membaca: ' + ((d && d.pesan) || '-'), true);
    }
    var mb = h[2];
    if (mb && mb.ok) {
      var n = 0, v = 0;
      (mb.belum || []).forEach(function (x) { if (String(x.t).slice(0, 7) === bulan) { n++; v += (Number(x.total) || 0) + (Number(x.ongkir) || 0); } });
      tambah(!n, 'Nota toko offline tanpa metode bayar', n ? n + ' nota (Rp ' + GD_fmt_(v) + ') belum ditentukan Tunai / QRIS.' : 'Tidak ada.', false);
    }
    // Data bagi hasil per toko (BHX_hitung_ beserta setoran).
    var bh = {}, B = h[3];
    if (B && B.ok) B.toko.forEach(function (x) { bh[x.toko] = x; });
    // file 75: laporan dana marketplace consignment & setoran
    try {
      if (!B || !B.ok) throw new Error((B && B.pesan) || 'bagi hasil gagal dimuat');
      var jual = {};
      if (h[4].error) throw new Error(h[4].error.message);
      (h[4].data || []).forEach(function (r) { jual[t(r.toko, 80)] = true; });
      var belumUp = [], belumSetor = [];
      Object.keys(SAL_TOKO_).filter(function (x) { return pasar(x).length; }).forEach(function (toko) {
        if (!jual[toko]) return;
        var x = bh[toko], info = (x && x.dc && x.dc.info) || {};
        var kurang = pasar(toko).filter(function (pf) { return !info[pf]; });
        if (kurang.length) belumUp.push(toko + ' (' + kurang.join(', ') + ')');
        else if (x && x.dc && x.dc.setoran && Math.abs(x.dc.setoran.selisih) >= 1000) {
          var s = x.dc.setoran;
          belumSetor.push(toko + ': seharusnya Rp ' + GD_fmt_(s.harus) + ', tercatat Rp ' + GD_fmt_(s.tercatat));
        }
      });
      cek.push({ ok: !belumUp.length, j: 'Laporan dana marketplace consignment', ket: belumUp.length ? 'Belum diupload: ' + belumUp.join('; ') + '. Upload di Bagi hasil consignment.' : 'Sudah diupload semua.', berat: false });
      cek.push({ ok: !belumSetor.length, j: 'Setoran bagi hasil consignment', ket: belumSetor.length ? belumSetor.join('; ') + '. Catat setoran di Bagi hasil consignment setelah transfer diterima.' : 'Sesuai.', berat: false });
    } catch (err) {
      cek.push({ ok: false, j: 'Laporan dana consignment', ket: 'Gagal memeriksa: ' + err.message, berat: false });
    }
    // file 76: uang tunai offline consignment
    if (B && B.ok) {
      var belumTn = Object.keys(SAL_TOKO_).filter(function (toko) {
        if ((SAL_TOKO_[toko] || []).indexOf('Langsung') === -1) return false;
        var x = bh[toko];
        return !(x && x.tunai && x.tunai.isi);
      });
      cek.push({ ok: !belumTn.length, j: 'Uang tunai penjualan offline consignment', ket: belumTn.length ? 'Belum diisi staf: ' + belumTn.join(', ') + '.' : 'Sudah diisi.', berat: false });
      // file 78: laporan bulan consignment offline & setoran
      var belum = [], setor = [];
      RN_TOKO_.forEach(function (toko) {
        var x = bh[toko];
        if (!x || !(x.qty || x.omzet)) return;
        if (!x.bhi || !x.bhi.terbit) belum.push(toko);
        else if (x.rn && x.rn.setoran && Math.abs(x.rn.setoran.selisih) >= 1000) setor.push(toko + ': seharusnya Rp ' + GD_fmt_(x.rn.setoran.harus) + ', tercatat Rp ' + GD_fmt_(x.rn.setoran.tercatat));
      });
      cek.push({ ok: !belum.length, j: 'Laporan bulan consignment offline', ket: belum.length ? 'Belum ditutup staf: ' + belum.join(', ') + '.' : 'Sudah ditutup.', berat: false });
      if (setor.length) cek.push({ ok: false, j: 'Setoran consignment offline', ket: setor.join('; ') + '.', berat: false });
    }
    return { cek: cek, d: d };
  }

  async function tpbData(sb, p) {
    var bulanIni = fmt(new Date(), 'yyyy-MM');
    var T = await bacaTutup(sb);
    var daftar = Object.keys(T).sort().reverse().map(function (b) { var x = T[b]; return { b: b, nb: namaBulan(b), st: x.st, w: x.w, oleh: x.oleh, ring: x.ring, c: x.c }; });
    var out = { ok: true, bulanIni: bulanIni, daftar: daftar };
    var bulan = bulanOk(p && p.bulan) ? p.bulan : '';
    if (bulan) {
      var r = await periksa(sb, bulan, { bh: p && p.bh, gd: p && p.gd });
      out.bulan = bulan; out.nb = namaBulan(bulan); out.cek = r.cek; out.tutup = !!(T[bulan] && T[bulan].st === 'Ditutup');
      out.boleh = bulan < bulanIni;
      if (r.d && r.d.ok) {
        var u = r.d.uang || { ini: {} };
        out.ring = { pend: u.ini.pend || 0, ops: u.ini.ops || 0, beli: u.ini.beli || 0, omzet: 0 };
        ((r.d.terjual && r.d.terjual.saluran) || []).forEach(function (s) { out.ring.omzet += s.omzet; });
      }
    }
    return out;
  }

  // tpbTutup (file 74) langsung di Supabase (rpc tutup_buku_tutup, SQL 134): simpan saldo akun akhir bulan, ringkasan,
  // penjualan otomatis bulan itu (dibekukan), dan stok per lokasi. paksa=true bila pemeriksaan wajib belum beres.
  async function tutup(sb, bulan, opsi) {
    opsi = opsi || {};
    if (!bulanOk(bulan)) return { ok: false, pesan: 'Bulan tidak valid.' };
    var r = await periksa(sb, bulan);
    var berat = r.cek.filter(function (c) { return !c.ok && c.berat; });
    if (berat.length && opsi.paksa !== true) return { ok: false, tanya: true, pesan: 'Masih ada yang perlu dibereskan: ' + berat.map(function (c) { return c.j + ' (' + c.ket + ')'; }).join('; ') + ' Tetap tutup buku?' };
    var dari = bulan + '-01', sampai = akhirBulan(bulan);
    var inti = await window.Akunting.inti(sb);
    if (!inti) return { ok: false, pesan: 'Data accounting gagal dimuat.' };
    var saldo = {};
    inti.cfg.akun.forEach(function (a) { saldo[a.n] = a.awal; });
    inti.gerak.forEach(function (g) { if (g.t <= sampai && (g.a in saldo)) saldo[g.a] += g.d; });
    Object.keys(saldo).forEach(function (k) { saldo[k] = Math.round(saldo[k] * 100) / 100; });
    var oto = inti.gerak.filter(function (g) { return g.auto && g.t >= dari && g.t <= sampai; })
      .map(function (g) { var x = g.auto; return { t: x.t, a: x.a, k: x.k, kel: x.kel, v: x.v, s: x.s || '' }; });
    var d = r.d && r.d.ok ? r.d : null, ring = null, stok = null;
    if (d) {
      var u = (d.uang && d.uang.ini) || {};
      ring = { pend: u.pend || 0, ops: u.ops || 0, beli: u.beli || 0, masuk: u.masuk || 0, keluar: u.keluar || 0,
        omzet: ((d.terjual && d.terjual.saluran) || []).reduce(function (a, s) { return a + (s.omzet || 0); }, 0), hpp: d.terjual ? d.terjual.hpp : 0, pcs: d.terjual ? d.terjual.q : 0,
        saluran: ((d.terjual && d.terjual.saluran) || []).map(function (s) { return { n: s.n, omzet: s.omzet, hpp: s.hpp, q: s.q }; }) };
      stok = (d.stok || []).map(function (x) { return { n: x.n, q: x.q, hpp: x.hpp, jual: x.jual, minus: x.minus }; });
    }
    var catatan = r.cek.filter(function (c) { return !c.ok; }).map(function (c) { return c.j + ': ' + c.ket; }).join(' | ').slice(0, 1000);
    var x = await sb.rpc('tutup_buku_tutup', { p_bulan: bulan, p_saldo: saldo, p_ring: ring, p_oto: oto, p_stok: stok, p_catatan: catatan });
    if (x.error) return { ok: false, pesan: x.error.message };
    return x.data || { ok: false, pesan: 'Gagal menutup buku.' };
  }
  async function buka(sb, bulan, alasan) {
    var x = await sb.rpc('tutup_buku_buka', { p_bulan: bulan, p_alasan: String(alasan || '') });
    if (x.error) return { ok: false, pesan: x.error.message };
    return x.data || { ok: false, pesan: 'Gagal membuka buku.' };
  }

  // Bulan yang diperiksa potret md:tpb: tanggal 1-10 bulan lalu, sesudahnya bulan ini (SBM_POTRET_).
  function bulanPotret() {
    var d = new Date(Date.now() + 8 * 3600e3), mundur = d.getUTCDate() <= 10 ? 1 : 0;
    var x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - mundur, 15));
    return x.toISOString().slice(0, 7);
  }

  // ======================= PENYEIMBANG (tpbPenyeimbang / tpbTerapkan, file 74 TPB_hitungPenyeimbang_) =======================
  // Ajuan hitung stok Kantor Packing & Gudang Utama yang menunggu -> kiriman yang belum tercatat, produksi belum tercatat / stok awal online,
  // dan sisa selisih. Ditulis lewat rpc tpb_py_terapkan (SQL 153, khusus manajemen).
  var TPB_PRODUKSI_ = /cat moscow|kenka/i, KP = 'Kantor Packing', GU = 'Gudang';
  async function hitungPenyeimbang(sb) {
    var L = await window.Lembar.muat(sb, ['barang_order', 'produksi_sesuai_log']), G = window.Gudang.buat(L), brg = G.barang();
    var semua = [];
    window.Lembar.baca(L, 'produksi_sesuai_log', 14).forEach(function (r) {
      var no = String(r[0] || '').trim(); if (!no) return;
      var sel = Number(r[8]);
      semua.push({ no: no, bg: String(r[2] || '').trim(), k: String(r[3] || '').trim().toUpperCase(), n: String(r[4] || '').replace(/\s+/g, ' ').trim(),
        w: String(r[5] === null || r[5] === undefined ? '' : r[5]).replace(/\s+/g, ' ').trim().toUpperCase(), sel: isFinite(sel) ? sel : 0, st: String(r[11] || '').trim() });
    });
    var per = {}, urut = [], nKP = 0, nGU = 0;
    semua.forEach(function (x) {
      if (x.st !== 'Menunggu' || !x.k || !x.sel || (x.bg !== KP && x.bg !== GU)) return;
      if (x.bg === KP) nKP++; else nGU++;
      if (!per[x.k]) {
        var b = brg.idx[x.k] !== undefined ? brg.list[brg.idx[x.k]] : null;
        per[x.k] = { k: x.k, n: (b && b.n) || x.n || x.k, kat: (b && b.kat) || '', kp: {}, gu: {}, aj: [] };
        urut.push(x.k);
      }
      var o = per[x.k], sisi = x.bg === KP ? o.kp : o.gu;
      sisi[x.w] = (sisi[x.w] || 0) + x.sel;
      o.aj.push(x);
    });
    var hasil = [], tot = { kpLebih: 0, kirim: 0, prod: 0, awal: 0, sisaKP: 0, sisaGU: 0, ajuan: 0 };
    urut.forEach(function (k) {
      var o = per[k], prod = TPB_PRODUKSI_.test(o.kat), kpLebih = 0, guLebih = 0;
      Object.keys(o.kp).forEach(function (w) { if (o.kp[w] > 0) kpLebih += o.kp[w]; });
      Object.keys(o.gu).forEach(function (w) { if (o.gu[w] < 0) guLebih += -o.gu[w]; });
      var kirim = Math.min(kpLebih, guLebih), tambahKP = {}, kurangGU = {}, kirimW = [], isiW = [], s = kirim;
      Object.keys(o.gu).sort(function (a, b) { return o.gu[a] - o.gu[b]; }).forEach(function (w) {
        if (s <= 0 || o.gu[w] >= 0) return;
        var q = Math.min(s, -o.gu[w]);
        kirimW.push({ w: w, q: q }); kurangGU[w] = (kurangGU[w] || 0) + q; tambahKP[w] = (tambahKP[w] || 0) + q; s -= q;
      });
      var sisa = kpLebih - kirim;
      Object.keys(o.kp).sort(function (a, b) { return o.kp[b] - o.kp[a]; }).forEach(function (w) {
        if (sisa <= 0) return;
        var perlu = (o.kp[w] || 0) - (tambahKP[w] || 0);
        if (perlu <= 0) return;
        var q = Math.min(sisa, perlu);
        isiW.push({ w: w, q: q }); tambahKP[w] = (tambahKP[w] || 0) + q; sisa -= q;
      });
      if (sisa > 0) { isiW.push({ w: '', q: sisa }); tambahKP[''] = (tambahKP[''] || 0) + sisa; sisa = 0; }
      var sisaKP = [], sisaGU = [], wKP = {}, wGU = {};
      Object.keys(o.kp).concat(Object.keys(tambahKP)).forEach(function (w) { wKP[w] = 1; });
      Object.keys(wKP).forEach(function (w) { var r = (o.kp[w] || 0) - (tambahKP[w] || 0); if (r) sisaKP.push({ w: w, q: r }); });
      Object.keys(o.gu).concat(Object.keys(kurangGU)).forEach(function (w) { wGU[w] = 1; });
      Object.keys(wGU).forEach(function (w) { var r = (o.gu[w] || 0) + (kurangGU[w] || 0); if (r) sisaGU.push({ w: w, q: r }); });
      var isi = 0, rKP = 0, rGU = 0, selKP = 0, selGU = 0;
      isiW.forEach(function (x) { isi += x.q; }); sisaKP.forEach(function (x) { rKP += x.q; }); sisaGU.forEach(function (x) { rGU += x.q; });
      Object.keys(o.kp).forEach(function (w) { selKP += o.kp[w]; }); Object.keys(o.gu).forEach(function (w) { selGU += o.gu[w]; });
      hasil.push({ k: k, n: o.n, kat: o.kat, jenis: prod ? 'Produksi' : 'Retail', selKP: selKP, selGU: selGU,
        kirim: kirim, prod: prod ? isi : 0, awal: prod ? 0 : isi, sisaKP: rKP, sisaGU: rGU,
        kirimW: kirimW, isiW: isiW, sisaKPW: sisaKP, sisaGUW: sisaGU, aj: o.aj.map(function (x) { return x.no; }) });
      tot.kpLebih += kpLebih; tot.kirim += kirim; tot.prod += prod ? isi : 0; tot.awal += prod ? 0 : isi;
      tot.sisaKP += rKP; tot.sisaGU += rGU; tot.ajuan += o.aj.length;
    });
    hasil.sort(function (a, b) { return (b.kirim + b.prod + b.awal) - (a.kirim + a.prod + a.awal); });
    return { list: hasil, tot: tot, nKP: nKP, nGU: nGU };
  }
  async function penyeimbang(sb) {
    var h = await hitungPenyeimbang(sb);
    return { ok: true, nKP: h.nKP, nGU: h.nGU, tot: h.tot,
      list: h.list.map(function (x) { return { k: x.k, n: x.n, jenis: x.jenis, selKP: x.selKP, selGU: x.selGU, kirim: x.kirim, prod: x.prod, awal: x.awal, sisaKP: x.sisaKP, sisaGU: x.sisaGU }; }) };
  }
  async function terapkan(sb, bulan) {
    var h = await hitungPenyeimbang(sb);
    if (!h.list.length) return { ok: false, pesan: 'Tidak ada ajuan hitung stok yang menunggu. Minta staf mengirim hitung stok Kantor Packing dan Gudang Utama dulu.' };
    if (!h.nKP || !h.nGU) return { ok: false, pesan: 'Hitung stok ' + (!h.nKP ? 'Kantor Packing' : 'Gudang Utama') + ' belum dikirim. Penyeimbang butuh hasil hitung kedua lokasi.' };
    var x = await sb.rpc('tpb_py_terapkan', { p_bulan: bulanOk(bulan) ? bulan : '', p_list: h.list.map(function (y) {
      return { k: y.k, n: y.n, kat: y.kat, jenis: y.jenis, kirimW: y.kirimW, isiW: y.isiW, sisaKPW: y.sisaKPW, sisaGUW: y.sisaGUW, aj: y.aj };
    }), p_tot: h.tot });
    if (x.error) return { ok: false, pesan: x.error.message };
    return x.data || { ok: false, pesan: 'Gagal menerapkan penyeimbang.' };
  }

  window.TutupBuku = { tpbData: tpbData, bulanPotret: bulanPotret, periksa: periksa, tutup: tutup, buka: buka, penyeimbang: penyeimbang, terapkan: terapkan };
})();
