// =====================================================================
// Edge Function "hitung-potret" — robot hitung di Supabase, pengganti jadwal potret Apps Script (SBM_potret_ / SBH_hitung_).
// Rumusnya memakai file JavaScript aplikasi yang sama persis (dimuat dari app.moscowsupplies.com, versi yang tertulis
// di master.html), lalu hasilnya disimpan ke tabel hasil_hitung dengan kunci yang sama dengan potret Apps Script.
//
// Dipanggil:
//   - jadwal pg_cron (header x-moscow-robot-kunci = isi robot_kunci id 1), body {"simpan": true}
//   - manajemen dari aplikasi (Authorization: token login), body {"simpan": false} untuk mencocokkan dengan potret lama.
// Body: { simpan?: boolean, kunci?: string[] }  (kunci kosong = semua)
// Pasang dengan "Verify JWT" dimatikan (pemeriksaan izin ada di bawah).
// =====================================================================
import { createClient } from 'npm:@supabase/supabase-js@2';

const APP = 'https://app.moscowsupplies.com/';
const URL_SB = Deno.env.get('SUPABASE_URL')!;
function kunciServer(): string {
  const satu = Deno.env.get('SUPABASE_SECRET_KEY');
  if (satu) return satu;
  try { const banyak = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}'); const k = banyak.default || Object.values(banyak)[0]; if (k) return String(k); } catch (_) { /* lanjut */ }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
}
function kunciPublik(): string {
  const satu = Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  if (satu) return satu;
  try { const banyak = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') || '{}'); const k = banyak.default || Object.values(banyak)[0]; if (k) return String(k); } catch (_) { /* lanjut */ }
  return Deno.env.get('SUPABASE_ANON_KEY')!;
}
// Panggilan robot ditandai header x-moscow-robot: potret (peran_saya() = manajemen, SQL 122).
const sb = createClient(URL_SB, kunciServer(), { auth: { persistSession: false }, global: { headers: { 'x-moscow-robot': 'potret' } } });

const FILES = ['lembar.js', 'gudang.js', 'kp.js', 'produksi.js', 'bahanbaku.js', 'akun.js', 'md.js', 'pengadaan.js', 'robot.js', 'rpd.js',
  'dasbor.js', 'stoksemua.js', 'bagihasil.js', 'bhmd.js'];
// deno-lint-ignore no-explicit-any
const W: any = globalThis;
let versiDimuat = '';
async function muatRumus() {
  const html = await (await fetch(APP + 'master.html?robot=' + Date.now(), { cache: 'no-store' })).text();
  const versi = FILES.map((f) => { const m = html.match(new RegExp('src="' + f.replace('.', '\\.') + '\\?v=(\\d+)"')); return f + '?v=' + (m ? m[1] : '0'); });
  const tanda = versi.join(',');
  if (tanda === versiDimuat) return tanda;
  W.window = W;
  for (const f of versi) {
    const kode = await (await fetch(APP + f)).text();
    (0, eval)(kode);
  }
  versiDimuat = tanda;
  // Satu kali jalan robot: isi tiap tabel cukup dibaca sekali dari database (lembar_baca), dipakai semua rumus.
  const siapkan = W.Lembar.siapkan;
  W.Lembar.muat = async (_sb: unknown, tabel: string[]) => {
    const perlu = tabel.filter((t) => !(t in SIMPANAN));
    if (perlu.length) {
      const janji = sb.rpc('lembar_baca', { p_tabel: perlu }).then((r) => { if (r.error) throw new Error(r.error.message); return r.data || {}; });
      janji.catch(() => { /* galat dilaporkan lewat rumus yang menunggu */ });
      perlu.forEach((t) => { const p = janji.then((d: Record<string, unknown>) => d[t] || []); p.catch(() => {}); SIMPANAN[t] = p; });
    }
    const isi: Record<string, unknown> = {};
    for (const t of tabel) isi[t] = await SIMPANAN[t];
    return siapkan(isi);
  };
  return tanda;
}
let SIMPANAN: Record<string, Promise<unknown>> = {};

function json(isi: unknown, status = 200) {
  return new Response(JSON.stringify(isi), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
}
function bulanMundur(m: number) { let d = new Date(Date.now() + 8 * 3600e3); d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - m, 15)); return d.toISOString().slice(0, 7); }
function akhirBulan(b: string) { return ('0' + new Date(Number(b.slice(0, 4)), Number(b.slice(5, 7)), 0).getDate()).slice(-2); }
function jamTeks(d: Date) { const w = new Date(d.getTime() + 8 * 3600e3), p = (n: number) => ('0' + n).slice(-2); return p(w.getUTCDate()) + '/' + p(w.getUTCMonth() + 1) + '/' + w.getUTCFullYear() + ' ' + p(w.getUTCHours()) + ':' + p(w.getUTCMinutes()); }

