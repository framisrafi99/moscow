-- 170 (5 Nov 2026): uang sudah tercatat di accounting, tapi pengajuannya masih "belum dibayar".
-- 1) _plx_bayar_inti mendapat p_tr: kalau diisi, transaksi accounting yang SUDAH ADA dipakai (tidak mencatat uang keluar lagi).
--    Status pengajuan, harga beli (+ laporan harga naik), PO barang jualan, pemberitahuan tetap jalan seperti tombol Bayar.
-- 2) bb_tandai(p_id, p_oleh): tombol robot "✅ Tandai sudah dibayar" (rencana di bb_bukti.baca.tandai).
-- 3) bb_pengingat_ajuan(): teks pengingat harian pengajuan yang sudah di-ACC > 3 hari tapi belum dibayar (dikirim robot ke grup).

do $$
declare d text;
begin
  d := pg_get_functiondef('public._plx_bayar_inti(text,text,text,text,jsonb,text,text)'::regprocedure);
  d := replace(d, 'FUNCTION public._plx_bayar_inti(p_toko text, p_bayar text, p_tanggal text, p_nama text, p_items jsonb, p_token text, p_oleh text)',
                  'FUNCTION public._plx_bayar_inti(p_toko text, p_bayar text, p_tanggal text, p_nama text, p_items jsonb, p_token text, p_oleh text, p_tr text)');
  d := replace(d, $q$tr := public._acc_keluar(p_tanggal, v_bayar, kat, ket, tot, 'purchasing: ' || v_oleh);$q$,
                  $q$tr := coalesce(nullif(btrim(coalesce(p_tr, '')), ''), public._acc_keluar(p_tanggal, v_bayar, kat, ket, tot, 'purchasing: ' || v_oleh));$q$);
  if position('p_tr text)' in d) = 0 or position('nullif(btrim(coalesce(p_tr' in d) = 0 then raise exception '_plx_bayar_inti p_tr: penggantian gagal'; end if;
  execute d;
end $$;

-- versi 7 argumen tetap ada (dipakai plx_bayar & bb_bayar): memanggil versi baru tanpa p_tr
create or replace function public._plx_bayar_inti(p_toko text, p_bayar text, p_tanggal text, p_nama text, p_items jsonb, p_token text, p_oleh text)
returns json language sql security definer set search_path to 'public' as $function$
  select public._plx_bayar_inti(p_toko, p_bayar, p_tanggal, p_nama, p_items, p_token, p_oleh, null::text);
$function$;

create or replace function public.bb_tandai(p_id bigint, p_oleh text)
returns json language plpgsql security definer set search_path to 'public' as $function$
declare b record; rc jsonb; tr text; a record; res jsonb; oleh text := left(btrim(coalesce(p_oleh, '')), 30); n text;
begin
  select * into b from bb_bukti where id = p_id for update;
  if b.id is null then return json_build_object('ok', false, 'pesan', 'Bukti tidak ditemukan.'); end if;
  if b.status in ('dicatat', 'cocok') then return json_build_object('ok', false, 'pesan', 'Sudah diproses: ' || coalesce(b.acc_no, '-')); end if;
  rc := b.baca -> 'tandai';
  if rc is null or jsonb_array_length(coalesce(rc -> 'p', '[]')) = 0 then return json_build_object('ok', false, 'pesan', 'Tidak ada pengajuan yang perlu ditandai.'); end if;
  tr := rc -> 'tr' ->> 0;
  select btrim(no) no, public._rapi_spasi(akun, 60) akun, tanggal into a from acc_log where btrim(no) = tr;
  if a.no is null then return json_build_object('ok', false, 'pesan', 'Transaksi ' || coalesce(tr, '?') || ' tidak ditemukan.'); end if;
  if length(oleh) < 2 then oleh := coalesce(b.pengirim, 'Telegram'); end if;
  res := public._plx_bayar_inti(coalesce(nullif(btrim(rc ->> 'toko'), ''), 'Toko (bukti Telegram)'), a.akun, to_char(a.tanggal, 'YYYY-MM-DD'), oleh,
           (select jsonb_agg(jsonb_build_object('no', z ->> 'no', 'q', z ->> 'q', 't', z ->> 't')) from jsonb_array_elements(rc -> 'p') z), 'bbt' || b.id, oleh, a.no)::jsonb;
  if res ? 'perluAlasan' then
    return json_build_object('ok', false, 'pesan', 'Ada barang yang sudah pernah dibelanjakan (' || (select string_agg(k, ', ') from jsonb_object_keys(res -> 'perluAlasan') k)
      || '). Tandai lewat aplikasi Purchasing supaya alasannya bisa diisi.');
  end if;
  if coalesce((res ->> 'lewat')::boolean, false) then return json_build_object('ok', false, 'pesan', 'Ada barang jualan yang belum punya kode di Master Data. Tandai lewat aplikasi Purchasing.'); end if;
  if not coalesce((res ->> 'ok')::boolean, false) then return json_build_object('ok', false, 'pesan', coalesce(res ->> 'pesan', 'Gagal menyimpan.')); end if;
  for n in select jsonb_array_elements_text(coalesce(rc -> 'tr', '[]')) loop
    insert into acc_bukti (acc_no, bukti_id) values (n, b.id) on conflict do nothing;
  end loop;
  update bb_bukti set status = 'cocok', acc_no = (select string_agg(x, ', ') from jsonb_array_elements_text(rc -> 'tr') x), diubah = now() where id = b.id;
  return json_build_object('ok', true, 'tr', a.no, 'pesan', res ->> 'pesan');
