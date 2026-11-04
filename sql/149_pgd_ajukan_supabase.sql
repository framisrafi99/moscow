-- 149 (4 Nov 2026): efek pgd_ajukan (pengajuan pembelian staf) dikerjakan Edge Function efek-hitung:
--   cek kenaikan harga (HRG_peta_ ringan -> _hrg_catat), pesan pribadi Mike (efek pl_mike) / Viory (pl_viory), pesan grup (tg / tg_tombol 'pgd').
-- pl_mike / pl_viory dikirim kirim-telegram bila rahasia TG_CHAT_MIKE / TG_VIORY diisi; selama kosong dikirim Apps Script.
grant execute on function public._hrg_catat(jsonb) to service_role;
-- Jadwal: job 11 (efek-hitung) + 'pgd_ajukan'; job 10 (kirim-telegram) + 'pl_mike'. Apps Script versi 269: SBE_SUPABASE_ + 'pgd_ajukan', SBE_JENIS_.pl_mike.
