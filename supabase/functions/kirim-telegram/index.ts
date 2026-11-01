// =====================================================================
// Edge Function "kirim-telegram" — tahap B: pemberitahuan Telegram dikirim langsung dari Supabase (tanpa Apps Script).
// Mengambil antrean efek_antre jenis yang isi pesannya sudah lengkap di Supabase, lalu mengirim ke Telegram
// persis seperti Apps Script (TG_kirim_ file 21 + baris asal file 42, SBE_JENIS_ file 85):
//   tg            : teks siap kirim (+ baris asal). Pesan yang diberi tombol ACC (request pindah stok, usulan HPP)
//                   TIDAK diambil — tetap dikirim Apps Script karena tombolnya dijawab Apps Script.
//   pl_viory      : pesan pribadi ke Viory.
//   tg_kirim      : barang keluar dari Gudang Utama.
//   terima_selisih: toko menerima barang kurang dari surat jalan.
//   produksi_masuk: laporan produksi otomatis masuk Gudang Utama.
// Jenis lain tetap dikerjakan Apps Script seperti sebelumnya.
// Rahasia (diisi manajemen di Supabase › Edge Functions › Secrets, tidak pernah tertulis di kode):
//   TG_TOKEN, TG_CHAT (grup), TG_VIORY (chat pribadi Viory, boleh kosong).
// Dipanggil jadwal / pemicu database dengan header x-moscow-robot-kunci (isi robot_kunci id 1).
// Pasang dengan "Verify JWT" dimatikan.
// =====================================================================
import { createClient } from 'npm:@supabase/supabase-js@2';

const URL_SB = Deno.env.get('SUPABASE_URL')!;
function kunciServer(): string {
  const satu = Deno.env.get('SUPABASE_SECRET_KEY');
  if (satu) return satu;
  try { const banyak = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}'); const k = banyak.default || Object.values(banyak)[0]; if (k) return String(k); } catch (_) { /* lanjut */ }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
}
const sb = createClient(URL_SB, kunciServer(), { auth: { persistSession: false } });
const TOKEN = (Deno.env.get('TG_TOKEN') || '').trim();
const CHAT = (Deno.env.get('TG_CHAT') || '').trim();
const VIORY = (Deno.env.get('TG_VIORY') || '').trim();
const MAKS_BARIS = 12;
const JENIS = ['tg', 'pl_viory', 'tg_kirim', 'terima_selisih', 'produksi_masuk'];

function json(isi: unknown, status = 200) { return new Response(JSON.stringify(isi), { status, headers: { 'Content-Type': 'application/json' } }); }
function esc(s: unknown) { return String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function fmt(n: unknown) {
  const x = Math.round(Number(n) || 0), s = String(Math.abs(x));
  let o = '';
  for (let i = 0; i < s.length; i++) { if (i > 0 && (s.length - i) % 3 === 0) o += '.'; o += s.charAt(i); }
  return (x < 0 ? '-' : '') + o;
}
function jam() { const w = new Date(Date.now() + 8 * 3600e3), p = (n: number) => ('0' + n).slice(-2); return p(w.getUTCDate()) + '/' + p(w.getUTCMonth() + 1) + '/' + w.getUTCFullYear() + ' ' + p(w.getUTCHours()) + ':' + p(w.getUTCMinutes()); }
function daftar(baris: string[]) {
  const t = baris.slice(0, MAKS_BARIS).map((b) => '• ' + b);
  if (baris.length > MAKS_BARIS) t.push('• ... dan ' + (baris.length - MAKS_BARIS) + ' barang lain');
  return t.join('\n');
}
function rapiWarna(v: unknown) { return String(v === null || v === undefined ? '' : v).replace(/\s+/g, ' ').trim().toUpperCase(); }
// Pesan yang di Apps Script diberi tombol Setujui / Tolak (TGA_tebak_ file 70).
function bertombol(teks: string) {
  return (teks.indexOf('<b>REQUEST PINDAH STOK BARU</b>') !== -1 && /No: ([^\n<]+)/.test(teks)) ||
    (teks.indexOf('<b>USULAN UBAH ') !== -1 && /\bHU-\d{6}-\d+\b/.test(teks));
}
type Asal = { e?: string; n?: string; nama?: string; lewat?: string } | null;
// Baris pertama = asal pemberitahuan (file 42).
function denganAsal(teks: string, a: Asal) {
  if (!a || !teks) return teks;
  return (a.e || '') + ' <b>' + esc(a.n) + '</b>' + (a.nama ? ' · ' + esc(a.nama) : '') + (a.lewat ? ' <i>(lewat form ' + esc(a.lewat) + ')</i>' : '') + '\n' + teks;
}

async function sidik(teks: string) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(teks));
  return Array.from(new Uint8Array(h)).slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('');
}
// TG_kirim_ (file 21): pesan yang sama persis tidak dikirim lagi dalam 10 menit.
async function kirim(chat: string, teks: string, cegahGanda: boolean) {
  if (!TOKEN || !chat || !teks) return 'lewat: rahasia Telegram belum diisi';
  if (cegahGanda) {
    const k = await sidik(teks);
    const ada = await sb.from('tg_kirim_ganda').select('waktu').eq('sidik', k).gte('waktu', new Date(Date.now() - 600000).toISOString()).maybeSingle();
    if (ada.data) return 'lewat: pesan sama baru saja terkirim';
    await sb.from('tg_kirim_ganda').upsert({ sidik: k, waktu: new Date().toISOString() }, { onConflict: 'sidik' });
  }
  const r = await fetch('https://api.telegram.org/bot' + TOKEN + '/sendMessage', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text: teks.slice(0, 4000), parse_mode: 'HTML', disable_web_page_preview: true }),
  });
  if (r.ok) return 'ok';
  const j = await r.json().catch(() => ({}));
  throw new Error('Telegram ' + r.status + ': ' + String((j as { description?: string }).description || '').slice(0, 120));
}

