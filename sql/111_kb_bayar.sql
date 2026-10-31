-- 111: halaman Mike (Kendali Bisnis) › Impor: bayar pengajuan impor (kbImporBayar: Lunas / DP) dan pembayaran lanjutan
--  (kbBayarLanjut: pelunasan, ongkir cargo, bill kedua / IMP, pajak & bea masuk, lainnya) langsung di Supabase (file 80).
--  - Lunas  = impor_bayar (sama dengan impBayar, token 'kb' + token).
--  - DP     = impor_bayar tanpa Telegram-nya, lalu uang keluar jadi nominal DP, PO kembali 'Disetujui' (belum boleh diterima), catatan DP.
--  - Riwayat pembayaran: tabel kb_impor_bayar (sheet KB_IMPOR_BAYAR, disalin balik ke sheet).
--  - Biaya PO yang barangnya sudah diterima: usulan koreksi HPP dibuat Apps Script (efek 'kb_biaya' -> CHR_koreksiBiaya_).
--  - Telegram lewat efek 'tg' (asal Mike).

-- tulis balik: kb_impor_bayar boleh ditandai.
do $x$ declare d text; begin
  d := pg_get_functiondef('public.tulis_balik_tandai(text, jsonb)'::regprocedure);
  if position('''kb_impor_bayar''' in d) > 0 then return; end if;
  if position('''toko_nota_bayar''])) then' in d) = 0 then raise exception 'pola tidak ditemukan'; end if;
  execute replace(d, '''toko_nota_bayar''])) then', '''toko_nota_bayar'', ''kb_impor_bayar''])) then');
end $x$;

-- KB_t_ / KB_angka_
create or replace function public._kb_t(v text, n int)
returns text language sql immutable as $$
  select left(btrim(regexp_replace(regexp_replace(coalesce(v, ''), '[\r\n\t]+', ' ', 'g'), '\s+', ' ', 'g')), n);
$$;
create or replace function public._kb_angka(v text)
returns numeric language sql immutable as $$
  select coalesce(round(nullif(regexp_replace(coalesce(v, ''), '[^0-9]', '', 'g'), '')::numeric), 0);
$$;
-- KB_bayarBaca_(...)[ref]: { bayar, inv, sup, dp (ada DP), lanjut (ada DP / Pelunasan) }
create or replace function public._kb_bayar_ref(p_ref text)
returns jsonb language sql stable security definer set search_path = public as $$
  with r as (
    select public._kb_t(jenis, 40) j, coalesce(nominal, 0) v, total_invoice inv, public._kb_t(supplier, 80) sup,
           row_number() over (order by baris_sheet nulls last, id) u
      from kb_impor_bayar where public._kb_t(ref, 300) = p_ref and public._kb_t(ref, 300) <> '')
  select case when not exists (select 1 from r) then null else jsonb_build_object(
    'bayar', (select coalesce(sum(v), 0) from r where j in ('DP', 'Pelunasan', 'Lunas')),
    'inv', coalesce((select inv from r where inv > 0 order by u desc limit 1), 0),
    'sup', coalesce((select sup from r where sup <> '' order by u desc limit 1), ''),
    'dp', exists (select 1 from r where j = 'DP')) end;
$$;

create or replace function public.kb_impor_bayar(p_nos jsonb, p_total jsonb, p_jenis text, p_dp text, p_supplier text, p_tanggal text,
                                                 p_eta text, p_catatan text, p_token text)
returns json language plpgsql volatile security definer set search_path = public as $$
#variable_conflict use_column
declare jenis text := case when p_jenis = 'DP' then 'DP' else 'Lunas' end; tolak text; inv numeric := 0; dp numeric; no text;
  r jsonb; tok text := 'kb' || public._kb_t(p_token, 50); efek_awal bigint; o record; sup text; ref text; kini timestamptz := now();
