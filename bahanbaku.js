/*
 * Moscow Supplies - data form staf bahan baku dari Supabase (bahanBakuData, bahanBakuLaporan, pantauProduksi).
 * Rumusnya salinan apa adanya dari Apps Script (file 4 form bahan baku, file 7 penyesuaian, file 30 pantau produksi).
 * Sheet lama diganti "lembar" dari Supabase (lembar.js) lewat pengganti kecil SpreadsheetApp / Utilities di bawah.
 */
(function () {
  'use strict';
  // Nama sheet lama -> tabel Supabase.
  var PETA = {
    BAHAN_BAKU: 'bahan_baku', BAHAN_BAKU_BELI: 'bahan_baku_beli', BAHAN_BAKU_LOG: 'bahan_baku_log', BAHAN_BAKU_STAF: 'bahan_baku_staf',
    BAHAN_JADI: 'bahan_jadi', BAHAN_JADI_LOG: 'bahan_jadi_log', BAHAN_RESEP: 'bahan_resep', BAHAN_WARNA: 'bahan_warna',
    BAHAN_WARNA_LOG: 'bahan_warna_log', PRODUKSI_SESUAI_LOG: 'produksi_sesuai_log', KATALOG: 'katalog', PRODUKSI_LOG: 'produksi_log'
  };
  var TABEL = Object.keys(PETA).map(function (k) { return PETA[k]; });
  var TABEL_BAHAN = ['bahan_baku', 'bahan_baku_beli', 'bahan_baku_log', 'bahan_baku_staf', 'bahan_jadi', 'bahan_jadi_log', 'bahan_resep',
    'bahan_warna', 'bahan_warna_log', 'produksi_sesuai_log'];

  function buat(L) {
    var fmtL = window.Lembar.format;
    // Pengganti Spreadsheet: getSheetByName / getLastRow / getMaxColumns / getRange(...).getValues() dari lembar.
    var ss = {
      getSpreadsheetTimeZone: function () { return 'Asia/Makassar'; },
      getSheetByName: function (nama) {
        var t = PETA[nama], isi = t && L[t];
        if (!isi) return null;
        return {
          getLastRow: function () { return isi.baris.length + 1; },
          getMaxColumns: function () { return isi.lebar; },
          getLastColumn: function () { return isi.lebar; },
          getRange: function (r, c, nr, nc) {
            return {
              getValues: function () {
                return window.Lembar.baca(L, t, c - 1 + nc).slice(r - 2, r - 2 + nr).map(function (x) { return x.slice(c - 1); });
              }
            };
          }
        };
      }
    };
    var SpreadsheetApp = { getActiveSpreadsheet: function () { return ss; } };
    var Utilities = { formatDate: function (d, tz, pola) { return fmtL(d, pola); } };
    var CONFIG = { CATALOG_SHEET: 'KATALOG', TARGET_SHEETS: { PRODUKSI: 'PRODUKSI_LOG' } };
    var BBK_SH_BAHAN_ = 'BAHAN_BAKU', BBK_SH_BELI_ = 'BAHAN_BAKU_BELI', BBK_SH_LOG_ = 'BAHAN_BAKU_LOG', BBK_SH_JADI_ = 'BAHAN_JADI',
      BBK_SH_JADI_LOG_ = 'BAHAN_JADI_LOG', BBK_SH_RESEP_ = 'BAHAN_RESEP', BBK_SH_WARNA_ = 'BAHAN_WARNA', BBK_SH_WARNA_LOG_ = 'BAHAN_WARNA_LOG',
      BBK_SH_STAF_ = 'BAHAN_BAKU_STAF', PSS_SHEET_ = 'PRODUKSI_SESUAI_LOG';
    // Akses diatur Supabase (peran); di halaman tidak menulis apa pun.
    function BBK_boleh_() { return true; }
    function BBK_siapkan_() { }

    // ---------------- salinan Apps Script ----------------
    function rapiWarna_(v) { return String(v === null || v === undefined ? '' : v).replace(/\s+/g, ' ').trim().toUpperCase(); }
    function PSS_baca_(ss) {
      const sh = ss.getSheetByName(PSS_SHEET_);
      const out = [];
      if (!sh || sh.getLastRow() < 2) return out;
      sh.getRange(2, 1, sh.getLastRow() - 1, Math.min(14, sh.getMaxColumns())).getValues().forEach(function (r, i) {
        const no = String(r[0] || '').trim();
        if (!no) return;
        const sel = Number(r[8]);
        out.push({
          baris: i + 2, no: no, wa: r[1] instanceof Date ? r[1] : null,
          bg: String(r[2] || '').trim(), k: String(r[3] || '').trim().toUpperCase(), n: String(r[4] || '').replace(/\s+/g, ' ').trim(),
          w: rapiWarna_(r[5]), sis: Number(r[6]) || 0, hit: Number(r[7]) || 0, sel: isFinite(sel) ? sel : 0,
          al: String(r[9] || ''), pg: String(r[10] || ''), st: String(r[11] || '').trim(),
          wk: r[12] instanceof Date ? r[12] : null, cat: String(r[13] || '')
        });
      });
      return out;
    }
    function bacaKategori_() {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.CATALOG_SHEET);
      const hasil = {};
      if (!sheet || sheet.getLastRow() < 2 || sheet.getLastColumn() < 4) return hasil;
      sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues().forEach(function (r) {
        const kode = String(r[0]).trim().toUpperCase();
        if (kode) hasil[kode] = String(r[3]).trim() || 'Lainnya';
      });
      return hasil;
    }

    function BBK_rapi_(v, maks) {
      return String(v === null || v === undefined ? '' : v).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maks || 200);
    }
    function BBK_jam_(d, tz) { return d instanceof Date ? Utilities.formatDate(d, tz, 'dd/MM/yyyy HH:mm') : ''; }
    function BBK_tgl_(d, tz) { return d instanceof Date ? Utilities.formatDate(d, tz, 'yyyy-MM-dd') : ''; }
    function BBK_bulat3_(n) { return Math.round(n * 1000) / 1000; }
    function BBK_angka_(v) {
      if (typeof v === 'number') return isFinite(v) ? v : null;
      const s = String(v === null || v === undefined ? '' : v).replace(/\s/g, '').replace(',', '.');
      if (s === '' || !isFinite(Number(s))) return null;
      return Number(s);
    }
    function BBK_banding_(a, b) { return String(a).localeCompare(String(b), 'id', { sensitivity: 'base', numeric: true }); }
    function BBK_bulanSah_(b) { return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(b || '')); }
    function BBK_staf_(ss) {
      const sh = ss.getSheetByName(BBK_SH_STAF_);
      const out = [], ada = {};
      if (!sh || sh.getLastRow() < 2) return out;
      sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().forEach(function (r) {
        const n = BBK_rapi_(r[0], 40);
        if (n.length < 2 || ada[n.toLowerCase()] || out.length >= 100) return;
        ada[n.toLowerCase()] = true;
        out.push(n);
      });
      return out;
    }
    function BBK_bahan_(ss) {
      const sh = ss.getSheetByName(BBK_SH_BAHAN_);
      const out = [], ada = {};
      if (!sh || sh.getLastRow() < 2) return out;
      const lebar = Math.min(7, sh.getMaxColumns());
      sh.getRange(2, 1, sh.getLastRow() - 1, lebar).getValues().forEach(function (r, i) {
        const k = BBK_rapi_(r[0], 30).toUpperCase(), n = BBK_rapi_(r[1], 80);
        if (!k || !n || ada[k]) return;
        ada[k] = true;
        const awal = lebar >= 4 ? Number(r[3]) : 0;
        const min = (lebar >= 5 && r[4] !== '' && isFinite(Number(r[4]))) ? Number(r[4]) : null;
        const bj = lebar >= 6 ? BBK_angka_(r[5]) : null;
        out.push({ baris: i + 2, k: k, n: n, s: lebar >= 3 ? BBK_rapi_(r[2], 15) : '', awal: isFinite(awal) ? awal : 0, min: min, bj: (bj !== null && bj > 0) ? bj : 1, bjIsi: bj !== null && bj > 0, kel: (lebar >= 7 ? BBK_rapi_(r[6], 40) : '') || 'Lainnya' });
      });
      const posKel = {};
      out.forEach(function (b, i) { if (!(b.kel in posKel)) posKel[b.kel] = b.kel === 'Lainnya' ? 100000 : i; });
      out.sort(function (a, b) { return (posKel[a.kel] - posKel[b.kel]) || BBK_banding_(a.n, b.n); });
      return out;
    }
    function BBK_beli_(ss, tz) {
      const sh = ss.getSheetByName(BBK_SH_BELI_);
      const out = [];
      if (!sh || sh.getLastRow() < 2) return out;
      sh.getRange(2, 1, sh.getLastRow() - 1, Math.min(17, sh.getMaxColumns())).getValues().forEach(function (r, i) {
        const no = BBK_rapi_(r[0], 30), k = BBK_rapi_(r[2], 30).toUpperCase(), q = Number(r[4]);
        if (!no || !k || !(r[1] instanceof Date) || !isFinite(q)) return;
        const sampai = /sampai/i.test(String(r[11] || '')) && r[12] instanceof Date;
        const qt = Number(r[13]), h = Number(r[7]);
        out.push({
          baris: i + 2, no: no, t: BBK_tgl_(r[1], tz), k: k, n: BBK_rapi_(r[3], 80), q: q, s: BBK_rapi_(r[5], 15),
          sup: BBK_rapi_(r[6], 60), h: (r[7] !== '' && isFinite(h) && h > 0) ? h : 0, c: BBK_rapi_(r[8], 200), pg: BBK_rapi_(r[9], 40),
          st: sampai ? 'Sampai' : 'Dipesan', ts: sampai ? BBK_tgl_(r[12], tz) : '', qt: (sampai && isFinite(qt)) ? qt : 0,
          pt: BBK_rapi_(r[15], 40), ct: BBK_rapi_(r[16], 200)
        });
      });
      BBK_isiHarga_(out);
      return out;
    }
    function BBK_jenisLog_(v) { const s = String(v || ''); return /dibuat/i.test(s) ? 'Dibuat' : (/pakai/i.test(s) ? 'Terpakai' : (/rusak|buang/i.test(s) ? 'Rusak' : '')); }
    function BBK_log_(ss, tz) {
      const sh = ss.getSheetByName(BBK_SH_LOG_);
      const out = [];
      if (!sh || sh.getLastRow() < 2) return out;
      sh.getRange(2, 1, sh.getLastRow() - 1, Math.min(10, sh.getMaxColumns())).getValues().forEach(function (r) {
        if (!(r[0] instanceof Date)) return;
        const j = BBK_jenisLog_(r[1]), k = BBK_rapi_(r[2], 30).toUpperCase(), q = Number(r[4]);
        if (!j || !k || !isFinite(q) || !q) return;
        out.push({
          t: BBK_tgl_(r[0], tz), ms: r[6] instanceof Date ? r[6].getTime() : 0, j: j, k: k, n: BBK_rapi_(r[3], 80), q: q,
          s: BBK_rapi_(r[5], 15), p: BBK_rapi_(r[7], 40), c: BBK_rapi_(r[8], 200), u: BBK_rapi_(r[9], 80)
        });
      });
      return out;
    }
    function BBK_jadi_(ss) {
      const sh = ss.getSheetByName(BBK_SH_JADI_);
      const out = [], ada = {};
      if (!sh || sh.getLastRow() < 2) return out;
      const lebar = Math.min(5, sh.getMaxColumns());
      sh.getRange(2, 1, sh.getLastRow() - 1, lebar).getValues().forEach(function (r, i) {
        const k = BBK_rapi_(r[0], 30).toUpperCase(), n = BBK_rapi_(r[2], 80);
        if (!k || !n || ada[k]) return;
        ada[k] = true;
        const b = lebar >= 5 ? BBK_angka_(r[4]) : null;
        out.push({ baris: i + 2, k: k, kel: BBK_rapi_(r[1], 60) || n, n: n, s: lebar >= 4 ? BBK_rapi_(r[3], 15) : '', b: (b !== null && b > 0) ? b : null });
      });
      out.sort(function (a, b) { return BBK_banding_(a.kel, b.kel) || BBK_banding_(a.n, b.n); });
      return out;
    }
    function BBK_resep_(ss, bahan, jadi) {
      const out = {};
      const sh = ss.getSheetByName(BBK_SH_RESEP_);
      if (!sh || sh.getLastRow() < 2) return out;
      const pb = {}, pj = {};
      bahan.forEach(function (b) { pb[b.k] = b; pb['n:' + b.n.toLowerCase()] = b; });
      jadi.forEach(function (j) { pj[j.k] = j; pj['n:' + j.n.toLowerCase()] = j; });
      sh.getRange(2, 1, sh.getLastRow() - 1, Math.min(6, sh.getMaxColumns())).getValues().forEach(function (r) {
        const kj = BBK_rapi_(r[0], 30).toUpperCase(), nj = BBK_rapi_(r[1], 80).toLowerCase();
        const kb = BBK_rapi_(r[2], 30).toUpperCase(), nb = BBK_rapi_(r[3], 80).toLowerCase();
        const j = (kj && pj[kj]) || (nj && pj['n:' + nj]);
        const b = (kb && pb[kb]) || (nb && pb['n:' + nb]);
        const q = BBK_angka_(r[4]);
        if (!j || !b || q === null || q <= 0) return;
        if (!out[j.k]) out[j.k] = [];
        out[j.k].push({ k: b.k, n: b.n, s: b.s, bj: b.bj, q: q, st: BBK_rapi_(r[5], 15).toLowerCase() || b.s });
      });
      return out;
    }
    function BBK_jadiLog_(ss, tz) {
      const sh = ss.getSheetByName(BBK_SH_JADI_LOG_);
      const out = [];
      if (!sh || sh.getLastRow() < 2) return out;
      sh.getRange(2, 1, sh.getLastRow() - 1, Math.min(10, sh.getMaxColumns())).getValues().forEach(function (r) {
        if (!(r[0] instanceof Date)) return;
        const k = BBK_rapi_(r[1], 30).toUpperCase(), q = Number(r[4]);
        if (!k || !isFinite(q) || !q) return;
        const kali = r.length > 9 ? BBK_angka_(r[9]) : null;
        out.push({
          t: BBK_tgl_(r[0], tz), ms: r[6] instanceof Date ? r[6].getTime() : 0, k: k, kel: BBK_rapi_(r[2], 60), n: BBK_rapi_(r[3], 80),
          q: q, s: BBK_rapi_(r[5], 15), p: BBK_rapi_(r[7], 40), c: BBK_rapi_(r[8], 200), kali: (kali !== null && kali > 0) ? kali : 0
        });
      });
      return out;
    }
    function BBK_sesuai_(ss, tz) {
      const out = [];
      if (typeof PSS_baca_ !== 'function') return out;
      PSS_baca_(ss).forEach(function (x) {
        if (x.bg !== 'Bahan Baku' || x.st !== 'Disetujui' || !x.wk || !x.sel || !x.k) return;
        out.push({ k: x.k, sel: x.sel, b: Utilities.formatDate(x.wk, tz, 'yyyy-MM') });
      });
      return out;
    }
    function BBK_stok_(ss, tz, bulan, beli, log) {
      const jml = {};
      const isi = function (k, b, i, q) {
        if (b > bulan) return;
        if (!jml[k]) jml[k] = [0, 0, 0, 0, 0, 0, 0, 0];
        jml[k][i + (b < bulan ? 0 : 1)] += q;
      };
      beli.forEach(function (x) { if (x.st === 'Sampai' && x.qt) isi(x.k, x.ts.slice(0, 7), 0, x.qt); });
      log.forEach(function (x) { isi(x.k, x.t.slice(0, 7), x.j === 'Rusak' ? 4 : (x.j === 'Dibuat' ? 0 : 2), x.q); });
      BBK_sesuai_(ss, tz).forEach(function (x) { isi(x.k, x.b, 6, x.sel); });
      return BBK_bahan_(ss).map(function (b) {
        const x = jml[b.k] || [0, 0, 0, 0, 0, 0, 0, 0];
        const aw = BBK_bulat3_(b.awal + x[0] - x[2] - x[4] + x[6]);
        return { k: b.k, n: b.n, s: b.s, kel: b.kel, bj: b.bj, bjIsi: b.bjIsi, aw: aw, ms: BBK_bulat3_(x[1]), pk: BBK_bulat3_(x[3]), rs: BBK_bulat3_(x[5]), sy: BBK_bulat3_(x[7]), ss: BBK_bulat3_(aw + x[1] - x[3] - x[5] + x[7]), min: b.min };
      });
    }
    function BBK_ringkasBeli_(x) {
      return { no: x.no, t: x.t, k: x.k, n: x.n, q: x.q, s: x.s, sup: x.sup, h: x.h, c: x.c, pg: x.pg, st: x.st, ts: x.ts, qt: x.qt, pt: x.pt, ct: x.ct,
        hs: x.hs, hp: x.hp, tp: x.tp, pc: x.pc };
    }
    function BBK_isiHarga_(beli) {
      const per = {};
      beli.forEach(function (x) {
        x.hs = (x.h > 0 && x.q > 0) ? Math.round(x.h / x.q * 100) / 100 : 0;
        x.hp = 0; x.tp = ''; x.pc = null;
        if (x.hs) (per[x.k] = per[x.k] || []).push(x);
      });
      Object.keys(per).forEach(function (k) {
        const a = per[k].sort(function (p, q) { return p.t < q.t ? -1 : p.t > q.t ? 1 : p.baris - q.baris; });
        for (let i = 1; i < a.length; i++) {
          a[i].hp = a[i - 1].hs; a[i].tp = a[i - 1].t;
          a[i].pc = Math.round((a[i].hs - a[i - 1].hs) / a[i - 1].hs * 1000) / 10;
        }
      });
    }
    function BBK_daftarHarga_(ss, beli) {
      const akhir = {};
      beli.forEach(function (x) {
        if (!x.hs) return;
        const a = akhir[x.k];
        if (!a || x.t > a.t || (x.t === a.t && x.baris > a.baris)) akhir[x.k] = x;
      });
      return BBK_bahan_(ss).filter(function (b) { return akhir[b.k]; }).map(function (b) {
        const x = akhir[b.k];
        return { k: b.k, n: b.n, s: b.s, kel: b.kel, hs: x.hs, t: x.t, sup: x.sup, hp: x.hp, tp: x.tp, pc: x.pc };
      });
    }
    function BBK_mlPer_(s) { const t = String(s || '').toLowerCase(); return (t === 'gram' || t === 'g' || t === 'ml') ? 1 : 1000; }
    function BBK_warna_(ss, bahan, jadi) {
      const out = [], idx = {}, salah = [], urutKel = {};
      const sh = ss.getSheetByName(BBK_SH_WARNA_);
      if (!sh || sh.getLastRow() < 2) return { warna: out, salah: salah };
      const pb = {}, pj = {};
      bahan.forEach(function (b) { pb[b.k.toLowerCase()] = b; pb[b.n.toLowerCase()] = b; });
      jadi.forEach(function (j) { pj[j.k.toLowerCase()] = j; pj[j.n.toLowerCase()] = j; });
      sh.getRange(2, 1, sh.getLastRow() - 1, Math.min(5, sh.getMaxColumns())).getValues().forEach(function (r, i) {
        const w = BBK_rapi_(r[0], 60), nb = BBK_rapi_(r[1], 80), ml = BBK_angka_(r[2]), kel = BBK_rapi_(r[4], 40) || 'Leather';
        if (!w || (!nb && (r[2] === '' || r[2] === null))) return;
        if (!nb || ml === null || ml <= 0) { salah.push('Baris ' + (i + 2) + ': ' + w + ' / ' + (nb || '?')); return; }
        const id = kel.toLowerCase() + '|' + w.toLowerCase();
        if (!(kel.toLowerCase() in urutKel)) urutKel[kel.toLowerCase()] = Object.keys(urutKel).length;
        if (!(id in idx)) {
          idx[id] = out.length;
          const pigmen = /pigment|pigmen/i.test(kel), t = pigmen ? pb[w.toLowerCase()] : null;
          if (pigmen && !t) salah.push('Baris ' + (i + 2) + ': pigment campuran "' + w + '" belum ada di daftar bahan baku');
          out.push({ id: id, n: w, kel: kel, dasar: [], pig: [], tot: 0, target: t ? { k: t.k, n: t.n, s: t.s, bj: t.bj } : null, rusak: pigmen && !t });
        }
        const o = out[idx[id]], j = pj[nb.toLowerCase()], b = pb[nb.toLowerCase()];
        if (j) o.dasar.push({ k: j.k, n: j.n, s: j.s, ml: ml });
        else if (b) o.pig.push({ k: b.k, n: b.n, s: b.s, bj: b.bj, ml: ml });
        else { salah.push('Baris ' + (i + 2) + ': "' + nb + '" tidak ada di daftar bahan baku / bahan jadi'); return; }
        o.tot += ml;
      });
      const ok = out.filter(function (w) { return w.tot > 0 && !w.rusak; });
      ok.sort(function (a, b) { return (urutKel[a.kel.toLowerCase()] - urutKel[b.kel.toLowerCase()]) || BBK_banding_(a.n, b.n); });
      return { warna: ok, salah: salah };
    }
    function BBK_warnaLog_(ss, tz) {
      const sh = ss.getSheetByName(BBK_SH_WARNA_LOG_);
      const out = [];
      if (!sh || sh.getLastRow() < 2) return out;
      sh.getRange(2, 1, sh.getLastRow() - 1, Math.min(9, sh.getMaxColumns())).getValues().forEach(function (r) {
        if (!(r[0] instanceof Date)) return;
        const n = BBK_rapi_(r[1], 60), ml = Number(r[2]) || 0, dml = Number(r[4]) || 0;
        if (!n) return;
        out.push({ t: BBK_tgl_(r[0], tz), ms: r[5] instanceof Date ? r[5].getTime() : 0, n: n, ml: ml, d: BBK_rapi_(r[3], 80), dml: dml, p: BBK_rapi_(r[6], 40), c: BBK_rapi_(r[7], 200), kel: BBK_rapi_(r[8], 40) || 'Leather' });
      });
      return out;
    }
    function BBK_stokDasar_(warna, jadiList, prod, wlog, bulan) {
      const dasar = {}, out = [];
      warna.forEach(function (w) { w.dasar.forEach(function (d) { dasar[d.n.toLowerCase()] = true; }); });
      jadiList.forEach(function (j) {
        if (!dasar[j.n.toLowerCase()]) return;
        let pr = 0, pk = 0, prB = 0, pkB = 0;
        prod.forEach(function (x) { if (x.k === j.k) { const v = x.q * BBK_mlPer_(x.s || j.s); pr += v; if (x.t.slice(0, 7) === bulan) prB += v; } });
        wlog.forEach(function (x) { if (x.d.toLowerCase() === j.n.toLowerCase()) { pk += x.dml; if (x.t.slice(0, 7) === bulan) pkB += x.dml; } });
        out.push({ n: j.n, kel: j.kel, pr: Math.round(pr), pk: Math.round(pk), prB: Math.round(prB), pkB: Math.round(pkB), sisa: Math.round(pr - pk) });
      });
      return out;
    }
    function BBK_urutBaru_(a) { a.sort(function (x, y) { return x.t < y.t ? 1 : x.t > y.t ? -1 : y.ms - x.ms; }); return a; }

    function bahanBakuData(p) {
      try {
        if (!BBK_boleh_(p)) return { ok: false, pesan: 'Akses ditolak.' };
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        BBK_siapkan_(ss);
        const tz = ss.getSpreadsheetTimeZone();
        const bulan = Utilities.formatDate(new Date(), tz, 'yyyy-MM');
        const beli = BBK_beli_(ss, tz), log = BBK_log_(ss, tz), prod = BBK_jadiLog_(ss, tz);
        const bahanList = BBK_bahan_(ss), jadiList = BBK_jadi_(ss), resep = BBK_resep_(ss, bahanList, jadiList);
        const wr = BBK_warna_(ss, bahanList, jadiList), wlog = BBK_warnaLog_(ss, tz);
        const tunggu = beli.filter(function (x) { return x.st === 'Dipesan'; });
        const bulanIni = beli.filter(function (x) { return x.t.slice(0, 7) === bulan && x.st === 'Sampai'; });
        tunggu.sort(function (a, b) { return a.t < b.t ? -1 : a.t > b.t ? 1 : a.baris - b.baris; });
        bulanIni.sort(function (a, b) { return a.t < b.t ? 1 : a.t > b.t ? -1 : b.baris - a.baris; });
        let sesuai = [];
        if (typeof PSS_baca_ === 'function') {
          sesuai = PSS_baca_(ss).filter(function (x) { return x.bg === 'Bahan Baku'; });
          sesuai.sort(function (x, y) { return y.baris - x.baris; });
          sesuai = sesuai.slice(0, 40).map(function (x) {
            return { no: x.no, t: BBK_jam_(x.wa, tz), k: x.k, n: x.n, w: '', sis: x.sis, hit: x.hit, sel: x.sel, al: x.al.slice(0, 200), pg: x.pg.slice(0, 40), st: x.st, tk: BBK_jam_(x.wk, tz), cat: x.cat.slice(0, 200) };
          });
        }
        return {
          ok: true,
          barang: BBK_stok_(ss, tz, bulan, beli, log),
          jadi: jadiList.map(function (j) {
            return { k: j.k, kel: j.kel, n: j.n, s: j.s, b: j.b, r: (resep[j.k] || []).map(function (x) { return { n: x.n, q: x.q, st: x.st }; }) };
          }),
          staf: BBK_staf_(ss),
          tunggu: tunggu.map(BBK_ringkasBeli_), beliBulan: bulanIni.slice(0, 100).map(BBK_ringkasBeli_),
          harga: BBK_daftarHarga_(ss, beli),
          warna: wr.warna.map(function (w) {
            return { id: w.id, n: w.n, kel: w.kel, tot: w.tot, target: w.target ? { k: w.target.k, n: w.target.n, s: w.target.s } : null, dasar: w.dasar.map(function (d) { return { n: d.n, ml: d.ml }; }), pig: w.pig.map(function (x) { return { k: x.k, n: x.n, s: x.s, ml: x.ml }; }) };
          }),
          warnaSalah: wr.salah.slice(0, 20),
          warnaLog: BBK_urutBaru_(wlog.filter(function (x) { return x.ml > 0; })).slice(0, 60).map(function (x) { return { t: x.t, n: x.n, kel: x.kel, ml: x.ml, p: x.p, c: x.c }; }),
          dasar: BBK_stokDasar_(wr.warna, jadiList, prod, wlog, bulan),
          prod: BBK_urutBaru_(prod).slice(0, 60).map(function (x) { return { t: x.t, n: x.n, q: x.q, s: x.s, p: x.p, c: x.c, kali: x.kali }; }),
          pakai: BBK_urutBaru_(log).slice(0, 60).map(function (x) { return { t: x.t, j: x.j, n: x.n, q: x.q, s: x.s, p: x.p, c: x.c, u: x.u }; }),
          sesuai: sesuai,
          bulan: Utilities.formatDate(new Date(), tz, 'MM/yyyy'), diperbarui: BBK_jam_(new Date(), tz)
        };
      } catch (err) {
        return { ok: false, pesan: 'Terjadi kesalahan: ' + err.message };
      }
    }

    function bahanBakuLaporan(p) {
      try {
        if (!BBK_boleh_(p)) return { ok: false, pesan: 'Akses ditolak.' };
        const bulan = String(p.bulan || '');
        if (!BBK_bulanSah_(bulan)) return { ok: false, pesan: 'Pilih bulan laporannya.' };
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const tz = ss.getSpreadsheetTimeZone();
        const beli = BBK_beli_(ss, tz), log = BBK_log_(ss, tz);
        const prod = BBK_jadiLog_(ss, tz).filter(function (x) { return x.t.slice(0, 7) === bulan; });
        const per = {}, urut = [], hari = {}, varian = {};
        BBK_jadi_(ss).forEach(function (j) { per[j.k] = { k: j.k, kel: j.kel, n: j.n, s: j.s, sat: {}, us: [] }; urut.push(j.k); });
        prod.forEach(function (x) {
          if (!per[x.k]) { per[x.k] = { k: x.k, kel: x.kel || x.n, n: x.n, s: x.s, sat: {}, us: [] }; urut.push(x.k); }
          const o = per[x.k], s = x.s || o.s;
          if (!o.sat[s]) { o.sat[s] = { q: 0, kali: 0, hari: {} }; o.us.push(s); }
          o.sat[s].q += x.q; o.sat[s].kali += x.kali; o.sat[s].hari[x.t] = true;
          varian[x.k] = true;
          if (!hari[x.t]) hari[x.t] = {};
          if (!hari[x.t][x.k + '|' + s]) hari[x.t][x.k + '|' + s] = { n: o.n, s: s, q: 0, kali: 0 };
          hari[x.t][x.k + '|' + s].q += x.q;
          hari[x.t][x.k + '|' + s].kali += x.kali;
        });
        const produksi = [];
        let totalKali = 0;
        urut.forEach(function (k) {
          const o = per[k];
          if (!o.us.length) { produksi.push({ k: o.k, kel: o.kel, n: o.n, s: o.s, q: 0, kali: 0, hari: 0 }); return; }
          o.us.forEach(function (s) {
            totalKali += o.sat[s].kali;
            produksi.push({ k: o.k, kel: o.kel, n: o.n, s: s, q: BBK_bulat3_(o.sat[s].q), kali: BBK_bulat3_(o.sat[s].kali), hari: Object.keys(o.sat[s].hari).length });
          });
        });
        const beliBulan = beli.filter(function (x) { return x.t.slice(0, 7) === bulan; });
        beliBulan.sort(function (a, b) { return a.t < b.t ? -1 : a.t > b.t ? 1 : a.baris - b.baris; });
        let totalHarga = 0;
        beliBulan.forEach(function (x) { totalHarga += x.h; });
        return {
          ok: true, bulan: bulan,
          produksi: produksi, varian: Object.keys(varian).length, jumlahVarian: urut.length, totalKali: BBK_bulat3_(totalKali),
          harian: Object.keys(hari).sort().map(function (t) {
            return { t: t, items: Object.keys(hari[t]).map(function (k) { const o = hari[t][k]; return { n: o.n, s: o.s, q: BBK_bulat3_(o.q), kali: BBK_bulat3_(o.kali) }; }) };
          }),
          hariProduksi: Object.keys(hari).length,
          beli: beliBulan.map(BBK_ringkasBeli_), totalHarga: totalHarga,
          ubahHarga: beliBulan.filter(function (x) { return x.pc !== null && x.pc !== 0; })
            .sort(function (a, b) { return b.pc - a.pc; }).map(BBK_ringkasBeli_),
          stok: BBK_stok_(ss, tz, bulan, beli, log),
          warna: (function () {
            const per = {}, urut = [];
            BBK_warnaLog_(ss, tz).forEach(function (x) {
              if (x.t.slice(0, 7) !== bulan || !(x.ml > 0)) return;
              const k = x.kel.toLowerCase() + '|' + x.n.toLowerCase();
              if (!per[k]) { per[k] = { n: x.n, kel: x.kel, ml: 0, kali: 0 }; urut.push(k); }
              per[k].ml += x.ml; per[k].kali += 1;
            });
            return urut.map(function (k) { return per[k]; }).sort(function (a, b) { return BBK_banding_(a.kel, b.kel) || b.ml - a.ml; });
          })(),
          diperbarui: BBK_jam_(new Date(), tz)
        };
      } catch (err) {
        return { ok: false, pesan: 'Terjadi kesalahan: ' + err.message };
      }
    }

    // ---- Pantau produksi (file 30) ----
    const PP_BLN_ = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    function PP_dua_(n) { return (n < 10 ? '0' : '') + n; }
    function PP_akhir_(y, m) { return new Date(y, m, 0).getDate(); }
    function PP_lbl_(y, m, d1, d2) {
      const b = PP_BLN_[m - 1] + ' ' + y;
      return (d1 === 1 && d2 === PP_akhir_(y, m)) ? b : d1 + '–' + d2 + ' ' + b;
    }
    function PP_rentang_(bulan, tz) {
      const hari = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
      const hy = Number(hari.slice(0, 4)), hm = Number(hari.slice(5, 7)), hd = Number(hari.slice(8, 10));
      let y = hy, m = hm;
      const mm = String(bulan || '').match(/^(\d{4})-(\d{2})$/);
      if (mm) {
        y = Number(mm[1]); m = Number(mm[2]);
        if (m < 1 || m > 12 || y * 12 + m > hy * 12 + hm) { y = hy; m = hm; }
      }
      const kini = (y === hy && m === hm);
      const py = m === 1 ? y - 1 : y, pm = m === 1 ? 12 : m - 1;
      const dIni = kini ? hd : PP_akhir_(y, m);
      const dLalu = kini ? Math.min(hd, PP_akhir_(py, pm)) : PP_akhir_(py, pm);
      const s = function (yy, mo, d) { return yy + '-' + PP_dua_(mo) + '-' + PP_dua_(d); };
      return {
        bulan: y + '-' + PP_dua_(m), kini: kini,
        a1: s(y, m, 1), a2: s(y, m, dIni), b1: s(py, pm, 1), b2: s(py, pm, dLalu), c2: s(py, pm, PP_akhir_(py, pm)),
        lblIni: PP_lbl_(y, m, 1, dIni), lblLalu: PP_lbl_(py, pm, 1, dLalu), lblPenuh: PP_BLN_[pm - 1] + ' ' + py
      };
    }
    function PP_baris_(jenis, ss, tz) {
      const out = [];
      const tgl = function (v) { return v instanceof Date ? Utilities.formatDate(v, tz, 'yyyy-MM-dd') : ''; };
      if (jenis === 'produksi') {
        const kat = bacaKategori_();
        const sh = ss.getSheetByName(CONFIG.TARGET_SHEETS.PRODUKSI);
        if (sh && sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues().forEach(function (r) {
          const t = tgl(r[0]), k = String(r[1]).trim().toUpperCase(), q = Number(r[3]);
          if (!t || !k || !isFinite(q) || !q) return;
          out.push({ t: t, k: k, n: String(r[2] || k).trim(), kat: kat[k] || 'Lainnya', q: q });
        });
        return out;
      }
      const shJ = ss.getSheetByName(BBK_SH_JADI_LOG_);
      if (shJ && shJ.getLastRow() > 1) shJ.getRange(2, 1, shJ.getLastRow() - 1, 6).getValues().forEach(function (r) {
        const t = tgl(r[0]), s = String(r[5] || '').trim().toLowerCase();
        let q = Number(r[4]);
        if (!t || !isFinite(q) || !q) return;
        if (s === 'gram' || s === 'g') q = q / 1000;
        const k = String(r[1] || r[3]).trim().toUpperCase();
        out.push({ t: t, k: 'J:' + k, n: String(r[3] || k).trim(), kat: String(r[2] || '').trim() || 'Bahan jadi', q: q });
      });
      const shW = ss.getSheetByName(BBK_SH_WARNA_LOG_);
      if (shW && shW.getLastRow() > 1) shW.getRange(2, 1, shW.getLastRow() - 1, Math.min(9, shW.getMaxColumns())).getValues().forEach(function (r) {
        const t = tgl(r[0]), g = Number(r[2]);
        if (!t || !isFinite(g) || !g) return;
        const w = String(r[1] || '').trim(), kel = String(r[8] || '').trim();
        out.push({ t: t, k: 'W:' + w.toUpperCase(), n: 'Mixing ' + w, kat: kel ? 'Mixing ' + kel : 'Mixing warna', q: g / 1000 });
      });
      return out;
    }
    // jenis ditentukan dari form yang membuka (sama dengan kunci link di Apps Script).
    function pantauProduksi(p, jenis) {
      try {
        if (jenis !== 'bahan') jenis = 'produksi';
        const ss = SpreadsheetApp.getActiveSpreadsheet(), tz = ss.getSpreadsheetTimeZone();
        const R = PP_rentang_(p && p.bulan, tz);
        const kat = {}, item = {};
        let ini = 0, lalu = 0, penuh = 0;
        PP_baris_(jenis, ss, tz).forEach(function (x) {
          const di = x.t >= R.a1 && x.t <= R.a2, dl = x.t >= R.b1 && x.t <= R.b2, dp = x.t >= R.b1 && x.t <= R.c2;
          if (!di && !dp) return;
          const a = kat[x.kat] || (kat[x.kat] = { n: x.kat, ini: 0, lalu: 0 });
          const b = item[x.k] || (item[x.k] = { n: x.n, kat: x.kat, ini: 0, lalu: 0 });
          if (di) { a.ini += x.q; b.ini += x.q; ini += x.q; }
          if (dl) { a.lalu += x.q; b.lalu += x.q; lalu += x.q; }
          if (dp) penuh += x.q;
        });
        const r3 = function (n) { return Math.round(n * 1000) / 1000; };
        const urut = function (o) {
          return Object.keys(o).map(function (k) { const v = o[k]; v.ini = r3(v.ini); v.lalu = r3(v.lalu); return v; })
            .filter(function (v) { return v.ini || v.lalu; })
            .sort(function (a, b) { return b.ini - a.ini || b.lalu - a.lalu; });
        };
        return {
          ok: true, jenis: jenis, sat: jenis === 'bahan' ? 'kg' : 'pcs', bulan: R.bulan, kini: R.kini,
          lblIni: R.lblIni, lblLalu: R.lblLalu, lblPenuh: R.lblPenuh,
          ini: r3(ini), lalu: r3(lalu), penuh: r3(penuh), kat: urut(kat), item: urut(item)
        };
      } catch (e) {
        return { ok: false, pesan: 'Gagal memuat: ' + (e && e.message ? e.message : e) };
      }
    }

    return { bahanBakuData: bahanBakuData, bahanBakuLaporan: bahanBakuLaporan, pantauProduksi: pantauProduksi };
  }

  async function muat(sb, tabel) { return buat(await window.Lembar.muat(sb, tabel)); }
  window.BahanBaku = {
    bahanBakuData: async function (sb, p) { return (await muat(sb, TABEL_BAHAN)).bahanBakuData(p || {}); },
    bahanBakuLaporan: async function (sb, p) { return (await muat(sb, TABEL_BAHAN)).bahanBakuLaporan(p || {}); },
    pantauProduksi: async function (sb, p, jenis) {
      var t = jenis === 'bahan' ? ['bahan_jadi_log', 'bahan_warna_log'] : ['produksi_log', 'katalog'];
      return (await muat(sb, t)).pantauProduksi(p || {}, jenis);
    },
    buat: buat, TABEL: TABEL
  };
})();
