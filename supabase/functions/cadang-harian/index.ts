// Edge Function "cadang-harian" (5 Nov 2026): cadangan harian semua tabel Supabase ke Storage (bucket pribadi "cadangan"),
// pengganti CADANG_harian Apps Script (salinan file Sheets ke Drive). Disimpan 30 hari.
// Isi: cadangan/<yyyy-MM-dd>/<tabel>/<urutan>.json.gz (array baris JSON, dipotong per 1.000 baris = batas baca API).
// Dipanggil jadwal (cron) dengan header x-moscow-robot-kunci. Panggilan induk membagi pekerjaan ke panggilan kecil per tabel
// (tiap panggilan robot dibatasi ±2 detik kerja prosesor): 3 pekerja, tiap panggilan mengerjakan beberapa tabel sekaligus.
import { createClient } from 'npm:@supabase/supabase-js@2';

const URL_SB = Deno.env.get('SUPABASE_URL')!;
function kunciServer(): string {
  const satu = Deno.env.get('SUPABASE_SECRET_KEY');
  if (satu) return satu;
  try { const banyak = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}'); const k = banyak.default || Object.values(banyak)[0]; if (k) return String(k); } catch (_) { /* lanjut */ }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
}
const sb = createClient(URL_SB, kunciServer(), { auth: { persistSession: false } });
const BUCKET = 'cadangan', HALAMAN = 1000, SIMPAN_HARI = 30;

function json(isi: unknown, status = 200) { return new Response(JSON.stringify(isi), { status, headers: { 'Content-Type': 'application/json' } }); }
function hariWita(ms = Date.now()) { return new Date(ms + 8 * 3600e3).toISOString().slice(0, 10); }
async function gzip(teks: string) {
  const s = new Blob([teks]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(s).arrayBuffer());
}

// Satu tabel, mulai dari baris ke-dari; berhenti sesudah ±1,2 detik, sisanya dilanjutkan panggilan berikutnya.
async function salinTabel(hari: string, tabel: string, dari: number) {
  const mulai = Date.now();
  let pakaiId = true;
  for (let i = dari; ; i += HALAMAN) {
    let q = sb.from(tabel).select('*').range(i, i + HALAMAN - 1);
    let r = pakaiId ? await q.order('id') : await q;
    if (r.error && pakaiId) { pakaiId = false; q = sb.from(tabel).select('*').range(i, i + HALAMAN - 1); r = await q; }
    if (r.error) throw new Error(tabel + ': ' + r.error.message);
    const baris = r.data || [];
    if (baris.length || i === 0) {
      const u = await sb.storage.from(BUCKET).upload(hari + '/' + tabel + '/' + String(i / HALAMAN).padStart(3, '0') + '.json.gz',
        await gzip(JSON.stringify(baris)), { contentType: 'application/gzip', upsert: true });
      if (u.error) throw new Error(tabel + ' simpan: ' + u.error.message);
    }
    if (baris.length < HALAMAN) return { selesai: true, baris: i + baris.length };
    if (Date.now() - mulai > 1200) return { selesai: false, lanjut: i + HALAMAN };
  }
}

