// =====================================================================
// Robot Bukti Bayar Moscow (5 Nov 2026) — bagian dari Edge Function tg-tombol.
// Grup Telegram "Bukti Bayar Moscow": anggota mengirim foto / PDF / teks bukti pembayaran uang keluar.
// Robot: baca dengan AI (ANTHROPIC_API_KEY) -> cek bukti kembar -> cocokkan dengan accounting (bb_cocok)
//   - sudah ada (dari aplikasi / catatan lain): bukti ditempel (bb_tempel), tidak dicatat lagi
//   - belum ada: kartu ringkasan + tombol ✅ Catat / ✏️ Ubah / 🏦 Akun / 🏷️ Kategori / ❌ Bukan
//   - cocok dengan pengajuan / PO lokal yang BELUM dibayar: tombol ✅ Sudah dibayar (hanya pengirim) -> bb_bayar (= tombol Bayar Purchasing)
//   - Viory / Mike belanja barang: tunggu input aplikasi s.d. 3 hari (dicek tiap jam, periksaTunggu)
//   - pengajuan impor: kode I dari AI, atau (transfer tanpa rincian) centang pengajuan impor -> _impor_bayar_inti
//   - pindah dana antar akun Moscow (PT -> Belanja -> ShopeePay / Kas): dicatat Pindah (bb_catat_pindah), bukan pengeluaran
// Semua tombol hanya bisa ditekan oleh pengirim bukti.
// Perintah grup: /grup_bukti (manajemen, sekali) · /saya NAMA (tiap anggota, sekali)
// =====================================================================
import { encodeBase64 } from 'jsr:@std/encoding@1/base64';

// deno-lint-ignore no-explicit-any
type Any = any;
const AKUN = ['Rekening Belanja', 'ShopeePay', 'Kas Tunai', 'Rekening PT', 'Kas Toko Offline', 'Dana Shopee (belum cair)', 'Dana Tokopedia/TikTok (belum cair)'];
const KATEGORI = ['Pembelian bahan baku', 'Botol, stiker & kemasan', 'Pembelian barang dagang / impor', 'Ongkos kirim & ekspedisi', 'Listrik, air & internet',
  'Gaji & upah', 'Sewa tempat', 'Iklan & promosi', 'Perlengkapan & ATK', 'Transportasi & bensin', 'Pajak & perizinan', 'Pembelian aset / peralatan',
  'Biaya admin marketplace', 'Bayar pinjaman', 'Biaya lain-lain'];
const BELANJA = ['Pembelian bahan baku', 'Botol, stiker & kemasan', 'Pembelian barang dagang / impor', 'Perlengkapan & ATK'];
const ANGGOTA = ['Junior', 'Mike', 'Viory', 'Daffa', 'Ronny', 'Iqbal'];
const MODEL = (Deno.env.get('BB_MODEL') || 'claude-sonnet-5-5').trim();
const MIKE_TANYA = 10000000;   // bukti Mike >= Rp 10 juta tanpa rekening yang terlihat: robot menanyakan Rekening PT atau Rekening Belanja

function esc(s: unknown) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function t(v: unknown, n = 200) { return String(v ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n); }
function rp(n: unknown) { return 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID'); }
function hariWita(ms = Date.now()) { return new Date(ms + 8 * 3600e3).toISOString().slice(0, 10); }
function tglId(d: string | null) { return d ? d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4) : '—'; }

function akunBawaan(nama: string, nominal: number) {
  if (nama === 'Junior') return 'Rekening Belanja';
  if (nama === 'Viory') return 'ShopeePay';
  if (nama === 'Mike') return nominal >= MIKE_TANYA ? '' : 'Rekening Belanja';   // nominal besar: robot menanyakan PT atau Belanja
  return '';
}
// Siapa yang sebenarnya membayar: caption "dibayar Junior" lebih dulu, lalu nama pemilik rekening yang terbaca di bukti.
const PEMBAYAR: [RegExp, string][] = [[/\b(junior|jun|francois)\b/i, 'Junior'], [/\b(mike|michael)\b/i, 'Mike'], [/\b(viory|fiori|vio)\b/i, 'Viory'],
  [/\b(daffa|dava|dafa)\b/i, 'Daffa'], [/\b(ronny|roni|rony)\b/i, 'Ronny'], [/\biqbal\b/i, 'Iqbal']];
const RE_DIBAYAR = /dibayar(?:\s+oleh)?\s+([a-z]+)/i;
function cocokNamaOrang(s: string) { for (const [re, n] of PEMBAYAR) if (re.test(s)) return n; return ''; }
function pembayarDari(caption: string, atasNama: string) {
  const m = RE_DIBAYAR.exec(caption || '');
  return (m && cocokNamaOrang(m[1])) || cocokNamaOrang(atasNama || '');
}
function akunDariTeks(s: string) {
  s = ' ' + s.toLowerCase() + ' ';
  if (/(kas|cash|tunai) ?toko/.test(s)) return 'Kas Toko Offline';
  if (/rek(ening)?\.? ?pt\b|\bpt\b/.test(s)) return 'Rekening PT';
  if (/saldo ?penjual|saldo ?toko|dana ?shopee|seller ?balance/.test(s)) return /tiktok|tokopedia|toped/.test(s) ? 'Dana Tokopedia/TikTok (belum cair)' : 'Dana Shopee (belum cair)';
  if (/shopee ?pay|\bspay\b/.test(s)) return 'ShopeePay';
  if (/\b(cash|tunai|kas)\b/.test(s)) return 'Kas Tunai';
  if (/rek(ening)?\.? ?belanja|\btf\b|transfer|\bbca\b/.test(s)) return 'Rekening Belanja';
  return '';
}
function adaNominal(s: string) { return /(\d[\d.,]*\s*(k|rb|ribu|jt|juta)\b)|(\d{1,3}([.,]\d{3})+)|(\b\d{5,}\b)/i.test(s); }
function angka(s: string): number | null {
  const m = /(\d[\d.,]*)\s*(k|rb|ribu|jt|juta)?\b/i.exec(s.replace(/rp\.?\s*/ig, ''));
  if (!m) return null;
  let a = m[1], k = 1;
  const sat = (m[2] || '').toLowerCase();
  if (sat === 'k' || sat === 'rb' || sat === 'ribu') k = 1000; else if (sat === 'jt' || sat === 'juta') k = 1000000;
  if (k > 1) a = a.replace(',', '.'); else a = a.replace(/[.,](\d{3})/g, '$1').replace(',', '.');
  const n = Number(a) * k;
  return isFinite(n) && n > 0 ? Math.round(n) : null;
}

