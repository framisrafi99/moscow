// =====================================================================
// Edge Function "efek-hitung" — proses lanjutan yang butuh rumus aplikasi, dikerjakan di Supabase (pengganti SBE_JENIS_ Apps Script).
//   terima_po : Telegram "BARANG SUPPLIER DITERIMA" + usulan HPP baru (hpp-terima.js = CHR_hitungTerima_, simpan lewat hpp_terima_simpan).
// Rumus dimuat dari app.moscowsupplies.com (file yang sama dengan aplikasi), seperti Edge Function hitung-potret.
// Dipanggil jadwal pg_cron dengan header x-moscow-robot-kunci (isi robot_kunci id 1). Verify JWT dimatikan.
// =====================================================================
import { createClient } from 'npm:@supabase/supabase-js@2';

const APP = 'https://app.moscowsupplies.com/';
const URL_SB = Deno.env.get('SUPABASE_URL')!;
function kunciServer(): string {
  const satu = Deno.env.get('SUPABASE_SECRET_KEY');
  if (satu) return satu;
  try { const b = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}'); const k = b.default || Object.values(b)[0]; if (k) return String(k); } catch (_) { /* lanjut */ }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
}
const sb = createClient(URL_SB, kunciServer(), { auth: { persistSession: false }, global: { headers: { 'x-moscow-robot': 'potret' } } });
const FILES = ['lembar.js', 'gudang.js', 'kp.js', 'produksi.js', 'bahanbaku.js', 'akun.js', 'md.js'];
// deno-lint-ignore no-explicit-any
const W: any = globalThis;
let SIMPANAN: Record<string, Promise<unknown>> = {};
let versiDimuat = '';

async function muatRumus() {
  const html = await (await fetch(APP + 'master.html?robot=' + Date.now(), { cache: 'no-store' })).text();
  const versi = FILES.map((f) => { const m = html.match(new RegExp('src="' + f.replace('.', '\\.') + '\\?v=(\\d+)"')); return f + '?v=' + (m ? m[1] : '0'); });
  const tanda = versi.join(',');
  if (tanda === versiDimuat) return;
  W.window = W;
  for (const f of versi.concat(['hpp-terima.js?v=' + Date.now()])) (0, eval)(await (await fetch(APP + f)).text());
  versiDimuat = tanda;
  const siapkan = W.Lembar.siapkan;
  W.Lembar.muat = async (_sb: unknown, tabel: string[]) => {
    const perlu = tabel.filter((t) => !(t in SIMPANAN));
    if (perlu.length) {
      const janji = sb.rpc('lembar_baca', { p_tabel: perlu }).then((r) => { if (r.error) throw new Error(r.error.message); return r.data || {}; });
      janji.catch(() => { /* dilaporkan lewat rumus */ });
      perlu.forEach((t) => { const p = janji.then((d: Record<string, unknown>) => d[t] || []); p.catch(() => {}); SIMPANAN[t] = p; });
    }
    const isi: Record<string, unknown> = {};
    for (const t of tabel) isi[t] = await SIMPANAN[t];
    return siapkan(isi);
  };
}

function json(o: unknown, status = 200) { return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } }); }
function esc(s: unknown) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function fmt(n: unknown) { const x = Math.round(Number(n) || 0), s = String(Math.abs(x)); let o = ''; for (let i = 0; i < s.length; i++) { if (i > 0 && (s.length - i) % 3 === 0) o += '.'; o += s.charAt(i); } return (x < 0 ? '-' : '') + o; }
function jam() { const w = new Date(Date.now() + 8 * 3600e3), p = (n: number) => ('0' + n).slice(-2); return p(w.getUTCDate()) + '/' + p(w.getUTCMonth() + 1) + '/' + w.getUTCFullYear() + ' ' + p(w.getUTCHours()) + ':' + p(w.getUTCMinutes()); }
function warna(v: unknown) { return String(v ?? '').replace(/\s+/g, ' ').trim().toUpperCase(); }
function daftar(baris: string[]) { const t = baris.slice(0, 12).map((b) => '• ' + b); if (baris.length > 12) t.push('• ... dan ' + (baris.length - 12) + ' barang lain'); return t.join('\n'); }

