/* =====================================================================
   PENGINGAT LAPOR PENJUALAN (aplikasi toko: Consignment Medan / Sidoarjo / Renon, Toko Offline) — 7 Nov 2026
   - Kotak peringatan di atas form kalau penjualan hari ini belum diisi / diupload / ditandai "tidak ada penjualan".
   - Tombol aktifkan notifikasi HP: diingatkan tiap jam 09.00–17.00 WITA selama belum lapor (Edge Function absen-pengingat).
   ===================================================================== */
(function () {
  var HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'], BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var O = null, S = { status: null, notif: null, sibuk: false, pesan: '' };
  var CSS = '#lpKotak{max-width:860px;margin:12px auto 0;padding:0 16px}#lpKotak .lp{border-radius:14px;padding:14px 16px;border:1px solid}' +
    '#lpKotak .lp.bad{background:#FDECEA;border-color:#F3C1BA;color:#7A1C12}#lpKotak .lp.ok{background:#EAF6EE;border-color:#BFE3CB;color:#145C34}' +
    '#lpKotak .lp.info{background:#EEF5FB;border-color:#C9DDEE;color:#173E5C}#lpKotak b.j{display:block;font-size:16px;margin-bottom:4px}' +
    '#lpKotak .lpAksi{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}#lpKotak button{border-radius:10px;font-weight:700;padding:9px 14px;border:1px solid #C9D6E2;background:#fff;color:#0F1B2A;font:inherit;font-weight:700;cursor:pointer}' +
    '#lpKotak button.utama{background:#B42318;border-color:#B42318;color:#fff}#lpKotak button:disabled{opacity:.6}#lpKotak .kecil{font-size:13px;margin-top:6px;opacity:.9}';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function tglId(t) { var d = new Date(t + 'T00:00:00'); return isNaN(d) ? t : HARI[d.getDay()] + ', ' + d.getDate() + ' ' + BLN[d.getMonth()]; }
  function b64(buf) { return btoa(String.fromCharCode.apply(null, new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function keKunci(s) { var p = '='.repeat((4 - s.length % 4) % 4), r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')), a = new Uint8Array(r.length); for (var i = 0; i < r.length; i++) a[i] = r.charCodeAt(i); return a; }
  var IOS = /iPhone|iPad|iPod/.test(navigator.userAgent), MANDIRI = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  function dukung() { return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; }

  async function cekNotif() {
    if (!dukung()) { S.notif = IOS && !MANDIRI ? 'ios' : 'tidak'; return; }
    if (Notification.permission === 'denied') { S.notif = 'blokir'; return; }
    try {
      var reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription();
      if (!sub || Notification.permission !== 'granted') { S.notif = 'mati'; return; }
      var r = await O.sb.rpc('toko_push_ada', { p_toko: O.toko(), p_endpoint: sub.endpoint });
      S.notif = r.data ? 'aktif' : 'mati';
    } catch (e) { S.notif = 'mati'; }
  }
  async function cek() {
    if (!O || !O.toko()) return;
    var r = await O.sb.rpc('toko_lapor_status', { p_toko: O.toko() });
    S.status = r.data && r.data.ok ? r.data : null;
    await cekNotif();
    gambar();
  }
  function gambar() {
    var el = document.getElementById('lpKotak'); if (!el) return;
    var d = S.status; if (!d) { el.innerHTML = ''; return; }
    var h = '';
    if (d.status === '') {
      h = '<div class="lp bad"><b class="j">⚠️ Penjualan hari ini (' + esc(tglId(d.tanggal)) + ') belum diisi</b>' +
        'Isi penjualan hari ini di <b>Report penjualan</b> (manual atau upload laporan). Kalau hari ini memang tidak ada penjualan, tekan <b>Tidak ada penjualan</b>.' +
        (d.terakhir ? '<div class="kecil">Penjualan terakhir yang tercatat: ' + esc(tglId(d.terakhir)) + '.</div>' : '') +
        '<div class="lpAksi"><button type="button" class="utama" data-lp="isi">Isi penjualan</button><button type="button" data-lp="nihil"' + (S.sibuk ? ' disabled' : '') + '>Tidak ada penjualan hari ini</button></div></div>';
    } else if (S.pesan) {
      h = '<div class="lp ok">' + esc(S.pesan) + '</div>';
    }
    if (S.notif === 'mati') h += '<div class="lp info" style="margin-top:8px"><b class="j">🔔 Aktifkan pengingat di HP ini</b>Notifikasi muncul tiap jam 09.00–17.00 WITA kalau penjualan hari ini belum diisi, dan berhenti sendiri setelah diisi.' +
      '<div class="lpAksi"><button type="button" data-lp="notif"' + (S.sibuk ? ' disabled' : '') + '>Aktifkan pengingat</button></div></div>';
    else if (S.notif === 'ios') h += '<div class="lp info" style="margin-top:8px">🔔 Supaya pengingat bisa muncul di iPhone: tekan tombol Bagikan di Safari › <b>Tambahkan ke Layar Utama</b>, lalu buka aplikasi dari ikon itu dan aktifkan pengingat.</div>';
    else if (S.notif === 'blokir') h += '<div class="lp info" style="margin-top:8px">🔔 Notifikasi diblokir di HP ini. Buka pengaturan browser › Notifikasi › izinkan app.moscowsupplies.com, lalu muat ulang.</div>';
    el.innerHTML = h;
    if (O.ubah) O.ubah();
  }
  async function aktifkan() {
    S.sibuk = true; gambar();
    try {
      var izin = await Notification.requestPermission();
      if (izin !== 'granted') throw new Error('Izin notifikasi tidak diberikan. Tekan Izinkan saat HP bertanya.');
      var k = await O.sb.rpc('absen_push_publik'); if (k.error || !k.data) throw new Error('Pengingat belum siap. Coba lagi nanti.');
      await navigator.serviceWorker.register('sw.js'); var reg = await navigator.serviceWorker.ready;
      var sub = await reg.pushManager.getSubscription(); // dipakai bersama pengingat absen bila ada (jangan dilepas)
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keKunci(k.data) });
      var r = await O.sb.rpc('toko_push_simpan', { p_toko: O.toko(), p_endpoint: sub.endpoint, p_p256dh: b64(sub.getKey('p256dh')), p_auth: b64(sub.getKey('auth')), p_perangkat: (navigator.userAgent || '').slice(0, 120) });
      if (r.error || !r.data || !r.data.ok) throw new Error(r.error ? r.error.message : r.data.pesan);
      S.pesan = '';
      alert('Pengingat aktif di HP ini.');
    } catch (e) { alert(e.message || String(e)); }
    S.sibuk = false; await cek();
  }
  async function nihil() {
    if (!confirm('Tandai hari ini TIDAK ADA penjualan di ' + O.toko() + '?')) return;
    S.sibuk = true; gambar();
    var r = await O.sb.rpc('toko_lapor_nihil', { p_toko: O.toko(), p_nama: O.nama ? O.nama() : '' });
    S.sibuk = false;
    if (r.error || !r.data || !r.data.ok) { alert((r.data && r.data.pesan) || (r.error && r.error.message) || 'Gagal menyimpan.'); return; }
    S.pesan = '✓ ' + r.data.pesan + ' Pengingat hari ini berhenti.';
    await cek();
  }

  window.TokoLapor = {
    // opsi: { sb, toko: fn, nama: fn, isi: fn (buka Report penjualan), ubah: fn (ukur ulang tampilan) }
    pasang: function (opsi) {
      O = opsi;
      if (!document.getElementById('lpCss')) { var s = document.createElement('style'); s.id = 'lpCss'; s.textContent = CSS; document.head.appendChild(s); }
      var el = document.getElementById('lpKotak');
      if (el && !el.dataset.siap) {
        el.dataset.siap = '1';
        el.addEventListener('click', function (e) {
          var b = e.target.closest('[data-lp]'); if (!b || S.sibuk) return;
          var a = b.getAttribute('data-lp');
          if (a === 'isi') O.isi(); else if (a === 'nihil') nihil(); else if (a === 'notif') aktifkan();
        });
        document.addEventListener('visibilitychange', function () { if (!document.hidden) cek(); });
        setInterval(cek, 5 * 60000);
      }
      cek();
    },
    cek: cek
  };
})();