// Cocokkan bukti (bisa berisi beberapa barang) dengan barang yang dibayar lewat aplikasi: kombinasi 1-4 barang yang
// jumlahnya dekat dengan nominal bukti (maks. selisih 15%), diutamakan yang NAMA barangnya cocok dengan barang yang dibaca AI.
const BUKAN_KATA = new Set(['pcs', 'isi', 'set', 'dan', 'untuk', 'dengan', 'warna', 'ukuran', 'pack', 'pak', 'roll', 'liter', 'gram', 'grams', 'kg', 'ml']);
function kata(s: unknown) { return String(s ?? '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(' ').filter((w) => w.length >= 3 && !BUKAN_KATA.has(w) && !/^\d+$/.test(w)); }
function cariBarang(items: Any[], target: number, namaBukti: string[]) {
  const kb = new Set(namaBukti.flatMap(kata));
  const n = Math.min(items.length, 30), pick: Any[] = [];
  const cocokNama = (x: Any) => kata(x.n).some((w) => kb.has(w));
  let best: Any = null;
  const nilai = (sum: number, p: Any[]) => {
    const d = Math.abs(sum - target);
    if (d > target * 0.15) return;
    const skor = p.filter(cocokNama).length, semua = skor === p.length;
    if (!best || (semua && !best.semua) || (semua === best.semua && (skor > best.skor || (skor === best.skor && d < best.d)))) best = { d, sum, pick: p.slice(), skor, semua };
  };
  const rec = (start: number, sum: number) => {
    if (pick.length) nilai(sum, pick);
    if (pick.length === 4) return;
    for (let i = start; i < n; i++) {
      if (sum + Number(items[i].v) > target * 1.2) continue;
      pick.push(items[i]); rec(i + 1, sum + Number(items[i].v)); pick.pop();
    }
  };
  rec(0, 0);
  return best && best.skor > 0 ? best : null;
}

export function buatBukti(sb: Any, api: (m: string, isi: Any) => Promise<Any>, TOKEN: string, peran: (uid: unknown) => Promise<string>) {
  async function atur(kunci: string) { const r = await sb.from('bb_atur').select('nilai').eq('kunci', kunci).maybeSingle(); return r.data ? r.data.nilai : null; }
  async function anggota(uid: string) { const r = await sb.from('bb_anggota').select('nama').eq('uid', uid).maybeSingle(); return r.data ? String(r.data.nama) : ''; }
  async function sementara(k: string) {
    const r = await sb.from('tg_sementara').select('data,kedaluwarsa').eq('kunci', k).maybeSingle();
    return r.data && new Date(r.data.kedaluwarsa).getTime() > Date.now() ? r.data.data : null;
  }

  // ---------- AI ----------
  async function baca(isi: { data?: Uint8Array; mime?: string; teks: string; tglPesan: string; daftar?: Any[]; padanan?: Any[]; belum?: Any }): Promise<Any> {
    const kunci = (Deno.env.get('ANTHROPIC_API_KEY') || '').trim();
    if (!kunci) return { galat: 'kunci' };
    const daftar = (isi.daftar || []).map((x: Any, i: number) => 'B' + (i + 1) + ' = ' + t(x.n, 60) + ' · Rp ' + Math.round(Number(x.v) || 0)).join('\n');
    const bp = ((isi.belum && isi.belum.p) || []).map((x: Any, i: number) => 'P' + (i + 1) + ' = ' + t(x.n, 60) + ' · ' + x.q + ' ' + x.s + (Number(x.h) > 0 ? ' · perkiraan Rp ' + Math.round(Number(x.h)) + '/' + x.s : '')).join('\n');
    const bi = ((isi.belum && isi.belum.i) || []).map((x: Any, i: number) => 'I' + (i + 1) + ' = ' + t(x.n, 60) + ' · ' + x.q + ' ' + x.s + (Number(x.h) > 0 ? ' · perkiraan Rp ' + Math.round(Number(x.h)) + '/' + x.s : '')).join('\n');
    const bo = ((isi.belum && isi.belum.o) || []).map((x: Any, i: number) => 'O' + (i + 1) + ' = PO ' + x.no + ' ' + t(x.sup, 40) + ' · total Rp ' + x.tot).join('\n');
    const pdn = (isi.padanan || []).map((x: Any) => '"' + t(x.nota, 60) + '" = "' + t(x.sistem, 60) + '"').join('; ');
    const perintah ='Kamu membaca bukti pengeluaran uang perusahaan Moscow Supplies (PT Toentoenan Langkah Elohim, Bali). Hari ini ' + isi.tglPesan +
      ' (WITA); bukti dikirim hari ini, jadi tahun yang tidak tertulis = tahun ini.\n' +
      (isi.teks ? 'Caption / pesan pengirim: "' + isi.teks + '"\n' : '') +
      'Jawab HANYA dengan JSON (tanpa teks lain):\n' +
      '{"bukti":true|false, "belum_bayar":true|false, "nominal":angka total yang dibayar (rupiah, bulat), "tanggal":"YYYY-MM-DD" atau null, ' +
      '"penerima":"toko / penerima", "ringkasan":"apa yang dibayar, singkat, maks 110 huruf, bahasa Indonesia", "kategori":"salah satu kategori", ' +
      '"sumber":"Rekening Belanja|Rekening PT|ShopeePay|Kas Tunai|Dana Shopee (belum cair)|Dana Tokopedia/TikTok (belum cair)|" , "ref":"nomor referensi / no pesanan atau \\"\\"", "barang":[{"nama":"nama barang","total":angka}], "sistem":[{"kode":"B1|P1|I1|O1","nota":"nama barang di bukti","total":angka}], "pindah":null atau {"dari":"akun asal","ke":"akun tujuan","biaya":angka biaya admin}, ' +
      '"jenis_bayar":"transfer_bank|shopeepay|tunai|lainnya|", "atas_nama":"nama pemilik rekening / akun yang MEMBAYAR (pengirim uang) kalau terlihat, atau \\"\\"", "yakin":0-1}\n' +
      'jenis_bayar: transfer_bank = transfer / m-banking / virtual account / QRIS dari rekening bank; shopeepay = pesanan Shopee / saldo ShopeePay (kecuali terlihat dibayar dengan transfer bank / VA); ' +
      'tunai = nota / struk tanpa info pembayaran non-tunai atau tertulis cash; "" kalau tidak jelas. atas_nama = nama PENGIRIM uang (bukan penerima). ' +
      'Aturan: bukti=true kalau ini bukti pembayaran / nota / struk / transfer / pesanan yang sudah dibayar, atau pesan teks yang melaporkan pengeluaran. ' +
      'belum_bayar=true kalau ini pesanan / invoice / sales order / COD / tagihan yang belum lunas. ' +
      'nominal = total yang benar-benar dibayar (termasuk ongkir & biaya admin), bukan harga satuan; kalau ada beberapa pesanan, jumlahkan semuanya. ' +
      'barang = daftar barang / pesanan yang terlihat (maks 10) dengan total masing-masing; kosongkan [] kalau tidak ada rincian. ' +
      'sumber: rekening BCA 613-0358401 atau 613-0**-**01 = Rekening Belanja; rekening 770-0875355 atau TOENTOENAN LANGKAH ELOHI = Rekening PT; ' +
      'Saldo ShopeePay / ShopeePay = ShopeePay; Metode Pembayaran "Saldo Penjual" di Shopee Seller Centre (saldo toko Moscow Supplies) = Dana Shopee (belum cair); ' +
      'dibayar dari saldo toko / saldo penjual TikTok Shop atau Tokopedia = Dana Tokopedia/TikTok (belum cair); kalau tidak terlihat isi "". ' +
      'Isi saldo / top up iklan (Iklan Shopee, Iklan Eksternal Shopee / Meta, TikTok Ads) = kategori Iklan & promosi dan BUKAN pindah dana; nominal = Total Pembayaran (termasuk PPN). ' +
      'kategori pilih tepat salah satu: ' + KATEGORI.join(' | ') + '. ' +
      'Contoh: listrik/token PLN/air/wifi = Listrik, air & internet; servis AC/konsumsi/uang operasional = Biaya lain-lain; botol/stiker/kemasan/plastik = Botol, stiker & kemasan; ' +
      'bahan kimia/cat sablon/lem = Pembelian bahan baku; gaji DW/upah = Gaji & upah; ongkir/grab/kargo = Ongkos kirim & ekspedisi.\n' +
      'pindah = isi HANYA kalau uang dipindahkan ANTAR akun milik Moscow sendiri (bukan bayar ke orang / toko lain). Akun Moscow: ' +
      'Rekening PT (BCA 770-0875355, a.n. TOENTOENAN LANGKAH ELOHIM), Rekening Belanja (BCA 613-0358401 / 613-0**-**01), ShopeePay (top up / isi saldo ShopeePay), ' +
      'Kas Tunai (kas kantor / tarik tunai), Kas Toko Offline, Dana Shopee (belum cair) (saldo penjual Shopee), Dana Tokopedia/TikTok (belum cair). Penarikan saldo penjual ke rekening = pindah dari akun Dana itu. Contoh: transfer PT -> rekening belanja = {"dari":"Rekening PT","ke":"Rekening Belanja"}; ' +
      'top up ShopeePay dari BCA = {"dari":"Rekening Belanja","ke":"ShopeePay"}; tarik tunai untuk kas kantor = {"dari":"Rekening Belanja","ke":"Kas Tunai"}. ' +
      'Untuk pindah: nominal = jumlah yang dipindahkan TANPA biaya admin, biaya = biaya admin / biaya transfer (0 kalau tidak ada); kalau akun asal tidak terlihat isi "dari":"". Selain itu "pindah":null.' +
      ((daftar || bp || bi || bo) ?'\n\nNama barang di sistem bisa berbeda dengan nama di toko / nota.' +
        (daftar ? '\nB = barang yang SUDAH dibayar lewat aplikasi beberapa hari ini (harga = total per barang termasuk ongkir):\n' + daftar : '') +
        (bp ? '\nP = pengajuan pembelian yang BELUM dibayar:\n' + bp : '') +
        (bi ? '\nI = pengajuan IMPOR yang sudah di-ACC dan BELUM dibayar (total di sistem dalam rupiah):\n' + bi : '') +
        (bo ? '\nO = PO supplier lokal yang BELUM dibayar:\n' + bo : '') +
        (pdn ? '\nPadanan nama yang pernah dikonfirmasi (nota = sistem): ' + pdn : '') +
        '\nsistem = untuk SETIAP barang di bukti yang sama dengan salah satu baris B / P / I / O di atas, isi {"kode":"B2 / P3 / I1 / O1","nota":"nama barang di bukti","total":total rupiah barang itu di bukti}. ' +
        'total per barang = harga barang itu + bagiannya dari ongkir / biaya admin / diskon pesanannya (dibagi sebanding harga), sehingga jumlah semua total = nominal. ' +
        'Cocokkan dari arti nama (jenis, ukuran, warna), jumlah dan harga, bukan dari ejaan. Satu kode hanya sekali. Jangan memasangkan kalau ragu. Kalau tidak ada yang sama, "sistem":[].' : '\nsistem = [].');
    // deno-lint-ignore no-explicit-any
    const konten: any[] = [];
    if (isi.data && isi.mime) {
      const b64 = encodeBase64(isi.data);
      if (isi.mime === 'application/pdf') konten.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } });
      else konten.push({ type: 'image', source: { type: 'base64', media_type: isi.mime, data: b64 } });
    }
    konten.push({ type: 'text', text: perintah });
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'x-api-key': kunci, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: MODEL, max_tokens: 2000, messages: [{ role: 'user', content: konten }] }),
      });
      const j = await r.json();
      if (!r.ok) return { galat: 'ai', pesan: t(j?.error?.message || r.status, 160) };
      const teks = String((j.content || []).map((c: Any) => c.text || '').join(''));
      const a = teks.indexOf('{'), z = teks.lastIndexOf('}');
      if (a > -1 && z > a) { try { return JSON.parse(teks.slice(a, z + 1)); } catch (_) { /* di bawah */ } }
      console.error('bb ai', j.stop_reason, teks.slice(0, 400));
      return { galat: 'ai', pesan: 'jawaban tidak terbaca' };
    } catch (e) { return { galat: 'ai', pesan: t((e as Error)?.message || e, 160) }; }
  }

  // ---------- kartu ----------
  function kartu(b: Any): { text: string; markup: Any } {
    const r = b.baca || {};
    if (r.tandai) {
      const td = r.tandai, cb = (op: string) => 'b|' + b.id + '|' + op;
      let ht = '🧾 <b>Bukti dari ' + esc(b.pengirim) + '</b> · ' + rp(b.nominal) + ' · ' + tglId(b.tanggal) +
        '\n✅ Uangnya <b>sudah tercatat</b>: ' + esc(td.tr.join(', ')) + (td.cocok && td.cocok.sumber ? ' (' + esc(td.cocok.sumber) + ')' : '') +
        '\n\n⚠️ <b>Tapi pengajuan ini masih berstatus belum dibayar</b> (nota → sistem):';
      td.p.forEach((x: Any) => { ht += '\n• ' + (x.nota && x.nota.toLowerCase() !== String(x.n).toLowerCase() ? esc(x.nota) + ' → ' : '') + '<b>' + esc(x.no) + ' ' + esc(x.n) + '</b> · ' + x.q + ' ' + esc(x.s) + ' · ' + rp(x.t); });
      ht += '\n\n<i>' + esc(b.pengirim) + ', tekan ✅ Tandai sudah dibayar. Pengajuan berstatus dibayar dan ditautkan ke ' + esc(td.tr.join(', ')) + ' — uang TIDAK dicatat lagi.</i>';
      return { text: ht, markup: { inline_keyboard: [[{ text: '✅ Tandai sudah dibayar', callback_data: cb('t') }], [{ text: '❌ Bukan pengajuan ini', callback_data: cb('n') }]] } };
    }
    if (r.pindah) {
      const pd = r.pindah, cb = (op: string) => 'b|' + b.id + '|' + op;
      let hp = '🔁 <b>Pindah dana dari ' + esc(b.pengirim) + '</b>\n💸 <b>' + (b.nominal ? rp(b.nominal) : 'nominal belum terbaca') + '</b> · ' + tglId(b.tanggal) +
        '\n🏦 ' + (pd.dari ? '<b>' + esc(pd.dari) + '</b>' : '❓ <b>akun asal?</b> (tekan 🏦 Dari)') + ' → <b>' + esc(pd.ke) + '</b>' +
        (r.pembayar && r.pembayar !== b.pengirim ? '\n👤 Dibayar <b>' + esc(r.pembayar) + '</b> (bukti dikirim ' + esc(b.pengirim) + ')' : '') +
        (pd.biaya ? '\n🧾 Biaya admin ' + rp(pd.biaya) + ' <i>(dicatat sebagai pengeluaran dari ' + esc(pd.dari || 'akun asal') + ')</i>' : '') +
        '\n\n<i>Uang pindah antar akun Moscow, bukan pengeluaran. Kalau benar, ' + esc(b.pengirim) + ' tekan ✅ Catat pindah dana.</i>';
      if (b.catatan) hp += '\n\n<i>' + esc(b.catatan) + '</i>';
      return { text: hp, markup: { inline_keyboard: [
        (pd.dari ? [{ text: '✅ Catat pindah dana', callback_data: cb('P') }] : []).concat([{ text: '✏️ Ubah', callback_data: cb('u') }]),
        [{ text: '🏦 Dari', callback_data: cb('d') }, { text: '🏦 Ke', callback_data: cb('e') }],
        [{ text: '📝 Ini pengeluaran', callback_data: cb('g') }, { text: '❌ Bukan', callback_data: cb('x') }]] } };
    }
    let h ='🧾 <b>Bukti dari ' + esc(b.pengirim) + '</b>\n💸 <b>' + (b.nominal ? rp(b.nominal) : 'nominal belum terbaca') + '</b> · ' + tglId(b.tanggal) +
      '\n📝 ' + esc(b.keterangan || '-') + '\n🏷️ ' + esc(b.kategori || '-') + '\n🏦 ' + (b.akun ? esc(b.akun) : '❓ <b>akun bayar belum dipilih</b> (pilih di bawah)') +
      (r.pembayar && r.pembayar !== b.pengirim ? '\n👤 Dibayar <b>' + esc(r.pembayar) + '</b> (bukti dikirim ' + esc(b.pengirim) + ')' : '');
    if (r.belum_bayar) h += '\n\n⚠️ <i>Sepertinya ini pesanan / tagihan yang belum lunas. Catat hanya kalau sudah dibayar.</i>';
    if (r.bukti === false) h += '\n\n⚠️ <i>Sepertinya bukan bukti pembayaran. Abaikan kalau memang bukan.</i>';
    if (r.rencana && r.rencana.calon) h += '\n\n🌏 <b>Pengajuan impor yang menunggu dibayar</b> — centang yang dibayar dengan bukti ini' +
      ' <i>(total bukti dibagi sebanding perkiraan harga)</i>:' + (r.rencana.i.length ? teksRencana(r.rencana) + '\n\n<i>Kalau benar, ' + esc(b.pengirim) + ' tekan ✅ Sudah dibayar.</i>' : '\n<i>Belum ada yang dicentang.</i>');
    else if (r.rencana) h += '\n\n🛒 <b>Pengajuan yang dibayar dengan bukti ini</b> (nota → sistem):' + teksRencana(r.rencana) +
      (r.rencana.kurang ? '' :'\n\n<i>Kalau benar, ' + esc(b.pengirim) + ' tekan ✅ Sudah dibayar. Pengajuan langsung berstatus dibayar dan tercatat di accounting.</i>');
    if (r.kandidat) h +='\n\n🔎 <b>Mungkin sudah tercatat</b> dari belanja lewat aplikasi (nota → sistem):' + barisPasang(r.kandidat) + '\n= ' + rp(r.kandidat.sum) +
      ' (' + esc(r.kandidat.tr.join(', ')) + ')' + (r.kandidat.beda ? ', selisih ' + rp(Math.abs(r.kandidat.beda)) : '') + '\n<i>Kalau sama, tekan 📎 Sudah tercatat.</i>';
    if (b.status === 'tunggu') h += '\n\n⏳ <i>Belum ada di aplikasi. Kalau ini belanja dari pengajuan, input dulu di aplikasi (Bayar di Purchasing / bayar PO) — bukti ditempel otomatis. Kalau bukan, tekan ✅ Catat.</i>';
    if (b.catatan) h += '\n\n<i>' + esc(b.catatan) + '</i>';
    const id = b.id;
    let rows: Any[];
    const atas = r.kandidat ? [[{ text: '📎 Sudah tercatat', callback_data: 'b|' + id + '|s' }]] : [];
    if (!b.akun) {
      rows = [AKUN.slice(0, 3).map((a, i) => ({ text: a, callback_data: 'b|' + id + '|A|' + i })), AKUN.slice(3, 5).map((a, i) => ({ text: a, callback_data: 'b|' + id + '|A|' + (i + 3) })),
        [{ text: 'Saldo Shopee', callback_data: 'b|' + id + '|A|5' }, { text: 'Saldo TikTok/Tokopedia', callback_data: 'b|' + id + '|A|6' }],
        [{ text: '✏️ Ubah', callback_data: 'b|' + id + '|u' }, { text: '❌ Bukan', callback_data: 'b|' + id + '|x' }]];
    } else if (r.rencana) {
      const rc = r.rencana, centang = rc.calon ? rc.calon.map((x: Any, k: number) => [{ text: (rc.pilih.indexOf(x.no) > -1 ? '☑️ ' : '⬜ ') + t(x.no + ' ' + x.n, 44), callback_data: 'b|' + id + '|I|' + k }]) : [];
      const bisa = !rc.kurang && (!rc.calon || rc.i.length > 0);
      rows = centang.concat([(bisa ? [{ text: '✅ Sudah dibayar', callback_data: 'b|' + id + '|p' }] : []).concat([{ text: '✏️ Ubah', callback_data: 'b|' + id + '|u' }]),
        [{ text: '🏦 Akun', callback_data: 'b|' + id + '|a' }, { text: '📝 Catat biasa', callback_data: 'b|' + id + '|c' }, { text: '❌ Bukan', callback_data: 'b|' + id + '|x' }]]);
    } else {
      rows = [[{ text: '✅ Catat', callback_data: 'b|' + id + '|c' }, { text: '✏️ Ubah', callback_data: 'b|' + id + '|u' }],
        [{ text: '🏦 Akun', callback_data: 'b|' + id + '|a' }, { text: '🏷️ Kategori', callback_data: 'b|' + id + '|k' }, { text: '❌ Bukan', callback_data: 'b|' + id + '|x' }]];
    }
    return { text: h, markup: { inline_keyboard: atas.concat(rows) } };
  }
  async function tampil(b: Any, selesai?: string) {
    if (!b.robot_msg) return;
    if (selesai) {
      await api('editMessageText', { chat_id: b.chat, message_id: b.robot_msg, text: selesai, parse_mode: 'HTML', disable_web_page_preview: true });
      return;
    }
    const k = kartu(b);
    await api('editMessageText', { chat_id: b.chat, message_id: b.robot_msg, text: k.text, parse_mode: 'HTML', reply_markup: k.markup, disable_web_page_preview: true });
  }
  async function ambil(id: number) { const r = await sb.from('bb_bukti').select('*').eq('id', id).maybeSingle(); return r.data; }
  async function ubah(id: number, isi: Any) { await sb.from('bb_bukti').update({ ...isi, diubah: new Date().toISOString() }).eq('id', id); return await ambil(id); }

  function teksCocok(c: Any) {
    return '✅ <b>Sudah tercatat</b> — ' + esc(c.no.join(', ')) + ' (' + esc(c.t) + ', ' + esc(c.sumber) + ') · ' + rp(c.v) +
      (c.beda ? ' <i>(selisih ' + rp(Math.abs(c.beda)) + ')</i>' : '') + '\n📎 Bukti dilampirkan, tidak dicatat dua kali.';
  }

  // ---------- padanan nama barang: nota / toko -> nama di sistem ----------
  function barisPasang(kd: Any) {
    const ps = Array.isArray(kd.pasang) && kd.pasang.length ? kd.pasang : (kd.n || []).map((n: string) => ({ sistem: n }));
    return ps.map((p: Any) => '\n• ' + (p.nota && p.nota.toLowerCase() !== String(p.sistem).toLowerCase() ? esc(p.nota) + ' → ' : '') + '<b>' + esc(p.sistem) + '</b>' + (p.v ? ' · ' + rp(p.v) : '')).join('');
  }
  async function simpanPadanan(ps: Any[]) {
    const rows = (Array.isArray(ps) ? ps : []).filter((p: Any) => p && p.nota && p.sistem && String(p.nota).toLowerCase() !== String(p.sistem).toLowerCase())
      .map((p: Any) => ({ nota: t(p.nota, 80), sistem: t(p.sistem, 80), waktu: new Date().toISOString() }));
    if (rows.length) await sb.from('bb_padanan').upsert(rows, { onConflict: 'nota,sistem' });
  }
  async function barangSistem(tgl: string) { const br = await sb.rpc('bb_barang', { p_tanggal: tgl }); return Array.isArray(br.data) ? br.data.slice(0, 30) : []; }
  async function padananUntuk(items: Any[]) {
    if (!items.length) return [];
    const r = await sb.from('bb_padanan').select('nota,sistem').in('sistem', Array.from(new Set(items.map((x: Any) => String(x.n))))).order('waktu', { ascending: false }).limit(40);
    return r.data || [];
  }
  // Pasangan dari AI (kode Bn) dulu; kalau tidak ada / jumlahnya jauh, cadangan: kombinasi harga + kata nama.
  function cocokBarang(r: Any, items: Any[], nominal: number, teks: string) {
    let h: Any = null;
    const pasang: Any[] = [];
    for (const s of (Array.isArray(r.sistem) ? r.sistem : [])) {
      const mk = /^B(\d+)$/i.exec(String((s && s.kode) || '').trim());
      const it = mk ? items[Number(mk[1]) - 1] : null;
      if (it && !pasang.some((p) => p.it === it)) pasang.push({ it, nota: t(s.nota, 60) });
    }
    if (pasang.length) {
      const sum = pasang.reduce((a, p) => a + Number(p.it.v), 0);
      h = { pick: pasang.map((p) => p.it), sum, d: Math.abs(sum - nominal), semua: true, pasang: pasang.map((p) => ({ nota: p.nota, sistem: p.it.n, v: Number(p.it.v) })) };
    }
    if (!h || h.d > nominal * 0.15) {
      const namaBukti = (Array.isArray(r.barang) ? r.barang.map((x: Any) => String((x && x.nama) || '')) : []).concat([String(r.ringkasan || ''), teks]);
      const c = cariBarang(items, nominal, namaBukti);
      if (c) h = { ...c, pasang: c.pick.map((x: Any) => ({ nota: '', sistem: x.n, v: Number(x.v) })) };
    }
    if (!h || h.d > nominal * 0.15) return null;
    const tr = Array.from(new Set(h.pick.map((x: Any) => String(x.tr)))) as string[];
    return { yakin: !!h.semua && h.d <= Math.max(5000, nominal * 0.01),
      kd: { tr, pg: h.pick.map((x: Any) => x.pg), n: h.pick.map((x: Any) => x.n), sum: h.sum, beda: h.sum - nominal, pasang: h.pasang } };
  }

  // Rencana bayar: barang di bukti yang cocok dengan pengajuan BELUM dibayar (P) / PO lokal (O); B = yang sudah tercatat.
  function rencanaBayar(r: Any, belum: Any, items: Any[], nominal: number) {
    const P = (belum && belum.p) || [], I = (belum && belum.i) || [], O = (belum && belum.o) || [];
    const p: Any[] = [], im: Any[] = [], o: Any[] = [], bTr: string[] = [], bPs: Any[] = [], notaPakai: string[] = [];
    const baris = (x: Any, tot: number, nota: string) => ({ no: x.no, n: x.n, q: Number(x.q), s: x.s, t: tot > 0 ? tot : Math.round(Number(x.h) * Number(x.q)), nota });
    for (const s of (Array.isArray(r.sistem) ? r.sistem : [])) {
      const m = /^([BPIO])(\d+)$/i.exec(String((s && s.kode) || '').trim()); if (!m) continue;
      const i = Number(m[2]) - 1, jn = m[1].toUpperCase(), nota = t(s.nota, 60), tot = Math.round(Number(s.total) || 0);
      if (jn === 'P' && P[i] && !p.some((x) => x.no === P[i].no)) p.push(baris(P[i], tot, nota));
      else if (jn === 'I' && I[i] && !im.some((x) => x.no === I[i].no)) im.push(baris(I[i], tot, nota));
      else if (jn === 'O' && O[i] && !o.some((x) => x.no === O[i].no)) o.push({ no: O[i].no, sup: O[i].sup, tot: Number(O[i].tot), nota });
      else if (jn === 'B' && items[i] && bTr.indexOf(String(items[i].tr)) === -1) { bTr.push(String(items[i].tr)); bPs.push({ nota, sistem: items[i].n, v: Number(items[i].v) }); }
      else continue;
      notaPakai.push(nota.toLowerCase());
    }
    if (!p.length && !im.length && !o.length) return null;
    const tol = Math.max(5000, nominal * 0.01), bagi = p.concat(im);
    let sisa = nominal - bPs.reduce((a, x) => a + x.v, 0) - o.reduce((a, x) => a + x.tot, 0) - bagi.reduce((a, x) => a + x.t, 0);
    if (bagi.length && Math.abs(sisa) <= tol && sisa !== 0) {   // selisih kecil (ongkir / pembulatan): dibagi ke barang pengajuan sebanding harga
      const dasar = bagi.reduce((a, x) => a + x.t, 0) || 1; let pakai = 0;
      bagi.forEach((x, k) => { const tambah = k === bagi.length - 1 ? sisa - pakai : Math.round(sisa * x.t / dasar); x.t += tambah; pakai += tambah; });
      sisa = 0;
    }
    const sisaKet = (Array.isArray(r.barang) ? r.barang : []).map((x: Any) => t(x && x.nama, 40)).filter((n: string) => n && !notaPakai.some((u) => u.indexOf(n.toLowerCase().slice(0, 12)) > -1)).join(', ');
    return { toko: t(r.penerima, 60), p, i: im, o, b: bTr, bps: bPs, sisa: sisa > tol ? Math.round(sisa) : 0, sisa_ket: t(sisaKet, 120), kurang: sisa < -tol ? Math.round(-sisa) : 0 };
  }
  // Bukti impor biasanya hanya transfer (tanpa rincian barang): tampilkan pengajuan impor yang menunggu dibayar untuk dicentang.
  function pilihImpor(r: Any, belum: Any) {
    const calon = ((belum && belum.i) || []).slice(0, 8).map((x: Any) => ({ no: x.no, n: x.n, q: Number(x.q), s: x.s, h: Number(x.h) || 0 }));
    return calon.length ? { toko: t(r.penerima, 60), p: [], i: [], o: [], b: [], bps: [], sisa: 0, sisa_ket: '', kurang: 0, calon, pilih: [] } : null;
  }
  // total bukti dibagi ke pengajuan impor yang dicentang, sebanding perkiraan harga x qty
  function hitungImpor(rc: Any, nominal: number) {
    const dipilih = rc.calon.filter((x: Any) => rc.pilih.indexOf(x.no) > -1);
    const bobot = dipilih.map((x: Any) => (x.h > 0 ? x.h * x.q : 0));
    const jb = bobot.reduce((a: number, x: number) => a + x, 0);
    let pakai = 0;
    rc.i = dipilih.map((x: Any, k: number) => {
      const v = k === dipilih.length - 1 ? nominal - pakai : Math.round(nominal * (jb > 0 ? bobot[k] / jb : 1 / dipilih.length));
      pakai += v; return { no: x.no, n: x.n, q: x.q, s: x.s, t: v, nota: '' };
    });
    return rc;
  }
  function pindahValid(pd: Any, nama: string) {
    if (!pd || typeof pd !== 'object') return null;
    const ke = AKUN.indexOf(String(pd.ke)) > -1 ? String(pd.ke) : '';
    let dari = AKUN.indexOf(String(pd.dari)) > -1 ? String(pd.dari) : '';
    if (!ke) return null;
    if (!dari) dari = ke === 'Rekening Belanja' ? 'Rekening PT' : akunBawaan(nama, 0);
    if (dari === ke) dari = '';
    return { dari, ke, biaya: Math.max(0, Math.round(Number(pd.biaya) || 0)) };
  }
  function teksRencana(rc: Any) {
    let h = '';
    (rc.i || []).forEach((x: Any) => { h += '\n• 🌏 ' + (x.nota && x.nota.toLowerCase() !== String(x.n).toLowerCase() ? esc(x.nota) + ' → ' : '') + '<b>' + esc(x.no) + ' ' + esc(x.n) + '</b> · ' + x.q + ' ' + esc(x.s) + ' · ' + rp(x.t); });
    rc.p.forEach((x: Any) => { h += '\n• ' + (x.nota && x.nota.toLowerCase() !== String(x.n).toLowerCase() ? esc(x.nota) + ' → ' : '') + '<b>' + esc(x.no) + ' ' + esc(x.n) + '</b> · ' + x.q + ' ' + esc(x.s) + ' · ' + rp(x.t); });
    rc.o.forEach((x: Any) => { h += '\n• ' + (x.nota ? esc(x.nota) + ' → ' : '') + '<b>PO ' + esc(x.no) + ' ' + esc(x.sup) + '</b> · ' + rp(x.tot); });
    (rc.bps || []).forEach((x: Any) => { h += '\n• ' + esc(x.nota || '') + ' → <b>' + esc(x.sistem) + '</b> · ' + rp(x.v) + ' <i>(sudah tercatat, ' + esc(rc.b.join(', ')) + ')</i>'; });
    if (rc.sisa) h += '\n• <i>di luar pengajuan' + (rc.sisa_ket ? ': ' + esc(rc.sisa_ket) : '') + '</i> · ' + rp(rc.sisa) + ' <i>(dicatat terpisah)</i>';
    if (rc.kurang) h += '\n\n⚠️ <b>Total pengajuan lebih besar ' + rp(rc.kurang) + ' dari nota.</b> Cek dulu; kalau ada yang belum dibeli, tekan ✏️ Ubah atau bayar lewat aplikasi.';
    return h;
  }

  // ---------- proses satu bukti ----------
  async function proses(m: Any) {
    const chat = m.chat, dari = m.from || {}, uid = String(dari.id);
    const nama = (await anggota(uid)) || t([dari.first_name, dari.last_name].join(' '), 40) || 'Anggota';
    const terdaftar = !!(await anggota(uid));
    const teks = t(m.caption || m.text || '', 300);
    let fileId = '', mime = '', jenis = 'teks';
    if (m.photo && m.photo.length) { fileId = m.photo[m.photo.length - 1].file_id; mime = 'image/jpeg'; jenis = 'foto'; }
    else if (m.document) {
      const mt = String(m.document.mime_type || '');
      if (mt === 'application/pdf' || /^image\/(jpeg|png|webp|gif)$/.test(mt)) { fileId = m.document.file_id; mime = mt; jenis = mt === 'application/pdf' ? 'pdf' : 'foto'; }
      else return;
      if (Number(m.document.file_size) > 8 * 1024 * 1024) return api('sendMessage', { chat_id: chat.id, reply_to_message_id: m.message_id, text: '⚠️ File terlalu besar (maks 8 MB). Kirim sebagai foto.' });
    }
    const tglPesan = hariWita(Number(m.date) * 1000);
    const ins = await sb.from('bb_bukti').insert({ chat: String(chat.id), msg: m.message_id, uid, pengirim: nama, file_id: fileId || null, file_jenis: jenis, caption: teks || null, status: 'baru' }).select('id').single();
    if (ins.error) { console.error('bb insert', ins.error); return; }
    const id = ins.data.id;
    const tunggu = await api('sendMessage', { chat_id: chat.id, reply_to_message_id: m.message_id, text: '⏳ Membaca bukti…' + (terdaftar ? '' : '\n<i>Ketik /saya NAMA sekali (Junior / Mike / Viory / Daffa / Ronny / Iqbal) supaya robot mengenali kamu.</i>'), parse_mode: 'HTML' });
    const robotMsg = tunggu && tunggu.ok ? tunggu.result.message_id : null;
    await sb.from('bb_bukti').update({ robot_msg: robotMsg }).eq('id', id);

    // unduh & arsipkan
    let data: Uint8Array | undefined;
    if (fileId) {
      const f = await api('getFile', { file_id: fileId });
      if (f && f.ok) {
        const res = await fetch('https://api.telegram.org/file/bot' + TOKEN + '/' + f.result.file_path);
        if (res.ok) {
          data = new Uint8Array(await res.arrayBuffer());
          const ext = mime === 'application/pdf' ? 'pdf' : (mime.split('/')[1] || 'jpg');
          const jalur = tglPesan.slice(0, 7) + '/' + id + '.' + ext;
          const u = await sb.storage.from('bukti-bayar').upload(jalur, data, { contentType: mime, upsert: true });
          if (!u.error) await sb.from('bb_bukti').update({ berkas: jalur }).eq('id', id);
        }
      }
      if (!data) { await tampil({ chat: String(chat.id), robot_msg: robotMsg }, '⚠️ Foto tidak bisa diunduh dari Telegram. Kirim ulang ya.'); await ubah(id, { status: 'gagal' }); return; }
    }
    const items = await barangSistem(tglPesan);
    const belum = (await sb.rpc('bb_belum_bayar')).data || { p: [], o: [] };
    const r = await baca({ data, mime, teks, tglPesan, daftar: items, padanan: await padananUntuk(items), belum });
    if (r.galat) {
      const p = r.galat === 'kunci' ? '⚠️ Robot belum bisa membaca bukti: kunci AI belum dipasang di server. Bukti tersimpan, nanti dibaca ulang.' : (m.ulang ? '⚠️ Bukti tetap belum terbaca setelah dibaca ulang. Kirim ulang fotonya (lebih jelas / dipotong), atau tulis nominal + keterangannya sebagai teks.'
        : '⚠️ Bukti belum terbaca (' + esc(r.pesan || 'AI') + '). Robot akan membaca ulang otomatis dalam 1 jam, atau kirim ulang sekarang.');
      await ubah(id, { status: 'gagal', catatan: p }); await tampil({ chat: String(chat.id), robot_msg: robotMsg }, p); return;
    }
    let nominal = Math.round(Number(r.nominal) || 0) || (teks ? angka(teks) || 0 : 0);
    const tanggal = /^\d{4}-\d{2}-\d{2}$/.test(String(r.tanggal || '')) && String(r.tanggal) <= tglPesan ? String(r.tanggal) : tglPesan;
    if (nominal < 0) nominal = 0;
    const kategori = KATEGORI.indexOf(String(r.kategori)) > -1 ? String(r.kategori) : 'Biaya lain-lain';
    // siapa yang membayar (bisa beda dengan pengirim bukti, mis. Viory meneruskan bukti transfer Junior)
    const pembayar = pembayarDari(teks, String(r.atas_nama || '')) || nama;
    r.pembayar = pembayar;
    // rekening asal: caption > rekening yang terbaca di bukti > bawaan pembayar; kalau tidak jelas robot BERTANYA (tidak menebak)
    let akun = akunDariTeks(teks) || (AKUN.indexOf(String(r.sumber)) > -1 ? String(r.sumber) : '');
    if (!akun) akun = pembayar === 'Viory' ? (String(r.jenis_bayar) === 'shopeepay' ? 'ShopeePay' : '') : akunBawaan(pembayar, nominal);
    const ket = t((r.ringkasan || teks || 'Pengeluaran') + (r.penerima && String(r.ringkasan || '').toLowerCase().indexOf(String(r.penerima).toLowerCase()) === -1 ? ' (' + r.penerima + ')' : ''), 150);
    let b = await ubah(id, { baca: r, nominal: nominal || null, tanggal, kategori, akun: akun || null, keterangan: ket, status: 'usul',
      catatan: akun ? null : (pembayar === 'Mike' && nominal >= MIKE_TANYA ? '💬 Mike, nominalnya besar: dibayar dari Rekening PT atau Rekening Belanja? Pilih akunnya di bawah.'
        : '💬 ' + nama + ', bukti ini dibayar dari rekening / saldo mana? Pilih akunnya di bawah.') });

    // bukti kembar (foto yang sama dikirim dua kali)
    if (nominal) {
      const q = sb.from('bb_bukti').select('id,acc_no,status,pengirim,tanggal').neq('id', id).not('status', 'in', '(gagal,bukan)').gte('waktu', new Date(Date.now() - 20 * 86400e3).toISOString());
      const kemb = r.ref ? await q.contains('baca', { ref: r.ref }).limit(1) : await q.eq('nominal', nominal).eq('tanggal', tanggal).eq('uid', uid).limit(1);
      const k = kemb.data && kemb.data[0];
      if (k) {
        await ubah(id, { status: 'sama', acc_no: k.acc_no, catatan: 'Sama dengan bukti #' + k.id });
        await tampil(b, '📎 Bukti ini sama dengan yang sudah dikirim sebelumnya' + (k.acc_no ? ' (' + esc(k.acc_no) + ')' : '') + '. Tidak dicatat lagi.');
        return;
      }
    }
    // pindah dana antar akun Moscow (PT -> Belanja, Belanja -> ShopeePay / Kas): dicatat sebagai Pindah, bukan pengeluaran
    const pd = pindahValid(r.pindah, pembayar);
    if (pd && nominal) {
      const c = await sb.rpc('bb_cocok_pindah', { p_nominal: nominal, p_tanggal: tanggal, p_dari: pd.dari, p_ke: pd.ke });
      const cand = Array.isArray(c.data) && c.data[0];
      if (cand) {
        await sb.rpc('bb_tempel', { p_id: id, p_nos: cand.no });
        await tampil(b, '🔁 <b>' + esc(nama) + '</b> · pindah dana ' + rp(nominal) + ' · ' + tglId(tanggal) + '\n' + teksCocok(cand));
        return;
      }
      b = await ubah(id, { baca: { ...r, pindah: pd }, akun: pd.dari || null, kategori: 'Pindah dana',
        keterangan: t(pd.ke === 'ShopeePay' ? 'Top up ShopeePay' : pd.ke === 'Rekening Belanja' ? 'Dana masuk rekening belanja' : 'Pindah dana ke ' + pd.ke, 150) });
      await tampil(b); return;
    }
    // cocokkan dengan accounting
    if (nominal) {
      const c = await sb.rpc('bb_cocok', { p_nominal: nominal, p_tanggal: tanggal, p_pengirim: nama });
      const cand = Array.isArray(c.data) && c.data[0];
      if (cand) {
        // uang sudah tercatat, tapi barangnya masih ada di pengajuan yang belum dibayar -> tawarkan "Tandai sudah dibayar"
        const rc = rencanaBayar(r, belum, items, nominal);
        if (rc && rc.p.length) {
          b = await ubah(id, { baca: { ...r, tandai: { tr: cand.no, toko: rc.toko, p: rc.p, cocok: cand } } });
          await tampil(b); return;
        }
        await sb.rpc('bb_tempel', { p_id: id, p_nos: cand.no });
        await tampil(b, '🧾 <b>' + esc(nama) + '</b> · ' + rp(nominal) + ' · ' + tglId(tanggal) + '\n' + teksCocok(cand));
        return;
      }
    }
    // bukti = tindakan "sudah dibayar": barang cocok dengan pengajuan / PO yang belum dibayar -> tombol ✅ Sudah dibayar (pengirim)
    if (nominal) {
      const rc = rencanaBayar(r, belum, items, nominal);
      if (rc) { b = await ubah(id, { baca: { ...r, rencana: rc } }); await tampil(b); return; }
      // transfer impor tanpa rincian barang: centang pengajuan impor yang dibayar
      if ((nama === 'Mike' || kategori === 'Pembelian barang dagang / impor') && !r.belum_bayar) {
        const ri = pilihImpor(r, belum);
        if (ri) { b = await ubah(id, { baca: { ...r, rencana: ri } }); await tampil(b); return; }
      }
    }
    // cocokkan ke rincian barang yang dibayar lewat aplikasi (satu screenshot bisa berisi beberapa barang dari beberapa transaksi)
    if (nominal && items.length) {
      const hasil = cocokBarang(r, items, nominal, teks);
      if (hasil) {
        const kand = hasil.kd;
        if (hasil.yakin) {
          await sb.rpc('bb_tempel', { p_id: id, p_nos: kand.tr });
          await simpanPadanan(kand.pasang);
          await tampil(b, '🧾 <b>' + esc(nama) + '</b> · ' + rp(nominal) + ' · ' + tglId(tanggal) + '\n✅ <b>Sudah tercatat</b> dari belanja lewat aplikasi (nota → sistem):' + barisPasang(kand) +
            '\n= ' + rp(kand.sum) + ' (' + esc(kand.tr.join(', ')) + ')' + (kand.beda ? ' <i>(selisih ' + rp(Math.abs(kand.beda)) + ')</i>' : '') + '\n📎 Bukti dilampirkan, tidak dicatat dua kali.');
          return;
        }
        b = await ubah(id, { baca: { ...r, kandidat: kand } });
      }
    }
    if ((nama === 'Viory' || nama === 'Mike') && BELANJA.indexOf(kategori) > -1 && !r.belum_bayar && !(b.baca && b.baca.kandidat)) b = await ubah(id, { status: 'tunggu' });
    await tampil(b);
  }

  // ---------- pesan di grup ----------
  async function grup(m: Any): Promise<boolean> {
    const chat = m.chat || {}, dari = m.from || {};
    if (dari.is_bot) return false;
    const teks = String(m.text || '').trim();
    if (/^\/grup_bukti\b/i.test(teks)) {
      if ((await peran(dari.id)) !== 'manajemen') { await api('sendMessage', { chat_id: chat.id, reply_to_message_id: m.message_id, text: 'Hanya manajemen Moscow Supplies yang bisa mengatur grup ini.' }); return true; }
      await sb.from('bb_atur').upsert({ kunci: 'grup', nilai: { chat: String(chat.id), nama: chat.title || '' }, diubah: new Date().toISOString() });
      await api('sendMessage', { chat_id: chat.id, reply_to_message_id: m.message_id, parse_mode: 'HTML', text: '✅ Grup ini sekarang <b>grup Bukti Bayar Moscow</b>. Setiap anggota ketik sekali: <b>/saya NAMA</b> (Junior / Mike / Viory / Daffa / Ronny / Iqbal).' });
      return true;
    }
    const g = await atur('grup');
    if (!g || String(g.chat) !== String(chat.id)) return false;
    const ms = /^\/saya(?:@\w+)?\s+(\S+)/i.exec(teks);
    if (ms) {
      const nm = ANGGOTA.filter((a) => a.toLowerCase() === ms[1].toLowerCase().replace(/^fiori$/, 'viory').replace(/^roni$/, 'ronny').replace(/^dava$/, 'daffa'))[0];
      if (!nm) { await api('sendMessage', { chat_id: chat.id, reply_to_message_id: m.message_id, text: 'Nama tidak dikenal. Pilih: ' + ANGGOTA.join(' / ') }); return true; }
      await sb.from('bb_anggota').upsert({ uid: String(dari.id), nama: nm, nama_tg: t([dari.first_name, dari.last_name].join(' '), 60), waktu: new Date().toISOString() });
      const ab = akunBawaan(nm, 0);
      await api('sendMessage', { chat_id: chat.id, reply_to_message_id: m.message_id, parse_mode: 'HTML', text: '✅ Kamu terdaftar sebagai <b>' + nm + '</b>.' +
        (ab ? ' Akun bayar bawaan: <b>' + ab + '</b>' + (nm === 'Mike' ? ' (nominal besar: robot menanyakan Rekening PT atau Rekening Belanja)' : '') + '. Kalau beda, tulis di caption (mis. "cash", "shopee", "tf PT").'
          : ' Setiap kirim bukti, <b>tulis saluran bayarnya</b> di caption (mis. "kas", "shopee", "tf belanja").') });
      return true;
    }
    if (teks.startsWith('/')) return true;
    // balasan untuk ✏️ Ubah
    if (m.reply_to_message) {
      const a = await sementara('bu|' + chat.id + '|' + m.reply_to_message.message_id);
      if (a && String(dari.id) === a.uid) { await terapkanUbah(a.id, teks, m); return true; }
    }
    if ((m.photo && m.photo.length) || m.document || (teks && adaNominal(teks))) { await proses(m); return true; }
    return true;
  }

  async function terapkanUbah(id: number, teks: string, m: Any) {
    const b = await ambil(id); if (!b || ['dicatat', 'cocok', 'sama', 'bukan'].indexOf(b.status) > -1) return;
    const isi: Any = {};
    let sisa = teks;
    // "dibayar Junior" -> pembayar diganti; akun ikut bawaan pembayar kalau belum dipilih
    const mb = RE_DIBAYAR.exec(teks), pb = mb ? cocokNamaOrang(mb[1]) : '';
    if (pb) {
      isi.baca = { ...(b.baca || {}), pembayar: pb };
      sisa = sisa.replace(mb![0], ' ');
      if (!b.akun) { const ab = akunBawaan(pb, Number(b.nominal) || 0); if (ab) { isi.akun = ab; isi.catatan = null; } }
    }
    const d = /(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?/.exec(sisa);
    if (d) {
      const y = d[3] ? (d[3].length === 2 ? '20' + d[3] : d[3]) : hariWita().slice(0, 4);
      const tg = y + '-' + ('0' + d[2]).slice(-2) + '-' + ('0' + d[1]).slice(-2);
      if (!isNaN(Date.parse(tg)) && tg <= hariWita()) isi.tanggal = tg;
      sisa = sisa.replace(d[0], ' ');
    }
    const n = adaNominal(sisa) ? angka(sisa) : null;
    if (n) { isi.nominal = n; sisa = sisa.replace(/rp\.?\s*/ig, '').replace(/\d[\d.,]*\s*(k|rb|ribu|jt|juta)?\b/i, ' '); }
    const ak = akunDariTeks(sisa); if (ak) { isi.akun = ak; if (String(b.catatan || '').startsWith('💬')) isi.catatan = null; }
    sisa = t(sisa.replace(/[,;]+/g, ' '), 150);
    if (sisa.length >= 3 && !ak) isi.keterangan = sisa;
    if (!Object.keys(isi).length) { await api('sendMessage', { chat_id: m.chat.id, reply_to_message_id: m.message_id, text: 'Tidak ada yang bisa diubah. Contoh: 150000 / 03/11 / listrik ruko / cash / dibayar Junior' }); return; }
    // nominal diubah: rencana bayar dari AI tidak berlaku lagi (dicatat biasa / bayar lewat aplikasi)
    if (isi.nominal && b.baca && b.baca.rencana && Number(isi.nominal) !== Number(b.nominal))
      isi.baca = { ...(isi.baca || b.baca), rencana: b.baca.rencana.calon ? hitungImpor(b.baca.rencana, Number(isi.nominal)) : null };
    const baru = await ubah(id, isi);
    await tampil(baru);
    await api('sendMessage', { chat_id: m.chat.id, reply_to_message_id: m.message_id, text: '✏️ Diperbarui. Cek kartu di atas lalu tekan ✅ Catat.' });
  }

  // ---------- tombol ----------
  async function tombol(q: Any) {
    const p = String(q.data || '').split('|'), id = Number(p[1]), op = p[2];
    const jawab = (s: string, alert = false) => api('answerCallbackQuery', { callback_query_id: q.id, text: s.slice(0, 195), show_alert: alert });
    const b = await ambil(id);
    if (!b) return jawab('Bukti tidak ditemukan.', true);
    const uid = String(q.from?.id || '');
    if (uid !== String(b.uid)) return jawab('Hanya ' + (b.pengirim || 'pengirim bukti ini') + ' (yang mengirim bukti) yang bisa menekan tombol ini.', true);
    if (['dicatat', 'cocok', 'sama', 'bukan'].indexOf(b.status) > -1) return jawab('Sudah diproses.');
    const oleh = (await anggota(uid)) || t(q.from?.first_name, 40);
    // pembayar sebenarnya (caption "dibayar Junior" / nama rekening di bukti) dicatat di accounting: "Junior via Viory"
    const pb = b.baca && b.baca.pembayar ? String(b.baca.pembayar) : '';
    const pengisi = pb && pb !== oleh ? pb + ' via ' + oleh : oleh;
    if (op === 'p') {
      const rc = b.baca && b.baca.rencana;
      if (!rc) return jawab('Tidak ada pengajuan yang cocok.');
      if (rc.calon && !rc.i.length) return jawab('Centang dulu pengajuan impor yang dibayar.', true);
      if (rc.kurang) return jawab('Total pengajuan lebih besar dari nota. Cek dulu atau bayar lewat aplikasi.', true);
      const r = await sb.rpc('bb_bayar', { p_id: id, p_oleh: pengisi });
      if (r.error || !r.data?.ok) return jawab('⚠️ ' + (r.data?.pesan || r.error?.message || 'Gagal menyimpan.'), true);
      await simpanPadanan(rc.p.map((x: Any) => ({ nota: x.nota, sistem: x.n })).concat(rc.bps || []));
      await tampil(b, '✅ <b>Sudah dibayar</b> oleh ' + esc(pengisi) + ' · ' + esc(b.akun) + ' · ' + tglId(b.tanggal) + '\n💸 ' + rp(b.nominal) + teksRencana(rc) +
        '\n\n📒 Accounting: ' + esc((r.data.trs || []).join(', ')) + '\n📎 Bukti dilampirkan. Staf: terima barangnya di form masing-masing.');
      return jawab('Tercatat dibayar: ' + (r.data.trs || []).join(', '));
    }
    if (op === 't' || op === 'n') {
      const td = b.baca && b.baca.tandai; if (!td) return jawab('Tidak ada pengajuan yang perlu ditandai.');
      if (op === 'n') {
        await sb.rpc('bb_tempel', { p_id: id, p_nos: td.tr });
        await tampil(b, '🧾 <b>' + esc(b.pengirim) + '</b> · ' + rp(b.nominal) + ' · ' + tglId(b.tanggal) + '\n' + teksCocok(td.cocok || { no: td.tr, t: '', sumber: '', v: b.nominal }));
        return jawab('Bukti ditempel ke ' + td.tr.join(', '));
      }
      const r = await sb.rpc('bb_tandai', { p_id: id, p_oleh: pengisi });
      if (r.error || !r.data?.ok) return jawab('⚠️ ' + (r.data?.pesan || r.error?.message || 'Gagal menyimpan.'), true);
      await simpanPadanan(td.p.map((x: Any) => ({ nota: x.nota, sistem: x.n })));
      let h = '✅ <b>Ditandai sudah dibayar</b> oleh ' + esc(pengisi) + ' · ' + tglId(b.tanggal) + '\n📒 Accounting: ' + esc(td.tr.join(', ')) + ' (sudah ada, tidak dicatat lagi)';
      td.p.forEach((x: Any) => { h += '\n• <b>' + esc(x.no) + ' ' + esc(x.n) + '</b> · ' + x.q + ' ' + esc(x.s) + ' · ' + rp(x.t); });
      await tampil(b, h + '\n📎 Bukti dilampirkan. Staf: terima barangnya di form masing-masing.');
      return jawab('Pengajuan ditandai dibayar.');
    }
    if (op === 'I') {
      const rc = b.baca && b.baca.rencana; if (!rc || !rc.calon) return jawab('Tidak ada pilihan impor.');
      const x = rc.calon[Number(p[3])]; if (!x) return jawab('Pilihan tidak dikenal.');
      const k = rc.pilih.indexOf(x.no); if (k > -1) rc.pilih.splice(k, 1); else rc.pilih.push(x.no);
      const baru = await ubah(id, { baca: { ...b.baca, rencana: hitungImpor(rc, Number(b.nominal) || 0) } });
      await tampil(baru); return jawab((k > -1 ? 'Batal centang: ' : 'Dicentang: ') + x.no);
    }
    if (op === 'P') {
      const pd = b.baca && b.baca.pindah; if (!pd) return jawab('Bukti ini bukan pindah dana.');
      const r = await sb.rpc('bb_catat_pindah', { p_id: id, p_oleh: pengisi });
      if (r.error || !r.data?.ok) return jawab('⚠️ ' + (r.data?.pesan || r.error?.message || 'Gagal mencatat.'), true);
      await tampil(b, '🔁 <b>Pindah dana dicatat ' + esc(r.data.no) + '</b> oleh ' + esc(pengisi) + '\n💸 ' + rp(b.nominal) + ' · ' + tglId(b.tanggal) + '\n🏦 ' + esc(pd.dari) + ' → ' + esc(pd.ke) +
        (r.data.biaya ? '\n🧾 Biaya admin ' + rp(pd.biaya) + ' (' + esc(r.data.biaya) + ')' : '') + '\n📎 Bukti dilampirkan.');
      return jawab('Tercatat: ' + r.data.no);
    }
    if (op === 'd' || op === 'e') {
      const rows: Any[] = [];
      AKUN.forEach((x, i) => { if (i % 2 === 0) rows.push([]); rows[rows.length - 1].push({ text: x, callback_data: 'b|' + id + '|' + (op === 'd' ? 'D' : 'E') + '|' + i }); });
      rows.push([{ text: '↩️ Kembali', callback_data: 'b|' + id + '|m' }]);
      await api('editMessageReplyMarkup', { chat_id: b.chat, message_id: b.robot_msg, reply_markup: { inline_keyboard: rows } });
      return jawab(op === 'd' ? 'Pilih akun asal' : 'Pilih akun tujuan');
    }
    if (op === 'D' || op === 'E') {
      const v = AKUN[Number(p[3])]; if (!v || !(b.baca && b.baca.pindah)) return jawab('Pilihan tidak dikenal.');
      const pd = { ...b.baca.pindah, [op === 'D' ? 'dari' : 'ke']: v };
      if (pd.dari === pd.ke) return jawab('Akun asal dan tujuan tidak boleh sama.', true);
      const baru = await ubah(id, { baca: { ...b.baca, pindah: pd }, akun: pd.dari || null });
      await tampil(baru); return jawab((op === 'D' ? 'Dari: ' : 'Ke: ') + v);
    }
    if (op === 'g') {
      const kat = b.baca && KATEGORI.indexOf(String(b.baca.kategori)) > -1 ? String(b.baca.kategori) : 'Biaya lain-lain';
      const baru = await ubah(id, { baca: { ...b.baca, pindah: null }, kategori: kat });
      await tampil(baru); return jawab('Dijadikan pengeluaran. Cek lalu tekan ✅ Catat.');
    }
    if (op === 'c') {
      const c = b.nominal ? await sb.rpc('bb_cocok', { p_nominal: b.nominal, p_tanggal: b.tanggal, p_pengirim: b.pengirim }) : { data: [] };
      const cand = Array.isArray(c.data) && c.data[0];
      if (cand) { await sb.rpc('bb_tempel', { p_id: id, p_nos: cand.no }); await tampil(b, '🧾 <b>' + esc(b.pengirim) + '</b> · ' + rp(b.nominal) + ' · ' + tglId(b.tanggal) + '\n' + teksCocok(cand)); return jawab('Sudah tercatat sebelumnya — bukti ditempel.'); }
      const r = await sb.rpc('bb_catat', { p_id: id, p_oleh: pengisi });
      if (r.error || !r.data?.ok) return jawab('⚠️ ' + (r.data?.pesan || r.error?.message || 'Gagal mencatat.'), true);
      await tampil(b, '✅ <b>Dicatat ' + esc(r.data.no) + '</b> oleh ' + esc(pengisi) + '\n💸 ' + rp(b.nominal) + ' · ' + tglId(b.tanggal) + ' · ' + esc(b.akun) + '\n📝 ' + esc(b.keterangan) + ' · ' + esc(b.kategori));
      return jawab('Tercatat di accounting: ' + r.data.no);
    }
    if (op === 's') {
      const kd = b.baca && b.baca.kandidat;
      if (!kd) return jawab('Tidak ada transaksi pembanding.');
      await sb.rpc('bb_tempel', { p_id: id, p_nos: kd.tr });
      await simpanPadanan(kd.pasang);
      await tampil(b, '🧾 <b>' + esc(b.pengirim) + '</b> · ' + rp(b.nominal) + ' · ' + tglId(b.tanggal) + '\n✅ <b>Sudah tercatat</b> (dikonfirmasi ' + esc(oleh) + ', nota → sistem):' + barisPasang(kd) +
        '\n= ' + rp(kd.sum) + ' (' + esc(kd.tr.join(', ')) + ')\n📎 Bukti dilampirkan, tidak dicatat dua kali.');
      return jawab('Bukti ditempel ke ' + kd.tr.join(', '));
    }
    if (op === 'x') { await ubah(id, { status: 'bukan' }); await tampil(b, '❌ Ditandai bukan pengeluaran oleh ' + esc(oleh) + '. Tidak dicatat.'); return jawab('Tidak dicatat.'); }
    if (op === 'a' || op === 'k') {
      const daftar = op === 'a' ? AKUN : KATEGORI, kode = op === 'a' ? 'A' : 'K', rows: Any[] = [];
      daftar.forEach((x, i) => { if (i % 2 === 0) rows.push([]); rows[rows.length - 1].push({ text: x, callback_data: 'b|' + id + '|' + kode + '|' + i }); });
      rows.push([{ text: '↩️ Kembali', callback_data: 'b|' + id + '|m' }]);
      await api('editMessageReplyMarkup', { chat_id: b.chat, message_id: b.robot_msg, reply_markup: { inline_keyboard: rows } });
      return jawab(op === 'a' ? 'Pilih akun bayar' : 'Pilih kategori');
    }
    if (op === 'A' || op === 'K') {
      const i = Number(p[3]), v = (op === 'A' ? AKUN : KATEGORI)[i];
      if (!v) return jawab('Pilihan tidak dikenal.');
      const baru = await ubah(id, op === 'A' ? { akun: v, ...(String(b.catatan || '').startsWith('💬') ? { catatan: null } : {}) } : { kategori: v });
      await tampil(baru); return jawab((op === 'A' ? 'Akun: ' : 'Kategori: ') + v);
    }
    if (op === 'm') { await tampil(b); return jawab(''); }
    if (op === 'u') {
      const r = await api('sendMessage', { chat_id: b.chat, reply_to_message_id: b.robot_msg, parse_mode: 'HTML',
        text: '✏️ <b>Balas pesan ini</b> dengan yang mau diubah: nominal, tanggal, keterangan, atau akun.\nContoh: <code>150000 03/11 listrik ruko</code> atau <code>cash</code>',
        reply_markup: { force_reply: true, selective: true, input_field_placeholder: 'mis. 150000 03/11 listrik ruko' } });
      if (r && r.ok) await sb.from('tg_sementara').upsert({ kunci: 'bu|' + b.chat + '|' + r.result.message_id, data: { id, uid }, kedaluwarsa: new Date(Date.now() + 6 * 3600e3).toISOString() }, { onConflict: 'kunci' });
      return jawab('Balas pesan robot dengan perubahannya.');
    }
    return jawab('Tombol tidak dikenal.');
  }

  // ---------- tiap jam: bukti Viory/Mike yang menunggu input aplikasi ----------
  async function periksaTunggu() {
    const r = await sb.from('bb_bukti').select('*').eq('status', 'tunggu').limit(50);
    let tempel = 0, tanya = 0;
    for (const b of r.data || []) {
      const c = await sb.rpc('bb_cocok', { p_nominal: b.nominal, p_tanggal: b.tanggal, p_pengirim: b.pengirim });
      const cand = Array.isArray(c.data) && c.data[0];
      if (cand) { await sb.rpc('bb_tempel', { p_id: b.id, p_nos: cand.no }); await tampil(b, '🧾 <b>' + esc(b.pengirim) + '</b> · ' + rp(b.nominal) + ' · ' + tglId(b.tanggal) + '\n' + teksCocok(cand)); tempel++; continue; }
      if (Date.now() - new Date(b.waktu).getTime() > 3 * 86400e3) {
        const baru = await ubah(b.id, { status: 'usul', catatan: '⏳ Sudah 3 hari belum ada di aplikasi. Kalau memang bukan dari pengajuan, tekan ✅ Catat.' });
        await tampil(baru); tanya++;
      }
    }
    return { tempel, tanya };
  }

  // bukti yang gagal dibaca (kunci AI belum ada / jawaban AI tidak terbaca): dibaca ulang sekali
  async function bacaUlang() {
    if (!(Deno.env.get('ANTHROPIC_API_KEY') || '').trim()) return 0;
    const r = await sb.from('bb_bukti').select('*').eq('status', 'gagal').gte('waktu', new Date(Date.now() - 3 * 86400e3).toISOString()).limit(20);
    let n = 0;
    for (const b of (r.data || []).filter((x: Any) => /kunci AI|membaca ulang otomatis/.test(String(x.catatan || ''))).slice(0, 10)) {
      await sb.from('bb_bukti').delete().eq('id', b.id);
      await proses({ ulang: true, chat: { id: b.chat }, from: { id: b.uid, first_name: b.pengirim }, message_id: b.msg, date: Math.floor(new Date(b.waktu).getTime() / 1000),
        caption: b.caption, text: b.file_id ? '' : b.caption, photo: b.file_jenis === 'foto' && b.file_id ? [{ file_id: b.file_id }] : undefined,
        document: b.file_jenis === 'pdf' && b.file_id ? { file_id: b.file_id, mime_type: 'application/pdf' } : undefined });
      if (b.robot_msg) await api('deleteMessage', { chat_id: b.chat, message_id: b.robot_msg });
      n++;
    }
    return n;
  }

  // uji tanpa mengubah apa pun: baca ulang bukti #id lalu tunjukkan pasangan barangnya (dipanggil lewat kunci robot)
  async function uji(id: number) {
    const b = await ambil(id); if (!b || !b.file_id) return { ok: false };
    const f = await api('getFile', { file_id: b.file_id }); if (!(f && f.ok)) return { ok: false, pesan: 'getFile' };
    const res = await fetch('https://api.telegram.org/file/bot' + TOKEN + '/' + f.result.file_path);
    const data = new Uint8Array(await res.arrayBuffer());
    const tglPesan = hariWita(new Date(b.waktu).getTime()), items = await barangSistem(tglPesan);
    const belum = (await sb.rpc('bb_belum_bayar')).data || { p: [], o: [] };
    const r = await baca({ data, mime: b.file_jenis === 'pdf' ? 'application/pdf' : 'image/jpeg', teks: b.caption || '', tglPesan, daftar: items, padanan: await padananUntuk(items), belum });
    const nominal = Math.round(Number(r.nominal) || 0);
    return { ok: true, nominal, barang: r.barang, sistem: r.sistem, pindah: pindahValid(r.pindah, b.pengirim || ''), rencana: nominal ? rencanaBayar(r, belum, items, nominal) : null,
      hasil: nominal && items.length ? cocokBarang(r, items, nominal, b.caption || '') : null };
  }

  // pengumuman manajemen: robot mengirim teks ke grup Bukti Bayar lalu menyematkannya (dipanggil lewat kunci robot)
  async function umumkan(teks: string, sematkan = true) {
    const g = await atur('grup');
    if (!g || !g.chat) return { ok: false, pesan: 'Grup Bukti Bayar belum diatur.' };
    const k = await api('sendMessage', { chat_id: g.chat, text: String(teks).slice(0, 4000), disable_web_page_preview: true });
    if (!(k && k.ok)) return { ok: false, pesan: 'Kirim gagal: ' + t(k && k.description, 120) };
    if (!sematkan) return { ok: true, pesan: k.result.message_id, sematkan: false, galat: '' };
    const s = await api('pinChatMessage', { chat_id: g.chat, message_id: k.result.message_id, disable_notification: false });
    return { ok: true, pesan: k.result.message_id, sematkan: !!(s && s.ok), galat: s && !s.ok ? t(s.description, 120) : '' };
  }

  // pengingat harian (jadwal 09:13 WITA): pengajuan sudah di-ACC > 3 hari yang belum dibayar
  async function pengingat() {
    const r = await sb.rpc('bb_pengingat_ajuan');
    if (r.error) return { ok: false, pesan: r.error.message };
    if (!r.data) return { ok: true, pesan: 'tidak ada' };
    return await umumkan(String(r.data), false);
  }

  // ---------- pertanyaan konfirmasi bertombol (bb_tanya) ----------
  // isi: { teks (HTML), pilihan: [{ label, aksi }], chats?: [chat id] } -> dikirim ke grup Bukti Bayar (bawaan) / grup lain
  async function tanyaKirim(isi: Any) {
    const g = await atur('grup');
    const chats = (Array.isArray(isi.chats) && isi.chats.length ? isi.chats : [g && g.chat]).filter(Boolean).map(String);
    const pilihan = Array.isArray(isi.pilihan) ? isi.pilihan.slice(0, 6) : [];
    if (!pilihan.length || !chats.length) return { ok: false, pesan: 'Pilihan / grup kosong.' };
    const ins = await sb.from('bb_tanya').insert({ teks: String(isi.teks || '').slice(0, 3500), pilihan, status: 'buka' }).select('id').single();
    if (ins.error) return { ok: false, pesan: ins.error.message };
    const id = ins.data.id, pesan: Any[] = [];
    const kb = { inline_keyboard: pilihan.map((p: Any, k: number) => [{ text: t(p.label, 60), callback_data: 'q|' + id + '|' + k }]) };
    for (const c of chats) {
      const r = await api('sendMessage', { chat_id: c, text: String(isi.teks || '').slice(0, 3500), parse_mode: 'HTML', reply_markup: kb, disable_web_page_preview: true });
      if (r && r.ok) pesan.push({ chat: c, msg: r.result.message_id }); else console.error('tanya kirim', c, r && r.description);
    }
    await sb.from('bb_tanya').update({ pesan }).eq('id', id);
    return { ok: true, id, pesan };
  }
  async function tanyaTombol(q: Any) {
    const s = String(q.data || '').split('|'), id = Number(s[1]), k = Number(s[2]);
    const jawab = (x: string, alert = false) => api('answerCallbackQuery', { callback_query_id: q.id, text: x.slice(0, 195), show_alert: alert });
    const nama = (await anggota(String(q.from?.id || ''))) || t([q.from?.first_name, q.from?.last_name].join(' '), 40) || 'Anggota';
    const r = await sb.rpc('bb_tanya_jawab', { p_id: id, p_k: k, p_oleh: nama });
    if (r.error || !r.data?.ok) return jawab('⚠️ ' + (r.data?.pesan || r.error?.message || 'Gagal menyimpan.'), true);
    const d = r.data;
    const teks = String(d.teks || '') + '\n\n✅ <b>Dijawab ' + esc(nama) + '</b>: ' + esc(d.label) + (d.hasil ? '\n<i>' + esc(d.hasil) + '</i>' : '');
    for (const p of (d.pesan || [])) await api('editMessageText', { chat_id: p.chat, message_id: p.msg, text: teks.slice(0, 4000), parse_mode: 'HTML', disable_web_page_preview: true });
    return jawab('Terima kasih, jawaban tersimpan.');
  }

  return { grup, tombol, periksaTunggu, bacaUlang, uji, umumkan, pengingat, tanyaKirim, tanyaTombol };
}
