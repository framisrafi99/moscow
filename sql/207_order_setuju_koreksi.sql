-- 12 Nov 2026: Persetujuan request barang toko & consignment dengan KOREKSI jumlah.
-- Manajemen bisa mengubah jumlah tiap barang sebelum menyetujui (mis. disesuaikan stok Gudang Utama atau saran robot).
-- - Jumlah disetujui: bilangan bulat 0 .. stok Gudang Utama yang tersedia (_gd_tersedia). 0 = barang tidak dikirim.
-- - Baris order tidak dihapus: qty / subtotal / total diganti; jumlah yang diminta semula dicatat di order_proses
--   (aksi 'Dikoreksi', detail JSON) dan diringkas di catatan order.
-- - Sesudah itu statusnya Disetujui lewat order_status (Telegram persetujuan seperti biasa) + pesan rincian koreksi.
create or replace function public.order_setuju_koreksi(p_no text, p_items jsonb, p_alasan text)
 returns json language plpgsql security definer set search_path to 'public'
as $function$
#variable_conflict use_column
declare
  v_no text := btrim(coalesce(p_no, '')); v_alasan text := left(btrim(regexp_replace(coalesce(p_alasan, ''), '[\r\n]+', ' ', 'g')), 200);
  x record; peta jsonb := '{}'; it jsonb; sedia jsonb; baru numeric; ada numeric; s text; k text; w text;
  rinci jsonb := '[]'; ubah int := 0; nol int := 0; minta numeric := 0; setuju numeric := 0; kini timestamptz := now(); r json; pertama record; teks text; ringkas text;
