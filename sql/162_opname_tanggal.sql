-- 162 (5 Nov 2026): hitung stok (opname) Gudang Utama & Kantor Packing boleh memilih tanggal hitung (mundur, maks. 62 hari).
-- Hasil hitung dianggap jumlah fisik di AKHIR tanggal itu (23:59:59 WITA). Stok sistem pembanding = stok per akhir tanggal itu,
-- jadi barang yang keluar / masuk sesudahnya (penyaluran ke divisi, kiriman produksi, penjualan) tetap terhitung dan laporan tetap seimbang:
--   stok sekarang sesudah disetujui = hasil hitung + pergerakan sesudah tanggal hitung.
-- Ditolak kalau barang itu sudah punya hitung stok yang lebih baru dari tanggal yang dipilih (supaya tidak terkoreksi dua kali).

-- Batas waktu (akhir hari WITA) dari teks tanggal; null = hari ini (cara lama, waktu sekarang).
create or replace function public._opname_batas(p_tanggal text, out batas timestamptz, out mundur boolean, out salah text)
language plpgsql stable set search_path to 'public' as $$
declare d date; hari date := (now() at time zone 'Asia/Makassar')::date;
begin
  mundur := false; salah := null; batas := now();
  if btrim(coalesce(p_tanggal, '')) = '' then return; end if;
  if btrim(p_tanggal) !~ '^\d{4}-\d{2}-\d{2}$' then salah := 'Tanggal hitung stok tidak terbaca.'; return; end if;
  begin d := btrim(p_tanggal)::date; exception when others then salah := 'Tanggal hitung stok tidak terbaca.'; return; end;
  if d > hari then salah := 'Tanggal hitung stok tidak boleh sesudah hari ini.'; return; end if;
  if d < hari - 62 then salah := 'Tanggal hitung stok paling lama 62 hari ke belakang.'; return; end if;
  if d = hari then return; end if;
  mundur := true;
  batas := ((d + 1)::timestamp at time zone 'Asia/Makassar') - interval '1 second';
end $$;

-- Stok Gudang Utama per akhir tanggal: stok awal + catatan masuk/keluar s.d. tanggal itu + penyesuaian disetujui yang diajukan s.d. batas.
create or replace function public._gd_stok_per(p_batas timestamptz)
returns jsonb language sql stable set search_path to 'public' as $$
  select coalesce(jsonb_object_agg(kw, q), '{}'::jsonb) from (
    select kw, sum(q) q from (
      select upper(public._rapi_spasi(kode, 30)) || '|' || public._rapi_warna(warna) kw, coalesce(qty, 0) q, upper(public._rapi_spasi(kode, 30)) k
        from gudang_stok_awal
      union all
      select upper(public._rapi_spasi(kode, 30)) || '|' || public._rapi_warna(warna),
             case when public._rapi_spasi(jenis, 30) ~* '^masuk' then coalesce(qty, 0) else -coalesce(qty, 0) end, upper(public._rapi_spasi(kode, 30))
        from gudang_log
       where tanggal is not null and tanggal <= (p_batas at time zone 'Asia/Makassar')::date
         and (public._rapi_spasi(jenis, 30) ~* '^masuk' or public._rapi_spasi(jenis, 30) ~* '^keluar')
      union all
      select upper(trim(coalesce(kode, ''))) || '|' || public._rapi_warna(warna), coalesce(selisih, 0), upper(trim(coalesce(kode, '')))
        from produksi_sesuai_log
       where coalesce(trim(no), '') <> '' and trim(coalesce(bagian, '')) = 'Gudang' and trim(coalesce(status, '')) = 'Disetujui'
         and waktu_keputusan is not null and waktu_ajuan <= p_batas
    ) z where k <> '' and q <> 0 group by kw
  ) y where q <> 0;
$$;