// SBE_JENIS_.terima_po (file 85 Apps Script)
// deno-lint-ignore no-explicit-any
async function terimaPo(d: any): Promise<string> {
  const tb = String(d.tb || ''), p = d.p || {};
  // Telegram barang supplier diterima (pembungkus file 21 TG_bungkus_ gdTerimaPo).
  // deno-lint-ignore no-explicit-any
  const L = await W.Lembar.muat(sb, ['barang_order', 'po_log', 'po_item', 'po_biaya']), G = W.Gudang.buat(L), po = G.po();
  const i = po.idx[String(p.no || '').trim()], o = i === undefined ? null : po.list[i], nmb: Record<string, string> = {};
  // deno-lint-ignore no-explicit-any
  if (o) o.items.forEach((it: any) => { nmb[it.k + '|' + (it.w || '')] = it.n + (it.w ? ' ' + it.w : ''); });
  const baris: string[] = [];
  // deno-lint-ignore no-explicit-any
  (Array.isArray(p.items) ? p.items : []).forEach((x: any) => {
    const baik = Number(x.baik) || 0, rusak = Number(x.rusak) || 0;
    if (!baik && !rusak) return;
    const k = String(x.k || '').toUpperCase() + '|' + warna(x.w);
    baris.push(esc(nmb[k] || x.k) + ' — ' + fmt(baik) + ' pcs' + (rusak ? ' ⚠️ ' + fmt(rusak) + ' rusak' : ''));
  });
  const pesan = String(d.pesan || ''), kurang = /masih kurang/.test(pesan) || /rusak/.test(pesan);
  if (pesan) {
    const teks = (kurang ? '📦⚠️ <b>BARANG DITERIMA (ADA KURANG / RUSAK)</b>' : '📦 <b>BARANG SUPPLIER DITERIMA</b>') + '\n' +
      'PO: <b>' + esc(p.no) + '</b>' + (o ? ' — ' + esc(o.sup) + ' (' + esc(o.asal) + ')' : '') + '\n' +
      'Diterima: ' + esc(p.nama) + '\n\n' + daftar(baris) + '\n\n' + esc(pesan) + (p.catatan ? '\nCatatan: ' + esc(p.catatan) : '') + '\n\n<i>' + jam() + '</i>';
    await sb.from('efek_antre').insert({ jenis: 'tg', data: { teks, asal: d.asal || null } });
  }
  // Usulan HPP (CHR_hitungTerima_ + CHR_usulkan_).
  if (tb.indexOf('TB-') !== 0) return 'ok (tanpa hitung HPP)';
  const h = await W.HppTerima.hitung(sb, tb);
  if (!h || !h.ok) return 'gagal: ' + ((h && h.pesan) || 'hitung HPP');
  const r = await sb.rpc('hpp_terima_simpan', { p_hasil: h });
  if (r.error) throw new Error('hpp_terima_simpan: ' + r.error.message);
  return 'ok (Supabase) ' + ((r.data && r.data.n) || 0) + ' usulan HPP';
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: false }, 405);
  const tanda = req.headers.get('x-moscow-robot-kunci') || '';
  const k = tanda ? await sb.from('robot_kunci').select('kunci').eq('id', 1).maybeSingle() : null;
  if (!(k && k.data && k.data.kunci === tanda)) return json({ ok: false, pesan: 'Tidak diizinkan.' }, 403);
  const r = await sb.from('efek_antre').select('id,jenis,data,dibuat').is('selesai', null).in('jenis', ['terima_po']).order('id').limit(5);
  const hasil: string[] = [];
  if (!(r.data || []).length) return json({ ok: true, hasil });
  await muatRumus();
  for (const x of r.data || []) {
    const a = await sb.from('efek_antre').update({ selesai: new Date().toISOString(), hasil: 'proses' }).eq('id', x.id).is('selesai', null).select('id');
    if (a.error || !a.data || !a.data.length) continue;
    SIMPANAN = {};
    let ket = 'ok';
    try { ket = await terimaPo(x.data || {}); } catch (e) { ket = 'gagal: ' + String((e as Error)?.message || e).slice(0, 200); }
    await sb.from('efek_antre').update({ hasil: ket }).eq('id', x.id);
    hasil.push(x.jenis + ' #' + x.id + ': ' + ket);
  }
  return json({ ok: true, hasil });
});