let namaBarang: Record<string, string> | null = null;
async function nama() {
  if (namaBarang) return namaBarang;
  // GD_barang_: baris pertama per kode (tanpa tanda '-') di BARANG_ORDER.
  const r = await sb.from('barang_order').select('kode,nama_barang,baris_sheet,id').order('baris_sheet', { ascending: true, nullsFirst: false }).order('id');
  const m: Record<string, string> = {};
  (r.data || []).forEach((x) => { const k = String(x.kode || '').trim().toUpperCase(); if (k && k.indexOf('-') === -1 && !(k in m)) m[k] = String(x.nama_barang || '').trim(); });
  namaBarang = m;
  return m;
}

// deno-lint-ignore no-explicit-any
async function kerjakan(jenis: string, d: any): Promise<string> {
  const a: Asal = d && d.asal ? d.asal : null;
  if (jenis === 'tg') return await kirim(CHAT, denganAsal(String(d.teks || ''), a), true);
  if (jenis === 'pl_viory') return await kirim(VIORY, String(d.teks || ''), false);
  if (jenis === 'tg_kirim') {
    const p = d.p || {}, nm = await nama();
    const items = Array.isArray(p.items) ? p.items : [];
    // deno-lint-ignore no-explicit-any
    const baris = items.map((x: any) => {
      const k = String(x.k || '').toUpperCase(), w = rapiWarna(x.w);
      return esc((nm[k] || k) + (w ? ' ' + w : '')) + ' — ' + fmt(Number(x.q) || 0) + ' pcs';
    });
    return await kirim(CHAT, denganAsal('🚚 <b>BARANG KELUAR DARI GUDANG UTAMA</b>\n' +
      'Tujuan: <b>' + esc(p.tujuan) + '</b>' + (p.order ? ' (order ' + esc(p.order) + ')' : '') + '\n' +
      'Dikirim: ' + esc(p.nama) + '\n\n' + daftar(baris) + '\n\n' + esc(d.pesan) +
      (p.catatan ? '\nCatatan: ' + esc(p.catatan) : '') + '\n\n<i>' + jam() + '</i>', a), true);
  }
  if (jenis === 'terima_selisih') {
    const items = Array.isArray(d.items) ? d.items : [];
    let selisih = 0;
    // deno-lint-ignore no-explicit-any
    items.forEach((it: any) => { selisih += (Number(it.kirim) || 0) - (Number(it.terima) || 0); });
    if (!(selisih > 0)) return 'ok';
    // deno-lint-ignore no-explicit-any
    const baris = items.filter((it: any) => Number(it.terima) < Number(it.kirim)).map((it: any) =>
      esc(it.n + (it.w ? ' ' + it.w : '')) + ': dikirim ' + fmt(it.kirim) + ', diterima ' + fmt(it.terima));
    return await kirim(CHAT, denganAsal('⚠️ <b>SELISIH PENERIMAAN BARANG</b>\nToko: <b>' + esc(d.pl) + '</b> · No: ' + esc(d.no) + '\nDikonfirmasi: ' + esc(d.oleh) + '\n\n' +
      daftar(baris) + '\n\nKurang ' + fmt(selisih) + ' pcs dari surat jalan.' + (d.catatan ? '\nCatatan: ' + esc(d.catatan) : '') +
      '\nCek di Master Data > Persetujuan > Pantau pengiriman.\n\n<i>' + jam() + '</i>', a), true);
  }
  if (jenis === 'produksi_masuk') {
    // PLG_tg_ (file 30): laporan produksi otomatis masuk Gudang Utama.
    const items = Array.isArray(d.items) ? d.items : [];
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d.tanggal || ''));
    // deno-lint-ignore no-explicit-any
    const baris = items.map((it: any) => esc(it.n + (it.w ? ' ' + it.w : '')) + ' — ' + fmt(it.q) + ' pcs');
    return await kirim(CHAT, denganAsal('🏭 <b>PRODUKSI MASUK GUDANG UTAMA</b>\n' +
      '<b>' + esc(d.nama || 'Staf produksi') + '</b> menyalurkan stok produksi ke stok sistem Gudang Utama.\n' +
      'Tanggal: ' + (m ? m[3] + '/' + m[2] + '/' + m[1] : '') + ' · Bukti: ' + d.no + '\n\n' +
      daftar(baris) + '\n\nTotal <b>' + fmt(Number(d.total) || 0) + ' pcs</b> bertambah otomatis di stok sistem Gudang Utama.' +
      '\n\n<i>' + jam() + '</i>', a), true);
  }
  return 'jenis tidak dikenal';
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: false, pesan: 'Tidak diizinkan.' }, 405);
  const tanda = req.headers.get('x-moscow-robot-kunci') || '';
  const k = tanda ? await sb.from('robot_kunci').select('kunci').eq('id', 1).maybeSingle() : null;
  if (!(k && k.data && k.data.kunci === tanda)) return json({ ok: false, pesan: 'Tidak diizinkan.' }, 403);
  if (!TOKEN || !CHAT) return json({ ok: false, pesan: 'Rahasia TG_TOKEN / TG_CHAT belum diisi; antrean dibiarkan untuk Apps Script.' });
  namaBarang = null;
  // Pesan untuk Viory hanya diambil kalau chat Viory sudah diisi; kalau belum, tetap dikirim Apps Script.
  const jenis = JENIS.filter((j) => j !== 'pl_viory' || VIORY);
  const r = await sb.from('efek_antre').select('id,jenis,data,dibuat').is('selesai', null).in('jenis', jenis).order('id').limit(30);
  const hasil: string[] = [];
  for (const x of r.data || []) {
    if (x.jenis === 'tg' && bertombol(String((x.data && x.data.teks) || ''))) continue;   // tetap untuk Apps Script (tombol ACC)
    // Diambil dulu (selesai diisi) supaya tidak dikerjakan dua kali oleh Apps Script / panggilan lain.
    const a = await sb.from('efek_antre').update({ selesai: new Date().toISOString(), hasil: 'proses' }).eq('id', x.id).is('selesai', null).select('id');
    if (a.error || !a.data || !a.data.length) continue;
    let ket = 'ok';
    try { ket = await kerjakan(x.jenis, x.data || {}); } catch (e) { ket = 'gagal: ' + String((e as Error)?.message || e).slice(0, 200); }
    if (ket === 'ok' || /^lewat: pesan sama/.test(ket)) ket = ket === 'ok' ? 'ok (Supabase)' : ket;
    await sb.from('efek_antre').update({ hasil: ket }).eq('id', x.id);
    hasil.push(x.jenis + ' #' + x.id + ': ' + ket);
  }
  return json({ ok: true, hasil });
});
