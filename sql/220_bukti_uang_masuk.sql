-- 220 (25 Nov 2026): Admin Accounting membaca bukti UANG MASUK penjualan langsung (mis. transfer pembeli ke Rekening PT).
--  * bb_order_terbuka(nominal, teks): order yang masih punya sisa tagihan (total + ongkir - pembayaran di order_kuitansi),
--    diurutkan dari yang paling cocok (nomor order / nama pelanggan di caption, nominal = sisa).
--  * bb_order_bayar(id bukti, no order, oleh): pembayaran ditambahkan ke order_kuitansi (DP / pelunasan) -> kuitansi di
--    Master Data otomatis berisi pembayaran ini. Accounting TIDAK dicatat di sini: penjualan order sudah otomatis masuk
--    accounting saat order Dikirim (supaya tidak dobel).
--  * bb_catat_masuk(id bukti, oleh): uang masuk yang bukan order -> acc_log Masuk "Penjualan lain di luar sistem".
create or replace function public.bb_order_terbuka(p_nominal numeric, p_teks text)
returns jsonb language sql stable security definer set search_path = public as $$
  with o as (
    select btrim(no_order) no, min(tanggal) t, max(pelanggan) pl, round(sum(coalesce(total, 0))) tot, max(coalesce(status, '')) st
      from order_log where coalesce(tipe, '') = 'Reseller' and coalesce(btrim(no_order), '') <> '' and tanggal >= (now() at time zone 'Asia/Makassar')::date - 150
     group by 1 having bool_and(coalesce(status, '') not in ('Batal', 'Selesai'))
  ), k as (
    select o.*, coalesce((select (kw.data ->> 'ongkir')::numeric from order_kuitansi kw where kw.no_order = o.no and coalesce(kw.data ->> 'ongkir', '') ~ '^\d+$'),
                         (select sum(coalesce(p.ongkir, 0)) from order_proses p where btrim(p.no_order) = o.no and p.aksi = 'Dikirim'), 0) ongkir,
           coalesce((select sum((x ->> 'v')::numeric) from order_kuitansi kw, jsonb_array_elements(coalesce(kw.data -> 'bayar', '[]')) x
                      where kw.no_order = o.no and coalesce(x ->> 'v', '') ~ '^\d+$'), 0) dibayar
      from o
  ), s as (
    select k.*, k.tot + k.ongkir - k.dibayar sisa,
           (case when position(upper(k.no) in upper(coalesce(p_teks, ''))) > 0 then 10 else 0 end)
         + (case when exists (select 1 from regexp_split_to_table(lower(coalesce(k.pl, '')), '[^a-z0-9]+') w where length(w) >= 4 and position(w in lower(coalesce(p_teks, ''))) > 0) then 4 else 0 end)
         + (case when abs((k.tot + k.ongkir - k.dibayar) - coalesce(p_nominal, 0)) <= 1000 then 5
                 when coalesce(p_nominal, 0) < (k.tot + k.ongkir - k.dibayar) then 1 else 0 end) skor
      from k
  )
  select coalesce(jsonb_agg(jsonb_build_object('no', no, 'pl', pl, 't', t, 'st', st, 'tot', tot + ongkir, 'dibayar', dibayar, 'sisa', sisa, 'skor', skor) order by skor desc, t desc), '[]'::jsonb)
    from (select * from s where sisa > 0 and skor > 0 order by skor desc, t desc limit 3) z;
$$;
revoke all on function public.bb_order_terbuka(numeric, text) from public, anon, authenticated;

