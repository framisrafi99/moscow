-- 230 (27 Nov 2026): status bayar pengajuan impor tersambung ke bukti bayar Telegram.
-- Masalah: Mike membayar impor lewat Telegram (bukti -> uang keluar di accounting), tapi pengajuannya tetap "Disetujui"
-- karena tombol "Sudah dibayar" di aplikasi membuat uang keluar BARU (berisiko dobel).
-- Solusi:
--   _impor_tr_terpakai(tr)   : transaksi accounting ini sudah dipakai untuk pengajuan impor / PO impor?
--   _impor_tandai_inti(...)  : tandai pengajuan impor Disetujui -> Dipesan (sudah dibayar) memakai transaksi accounting yang SUDAH ADA
--                              (dari bukti Telegram). Tidak membuat uang keluar baru. PO impor otomatis seperti biasa.
--   impor_bukti_calon()      : daftar bukti bayar impor dari Telegram (60 hari) yang belum disambungkan + rincian invoice-nya.
--   impor_tandai_bayar(...)  : RPC untuk Mike / manajemen.
--   _impor_bayar_inti        : penjaga baru: tolak bayar lewat aplikasi kalau ada bukti Telegram impor belum tersambung
--                              dengan nominal sama (selisih <= Rp 5.000, tanggal <= 10 hari) supaya uang keluar tidak dobel.

create or replace function public._impor_tr_terpakai(p_tr text) returns boolean
language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from po_log where public._rapi_spasi(asal, 20) = 'Impor' and position(btrim(p_tr) in coalesce(no_transaksi, '')) > 0)
      or exists (select 1 from pengadaan_ajuan where position('(' || btrim(p_tr) || ')' in coalesce(ref_po_supplier, '')) > 0)
      or exists (select 1 from pengadaan_ajuan where position(btrim(p_tr) in coalesce(ref_po_supplier, '')) > 0 and status in ('Dipesan', 'Diterima'));
$$;

create or replace function public._impor_tandai_inti(p_nos jsonb, p_total jsonb, p_supplier text, p_eta text, p_catatan text, p_token text,
  p_oleh text, p_tr text, p_bukti bigint) returns json
language plpgsql security definer set search_path to 'public' as $function$
#variable_conflict use_column
declare
  a record; x record; y jsonb; nos text[]; salah text; sup text; v_eta date; v numeric; vq numeric; h numeric; wr text[];
  pilih jsonb := '[]'; gd jsonb := '[]'; total numeric := 0; tot_po numeric := 0; nomor_po text := ''; n_lain int := 0;
  v_oleh text := left(coalesce(nullif(btrim(p_oleh), ''), 'Mike'), 30); cat text; teks text; kini timestamptz := now(); tr text := btrim(coalesce(p_tr, ''));