// Kunci potret -> cara menghitung (sama dengan LANGSUNG di master-app.js). Satu fungsi boleh mengisi beberapa kunci.
type Isi = Record<string, unknown>;
const RUMUS: Record<string, () => Promise<Isi>> = {
  'md:beranda': async () => ({ 'md:beranda': await W.Akunting.berandaData(sb) }),
  'md:ringkasan': async () => ({ 'md:ringkasan': await W.MdLama.mdRingkasan(sb) }),
  'md:setuju': async () => ({ 'md:setuju': await W.MdLama.mdSetujuData(sb) }),
  'md:tanpa': async () => ({ 'md:tanpa': await W.MdLama.pgsTanpaData(sb) }),
  'md:titip': async () => { const r = await sb.rpc('ttp_pemilik_data', { p_toko: '', p_bulan: '' }); if (r.error) throw r.error; return { 'md:titip': r.data }; },
  'md:request': async () => ({ 'md:request': await W.MdLama.rpDaftar(sb) }),
  'md:pantau': async () => ({ 'md:pantau': await W.MdLama.rpPantau(sb) }),
  'md:mkt': async () => ({ 'md:mkt': await W.MdLama.mpRingkasOfficial(sb, {}) }),
  'md:mkt:lalu': async () => { const b = bulanMundur(1); return { 'md:mkt:lalu': await W.MdLama.mpRingkasOfficial(sb, { dari: b + '-01', sampai: b + '-' + akhirBulan(b) }) }; },
  'md:botol': async () => ({ 'md:botol': await W.Produksi.stokBahan(sb) }),
  'md:rbb': async () => ({ 'md:rbb': await W.BahanBaku.rencanaBahan(sb, {}) }),
  'md:pp:prod': async () => ({ 'md:pp:prod': await W.BahanBaku.pantauProduksi(sb, { jenis: 'produksi' }, 'produksi') }),
  'md:pp:bahan': async () => ({ 'md:pp:bahan': await W.BahanBaku.pantauProduksi(sb, { jenis: 'bahan' }, 'bahan') }),
  'md:acc': async () => ({ 'md:acc': await W.Akunting.akuntingLaporan(sb, { bulan: bulanMundur(0) }) }),
  'md:acc:lalu': async () => ({ 'md:acc:lalu': await W.Akunting.akuntingLaporan(sb, { bulan: bulanMundur(1) }) }),
  'md:hrgnaik': async () => ({ 'md:hrgnaik': await W.MdLama.hrgNaikData(sb) }),
  'md:hbb': async () => ({ 'md:hbb': await W.MdLama.hargaBahanBakuMaster(sb) }),
  'md:prod': async () => { const b = bulanMundur(0), kini = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10); return { 'md:prod': await W.Produksi.ambilPantau(sb, { dari: b + '-01', sampai: kini }) }; },
  'md:bbk': async () => ({ 'md:bbk': await W.BahanBaku.bahanBakuData(sb, {}) }),
  'md:rpd': async () => ({ 'md:rpd': await W.RencanaProduksi.hitung(sb) }),
  'md:barang': async () => ({ 'md:barang': await W.MdLama.mdeData(sb) }),
  'md:pengadaan': async () => ({ 'md:pengadaan': await W.RobotBeli.pgdData(sb) }),
  'md:gudang': async () => ({ 'md:gudang': await W.MdLama.gdPemilikData(sb) }),
  'md:beli:lalu': async () => ({ 'md:beli:lalu': await W.MdLama.beliLalu(sb, bulanMundur(1)) }),
  'md:bh': async () => ({ 'md:bh': await W.BagiHasilMd.hitung(sb, bulanMundur(0)) }),
  'md:bh:lalu': async () => ({ 'md:bh:lalu': await W.BagiHasilMd.hitung(sb, bulanMundur(1)) }),
  'acc:oto': async () => ({ 'acc:oto': await W.Akunting.accOto(sb) }),
  // HPP (SBH_hitung_ + KBS file 85): 'hpp' dibulatkan, 'hpp:asli' tanpa pembulatan.
  'hpp': async () => {
    const H = await W.MdLama.bahanHpp(sb), peta = H.peta(), bulat: Record<string, number> = {}, asli: Record<string, number> = {};
    Object.keys(peta).forEach((k) => { const v = Math.round(Number(peta[k]) || 0); if (v) bulat[k] = v; const a = Number(peta[k]) || 0; if (a) asli[k] = a; });
    const dibuat = jamTeks(new Date());
    return { 'hpp': { hpp: bulat, jumlah: Object.keys(bulat).length, dibuat }, 'hpp:asli': { hpp: asli, jumlah: Object.keys(asli).length, dibuat } };
  },
  // Stok semua lokasi + per lokasi (SBH_stok_), Toko Offline dengan stok per warna (TO_stok_).
  'stok:semua': async () => {
    const d = await W.StokSemua.hitung(sb);
    if (!d || !d.ok) throw new Error((d && d.pesan) || 'stok kosong');
    delete d.langsung;
    const out: Isi = { 'stok:semua': d };
    for (const l of d.lokasi) {
      const list: unknown[] = [];
      // deno-lint-ignore no-explicit-any
      d.barang.forEach((b: any) => { const q = b.q[l.id]; if (q) list.push({ k: b.k, n: b.n, kat: b.kat, q }); });
      const isi: Isi = { n: l.n, ket: l.ket, barang: list, diperbarui: d.diperbarui };
      if (/offline/i.test(l.n)) {
        const r = await sb.rpc('toko_hitung_warna', { p_toko: l.n });
        if (!r.error && r.data) { const sw: Isi = {}; Object.keys(r.data).forEach((k) => { sw[k] = (r.data[k] && r.data[k].w) || {}; }); isi.stokW = sw; }
      }
      out['stok:lokasi:' + l.n] = isi;
    }
    return out;
  },
};

