-- Koreksi qty pengajuan yang sudah di-ACC (Disetujui / Dipesan / Diterima): qty yang benar-benar dibeli.
-- Manajemen Moscow Supplies: semua pengajuan, qty bebas.
-- Link Purchasing (purchasing_shopeepay): hanya barang yang dibelanjakan & dibayar lewat link Purchasing (ref "Dibayar Viory").
-- Barang jualan yang dibelanjakan punya PO lokal: selama PO belum diterima gudang, qty di PO ikut dikoreksi
-- (subtotal = uang yang dibayar tetap, harga satuan dihitung ulang), supaya penerimaan gudang dan HPP sesuai.
-- Riwayat koreksi ditambahkan ke catatan_putus; pemberitahuan Telegram lewat efek_antre.
create or replace function public.pengadaan_koreksi_qty(p_no text, p_qty numeric, p_alasan text, p_nama text)
returns json language plpgsql security definer set search_path = public as $$
declare
  peran text := (select public.peran_saya()); x record; v_qty numeric := round(coalesce(p_qty, 0), 3);
  cat text := public._rapi_spasi(p_alasan, 200); v_nama text := public._rapi_spasi(p_nama, 40); v_oleh text; lama numeric; v_po text; i record; po_ket text := '';
  jam text := to_char(now() at time zone 'Asia/Makassar', 'DD/MM/YYYY HH24:MI'); catat text;
begin
  if not public._boleh_peran(array['purchasing_shopeepay']) then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  if not (v_qty > 0) then return json_build_object('ok', false, 'pesan', 'Qty harus lebih dari 0.'); end if;
  if length(coalesce(cat, '')) < 3 then return json_build_object('ok', false, 'pesan', 'Tulis alasan koreksi qty.'); end if;
  perform pg_advisory_xact_lock(hashtext('staf|pengadaan_ajuan'));
  select a.id, a.baris_sheet, btrim(a.no) no, coalesce(nullif(public._rapi_spasi(a.status, 20), ''), 'Menunggu') st,
         coalesce(a.qty_disetujui, a.qty, 0) qs, public._rapi_spasi(a.nama, 120) n, public._rapi_spasi(a.satuan, 15) s, a.catatan_putus cp,
         coalesce(a.ref_po_supplier, '') ref, upper(public._rapi_spasi(a.kode, 60)) k, upper(coalesce(public._rapi_spasi(a.warna, 60), '')) w,
         case when btrim(coalesce(a.asal_barang, '')) = 'Impor' then true when btrim(coalesce(a.asal_barang, '')) = 'Lokal' then false
              else public._rapi_spasi(a.kelompok, 40) = 'Barang jualan' or (public._rapi_spasi(a.kelompok, 40) = 'Botol & stiker' and upper(public._rapi_spasi(a.kode, 60)) ~ '^(BT2|BT3)$') end imp
    into x from pengadaan_ajuan a where btrim(coalesce(a.no, '')) = btrim(coalesce(p_no, '')) order by a.baris_sheet nulls last, a.id limit 1;
  if x.id is null then return json_build_object('ok', false, 'pesan', 'Pengajuan tidak ditemukan.'); end if;
  if x.st not in ('Disetujui', 'Dipesan', 'Diterima') then return json_build_object('ok', false, 'pesan', 'Qty hanya bisa dikoreksi untuk pengajuan yang sudah di-ACC (status sekarang: ' || x.st || ').'); end if;
  lama := x.qs;
  if v_qty = lama then return json_build_object('ok', false, 'pesan', 'Qty sama dengan sebelumnya.'); end if;
  if peran = 'manajemen' then
    v_oleh := coalesce(public._mgmt_nama(), 'manajemen Moscow Supplies');
  else
    if x.ref not like 'Dibayar Viory%' then return json_build_object('ok', false, 'pesan', 'Dari link Purchasing, qty hanya bisa dikoreksi untuk barang yang dibelanjakan lewat link ini. Lainnya dikoreksi manajemen Moscow Supplies.'); end if;
    v_oleh := case when length(coalesce(v_nama, '')) >= 2 then 'Purchasing (' || v_nama || ')' else 'Purchasing' end;
  end if;
  catat := 'Koreksi qty ' || public._gd_fmt(lama) || ' → ' || public._gd_fmt(v_qty) || ' oleh ' || v_oleh || ' ' || jam || ': ' || cat;
  if x.baris_sheet is not null then perform public._ubah_catat('pengadaan_ajuan', x.id, array['qty_disetujui', 'catatan_putus']); end if;
  update pengadaan_ajuan set qty_disetujui = v_qty,
    catatan_putus = left(case when coalesce(btrim(catatan_putus), '') = '' then catat else catatan_putus || ' | ' || catat end, 1000)
   where id = x.id;
  -- PO lokal dari belanja ini (barang jualan): koreksi qty selama PO belum diterima.
  v_po := substring(x.ref from '(PO-[0-9]{6}-[0-9]+)');
  if v_po is not null then
    if exists (select 1 from po_log where public._rapi_spasi(no_po, 30) = v_po and status = 'Dibayar') then
      for i in select id, baris_sheet, subtotal from po_item where public._rapi_spasi(no_po, 30) = v_po and upper(coalesce(kode, '')) = x.k
                 and upper(coalesce(public._rapi_spasi(warna, 60), '')) = x.w and qty = lama loop
        if i.baris_sheet is not null then perform public._ubah_catat('po_item', i.id, array['qty', 'harga_satuan']); end if;
        update po_item set qty = v_qty, harga_satuan = round(coalesce(i.subtotal, 0) / v_qty, 2) where id = i.id;
        po_ket := ' Qty di ' || v_po || ' ikut dikoreksi (total bayar tetap).';
      end loop;
    else
      po_ket := ' ' || v_po || ' sudah diproses gudang, qty di PO tidak diubah.';
    end if;
  end if;
  insert into efek_antre (jenis, data) values ('tg', jsonb_build_object(
    'teks', '✏️ <b>KOREKSI QTY PENGAJUAN</b>' || E'\nOleh: <b>' || public._tg_esc(v_oleh) || E'</b>\n\n• ' || public._tg_esc(x.no || ' ' || coalesce(x.n, ''))
      || ' — ' || public._gd_fmt(lama) || ' → <b>' || public._gd_fmt(v_qty) || '</b> ' || public._tg_esc(coalesce(nullif(x.s, ''), 'pcs'))
      || E'\n\nAlasan: ' || public._tg_esc(cat) || case when po_ket <> '' then E'\n' || public._tg_esc(btrim(po_ket)) else '' end || E'\n\n<i>' || jam || '</i>',
    'asal', case when peran = 'manajemen' then jsonb_build_object('e', '🔑', 'n', (public._mgmt_nama() || ''), 'nama', '')
                 else jsonb_build_object('e', '💳', 'n', 'Purchasing', 'nama', coalesce(v_nama, '')) end));
  return json_build_object('ok', true, 'pesan', 'Qty ' || x.n || ' dikoreksi dari ' || public._gd_fmt(lama) || ' menjadi ' || public._gd_fmt(v_qty) || ' ' || coalesce(nullif(x.s, ''), 'pcs') || '.' || po_ket);
end $$;
revoke all on function public.pengadaan_koreksi_qty(text, numeric, text, text) from public, anon;
grant execute on function public.pengadaan_koreksi_qty(text, numeric, text, text) to authenticated;