end $function$;

-- pengingat harian: pengajuan Disetujui > 3 hari yang belum dibayar (lokal & impor). null = tidak ada.
create or replace function public.bb_pengingat_ajuan()
returns text language sql stable security definer set search_path to 'public' as $function$
  select case when count(*) = 0 then null else
    '⏰ PENGINGAT PEMBAYARAN' || E'\n' || 'Pengajuan ini sudah di-ACC lebih dari 3 hari tapi belum ditandai dibayar:' || E'\n\n'
    || string_agg('• ' || z.no || ' · ' || z.n || ' · ' || public._gd_fmt(coalesce(z.qs, z.q)) || ' ' || coalesce(nullif(z.s, ''), 'pcs')
                  || case when z.imp then ' 🌏 impor' else '' end || ' (' || coalesce(nullif(z.pg, ''), z.bg) || ', ' || ((now() at time zone 'Asia/Makassar')::date - z.t::date) || ' hari)',
                  E'\n' order by z.t, z.no)
    || E'\n\n' || 'Sudah dibayar? Kirim bukti bayarnya ke grup ini lalu tekan ✅ Sudah dibayar (atau ✅ Tandai sudah dibayar kalau uangnya sudah tercatat).'
    || E'\n' || 'Batal dibeli? Pengaju membatalkan lewat ✏️ Koreksi di aplikasi.' end
  from (select * from public._pgd_ajuan() a where a.st = 'Disetujui' and a.t ~ '^\d{4}-\d{2}-\d{2}$'
          and a.t::date <= (now() at time zone 'Asia/Makassar')::date - 3 order by a.t, a.no limit 30) z;
$function$;

revoke all on function public._plx_bayar_inti(text, text, text, text, jsonb, text, text, text), public.bb_tandai(bigint, text), public.bb_pengingat_ajuan()
  from public, anon, authenticated;
grant execute on function public._plx_bayar_inti(text, text, text, text, jsonb, text, text, text), public.bb_tandai(bigint, text), public.bb_pengingat_ajuan() to service_role;

-- jadwal: tiap hari 09:13 WITA (01:13 UTC) robot mengirim pengingat ke grup Bukti Bayar (kalau ada)
select cron.schedule('bukti-bayar-pengingat', '13 1 * * *', $c$
  select net.http_post(url := 'https://ufhuvwfudblbyrwzugaa.supabase.co/functions/v1/tg-tombol',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-moscow-robot-kunci', (select kunci from public.robot_kunci where id = 1)),
    body := '{"pengingat":true}'::jsonb, timeout_milliseconds := 60000)
$c$);
