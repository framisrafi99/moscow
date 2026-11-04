// =====================================================================
// Edge Function "tg-tombol" — tombol Setujui / Tolak di Telegram dijawab Supabase (pengganti file 71 Apps Script, 4 Nov 2026).
//   Dari Telegram (webhook, header X-Telegram-Bot-Api-Secret-Token):
//     - tombol "a|ID|s" (setujui) / "a|ID|t" (tolak, minta alasan lewat balasan)
//     - /daftar KODE di chat pribadi: mendaftarkan akun Telegram manajemen / Mike / Viory
//   Dari aplikasi (akun manajemen):
//     - { aksi: 'kode', peran }  : kode daftar 6 angka (30 menit)
//     - { aksi: 'pasang' }       : sambungkan webhook robot ke fungsi ini
//     - { aksi: 'cek' }          : status webhook + peran yang sudah terdaftar
// Keputusan dijalankan lewat fungsi database yang sama dengan Apps Script (tg_sisa, tg_acc).
// Pasang dengan "Verify JWT" dimatikan (Telegram tidak mengirim JWT); aplikasi diperiksa lewat peran_saya.
// =====================================================================
import { createClient } from 'npm:@supabase/supabase-js@2';

const URL_SB = Deno.env.get('SUPABASE_URL')!;
function kunciServer(): string {
  const satu = Deno.env.get('SUPABASE_SECRET_KEY');
  if (satu) return satu;
  try { const b = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}'); const k = b.default || Object.values(b)[0]; if (k) return String(k); } catch (_) { /* lanjut */ }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
}
const sb = createClient(URL_SB, kunciServer(), { auth: { persistSession: false } });
const TOKEN = (Deno.env.get('TG_TOKEN') || '').trim();
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const JENIS: Record<string, string> = { pgd: 'Pengajuan pembelian', rp: 'Request pindah stok', hu: 'Usulan HPP / harga', uji: 'Pesan uji' };
const NAMA: Record<string, string> = { manajemen: 'Manajemen Moscow Supplies', mike: 'Mike', viory: 'Viory' };
const LABEL_DAFTAR: Record<string, string> = { manajemen: 'Manajemen Moscow Supplies', mike: 'Mike', viory: 'Viory (Purchasing)' };

function json(o: unknown, status = 200) { return new Response(JSON.stringify(o), { status, headers: { ...CORS, 'Content-Type': 'application/json' } }); }
function ok() { return new Response('ok', { status: 200 }); }
function esc(s: unknown) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function t(v: unknown, n = 200) { return String(v ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n); }
function jam() { const w = new Date(Date.now() + 8 * 3600e3), p = (n: number) => ('0' + n).slice(-2); return p(w.getUTCDate()) + '/' + p(w.getUTCMonth() + 1) + ' ' + p(w.getUTCHours()) + ':' + p(w.getUTCMinutes()); }

// deno-lint-ignore no-explicit-any
async function api(metode: string, isi: any): Promise<any> {
  if (!TOKEN) return null;
  try {
    const r = await fetch('https://api.telegram.org/bot' + TOKEN + '/' + metode, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(isi || {}) });
    return await r.json();
  } catch (_) { return null; }
}
function balas(chat: number | string, mid: number, teks: string) {
  return api('sendMessage', { chat_id: chat, reply_to_message_id: mid, text: teks.slice(0, 4000), parse_mode: 'HTML', disable_web_page_preview: true });
}
// deno-lint-ignore no-explicit-any
function jawab(q: any, teks: string, alert = false) { return api('answerCallbackQuery', { callback_query_id: q.id, text: teks.slice(0, 195), show_alert: alert }); }

