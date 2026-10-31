/*
 * Moscow Supplies - Form accounting manajemen dibaca dari Supabase (rpc akunting_baca).
 * Rumus sama dengan Apps Script file 8 (akuntingData, akuntingLaporan) + file 67 (metode bayar Toko Offline, mbDaftar).
 * Penjualan otomatis selain Toko Offline datang dari potret 'acc:oto' (dihitung Apps Script SBM_accOto_);
 * penjualan & ongkir Toko Offline per nota (bulan yang belum ditutup) dihitung di sini dari nota kasir.
 */
(function () {
  'use strict';
  var KEL = ['Pendapatan', 'Pembelian barang & bahan', 'Biaya operasional', 'Di luar laba rugi'];
  var RESELLER = 'Reseller', TANPA = 'TANPA-NOTA|';
  function rapi(v, n) { return String(v === null || v === undefined ? '' : v).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n || 200); }
  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }
  function fmt(n) {
    n = Math.round(num(n) * 1000) / 1000;
    var b = String(Math.abs(n)).split('.');
    return (n < 0 ? '-' : '') + b[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (b[1] ? ',' + b[1] : '');
  }
  function geser(tgl, hari) { var p = tgl.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + hari)).toISOString().slice(0, 10); }
  function sekarang() {
    var d = new Date(Date.now() + 8 * 3600e3), z = function (x) { return ('0' + x).slice(-2); };
    return z(d.getUTCDate()) + '/' + z(d.getUTCMonth() + 1) + '/' + d.getUTCFullYear() + ' ' + z(d.getUTCHours()) + ':' + z(d.getUTCMinutes());
  }
  function rapiMetode(v) { var s = String(v || '').trim().toLowerCase(); return s === 'tunai' || s === 'cash' ? 'Tunai' : (s === 'qris' ? 'QRIS' : ''); }
  function offline(n) { return /offline/i.test(String(n || '')); }

  async function baca(sb) {
    var r = await sb.rpc('akunting_baca');
    if (r.error) throw new Error(r.error.message);
    var d = r.data;
    if (!d || !d.ok || !d.oto || !d.oto.ok) return null;
    return d;
  }
  // ACC_siap_ (bagian membaca pengaturan).
  function siap(d) {
    var akun = [], idxAkun = {}, kat = [], idxKat = {}, sumber = {};
    d.akun.forEach(function (r) {
      var n = rapi(r[0], 60);
      if (!n || idxAkun[n]) return;
      idxAkun[n] = { n: n, j: rapi(r[1], 30), awal: num(r[2]), per: r[3] || '' };
      akun.push(idxAkun[n]);
    });
    d.kat.forEach(function (r) {
      var j = /keluar/i.test(rapi(r[0], 20)) ? 'Keluar' : 'Masuk', n = rapi(r[1], 80);
      if (!n || idxKat[j + '|' + n]) return;
      var kel = rapi(r[2], 40);
      if (KEL.indexOf(kel) === -1) kel = j === 'Masuk' ? 'Pendapatan' : 'Biaya operasional';
      idxKat[j + '|' + n] = { j: j, n: n, kel: kel };
      kat.push(idxKat[j + '|' + n]);
    });
    d.sumber.forEach(function (r) {
      var n = rapi(r[0], 80);
      if (n) sumber[n] = { akun: rapi(r[1], 60), aktif: !/^tidak$/i.test(rapi(r[2], 10)) };
    });
    return { akun: akun, idxAkun: idxAkun, kat: kat, idxKat: idxKat, sumber: sumber, hariIni: d.hari };
  }
  // ACC_log_
  function logManual(d) {
    var out = [];
    d.log.forEach(function (r) {
      var no = rapi(r[0], 30), t = r[1] || '';
      if (!no || !t) return;
      out.push({
        no: no, t: t, j: rapi(r[2], 10), a: rapi(r[3], 60), a2: rapi(r[4], 60), k: rapi(r[5], 80), ket: rapi(r[6], 200), v: num(r[7]),
        w: r[8] || '', ms: num(r[9]), p: rapi(r[10], 60), batal: /^batal$/i.test(rapi(r[11], 10)),
        qs: num(r[12]) ? fmt(r[12]) + (rapi(r[13], 20) ? ' ' + rapi(r[13], 20) : '') + (num(r[14]) ? ' x Rp ' + fmt(r[14]) : '') : ''
      });
    });
    return out;
  }
  // MB_nota_ dan MB_baca_ (file 67).
  function notaOffline(d) {
    var out = [], idx = {};
    d.jual.forEach(function (r) {
      var toko = String(r[1] || '').trim(), t = r[0];
      if (!offline(toko) || !t) return;
      var no = String(r[4] || '').trim(), tanpa = !no;
      if (tanpa) no = TANPA + toko + '|' + t;
      if (!(no in idx)) {
        idx[no] = out.length;
        out.push({ no: no, toko: toko, t: t, total: 0, ongkir: 0, tanpa: tanpa, kasir: String(r[3] || '').replace(/^kasir:\s*/i, ''), pembeli: String(r[5] || '') });
      }
      var n = out[idx[no]];
      n.total += num(r[2]);
      var o = num(r[6]);
      if (o > n.ongkir) n.ongkir = o;
    });
    return out;
  }
  function metode(d) {
    var out = {};
    d.metode.forEach(function (r) { var no = String(r[0] || '').trim(); if (no) out[no] = { m: rapiMetode(r[1]), oleh: String(r[2] || '') }; });
    return out;
  }
  // ACC_otomatis_ (potret Apps Script) + penjualan Toko Offline per nota untuk bulan yang belum ditutup.
  function otomatis(d) {
    var o = d.oto, hasil = (o.oto || []).slice(), mb = o.mb || {};
    if (!mb.aktif) return hasil;
    var tutup = {}; (o.ditutup || []).forEach(function (b) { tutup[b] = 1; });
    var mt = metode(d), jum = {};
    notaOffline(d).forEach(function (n) {
      if (!(n.toko in mb.off) || tutup[n.t.slice(0, 7)]) return;
      var m = mt[n.no] && mt[n.no].m;
      if (!m) return;
      var a = m === 'QRIS' ? mb.qris : mb.off[n.toko];
      var tambah = function (k, kel, v) {
        if (!n.t || !v || !a) return;
        var kunci = n.t + '|' + a + '|' + k;
        if (!jum[kunci]) { jum[kunci] = { t: n.t, a: a, k: k, kel: kel, v: 0, s: n.toko }; hasil.push(jum[kunci]); }
        jum[kunci].v += v;
      };
      tambah('Penjualan ' + n.toko, 'Pendapatan', n.total);
      if (n.ongkir > 0) tambah('Ongkir dari pembeli (' + n.toko + ')', 'Di luar laba rugi', n.ongkir);
    });
    return hasil;
  }
  // ACC_gerak_
  function gerak(d, cfg, log) {
    var out = [];
    var sah = function (akun, t) { var a = cfg.idxAkun[akun]; return !a || !a.per || t >= a.per; };
    log.forEach(function (x) {
      if (x.batal || !x.v) return;
      if (x.j === 'Pindah') {
        if (sah(x.a, x.t)) out.push({ t: x.t, a: x.a, d: -x.v, arah: 'Pindah', k: '', kel: '', ref: x });
        if (sah(x.a2, x.t)) out.push({ t: x.t, a: x.a2, d: x.v, arah: 'Pindah', k: '', kel: '', ref: x });
        return;
      }
      if (!sah(x.a, x.t)) return;
      var arah = x.j === 'Keluar' ? 'Keluar' : 'Masuk', kk = cfg.idxKat[arah + '|' + x.k];
      out.push({ t: x.t, a: x.a, d: arah === 'Keluar' ? -x.v : x.v, arah: arah, k: x.k || '(tanpa kategori)', kel: kk ? kk.kel : (arah === 'Masuk' ? 'Pendapatan' : 'Biaya operasional'), ref: x });
    });
    otomatis(d).forEach(function (x) {
      if (!sah(x.a, x.t)) return;
      out.push({ t: x.t, a: x.a, d: x.v, arah: 'Masuk', k: x.k, kel: x.kel, auto: x });
    });
    return out;
  }
  function ringkas(x) {
    return { no: x.no, t: x.t, j: x.j, a: x.a, a2: x.a2, k: x.k, ket: x.ket, qs: x.qs, v: x.v, w: x.w, p: x.p.replace(/^staf:\s*/i, ''), batal: x.batal ? 1 : 0, staf: /^staf:/i.test(x.p) ? 1 : 0 };
  }

  async function akuntingData(sb) {
    var d = await baca(sb); if (!d) return null;
    var cfg = siap(d), log = logManual(d);
    var daftar = log.slice().sort(function (a, b) { return b.ms - a.ms; });
    var s = {};
    cfg.akun.forEach(function (a) { s[a.n] = a.awal; });
    gerak(d, cfg, log).forEach(function (g) { if (g.t <= cfg.hariIni && (g.a in s)) s[g.a] += g.d; });
    return {
      ok: true, admin: true, tanggal: cfg.hariIni,
      akun: cfg.akun.map(function (a) { return { n: a.n, j: a.j }; }),
      kat: cfg.kat.map(function (k) { return { j: k.j, n: k.n }; }),
      riwayat: daftar.slice(0, 300).map(ringkas),
      diperbarui: sekarang(),
      saldo: cfg.akun.map(function (a) { return { n: a.n, j: a.j, v: s[a.n], awal: a.awal, per: a.per }; }),
      sumber: Object.keys(cfg.sumber).map(function (n) {
        var x = cfg.sumber[n];
        return { n: n, a: x.akun, aktif: x.aktif ? 1 : 0, salah: (x.aktif && !cfg.idxAkun[x.akun]) ? 1 : 0 };
      })
    };
  }

  async function akuntingLaporan(sb, p) {
    var bulan = String((p && p.bulan) || '');
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(bulan)) return null;
    var d = await baca(sb); if (!d) return null;
    var cfg = siap(d), log = logManual(d), g0 = gerak(d, cfg, log);
    var dari = bulan + '-01', sampai = bulan + '-31';
    var akun = cfg.akun.map(function (a) { return { n: a.n, j: a.j, awal: a.awal, masuk: 0, keluar: 0, pindah: 0, akhir: 0, per: a.per }; });
    var ia = {}; akun.forEach(function (a) { ia[a.n] = a; });
    var katIdx = {}, kat = [], rinci = [], pindahSudah = {}, tanpaAkun = 0;
    g0.forEach(function (g) {
      var a = ia[g.a];
      if (g.t < dari) { if (a) a.awal += g.d; return; }
      if (g.t > sampai) return;
      if (a) {
        if (g.arah === 'Pindah') a.pindah += g.d;
        else if (g.arah === 'Masuk') a.masuk += g.d; else a.keluar += -g.d;
      } else if (g.arah !== 'Pindah') tanpaAkun += g.d;
      if (g.arah === 'Pindah') {
        if (!pindahSudah[g.ref.no]) {
          pindahSudah[g.ref.no] = true;
          rinci.push({ t: g.t, no: g.ref.no, j: 'Pindah', a: g.ref.a, a2: g.ref.a2, k: '', ket: g.ref.ket, v: g.ref.v, p: g.ref.p.replace(/^staf:\s*/i, '') });
        }
        return;
      }
      var kk = g.arah + '|' + g.k;
      if (!katIdx[kk]) { katIdx[kk] = { arah: g.arah, n: g.k, kel: g.kel, v: 0, auto: g.auto ? 1 : 0 }; kat.push(katIdx[kk]); }
      katIdx[kk].v += g.arah === 'Keluar' ? -g.d : g.d;
      if (g.auto) rinci.push({ t: g.t, no: 'otomatis', j: 'Masuk', a: g.a, a2: '', k: g.k, ket: 'Otomatis dari sistem', v: g.d, p: 'sistem' });
      else rinci.push({ t: g.t, no: g.ref.no, j: g.arah, a: g.a, a2: '', k: g.k, ket: g.ref.ket, qs: g.ref.qs, v: g.ref.v, p: g.ref.p.replace(/^staf:\s*/i, '') });
    });
    akun.forEach(function (a) { a.akhir = a.awal + a.masuk - a.keluar + a.pindah; });
    kat.sort(function (a, b) { return b.v - a.v; });
    rinci.sort(function (a, b) { return a.t < b.t ? -1 : (a.t > b.t ? 1 : 0); });
    var jumlah = function (arah, kel) { var s = 0; kat.forEach(function (k) { if ((!arah || k.arah === arah) && (!kel || k.kel === kel)) s += k.v; }); return s; };
    var pend = jumlah('Masuk', 'Pendapatan') - jumlah('Keluar', 'Pendapatan');
    var beli = jumlah('Keluar', KEL[1]) - jumlah('Masuk', KEL[1]);
    var biaya = jumlah('Keluar', KEL[2]) - jumlah('Masuk', KEL[2]);
    var peringatan = [];
    Object.keys(cfg.sumber).forEach(function (n) {
      if (cfg.sumber[n].aktif && !cfg.idxAkun[cfg.sumber[n].akun]) peringatan.push('Sumber "' + n + '" di sheet ACC_SUMBER menunjuk akun yang tidak ada ("' + cfg.sumber[n].akun + '"), jadi penjualannya tidak masuk ke saldo akun mana pun.');
    });
    // File 67: peringatan nota Toko Offline bulan ini yang belum punya metode bayar.
    var aktifMb = d.sumber.some(function (x) { return offline(x[0]) && !/^tidak$/i.test(rapi(x[2], 10)); });
    if (aktifMb) {
      var mt = metode(d), bn = 0, bv = 0;
      notaOffline(d).forEach(function (x) { if (x.t.slice(0, 7) !== bulan || (mt[x.no] && mt[x.no].m)) return; bn++; bv += x.total + x.ongkir; });
      if (bn) peringatan.push(bn + ' nota toko offline bulan ini (Rp ' + fmt(bv) + ') belum ditentukan metode bayarnya (Tunai/QRIS), jadi belum masuk saldo. Tentukan di Accounting > Saldo > Metode bayar nota toko offline.');
    }
    return {
      ok: true, bulan: bulan, akun: akun, kat: kat, rinci: rinci.slice(0, 3000), rinciLebih: Math.max(0, rinci.length - 3000),
      totalMasuk: jumlah('Masuk', ''), totalKeluar: jumlah('Keluar', ''),
      lr: { pend: pend, beli: beli, kotor: pend - beli, biaya: biaya, bersih: pend - beli - biaya },
      tanpaAkun: tanpaAkun, peringatan: peringatan, diperbarui: sekarang()
    };
  }

  // mbDaftar (file 67): daftar nota Toko Offline untuk menentukan metode bayar.
  async function mbDaftar(sb) {
    var d = await baca(sb); if (!d) return null;
    var cfg = siap(d), mt = metode(d), batas = geser(cfg.hariIni, -45), aktif = false, tunai = '';
    Object.keys(cfg.sumber).forEach(function (n) { if (offline(n)) { tunai = cfg.sumber[n].akun; if (cfg.sumber[n].aktif) aktif = true; } });
    var semua = notaOffline(d).map(function (n) {
      var x = mt[n.no] || {};
      return { no: n.no, t: n.t, total: n.total, ongkir: n.ongkir, tanpa: n.tanpa ? 1 : 0, kasir: n.kasir, pembeli: n.pembeli, m: x.m || '', oleh: x.oleh || '' };
    });
    semua.sort(function (a, b) { return a.t < b.t ? 1 : (a.t > b.t ? -1 : (a.no < b.no ? 1 : -1)); });
    return {
      ok: true, aktif: aktif ? 1 : 0, tunai: tunai, qris: (d.oto.mb && d.oto.mb.qris) || '',
      belum: semua.filter(function (n) { return !n.m; }).slice(0, 300),
      sudah: semua.filter(function (n) { return n.m && n.t >= batas; }).slice(0, 300)
    };
  }

  // tbBeranda (Apps Script file 68): saldo akun hari ini, uang keluar/masuk bulan berjalan, grafik harian, nota offline tanpa metode.
  async function berandaData(sb) {
    var d = await baca(sb); if (!d) return null;
    var cfg = siap(d), log = logManual(d), g0 = gerak(d, cfg, log);
    var hari = cfg.hariIni, bulan = hari.slice(0, 7), awal = bulan + '-01';
    var saldo = function (sampai) { var s = {}; cfg.akun.forEach(function (a) { s[a.n] = a.awal; }); g0.forEach(function (g) { if (g.t <= sampai && (g.a in s)) s[g.a] += g.d; }); return s; };
    var s0 = saldo(geser(awal, -1)), sNow = saldo(hari), ada = {}, total0 = 0;
    cfg.akun.forEach(function (a) { ada[a.n] = true; total0 += s0[a.n] || 0; });
    var perHari = {}, kat = {}, keluar = 0, masukJual = 0, masukLain = 0;
    g0.forEach(function (g) {
      if (!ada[g.a] || g.t < awal || g.t > hari) return;
      var h = perHari[g.t] || (perHari[g.t] = { d: 0, k: 0, m: 0 });
      h.d += g.d;
      if (g.arah === 'Keluar') { h.k += -g.d; keluar += -g.d; kat[g.k] = (kat[g.k] || 0) + (-g.d); }
      else if (g.arah === 'Masuk') { if (g.kel === 'Pendapatan') masukJual += g.d; else { masukLain += g.d; h.m += g.d; } }
    });
    var harian = [], s = total0, t = awal, jaga = 0;
    while (t <= hari && jaga < 40) {
      var h = perHari[t] || { d: 0, k: 0, m: 0 };
      s += h.d;
      harian.push({ t: t, k: Math.round(h.k), m: Math.round(h.m), s: Math.round(s) });
      t = geser(t, 1); jaga++;
    }
    var kategori = Object.keys(kat).map(function (n) { return { n: n, v: Math.round(kat[n]) }; }).sort(function (a, b) { return b.v - a.v; });
    var jmlKeluar = 0;
    log.forEach(function (x) { if (!x.batal && x.j === 'Keluar' && x.t >= awal && x.t <= hari) jmlKeluar++; });
    var nota = null;
    var off = Object.keys(cfg.sumber).filter(function (n) { return offline(n) && cfg.sumber[n].aktif; });
    if (off.length) {
      var mt = metode(d); nota = { n: 0, v: 0 };
      notaOffline(d).forEach(function (x) { if (mt[x.no] && mt[x.no].m) return; nota.n++; nota.v += x.total + x.ongkir; });
    }
    var w = new Date(Date.now() + 8 * 3600e3), z = function (x) { return ('0' + x).slice(-2); };
    return {
      ok: true, hari: hari, bulan: bulan,
      akun: cfg.akun.map(function (a) { return { n: a.n, j: a.j, v: Math.round(sNow[a.n] || 0) }; }),
      total0: Math.round(total0), keluar: Math.round(keluar), masukJual: Math.round(masukJual), masukLain: Math.round(masukLain),
      jmlKeluar: jmlKeluar, harian: harian, kategori: kategori, nota: nota,
      diperbarui: z(w.getUTCHours()) + '.' + z(w.getUTCMinutes())
    };
  }

  window.Akunting = { akuntingData: akuntingData, akuntingLaporan: akuntingLaporan, mbDaftar: mbDaftar, berandaData: berandaData };
})();
