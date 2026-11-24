-- 215 (24 Nov 2026): bukti Shopee / nota jadi patokan untuk belanja yang sudah dicatat lewat Purchasing.
-- Contoh: Purchasing mencatat amplas Rp339.800, bukti Shopee berisi amplas Rp351.913 + tisu Rp155.195 = Rp507.108.
-- Robot Telegram (bukti.ts: pecahBukti) memanggil bb_pecah:
--   * harga barang Purchasing disesuaikan dengan rincian di bukti (_plx_sesuaikan: harga beli, PO lokal, catatan accounting);
--   * barang tambahan di bukti (sisa) dicatat sebagai transaksi baru;
--   * bukti ditempel ke semua catatan itu.

create or replace function public._plx_sesuaikan(p_pg text, p_total numeric, p_catatan text)
returns json language plpgsql security definer set search_path to 'public' as $$
declare a record; lama numeric; beda numeric; po text; h record; i record; p record; t record;
begin
  select * into a from pengadaan_ajuan where btrim(no) = btrim(p_pg) and ref_po_supplier like 'Dibayar Viory%' order by id desc limit 1;
  if a.id is null then return json_build_object('ok', false, 'pesan', p_pg || ' bukan belanja lokal yang dibayar lewat aplikasi.'); end if;
  lama := replace(substring(a.ref_po_supplier from 'Rp ([0-9.]+)'), '.', '')::numeric;
  if lama is null or p_total is null or p_total <= 0 then return json_build_object('ok', false, 'pesan', 'Nominal ' || p_pg || ' tidak terbaca.'); end if;
  beda := round(p_total) - lama;
  if beda = 0 then return json_build_object('ok', true, 'pg', p_pg, 'beda', 0); end if;
  -- catatan pengajuan (ref memuat nominal yang dibaca robot Telegram)
  if a.baris_sheet is not null then perform public._ubah_catat('pengadaan_ajuan', a.id, array['ref_po_supplier']); end if;
  update pengadaan_ajuan set ref_po_supplier = regexp_replace(ref_po_supplier, 'Rp [0-9.]+', 'Rp ' || public._gd_fmt(round(p_total))) where id = a.id;
  -- harga beli (HPP)
  select * into h from harga_beli_log where btrim(no) = btrim(p_pg) order by id desc limit 1;
  if h.id is not null then update harga_beli_log set total = round(p_total), harga_satuan = round(round(p_total) / nullif(qty, 0), 2) where id = h.id; end if;
  -- PO lokal untuk barang jualan
  po := substring(a.ref_po_supplier from '(PO-[0-9]{6}-[0-9]{3})');
  if po is not null then
    select * into i from po_item where btrim(no_po) = po and upper(btrim(coalesce(kode, ''))) = upper(btrim(coalesce(a.kode, ''))) order by id limit 1;
    if i.id is not null then
      if i.baris_sheet is not null then perform public._ubah_catat('po_item', i.id, array['harga_satuan', 'subtotal']); end if;
      update po_item set subtotal = round(p_total), harga_satuan = round(round(p_total) / nullif(qty, 0), 2) where id = i.id;
      select * into p from po_log where btrim(no_po) = po order by id desc limit 1;
      if p.id is not null then
        if p.baris_sheet is not null then perform public._ubah_catat('po_log', p.id, array['total_barang']); end if;
        update po_log set total_barang = coalesce(total_barang, 0) + beda where id = p.id;
      end if;
    end if;
  end if;
  -- catatan accounting Purchasing yang memuat nomor pengajuan ini
  select * into t from acc_log where status = 'Aktif' and pengisi like 'purchasing:%' and keterangan like '%' || btrim(p_pg) || '%' order by id desc limit 1;
  if t.id is not null then
    if t.baris_sheet is not null then perform public._ubah_catat('acc_log', t.id, array['nominal', 'keterangan']); end if;
    update acc_log set nominal = nominal + beda,
           keterangan = keterangan || ' [' || btrim(p_pg) || ' disesuaikan dengan bukti: Rp ' || public._gd_fmt(lama) || ' → Rp ' || public._gd_fmt(round(p_total))
                        || case when coalesce(p_catatan, '') <> '' then ', ' || p_catatan else '' end || ']'
     where id = t.id;
  end if;
  return json_build_object('ok', true, 'pg', p_pg, 'lama', lama, 'baru', round(p_total), 'beda', beda, 'tr', t.no, 'po', po);
end $$;
revoke all on function public._plx_sesuaikan(text, numeric, text) from public, anon, authenticated;

create or replace function public.bb_pecah(p_id bigint, p_cocok jsonb, p_sisa numeric, p_sisa_ket text, p_oleh text)
returns json language plpgsql security definer set search_path to 'public' as $$
declare b record; c jsonb; r json; trs text[] := '{}'; ubah jsonb := '[]'; baru text; kat text;
begin
  select * into b from bb_bukti where id = p_id for update;
  if b.id is null then return json_build_object('ok', false, 'pesan', 'Bukti tidak ditemukan.'); end if;
  if b.status in ('dicatat', 'cocok', 'sama') then return json_build_object('ok', false, 'pesan', 'Bukti ini sudah diproses.'); end if;
  for c in select value from jsonb_array_elements(coalesce(p_cocok, '[]')) loop
    r := public._plx_sesuaikan(c ->> 'pg', (c ->> 'total')::numeric, 'bukti #' || p_id);
    if not coalesce((r ->> 'ok')::boolean, false) then raise exception '%', r ->> 'pesan'; end if;
    if (r ->> 'beda')::numeric <> 0 then ubah := ubah || jsonb_build_object('pg', r ->> 'pg', 'lama', (r ->> 'lama')::numeric, 'baru', (r ->> 'baru')::numeric); end if;
    if coalesce(r ->> 'tr', '') <> '' and not ((r ->> 'tr') = any (trs)) then trs := trs || (r ->> 'tr'); end if;
    if coalesce(c ->> 'tr', '') <> '' and not ((c ->> 'tr') = any (trs)) then trs := trs || (c ->> 'tr'); end if;
  end loop;
  if coalesce(p_sisa, 0) > 0 then
    if coalesce(b.akun, '') = '' then raise exception 'Akun bayar bukti belum diisi.'; end if;
    kat := coalesce(nullif(b.kategori, ''), 'Biaya lain-lain');
    baru := public._acc_keluar(to_char(coalesce(b.tanggal, (now() at time zone 'Asia/Makassar')::date), 'YYYY-MM-DD'), b.akun, kat,
      left(coalesce(nullif(p_sisa_ket, ''), b.keterangan, 'Sisa bukti') || ' (sisa bukti #' || p_id || '; barang lain di bukti yang sama sudah tercatat di ' || array_to_string(trs, ', ') || ')', 185) || ' [Telegram: ' || coalesce(b.pengirim, '') || ']',
      round(p_sisa), 'telegram: ' || coalesce(nullif(p_oleh, ''), b.pengirim, ''));
    trs := trs || baru;
  end if;
  perform public.bb_tempel(p_id, trs);
  return json_build_object('ok', true, 'trs', to_jsonb(trs), 'baru', baru, 'ubah', ubah);
end $$;
revoke all on function public.bb_pecah(bigint, jsonb, numeric, text, text) from public, anon, authenticated;

insert into sql_terpasang (file, cara, catatan)
select '215_bb_pecah.sql', 'mcp', 'Bukti jadi patokan: harga Purchasing disesuaikan, barang tambahan dicatat terpisah'
where not exists (select 1 from sql_terpasang where file = '215_bb_pecah.sql');
