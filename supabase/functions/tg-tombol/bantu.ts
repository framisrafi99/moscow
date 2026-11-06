// Robot Bukti Bayar Moscow: menjawab pertanyaan / kebingungan anggota grup (6 Nov 2026, masa transisi).
// Dipicu: pesan teks tanpa bukti yang membalas pesan robot, atau berisi pertanyaan / keluhan (?, kok, kenapa, gimana, salah, bingung, robot ...).
// Robot hanya MENJELASKAN dari data (bb_bukti + acc_log) dan memberi langkah yang bisa diambil; tidak mengubah data dari obrolan.
// deno-lint-ignore no-explicit-any
type Any = any;
const MODEL = (Deno.env.get('BB_MODEL') || 'claude-sonnet-5-5').trim();
function t(v: unknown, n = 200) { return String(v ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n); }
function esc(s: unknown) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
const RE_TANYA = /\?|\b(kok|kenapa|mengapa|gimana|bagaimana|gmn|knp|maksudnya|apa(kah)?|bisa(kah)?|tolong|bingung|salah|keliru|dobel|double|belum|kurang|harusnya|seharusnya|robot|bot|cara)\b/i;

const PANDUAN = 'Cara kerja robot Bukti Bayar Moscow:\n' +
  '- Kirim foto / PDF bukti bayar (transfer, nota, struk, invoice) ke grup. Robot membaca nominal, tanggal, penerima, kategori, lalu mencocokkan dengan accounting.\n' +
  '- Kalau sudah tercatat (dari aplikasi / bukti lain), bukti hanya DITEMPEL ke transaksi itu, tidak dicatat dua kali.\n' +
  '- Kalau belum tercatat, robot membuat kartu dengan tombol: ✅ Catat (simpan ke accounting), ✏️ Ubah (balas kartu dengan nominal / keterangan yang benar), 🏦 Akun (ganti rekening asal), 🏷️ Kategori, ❌ Bukan (bukan pengeluaran, tidak dicatat). Tombol hanya bisa ditekan pengirim bukti.\n' +
  '- Rekening bawaan: Junior = Rekening Belanja; Viory = ShopeePay (transfer bank ditanyakan); Mike = Rekening Belanja (>= Rp10 juta ditanya Rekening PT atau Belanja). Kalau beda, tulis di caption, mis. "tf PT", "cash", "shopeepay", "saldo penjual".\n' +
  '- Bukti transfer + invoice / nota yang dikirim bersamaan (maks 30 menit, nominal sama, selisih biaya transfer s.d. Rp10.000 boleh) = SATU pembayaran: yang dicatat bukti transfernya, invoice jadi lampiran.\n' +
  '- Invoice / tagihan yang belum dibayar jangan dicatat dulu; kirim bukti transfernya saat sudah dibayar.\n' +
  '- Belanja barang dari pengajuan (Viory / Mike): bayar lewat aplikasi (Purchasing / PO), bukti ditempel otomatis. Kalau robot menunggu (⏳), input dulu di aplikasi atau tekan ✅ Catat.\n' +
  '- Pindah dana antar akun Moscow (PT -> Belanja, top up ShopeePay, tarik tunai) dicatat sebagai pindah dana, bukan pengeluaran.\n' +
  '- Foto sama dikirim dua kali: robot menandai "sama", tidak dicatat lagi.\n' +
  '- Kalau robot salah baca: tekan ✏️ Ubah lalu balas dengan angka / keterangan yang benar, atau ❌ Bukan lalu kirim ulang foto yang lebih jelas. Kalau sudah terlanjur dicatat dan salah, laporkan di grup; manajemen Moscow Supplies (Iqbal) yang membetulkan di Master Data.';