drop function if exists public.gudang_opname(text, text, jsonb, text);
create or replace function public.gudang_opname(p_nama text, p_alasan text, p_items jsonb, p_token text, p_tanggal text default null)
returns json language plpgsql security definer set search_path to 'public' as $function$
#variable_conflict use_column
declare
  peran text := (select public.peran_saya()); nama text; alasan text; stok jsonb; it jsonb; kd text; b record; wr text; kunci text;
  lihat text[] := '{}'; tunggu text[]; hit numeric; sis numeric; sel numeric; sama text[] := '{}'; lewat text[] := '{}';
  baris jsonb := '[]'; awalan text; maks int; nos text[] := '{}'; kini timestamptz := now(); nm text;
  tg record; baru jsonb := '{}'; label_tgl text := '';
begin
  if not public._boleh_peran(array['gudang', 'purchasing_shopeepay']) then
    return json_build_object('ok', false, 'pesan', 'Akses ditolak. Minta link yang benar dari manajemen Moscow Supplies.');
  end if;
  nama := public._rapi_spasi(p_nama, 40);
  if length(nama) < 2 then
    if peran = 'manajemen' then nama := (public._mgmt_nama() || '');
    else return json_build_object('ok', false, 'pesan', 'Isi nama staf dulu (kotak paling atas).'); end if;
  end if;
  alasan := public._rapi_spasi(p_alasan, 200);
  if length(alasan) < 3 then return json_build_object('ok', false, 'pesan', 'Tulis alasan / keterangan hitung stok.'); end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    return json_build_object('ok', false, 'pesan', 'Isi hasil hitung minimal satu barang.');
  end if;
  if jsonb_array_length(p_items) > 300 then return json_build_object('ok', false, 'pesan', 'Terlalu banyak baris sekaligus (maksimal 300).'); end if;
  tg := public._opname_batas(p_tanggal);
  if tg.salah is not null then return json_build_object('ok', false, 'pesan', tg.salah); end if;
  perform pg_advisory_xact_lock(hashtext('staf|produksi_sesuai_log'));
  if coalesce(p_token, '') <> '' and exists (select 1 from toko_token where token = 'gdop|' || left(p_token, 60)) then
    return json_build_object('ok', true, 'ulang', true, 'pesan', 'Data ini sudah tersimpan sebelumnya (tidak dicatat dua kali).');
  end if;
  if tg.mundur then
    stok := public._gd_stok_per(tg.batas);
    label_tgl := to_char(tg.batas at time zone 'Asia/Makassar', 'DD/MM/YYYY');
    alasan := left(alasan || ' (hitung per ' || label_tgl || ')', 230);
    -- hitung stok yang lebih baru dari tanggal pilihan
    select coalesce(jsonb_object_agg(kw, t), '{}') into baru from (
      select upper(btrim(coalesce(kode, ''))) || '|' || public._rapi_warna(warna) kw, to_char(max(waktu_ajuan) at time zone 'Asia/Makassar', 'DD/MM/YYYY') t
        from produksi_sesuai_log
       where btrim(coalesce(bagian, '')) = 'Gudang' and btrim(coalesce(no, '')) like 'SP-%' and btrim(coalesce(status, '')) = 'Disetujui' and waktu_ajuan > tg.batas
       group by 1) z;
  else
    stok := public._gd_stok();
  end if;
  select coalesce(array_agg(upper(btrim(coalesce(kode, ''))) || '|' || public._rapi_warna(warna)), '{}') into tunggu from produksi_sesuai_log
   where btrim(coalesce(no, '')) <> '' and btrim(coalesce(bagian, '')) = 'Gudang' and btrim(coalesce(status, '')) = 'Menunggu';
  awalan := 'SP-' || to_char(kini at time zone 'Asia/Makassar', 'YYMMDD') || '-';
  maks := public._pss_no_maks(awalan);
  for it in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(it) <> 'object' then it := '{}'; end if;
    kd := upper(public._rapi_spasi(it ->> 'k', 30));
    select * into b from public._barang_dasar_semua() z where z.kode = kd;
    if b.kode is null or kd = '' then return json_build_object('ok', false, 'pesan', 'Barang tidak dikenal: ' || kd); end if;
    wr := public._rapi_warna(it ->> 'w');
    if wr <> '' and not (wr = any (b.warna)) and coalesce((stok ->> (kd || '|' || wr))::numeric, 0) = 0 then
      return json_build_object('ok', false, 'pesan', 'Warna ' || wr || ' tidak ada di daftar ' || b.nama || '.');
    end if;
    if wr = '' and cardinality(b.warna) > 0 and coalesce((stok ->> (kd || '|'))::numeric, 0) = 0 then
      return json_build_object('ok', false, 'pesan', 'Pilih warna untuk ' || b.nama || '.');
    end if;
    kunci := kd || '|' || wr;
    if kunci = any (lihat) then continue; end if;
    lihat := lihat || kunci;
    nm := b.nama || case when wr <> '' then ' ' || wr else '' end;
    hit := public._gd_int(it -> 'hitung');
    if hit is null or hit < 0 or hit > 1000000 then
      return json_build_object('ok', false, 'pesan', 'Hasil hitung ' || nm || ' harus angka bulat, minimal 0.');
    end if;
    if baru ? kunci then
      return json_build_object('ok', false, 'pesan', nm || ' sudah punya hitung stok yang lebih baru (' || (baru ->> kunci) || '). Pilih tanggal sesudahnya atau hapus barang ini dari daftar.');
    end if;
    sis := coalesce((stok ->> kunci)::numeric, 0);
    sel := hit - sis;
    if sel = 0 then sama := sama || nm; continue; end if;
    if kunci = any (tunggu) then lewat := lewat || nm; continue; end if;
    maks := maks + 1;
    nos := nos || (awalan || right('00' || maks::text, 3));
    baris := baris || jsonb_build_object('no', awalan || right('00' || maks::text, 3), 'k', kd, 'n', b.nama, 'w', wr, 'sis', sis, 'hit', hit, 'sel', sel);
  end loop;
  if jsonb_array_length(baris) = 0 then
    return json_build_object('ok', false, 'pesan',
      case when cardinality(sama) > 0 then 'Hasil hitung sama dengan stok sistem' || case when tg.mundur then ' per ' || label_tgl else '' end || ', tidak perlu penyesuaian.' else '' end
      || case when cardinality(lewat) > 0 then ' Masih menunggu persetujuan: ' || array_to_string(lewat, ', ') || '.' else '' end);
  end if;
  insert into produksi_sesuai_log (no, waktu_ajuan, bagian, kode, nama_barang, warna, stok_sistem, hasil_hitung, selisih, alasan, pengaju, status)
  select x ->> 'no', tg.batas, 'Gudang', x ->> 'k', x ->> 'n', nullif(x ->> 'w', ''), (x ->> 'sis')::numeric, (x ->> 'hit')::numeric,
         (x ->> 'sel')::numeric, alasan, nama, 'Menunggu'
    from jsonb_array_elements(baris) with ordinality t(x, o) order by o;
  if coalesce(p_token, '') <> '' then insert into toko_token (token) values ('gdop|' || left(p_token, 60)) on conflict do nothing; end if;
  insert into efek_antre (jenis, data) values ('sa_ajuan', jsonb_build_object('no', to_jsonb(nos),
    'asal', jsonb_build_object('e', '📦', 'n', 'Gudang Utama', 'nama', nama)));
  return json_build_object('ok', true, 'pesan', jsonb_array_length(baris) || ' pengajuan penyesuaian terkirim'
    || case when tg.mundur then ' (hitung per ' || label_tgl || ', dibandingkan dengan stok sistem per akhir tanggal itu)' else '' end
    || '. Stok berubah setelah disetujui manajemen Moscow Supplies.'
    || case when cardinality(sama) > 0 then ' ' || cardinality(sama) || ' barang sudah cocok.' else '' end
    || case when cardinality(lewat) > 0 then ' Dilewati (masih menunggu): ' || array_to_string(lewat, ', ') || '.' else '' end);
