// =====================================================================
// Edge Function "absen-pengingat" — kirim notifikasi HP pengingat absen.
// Dipanggil jadwal pg_cron (sql/absensi-pengingat.sql) dengan body {"jenis":"masuk"|"pulang"}.
// Aman dipanggil siapa pun: daftar penerima, jam kirim, dan "sekali sehari" diperiksa di database
// (absen_pengingat_target). Pasang dengan "Verify JWT" dimatikan.
// Kunci pengirim (VAPID) dibuat otomatis saat pertama kali dipanggil, disimpan di absen_push_kunci.
// =====================================================================
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

// Kunci rahasia server: sistem kunci baru (SUPABASE_SECRET_KEYS) atau kunci lama (service_role).
function kunciServer(): string {
  const satu = Deno.env.get('SUPABASE_SECRET_KEY');
  if (satu) return satu;
  try { const banyak = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}'); const k = banyak.default || Object.values(banyak)[0]; if (k) return String(k); } catch (_) { /* lanjut */ }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
}
const sb = createClient(Deno.env.get('SUPABASE_URL')!, kunciServer(), { auth: { persistSession: false } });

const PESAN: Record<string, { title: string; body: string }> = {
  masuk: { title: 'Jangan lupa absen masuk', body: 'Sudah sampai di tempat kerja? Ketuk untuk absen masuk.' },
  pulang: { title: 'Waktunya pulang', body: 'Jangan lupa absen pulang sebelum meninggalkan tempat kerja. Ketuk untuk absen.' },
};

function json(isi: unknown, status = 200) {
  return new Response(JSON.stringify(isi), { status, headers: { 'Content-Type': 'application/json' } });
}

async function kunci() {
  const { data } = await sb.from('absen_push_kunci').select('publik, privat').eq('id', 1).maybeSingle();
  if (data) return data;
  const v = webpush.generateVAPIDKeys();
  const { error } = await sb.from('absen_push_kunci').insert({ id: 1, publik: v.publicKey, privat: v.privateKey });
  if (error) {
    // Dibuat bersamaan oleh panggilan lain: pakai yang sudah tersimpan.
    const ulang = await sb.from('absen_push_kunci').select('publik, privat').eq('id', 1).single();
    return ulang.data!;
  }
  return { publik: v.publicKey, privat: v.privateKey };
}

Deno.serve(async (req) => {
  // Pengaman ringan: hanya POST dari jadwal (header khusus). Pemutus "terlalu banyak panggilan" ada di database.
  if (req.method !== 'POST' || req.headers.get('x-moscow-pengingat') !== '1') return json({ ok: false, pesan: 'Tidak diizinkan.' }, 403);
  let jenis = '';
  try { const b = await req.json(); jenis = String(b?.jenis || ''); } catch (_) { /* tanpa body */ }
  const k = await kunci();
  if (jenis !== 'masuk' && jenis !== 'pulang') return json({ ok: true, siap: true });

  const { data: t, error } = await sb.rpc('absen_pengingat_target', { p_jenis: jenis });
  if (error) return json({ ok: false, pesan: error.message }, 500);
  if (!t?.ok) return json(t);

  webpush.setVapidDetails('https://app.moscowsupplies.com', k.publik, k.privat);
  const isi = { ...PESAN[jenis], url: '/absensi.html', tag: 'absen-' + jenis };
  if (t.uji) isi.body += ' (' + t.uji + ')';
  let kirim = 0, gagal = 0;
  await Promise.all((t.target || []).map(async (s: { endpoint: string; p256dh: string; auth: string }) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(isi), { TTL: 3 * 3600, urgency: 'high' });
      kirim++;
    } catch (e) {
      gagal++;
      const kode = (e as { statusCode?: number }).statusCode;
      // Langganan sudah tidak berlaku (aplikasi dihapus / izin dicabut): bersihkan.
      if (kode === 404 || kode === 410) await sb.from('absen_push').delete().eq('endpoint', s.endpoint);
    }
  }));
  return json({ ok: true, jenis, kirim, gagal });
});