create or replace function public.bb_order_bayar(p_id bigint, p_no text, p_oleh text)
returns json language plpgsql volatile security definer set search_path = public as $$
declare b record; v_no text := btrim(coalesce(p_no, '')); d jsonb; tot numeric; v_ongkir numeric; dib numeric; ket text; ref text; dari text;
begin
  select * into b from bb_bukti where id = p_id for update;
  if b.id is null then return json_build_object('ok', false, 'pesan', 'Bukti tidak ditemukan.'); end if;
  if b.status in ('dicatat', 'cocok', 'sama', 'bukan') then return json_build_object('ok', false, 'pesan', 'Bukti ini sudah diproses.'); end if;
  if coalesce(b.nominal, 0) <= 0 then return json_build_object('ok', false, 'pesan', 'Nominal belum terbaca. Tekan ✏️ Ubah lalu tulis nominalnya.'); end if;
  if b.tanggal is null then return json_build_object('ok', false, 'pesan', 'Tanggal belum terbaca.'); end if;
  select round(sum(coalesce(total, 0))) into tot from order_log where btrim(no_order) = v_no;
  if tot is null then return json_build_object('ok', false, 'pesan', 'Order ' || v_no || ' tidak ditemukan.'); end if;
  perform pg_advisory_xact_lock(hashtext('order_kuitansi|' || v_no));
  select data into d from order_kuitansi where no_order = v_no;
  d := coalesce(d, '{}'::jsonb);
  if exists (select 1 from jsonb_array_elements(coalesce(d -> 'bayar', '[]')) x where x ->> 'bukti' = p_id::text) then
    return json_build_object('ok', false, 'pesan', 'Bukti ini sudah tercatat di order ' || v_no || '.');
  end if;
  v_ongkir := case when coalesce(d ->> 'ongkir', '') ~ '^\d+$' then (d ->> 'ongkir')::numeric
                 else coalesce((select sum(coalesce(op.ongkir, 0)) from order_proses op where btrim(op.no_order) = v_no and op.aksi = 'Dikirim'), 0) end;
  dib := coalesce((select sum((x ->> 'v')::numeric) from jsonb_array_elements(coalesce(d -> 'bayar', '[]')) x where coalesce(x ->> 'v', '') ~ '^\d+$'), 0);
  ref := nullif(btrim(coalesce(b.baca ->> 'ref', '')), '');
  dari := nullif(btrim(coalesce(b.baca ->> 'pengirim_dana', b.baca ->> 'atas_nama', '')), '');
  ket := case when dib + b.nominal >= tot + v_ongkir then (case when dib > 0 then 'Pelunasan' else 'Lunas' end) else 'DP' end || coalesce(' · ref ' || ref, '');
  d := jsonb_set(d, '{bayar}', coalesce(d -> 'bayar', '[]') || jsonb_build_array(jsonb_build_object('t', to_char(b.tanggal, 'YYYY-MM-DD'), 'v', round(b.nominal)::text, 'k', ket, 'bukti', p_id::text)));
  if dari is not null and coalesce(d ->> 'pengirim', '') = '' then d := d || jsonb_build_object('pengirim', dari); end if;
  if coalesce(d ->> 'via', '') = '' then d := d || jsonb_build_object('via', 'Transfer bank'); end if;
  insert into order_kuitansi (no_order, data, diubah, diubah_oleh) values (v_no, d, now(), 'telegram: ' || left(coalesce(p_oleh, ''), 40))
    on conflict (no_order) do update set data = excluded.data, diubah = excluded.diubah, diubah_oleh = excluded.diubah_oleh;
  update bb_bukti set status = 'dicatat', acc_no = v_no, keterangan = left('Pembayaran order ' || v_no || ' (' || ket || ')', 150), diubah = now() where id = p_id;
  return json_build_object('ok', true, 'no', v_no, 'ket', ket, 'total', tot + v_ongkir, 'dibayar', dib + b.nominal, 'sisa', greatest(0, tot + v_ongkir - dib - b.nominal));
end $$;
revoke all on function public.bb_order_bayar(bigint, text, text) from public, anon, authenticated;

create or replace function public.bb_catat_masuk(p_id bigint, p_oleh text)
returns json language plpgsql volatile security definer set search_path = public as $$
declare b record; nomor text; awalan text := 'TR-' || to_char(now() at time zone 'Asia/Makassar', 'YYMMDD') || '-'; urut int; salah text; v_akun text;
begin
  perform pg_advisory_xact_lock(hashtext('staf|acc_log'));
  select * into b from bb_bukti where id = p_id for update;
  if b.id is null then return json_build_object('ok', false, 'pesan', 'Bukti tidak ditemukan.'); end if;
  if b.status in ('dicatat', 'cocok', 'sama', 'bukan') then return json_build_object('ok', false, 'pesan', 'Bukti ini sudah diproses.'); end if;
  if coalesce(b.nominal, 0) <= 0 then return json_build_object('ok', false, 'pesan', 'Nominal belum terbaca. Tekan ✏️ Ubah lalu tulis nominalnya.'); end if;
  if b.tanggal is null then return json_build_object('ok', false, 'pesan', 'Tanggal belum terbaca.'); end if;
  v_akun := coalesce(nullif(b.akun, ''), 'Rekening PT');
  if not exists (select 1 from acc_akun where public._rapi_spasi(nama_akun, 60) = v_akun) then return json_build_object('ok', false, 'pesan', 'Akun tujuan tidak dikenal: ' || v_akun); end if;
  salah := public._tb_tolak(to_char(b.tanggal, 'YYYY-MM-DD'));
  if salah <> '' then return json_build_object('ok', false, 'pesan', salah); end if;
  urut := public._acc_urut();
  nomor := awalan || right('00' || (urut + 1)::text, 3);
  insert into acc_log (no, tanggal, jenis, akun, akun_tujuan, kategori, keterangan, nominal, waktu_input, pengisi, status)
  values (nomor, b.tanggal, 'Masuk', v_akun, '', 'Penjualan lain di luar sistem',
          left(coalesce(nullif(b.keterangan, ''), 'Uang masuk penjualan') || ' [Telegram: ' || coalesce(b.pengirim, '?') || ']', 190),
          round(b.nominal), now(), 'telegram: ' || left(coalesce(p_oleh, b.pengirim, ''), 40), 'Aktif');
  insert into acc_bukti (acc_no, bukti_id) values (nomor, b.id) on conflict do nothing;
  update bb_bukti set status = 'dicatat', acc_no = nomor, kategori = 'Penjualan lain di luar sistem', akun = v_akun, diubah = now() where id = b.id;
  return json_build_object('ok', true, 'no', nomor);
end $$;
revoke all on function public.bb_catat_masuk(bigint, text) from public, anon, authenticated;