async function sementara(kunci: string) {
  const r = await sb.from('tg_sementara').select('data,kedaluwarsa').eq('kunci', kunci).maybeSingle();
  if (!r.data || new Date(r.data.kedaluwarsa).getTime() < Date.now()) return null;
  return r.data.data;
}
// deno-lint-ignore no-explicit-any
async function simpanSementara(kunci: string, data: any, ms: number) {
  await sb.from('tg_sementara').upsert({ kunci, data, kedaluwarsa: new Date(Date.now() + ms).toISOString() }, { onConflict: 'kunci' });
}
async function peran(uid: unknown) {
  const r = await sb.from('tg_akun').select('peran').eq('uid', String(uid ?? '')).limit(1);
  return r.data && r.data[0] ? String(r.data[0].peran) : '';
}
function boleh(p: string, jenis: string) {
  if (p === 'manajemen' || jenis === 'uji' || jenis === 'pgd') return '';
  return 'Request pindah stok dan usulan HPP / harga hanya di-ACC manajemen Moscow Supplies. Tidak ada yang diubah.';
}
// deno-lint-ignore no-explicit-any
async function cari(id: string): Promise<any> {
  // Tabel tg_acc_log (salinan sheet TG_ACC_LOG): id_sheet = kode tombol, nomor = daftar nomor, pesan = message_id.
  const r = await sb.from('tg_acc_log').select('id_sheet,jenis,nomor,chat,pesan,status').eq('id_sheet', id).order('id', { ascending: false }).limit(1);
  const d = r.data && r.data[0];
  if (!d) return null;
  return { id: String(d.id_sheet), jenis: String(d.jenis || ''), nos: String(d.nomor || '').split(',').map((s) => s.trim()).filter(Boolean),
    chat: d.chat ? String(d.chat) : '', msg: d.pesan ? String(d.pesan) : '', status: String(d.status || '') };
}
// deno-lint-ignore no-explicit-any
async function sisa(x: any): Promise<string[]> {
  if (x.jenis === 'uji') return x.status === 'Menunggu' ? [x.id] : [];
  const r = await sb.rpc('tg_sisa', { p_jenis: x.jenis, p_nos: x.nos });
  if (r.error || !Array.isArray(r.data)) throw new Error('tg_sisa: ' + (r.error?.message || '?'));
  return r.data.map(String);
}
// deno-lint-ignore no-explicit-any
async function jalankan(x: any, p: string, aksi: string, alasan: string, token: string): Promise<any> {
  if (x.jenis === 'uji') return { ok: true, pesan: 'Tombol uji berfungsi (' + (aksi === 'setuju' ? 'setujui' : 'tolak') + ' oleh ' + NAMA[p] + '). Tidak ada data yang diubah.' };
  const r = await sb.rpc('tg_acc', { p_peran: p, p_jenis: x.jenis, p_nos: x.nos, p_aksi: aksi, p_alasan: alasan, p_token: token });
  if (r.error || !r.data) return { ok: false, pesan: 'Gagal menyimpan. Coba lagi atau putuskan lewat Master Data.' };
  return r.data;
}
// deno-lint-ignore no-explicit-any
async function tutup(x: any, label: string) {
  if (!x.chat || !x.msg) return;
  await api('editMessageReplyMarkup', { chat_id: x.chat, message_id: Number(x.msg), reply_markup: { inline_keyboard: [[{ text: label, callback_data: 'x' }]] } });
}
// deno-lint-ignore no-explicit-any
async function selesai(x: any, p: string, aksi: string, alasan: string) {
  const s = x.jenis === 'uji' ? [] : await sisa(x);
  const status = s.length ? 'Sebagian' : (aksi === 'setuju' ? 'Disetujui' : 'Ditolak');
  await sb.from('tg_acc_log').update({ status, diputus_oleh: NAMA[p], waktu_putus: new Date().toISOString(), catatan: t(alasan, 300) }).eq('id_sheet', x.id);
  if (!s.length) await tutup(x, (aksi === 'setuju' ? '✅ Disetujui' : '❌ Ditolak') + ' · ' + NAMA[p] + ' · ' + jam());
}