begin
  select btrim(no) no, tanggal, public._rapi_spasi(akun, 60) akun, nominal, jenis, status, left(keterangan, 120) ket into a
    from acc_log where btrim(no) = tr order by id desc limit 1;
  if a.no is null then return json_build_object('ok', false, 'pesan', 'Transaksi ' || tr || ' tidak ditemukan di accounting.'); end if;
  if a.jenis <> 'Keluar' or coalesce(a.status, 'Aktif') <> 'Aktif' then return json_build_object('ok', false, 'pesan', 'Transaksi ' || tr || ' bukan uang keluar yang aktif.'); end if;
  sup := left(regexp_replace(btrim(regexp_replace(regexp_replace(coalesce(p_supplier, ''), '[\r\n\t]+', ' ', 'g'), '\s+', ' ', 'g')), '^[=+@-]+', ''), 80);
  if length(sup) < 2 then return json_build_object('ok', false, 'pesan', 'Isi nama supplier.'); end if;
  if coalesce(p_eta, '') <> '' then
    if p_eta !~ '^\d{4}-\d{2}-\d{2}$' then return json_build_object('ok', false, 'pesan', 'Perkiraan datang tidak valid.'); end if;
    begin v_eta := to_date(p_eta, 'YYYY-MM-DD'); exception when others then return json_build_object('ok', false, 'pesan', 'Perkiraan datang tidak valid.'); end;
  end if;
  cat := left(regexp_replace(btrim(regexp_replace(regexp_replace(coalesce(p_catatan, ''), '[\r\n\t]+', ' ', 'g'), '\s+', ' ', 'g')), '^[=+@-]+', ''), 200);
  select coalesce(array_agg(v2 #>> '{}' order by o), '{}') into nos
    from jsonb_array_elements(case when jsonb_typeof(p_nos) = 'array' then p_nos else '[]' end) with ordinality e(v2, o) where o <= 60;
  if cardinality(nos) = 0 then return json_build_object('ok', false, 'pesan', 'Centang barang yang dibayar dengan bukti ini.'); end if;

  perform pg_advisory_xact_lock(hashtext('staf|pengadaan_ajuan'));
  if coalesce(p_token, '') <> '' and exists (select 1 from toko_token where token = 'gdimptandai|' || left(p_token, 60)) then
    return json_build_object('ok', true, 'ulang', true, 'pesan', 'Data ini sudah tersimpan sebelumnya (tidak dicatat dua kali).');
  end if;
  if public._impor_tr_terpakai(tr) then
    return json_build_object('ok', false, 'pesan', 'Transaksi ' || tr || ' sudah dipakai untuk pengajuan impor lain. Muat ulang.');
  end if;

  foreach salah in array nos loop
    select a2.*, coalesce(a2.qs, a2.q) qq, d.kode is not null and a2.kel = 'Barang jualan' and a2.k <> '' gudang,
           d.kode is not null and a2.kel = 'Barang jualan' and a2.k <> '' and cardinality(d.warna) > 0 and a2.w = '' kurang, d.nama bn
      into x from public._pgd_ajuan() a2 left join public._barang_dasar_semua() d on d.kode = a2.k
     where a2.no = salah and a2.st = 'Disetujui' and a2.imp order by a2.u desc limit 1;
    if x.no is null then return json_build_object('ok', false, 'pesan', 'Pengajuan ' || salah || ' sudah tidak menunggu dibayar. Muat ulang.'); end if;
    if x.kurang then return json_build_object('ok', false, 'pesan', x.n || ': warna belum diisi di pengajuan. Minta Daffa mengajukan ulang dengan warna.'); end if;
    v := round(coalesce(nullif(regexp_replace(coalesce(p_total ->> x.no, ''), '[^0-9]', '', 'g'), '')::numeric, 0));
    if not (v > 0) then return json_build_object('ok', false, 'pesan', 'Isi total yang dibayar untuk ' || x.n || '.'); end if;
    if not (x.qq > 0) then return json_build_object('ok', false, 'pesan', 'Qty ' || x.n || ' tidak valid.'); end if;
    pilih := pilih || jsonb_build_object('id', x.id, 'bs', x.bs, 'no', x.no, 'n', x.n, 'k', x.k, 'w', x.w, 'q', x.qq, 's', x.s, 'v', v, 'gudang', x.gudang, 'bn', x.bn);
    total := total + v;
    x := null;
  end loop;
  if total > a.nominal + 5000 then
    return json_build_object('ok', false, 'pesan', 'Total barang (Rp ' || public._gd_fmt(total) || ') lebih besar dari bukti bayar ' || tr || ' (Rp ' || public._gd_fmt(a.nominal) || '). Periksa totalnya.');
  end if;

  for y in select value from jsonb_array_elements(pilih) loop
    if not (y ->> 'gudang')::boolean then n_lain := n_lain + 1; continue; end if;
    y := jsonb_set(y, '{w}', to_jsonb(public._rapi_warna(y ->> 'w')));
    vq := (y ->> 'q')::numeric;
    if vq <> floor(vq) or vq < 1 or vq > 1000000 then
      return json_build_object('ok', false, 'pesan', 'Jumlah untuk ' || (y ->> 'bn') || ' harus angka bulat minimal 1.');
    end if;
    if (y ->> 'k' || '|' || (y ->> 'w')) = any (select (z ->> 'k') || '|' || (z ->> 'w') from jsonb_array_elements(gd) z) then
      return json_build_object('ok', false, 'pesan', (y ->> 'bn') || case when y ->> 'w' <> '' then ' ' || (y ->> 'w') else '' end || ' muncul dua kali. Gabungkan jadi satu baris.');
    end if;
    select d.warna into wr from public._barang_dasar_semua() d where d.kode = y ->> 'k';
    if coalesce(cardinality(wr), 0) > 0 then
      if y ->> 'w' = '' then return json_build_object('ok', false, 'pesan', 'Pilih warna untuk ' || (y ->> 'bn') || '.'); end if;
      if not ((y ->> 'w') = any (wr)) then return json_build_object('ok', false, 'pesan', 'Warna ' || (y ->> 'w') || ' tidak ada di daftar ' || (y ->> 'bn') || '.'); end if;
    else
      y := jsonb_set(y, '{w}', '""');
    end if;
    h := greatest(1, round((y ->> 'v')::numeric / vq));
    gd := gd || (y || jsonb_build_object('h', h));
  end loop;

  if jsonb_array_length(gd) > 0 then
    nomor_po := public._po_no_baru();
    select sum((z ->> 'h')::numeric * (z ->> 'q')::numeric) into tot_po from jsonb_array_elements(gd) z;
    insert into po_log (no_po, tanggal, asal, supplier, cara_bayar, total_barang, status, pengaju, waktu_ajuan, waktu_disetujui, waktu_dibayar, no_transaksi, catatan)
    values (nomor_po, a.tanggal, 'Impor', sup, a.akun, tot_po, 'Dibayar', v_oleh, kini, kini, kini, tr,
            'Dibayar ' || v_oleh || ' lewat bukti Telegram' || coalesce(' #' || p_bukti, '') || ' (' || tr || '; pengajuan '
            || (select string_agg(z ->> 'no', ', ' order by o) from jsonb_array_elements(gd) with ordinality e(z, o)) || ').'
            || case when cat <> '' then ' ' || cat else '' end);
    insert into po_item (no_po, kode, nama_barang, warna, qty, harga_satuan, subtotal)
    select nomor_po, z ->> 'k', split_part(z ->> 'n', ' · ', 1), nullif(z ->> 'w', ''), (z ->> 'q')::numeric, (z ->> 'h')::numeric, (z ->> 'h')::numeric * (z ->> 'q')::numeric
      from jsonb_array_elements(gd) with ordinality e(z, o) order by o;
  end if;

  for y in select value from jsonb_array_elements(pilih) loop
    if (y ->> 'bs') is not null then perform public._ubah_catat('pengadaan_ajuan', (y ->> 'id')::bigint, array['status', 'ref_po_supplier', 'waktu_pesan', 'perkiraan_datang']); end if;
    update pengadaan_ajuan set status = 'Dipesan',
           ref_po_supplier = case when (y ->> 'gudang')::boolean and nomor_po <> '' then nomor_po || ' · ' else '' end || sup || ' · dibayar ' || v_oleh
                             || ' ' || public._gd_fmt((y ->> 'v')::numeric) || ' (' || tr || ')',
           waktu_pesan = kini, perkiraan_datang = v_eta
     where id = (y ->> 'id')::bigint;
  end loop;
  if p_bukti is not null then insert into acc_bukti (acc_no, bukti_id) values (tr, p_bukti) on conflict do nothing; end if;
  if coalesce(p_token, '') <> '' then insert into toko_token (token) values ('gdimptandai|' || left(p_token, 60)) on conflict do nothing; end if;

  teks := '🌏💳 <b>IMPOR SUDAH DIBAYAR</b> (dari bukti Telegram)' || E'\nOleh: <b>' || public._tg_esc(v_oleh) || '</b> · Supplier: ' || public._tg_esc(sup)
    || E'\nBukti: ' || public._tg_esc(tr) || ' · ' || to_char(a.tanggal, 'DD/MM/YYYY') || ' · Rp ' || public._gd_fmt(a.nominal)
    || case when nomor_po <> '' then E'\nPO: <b>' || public._tg_esc(nomor_po) || '</b>' else '' end || E'\n\n'
    || (select string_agg('• ' || public._tg_esc(z ->> 'n') || ' — ' || public._gd_fmt((z ->> 'q')::numeric) || ' ' || public._tg_esc(coalesce(nullif(z ->> 's', ''), 'pcs'))
                          || ' · Rp ' || public._gd_fmt((z ->> 'v')::numeric), E'\n' order by o) from jsonb_array_elements(pilih) with ordinality e(z, o))
    || E'\n\nTotal barang Rp ' || public._gd_fmt(total) || '. Uang keluar tidak dicatat ulang (sudah ada di ' || public._tg_esc(tr) || ').'
    || case when v_eta is not null then E'\nPerkiraan datang: ' || to_char(v_eta, 'DD/MM/YYYY') else '' end
    || case when nomor_po <> '' then E'\nGudang: lanjutkan PO ' || public._tg_esc(nomor_po) || ' (resi, terima barang, ongkir) di aplikasi Gudang Utama.' else '' end
    || E'\n\n<i>' || to_char(kini at time zone 'Asia/Makassar', 'DD/MM/YYYY HH24:MI') || '</i>';
  insert into efek_antre (jenis, data) values ('tg', jsonb_build_object('teks', teks, 'asal', jsonb_build_object('e', '👤', 'n', v_oleh, 'nama', '')));

  return json_build_object('ok', true, 'po', nomor_po, 'tr', tr, 'pesan', jsonb_array_length(pilih) || ' barang impor ditandai sudah dibayar dengan bukti ' || tr
    || '. Uang keluar tidak dicatat ulang.' || case when nomor_po <> '' then ' PO ' || nomor_po || ' otomatis masuk ke list PO gudang.' else '' end);
end $function$;

create or replace function public.impor_tandai_bayar(p_nos jsonb, p_total jsonb, p_tr text, p_bukti bigint, p_supplier text, p_eta text, p_catatan text, p_token text)
returns json language plpgsql security definer set search_path to 'public' as $$
declare peran text := (select public.peran_saya());
begin
  if not public._boleh_peran(array['kendali_bisnis', 'manajemen']) then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  return public._impor_tandai_inti(p_nos, p_total, p_supplier, p_eta, p_catatan, p_token,
           case when peran = 'kendali_bisnis' then 'Mike' else coalesce(public._mgmt_nama(), 'Manajemen') end, p_tr, p_bukti);
end $$;

-- Bukti bayar impor dari Telegram (uang keluar 60 hari terakhir) yang belum disambungkan ke pengajuan impor.
create or replace function public.impor_bukti_calon() returns json
language plpgsql stable security definer set search_path to 'public' as $$
declare hasil json;
begin
  if not public._boleh_peran(array['kendali_bisnis', 'manajemen']) then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  select json_build_object('ok', true,
    'bukti', coalesce((
      select json_agg(z order by z.t desc, z.tr desc) from (
        select btrim(l.no) tr, l.tanggal t, public._rapi_spasi(l.akun, 60) akun, l.nominal v, left(l.keterangan, 160) ket,
               (select b.pengirim from bb_bukti b where b.id in (select ab.bukti_id from acc_bukti ab where ab.acc_no = btrim(l.no)) order by b.id limit 1) oleh,
               (select b.id from bb_bukti b where b.id in (select ab.bukti_id from acc_bukti ab where ab.acc_no = btrim(l.no)) and b.baca ->> 'dokumen' = 'transfer' order by b.id limit 1) bukti,
               (select coalesce(nullif(b.baca ->> 'penerima', ''), '') from bb_bukti b where b.id in (select ab.bukti_id from acc_bukti ab where ab.acc_no = btrim(l.no)) order by (b.baca ->> 'dokumen' = 'invoice') desc, b.id limit 1) sup,
               (select b.baca -> 'barang' from bb_bukti b where b.id in (select ab.bukti_id from acc_bukti ab where ab.acc_no = btrim(l.no))
                  and jsonb_array_length(coalesce(b.baca -> 'barang', '[]')) > 0 order by b.id limit 1) barang
          from acc_log l
         where l.jenis = 'Keluar' and coalesce(l.status, 'Aktif') = 'Aktif' and l.tanggal >= (now() at time zone 'Asia/Makassar')::date - 60
           and (l.kategori ilike '%impor%'
                or exists (select 1 from acc_bukti ab join bb_bukti b on b.id = ab.bukti_id where ab.acc_no = btrim(l.no) and (b.kategori ilike '%impor%' or b.baca ->> 'kategori' ilike '%impor%')))
           and coalesce(l.pengisi, '') ilike 'telegram%'
           and not public._impor_tr_terpakai(btrim(l.no))
      ) z), '[]'),
    'tunggu', coalesce((
      select json_agg(json_build_object('no', a.no, 'n', a.n, 'w', a.w, 'k', a.k, 'q', coalesce(a.qs, a.q), 's', coalesce(nullif(a.s, ''), 'pcs'), 'h', coalesce(a.h, 0),
                                        't', a.t, 'pg', a.pg, 'bg', a.bg) order by a.t, a.no)
        from public._pgd_ajuan() a where a.st = 'Disetujui' and a.imp), '[]'),
    'dibayar', coalesce((
      select json_agg(json_build_object('no', a.no, 'n', a.n, 'w', a.w, 'q', coalesce(a.qs, a.q), 's', coalesce(nullif(a.s, ''), 'pcs'), 'st', a.st, 'ref', a.ref) order by a.u desc)
        from (select * from public._pgd_ajuan() a2 where a2.st in ('Dipesan') and a2.imp order by a2.u desc limit 40) a), '[]')
  ) into hasil;
  return hasil;
end $$;

revoke all on function public._impor_tandai_inti(jsonb, jsonb, text, text, text, text, text, text, bigint) from public, anon, authenticated;
revoke all on function public._impor_tr_terpakai(text) from public, anon, authenticated;
grant execute on function public.impor_tandai_bayar(jsonb, jsonb, text, bigint, text, text, text, text) to authenticated;
grant execute on function public.impor_bukti_calon() to authenticated;

-- Penjaga di _impor_bayar_inti (dipasang lewat replace pada definisi aktif, sebelum baris "tr := public._acc_keluar(p_tanggal, v_akun, 'Pembelian barang dagang / impor',"):
--   kalau dipanggil dari aplikasi (p_oleh kosong) dan ada uang keluar dari Telegram yang belum tersambung, nominal selisih <= Rp 5.000,
--   tanggal <= 10 hari -> tolak dengan pesan "sudah tercatat dari bukti Telegram (TR-...)".