export function buatBantu(sb: Any, api: (m: string, isi: Any) => Promise<Any>) {
  function perluJawab(m: Any, teks: string, keRobot: boolean) {
    if (!teks || teks.length < 3 || teks.startsWith('/')) return false;
    return keRobot || RE_TANYA.test(teks);
  }
  async function konteks(uid: string, balasMsg: number | null) {
    const terakhir = await sb.from('bb_bukti').select('id,waktu,pengirim,nominal,tanggal,status,acc_no,keterangan,kategori,akun,catatan,robot_msg,baca')
      .eq('uid', uid).order('id', { ascending: false }).limit(6);
    let fokus: Any = null;
    if (balasMsg) {
      const f = await sb.from('bb_bukti').select('id,waktu,pengirim,nominal,tanggal,status,acc_no,keterangan,kategori,akun,catatan,robot_msg,baca').eq('robot_msg', balasMsg).limit(1);
      fokus = f.data && f.data[0];
    }
    const nos = Array.from(new Set(([] as Any[]).concat(fokus ? [fokus] : [], terakhir.data || []).flatMap((x: Any) => String(x.acc_no || '').split(',').map((s) => s.trim()).filter(Boolean)))).slice(0, 12);
    const acc = nos.length ? (await sb.from('acc_log').select('no,tanggal,jenis,akun,akun_tujuan,kategori,keterangan,nominal,status').in('no', nos)).data || [] : [];
    const ring = (x: Any) => ({ bukti: '#' + x.id, dikirim: String(x.waktu).slice(0, 16), nominal: x.nominal, tanggal: x.tanggal, status: x.status, transaksi: x.acc_no, keterangan: x.keterangan,
      kategori: x.kategori, akun: x.akun, catatan: x.catatan, dibaca: x.baca ? { ringkasan: x.baca.ringkasan, penerima: x.baca.penerima, dokumen: x.baca.dokumen, belum_bayar: x.baca.belum_bayar,
        lampiran: x.baca.lampiran, lampiran_untuk: x.baca.lampiran_untuk } : null });
    return { fokus: fokus ? ring(fokus) : null, terakhir: (terakhir.data || []).map(ring), accounting: acc };
  }
  async function tanyaAI(nama: string, teks: string, isi: Any, teksRobot: string) {
    const kunci = (Deno.env.get('ANTHROPIC_API_KEY') || '').trim();
    if (!kunci) return '';
    const perintah = 'Kamu robot grup Telegram "Bukti Bayar Moscow" milik Moscow Supplies (Bali). Sekarang masa transisi: anggota (Mike, Junior, Viory, Daffa) baru belajar memakai robot. ' +
      'Jawab pertanyaan / kebingungan ' + nama + ' dengan bahasa Indonesia yang sederhana, ramah, singkat (maks 7 baris), tanpa istilah teknis. ' +
      'Jelaskan apa yang SUDAH dicatat robot dari laporannya (nominal, tanggal, akun, kategori, nomor transaksi TR) berdasarkan data di bawah saja; jangan mengarang. ' +
      'Kalau ada kekeliruan, akui dengan jujur, jelaskan penyebabnya kalau terlihat dari data, dan beri langkah yang jelas (tombol mana yang ditekan, atau apa yang dikirim / ditulis). ' +
      'Kamu TIDAK bisa mengubah data lewat obrolan; kalau perlu dibetulkan setelah tercatat, katakan manajemen Moscow Supplies akan membetulkannya. ' +
      'Jangan memanggil "Bapak". Format: teks biasa, boleh pakai tanda • untuk langkah. Jangan pakai markdown (*, #).\n\n' + PANDUAN + '\n\n' +
      (teksRobot ? 'Pesan robot yang dibalas:\n' + t(teksRobot, 1500) + '\n\n' : '') +
      'Data (JSON):\n' + JSON.stringify(isi).slice(0, 9000) + '\n\nPesan ' + nama + ': "' + t(teks, 600) + '"\n\n' +
      'Kalau pesan ini ternyata bukan pertanyaan / bukan untuk robot (obrolan biasa antar anggota), jawab persis: -';
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'x-api-key': kunci, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: MODEL, max_tokens: 700, messages: [{ role: 'user', content: perintah }] }),
      });
      const j = await r.json();
      if (!r.ok) { console.error('bantu ai', j?.error?.message); return ''; }
      return String((j.content || []).map((c: Any) => c.text || '').join('')).trim();
    } catch (e) { console.error('bantu', e); return ''; }
  }
  // true = pesan sudah dijawab / ditangani
  async function jawab(m: Any, nama: string): Promise<boolean> {
    const chat = m.chat || {}, dari = m.from || {}, teks = String(m.text || '').trim();
    const rt = m.reply_to_message, keRobot = !!(rt && rt.from && rt.from.is_bot);
    if (!perluJawab(m, teks, keRobot)) return false;
    const isi = await konteks(String(dari.id), keRobot ? Number(rt.message_id) : null);
    const j = await tanyaAI(nama, teks, isi, keRobot ? String(rt.text || rt.caption || '') : '');
    if (!j) return false;
    if (j === '-') return true;
    await api('sendMessage', { chat_id: chat.id, reply_to_message_id: m.message_id, text: '🤖 ' + esc(j).slice(0, 3900), parse_mode: 'HTML', disable_web_page_preview: true });
    await sb.from('bb_obrolan').insert({ uid: String(dari.id), nama, tanya: t(teks, 1000), jawab: t(j, 2000), bukti: isi.fokus ? Number(String(isi.fokus.bukti).slice(1)) : null });
    return true;
  }
  return { jawab, perluJawab };
}