async function buangLama() {
  const batas = hariWita(Date.now() - SIMPAN_HARI * 86400e3);
  const r = await sb.storage.from(BUCKET).list('', { limit: 1000 });
  const lama = (r.data || []).map((x) => x.name).filter((n) => /^\d{4}-\d{2}-\d{2}$/.test(n) && n < batas);
  let n = 0;
  for (const tgl of lama) {
    const dalam = await sb.storage.from(BUCKET).list(tgl, { limit: 1000 });
    for (const t of dalam.data || []) {
      const f = await sb.storage.from(BUCKET).list(tgl + '/' + t.name, { limit: 1000 });
      const jalur = (f.data || []).map((x) => tgl + '/' + t.name + '/' + x.name);
      if (jalur.length) { await sb.storage.from(BUCKET).remove(jalur); n += jalur.length; }
    }
  }
  return { hari: lama, file: n };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: false, pesan: 'Tidak diizinkan.' }, 405);
  const tanda = req.headers.get('x-moscow-robot-kunci') || '';
  const k = tanda ? await sb.from('robot_kunci').select('kunci').eq('id', 1).maybeSingle() : null;
  if (!(k && k.data && k.data.kunci === tanda)) return json({ ok: false, pesan: 'Tidak diizinkan.' }, 403);
  let body: { hari?: string } = {};
  try { body = await req.json(); } catch (_) { /* kosong */ }

  // Panggilan kecil: beberapa tugas {t, dari} dikerjakan berurutan sampai ±1,2 detik; sisanya dikembalikan.
  if (Array.isArray((body as { tugas?: unknown }).tugas)) {
    const tugas = (body as { tugas: { t: string; dari: number }[] }).tugas.slice(), hasil: Record<string, string> = {}, mulaiK = Date.now();
    let baris = 0;
    while (tugas.length && Date.now() - mulaiK < 1200) {
      const x = tugas.shift()!;
      try {
        const r = await salinTabel(String(body.hari || hariWita()), x.t, Number(x.dari) || 0);
        if (r.selesai) { hasil[x.t] = 'ok ' + r.baris; baris += r.baris || 0; } else tugas.unshift({ t: x.t, dari: Number(r.lanjut) });
      } catch (e) { hasil[x.t] = 'gagal: ' + String((e as Error)?.message || e).slice(0, 200); }
    }
    return json({ ok: true, hasil, baris, sisa: tugas });
  }

  // Panggilan induk: 3 pekerja, masing-masing membawa sebagian tabel dan memanggil ulang sampai habis.
  const mulai = Date.now(), hari = hariWita();
  const d = await sb.rpc('cadang_daftar');
  if (d.error) return json({ ok: false, pesan: d.error.message }, 500);
  const semua = (d.data as { t: string; n: number }[]).sort((a, b) => b.n - a.n);
  const bagian: { t: string; dari: number }[][] = [[], [], []];
  semua.forEach((x, i) => bagian[i % 3].push({ t: x.t, dari: 0 }));
  const hasil: Record<string, string> = {};
  let baris = 0;
  await Promise.all(bagian.map(async (tugas) => {
    let gagalBeruntun = 0;
    while (tugas.length && Date.now() - mulai < 280000) {
      let j: { ok?: boolean; hasil?: Record<string, string>; baris?: number; sisa?: { t: string; dari: number }[] } = {};
      try {
        const r = await fetch(URL_SB + '/functions/v1/cadang-harian', { method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-moscow-robot-kunci': tanda }, body: JSON.stringify({ tugas, hari }) });
        j = await r.json().catch(() => ({}));
      } catch (e) { j = {}; await new Promise((ok) => setTimeout(ok, 3000)); }
      if (!j.ok || !Array.isArray(j.sisa)) { if (++gagalBeruntun >= 4) break; continue; }
      gagalBeruntun = 0;
      Object.assign(hasil, j.hasil || {}); baris += Number(j.baris) || 0;
      tugas.splice(0, tugas.length, ...j.sisa);
    }
    tugas.forEach((x) => { if (!hasil[x.t]) hasil[x.t] = 'gagal: belum selesai'; });
  }));
  let buang: unknown = null;
  try { buang = await buangLama(); } catch (e) { buang = 'gagal: ' + String((e as Error)?.message || e); }
  const gagal = Object.keys(hasil).filter((t) => !hasil[t].startsWith('ok'));
  const ringkas = { hari, tabel: Object.keys(hasil).length, baris, gagal: gagal.map((t) => t + ' ' + hasil[t]), buang, detik: (Date.now() - mulai) / 1000 };
  await sb.from('robot_log').insert({ jenis: 'cadangan', detik: ringkas.detik, hasil: ringkas });
  return json({ ok: gagal.length === 0, ...ringkas });
});
