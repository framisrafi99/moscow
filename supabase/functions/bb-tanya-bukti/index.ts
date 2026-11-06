// bb-tanya-bukti (6 Nov 2026): manajemen bertanya satu hal tentang file bukti bayar yang tersimpan (mis. jam transaksi).
// Hanya lewat kunci robot (header x-moscow-robot-kunci). Body: { id: bb_bukti.id, tanya: '...' } -> { ok, jawab }
// Isi lengkap sama dengan versi yang dipasang di Supabase (deploy 6 Nov 2026).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { encodeBase64 } from 'jsr:@std/encoding@1/base64';

function kunciServer(): string {
  const satu = Deno.env.get('SUPABASE_SECRET_KEY');
  if (satu) return satu;
  try { const b = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}'); const k = b.default || Object.values(b)[0]; if (k) return String(k); } catch (_) { /* lanjut */ }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
}
const sb = createClient(Deno.env.get('SUPABASE_URL')!, kunciServer(), { auth: { persistSession: false } });
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: false }, 405);
  const k = await sb.from('robot_kunci').select('kunci').eq('id', 1).maybeSingle();
  if (!(k.data && k.data.kunci === req.headers.get('x-moscow-robot-kunci'))) return json({ ok: false }, 403);
  // deno-lint-ignore no-explicit-any
  let isi: any = {};
  try { isi = await req.json(); } catch (_) { isi = {}; }
  const b = await sb.from('bb_bukti').select('berkas,file_jenis').eq('id', Number(isi.id)).maybeSingle();
  if (!b.data || !b.data.berkas) return json({ ok: false, pesan: 'berkas tidak ada' });
  const f = await sb.storage.from('bukti-bayar').download(b.data.berkas);
  if (f.error || !f.data) return json({ ok: false, pesan: 'unduh gagal' });
  const data = new Uint8Array(await f.data.arrayBuffer());
  const pdf = b.data.file_jenis === 'pdf';
  const src = { type: 'base64', media_type: pdf ? 'application/pdf' : (b.data.berkas.endsWith('.png') ? 'image/png' : 'image/jpeg'), data: encodeBase64(data) };
  const kunci = (Deno.env.get('ANTHROPIC_API_KEY') || '').trim();
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: { 'x-api-key': kunci, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: (Deno.env.get('BB_MODEL') || 'claude-sonnet-5-5').trim(), max_tokens: 600, messages: [{ role: 'user', content: [
      { type: pdf ? 'document' : 'image', source: src }, { type: 'text', text: String(isi.tanya || 'Jelaskan isi dokumen ini.').slice(0, 1000) + ' Jawab singkat dalam bahasa Indonesia, kutip angka/tanggal/jam persis seperti tertulis.' }] }] }),
  });
  const j = await r.json();
  // deno-lint-ignore no-explicit-any
  return json({ ok: r.ok, jawab: r.ok ? (j.content || []).map((c: any) => c.text || '').join('') : (j?.error?.message || r.status) });
});
