/*
 * Moscow Supplies - alasan penyesuaian stok dipilih dari daftar (26 Nov 2026).
 * Kotak alasan yang lama tetap ada (dibaca kode simpan seperti biasa), hanya disembunyikan dan diisi dari pilihan.
 * "Lainnya" membuka kotak isian supaya staf menulis alasannya sendiri.
 * Dipasang ke dokumen form (iframe) lewat PilihAlasan.pasang(dok, daftarId, jenis); kotak yang dibuat ulang ikut dipasang.
 */
(function () {
  'use strict';
  var DAFTAR = {
    stok: ['Hasil hitung fisik (stok opname)', 'Salah input sebelumnya', 'Barang rusak / tumpah / kedaluwarsa',
      'Dipakai di luar produksi (sampel, kantor)', 'Barang masuk yang belum tercatat'],
    toko: ['Hasil hitung stok', 'Salah input penjualan sebelumnya', 'Barang rusak', 'Barang hilang',
      'Barang masuk yang belum tercatat']
  };
  var LAIN = 'Lainnya (tulis sendiri)';

  function pasangSatu(el, jenis) {
    if (!el || el.dataset.pilihAlasan) return;
    el.dataset.pilihAlasan = '1';
    var dok = el.ownerDocument, opsi = DAFTAR[jenis] || DAFTAR.stok;
    var sel = dok.createElement('select');
    sel.className = el.className; sel.setAttribute('aria-label', 'Alasan penyesuaian');
    sel.style.width = '100%';
    sel.innerHTML = '<option value="">Pilih alasan…</option>' + opsi.concat([LAIN]).map(function (o) {
      return '<option>' + o.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }) + '</option>';
    }).join('');
    var lain = dok.createElement('input');
    lain.type = 'text'; lain.className = el.className; lain.maxLength = Math.max(20, (Number(el.maxLength) || 160) - 12);
    lain.placeholder = 'Tulis alasannya'; lain.style.marginTop = '6px'; lain.hidden = true;
    function isi() {
      var v = sel.value === LAIN ? (lain.value.trim() ? 'Lainnya: ' + lain.value.trim() : '') : sel.value;
      if (el.value !== v) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }
    }
    // Isi lama (mis. form dibuka ulang) dipertahankan.
    var lama = String(el.value || '').trim();
    if (lama) {
      if (opsi.indexOf(lama) !== -1) sel.value = lama;
      else { sel.value = LAIN; lain.hidden = false; lain.value = lama.replace(/^Lainnya:\s*/, ''); }
    }
    sel.addEventListener('change', function () { lain.hidden = sel.value !== LAIN; if (!lain.hidden) lain.focus(); isi(); });
    lain.addEventListener('input', isi);
    el.type = 'hidden';
    el.parentNode.insertBefore(sel, el);
    el.parentNode.insertBefore(lain, el.nextSibling);
    // Kalau kode form mengosongkan kotak (sesudah simpan), pilihan ikut kembali kosong.
    var awas = setInterval(function () {
      if (!dok.contains(el)) { clearInterval(awas); return; }
      if (!el.value && (sel.value && !(sel.value === LAIN && !lain.value.trim()))) { sel.value = ''; lain.value = ''; lain.hidden = true; }
    }, 800);
  }

  function pasang(dok, ids, jenis) {
    if (!dok || !dok.body) return;
    function cari() { ids.forEach(function (id) { var el = dok.getElementById(id); if (el && el.tagName === 'INPUT') pasangSatu(el, jenis); }); }
    cari();
    if (!dok.__pilihAlasan) {
      dok.__pilihAlasan = new MutationObserver(cari);
      dok.__pilihAlasan.observe(dok.body, { childList: true, subtree: true });
    }
  }
  window.PilihAlasan = { pasang: pasang };
})();
