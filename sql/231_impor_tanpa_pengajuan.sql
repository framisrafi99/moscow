-- 231 (27 Nov 2026): barang di invoice impor yang belum ada pengajuannya.
-- Mike kirim invoice + bukti transfer ke Telegram untuk barang yang tidak pernah diajukan. Di kotak "Status bayar pengajuan impor"
-- barang itu muncul sebagai "Belum ada pengajuannya" (produk dicocokkan otomatis dari nama di invoice). Mike mengisi qty,
-- lalu satu tombol: pengajuan dibuat otomatis (status Disetujui oleh Mike, asal Impor, alasan "dicatat dari invoice Telegram #..."),
-- langsung ditandai sudah dibayar memakai transaksi accounting yang sudah ada (tanpa uang keluar baru), PO impor otomatis.
--   impor_bukti_catat(p_nos, p_total, p_baru, p_tr, p_bukti, p_supplier, p_eta, p_catatan, p_token)
--     p_baru = [{k, w, n, kel, q, v}]  k = kode produk (Barang jualan) atau kosong untuk bahan baku / botol & stiker / lainnya.
--   impor_bukti_calon(): ditambah daftar produk (kode, nama, warna) untuk pilihan.

create or replace function public.impor_bukti_catat(p_nos jsonb, p_total jsonb, p_baru jsonb, p_tr text, p_bukti bigint, p_supplier text, p_eta text,
  p_catatan text, p_token text) returns json
language plpgsql security definer set search_path to 'public' as $function$
#variable_conflict use_column
declare
  peran text := (select public.peran_saya()); v_oleh text; it jsonb; v_k text; v_w text; v_n text; v_kel text; v_q numeric; v_v numeric; d record;
  nos jsonb := coalesce(case when jsonb_typeof(p_nos) = 'array' then p_nos end, '[]'); tot jsonb := coalesce(case when jsonb_typeof(p_total) = 'object' then p_total end, '{}');
  awalan text; maks int; nomor text; kini timestamptz := now(); dibuat text[] := '{}'; res json; lihat text[] := '{}';