end $function$;
revoke all on function public.gudang_opname(text, text, jsonb, text, text) from public, anon;
grant execute on function public.gudang_opname(text, text, jsonb, text, text) to authenticated;
revoke all on function public._opname_batas(text) from public, anon, authenticated;
revoke all on function public._gd_stok_per(timestamptz) from public, anon, authenticated;

-- kp_ajuan: parameter p_tanggal (untuk 'hitung' & 'hitungW'). Stok sistem per tanggal dihitung di kp.js (stok sekarang - kiriman gudang
-- sesudah tanggal itu + penjualan marketplace yang dikirim sesudahnya), waktu_ajuan = akhir tanggal itu, sehingga rumus "hitung stok
-- Kantor Packing" (hasil hitung + kiriman sesudah jam hitung - penjualan sesudah jam hitung) memakai tanggal yang dipilih.
do $$
declare d text; asli text; function_ok boolean;
begin
  d := pg_get_functiondef('public.kp_ajuan(text,text,text,jsonb,text)'::regprocedure); asli := d;
  d := replace(d, 'p_token text)', 'p_token text, p_tanggal text DEFAULT NULL::text)');
  d := replace(d, 'j int := 0; batas int; tok text;', 'j int := 0; batas int; tok text; tg record; baru jsonb := ''{}''; label_tgl text := '''';');
  d := replace(d, E'  perform pg_advisory_xact_lock(hashtext(''staf|produksi_sesuai_log''));\n',
    E'  tg := public._opname_batas(case when p_jenis = ''sesuaiW'' then null else p_tanggal end);\n'
    || E'  if tg.salah is not null then return json_build_object(''ok'', false, ''pesan'', tg.salah); end if;\n'
    || E'  if tg.mundur then\n'
    || E'    label_tgl := to_char(tg.batas at time zone ''Asia/Makassar'', ''DD/MM/YYYY'');\n'
    || E'    al := left(al || '' (hitung per '' || label_tgl || '')'', 230);\n'
    || E'    select coalesce(jsonb_object_agg(kk2, t2), ''{}'') into baru from (\n'
    || E'      select upper(btrim(coalesce(kode, ''''))) kk2, to_char(max(waktu_ajuan) at time zone ''Asia/Makassar'', ''DD/MM/YYYY'') t2 from produksi_sesuai_log\n'
    || E'       where btrim(coalesce(bagian, '''')) = ''Kantor Packing'' and btrim(coalesce(no, '''')) like ''SK-%'' and btrim(coalesce(status, '''')) = ''Disetujui'' and waktu_ajuan > tg.batas\n'
    || E'       group by 1) z;\n'
    || E'  end if;\n'
    || E'  perform pg_advisory_xact_lock(hashtext(''staf|produksi_sesuai_log''));\n');
  d := replace(d, E'      sel := hit - sis;\n',
    E'      if baru ? kd then\n'
    || E'        return json_build_object(''ok'', false, ''pesan'', lbl || '' sudah punya hitung stok yang lebih baru ('' || (baru ->> kd) || ''). Pilih tanggal sesudahnya atau hapus barang ini dari daftar.'');\n'
    || E'      end if;\n'
    || E'      sel := hit - sis;\n');
  d := replace(d, E'select x ->> ''no'', kini, ''Kantor Packing''', E'select x ->> ''no'', tg.batas, ''Kantor Packing''');
  d := replace(d, E'    end\n    || case when cardinality(lewat) > 0 then '' Dilewati',
    E'    end\n    || case when tg.mundur then '' Hitung per '' || label_tgl || '' (dibandingkan dengan stok sistem per akhir tanggal itu).'' else '''' end\n    || case when cardinality(lewat) > 0 then '' Dilewati');
  if (length(d) - length(asli)) < 1200 or position('tg.batas, ''Kantor Packing''' in d) = 0 or position('baru ? kd' in d) = 0
     or position('p_tanggal text DEFAULT' in d) = 0 or position('Hitung per ''' in d) = 0 or position('tg := public._opname_batas' in d) = 0 then
    raise exception 'penggantian kp_ajuan tidak lengkap (%)', length(d) - length(asli);
  end if;
  drop function public.kp_ajuan(text, text, text, jsonb, text);
  execute d;
  revoke all on function public.kp_ajuan(text, text, text, jsonb, text, text) from public, anon;
  grant execute on function public.kp_ajuan(text, text, text, jsonb, text, text) to authenticated, service_role;
end $$;
