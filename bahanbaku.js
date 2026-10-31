/*
 * Moscow Supplies - data form staf bahan baku dari Supabase (bahanBakuData, bahanBakuLaporan, pantauProduksi).
 * Rumusnya salinan apa adanya dari Apps Script (file 4 form bahan baku, file 7 penyesuaian, file 30 pantau produksi,
 * file 34 robot rencana bahan; saran produksi diambil dari potret robot rencana produksi 'md:rpd').
 * Sheet lama diganti "lembar" dari Supabase (lembar.js) lewat pengganti kecil SpreadsheetApp / Utilities di bawah.
 */
(function () {
  'use strict';
  // Nama sheet lama -> tabel Supabase.
  var PETA = {
    BAHAN_BAKU: 'bahan_baku', BAHAN_BAKU_BELI: 'bahan_baku_beli', BAHAN_BAKU_LOG: 'bahan_baku_log', BAHAN_BAKU_STAF: 'bahan_baku_staf',
    BAHAN_JADI: 'bahan_jadi', BAHAN_JADI_LOG: 'bahan_jadi_log', BAHAN_RESEP: 'bahan_resep', BAHAN_WARNA: 'bahan_warna',
    BAHAN_WARNA_LOG: 'bahan_warna_log', PRODUKSI_SESUAI_LOG: 'produksi_sesuai_log', KATALOG: 'katalog', PRODUKSI_LOG: 'produksi_log',
    ROBOT_ISI_BARANG: 'robot_isi_barang'
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

    // ---- Robot rencana bahan (file 34). rp = hasil robot rencana produksi. ----
    function bacaKatalog_() {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.CATALOG_SHEET);
      const katalog = {};
      if (!sheet || sheet.getLastRow() < 2) return katalog;
      sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues().forEach(function (r) {
        const kode = String(r[0]).trim().toUpperCase();
        if (kode) katalog[kode] = String(r[1]).trim();
      });
      return katalog;
    }
    function BBK_konversi_(q, dari, ke, bj) {
      const T = { ml: ['v', 0.001], l: ['v', 1], ltr: ['v', 1], liter: ['v', 1], g: ['m', 0.001], gr: ['m', 0.001], gram: ['m', 0.001], kg: ['m', 1] };
      const d = String(dari || '').toLowerCase().trim(), k = String(ke || '').toLowerCase().trim();
      if (d === k) return q;
      if (!T[d] || !T[k]) return null;
      if (T[d][0] === T[k][0]) return q * T[d][1] / T[k][1];
      if (!(bj > 0)) return null;
      const dasar = q * T[d][1];
      return (T[d][0] === 'v' ? dasar * bj : dasar / bj) / T[k][1];
    }
    const RBB_SH_ISI_ = 'ROBOT_ISI_BARANG';
    const RBB_KET_TEBAK_ = 'Tebakan dari nama barang (1 ml dianggap 1 gram). Ubah kalau berat isi sebenarnya berbeda.';
    const RBB_ECER_ = [
      { kat: 'kenka bond', bahan: 'Kenka Bond', ket: 'Diecer dari Kenka Bond literan' },
      { kat: 'degleazher', bahan: 'Aceton', ket: 'Diecer dari Aceton' },
      { kat: 'sole protector', bahan: '', ket: 'Dibeli roll lalu diecer, tidak dihitung robot' }
    ];
    function RBB_norm_(s) { return String(s === null || s === undefined ? '' : s).toLowerCase().replace(/\s+/g, ' ').trim(); }
    function RBB_isiTebak_(nama) {
      const m = String(nama || '').match(/(\d+(?:[.,]\d+)?)\s*(ml|liter|ltr|l)\b/i);
      if (!m) return null;
      const q = Number(m[1].replace(',', '.'));
      if (!(q > 0)) return null;
      return /^(liter|ltr|l)$/i.test(m[2]) ? q * 1000 : q;
    }
    // Sama dengan Apps Script, tanpa menambah baris baru ke sheet (halaman hanya membaca).
    function RBB_isi_(ss, katalog) {
      const out = {};
      const sh = ss.getSheetByName(RBB_SH_ISI_);
      if (sh && sh.getLastRow() >= 2) {
        sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues().forEach(function (r) {
          const k = String(r[0] || '').trim().toUpperCase();
          if (!k) return;
          const v = typeof BBK_angka_ === 'function' ? BBK_angka_(r[2]) : Number(r[2]);
          out[k] = (v !== null && isFinite(v) && v > 0) ? v : null;
        });
      }
      Object.keys(katalog).forEach(function (k) {
        if (k in out) return;
        out[k] = RBB_isiTebak_(katalog[k]);
      });
      return out;
    }
    function RBB_komposisi_(nama, kat, w, C) {
      const nm = RBB_norm_(nama), kt = RBB_norm_(kat), wn = RBB_norm_(w);
      const jadiNama = function (n) { return C.jadiN[RBB_norm_(n)] || null; };
      const dariWarna = function (kels) {
        for (let i = 0; i < kels.length; i++) { const o = C.warna[kels[i] + '|' + wn]; if (o) return o; }
        return null;
      };
      const hasilWarna = function (o) {
        const out = { jadi: {}, pig: {}, ket: o.n + ' (' + o.kel + ')' };
        o.dasar.forEach(function (d) { out.jadi[d.k] = (out.jadi[d.k] || 0) + d.ml / o.tot; });
        o.pig.forEach(function (p) { out.pig[p.k] = (out.pig[p.k] || 0) + p.ml / o.tot; });
        return out;
      };
      const satuJadi = function (j) { const out = { jadi: {}, pig: {}, ket: j.n }; out.jadi[j.k] = 1; return out; };

      for (let i = 0; i < RBB_ECER_.length; i++) {
        const e = RBB_ECER_[i];
        if (kt.indexOf(e.kat) === -1 && nm.indexOf(e.kat) === -1) continue;
        if (!e.bahan) return { err: e.ket, lewati: true };
        const b = C.bahanN[RBB_norm_(e.bahan)];
        const out = { jadi: {}, pig: {}, ket: e.ket, lbl: e.ket };
        if (b) out.pig[b.k] = 1; else out.ecer = e.bahan;
        return out;
      }
      if (/leather paint|water ?based|suede/.test(kt)) {
        if (!wn) return { err: 'warnanya belum diketahui dari data penjualan' };
        let j = null, o = null;
        if (/suede/.test(kt) && /^(neutral|netral)$/.test(wn)) {
          const al = C.bahanN['alcohol ipa'];
          if (al) { const out = { jadi: {}, pig: {}, ket: 'Alcohol murni (Suede Neutral)', lbl: 'Suede Neutral' }; out.pig[al.k] = 1; return out; }
        }
        if (/suede/.test(kt)) {
          j = jadiNama('suede ' + wn);
          if (!j) j = C.jadi.filter(function (z) { return RBB_norm_(z.n).indexOf('suede ' + wn) === 0; })[0] || null;
        } else if (/water/.test(kt)) {
          j = jadiNama('waterbased ' + wn);
          if (!j) o = dariWarna(['waterbased']);
        } else {
          const seri = /neon/.test(nm) ? 'neon' : (/pastel/.test(nm) ? 'pastel' : '');
          if (seri) o = dariWarna([seri]) || C.warna['neon|neon ' + wn] || null;
          if (!o) j = jadiNama('leather ' + wn);
          if (!o && !j) o = dariWarna(['leather', 'neon', 'pastel']);
        }
        if (j) return satuJadi(j);
        if (o) return hasilWarna(o);
        return { err: 'resep warna ' + w + ' belum ada' };
      }
      if (!kt) return { err: 'kategori barang kosong' };
      const cand = C.jadi.filter(function (z) { return (RBB_norm_(z.kel) + ' ' + RBB_norm_(z.n)).indexOf(kt) !== -1; });
      if (!cand.length) return { err: 'belum ada bahan jadi / resep untuk kategori ' + kat };
      if (cand.length === 1) return satuJadi(cand[0]);
      const katKata = kt.split(/[^a-z0-9]+/);
      let terbaik = null, skor = 0, seri = false;
      cand.forEach(function (z) {
        const kata = RBB_norm_(z.n).split(/[^a-z0-9]+/).filter(function (x) { return x.length > 2 && katKata.indexOf(x) === -1; });
        const s = kata.filter(function (x) { return nm.indexOf(x) !== -1; }).length;
        if (s > skor) { skor = s; terbaik = z; seri = false; } else if (s === skor && s > 0) seri = true;
      });
      if (!terbaik || seri) return { err: 'ada beberapa bahan jadi ' + kat + ', robot tidak yakin yang mana' };
      return satuJadi(terbaik);
    }
    function rencanaBahan(p, rp) {
      try {
        if (!rp || !rp.ok) return { ok: false, pesan: (rp && rp.pesan) || 'Robot rencana produksi gagal.' };

        const ss = SpreadsheetApp.getActiveSpreadsheet(), tz = ss.getSpreadsheetTimeZone();
        const bulan = Utilities.formatDate(new Date(), tz, 'yyyy-MM');
        const bahanList = BBK_bahan_(ss), jadiList = BBK_jadi_(ss), resep = BBK_resep_(ss, bahanList, jadiList);
        const wr = BBK_warna_(ss, bahanList, jadiList);
        const beli = BBK_beli_(ss, tz), log = BBK_log_(ss, tz);
        const stokList = BBK_stok_(ss, tz, bulan, beli, log);
        const isi = RBB_isi_(ss, bacaKatalog_());

        const B = {}; bahanList.forEach(function (b) { B[b.k] = b; });
        const C = { jadi: jadiList, jadiN: {}, warna: {}, bahanN: {} };
        bahanList.forEach(function (b) { C.bahanN[RBB_norm_(b.n)] = b; });
        jadiList.forEach(function (j) { C.jadiN[RBB_norm_(j.n)] = j; });
        wr.warna.forEach(function (w) { if (!w.target) C.warna[RBB_norm_(w.kel) + '|' + RBB_norm_(w.n)] = w; });

        const perKg = {}, jadiInfo = {};
        jadiList.forEach(function (j) {
          const r = resep[j.k] || [];
          let batch = j.b ? BBK_konversi_(j.b, j.s || 'kg', 'kg', 1) : null;
          if (!(batch > 0)) {
            batch = 0;
            r.forEach(function (x) { const q = BBK_konversi_(x.q, x.st, 'kg', x.bj); if (q) batch += q; });
          }
          jadiInfo[j.k] = { k: j.k, n: j.n, kel: j.kel, batch: batch > 0 ? batch : null, resep: r.length > 0 };
          if (!(batch > 0) || !r.length) return;
          perKg[j.k] = r.map(function (x) {
            const q = BBK_konversi_(x.q, x.st, B[x.k] ? B[x.k].s : x.st, x.bj);
            return { k: x.k, q: q === null ? null : q / batch };
          });
        });

        const butuhJadi = {}, butuhMentah = {}, pakaiOleh = {}, masalah = [], dihitung = [], ecer = {};
        let totPcs = 0;
        const tambahMentah = function (k, q, oleh) {
          butuhMentah[k] = (butuhMentah[k] || 0) + q;
          if (!pakaiOleh[k]) pakaiOleh[k] = {};
          pakaiOleh[k][oleh] = true;
        };
        rp.list.forEach(function (x) {
          if (!(x.saran > 0)) return;
          const bagian = (x.warna || []).filter(function (y) { return y.saran > 0; });
          const unit = bagian.length ? bagian.map(function (y) { return { w: y.w, pcs: y.saran }; }) : [{ w: '', pcs: x.saran }];
          const g = isi[x.k];
          unit.forEach(function (u) {
            const c = RBB_komposisi_(x.n, x.kat, u.w, C);
            if (c.err) { masalah.push({ k: x.k, n: x.n, w: u.w, pcs: u.pcs, al: c.err, lewati: !!c.lewati }); return; }
            if (!(g > 0)) { masalah.push({ k: x.k, n: x.n, w: u.w, pcs: u.pcs, al: 'isi per pcs belum diketahui (isi di sheet ' + RBB_SH_ISI_ + ')' }); return; }
            const gram = u.pcs * g;
            totPcs += u.pcs;
            dihitung.push({ k: x.k, n: x.n, w: u.w, pcs: u.pcs, kg: Math.round(gram / 10) / 100, ket: c.ket });
            if (c.ecer) { ecer[c.ecer] = (ecer[c.ecer] || 0) + gram; return; }
            Object.keys(c.jadi).forEach(function (jk) { butuhJadi[jk] = (butuhJadi[jk] || 0) + gram * c.jadi[jk] / 1000; });
            Object.keys(c.pig).forEach(function (bk) {
              const b = B[bk];
              const q = b ? BBK_konversi_(gram * c.pig[bk], 'gram', b.s, b.bj) : null;
              if (q === null) { masalah.push({ k: x.k, n: x.n, w: u.w, pcs: u.pcs, al: 'satuan pigment ' + (b ? b.n : bk) + ' tidak bisa dihitung' }); return; }
              tambahMentah(bk, q, c.lbl || ('Pigment ' + (u.w || x.n)));
            });
          });
        });

        const jadiOut = [];
        Object.keys(butuhJadi).forEach(function (jk) {
          const kg = butuhJadi[jk], info = jadiInfo[jk] || { n: jk, batch: null, resep: false };
          jadiOut.push({ k: jk, n: info.n, kel: info.kel || '', kg: Math.round(kg * 100) / 100, kali: info.batch ? Math.round(kg / info.batch * 10) / 10 : null, batch: info.batch, resep: info.resep });
          if (!perKg[jk]) { masalah.push({ k: jk, n: info.n, w: '', pcs: 0, al: 'bahan jadi ini belum punya resep / berat per produksi' }); return; }
          perKg[jk].forEach(function (r) {
            if (r.q === null) { masalah.push({ k: jk, n: info.n, w: '', pcs: 0, al: 'satuan bahan ' + (B[r.k] ? B[r.k].n : r.k) + ' di resep tidak bisa diubah ke satuan stok' }); return; }
            tambahMentah(r.k, kg * r.q, info.n);
          });
        });
        jadiOut.sort(function (a, b) { return b.kg - a.kg; });

        const dipesan = {};
        beli.forEach(function (x) {
          if (x.st !== 'Dipesan') return;
          const b = B[x.k];
          const q = b ? BBK_konversi_(x.q, x.s, b.s, b.bj) : null;
          if (q) dipesan[x.k] = (dipesan[x.k] || 0) + q;
        });
        const S = {}; stokList.forEach(function (s) { S[s.k] = s; });
        const stokDipakai = function (k) { const s = S[k]; return s ? Math.max(0, s.ss) : 0; };
        const campur = {};
        wr.warna.forEach(function (w) { if (w.target && w.tot > 0) campur[w.target.k] = w; });
        Object.keys(campur).forEach(function (k) {
          const w = campur[k], b = B[k];
          if (!butuhMentah[k] || !b) return;
          const kurang = butuhMentah[k] - stokDipakai(k) - (dipesan[k] || 0);
          if (!(kurang > 0)) return;
          const gram = BBK_konversi_(kurang, b.s, 'gram', b.bj);
          if (!(gram > 0)) return;
          w.pig.forEach(function (x) {
            const bp = B[x.k];
            const q = bp ? BBK_konversi_(gram * x.ml / w.tot, 'gram', bp.s, bp.bj) : null;
            if (q) tambahMentah(x.k, q, 'Campuran ' + w.n);
          });
        });
        let minus = 0;
        const urut = { 'Kurang': 0, 'Tunggu barang': 1, 'Mepet': 2, 'Cukup': 3 };
        const n = { 'Kurang': 0, 'Tunggu barang': 0, 'Mepet': 0, 'Cukup': 0 };
        const bahanOut = Object.keys(butuhMentah).map(function (k) {
          const b = B[k] || { n: k, s: '', kel: '' }, s = S[k] || { ss: 0, min: null };
          const butuh = butuhMentah[k], stokAsli = s.ss, stok = Math.max(0, stokAsli), ps = dipesan[k] || 0, sisa = stok - butuh;
          if (stokAsli < 0) minus++;
          let st = 'Cukup', beliQ = 0;
          if (stok + ps < butuh) { st = 'Kurang'; beliQ = butuh - stok - ps; }
          else if (stok < butuh) st = 'Tunggu barang';
          else if (s.min !== null && sisa < s.min) st = 'Mepet';
          n[st]++;
          return {
            k: k, n: b.n, s: b.s, kel: b.kel, butuh: butuh, stok: stokAsli, minus: stokAsli < 0, buat: !!campur[k], dipesan: ps, sisa: sisa, min: s.min, st: st, beli: beliQ,
            untuk: Object.keys(pakaiOleh[k] || {}).slice(0, 6)
          };
        }).sort(function (a, b) { return (urut[a.st] - urut[b.st]) || (b.beli - a.beli) || (a.n < b.n ? -1 : 1); });

        return {
          ok: true, hari: rp.hari, target: rp.target, totPcs: totPcs, n: n, minus: minus, bahan: bahanOut, jadi: jadiOut,
          barang: dihitung, masalah: masalah.slice(0, 80), sheetIsi: RBB_SH_ISI_,
          ecer: Object.keys(ecer).map(function (n) { return { n: n, kg: Math.round(ecer[n] / 10) / 100 }; }),
          diperbarui: Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy HH:mm')
        };
      } catch (err) {
        return { ok: false, pesan: 'Robot gagal menghitung: ' + (err && err.message ? err.message : err) };
      }
    }


    // ---- Simpan produksi bahan jadi & campur warna (file 4 bahanBakuProduksi / bahanBakuWarna) ----
    // Hitungan sama persis; hasilnya berupa baris yang dicatat fungsi Supabase bbk_simpan_baris.
    const BBK_SATUAN_PROD_ = ['kg'];
    function BBK_teksAngka_(n) { return String(BBK_bulat3_(n)).replace('.', ','); }
    function tglForm_(teks) {
      const m = String(teks || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!m) return 'Tanggal tidak valid.';
      const y = parseInt(m[1], 10), b = parseInt(m[2], 10), d = parseInt(m[3], 10);
      const cek = new Date(Date.UTC(y, b - 1, d));
      if (cek.getUTCFullYear() !== y || cek.getUTCMonth() !== b - 1 || cek.getUTCDate() !== d) return 'Tanggal tidak valid.';
      const selisih = (Date.UTC(y, b - 1, d) - 8 * 3600000 - Date.now()) / 86400000;
      if (selisih > 2) return 'Tanggal terlalu jauh di masa depan. Periksa lagi.';
      if (selisih < -400) return 'Tanggal terlalu lama. Periksa lagi tahunnya.';
      return null;
    }
    function siapProduksi(p) {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const salah = tglForm_(p.tanggal);
      if (salah) return { ok: false, pesan: salah };
      const pengisi = BBK_rapi_(p.pengisi, 40);
      if (pengisi.length < 2) return { ok: false, pesan: 'Nama staf belum diisi.' };
      const catatan = BBK_rapi_(p.catatan, 200);
      const rows = Array.isArray(p.rows) ? p.rows.slice(0, 60) : [];
      if (!rows.length) return { ok: false, pesan: 'Belum ada bahan jadi yang diisi.' };
      const jadiList = BBK_jadi_(ss), daftar = {};
      jadiList.forEach(function (j) { daftar[j.k] = j; });
      const resep = BBK_resep_(ss, BBK_bahan_(ss), jadiList);
      const tulis = [], pakai = [], ganti = {};
      for (let i = 0; i < rows.length; i++) {
        const brs = 'Baris ' + (i + 1) + ': ';
        const j = daftar[BBK_rapi_(rows[i] && rows[i].kode, 30).toUpperCase()];
        if (!j) return { ok: false, pesan: brs + 'pilih bahan jadi dari daftar.' };
        const s = BBK_rapi_(rows[i].satuan, 15) || j.s || 'kg';
        if (BBK_SATUAN_PROD_.indexOf(s) === -1 && s !== j.s) return { ok: false, pesan: brs + 'pilih satuannya, kg atau liter.' };
        let kali = null, q = null;
        const kRaw = BBK_rapi_(rows[i].kali, 15), qRaw = BBK_rapi_(rows[i].qty, 15);
        if (kRaw !== '') {
          kali = BBK_angka_(kRaw);
          if (kali === null || kali <= 0 || kali > 10000) return { ok: false, pesan: brs + 'kali produksi harus angka lebih dari 0.' };
        }
        if (qRaw !== '') {
          q = BBK_angka_(qRaw);
          if (q === null || q <= 0 || q > 1000000) return { ok: false, pesan: brs + 'jumlah harus angka lebih dari 0.' };
        }
        const berat = (j.b && (!j.s || j.s === s)) ? j.b : null;
        if (q === null && kali !== null && berat) q = kali * berat;
        if (q === null) return { ok: false, pesan: brs + 'isi jumlah ' + j.n + (berat ? '.' : ' (berat per produksi belum diisi manajemen Moscow Supplies, jadi jumlahnya belum bisa dihitung dari kali produksi).') };
        if (kali === null && berat) kali = BBK_bulat3_(q / berat);
        const rs = resep[j.k] || [];
        if (rs.length) {
          if (kali === null) return { ok: false, pesan: brs + 'isi kali produksi ' + j.n + ', karena bahan mentahnya dipotong otomatis sesuai resep.' };
          for (let r = 0; r < rs.length; r++) {
            const x = rs[r], qq = BBK_konversi_(kali * x.q, x.st, x.s, x.bj);
            if (qq === null) return { ok: false, pesan: 'Resep ' + j.n + ': takaran ' + x.n + ' dalam ' + x.st + ' tidak bisa dihitung ke satuan stok ' + x.s + '. Minta manajemen Moscow Supplies memperbaiki sheet BAHAN_RESEP.' };
            pakai.push({ jenis: 'Terpakai', kode: x.k, nama: x.n, qty: BBK_bulat3_(qq), satuan: x.s, pengisi: 'form: ' + pengisi, catatan: 'otomatis dari produksi ' + BBK_teksAngka_(kali) + 'x', untuk: j.n });
          }
        }
        if (s !== j.s) ganti[j.k] = true;
        tulis.push({ kode: j.k, kel: j.kel, nama: j.n, qty: BBK_bulat3_(q), satuan: s, pengisi: 'form: ' + pengisi, catatan: catatan, kali: kali === null ? '' : BBK_bulat3_(kali) });
      }
      // Satuan bawaan varian perlu diubah di sheet BAHAN_JADI: biarkan Apps Script yang menyimpan.
      if (Object.keys(ganti).length) return { lewat: true };
      const t = String(p.tanggal).split('-');
      return { ok: true, awalan: 'bbkprod', jadi: tulis, pakai: pakai, warna: [],
        pesan: 'Produksi tersimpan: ' + tulis.length + ' bahan jadi untuk tanggal ' + t[2] + '/' + t[1] + '/' + t[0] + '.' +
          (pakai.length ? ' Bahan mentah terpotong otomatis: ' + pakai.length + ' catatan.' : '') };
    }
    function siapWarna(p) {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const salah = tglForm_(p.tanggal);
      if (salah) return { ok: false, pesan: salah };
      const pengisi = BBK_rapi_(p.pengisi, 40);
      if (pengisi.length < 2) return { ok: false, pesan: 'Nama staf belum diisi.' };
      const g = BBK_angka_(p.ml);
      if (g === null || g <= 0 || g > 10000000) return { ok: false, pesan: 'Hasil (gram) harus angka lebih dari 0.' };
      const catatan = BBK_rapi_(p.catatan, 180);
      const id = String(p.id || '').toLowerCase();
      const w = BBK_warna_(ss, BBK_bahan_(ss), BBK_jadi_(ss)).warna.filter(function (x) { return x.id === id; })[0];
      if (!w) return { ok: false, pesan: 'Pilih warna dari daftar.' };
      const f = g / w.tot, pakai = [], tulis = [];
      const judul = (w.target ? 'pigment campuran ' : 'campur warna ') + w.n;
      for (let i = 0; i < w.pig.length; i++) {
        const x = w.pig[i], q = BBK_konversi_(x.ml * f, 'gram', x.s, x.bj);
        if (q === null) return { ok: false, pesan: x.n + ' tercatat dalam satuan ' + x.s + ', tidak bisa dihitung dari gram.' };
        pakai.push({ jenis: 'Terpakai', kode: x.k, nama: x.n, qty: BBK_bulat3_(q), satuan: x.s, pengisi: 'form: ' + pengisi, catatan: judul + ' ' + BBK_teksAngka_(g) + ' g (' + BBK_teksAngka_(x.ml * f) + ' g)', untuk: w.n });
      }
      if (w.target) {
        const qt = BBK_konversi_(g, 'gram', w.target.s, w.target.bj);
        if (qt === null) return { ok: false, pesan: 'Satuan stok ' + w.target.n + ' (' + w.target.s + ') tidak bisa dihitung dari gram.' };
        pakai.push({ jenis: 'Dibuat', kode: w.target.k, nama: w.target.n, qty: BBK_bulat3_(qt), satuan: w.target.s, pengisi: 'form: ' + pengisi, catatan: 'dibuat ' + BBK_teksAngka_(g) + ' g' + (catatan ? ' | ' + catatan : ''), untuk: '' });
      }
      if (w.dasar.length) {
        w.dasar.forEach(function (d, i) { tulis.push({ warna: w.n, hasil: i === 0 ? BBK_bulat3_(g) : 0, dasar: d.n, dasar_g: BBK_bulat3_(d.ml * f), pengisi: 'form: ' + pengisi, catatan: catatan, kel: w.kel }); });
      } else {
        tulis.push({ warna: w.n, hasil: BBK_bulat3_(g), dasar: '', dasar_g: 0, pengisi: 'form: ' + pengisi, catatan: catatan, kel: w.kel });
      }
      const rinci = w.dasar.map(function (d) { return d.n + ' ' + BBK_teksAngka_(d.ml * f) + ' g'; }).concat(w.pig.map(function (x) { return x.n + ' ' + BBK_teksAngka_(x.ml * f) + ' g'; })).join(', ');
      return { ok: true, awalan: 'bbkwarna', jadi: [], pakai: pakai, warna: tulis,
        pesan: (w.target ? 'Pigment ' + w.n + ' dibuat ' + BBK_teksAngka_(g) + ' g, stoknya bertambah. ' : 'Campur warna tersimpan: ' + w.n + ' (' + w.kel + ') ' + BBK_teksAngka_(g) + ' g. ') + rinci + ' terpakai.' };
    }
    // Bagian bahan baku dari hargaBahanBakuMaster (file 4) untuk Master Data lama.
    function hargaMaster() {
      const beli = BBK_beli_(ss, 'Asia/Makassar');
      const kel = {};
      BBK_bahan_(ss).forEach(function (b) { kel[b.k] = b.kel; });
      return {
        harga: BBK_daftarHarga_(ss, beli),
        ubah: beli.filter(function (x) { return x.pc !== null && x.pc !== undefined; })
          .map(function (x) { return { n: x.n, s: x.s, t: x.t, b: x.baris, sup: x.sup, hs: x.hs, hp: x.hp, tp: x.tp, pc: x.pc, kel: kel[x.k] || '' }; })
      };
    }
    return { bahanBakuData: bahanBakuData, bahanBakuLaporan: bahanBakuLaporan, pantauProduksi: pantauProduksi, rencanaBahan: rencanaBahan,
      siapProduksi: siapProduksi, siapWarna: siapWarna, hargaMaster: hargaMaster };
  }

  async function muat(sb, tabel) { return buat(await window.Lembar.muat(sb, tabel)); }
  // Simpan lewat Supabase. null = biarkan Apps Script yang menyimpan (misalnya satuan bawaan varian berubah).
  async function simpanBaris(sb, p, jenis) {
    var B = buat(await window.Lembar.muat(sb, TABEL_BAHAN));
    var h = jenis === 'warna' ? B.siapWarna(p || {}) : B.siapProduksi(p || {});
    if (h.lewat) return null;
    if (!h.ok) return h;
    var r = await sb.rpc('bbk_simpan_baris', { p_tanggal: String(p.tanggal || ''), p_awalan: h.awalan, p_token: String(p.token || ''),
      p_jadi: h.jadi, p_pakai: h.pakai, p_warna: h.warna, p_pesan: h.pesan });
    if (r.error) throw new Error('Gagal menyimpan: ' + r.error.message + '. Tekan simpan sekali lagi; aman, tidak akan tercatat dua kali.');
    return r.data;
  }
  window.BahanBaku = {
    hargaMaster: async function (sb) { return (await muat(sb, ['bahan_baku', 'bahan_baku_beli'])).hargaMaster(); },
    simpanProduksi: function (sb, p) { return simpanBaris(sb, p, 'produksi'); },
    simpanWarna: function (sb, p) { return simpanBaris(sb, p, 'warna'); },
    bahanBakuData: async function (sb, p) { return (await muat(sb, TABEL_BAHAN)).bahanBakuData(p || {}); },
    bahanBakuLaporan: async function (sb, p) { return (await muat(sb, TABEL_BAHAN)).bahanBakuLaporan(p || {}); },
    pantauProduksi: async function (sb, p, jenis) {
      var t = jenis === 'bahan' ? ['bahan_jadi_log', 'bahan_warna_log'] : ['produksi_log', 'katalog'];
      return (await muat(sb, t)).pantauProduksi(p || {}, jenis);
    },
    // Saran produksi dari potret robot rencana produksi (dihitung Apps Script berkala), bahan dari lembar (terbaru).
    rencanaProduksi: async function (sb) {
      var r = await sb.from('hasil_hitung').select('data').eq('kunci', 'md:rpd').maybeSingle();
      if (r.error) throw new Error(r.error.message);
      return r.data ? r.data.data : null;
    },
    rencanaBahan: async function (sb, p) {
      var rp = await window.BahanBaku.rencanaProduksi(sb);
      if (!rp) return null;
      return (await muat(sb, TABEL_BAHAN.concat(['katalog', 'robot_isi_barang']))).rencanaBahan(p || {}, rp);
    },
    buat: buat, TABEL: TABEL
  };
})();