// Bandingkan dua isi (abaikan jam "diperbarui"/"dibuat"/"hariIni"); hasil: daftar jalur yang berbeda (paling banyak 6).
const ABAIKAN = new Set(['diperbarui', 'dibuat', 'hariIni']);
// deno-lint-ignore no-explicit-any
function beda(a: any, b: any, jalur: string, out: string[]) {
  if (out.length >= 6) return;
  if (typeof a !== typeof b || (a === null) !== (b === null) || Array.isArray(a) !== Array.isArray(b)) { out.push(jalur + ' (jenis)'); return; }
  if (a && typeof a === 'object') {
    const ks = new Set(Object.keys(a).concat(Object.keys(b || {})));
    if (Array.isArray(a) && a.length !== b.length) { out.push(jalur + ' (jumlah ' + a.length + ' vs ' + b.length + ')'); return; }
    for (const k of ks) { if (ABAIKAN.has(k)) continue; beda(a[k], b ? b[k] : undefined, jalur + '.' + k, out); }
  } else if (a !== b) out.push(jalur);
}

async function bolehManajemen(req: Request) {
  const auth = req.headers.get('authorization') || '';
  if (!/^Bearer .+/.test(auth)) return false;
  const u = createClient(URL_SB, kunciPublik(), { auth: { persistSession: false }, global: { headers: { Authorization: auth } } });
  const r = await u.rpc('peran_saya');
  return !r.error && r.data === 'manajemen';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } });
  if (req.method !== 'POST') return json({ ok: false, pesan: 'Tidak diizinkan.' }, 405);
  const tanda = req.headers.get('x-moscow-robot-kunci') || '';
  let jadwal = false;
  if (tanda) {
    const k = await sb.from('robot_kunci').select('kunci').eq('id', 1).maybeSingle();
    jadwal = !!(k.data && k.data.kunci && k.data.kunci === tanda);
  }
  if (!jadwal && !(await bolehManajemen(req))) return json({ ok: false, pesan: 'Tidak diizinkan.' }, 403);
  let body: { simpan?: boolean; kunci?: string[]; isi?: boolean } = {};
  try { body = await req.json(); } catch (_) { /* kosong */ }
  const simpan = body.simpan === true;
  const mulai = Date.now();
  const versi = await muatRumus();
  const minta = (Array.isArray(body.kunci) && body.kunci.length ? body.kunci : Object.keys(RUMUS)).filter((k) => RUMUS[k]);
  const hasil: Record<string, unknown> = {}, isi: Isi = {};
  SIMPANAN = {};
  // Paling banyak 4 rumus bersamaan supaya memori robot cukup.
  const antre = minta.slice();
  await Promise.all([0, 1, 2, 3].map(async () => { for (let k = antre.shift(); k; k = antre.shift()) await jalankan(k); }));
  async function jalankan(k: string) {
    const t = Date.now();
    try {
      const r = await Promise.race([RUMUS[k](), new Promise<Isi>((_, gagal) => setTimeout(() => gagal(new Error('lebih dari 60 detik')), 60000))]);
      let semuaOk = true;
      Object.keys(r).forEach((kk) => { const v = r[kk] as { ok?: boolean } | null; if (!v || v.ok === false) semuaOk = false; else isi[kk] = JSON.parse(JSON.stringify(v)); });
      hasil[k] = { detik: (Date.now() - t) / 1000, ok: semuaOk, isi: Object.keys(r) };
    } catch (e) { hasil[k] = { detik: (Date.now() - t) / 1000, ok: false, galat: String((e as Error)?.message || e).slice(0, 200) }; }
  }
  SIMPANAN = {};
  const banding: Record<string, string[]> = {};
  if (!simpan) {
    const lama = await sb.from('hasil_hitung').select('kunci,data').in('kunci', Object.keys(isi));
    const peta: Isi = {}; (lama.data || []).forEach((x) => { peta[x.kunci] = x.data; });
    Object.keys(isi).forEach((k) => { const o: string[] = []; if (!(k in peta)) o.push('(belum ada potret lama)'); else beda(isi[k], peta[k], '', o); banding[k] = o; });
  } else {
    const kini = new Date().toISOString();
    const baris = Object.keys(isi).map((k) => ({ kunci: k, data: isi[k], dibuat: kini }));
    for (let i = 0; i < baris.length; i += 10) {
      const r = await sb.from('hasil_hitung').upsert(baris.slice(i, i + 10), { onConflict: 'kunci' });
      if (r.error) hasil['simpan ' + i] = { ok: false, galat: r.error.message };
    }
  }
  const detik = (Date.now() - mulai) / 1000;
  const gagal = Object.keys(hasil).filter((k) => !(hasil[k] as { ok: boolean }).ok);
  await sb.from('robot_log').insert({ jenis: simpan ? (jadwal ? 'jadwal' : 'simpan') : 'banding', detik, hasil: { versi, gagal, hasil, banding } });
  // isi: true (hanya manajemen, bukan jadwal) = kirim juga hasil hitungan, untuk dicocokkan dengan hitungan di aplikasi.
  return json({ ok: true, simpan, detik, versi, gagal, hasil, banding, isi: body.isi === true && !jadwal ? isi : undefined });
});
