// =====================================================================
// Edge Function "efek-hitung" — proses lanjutan yang butuh rumus aplikasi, dikerjakan di Supabase (pengganti SBE_JENIS_ Apps Script).
//   terima_po : Telegram "BARANG SUPPLIER DITERIMA" + usulan HPP baru (hpp-terima.js = CHR_hitungTerima_, simpan lewat hpp_terima_simpan).
//   pgd_ajukan : pengajuan pembelian staf -> cek kenaikan harga (HRG), pesan pribadi Mike (impor) / Viory (lokal), pesan grup (bertombol ACC untuk impor).
//   kb_biaya / biaya_po : biaya PO menyusul sesudah barang diterima -> usulan koreksi HPP (CHR_koreksiBiaya_, simpan lewat hpp_biaya_simpan).
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

function rp(n: unknown) { return 'Rp ' + fmt(n); }
// HRG_peta_ (file 24) versi ringan: harga beli terakhir per "Kelompok|KODE".
// deno-lint-ignore no-explicit-any
async function hrgPeta(): Promise<Record<string, any>> {
  // deno-lint-ignore no-explicit-any
  const peta: Record<string, any> = {};
  // deno-lint-ignore no-explicit-any
  const taruh = (kunci: string, rw: any[]) => { const a = rw.length ? rw[rw.length - 1] : null; if (a && a.h) peta[kunci] = { hb: a.h, tg: a.t || '', sup: a.sup || '' }; };
  const L = await W.Lembar.muat(sb, ['barang_order', 'po_log', 'po_item', 'po_biaya', 'bahan_baku_beli', 'bahan', 'bahan_masuk']);
  const fmtT = W.Lembar.format, tgl = (v: unknown) => v instanceof Date ? fmtT(v, 'yyyy-MM-dd') : (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '');
  const rapi = (v: unknown, n: number) => String(v ?? '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
  // A. Barang jualan: riwayat harga di PO (tanpa PO ditolak / batal).
  try {
    const G = W.Gudang.buat(L), po = G.po(), brg = G.barang();
    // deno-lint-ignore no-explicit-any
    const rw: Record<string, any[]> = {};
    // deno-lint-ignore no-explicit-any
    po.list.slice().sort((a: any, b: any) => a.t < b.t ? -1 : a.t > b.t ? 1 : a.ms - b.ms).forEach((o: any) => {
      if (o.st === 'Ditolak' || o.st === 'Batal') return;
      // deno-lint-ignore no-explicit-any
      o.items.forEach((it: any) => { if (it.h) (rw[it.k] = rw[it.k] || []).push({ h: it.h, t: tgl(o.t), sup: o.sup }); });
    });
    // deno-lint-ignore no-explicit-any
    brg.list.forEach((b: any) => taruh('Barang jualan|' + b.k, rw[b.k] || []));
  } catch (_) { /* sama dengan Apps Script: bagian ini dilewati */ }
  // B. Bahan baku: catatan pembelian (BBK_beli_ + BBK_isiHarga_).
  try {
    // deno-lint-ignore no-explicit-any
    const rw: Record<string, any[]> = {};
    // deno-lint-ignore no-explicit-any
    W.Lembar.baca(L, 'bahan_baku_beli', 17).forEach((r: any[]) => {
      const no = rapi(r[0], 30), k = rapi(r[2], 30).toUpperCase(), q = Number(r[4]), h = Number(r[7]);
      if (!no || !k || !(r[1] instanceof Date) || !isFinite(q)) return;
      const hh = (r[7] !== '' && isFinite(h) && h > 0) ? h : 0, hs = hh > 0 && q > 0 ? Math.round(hh / q * 100) / 100 : 0;
      if (hs) (rw[k] = rw[k] || []).push({ h: Math.round(hs), t: tgl(r[1]), sup: rapi(r[6], 60) });
    });
    Object.keys(rw).forEach((k) => taruh('Bahan baku|' + k, rw[k]));
  } catch (_) { /* lewati */ }
  // C. Botol & stiker: catatan stok masuk (harga total / qty).
  try {
    const kunci = (n: unknown) => String(n).replace(/\s+/g, ' ').trim().toLowerCase(), kmap: Record<string, string> = {};
    // deno-lint-ignore no-explicit-any
    W.Lembar.baca(L, 'bahan', 6).forEach((r: any[]) => {
      const j = /stik/i.test(String(r[0])) ? 'S' : (/botol/i.test(String(r[0])) ? 'B' : ''), n = String(r[1]).replace(/\s+/g, ' ').trim();
      if (!j || !n || kmap[kunci(n)]) return;
      kmap[kunci(n)] = String(String(r[3]).trim() || n).toUpperCase();
    });
    // deno-lint-ignore no-explicit-any
    const rw: Record<string, any[]> = {};
    // deno-lint-ignore no-explicit-any
    W.Lembar.baca(L, 'bahan_masuk', 8).forEach((r: any[]) => {
      const q = Number(r[3]), tot = Number(r[7]), k = kmap[kunci(r[2])];
      if (k && q > 0 && tot > 0) (rw[k] = rw[k] || []).push({ h: Math.round(tot / q), t: tgl(r[0]) });
    });
    Object.keys(rw).forEach((k) => taruh('Botol & stiker|' + k, rw[k]));
  } catch (_) { /* lewati */ }
  return peta;
}

// SBE_JENIS_.pgd_ajukan (file 85)
// deno-lint-ignore no-explicit-any
async function pgdAjukan(d: any): Promise<string> {
  const nos: string[] = (Array.isArray(d.nos) ? d.nos : []).map(String), p = d.p || {};
  // deno-lint-ignore no-explicit-any
  const items: any[] = (Array.isArray(p.items) ? p.items : []).filter((it: any) => it && typeof it === 'object');
  const q = await sb.from('pengadaan_ajuan').select('no,kelompok,kode,nama,perkiraan_harga_satuan,pengaju,asal_barang').in('no', nos.length ? nos : ['-']);
  if (q.error) throw new Error(q.error.message);
  // deno-lint-ignore no-explicit-any
  const idx: Record<string, any> = {};
  // deno-lint-ignore no-explicit-any
  (q.data || []).forEach((x: any) => { idx[String(x.no).trim()] = x; });
  const ket: string[] = [];
  // Harga perkiraan lebih tinggi dari harga beli terakhir -> catatan kenaikan harga (HRG_catat_).
  try {
    const peta = await hrgPeta(), naik: unknown[] = [];
    nos.forEach((no) => {
      const r = idx[no]; if (!r) return;
      const kel = String(r.kelompok || ''), k = String(r.kode || '').toUpperCase(), h = Number(r.perkiraan_harga_satuan) || 0, x = peta[kel + '|' + k];
      if (x && x.hb > 0 && h > x.hb) naik.push({ sumber: 'Pengajuan', no: String(r.no), kel, k, n: String(r.nama || ''), w: '', lama: x.hb, tgLama: x.tg, baru: h, sup: x.sup, pg: String(r.pengaju || '') });
    });
    if (naik.length) { const h = await sb.rpc('_hrg_catat', { p_naik: naik }); if (h.error) throw new Error(h.error.message); ket.push(naik.length + ' harga naik'); }
  } catch (e) { ket.push('HRG gagal: ' + String((e as Error)?.message || e).slice(0, 80)); }
  // deno-lint-ignore no-explicit-any
  const baris = (x: any) => esc(x.n || x.k || '-') + ' — ' + fmt(Number(x.q) || 0) + ' ' + esc(x.s || 'pcs');
  // deno-lint-ignore no-explicit-any
  const alasan = (x: any) => x.alasan ? '\n   <i>Alasan: ' + esc(x.alasan) + '</i>' : '';
  // Pesan pribadi Mike: pengajuan impor perlu ACC (IMP_pesanMike_).
  const imp = items.filter((it) => it.imp);
  if (imp.length) {
    let total = 0;
    const b = imp.map((it) => { const h = Number(it.h) || 0; total += (Number(it.q) || 0) * h; return baris(it) + (h ? ' × ' + rp(h) : '') + alasan(it); });
    await sb.from('efek_antre').insert({ jenis: 'pl_mike', data: { teks: '🌏 <b>PENGAJUAN IMPOR — perlu ACC</b>\n' + 'Diajukan: <b>' + esc(p.nama || '-') + '</b> (' + esc(p.bagian || '-') + ')\n\n' +
      daftar(b) + (total ? '\n\nPerkiraan nilai: <b>' + rp(total) + '</b>' : '') + '\n\nACC lewat halaman Mike › Pengadaan, atau oleh manajemen Moscow Supplies di Master Data.' + '\n\n<i>' + jam() + '</i>' } });
  }
  // Pesan pribadi Viory: barang lokal perlu ACC.
  const lok = items.filter((it) => it.imp === false);
  if (lok.length) {
    await sb.from('efek_antre').insert({ jenis: 'pl_viory', data: { teks: '🏪 <b>PENGAJUAN LOKAL — perlu ACC</b>\nDiajukan: <b>' + esc(p.nama || '-') + '</b> (' + esc(p.bagian || '-') + ')\n\n' +
      daftar(lok.map((it) => baris(it) + alasan(it))) + '\n\nACC lewat link Purchasing › ACC lokal.\n\n<i>' + jam() + '</i>' } });
  }
  // Pesan grup (SBE_pgdTeks_), bertombol Setujui / Tolak untuk barang impor.
  let total = 0;
  const b = items.map((it) => { const h = Number(it.h) || 0; total += (Number(it.q) || 0) * h; return (it.imp ? '🌏 <b>IMPOR</b> · ' : '') + baris(it) + (h ? ' × ' + rp(h) : '') + alasan(it); });
  const teks = (items.some((it) => it.imp) ? '🌏 <b>PENGAJUAN IMPOR</b> — perlu ACC manajemen Moscow Supplies / Mike\n' : '') + '🟡 <b>PENGAJUAN PEMBELIAN BARU</b>\n' +
    'Diajukan: <b>' + esc(p.nama) + '</b> (' + esc(p.bagian) + ')\n\n' + daftar(b) + (total ? '\n\nPerkiraan nilai: <b>' + rp(total) + '</b>' : '') +
    '\n\nMenunggu persetujuan manajemen Moscow Supplies / Mike (menu Pengadaan).' + '\n\n<i>' + jam() + '</i>';
  const nImp = nos.filter((no) => idx[no] && String(idx[no].asal_barang || '') === 'Impor');
  const lokal = nos.length - nImp.length;
  const tt = teks + (lokal ? '\n🏪 Barang lokal langsung dibelanjakan Viory (tanpa ACC).' : '');
  if (nImp.length) await sb.from('efek_antre').insert({ jenis: 'tg_tombol', data: { teks: tt, jenis: 'pgd', nos: nImp } });
  else await sb.from('efek_antre').insert({ jenis: 'tg', data: { teks: tt, asal: d.asal || null } });
  return 'ok (Supabase)' + (ket.length ? ' ' + ket.join(', ') : '');
}

// SBE_JENIS_.kb_biaya / biaya_po (file 85) -> CHR_koreksiBiaya_ (file 60)
// deno-lint-ignore no-explicit-any
async function biayaPo(d: any): Promise<string> {
  const po = String(d.po || d.no || '').trim(), v = Math.round(Number(d.v)) || 0;
  const h = await W.HppTerima.koreksiBiaya(sb, po, v, String(d.jenis || ''));
  if (!h || !h.ok || !h.daftar.length) return 'ok (Supabase) tanpa koreksi HPP';
  const r = await sb.rpc('hpp_biaya_simpan', { p_hasil: h });
  if (r.error) throw new Error('hpp_biaya_simpan: ' + r.error.message);
  return 'ok (Supabase) ' + ((r.data && r.data.n) || 0) + ' usulan koreksi HPP';
}
const JENIS = ['terima_po', 'kb_biaya', 'biaya_po', 'pgd_ajukan'];

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: false }, 405);
  const tanda = req.headers.get('x-moscow-robot-kunci') || '';
  const k = tanda ? await sb.from('robot_kunci').select('kunci').eq('id', 1).maybeSingle() : null;
  if (!(k && k.data && k.data.kunci === tanda)) return json({ ok: false, pesan: 'Tidak diizinkan.' }, 403);
  const r = await sb.from('efek_antre').select('id,jenis,data,dibuat').is('selesai', null).in('jenis', JENIS).order('id').limit(5);
  const hasil: string[] = [];
  if (!(r.data || []).length) return json({ ok: true, hasil });
  await muatRumus();
  for (const x of r.data || []) {
    const a = await sb.from('efek_antre').update({ selesai: new Date().toISOString(), hasil: 'proses' }).eq('id', x.id).is('selesai', null).select('id');
    if (a.error || !a.data || !a.data.length) continue;
    SIMPANAN = {};
    let ket = 'ok';
    const d = x.data || {};
    try { ket = x.jenis === 'terima_po' ? await terimaPo(d) : x.jenis === 'pgd_ajukan' ? await pgdAjukan(d) : await biayaPo(d); } catch (e) {
      ket = 'gagal: ' + String((e as Error)?.message || e).slice(0, 200);
      if (x.jenis === 'pgd_ajukan') { await sb.from('efek_antre').update({ hasil: ket }).eq('id', x.id); hasil.push(x.jenis + ' #' + x.id + ': ' + ket); continue; }
      // CHR_gagalTg_
      const apa = x.jenis === 'terima_po' ? 'Penerimaan ' + (d.tb || '') : 'Biaya PO ' + (d.po || d.no || '');
      await sb.from('efek_antre').insert({ jenis: 'tg', data: { teks: '⚠️ <b>HPP GAGAL DIHITUNG</b>\n' + esc(apa) + '\n' + esc(ket).slice(0, 300) + '\nPenerimaan / biaya tetap tersimpan. Periksa HPP barang ini di Master Data.' } });
    }
    await sb.from('efek_antre').update({ hasil: ket }).eq('id', x.id);
    hasil.push(x.jenis + ' #' + x.id + ': ' + ket);
  }
  return json({ ok: true, hasil });
});