// deno-lint-ignore no-explicit-any
async function tekan(q: any, upd: number) {
  const data = String(q.data || '');
  if (data === 'x') return jawab(q, 'Sudah diproses.');
  const m = /^a\|([A-Za-z0-9]+)\|([st])$/.exec(data);
  if (!m) return jawab(q, 'Tombol tidak dikenal.');
  const dari = q.from || {}, p = await peran(dari.id);
  if (!p) return jawab(q, 'Akun Telegram kamu tidak terdaftar untuk ACC. Tidak ada yang diubah.', true);
  const x = await cari(m[1]);
  if (!x) return jawab(q, 'Data tombol tidak ditemukan. Putuskan lewat Master Data atau halaman Persetujuan.', true);
  if (!x.chat && q.message) { x.chat = String(q.message.chat.id); x.msg = String(q.message.message_id); await sb.from('tg_acc_log').update({ chat: x.chat, pesan: x.msg }).eq('id_sheet', x.id); }
  const izin = boleh(p, x.jenis);
  if (izin) return jawab(q, izin, true);
  if (!(await sisa(x)).length) { await tutup(x, '✔️ Sudah diproses'); return jawab(q, 'Sudah diproses sebelumnya (Master Data / Telegram). Tidak ada yang diubah.', true); }
  if (m[2] === 's') {
    const r = await jalankan(x, p, 'setuju', '', 'tga' + upd);
    const b = !!(r && r.ok);
    await jawab(q, (b ? '✅ ' : '⚠️ ') + ((r && r.pesan) || 'Gagal.'), !b);
    if (b) await selesai(x, p, 'setuju', '');
    return;
  }
  if (!q.message) return jawab(q, 'Pesan aslinya tidak terbaca. Tolak lewat Master Data.', true);
  const nm = esc(t([dari.first_name, dari.last_name].join(' '), 40) || NAMA[p]);
  const r = await api('sendMessage', {
    chat_id: q.message.chat.id, reply_to_message_id: q.message.message_id, parse_mode: 'HTML',
    text: '<a href="tg://user?id=' + Number(dari.id) + '">' + nm + '</a>, <b>balas pesan ini</b> dengan alasan penolakan ' +
      esc(JENIS[x.jenis].toLowerCase()) + ' <b>' + esc(x.nos.join(', ').slice(0, 200)) + '</b>.',
    reply_markup: { force_reply: true, selective: true, input_field_placeholder: 'Alasan ditolak...' },
  });
  if (r && r.ok && r.result) {
    await simpanSementara('al|' + r.result.chat.id + '|' + r.result.message_id, { id: x.id, uid: String(dari.id), peran: p }, 6 * 3600e3);
    return jawab(q, 'Tulis alasan penolakan dengan membalas pesan robot.');
  }
  return jawab(q, 'Gagal meminta alasan. Coba lagi atau tolak lewat Master Data.', true);
}

// deno-lint-ignore no-explicit-any
async function pesan(m: any, upd: number) {
  const teks = String(m.text || '').trim(), chat = m.chat || {}, dari = m.from || {};
  if (!teks) return;
  if (chat.type === 'private' && /^\/daftar\b/i.test(teks)) return daftar(m, teks);
  if (chat.type === 'private' && /^\/start\b/i.test(teks)) return balas(chat.id, m.message_id, 'Halo! Ini robot pemberitahuan Moscow Supplies. ACC dilakukan lewat tombol di grup pemberitahuan.');
  const rt = m.reply_to_message;
  if (!rt) return;
  const k = 'al|' + chat.id + '|' + rt.message_id, a = await sementara(k);
  if (!a || String(dari.id) !== a.uid) return;
  const p = await peran(dari.id);
  if (!p || p !== a.peran) return;
  if (teks.length < 3) return balas(chat.id, m.message_id, 'Alasan terlalu pendek (minimal 3 huruf). Balas lagi pesan robot di atas.');
  await sb.from('tg_sementara').delete().eq('kunci', k);
  const x = await cari(a.id);
  if (!x) return;
  if (!(await sisa(x)).length) { await tutup(x, '✔️ Sudah diproses'); return balas(chat.id, m.message_id, 'Sudah diproses sebelumnya. Tidak ada yang diubah.'); }
  const alasan = t(teks, 180);
  const r = await jalankan(x, p, 'tolak', alasan + ' (via Telegram)', 'tga' + upd);
  const b = !!(r && r.ok);
  if (!b || x.jenis === 'uji') await balas(chat.id, m.message_id, (b ? '❌ ' : '⚠️ ') + esc((r && r.pesan) || 'Gagal.'));
  if (b) await selesai(x, p, 'tolak', alasan);
}