begin
  if not public._boleh_peran(array['kendali_bisnis']) then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  tolak := public._tb_tolak(p_tanggal);
  if tolak <> '' then return json_build_object('ok', false, 'pesan', tolak); end if;
  for no in select v #>> '{}' from jsonb_array_elements(case when jsonb_typeof(p_nos) = 'array' then p_nos else '[]' end) v loop
    inv := inv + public._kb_angka(coalesce(p_total, '{}') ->> no);
  end loop;
  dp := public._kb_angka(p_dp);
  if jenis = 'DP' then
    if not (dp > 0) then return json_build_object('ok', false, 'pesan', 'Isi nominal DP.'); end if;
    if not (inv > 0) then return json_build_object('ok', false, 'pesan', 'Isi total invoice untuk setiap barang.'); end if;
    if dp >= inv then return json_build_object('ok', false, 'pesan', 'DP harus lebih kecil dari total invoice (Rp ' || public._gd_fmt(inv) || '). Kalau dibayar penuh, pilih Lunas.'); end if;
  end if;
  if jenis = 'Lunas' then return public.impor_bayar(p_nos, p_total, p_supplier, p_tanggal, p_eta, p_catatan, tok); end if;
  select coalesce(max(id), 0) into efek_awal from efek_antre;
  r := public.impor_bayar(p_nos, p_total, p_supplier, p_tanggal, p_eta, p_catatan, tok)::jsonb;
  if not coalesce((r ->> 'ok')::boolean, false) or coalesce((r ->> 'ulang')::boolean, false) then return r::json; end if;
  -- Telegram "impor sudah dibayar" diganti pesan DP (PW_TG_MATI_).
  delete from efek_antre where id > efek_awal and jenis = 'tg' and dibuat = kini and data ->> 'teks' like '%IMPOR SUDAH DIBAYAR%';
  sup := public._kb_t(p_supplier, 80);
  ref := coalesce(nullif(r ->> 'po', ''), 'AJ:' || (select string_agg(v #>> '{}', ',' order by o) from jsonb_array_elements(p_nos) with ordinality e(v, o)));
  perform pg_advisory_xact_lock(hashtext('kb_impor_bayar'));
  update acc_log set keterangan = left('DP ' || coalesce(keterangan, ''), 190), nominal = dp where btrim(no) = r ->> 'tr' and baris_sheet is null;
  if coalesce(r ->> 'po', '') <> '' then
    select id, total_barang, public._rapi(catatan, 400) c into o from po_log where public._rapi(no_po, 30) = r ->> 'po' order by baris_sheet nulls last, id limit 1;
    update po_log set status = 'Disetujui', waktu_dibayar = null,
           catatan = left(o.c || ' DP Rp ' || public._gd_fmt(dp) || ', sisa Rp ' || public._gd_fmt(greatest(0, coalesce(o.total_barang, 0) - dp)) || ' (belum boleh diterima sebelum lunas).', 400)
     where id = o.id;
  end if;
  insert into kb_impor_bayar (waktu, ref, jenis, nominal, tanggal_bayar, no_transaksi, oleh, catatan, total_invoice, supplier)
  values (kini, ref, 'DP', dp, to_date(p_tanggal, 'YYYY-MM-DD'), r ->> 'tr', 'Mike', nullif(public._kb_t(p_catatan, 200), ''), inv, nullif(sup, ''));
  insert into efek_antre (jenis, data) values ('tg', jsonb_build_object('asal', jsonb_build_object('e', '👤', 'n', 'Mike', 'nama', ''), 'teks',
    '🌏💳 <b>DP IMPOR DIBAYAR</b>' || E'\nOleh: <b>Mike</b> · Supplier: ' || public._tg_esc(sup)
    || case when coalesce(r ->> 'po', '') <> '' then E'\nPO: <b>' || public._tg_esc(r ->> 'po') || '</b>' else '' end
    || E'\nTotal invoice Rp ' || public._gd_fmt(inv) || ' · DP Rp ' || public._gd_fmt(dp) || ' · sisa Rp ' || public._gd_fmt(inv - dp)
    || E'\nTercatat di accounting ' || public._tg_esc(r ->> 'tr') || '.'
    || case when coalesce(r ->> 'po', '') <> '' then E'\nPO belum boleh diterima gudang sebelum lunas.' else '' end));
  return json_build_object('ok', true, 'po', r ->> 'po', 'tr', r ->> 'tr', 'pesan', 'DP Rp ' || public._gd_fmt(dp) || ' tercatat (' || (r ->> 'tr') || '). Sisa Rp '
    || public._gd_fmt(inv - dp) || ' dibayar lewat "Pelunasan" di PO impor berjalan.'
    || case when coalesce(r ->> 'po', '') <> '' then ' PO ' || (r ->> 'po') || ' belum boleh diterima gudang sebelum lunas.' else '' end);
end $$;

create or replace function public.kb_bayar_lanjut(p_ref text, p_jenis text, p_nominal text, p_tanggal text, p_catatan text, p_token text)
returns json language plpgsql volatile security definer set search_path = public as $$
#variable_conflict use_column
declare jenis text := public._kb_t(p_jenis, 40); ref text := public._kb_t(p_ref, 300); v numeric := public._kb_angka(p_nominal);
  cat text := public._kb_t(p_catatan, 200); salah text; is_po boolean; o record; sup text := ''; b jsonb; inv numeric; sudah numeric; tr text;
  lunas boolean; kini timestamptz := now(); kat text; teks text;
begin
  if not public._boleh_peran(array['kendali_bisnis']) then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  if jenis <> 'Pelunasan' and not (jenis = any (array['Ongkir cargo', 'Bill kedua / IMP', 'Pajak & bea masuk', 'Ongkir lokal', 'Lainnya'])) then
    return json_build_object('ok', false, 'pesan', 'Pilih jenis pembayaran.');
  end if;
  if not (v > 0) or v > 10000000000 then return json_build_object('ok', false, 'pesan', 'Isi nominal yang dibayar.'); end if;
  if jenis = 'Lainnya' and length(cat) < 3 then return json_build_object('ok', false, 'pesan', 'Untuk biaya "Lainnya", tulis keterangannya.'); end if;
  salah := public._gd_tanggal(p_tanggal);
  if salah is not null then return json_build_object('ok', false, 'pesan', salah); end if;
  salah := public._tb_tolak(p_tanggal);
  if salah <> '' then return json_build_object('ok', false, 'pesan', salah); end if;
  salah := public._acc_cek_akun('Rekening Belanja');
  if salah <> '' then return json_build_object('ok', false, 'pesan', salah); end if;
  perform pg_advisory_xact_lock(hashtext('kb_impor_bayar'));
  if coalesce(p_token, '') <> '' and exists (select 1 from toko_token where token = 'gdkbl|' || left(p_token, 60)) then
    return json_build_object('ok', true, 'ulang', true, 'pesan', 'Data ini sudah tersimpan sebelumnya (tidak dicatat dua kali).');
  end if;
  is_po := left(ref, 3) <> 'AJ:';
  if is_po then
    select id, baris_sheet, public._rapi(no_po, 30) no, public._rapi(supplier, 80) sup, coalesce(total_barang, 0) tot, public._rapi(status, 40) st,
           public._rapi(catatan, 400) c
      into o from po_log where public._rapi(no_po, 30) = ref order by baris_sheet nulls last, id limit 1;
    if o.id is null then return json_build_object('ok', false, 'pesan', 'PO ' || ref || ' tidak ditemukan. Muat ulang.'); end if;
    sup := o.sup;
    if o.st in ('Ditolak', 'Batal') then return json_build_object('ok', false, 'pesan', 'PO ' || o.no || ' sudah ' || lower(o.st) || '.'); end if;
  elsif jenis <> 'Pelunasan' then
    return json_build_object('ok', false, 'pesan', 'Biaya tambahan hanya untuk PO.');
  end if;
  b := public._kb_bayar_ref(ref);
  if not is_po then sup := coalesce(b ->> 'sup', ''); end if;
  if jenis = 'Pelunasan' then
    inv := case when is_po then o.tot else coalesce((b ->> 'inv')::numeric, 0) end;
    sudah := coalesce((b ->> 'bayar')::numeric, 0);
    if b is null or not coalesce((b ->> 'dp')::boolean, false) then
      return json_build_object('ok', false, 'pesan', 'Belum ada DP untuk ' || ref || ', jadi tidak ada yang perlu dilunasi.');
    end if;
    if sudah >= inv - 1 then return json_build_object('ok', false, 'pesan', ref || ' sudah lunas.'); end if;
    if v > inv - sudah + 1 then
      return json_build_object('ok', false, 'pesan', 'Pelunasan lebih besar dari sisa (Rp ' || public._gd_fmt(inv - sudah) || '). Kalau ada biaya tambahan, pilih jenis biaya yang sesuai.');
    end if;
    tr := public._acc_keluar(p_tanggal, 'Rekening Belanja', 'Pembelian barang dagang / impor',
            'Pelunasan ' || case when is_po then 'PO ' || ref else 'pengajuan ' || substr(ref, 4) end || ' ' || sup || ' (Impor, dibayar Mike)'
            || case when cat <> '' then ' - ' || cat else '' end, v, 'dibayar Mike');
    insert into kb_impor_bayar (waktu, ref, jenis, nominal, tanggal_bayar, no_transaksi, oleh, catatan, total_invoice, supplier)
    values (kini, ref, 'Pelunasan', v, to_date(p_tanggal, 'YYYY-MM-DD'), tr, 'Mike', nullif(cat, ''), inv, nullif(sup, ''));
    lunas := sudah + v >= inv - 1;
    if is_po and lunas and o.st = 'Disetujui' then
      if o.baris_sheet is not null then perform public._ubah_catat('po_log', o.id, array['status', 'waktu_dibayar', 'catatan']); end if;
      update po_log set status = 'Dibayar', waktu_dibayar = kini, catatan = left(o.c || ' Lunas ' || p_tanggal || '.', 400) where id = o.id;
    end if;
    teks := '🌏✅ <b>PELUNASAN IMPOR</b>' || E'\nOleh: <b>Mike</b> · ' || public._tg_esc(ref) || case when sup <> '' then ' · ' || public._tg_esc(sup) else '' end
      || E'\nDibayar Rp ' || public._gd_fmt(v)
      || case when lunas then ' · <b>LUNAS</b>' || case when is_po then E'\nGudang sudah boleh menerima barang PO ini.' else '' end
              else ' · sisa Rp ' || public._gd_fmt(inv - sudah - v) end
      || E'\nAccounting ' || public._tg_esc(tr) || '.';
    insert into efek_antre (jenis, data) values ('tg', jsonb_build_object('asal', jsonb_build_object('e', '👤', 'n', 'Mike', 'nama', ''), 'teks', teks));
    if coalesce(p_token, '') <> '' then insert into toko_token (token) values ('gdkbl|' || left(p_token, 60)) on conflict do nothing; end if;
    return json_build_object('ok', true, 'pesan', 'Pelunasan Rp ' || public._gd_fmt(v) || ' tercatat (' || tr || ').'
      || case when lunas then ' ' || ref || ' LUNAS.' || case when is_po then ' Gudang sudah boleh menerima barangnya.' else '' end
              else ' Sisa Rp ' || public._gd_fmt(inv - sudah - v) || '.' end);
  end if;
  -- Biaya tambahan PO (ikut HPP).
  kat := case jenis when 'Ongkir cargo' then 'Ongkos kirim & ekspedisi' when 'Ongkir lokal' then 'Ongkos kirim & ekspedisi'
                    when 'Bill kedua / IMP' then 'Pembelian barang dagang / impor' when 'Pajak & bea masuk' then 'Pembelian barang dagang / impor'
                    else 'Biaya lain-lain' end;
  tr := public._acc_keluar(p_tanggal, 'Rekening Belanja', kat, jenis || ' PO ' || o.no || ' ' || o.sup || ' (dibayar Mike)' || case when cat <> '' then ' - ' || cat else '' end,
          v, 'dibayar Mike');
  insert into po_biaya (no_po, tanggal, jenis_biaya, nominal, cara_bayar, status_bayar, no_transaksi, waktu_masuk, pengisi, catatan)
  values (o.no, to_date(p_tanggal, 'YYYY-MM-DD'), jenis, v, 'Rekening Belanja', 'Dibayar', tr, kini, 'Mike', nullif(cat, ''));
  insert into kb_impor_bayar (waktu, ref, jenis, nominal, tanggal_bayar, no_transaksi, oleh, catatan, total_invoice, supplier)
  values (kini, o.no, jenis, v, to_date(p_tanggal, 'YYYY-MM-DD'), tr, 'Mike', nullif(cat, ''), null, nullif(o.sup, ''));
  insert into efek_antre (jenis, data) values ('tg', jsonb_build_object('asal', jsonb_build_object('e', '👤', 'n', 'Mike', 'nama', ''), 'teks',
    '🌏🧾 <b>BIAYA PO IMPOR</b>' || E'\nOleh: <b>Mike</b> · PO ' || public._tg_esc(o.no) || ' · ' || public._tg_esc(o.sup) || E'\n' || public._tg_esc(jenis) || ': Rp ' || public._gd_fmt(v)
    || case when cat <> '' then E'\nCatatan: ' || public._tg_esc(cat) else '' end || E'\nAccounting ' || public._tg_esc(tr) || '. Ikut dihitung ke HPP barang PO ini.'));
  -- Usulan koreksi HPP bila barang PO sudah diterima (CHR_koreksiBiaya_, dihitung Apps Script sesudah baris tersalin ke sheet).
  insert into efek_antre (jenis, data) values ('kb_biaya', jsonb_build_object('po', o.no, 'v', v, 'jenis', jenis, 'tr', tr));
  if coalesce(p_token, '') <> '' then insert into toko_token (token) values ('gdkbl|' || left(p_token, 60)) on conflict do nothing; end if;
  return json_build_object('ok', true, 'pesan', jenis || ' Rp ' || public._gd_fmt(v) || ' tercatat di PO ' || o.no || ' dan accounting (' || tr || '). Ikut dihitung ke HPP.'
    || case when exists (select 1 from hpp_hitung_log where public._rapi(no_po, 30) = o.no and public._rapi(jenis, 30) = 'Terima' and public._rapi(bukti_terima, 30) <> '')
            then ' Barang PO ini sudah diterima, jadi usulan koreksi HPP dibuat otomatis (tab Harga naik).' else '' end);
end $$;
revoke all on function public.kb_impor_bayar(jsonb, jsonb, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.kb_impor_bayar(jsonb, jsonb, text, text, text, text, text, text, text) to authenticated;
revoke all on function public.kb_bayar_lanjut(text, text, text, text, text, text) from public, anon;
grant execute on function public.kb_bayar_lanjut(text, text, text, text, text, text) to authenticated;
revoke all on function public._kb_bayar_ref(text) from public, anon, authenticated;
select 'ok111' as ok;
