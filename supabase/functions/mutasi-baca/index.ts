// Edge Function "mutasi-baca" (6 Nov 2026): membaca PDF / foto mutasi rekening bank dengan AI lalu mengembalikan baris transaksinya.
// Dipanggil Master Data (manajemen saja). Pencocokan dengan accounting dikerjakan RPC mutasi_cocok.
// Body: { file: base64, mime: 'application/pdf' | 'image/jpeg' | 'image/png', akun }
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const MODEL = (Deno.env.get('BB_MODEL') || 'claude-sonnet-5-5').trim();
function json(o: unknown, status = 200) { return new Response(JSON.stringify(o), { status, headers: { ...CORS, 'Content-Type': 'application/json' } }); }

const PERINTAH = 'Ini mutasi / rekening koran bank (biasanya BCA). Salin SEMUA transaksi apa adanya, jangan ada yang terlewat atau digabung. ' +
  'Balas HANYA JSON tanpa teks lain: {"bank":"","rekening_4":"4 digit terakhir no rekening","dari":"YYYY-MM-DD","sampai":"YYYY-MM-DD","saldo_awal":angka|null,"saldo_akhir":angka|null,' +
  '"baris":[{"t":"YYYY-MM-DD","ket":"keterangan lengkap (jenis transaksi, nama lawan, berita)","v":angka positif,"arah":"DB" untuk uang keluar / "CR" untuk uang masuk,"saldo":angka|null}]}. ' +
  'Tahun diambil dari periode di dokumen. Angka tanpa titik / Rp. Biaya admin / biaya transfer yang tertulis sebagai baris sendiri tetap jadi baris sendiri. ' +
  'Baris "SALDO AWAL" bukan transaksi (isi ke saldo_awal). Urutkan sesuai dokumen.';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ ok: false }, 405);
  const pengguna = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization') || '' } }, auth: { persistSession: false } });
  const pr = await pengguna.rpc('peran_saya');
  if (pr.error || pr.data !== 'manajemen') return json({ ok: false, pesan: 'Akses ditolak.' }, 403);
  let b: any = {};
  try { b = await req.json(); } catch (_) { return json({ ok: false, pesan: 'File tidak terbaca.' }); }
  const data = String(b.file || ''), mime = String(b.mime || 'application/pdf');
  if (!data || data.length > 14_000_000) return json({ ok: false, pesan: 'File kosong atau terlalu besar (maks ±10 MB).' });
  const kunci = (Deno.env.get('ANTHROPIC_API_KEY') || '').trim();
  if (!kunci) return json({ ok: false, pesan: 'Kunci AI belum dipasang di server.' });
  const berkas = mime === 'application/pdf'
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }
    : { type: 'image', source: { type: 'base64', media_type: /png/.test(mime) ? 'image/png' : 'image/jpeg', data } };
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'x-api-key': kunci, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_tokens: 16000, messages: [{ role: 'user', content: [berkas, { type: 'text', text: PERINTAH }] }] }),
    });
    const j = await r.json();
    if (!r.ok) return json({ ok: false, pesan: 'AI menolak: ' + String(j?.error?.message || r.status).slice(0, 200) });
    const teks = String((j.content || []).map((c: any) => c.text || '').join(''));
    const m = teks.match(/\{[\s\S]*\}/);
    if (!m) return json({ ok: false, pesan: 'Mutasi tidak terbaca. Coba file lain (PDF asli dari bank lebih baik).' });
    const hasil = JSON.parse(m[0]);
    const baris = (Array.isArray(hasil.baris) ? hasil.baris : []).filter((x: any) => /^\d{4}-\d{2}-\d{2}$/.test(String(x.t || '')) && Number(x.v) > 0)
      .map((x: any) => ({ t: String(x.t), ket: String(x.ket || '').slice(0, 200), v: Math.round(Number(x.v)), arah: String(x.arah).toUpperCase() === 'CR' ? 'CR' : 'DB', saldo: x.saldo == null ? null : Number(x.saldo) }));
    return json({ ok: true, bank: hasil.bank || '', rek: hasil.rekening_4 || '', dari: hasil.dari || '', sampai: hasil.sampai || '',
      saldo_awal: hasil.saldo_awal ?? null, saldo_akhir: hasil.saldo_akhir ?? null, baris, terpotong: j.stop_reason === 'max_tokens' });
  } catch (e) {
    return json({ ok: false, pesan: 'Gagal membaca mutasi: ' + String((e as Error)?.message || e).slice(0, 200) });
  }
});