begin
  if (select public.peran_saya()) is distinct from 'manajemen' then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  if v_no = '' or p_items is null or jsonb_typeof(p_items) <> 'array' then return json_build_object('ok', false, 'pesan', 'Permintaan tidak lengkap.'); end if;
  perform pg_advisory_xact_lock(hashtext('toko|order_log'));
  select id, btrim(coalesce(status, '')) st, btrim(coalesce(pelanggan, '')) pl, btrim(coalesce(tipe, '')) tp, coalesce(catatan, '') c into pertama
    from order_log where btrim(coalesce(no_order, '')) = v_no order by baris_sheet nulls last, id limit 1;
  if pertama.pl is null then return json_build_object('ok', false, 'pesan', 'Request ' || v_no || ' tidak ditemukan.'); end if;
  if pertama.st <> 'Menunggu' then return json_build_object('ok', false, 'pesan', 'Request ' || v_no || ' sudah berstatus ' || pertama.st || '. Muat ulang.'); end if;
  if pertama.tp <> 'Consignment' then return json_build_object('ok', false, 'pesan', 'Koreksi jumlah hanya untuk request toko & consignment.'); end if;
  for it in select value from jsonb_array_elements(p_items) loop
    k := upper(btrim(coalesce(it ->> 'k', '')));
    if k = '' then continue; end if;
    s := btrim(coalesce(it ->> 'q', ''));
    if s !~ '^\d{1,7}$' then return json_build_object('ok', false, 'pesan', 'Jumlah disetujui untuk ' || k || ' harus bilangan bulat, minimal 0.'); end if;
    peta := peta || jsonb_build_object(k, s::numeric);
  end loop;
  sedia := public._gd_tersedia();
  -- periksa dulu semuanya, baru diubah
  for x in select id, upper(btrim(kode)) kode, coalesce(nama, '') nama, coalesce(qty, 0) qty from order_log where btrim(coalesce(no_order, '')) = v_no loop
    baru := case when peta ? x.kode then (peta ->> x.kode)::numeric else x.qty end;
    k := split_part(x.kode, '-', 1); w := case when position('-' in x.kode) > 0 then public._rapi_warna(substr(x.kode, position('-' in x.kode) + 1)) else '' end;
    ada := coalesce((sedia ->> (k || '|' || w))::numeric, 0);
    if baru > ada then
      return json_build_object('ok', false, 'pesan', 'Stok Gudang Utama untuk ' || x.nama || ' tinggal ' || public._gd_fmt(ada) || ' pcs, jadi tidak bisa disetujui ' || public._gd_fmt(baru) || ' pcs.');
    end if;
    minta := minta + x.qty; setuju := setuju + baru;
  end loop;
  if setuju <= 0 then return json_build_object('ok', false, 'pesan', 'Semua jumlah 0. Kalau tidak ada yang dikirim, pakai tombol Tolak.'); end if;
  for x in select id, baris_sheet bs, upper(btrim(kode)) kode, coalesce(nama, '') nama, coalesce(qty, 0) qty, coalesce(harga, 0) harga, coalesce(diskon_persen, 0) dp
             from order_log where btrim(coalesce(no_order, '')) = v_no order by baris_sheet nulls last, id loop
    baru := case when peta ? x.kode then (peta ->> x.kode)::numeric else x.qty end;
    if baru = x.qty then continue; end if;
    ubah := ubah + 1; if baru = 0 then nol := nol + 1; end if;
    rinci := rinci || jsonb_build_object('k', x.kode, 'n', x.nama, 'minta', x.qty, 'setuju', baru);
    if x.bs is not null then perform public._ubah_catat('order_log', x.id, array['qty', 'subtotal', 'nilai_diskon', 'total']); end if;
    update order_log set qty = baru, subtotal = baru * x.harga, nilai_diskon = round(baru * x.harga * x.dp / 100),
           total = baru * x.harga - round(baru * x.harga * x.dp / 100) where id = x.id;
  end loop;
  if ubah > 0 then
    ringkas := 'Dikoreksi manajemen Moscow Supplies: diminta ' || public._gd_fmt(minta) || ' pcs, disetujui ' || public._gd_fmt(setuju) || ' pcs'
      || case when nol > 0 then ' (' || nol || ' barang tidak dikirim)' else '' end || case when v_alasan <> '' then '. ' || v_alasan else '' end || '.';
    insert into order_proses (waktu, no_order, aksi, oleh, catatan, detail)
    values (kini, v_no, 'Dikoreksi', (public._mgmt_nama() || ''), left(ringkas, 300), jsonb_build_object('minta', minta, 'setuju', setuju, 'items', rinci)::text);
    select id, baris_sheet bs, coalesce(catatan, '') c into x from order_log where id = pertama.id;
    if x.bs is not null then perform public._ubah_catat('order_log', x.id, array['catatan']); end if;
    update order_log set catatan = left(btrim(x.c || case when x.c <> '' then ' | ' else '' end || ringkas), 500) where id = x.id;
  end if;
  r := public.order_status(v_no, '', 'setuju', v_alasan);
  if not coalesce((r ->> 'ok')::boolean, false) then raise exception '%', coalesce(r ->> 'pesan', 'Gagal menyetujui.'); end if;
  if ubah > 0 then
    teks := '✏️ <b>REQUEST DIKOREKSI</b> ' || public._tg_esc(v_no) || E'\n' || public._tg_esc(pertama.pl)
      || E'\nDiminta ' || public._gd_fmt(minta) || ' pcs → disetujui <b>' || public._gd_fmt(setuju) || ' pcs</b>'
      || coalesce(E'\n' || (select string_agg('• ' || public._tg_esc(v ->> 'n') || ': ' || (v ->> 'minta') || ' → ' || (v ->> 'setuju'), E'\n')
                              from (select v from jsonb_array_elements(rinci) v limit 25) z), '')
      || case when jsonb_array_length(rinci) > 25 then E'\n… dan ' || (jsonb_array_length(rinci) - 25) || ' barang lain' else '' end
      || case when v_alasan <> '' then E'\nCatatan: ' || public._tg_esc(v_alasan) else '' end
      || E'\nJumlah disesuaikan dengan stok Gudang Utama dan kebutuhan toko paling lama 2 bulan.';
    insert into efek_antre (jenis, data) values ('tg', jsonb_build_object('teks', teks, 'asal', jsonb_build_object('e', '🔑', 'n', (public._mgmt_nama() || ''))));
  end if;
  return json_build_object('ok', true, 'no', v_no, 'ubah', ubah, 'pesan',
    'Request ' || v_no || ' (' || pertama.pl || ') disetujui' || case when ubah > 0 then ' dengan koreksi: ' || public._gd_fmt(setuju) || ' pcs dari ' || public._gd_fmt(minta) || ' pcs yang diminta.' else '.' end
    || ' Staf gudang bisa menyiapkan barangnya.');
end $function$;
grant execute on function public.order_setuju_koreksi(text, jsonb, text) to authenticated;

-- 12 Nov 2026 (lanjutan): produk buatan sendiri (kategori 'Produk Cat Moscow' dan 'Produk Kenka by Moscow') bisa diproduksi,
-- jadi tidak dibatasi stok Gudang Utama. Fungsi bantu _brg_produksi(kode) dipakai di toko_simpan_order, order_setuju_koreksi,
-- dan toko_restok_info (saran tidak dipotong stok gudang; elemen ke-7 items = 1 untuk produk sendiri). Sudah terpasang di database.
create or replace function public._brg_produksi(p_kode text)
 returns boolean language sql stable security definer set search_path to 'public'
as $function$
  select exists (select 1 from barang_order b where upper(btrim(b.kode)) = split_part(upper(btrim(coalesce(p_kode, ''))), '-', 1)
                    and btrim(coalesce(b.kategori, '')) in ('Produk Cat Moscow', 'Produk Kenka by Moscow'));
$function$;
