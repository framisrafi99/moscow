-- 211 · 17 Nov 2026 · Pengingat harian: akun Telegram pribadi yang belum terdaftar di Admin Accounting
-- Tiap pagi (09.00 WITA, Senin-Sabtu) Admin Accounting mengirim pesan ke grup pemberitahuan selama Mike / Viory belum
-- terdaftar di tg_akun. Begitu keduanya terdaftar, jadwalnya berhenti sendiri.

create or replace function public.tg_daftar_ingat()
 returns void language plpgsql security definer set search_path to 'public'
as $function$
declare kurang text;
begin
  select string_agg('• <b>' || l || '</b>', E'\n' order by u) into kurang
    from (values (1, 'mike', 'Mike'), (2, 'viory', 'Viory (Purchasing)')) v(u, p, l)
   where not exists (select 1 from tg_akun a where a.peran = v.p);
  if kurang is null then
    perform cron.unschedule('tg-daftar-pengingat');
    return;
  end if;
  insert into efek_antre (jenis, data) values ('tg', jsonb_build_object('teks',
    E'⚠️ <b>PENGINGAT: DAFTAR AKUN TELEGRAM</b>\n\nAkun Telegram pribadi berikut belum terdaftar di Admin Accounting:\n' || kurang ||
    E'\n\nSelama belum terdaftar, pesan pribadi seperti pengajuan yang perlu di-ACC bisa terlambat sampai, dan tombol Setujui / Tolak di Telegram belum bisa dipakai.\n\n<b>Cara daftar (sekali saja):</b>\n1. Minta kode daftar 6 angka ke manajemen Moscow Supplies. Kode berlaku 30 menit.\n2. Buka chat pribadi dengan Admin Accounting.\n3. Kirim: <b>/daftar KODE</b>\n\nPengingat ini berhenti sendiri setelah semuanya terdaftar.',
    'asal', jsonb_build_object('e', '🔑', 'n', 'Manajemen Moscow Supplies')));
end $function$;

revoke all on function public.tg_daftar_ingat() from public, anon, authenticated;

select cron.unschedule('tg-daftar-pengingat') where exists (select 1 from cron.job where jobname = 'tg-daftar-pengingat');
select cron.schedule('tg-daftar-pengingat', '0 1 * * 1-6', $$ select public.tg_daftar_ingat() $$);

insert into public.sql_terpasang (file, cara, catatan)
values ('211_tg_daftar_pengingat.sql', 'mcp', 'Pengingat harian daftar akun Telegram pribadi (Mike, Viory)')
on conflict do nothing;