begin
  if not public._boleh_peran(array['kendali_bisnis', 'manajemen']) then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  v_oleh := case when peran = 'kendali_bisnis' then 'Mike' else coalesce(public._mgmt_nama(), 'Manajemen') end;
  perform pg_advisory_xact_lock(hashtext('staf|pengadaan_ajuan'));
  if coalesce(p_token, '') <> '' and exists (select 1 from toko_token where token = 'gdimptandai|' || left(p_token, 60)) then
    return json_build_object('ok', true, 'ulang', true, 'pesan', 'Data ini sudah tersimpan sebelumnya (tidak dicatat dua kali).');
  end if;
  if public._impor_tr_terpakai(btrim(coalesce(p_tr, ''))) then
    return json_build_object('ok', false, 'pesan', 'Transaksi ' || btrim(coalesce(p_tr, '')) || ' sudah dipakai untuk pengajuan impor lain. Muat ulang.');
  end if;
  awalan := 'PG-' || to_char(kini at time zone 'Asia/Makassar', 'YYMMDD') || '-';
  select coalesce(max(case when substr(btrim(no), length(awalan) + 1) ~ '^\d+' then substring(substr(btrim(no), length(awalan) + 1) from '^\d+')::int else 0 end), 0)
    into maks from pengadaan_ajuan where left(btrim(coalesce(no, '')), length(awalan)) = awalan;
  for it in select value from jsonb_array_elements(case when jsonb_typeof(p_baru) = 'array' then p_baru else '[]' end) with ordinality e(value, o) where o <= 30 loop
    v_k := upper(public._rapi_spasi(it ->> 'k', 60));
    v_q := public._pgd_num(it -> 'q');
    v_v := round(coalesce(nullif(regexp_replace(coalesce(it ->> 'v', ''), '[^0-9]', '', 'g'), '')::numeric, 0));
    if v_k <> '' then
      select b.kode, b.nama, b.warna into d from public._barang_dasar_semua() b where b.kode = v_k;
      if d.kode is null then raise exception '%', 'Kode produk ' || v_k || ' tidak ada di daftar barang.'; end if;
      v_kel := 'Barang jualan'; v_n := d.nama;
      v_w := case when coalesce(cardinality(d.warna), 0) > 0 then public._rapi_warna(it ->> 'w') else '' end;
      if coalesce(cardinality(d.warna), 0) > 0 and not (v_w = any (d.warna)) then raise exception '%', 'Pilih warna untuk ' || v_n || '.'; end if;
      if (v_k || '|' || v_w) = any (lihat) then raise exception '%', v_n || case when v_w <> '' then ' ' || v_w else '' end || ' muncul dua kali. Gabungkan jadi satu baris.'; end if;
      lihat := lihat || (v_k || '|' || v_w);
      if exists (select 1 from public._pgd_ajuan() a where a.k = v_k and coalesce(a.w, '') = v_w and a.st in ('Menunggu', 'Disetujui')) then
        raise exception '%', v_n || ' sudah punya pengajuan yang belum dibayar. Centang pengajuan itu, jangan dibuat baru.';
      end if;
      d := null;
    else
      v_kel := public._rapi_spasi(it ->> 'kel', 40);
      if not (v_kel = any (array['Bahan baku', 'Botol & stiker', 'Packaging & lainnya'])) then raise exception '%', 'Pilih produk atau jenis barangnya.'; end if;
      v_n := public._rapi_spasi(it ->> 'n', 120); v_w := '';
      if length(v_n) < 3 then raise exception '%', 'Tulis nama barangnya (minimal 3 huruf).'; end if;
    end if;
    if v_q is null or not (v_q > 0) or v_q > 10000000 or (v_kel = 'Barang jualan' and v_q <> floor(v_q)) then
      raise exception '%', 'Isi qty ' || v_n || ' (angka bulat lebih dari 0).';
    end if;
    if not (v_v > 0) then raise exception '%', 'Isi total yang dibayar untuk ' || v_n || '.'; end if;
    maks := maks + 1; nomor := awalan || right('00' || maks::text, 3);
    insert into pengadaan_ajuan (no, waktu, bagian, kelompok, kode, nama, satuan, qty, perkiraan_harga_satuan, alasan, pengaju, status_robot, analisa_robot,
                                 status, diputus_oleh, waktu_putus, catatan_putus, qty_disetujui, asal_barang, warna)
    values (nomor, kini, case when v_kel = 'Barang jualan' then 'Gudang' when v_kel = 'Bahan baku' then 'Bahan Baku' else 'Produksi' end, v_kel, nullif(v_k, ''), v_n, 'pcs', v_q,
            round(v_v / v_q), 'Tanpa pengajuan: dicatat dari invoice Telegram' || coalesce(' #' || p_bukti, '') || ' oleh ' || v_oleh, v_oleh, 'Tanpa data',
            'Dibuat otomatis dari bukti bayar impor (barang sudah dibeli).', 'Disetujui', v_oleh, kini, 'Sudah dibayar sebelum diajukan (invoice Telegram).', v_q, 'Impor', nullif(v_w, ''));
    nos := nos || to_jsonb(nomor);
    tot := tot || jsonb_build_object(nomor, v_v);
    dibuat := dibuat || nomor;
  end loop;
  if jsonb_array_length(nos) = 0 then return json_build_object('ok', false, 'pesan', 'Centang barang yang dibayar dengan bukti ini.'); end if;
  res := public._impor_tandai_inti(nos, tot, p_supplier, p_eta, p_catatan, p_token, v_oleh, p_tr, p_bukti);
  if not coalesce((res ->> 'ok')::boolean, false) or coalesce((res ->> 'ulang')::boolean, false) then
    raise exception '%', coalesce(res ->> 'pesan', 'Gagal menyimpan.');   -- batalkan pengajuan baru juga
  end if;
  return json_build_object('ok', true, 'po', res ->> 'po', 'tr', res ->> 'tr', 'baru', to_jsonb(dibuat),
    'pesan', (res ->> 'pesan') || case when cardinality(dibuat) > 0 then ' Pengajuan baru dibuat otomatis: ' || array_to_string(dibuat, ', ') || '.' else '' end);
exception when others then
  return json_build_object('ok', false, 'pesan', sqlerrm);
end $function$;

grant execute on function public.impor_bukti_catat(jsonb, jsonb, jsonb, text, bigint, text, text, text, text) to authenticated;

-- impor_bukti_calon: tambah 'produk' (dipasang lewat replace pada definisi aktif, sebelum kunci 'tunggu').
do $$ declare d text; s text := '    ''tunggu'', coalesce(('; begin
  d := pg_get_functiondef('public.impor_bukti_calon()'::regprocedure);
  if position('''produk''' in d) > 0 then return; end if;
  execute replace(d, s, '    ''produk'', coalesce((select json_agg(json_build_object(''k'', b.kode, ''n'', b.nama, ''w'', b.warna) order by b.kode) from public._barang_dasar_semua() b), ''[]''),
' || s);
end $$;
