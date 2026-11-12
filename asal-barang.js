/* Asal barang (Impor / Lokal) di form pengajuan & PO (11 Nov 2026).
 * Dimuat form-app.js ke dalam tampilan form (gudang, produksi, bahanbaku, purchasing) bersama window.__ASAL
 * = daftar barang impor manajemen (tabel barang_impor: { KODE: { a: 'impor' | 'campuran', n: nama } }).
 * Aturan manajemen Moscow Supplies:
 *   - asal 'impor'    : selalu Impor (tidak bisa diganti, dikirim juga ke Mike)
 *   - asal 'campuran' : kadang impor kadang lokal (baris kuning) -> staf WAJIB memilih Impor atau Lokal
 *   - selain itu      : selalu Lokal (tidak bisa diganti)
 */
(function () {
  'use strict';
  function ambil(k) { return (window.__ASAL || {})[String(k || '').trim().toUpperCase()] || null; }
  function jenis(kel, k) {
    if (kel && kel !== 'Barang jualan') return 'lokal';
    var a = ambil(k);
    return a ? a.a : 'lokal';
  }
  function e(s) { return String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  window.__asalAmbil = ambil;
  // 12 Nov 2026: laporan barang bonus dari supplier per bulan (tab Terima barang)
  window.__bonusKartu = function () {
    var b = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 7);
    return '<div class="card" id="bnKartu"><h3>&#127873; Laporan barang bonus</h3>' +
      '<div class="kecil">Barang bonus dari supplier yang dicatat saat Terima barang (kolom Bonus). Masuk stok gudang, HPP tidak berubah.</div>' +
      '<div style="display:flex;gap:8px;margin-top:8px;align-items:center"><input type="month" id="bnBln" value="' + b + '" style="max-width:180px">' +
      '<button type="button" class="btn" style="padding:9px 14px" onclick="window.__bonusMuat()">Lihat</button></div><div id="bnIsi" style="margin-top:8px"></div></div>';
  };
  window.__bonusMuat = function () {
    var el = document.getElementById('bnIsi'), bl = (document.getElementById('bnBln') || {}).value || '';
    if (!el) return; el.innerHTML = '<div class="kecil">Memuat…</div>';
    var rp = function (n) { return 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID'); };
    google.script.run.withSuccessHandler(function (r) {
      if (!r || !r.ok) { el.innerHTML = '<div class="kecil">' + e((r && r.pesan) || 'Gagal memuat.') + '</div>'; return; }
      if (!r.list.length) { el.innerHTML = '<div class="kecil">Belum ada barang bonus di bulan ini.</div>'; return; }
      var tq = 0, tn = 0;
      el.innerHTML = '<table class="t"><tr><th>Tanggal</th><th>Barang</th><th class="n">Qty</th><th class="n">Nilai (HPP)</th></tr>' + r.list.map(function (x) {
        var nilai = (Number(x.q) || 0) * (Number(x.hpp) || 0); tq += Number(x.q) || 0; tn += nilai;
        return '<tr><td>' + e(x.t.slice(8, 10) + '/' + x.t.slice(5, 7)) + '</td><td>' + e(x.n) + (x.w ? ' - ' + e(x.w) : '') + ' <span class="kecil">' + e(x.k) + '</span><div class="kecil">' + e(x.po) + ' &middot; ' + e(x.sup) + '</div></td>' +
          '<td class="n">' + (Number(x.q) || 0).toLocaleString('id-ID') + '</td><td class="n">' + rp(nilai) + '</td></tr>';
      }).join('') + '<tr><td colspan="2"><b>Total</b></td><td class="n"><b>' + tq.toLocaleString('id-ID') + '</b></td><td class="n"><b>' + rp(tn) + '</b></td></tr></table>';
    }).withFailureHandler(function (er) { el.innerHTML = '<div class="kecil">' + e(er && er.message || 'Gagal memuat.') + '</div>'; }).gdBonusLap({ bulan: bl });
  };

  // 12 Nov 2026: saat terima barang PO, tampilkan perbandingan harga beli PO ini dengan HPP sekarang
  window.__hppTanda = function (it, hrg, no, peta) {
    var dasar = window.__hppTandaDasar(it, hrg, no, peta), x = hrg && it ? hrg[it.k] : null, hj = x ? Number(x.hj) || 0 : 0;
    var p = peta && no && it ? peta[no + '|' + it.k] : null, baru = p ? Number(p.baru) || 0 : Number(it && it.h) || 0;
    // Batas kenaikan dibanding HPP acuan (HPP saat harga jual terakhir ditetapkan), bukan dibanding harga jual.
    var acu = it ? Number((window.__ACUAN || {})[it.k]) || 0 : 0, bts = window.__ACUAN_BATAS || 35;
    if (acu > 0 && baru >= acu * (1 + bts / 100)) {
      var saran = hj > 0 ? Math.ceil(hj * baru / acu / 100) * 100 : 0;
      dasar += '<div style="margin-top:3px;font-size:12px;font-weight:700;color:#9a3412">&#9888; Naik ' + (Math.round((baru / acu - 1) * 1000) / 10).toLocaleString('id-ID') +
        '% dari HPP acuan Rp ' + Math.round(acu).toLocaleString('id-ID') + ' (batas ' + bts + '%). Setelah disimpan, laporan harga jual baru' +
        (saran ? ' (saran Rp ' + saran.toLocaleString('id-ID') + ')' : '') + ' otomatis dikirim ke manajemen Moscow Supplies.</div>';
    }
    return dasar;
  };
  window.__hppTandaDasar = function (it, hrg, no, peta) {
    var p = peta && no && it ? peta[no + '|' + it.k] : null;
    var h = p ? Number(p.baru) || 0 : Number(it && it.h) || 0;
    var x = hrg && it ? hrg[it.k] : null, lama = p ? Number(p.lama) || 0 : (x ? Number(x.hpp) || 0 : 0);
    var rp = function (n) { return 'Rp ' + Math.round(Math.abs(n)).toLocaleString('id-ID'); };
    var gaya = 'display:inline-block;margin-top:3px;font-size:12px;font-weight:700;padding:2px 8px;border-radius:999px;';
    if (!h) return '';
    if (!lama) return '<div><span style="' + gaya + 'background:#eef6fb;color:#1a78a0">HPP baru ' + rp(h) + ' (belum ada HPP sebelumnya)</span></div>';
    var beda = h - lama, pr = beda / lama * 100;
    if (Math.abs(pr) < 0.5) return '<div><span style="' + gaya + 'background:#eef2f6;color:#4a5566">= HPP tetap ' + rp(lama) + '</span></div>';
    var naik = beda > 0;
    return '<div><span style="' + gaya + (naik ? 'background:#fdecea;color:#b3261e' : 'background:#e7f6ec;color:#157347') + '">' + (naik ? '&#9650; naik ' : '&#9660; turun ') +
      (Math.round(Math.abs(pr) * 10) / 10).toLocaleString('id-ID') + '% (' + (naik ? '+' : '&minus;') + rp(beda) + ')</span>' +
      '<div style="font-size:12px;color:#6b7686">HPP sekarang ' + rp(lama) + ' &rarr; HPP dari PO ini ' + rp(h) + (p && Math.round(p.baru) !== Math.round(it.h) ? ' (harga ' + rp(it.h) + ' + ongkir)' : '') + '</div></div>';
  };

  // 12 Nov 2026: tanda asal di daftar barang & daftar pengajuan
  window.__asalTanda = function (kel, k) {
    var j = jenis(kel, k);
    if (j === 'impor') return ' <span style="display:inline-block;font-size:11px;font-weight:700;padding:1px 7px;border-radius:999px;background:#fff1e6;color:#9a3412">&#127759; Impor</span>';
    if (j === 'campuran') return ' <span style="display:inline-block;font-size:11px;font-weight:700;padding:1px 7px;border-radius:999px;background:#fdf6d8;color:#8a6100">&#128256; Impor / lokal</span>';
    return ' <span style="display:inline-block;font-size:11px;font-weight:700;padding:1px 7px;border-radius:999px;background:#e7f6ec;color:#157347">&#127968; Lokal</span>';
  };
  // Daftar "perlu diajukan": tanpa kata kunci, yang tampil hanya barang dengan saran beli dari robot
  // (Kritis / Saatnya pesan) yang belum sedang diajukan (Menunggu / Disetujui). Tombol "Tampilkan semua barang" untuk melihat semuanya.
  window.__perluSemua = false;
  function terbuka(D, kel, k) {
    return (D && D.ajuan || []).some(function (a) { return a.kel === kel && a.k === k && (a.st === 'Menunggu' || a.st === 'Disetujui'); });
  }
  window.__perluSaring = function (L, D, kel, q) {
    if (q || window.__perluSemua || kel === 'Packaging & lainnya') return L;
    return L.filter(function (x) { return x.saran > 0 && (x.st === 'Kritis' || x.st === 'Saatnya pesan') && !terbuka(D, kel, x.k); });
  };
  window.__perluKepala = function (D, kel, q, idCari) {
    if (q || kel === 'Packaging & lainnya') return '';
    var semua = (D && D.items || []).filter(function (x) { return x.kel === kel; });
    var perlu = semua.filter(function (x) { return x.saran > 0 && (x.st === 'Kritis' || x.st === 'Saatnya pesan'); });
    var sudah = perlu.filter(function (x) { return terbuka(D, kel, x.k); }).length;
    var n = perlu.length - sudah;
    var teks = window.__perluSemua
      ? 'Menampilkan semua ' + semua.length + ' barang. '
      : (n ? '<b>' + n + ' barang perlu diajukan</b> (stok Gudang Utama tidak cukup)' : '<b>Tidak ada barang yang perlu diajukan sekarang.</b>') +
        (sudah ? ' &middot; ' + sudah + ' barang sudah diajukan dan menunggu ACC, tidak ditampilkan.' : '') + ' ';
    return '<div style="margin:4px 0 8px;padding:10px 12px;border-radius:10px;background:#eef6fb;color:#1c2430;font-size:13px">' + teks +
      '<a href="#" onclick="window.__perluSemua=!window.__perluSemua;var q=document.getElementById(\'' + idCari + '\');if(q)q.dispatchEvent(new Event(\'input\'));return false;" style="color:#1a78a0;font-weight:700">' +
      (window.__perluSemua ? 'Tampilkan yang perlu diajukan saja' : 'Tampilkan semua barang') + '</a>' +
      '<div style="color:#6b7686;margin-top:4px">Diperbarui robot tiap 10 menit dari stok Gudang Utama, barang dalam perjalanan, dan penjualan.</div></div>';
  };

  // 12 Nov 2026: stok di daftar pengajuan = stok Gudang Utama saja; stok Kantor Packing & toko hanya keterangan.
  window.__stokLain = function (x) {
    if (!x || (!x.kp && !x.toko)) return '';
    var f = function (n) { return (Math.round(Number(n) * 10) / 10).toLocaleString('id-ID'); };
    return ' <span style="color:#6b7280">(di luar gudang: KP ' + f(x.kp || 0) + ', toko ' + f(x.toko || 0) + ')</span>';
  };
  // tebakan awal: impor = true, campuran = null (belum dipilih), lainnya = false
  window.__asalTebak = function (kel, k) { var j = jenis(kel, k); return j === 'impor' ? true : j === 'campuran' ? null : false; };

  // pilihan di kartu pengajuan
  window.__asalPilih = function (it, i) {
    var j = jenis(it.kel, it.k);
    if (j !== 'campuran') {
      it.imp = j === 'impor';
      return '<label>Asal barang</label><select data-imp="' + i + '" disabled><option selected>' + (it.imp ? 'Impor (dikirim juga ke Mike)' : 'Lokal') + '</option></select>';
    }
    var h = '<label>Asal barang <b style="color:#9a3412">(bisa impor atau lokal, wajib dipilih)</b></label>' +
      '<select data-imp="' + i + '"' + (it.imp === null || it.imp === undefined ? ' style="border:2px solid #d97706"' : '') + '>';
    h += '<option value=""' + (it.imp === null || it.imp === undefined ? ' selected' : '') + '>- pilih Impor atau Lokal -</option>';
    h += '<option value="0"' + (it.imp === false ? ' selected' : '') + '>Lokal</option><option value="1"' + (it.imp === true ? ' selected' : '') + '>Impor (dikirim juga ke Mike)</option></select>';
    return h;
  };

  // sebelum kirim: barang campuran harus sudah dipilih; barang lain dipastikan sesuai daftar
  window.__asalCek = function (KR) {
    for (var i = 0; i < KR.length; i++) {
      var it = KR[i], j = jenis(it.kel, it.k);
      if (j === 'impor') { it.imp = true; continue; }
      if (j === 'lokal') { it.imp = false; continue; }
      if (it.imp === null || it.imp === undefined) {
        var s = document.querySelector('select[data-imp="' + i + '"]');
        if (s) { s.style.border = '2px solid #b3261e'; if (s.scrollIntoView) s.scrollIntoView({ block: 'center' }); }
        alert('Pilih asal barang (Impor atau Lokal) untuk ' + (it.n || it.k) + '. Barang ini kadang impor kadang beli lokal.');
        return false;
      }
    }
    return true;
  };

  // form PO: asal ditetapkan dari barang di PO; hanya bisa dipilih bila ada barang campuran
  window.__asalPo = function (po, asli) {
    var rows = (po && po.rows || []).filter(function (r) { return r && r.k; });
    if (!rows.length) return asli;
    var ada = { impor: [], campuran: [], lokal: [] };
    rows.forEach(function (r) { ada[jenis('Barang jualan', r.k)].push(r.k); });
    var tetap = null, ket = '';
    if (ada.impor.length && ada.lokal.length) {
      ket = ' <b style="color:#b3261e">(PO ini berisi barang impor ' + e(ada.impor.slice(0, 4).join(', ')) + ' dan barang lokal ' + e(ada.lokal.slice(0, 4).join(', ')) + '; sebaiknya dipisah jadi dua PO)</b>';
    } else if (ada.campuran.length) {
      ket = ' <b style="color:#9a3412">(' + e(ada.campuran.join(', ')) + ' bisa impor atau lokal, pilih sesuai pembelian ini)</b>';
      if (ada.impor.length) tetap = 'Impor'; else if (ada.lokal.length) tetap = 'Lokal';
    } else {
      tetap = ada.impor.length ? 'Impor' : 'Lokal';
    }
    if (tetap) {
      po.asal = tetap;
      return '<div><label>Asal barang' + ket + '</label><select data-po="asal" disabled><option selected>' + tetap + '</option></select></div>';
    }
    return '<div><label>Asal barang' + ket + '</label><select data-po="asal">' +
      ['Impor', 'Lokal'].map(function (x) { return '<option' + (x === po.asal ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></div>';
  };
})();
