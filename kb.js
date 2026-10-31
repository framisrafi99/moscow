/*
 * Moscow Supplies - halaman Mike (Kendali Bisnis) dibaca dari Supabase: kbData, kbLaporan, kbHarga, kbNaik (file 80 Apps Script).
 * Pengajuan, PO, barang dan log gudang dihitung di halaman dengan rumus yang sama (pengadaan.js, gudang.js, lembar.js).
 * Yang memakai rumus berat sistem lama (HPP rata-rata, HPP barang terjual, barang baru, harga beli naik) memakai potret
 * yang dihitung Apps Script tiap sinkron (hasil_hitung). Kalau potret belum ada, halaman membaca lewat Apps Script.
 */
(function () {
  'use strict';
  var PGD_ST_ = { TUNGGU: 'Menunggu', SETUJU: 'Disetujui' };
  var GD_ST_ = { SETUJU: 'Disetujui', BAYAR: 'Dibayar', KIRIM: 'Dikirim supplier', SEBAGIAN: 'Diterima sebagian', SELESAI: 'Selesai', TOLAK: 'Ditolak', BATAL: 'Batal' };
  var GD_BIAYA_JENIS_ = ['Ongkir cargo', 'Bill kedua / IMP', 'Pajak & bea masuk', 'Ongkir lokal', 'Lainnya'];
  var ACC_KEL_ = ['Pendapatan', 'Pembelian barang & bahan', 'Biaya operasional', 'Di luar laba rugi'];
  var CHR_BATAS_NAIK_ = 5;
  var TABEL = ['pengadaan_ajuan', 'barang_order', 'gudang_log', 'po_log', 'po_item', 'po_biaya'];

  function fmt(d, p) { return window.Lembar.format(d, p); }
  function jamSekarang() { return fmt(new Date(), 'dd/MM/yyyy HH:mm'); }
  function KB_t_(v, n) { return String(v === null || v === undefined ? '' : v).replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n || 200); }
  function KB_bulanOk_(b) { return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(b || '')); }
  function MM_rapi_(v, n) { return KB_t_(v, n); }
  function CHR_persen_(baru, lama) { return lama > 0 ? Math.round((baru - lama) / lama * 1000) / 10 : 0; }
  function CHR_margin_(hj, hpp) { return hj > 0 ? Math.round((hj - hpp) / hj * 100) : null; }

  // Potret yang lebih lama dari simpan terakhir di halaman ini belum memuat perubahan itu: baca lewat Apps Script dulu.
  function tulisTerakhir() { try { return Number(sessionStorage.getItem('kbTulis') || 0); } catch (e) { return 0; } }
  function potretBaru(waktu) { var t = Date.parse(waktu || ''); return isFinite(t) && t > tulisTerakhir(); }
  function catatTulis() { try { sessionStorage.setItem('kbTulis', String(Date.now())); } catch (e) { } }

  async function bahan(sb) {
    var r = await sb.rpc('kb_bahan');
    if (r.error || !r.data || !r.data.ok) return null;
    return r.data;
  }

  // PL_asalPeta_ / PL_impor_ (file 54), sama dengan pl.js.
  function asalPeta(L) {
    var m = {};
    window.Lembar.baca(L, 'pengadaan_ajuan', 23).forEach(function (r) { if (r[0]) m[String(r[0]).trim()] = String(r[22]).trim(); });
    return m;
  }
  function impor(x, peta) {
    var a = peta[x.no];
    if (a === 'Impor') return true;
    if (a === 'Lokal') return false;
    return x.kel === 'Barang jualan' || (x.kel === 'Botol & stiker' && /^(BT2|BT3)$/i.test(String(x.k || '')));
  }

  // KB_bayarBaca_: baris [ref, jenis, nominal, tanggal bayar, no transaksi, catatan, total invoice, supplier].
  function bayarBaca(rows) {
    var out = {};
    (rows || []).forEach(function (r) {
      var ref = KB_t_(r[0], 300);
      if (!ref) return;
      var x = out[ref] || (out[ref] = { ref: ref, list: [], bayar: 0, inv: 0, sup: '' });
      var v = Number(r[2]) || 0, j = KB_t_(r[1], 40);
      x.list.push({ t: KB_t_(r[3], 10), j: j, v: v, tr: KB_t_(r[4], 30), c: KB_t_(r[5], 200) });
      if (j === 'DP' || j === 'Pelunasan' || j === 'Lunas') x.bayar += v;
      if (Number(r[6]) > 0) x.inv = Number(r[6]);
      if (r[7]) x.sup = KB_t_(r[7], 80);
    });
    return out;
  }

  // 1. IMPOR (kbData)
  async function kbData(sb) {
    var h = await Promise.all([window.Lembar.muat(sb, TABEL), bahan(sb)]);
    if (!h[1]) return null;
    var L = h[0], semua = window.Pengadaan.buat(L).ajuan(), G = window.Gudang.buat(L), peta = asalPeta(L);
    var brg = G.barang(), wm = {};
    brg.list.forEach(function (b) { if (b.w && b.w.length) wm[b.k] = b.w.slice(); });
    var acc = semua.filter(function (x) { return x.st === PGD_ST_.TUNGGU && impor(x, peta); })
      .sort(function (a, b) { return a.ms - b.ms; })
      .map(function (x) { return { no: x.no, wk: x.wk, bg: x.bg, kel: x.kel, k: x.k, w: x.w || '', n: x.n, s: x.s, q: x.q, h: x.h, al: x.al, pg: x.pg }; });
    var tunggu = semua.filter(function (x) { return x.st === PGD_ST_.SETUJU && impor(x, peta); }).map(function (x) {
      var q = x.qs !== null && x.qs !== undefined ? x.qs : x.q;
      var gd = x.kel === 'Barang jualan' && x.k && brg.idx[x.k] !== undefined;
      return { no: x.no, wk: x.wk, bg: x.bg, kel: x.kel, k: x.k, w: x.w, n: x.n, s: x.s, q: q, h: x.h, pg: x.pg, oleh: x.oleh,
        gudang: gd, kurangWarna: gd && !!wm[x.k] && !x.w };
    });
    // KB_po_
    var po = G.po(), log = G.log();
    G.isiTerima(po, log);
    var bayar = bayarBaca(h[1].bayar);
    var batas = fmt(new Date(Date.now() - 45 * 86400000), 'yyyy-MM-dd');
    var selesai = [GD_ST_.SELESAI, GD_ST_.TOLAK, GD_ST_.BATAL];
    var out = [];
    po.list.forEach(function (o) {
      if (o.asal !== 'Impor') return;
      if (selesai.indexOf(o.st) !== -1 && o.t < batas) return;
      if (o.st === GD_ST_.TOLAK || o.st === GD_ST_.BATAL) return;
      var b = bayar[o.no], paid, lunas;
      if (b && b.list.some(function (x) { return x.j === 'DP' || x.j === 'Pelunasan'; })) { paid = b.bayar; lunas = paid >= o.tot - 1; }
      else { lunas = !!o.wb || [GD_ST_.BAYAR, GD_ST_.KIRIM, GD_ST_.SEBAGIAN, GD_ST_.SELESAI].indexOf(o.st) !== -1; paid = lunas ? o.tot : 0; }
      var bTot = 0;
      var biaya = o.biaya.map(function (x) { bTot += x.v; return { t: x.t, j: x.j, v: x.v, sb: x.sb }; });
      out.push({
        no: o.no, t: o.t, sup: o.sup, tot: o.tot, st: o.st, resi: o.resi, c: o.c,
        paid: paid, lunas: lunas, sisa: Math.max(0, o.tot - paid), biaya: biaya, bTot: bTot,
        riwayat: b ? b.list : [], belumDatang: o.sisa,
        items: o.items.map(function (it) { return { n: it.n, w: it.w, q: it.q, d: it.d, h: it.h }; })
      });
    });
    out.sort(function (a, b) { return a.t < b.t ? 1 : -1; });
    var lain = [];
    Object.keys(bayar).forEach(function (ref) {
      if (ref.indexOf('AJ:') !== 0) return;
      var x = bayar[ref];
      if (x.inv > 0 && x.bayar < x.inv - 1) lain.push({ ref: ref, nos: ref.slice(3), inv: x.inv, paid: x.bayar, sisa: x.inv - x.bayar, sup: x.sup, riwayat: x.list });
    });
    return {
      ok: true, acc: acc, tunggu: tunggu, po: out, lain: lain,
      jenisBiaya: GD_BIAYA_JENIS_.filter(function (j) { return j !== 'Ongkir lokal'; }),
      hariIni: fmt(new Date(), 'yyyy-MM-dd'), diperbarui: jamSekarang()
    };
  }

  // 2. LAPORAN (KB_laporan_): uang masuk / keluar dari Accounting (akun.js, langsung), HPP barang terjual dan status
  // tutup buku dari potret laporan:<bulan> (ceoUang, dihitung Apps Script tiap sinkron).
  function KB_channel_(n) {
    var s = String(n || '').toLowerCase();
    if (/consignment|bagi hasil/.test(s)) return 'Consignment';
    if (/reseller/.test(s)) return 'Reseller';
    if (/shopee|tokopedia|tiktok|lazada|online|marketplace|official/.test(s)) return 'Official';
    if (/offline|toko/.test(s)) return 'Toko Offline';
    return 'Lainnya';
  }
  async function kbLaporan(sb, p) {
    var bulan = KB_t_(p && p.bulan, 7);
    if (!KB_bulanOk_(bulan)) return null;
    var h = await Promise.all([sb.from('hasil_hitung').select('data, dibuat').eq('kunci', 'laporan:' + bulan).maybeSingle(),
      window.Akunting.akuntingLaporan(sb, { bulan: bulan }).catch(function () { return null; })]);
    var pot = h[0] && h[0].data ? h[0].data.data : null, lap = h[1];
    if (typeof pot === 'string') { try { pot = JSON.parse(pot); } catch (e) { pot = null; } }
    if (!pot || pot.bulan !== bulan) return null;
    // Mike / Junior tidak membaca catatan accounting mentah: potret laporan apa adanya (dihitung Apps Script tiap sinkron).
    if (!lap || !lap.ok) {
      var dib = Date.parse(h[0].data.dibuat || '');
      if (!potretBaru(h[0].data.dibuat) || !(Date.now() - dib < 2 * 3600000)) return null;
      var q = JSON.parse(JSON.stringify(pot));
      q.ok = true;
      if (p.ringkas) return { ok: true, bulan: q.bulan, final: q.final, omzet: q.omzet, keluar: q.keluar, kas: q.kas, laba: q.laba };
      return q;
    }
    var URUT = ['Official', 'Consignment', 'Toko Offline', 'Reseller', 'Lainnya'];
    var masuk = {};
    URUT.forEach(function (n) { masuk[n] = { n: n, v: 0, det: [] }; });
    var keluar = {}, luar = [];
    (lap.kat || []).forEach(function (k) {
      if (k.kel === 'Pendapatan') {
        var g = masuk[KB_channel_(k.n)], v = k.arah === 'Masuk' ? k.v : -k.v;
        g.v += v; g.det.push({ n: k.n, v: v });
      } else if (k.kel === ACC_KEL_[1] || k.kel === ACC_KEL_[2]) {
        var g2 = keluar[k.kel] || (keluar[k.kel] = { n: k.kel, v: 0, det: [] }), v2 = k.arah === 'Keluar' ? k.v : -k.v;
        g2.v += v2; g2.det.push({ n: k.n, v: v2 });
      } else if (k.v) luar.push({ n: k.n, arah: k.arah, v: k.v });
    });
    var hpp = pot.hpp === undefined ? null : pot.hpp, hppInfo = pot.hppInfo || '';
    var omzet = lap.lr.pend, beli = lap.lr.beli, biaya = lap.lr.biaya;
    var sort = function (a, b) { return b.v - a.v; };
    var d = {
      bulan: bulan, final: !!pot.final, omzet: omzet, beli: beli, biaya: biaya, keluar: beli + biaya,
      kas: omzet - beli - biaya, hpp: hpp, laba: hpp === null ? null : omzet - hpp - biaya, hppInfo: hppInfo,
      masuk: URUT.map(function (n) { masuk[n].det.sort(sort); return masuk[n]; }).filter(function (g) { return g.v || g.n !== 'Lainnya'; }),
      sektor: Object.keys(keluar).map(function (k) { keluar[k].det.sort(sort); return keluar[k]; }),
      luar: luar.sort(sort).slice(0, 12), peringatan: lap.peringatan || [],
      dibuat: jamSekarang()
    };
    d.ok = true;
    if (p.ringkas) return { ok: true, bulan: d.bulan, final: d.final, omzet: d.omzet, keluar: d.keluar, kas: d.kas, laba: d.laba };
    return d;
  }

  function potret(x) {
    var d = x;
    if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { d = null; } }
    return d;
  }

  // 3. HPP & HARGA (kbHarga)
  async function kbHarga(sb) {
    var h = await Promise.all([window.Lembar.muat(sb, ['barang_order']), bahan(sb)]);
    var B = h[1];
    if (!B) return null;
    var hp = potret(B.hpp), bbr = potret(B.bbr);
    if (!hp || !hp.hpp || !bbr || !potretBaru(B.waktu && B.waktu.hpp) || !potretBaru(B.waktu && B.waktu.bbr)) return null;
    var hpp = hp.hpp, brg = window.Gudang.buat(h[0]).barang();
    var list = brg.list.map(function (b) {
      var x = Number(hpp[b.k]) || 0, hj = b.h || 0;
      return { k: b.k, n: b.n, kat: b.kat, hpp: Math.round(x), hj: hj, m: hj && x ? hj - x : null, mp: hj && x ? Math.round((hj - x) / hj * 1000) / 10 : null };
    });
    var baru = bbr.ok ? bbr : { tunggu: [], kategori: [] };
    return { ok: true, list: list, baru: baru.tunggu || [], kategori: baru.kategori || [], diperbarui: jamSekarang() };
  }

  // 4. HARGA NAIK (kbNaik): usulan HPP menunggu (hppMikeData) + harga beli naik 60 hari (hrgNaikData).
  async function kbNaik(sb) {
    var h = await Promise.all([window.Lembar.muat(sb, ['barang_order']), bahan(sb)]);
    var B = h[1];
    if (!B) return null;
    var hp = potret(B.hpp), nk = potret(B.naik);
    if (!hp || !hp.hpp || !nk || !potretBaru(B.waktu && B.waktu.hpp) || !potretBaru(B.waktu && B.waktu.naik)) return null;
    var hpp = hp.hpp, brg = window.Gudang.buat(h[0]).barang();
    var usul = (B.usul || []).map(function (r) {
      var w = r[1] ? new Date(r[1]) : null, ok = w && !isNaN(w.getTime());
      return { no: MM_rapi_(r[0], 30), wk: ok ? fmt(w, 'dd/MM/yyyy HH:mm') : MM_rapi_(r[1], 20), ms: ok ? w.getTime() : 0, dari: MM_rapi_(r[2], 120), nama: MM_rapi_(r[3], 60),
        j: MM_rapi_(r[4], 30), k: MM_rapi_(r[6], 30).toUpperCase(), n: MM_rapi_(r[7], 120),
        lama: Number(r[8]) || 0, baru: Number(r[9]) || 0, al: MM_rapi_(r[10], 300), st: MM_rapi_(r[11], 30) };
    }).filter(function (x) { return x.no && x.st === 'Menunggu' && x.j === 'HPP'; })
      .sort(function (a, b) { return a.ms - b.ms; }).map(function (x) {
        var b = brg.idx[x.k] !== undefined ? brg.list[brg.idx[x.k]] : null, hj = b ? (b.h || 0) : 0;
        var naik = CHR_persen_(x.baru, x.lama);
        return {
          no: x.no, wk: x.wk, dari: x.dari, nama: x.nama, k: x.k, n: x.n, lama: x.lama, baru: x.baru, al: x.al, hj: hj, naik: naik,
          mLama: x.lama ? CHR_margin_(hj, x.lama) : null, mBaru: CHR_margin_(hj, x.baru),
          tinjau: (x.lama > 0 && naik >= CHR_BATAS_NAIK_) || (hj > 0 && x.baru >= hj)
        };
      });
    var batas = fmt(new Date(Date.now() - 60 * 86400000), 'yyyy-MM-dd'), beli = [];
    if (nk.ok && Array.isArray(nk.list)) beli = nk.list.filter(function (x) { return x.t >= batas && x.baru > x.lama; }).slice(0, 300).map(function (x) {
      var i = brg.idx[String(x.k).toUpperCase()], b = i !== undefined ? brg.list[i] : null;
      var hp2 = b ? Number(hpp[b.k]) || 0 : 0, hj = b ? b.h || 0 : 0;
      return { t: x.t, kel: x.kel, k: x.k, n: x.n, w: x.w, lama: x.lama, baru: x.baru, pc: x.pc, sup: x.sup, jual: !!b, hpp: Math.round(hp2), hj: hj, mp: hj && hp2 ? Math.round((hj - hp2) / hj * 1000) / 10 : null };
    });
    return { ok: true, usul: usul, usulPesan: '', beli: beli, diperbarui: jamSekarang() };
  }

  window.KendaliBisnis = { kbData: kbData, kbLaporan: kbLaporan, kbHarga: kbHarga, kbNaik: kbNaik, catatTulis: catatTulis };
})();