// deno-lint-ignore no-explicit-any
async function daftar(m: any, teks: string) {
  const chat = m.chat || {}, dari = m.from || {};
  const d = await sementara('daftar');
  if (!d || !d.kode) return balas(chat.id, m.message_id, 'Belum ada kode daftar yang berlaku. Minta kode ke manajemen Moscow Supplies.');
  const md = /^\/daftar(?:@\w+)?\s+(\d{6})$/i.exec(teks);
  if (!md || md[1] !== String(d.kode)) {
    d.salah = (Number(d.salah) || 0) + 1;
    if (d.salah >= 5) await sb.from('tg_sementara').delete().eq('kunci', 'daftar');
    else await simpanSementara('daftar', d, Math.max(60e3, Number(d.sampai) - Date.now()));
    return balas(chat.id, m.message_id, d.salah >= 5 ? 'Kode salah 5 kali. Kode dibatalkan, minta kode baru.' : 'Kode salah. Kirim: /daftar KODE (6 angka).');
  }
  await sb.from('tg_akun').upsert({ peran: d.peran, uid: String(dari.id), nama: t([dari.first_name, dari.last_name].join(' '), 60), waktu: new Date().toISOString() }, { onConflict: 'peran' });
  await sb.from('tg_sementara').delete().eq('kunci', 'daftar');
  return balas(chat.id, m.message_id, '✅ Akun ini terdaftar sebagai <b>' + esc(LABEL_DAFTAR[d.peran] || d.peran) + '</b>. Tombol Setujui / Tolak di grup pemberitahuan sekarang bisa kamu pakai.');
}

async function dariAplikasi(req: Request) {
  const pengguna = createClient(URL_SB, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } }, auth: { persistSession: false } });
  const pr = await pengguna.rpc('peran_saya');
  if (pr.error || pr.data !== 'manajemen') return json({ ok: false, pesan: 'Akses ditolak.' }, 403);
  // deno-lint-ignore no-explicit-any
  let b: any = {};
  try { b = await req.json(); } catch (_) { b = {}; }
  const rahasia = (await sementara('webhook'))?.rahasia || '';
  if (b.aksi === 'kode') {
    if (!LABEL_DAFTAR[b.peran]) return json({ ok: false, pesan: 'Peran tidak dikenal.' });
    const kode = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
    await simpanSementara('daftar', { kode, peran: b.peran, salah: 0, sampai: Date.now() + 30 * 60e3 }, 30 * 60e3);
    return json({ ok: true, kode, peran: LABEL_DAFTAR[b.peran], berlaku: '30 menit' });
  }
  if (b.aksi === 'pasang') {
    if (!TOKEN || !rahasia) return json({ ok: false, pesan: 'Token robot atau kunci webhook belum ada.' });
    const r = await api('setWebhook', { url: URL_SB + '/functions/v1/tg-tombol', secret_token: rahasia, allowed_updates: ['message', 'callback_query'], drop_pending_updates: false });
    return json({ ok: !!(r && r.ok), pesan: r && r.ok ? 'Robot Telegram tersambung ke Supabase.' : ('Telegram menolak: ' + (r?.description || '?')) });
  }
  const info = await api('getWebhookInfo', {});
  const ak = await sb.from('tg_akun').select('peran,nama,waktu');
  const u = info && info.result ? String(info.result.url || '') : '';
  return json({ ok: true, webhook: u.indexOf('/functions/v1/tg-tombol') !== -1 ? 'Supabase' : (u.indexOf('script.google') !== -1 ? 'Apps Script' : (u ? 'lain' : 'belum')),
    tertunda: info?.result?.pending_update_count ?? null, galatTerakhir: info?.result?.last_error_message || '', terdaftar: (ak.data || []).map((x) => ({ peran: x.peran, nama: x.nama })) });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ ok: false }, 405);
  const tanda = req.headers.get('x-telegram-bot-api-secret-token');
  if (!tanda) return await dariAplikasi(req);
  const rahasia = (await sementara('webhook'))?.rahasia || '';
  if (!rahasia || tanda !== rahasia) return new Response('forbidden', { status: 403 });
  // deno-lint-ignore no-explicit-any
  let u: any = null;
  try { u = await req.json(); } catch (_) { return ok(); }
  if (!u || !u.update_id) return ok();
  const ku = 'u|' + u.update_id;
  if (await sementara(ku)) return ok();
  await simpanSementara(ku, 1, 6 * 3600e3);
  try {
    if (u.callback_query) await tekan(u.callback_query, u.update_id);
    else if (u.message) await pesan(u.message, u.update_id);
  } catch (e) { console.error('tg-tombol', e); }
  return ok();
});
