/*
 * Moscow Supplies - hitungan "Penjualan & Bagi Hasil" untuk halaman toko consignment.
 * Salinan rumus Apps Script yang sama persis (bagiHasilToko beserta semua tambahannya, urutan pemasangan sama):
 *   dasar BH_hitung_ (Medan) / BHX_hitung_ (Sidoarjo, Renon)
 *   -> saluran penjualan & dana diterima (file 36) -> laporan dana marketplace (file 75)
 *   -> uang tunai offline (file 76) -> status invoice (file 77) -> laporan bulan toko offline (file 78)
 *   -> daftar harga jual dan harga dasar.
 * Datanya dari Supabase (fungsi toko_bahan_bagi_hasil). Angka setoran tidak ikut (sama seperti formulir staf).
 */
(function () {
  'use strict';

  var TZ = 'Asia/Makassar';
  var BHX_TOKO_ = {
    'Consignment Medan': { nama: 'Medan', persen: 50, medan: true },
    'Consignment Sidoarjo': { nama: 'Sidoarjo', persen: 70 },
    'Consignment Renon': { nama: 'Renon', persen: 30 }
  };
  var BH_KATA_ONGKIR_ = /ongkir|ongkos kirim|ekspedisi|kargo|cargo|pengiriman barang/i;
  var SAL_TOKO_ = { 'Consignment Medan': ['Shopee', 'Tokopedia'], 'Consignment Sidoarjo': ['Shopee', 'Langsung'] };
  var SAL_MARKET_ = ['Shopee', 'Tokopedia', 'TikTok', 'Lazada'];
  var SAL_LABEL_ = { Shopee: 'Shopee', Tokopedia: 'Tokopedia / TikTok Shop', TikTok: 'TikTok', Lazada: 'Lazada', Langsung: 'Penjualan langsung' };
  var TN_SAL_ = 'Langsung';
  var RN_TOKO_ = ['Consignment Renon'];

  // ---- bantuan: nilai sel seperti di sheet ----
  function sel(v) { return v === null || v === undefined ? '' : v; }
  function teks(v, n) { return String(sel(v)).replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n || 200); }
  function BH_teks_(v, n) { return String(sel(v)).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n || 200); }
  function BH_num_(v) { var n = Number(sel(v)); return isFinite(n) ? n : 0; }
  function DC_n_(v) { var x = Math.round(Number(sel(v))); return isFinite(x) ? x : 0; }
  // Kolom teks yang di sheet berisi tanggal disalin sebagai "dd/MM/yyyy" atau "dd/MM/yyyy HH:mm:ss".
  function tglTeks(v) { var m = String(sel(v)).match(/^(\d{2})\/(\d{2})\/(\d{4})(?: \d{2}:\d{2}:\d{2})?$/); return m ? m[3] + '-' + m[2] + '-' + m[1] : null; }
  function bulanSel(v, n) { var t = tglTeks(v); return t ? t.slice(0, 7) : teks(v, n || 10); }
  function jamMakassar(iso, pola) {
    if (!iso) return '';
    var d = new Date(iso); if (isNaN(d.getTime())) return '';
    var w = new Date(d.getTime() + 8 * 3600 * 1000), p = function (x) { return (x < 10 ? '0' : '') + x; };
    var dd = p(w.getUTCDate()), mm = p(w.getUTCMonth() + 1), yy = w.getUTCFullYear(), hh = p(w.getUTCHours()), mi = p(w.getUTCMinutes());
    return pola === 'dd/MM HH:mm' ? dd + '/' + mm + ' ' + hh + ':' + mi : dd + '/' + mm + '/' + yy + ' ' + hh + ':' + mi;
  }
  function sekarang() { return jamMakassar(new Date().toISOString()); }
  function dasar(k) { return String(sel(k)).trim().toUpperCase().split('-')[0]; }
  function rp(n) { n = Math.round(Number(n) || 0); return (n < 0 ? '-' : '') + 'Rp ' + String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

  // ---- dasar: BH_hitung_ / BHX_hitung_ ----
  function manual(rows, bulan) {
    var out = { shopee: 0, tiktok: 0, ongkir: 0, catatan: '', baris: 0 };
    rows.forEach(function (r, i) {
      var b = tglTeks(r[0]) ? tglTeks(r[0]).slice(0, 7) : String(sel(r[0])).trim();
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(b) || b !== bulan) return;
      out.shopee = BH_num_(r[1]); out.tiktok = BH_num_(r[2]); out.ongkir = BH_num_(r[3]); out.catatan = BH_teks_(r[4], 200); out.baris = i + 2;
    });
    return out;
  }

  function hitungDasar(toko, bulan, D) {
    var c = BHX_TOKO_[toko];
    var hpp = {}, nama = {};
    D.hpp.forEach(function (r) {
      var k = dasar(r[0]);
      if (!k || sel(r[2]) === '' || !isFinite(Number(r[2]))) return;
      hpp[k] = Number(r[2]); nama[k] = BH_teks_(r[1], 80);
    });
    var idx = {}, items = [];
    function ambil(k, n) {
      if (!idx[k]) { idx[k] = { k: k, n: n || nama[k] || k, q: 0, omzet: 0, rq: 0, rl: 0, rn: 0 }; items.push(idx[k]); }
      return idx[k];
    }
    D.jual.forEach(function (r) {
      if (BH_teks_(r[1], 80) !== toko) return;
      var x = ambil(dasar(r[2]), BH_teks_(r[3], 80));
      x.q += BH_num_(r[4]); x.omzet += BH_num_(r[6]);
    });
    D.retur.forEach(function (r) {
      if (BH_teks_(r[1], 80) !== toko) return;
      var x = ambil(dasar(r[2]), BH_teks_(r[3], 80));
      x.rq += BH_num_(r[4]); x.rn += BH_num_(r[6]);
      if (BH_teks_(r[10], 20) === 'Layak jual') x.rl += BH_num_(r[4]);
    });
    var omzet = 0, retur = 0, hppJual = 0, hppRetur = 0, qty = 0, tanpa = [];
    items.forEach(function (x) {
      x.ada = Object.prototype.hasOwnProperty.call(hpp, x.k) ? 1 : 0;
      x.hpp = x.ada ? hpp[x.k] : 0;
      x.hppTot = (x.q - x.rl) * x.hpp;
      omzet += x.omzet; retur += x.rn; qty += x.q;
      hppJual += x.q * x.hpp; hppRetur += x.rl * x.hpp;
      if (!x.ada && (x.q || x.rq)) tanpa.push(x.k + ' ' + x.n);
    });
    items.sort(function (a, b) { return b.omzet - a.omzet; });
    var biaya = [], belanja = 0, ongkirLap = 0;
    D.biaya.forEach(function (r) {
      if (BH_teks_(r[1], 80) !== toko) return;
      var ket = BH_teks_(r[2], 160), nom = BH_num_(r[3]), o = BH_KATA_ONGKIR_.test(ket) ? 1 : 0;
      biaya.push({ t: String(r[0]), ket: ket, nom: nom, o: o });
      if (o) ongkirLap += nom; else belanja += nom;
    });
    biaya.sort(function (a, b) { return a.t < b.t ? -1 : (a.t > b.t ? 1 : 0); });
    var m = manual(D.manual, bulan);
    var penjualan = omzet - retur, hppBersih = hppJual - hppRetur, potongan = m.shopee + m.tiktok, ongkir = ongkirLap + m.ongkir;
    var kotor = penjualan - hppBersih, bersih = kotor - potongan - belanja - ongkir;
    var medan = Math.round(bersih * c.persen / 100), moscowBagian = bersih - medan;
    var d = { bulan: bulan, toko: toko };
    if (!c.medan) d.nama = c.nama;
    d.persen = c.persen;
    var isi = {
      qty: qty, omzet: omzet, retur: retur, penjualan: penjualan,
      hppJual: hppJual, hppRetur: hppRetur, hpp: hppBersih, kotor: kotor,
      shopee: m.shopee, tiktok: m.tiktok, potongan: potongan,
      belanja: belanja, ongkirLap: ongkirLap, ongkirManual: m.ongkir, ongkir: ongkir,
      bersih: bersih, medan: medan, moscowBagian: moscowBagian,
      moscow: ongkir + belanja + hppBersih + moscowBagian,
      catatan: m.catatan, items: items, biaya: biaya, tanpa: tanpa, adaHpp: Object.keys(hpp).length,
      diperbarui: sekarang()
    };
    Object.keys(isi).forEach(function (k) { d[k] = isi[k]; });
    if (c.medan) d.nama = c.nama;
    return d;
  }

  // ---- file 36: saluran penjualan ----
  function SAL_pasar_(toko) { return (SAL_TOKO_[toko] || []).filter(function (s) { return SAL_MARKET_.indexOf(s) !== -1; }); }
  function salDana(D, toko, bulan) {
    var out = {};
    D.sdana.forEach(function (r, i) {
      var b = bulanSel(r[0]);
      if (b !== bulan || teks(r[1], 80) !== toko || sel(r[3]) === '' || !isFinite(Number(r[3]))) return;
      out[teks(r[2], 30)] = { dana: Number(r[3]), baris: i + 2 };
    });
    return out;
  }
  function salTerapkan(d, toko, jual, dana) {
    var opsi = SAL_TOKO_[toko];
    if (!opsi || !d) return d;
    var pasar = SAL_pasar_(toko);
    var per = {}, belum = 0, belumQ = 0, langsung = 0;
    opsi.forEach(function (s) { per[s] = { tot: 0, q: 0 }; });
    jual.forEach(function (x) {
      if (per[x.s]) { per[x.s].tot += x.tot; per[x.s].q += x.q; } else { belum += x.tot; belumQ += x.q; }
      if (x.s === 'Langsung') langsung += x.tot;
    });
    var lengkap = pasar.length > 0 && pasar.every(function (s) { return dana[s]; });
    var baris = opsi.map(function (s) {
      var mp = pasar.indexOf(s) !== -1, dn = mp && dana[s] ? dana[s].dana : null, pot = dn === null ? null : per[s].tot - dn;
      return { s: s, l: SAL_LABEL_[s] || s, mp: mp, jual: per[s].tot, q: per[s].q, dana: dn, pot: pot, pct: (pot !== null && per[s].tot) ? Math.round(pot / per[s].tot * 1000) / 10 : null };
    });
    var sal = { toko: toko, baris: baris, belum: belum, belumQ: belumQ, lengkap: lengkap, pasar: pasar, oto: false, catatan: [] };
    if (belumQ) {
      sal.catatan.push(belumQ + ' pcs (' + rp(belum) + ') penjualan belum punya saluran (dicatat sebelum fitur ini).' +
        (opsi.indexOf('Langsung') !== -1 ? ' Dalam hitungan potongan dianggap penjualan marketplace.' : ''));
    }
    if (lengkap) {
      var danaTot = 0;
      pasar.forEach(function (s) { danaTot += dana[s].dana; });
      var jualMP = (Number(d.penjualan) || 0) - langsung, potTot = jualMP - danaTot;
      var pertama = baris.filter(function (b) { return b.s === pasar[0]; })[0];
      var potPertama = pasar.length > 1 ? (pertama.pot || 0) : potTot;
      d.shopee = pasar[0] === 'Shopee' ? potPertama : 0;
      d.tiktok = potTot - d.shopee;
      d.potongan = potTot;
      d.bersih = d.kotor - d.potongan - d.belanja - d.ongkir;
      d.medan = Math.round(d.bersih * d.persen / 100);
      d.moscowBagian = d.bersih - d.medan;
      d.moscow = d.ongkir + d.belanja + d.hpp + d.moscowBagian;
      d.salOto = true;
      sal.oto = true; sal.jualMP = jualMP; sal.danaTot = danaTot; sal.potTot = potTot;
      sal.pctTot = jualMP ? Math.round(potTot / jualMP * 1000) / 10 : null;
      if (potTot < 0) sal.catatan.push('Dana diterima lebih besar dari penjualan marketplace yang tercatat. Cek lagi angka dana atau laporan penjualan.');
      if (d.retur) sal.catatan.push('Barang return (' + rp(d.retur) + ') dianggap berasal dari marketplace.');
    } else if (pasar.length) {
      sal.catatan.push('Potongan otomatis aktif setelah dana diterima ' + pasar.map(function (s) { return SAL_LABEL_[s]; }).join(' dan ') + ' diisi. Sampai saat itu, potongan memakai isian manual.');
    }
    d.salur = sal;
    return d;
  }

  // ---- file 75: laporan dana marketplace (tanpa angka setoran) ----
  function namaBulan(b) {
    var nm = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    var a = String(b || '').split('-');
    return a.length === 2 ? nm[Number(a[1]) - 1] + ' ' + a[0] : String(b || '');
  }
  function dcInfo(D, toko, bulan) {
    var out = {};
    D.dc.forEach(function (r) {
      if (bulanSel(r[0]) !== bulan || teks(r[1], 80) !== toko) return;
      var tarik = [];
      try { tarik = JSON.parse(String(sel(r[15]) || '[]')); } catch (e) { }
      out[teks(r[2], 20)] = {
        akun: teks(r[3], 80), dari: tglTeks(r[4]) || teks(r[4], 10), sampai: tglTeks(r[5]) || teks(r[5], 10),
        harga: DC_n_(r[6]), refund: DC_n_(r[7]), pendapatan: DC_n_(r[8]), biaya: DC_n_(r[9]), pen: DC_n_(r[11]),
        cair: DC_n_(r[13]), jml: DC_n_(r[14]), tarik: tarik, file: teks(r[16], 120), oleh: teks(r[17], 40),
        waktu: r[18] ? jamMakassar(r[18]) : ''
      };
    });
    return out;
  }

  // ---- file 76: uang tunai offline ----
  function tnBaca(D, toko, bulan) {
    var out = null;
    D.sdana.forEach(function (r, i) {
      var b = bulanSel(r[0]);
      if (b !== bulan || teks(r[1], 80) !== toko || teks(r[2], 30) !== TN_SAL_ || sel(r[3]) === '' || !isFinite(Number(r[3]))) return;
      out = { v: Math.round(Number(r[3])), oleh: teks(r[4], 40), waktu: r[5] ? jamMakassar(r[5]) : '', baris: i + 2 };
    });
    return out;
  }

  // ---- file 77: status invoice ----
  function akhirBulan(bulan) {
    var a = bulan.split('-'), y = Number(a[0]), m = Number(a[1]);
    var d = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return bulan + '-' + (d < 10 ? '0' : '') + d;
  }
  function kodeToko(toko) { var w = String(toko).split(' '); return w[w.length - 1].replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase(); }
  function noInvoice(toko, bulan) { return 'BH-' + kodeToko(toko) + '-' + bulan.replace('-', ''); }
  function bhiStatus(d, toko, bulan) {
    var kurang = [], akhir = akhirBulan(bulan);
    var info = (d && d.dc && d.dc.info) || {}, pasar = (d && d.dc && d.dc.pasar) || [];
    var waktu = '';
    pasar.forEach(function (pf) {
      var f = info[pf];
      if (!f) kurang.push('laporan dana ' + pf);
      else if (String(f.sampai || '') < akhir) kurang.push('laporan dana ' + pf + ' (baru sampai ' + f.sampai + ')');
      else if (f.waktu > waktu) waktu = f.waktu;
    });
    if (d && d.tunai && d.tunai.aktif && !d.tunai.isi) kurang.push('uang tunai penjualan offline');
    if (!pasar.length) kurang.push('toko ini tidak memakai laporan dana');
    return { terbit: kurang.length === 0, kurang: kurang, no: noInvoice(toko, bulan), waktu: waktu };
  }

  // ---- file 78: laporan bulan toko offline ----
  function rnAngka(v) { return sel(v) === '' ? null : Math.round(Number(v) || 0); }
  function rnBaca(D, toko, bulan) {
    var out = null;
    D.rn.forEach(function (r, i) {
      if (bulanSel(r[0]) !== bulan || teks(r[1], 80) !== toko) return;
      out = { tunai: rnAngka(r[2]), transfer: rnAngka(r[3]), tutup: teks(r[4], 20) === 'Ditutup', oleh: teks(r[5], 40),
        waktu: r[6] ? jamMakassar(r[6]) : '', olehTutup: teks(r[7], 40), waktuTutup: r[8] ? jamMakassar(r[8]) : '', baris: i + 2 };
    });
    return out;
  }

  // ---- daftar harga jual dan harga dasar ----
  function daftar(D) {
    var hpp = {};
    D.hpp.forEach(function (r) {
      var k = dasar(r[0]);
      if (k && sel(r[2]) !== '' && isFinite(Number(r[2]))) hpp[k] = Number(r[2]);
    });
    var out = [], dilihat = {};
    D.barang.forEach(function (r) {
      var kode = String(sel(r[0])).trim().toUpperCase();
      if (!kode || kode.indexOf('-') !== -1 || dilihat[kode]) return;
      dilihat[kode] = true;
      var h = Number(sel(r[2])), harga = (sel(r[2]) === '' || !isFinite(h) || h < 0) ? 0 : h;
      var ada = Object.prototype.hasOwnProperty.call(hpp, kode);
      out.push({ k: kode, n: String(sel(r[1])).trim(), kat: String(sel(r[3])).trim() || 'Lainnya', h: harga, hpp: ada ? hpp[kode] : null });
    });
    return out;
  }

  // ---- 31 Okt 2026: barang titipan staf (Medan) masuk ke bagi hasil, sama dengan TTPBH_terapkan_ di Apps Script ----
  var TTP_TOKO_ = ['Consignment Medan'];
  function ttpRingkas(D, toko, bulan) {
    var per = {}, urut = [], tot = { pcs: 0, omzet: 0, hpp: 0 };
    (D.ttp || []).forEach(function (r) {
      var t = String(sel(r[2])).slice(0, 10);
      if (teks(r[1], 60) !== toko || teks(r[3], 10).toUpperCase() !== 'JUAL' || t.slice(0, 7) !== bulan) return;
      var k = teks(r[4], 20).toUpperCase(), q = Number(sel(r[6])) || 0, h = Number(sel(r[7])) || 0, hp = Number(sel(r[8])) || 0;
      var x = per[k] || (per[k] = { k: k, n: teks(r[5], 120), q: 0, omzet: 0, hpp: 0 });
      if (urut.indexOf(x) === -1) urut.push(x);
      x.q += q; x.omzet += q * h; x.hpp += q * hp;
      tot.pcs += q; tot.omzet += q * h; tot.hpp += q * hp;
    });
    return { tot: tot, per: urut.sort(function (a, b) { return b.omzet - a.omzet; }) };
  }
  function titipan(d, ring) {
    var T = Math.round(Number(ring && ring.tot && ring.tot.omzet) || 0);
    if (!d || !T) return d;
    var s = d.salur || {};
    var tit = { omzet: T, pcs: ring.tot.pcs, pot: 0, pct: null, sementara: true,
      items: ring.per.map(function (x) { return { k: x.k, n: x.n, q: x.q, omzet: Math.round(x.omzet) }; }) };
    if (s.oto && (Number(s.jualMP) || 0) + T > 0) {
      var J = Number(s.jualMP) || 0, Dn = Number(s.danaTot) || 0, tot = J + T;
      var potM = Math.round(J - Dn * J / tot), potAll = tot - Dn;
      tit.pot = potAll - potM;
      tit.pct = Math.round(potAll / tot * 1000) / 10;
      tit.sementara = false;
      var pasar = s.pasar || [], baris = s.baris || [];
      if (pasar[0] === 'Shopee') {
        if (pasar.length > 1) {
          var b = baris.filter(function (x) { return x.s === 'Shopee'; })[0];
          if (b && b.dana !== null && b.dana !== undefined) d.shopee = Math.round(b.jual - b.dana * J / tot);
        } else d.shopee = potM;
      } else d.shopee = 0;
      d.potongan = potM;
      d.tiktok = d.potongan - d.shopee;
      d.bersih = d.kotor - d.potongan - d.belanja - d.ongkir;
      d.medan = Math.round(d.bersih * d.persen / 100);
      d.moscowBagian = d.bersih - d.medan;
      d.moscow = d.ongkir + d.belanja + d.hpp + d.moscowBagian;
      s.titipan = T;
    } else {
      var pj = Number(d.penjualan) || 0, pt = Number(d.potongan) || 0;
      tit.pot = pj > 0 ? Math.round(T * pt / pj) : 0;
      tit.pct = pj > 0 ? Math.round(pt / pj * 1000) / 10 : 0;
    }
    tit.bersih = T - tit.pot;
    d.titipan = tit;
    d.medanTotal = d.medan + tit.bersih;
    return d;
  }

  // ---- bagiHasilToko ----
  function hitung(toko, bulan, D) {
    if (!BHX_TOKO_[toko]) return { ok: false, pesan: 'Akses ditolak.' };
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(bulan || ''))) return { ok: false, pesan: 'Bulan tidak valid.' };
    var d = hitungDasar(toko, bulan, D);
    // file 36
    if (SAL_TOKO_[toko]) {
      try {
        var jual = D.jual.filter(function (r) { return BH_teks_(r[1], 80) === toko; })
          .map(function (r) { return { s: teks(r[7], 30), tot: Number(sel(r[6])) || 0, q: Number(sel(r[4])) || 0 }; });
        salTerapkan(d, toko, jual, salDana(D, toko, bulan));
      } catch (e) { d.salur = { toko: toko, galat: e.message }; }
    }
    // file 75 (angka setoran tidak dikirim ke formulir staf)
    if (SAL_pasar_(toko).length) {
      try { d.dc = { toko: toko, bulan: bulan, namaBulan: namaBulan(bulan), pasar: SAL_pasar_(toko), info: dcInfo(D, toko, bulan) }; }
      catch (e) { d.dc = { toko: toko, galat: e.message }; }
    }
    // 31 Okt: barang titipan staf (bungkus terakhir di Apps Script; untuk Medan file 76/78 tidak aktif, jadi urutannya sama)
    if (TTP_TOKO_.indexOf(toko) !== -1) { try { titipan(d, ttpRingkas(D, toko, bulan)); } catch (e) { d.titipanGalat = e.message; } }
    // file 76
    if ((SAL_TOKO_[toko] || []).indexOf(TN_SAL_) !== -1) {
      try {
        var tn = tnBaca(D, toko, bulan), s = d.salur || {}, info = { aktif: true, isi: tn, pakai: false };
        if (tn && s.lengkap) {
          var omzet = (Number(s.danaTot) || 0) + tn.v;
          d.potongan = (Number(d.penjualan) || 0) - omzet;
          d.shopee = d.potongan; d.tiktok = 0;
          d.bersih = d.kotor - d.potongan - d.belanja - d.ongkir;
          d.medan = Math.round(d.bersih * d.persen / 100);
          d.moscowBagian = d.bersih - d.medan;
          d.moscow = d.ongkir + d.belanja + d.hpp + d.moscowBagian;
          info.pakai = true; info.omzetBersih = omzet; info.danaMP = Number(s.danaTot) || 0;
        }
        d.tunai = info;
      } catch (e) { d.tunai = { aktif: true, galat: e.message }; }
    }
    // file 77 (toko marketplace, ditambah toko laporan bulan dari file 78)
    var rnAktif = RN_TOKO_.indexOf(toko) !== -1;
    if (SAL_pasar_(toko).length || rnAktif) { try { d.bhi = bhiStatus(d, toko, bulan); } catch (e) { } }
    // file 78
    if (rnAktif) {
      try {
        var lap = rnBaca(D, toko, bulan);
        var lengkap = !!(lap && lap.tunai !== null && lap.transfer !== null);
        if (lengkap) {
          var om = lap.tunai + lap.transfer;
          d.potongan = (Number(d.penjualan) || 0) - om;
          d.shopee = d.potongan; d.tiktok = 0;
          d.bersih = d.kotor - d.potongan - d.belanja - d.ongkir;
          d.medan = Math.round(d.bersih * d.persen / 100);
          d.moscowBagian = d.bersih - d.medan;
          d.moscow = d.ongkir + d.belanja + d.hpp + d.moscowBagian;
          d.salOto = true;
        }
        d.moscow = (Number(d.hpp) || 0) + (Number(d.moscowBagian) || 0);
        d.biayaToko = true;
        var kurang = [];
        if (!lengkap) kurang.push('total tunai dan transfer bulan ini');
        else if (!lap.tutup) kurang.push('tombol "Tutup laporan bulan ini"');
        d.bhi = { terbit: lengkap && lap.tutup, kurang: kurang, no: noInvoice(toko, bulan), waktu: lap && lap.tutup ? lap.waktuTutup : '', toko: toko };
        d.rn = { toko: toko, bulan: bulan, lap: lap, lengkap: lengkap, omzet: lengkap ? lap.tunai + lap.transfer : null };
      } catch (e) { d.rn = { toko: toko, galat: e.message }; }
    }
    d.daftar = daftar(D);
    d.ok = true;
    return d;
  }

  // ---- invoice bagi hasil (bhInvoice, file 77 + 78; 31 Okt dipindah ke aplikasi) ----
  function jamSekarang() { return sekarang(); }
  function invoice(toko, bulan, D, staf) {
    var tokoMP = SAL_pasar_(toko).length > 0 || RN_TOKO_.indexOf(toko) !== -1;
    if (!tokoMP) return { ok: false, pesan: 'Invoice bagi hasil belum tersedia untuk toko ini.' };
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(bulan || ''))) return { ok: false, pesan: 'Bulan tidak valid.' };
    var d = hitung(toko, bulan, D);
    if (!d || !d.ok) return d;
    var st = d.bhi || bhiStatus(d, toko, bulan);
    var tercatat = 0;
    (D.setor || []).forEach(function (r) { tercatat += DC_n_(r[3]); });
    var items = (d.items || []).filter(function (x) { return x.q || x.rq; }).map(function (x) {
      return { k: x.k, n: x.n, q: x.q, omzet: Math.round(x.omzet), rq: x.rq, rl: x.rl, rn: Math.round(x.rn || 0), hpp: x.hpp, hppTot: Math.round(x.hppTot), ada: x.ada };
    });
    var dana = [];
    ((d.dc && d.dc.pasar) || []).forEach(function (pf) {
      var f = d.dc.info[pf];
      dana.push(f ? { pf: pf, dari: f.dari, sampai: f.sampai, harga: f.harga, biaya: f.biaya, pen: f.pen, cair: f.cair, jml: f.jml } : { pf: pf, belum: true });
    });
    var penjualan = Math.round(d.penjualan || 0), potongan = Math.round(d.potongan || 0);
    var v = {
      ok: true, staf: !!staf, no: st.no, terbit: st.terbit, kurang: st.kurang, waktu: st.waktu,
      toko: toko, nama: d.nama || toko, bulan: bulan, persen: d.persen,
      dana: dana, tunai: d.tunai && d.tunai.isi ? d.tunai.isi.v : null, tunaiAktif: !!(d.tunai && d.tunai.aktif),
      omzet: Math.round(d.omzet || 0), retur: Math.round(d.retur || 0), penjualan: penjualan, potongan: potongan, omzetBersih: penjualan - potongan,
      hpp: Math.round(d.hpp || 0), belanja: Math.round(d.belanja || 0), ongkir: Math.round(d.ongkir || 0),
      bersih: Math.round(d.bersih || 0), bagianToko: Math.round(d.medan || 0), bagianMoscow: Math.round(d.moscowBagian || 0),
      setoran: Math.round(d.moscow || 0), tercatat: tercatat, titipan: d.titipan || null,
      items: items, biaya: d.biaya || [], tanpa: d.tanpa || [],
      akun: (SAL_pasar_(toko).length && D.akunpen) ? teks(D.akunpen, 60) : 'Rekening PT',
      dibuat: jamSekarang()
    };
    // file 78: toko laporan bulan (Renon)
    if (RN_TOKO_.indexOf(toko) !== -1) {
      var lap = rnBaca(D, toko, bulan);
      v.dana = [
        { manual: true, pf: 'Uang tunai (dipegang admin toko)', ket: 'diisi staf toko', cair: lap && lap.tunai !== null ? lap.tunai : 0, belumIsi: !(lap && lap.tunai !== null) },
        { manual: true, pf: 'Transfer / QRIS (rekening consignment)', ket: 'diisi staf toko', cair: lap && lap.transfer !== null ? lap.transfer : 0, belumIsi: !(lap && lap.transfer !== null) }
      ];
      v.akun = 'Rekening PT';
      v.biayaToko = true;
    }
    return v;
  }

  // hppTokoSaya: harga dasar barang terjual (kartu di tab Report penjualan, sekarang hanya Medan).
  function hppSaya(toko, bulan, D) {
    if (toko !== 'Consignment Medan') return { ok: false, pesan: 'Akses ditolak.' };
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(bulan || ''))) return { ok: false, pesan: 'Pilih bulan.' };
    var d = hitungDasar(toko, bulan, D);
    return {
      ok: true, bulan: bulan, qty: d.qty, hppJual: d.hppJual, hppRetur: d.hppRetur, hpp: d.hpp,
      items: d.items.filter(function (x) { return x.q || x.rl; }).map(function (x) {
        return { k: x.k, n: x.n, q: x.q, rl: x.rl, hpp: x.hpp, ada: x.ada, tot: x.hppTot };
      }),
      tanpa: d.tanpa, diperbarui: d.diperbarui
    };
  }

  window.BagiHasil = { hitung: hitung, hppSaya: hppSaya, invoice: invoice };
})();
