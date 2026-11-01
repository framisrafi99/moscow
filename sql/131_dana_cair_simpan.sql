-- 131: upload laporan dana cair marketplace (danaCairSimpan, file 76) langsung di Supabase dari Master Data baru.
--  Pemeriksaan sama dengan Apps Script: platform harus dipakai toko itu, periode di dalam satu bulan, penjaga salah akun
--  (username toko berbeda dari upload sebelumnya -> perlu konfirmasi), buku yang sudah ditutup ditolak.
--  Tambahan: toko Official (Shopee, Tokopedia/TikTok, Lazada) untuk laporan potongan platform Official.
--  Ringkasan -> dana_cair (baris baru ditulis balik ke sheet DANA_CAIR, baris lama lewat ubah_antre),
--  dana diterima -> saluran_dana (dasar hitungan bagi hasil), rincian per pesanan -> efek 'dc_pesanan' (Apps Script menulis
--  sheet DANA_CAIR_PESANAN seperti sebelumnya, lalu tersalin ke dana_cair_pesanan) dan simpanan hitungan Apps Script dihapus.
create or replace function public.dana_cair_simpan(p_toko text, p_data jsonb, p_file text, p_yakin boolean default false)
returns json language plpgsql volatile security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_toko text := public._mp_t(p_toko, 80);
  d jsonb := coalesce(p_data, '{}'::jsonb);
  v_pf text := public._mp_t(d ->> 'platform', 20);
  v_bulan text := public._mp_t(d ->> 'bulan', 10);
  v_dari text := public._mp_t(d ->> 'dari', 10);
  v_sampai text := public._mp_t(d ->> 'sampai', 10);
  v_akun text := public._mp_t(d ->> 'akun', 80);
  v_cair numeric := round(public._mp_n(d ->> 'cair'));
  psn jsonb := case when jsonb_typeof(d -> 'pesanan') = 'array' then d -> 'pesanan' else '[]'::jsonb end;
  pasar text[];
  lain text; x record; s record; kini timestamptz := now(); rinciB text; rinciP text; tarik jsonb;
  nm text[] := array['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  nb text;
begin
  if (select public.peran_saya()) is distinct from 'manajemen' then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  pasar := case v_toko when 'Consignment Medan' then array['Shopee', 'Tokopedia'] when 'Consignment Sidoarjo' then array['Shopee']
                       when 'Official' then array['Shopee', 'Tokopedia', 'Lazada'] else array[]::text[] end;
  if not (v_pf = any(pasar)) then return json_build_object('ok', false, 'pesan', v_toko || ' tidak memakai platform ' || coalesce(nullif(v_pf, ''), '-') || '.'); end if;
  if v_bulan !~ '^\d{4}-(0[1-9]|1[0-2])$' then return json_build_object('ok', false, 'pesan', 'Bulan laporan tidak valid.'); end if;
  if v_dari !~ '^\d{4}-\d{2}-\d{2}$' or v_sampai !~ '^\d{4}-\d{2}-\d{2}$' or left(v_dari, 7) <> v_bulan or left(v_sampai, 7) <> v_bulan then
    return json_build_object('ok', false, 'pesan', 'Periode laporan harus di dalam satu bulan.');
  end if;
  if jsonb_array_length(psn) > 20000 then return json_build_object('ok', false, 'pesan', 'Pesanan terlalu banyak (' || jsonb_array_length(psn) || ').'); end if;
  if abs(v_cair) > 100000000000 then return json_build_object('ok', false, 'pesan', 'Dana cair tidak wajar. Periksa filenya.'); end if;
  nb := nm[right(v_bulan, 2)::int] || ' ' || left(v_bulan, 4);
  perform pg_advisory_xact_lock(hashtext('dc|dana_cair'));
  -- Penjaga salah toko: username toko berbeda dari upload sebelumnya untuk toko + platform yang sama.
  if v_akun <> '' and not coalesce(p_yakin, false) then
    select public._mp_t(akun_toko, 80) into lain from dana_cair
     where public._mp_t(toko, 80) = v_toko and public._mp_t(platform, 20) = v_pf and public._mp_t(akun_toko, 80) not in ('', v_akun)
     order by baris_sheet nulls last, id limit 1;
    if lain is not null then
      return json_build_object('ok', false, 'perluYakin', true, 'pesan', 'Akun toko di file ini "' || v_akun || '", sedangkan upload ' || v_pf || ' ' || v_toko ||
        ' sebelumnya dari akun "' || lain || '". Pastikan filenya benar milik ' || v_toko || '.');
    end if;
  end if;
  if public._tb_tolak(v_bulan || '-01') <> '' then
    return json_build_object('ok', false, 'pesan', 'Buku ' || nb || ' sudah ditutup. Buka kembali di Tutup Buku kalau perlu koreksi.');
  end if;

  select string_agg(public._mp_t(e ->> 'n', 80) || ': ' || round(public._mp_n(e ->> 'v'))::bigint, '; ' order by o) into rinciB
    from jsonb_array_elements(case when jsonb_typeof(d -> 'biaya') = 'array' then d -> 'biaya' else '[]' end) with ordinality t(e, o) where o <= 40;
  select string_agg(public._mp_t(e ->> 'n', 80) || ': ' || round(public._mp_n(e ->> 'v'))::bigint, '; ' order by o) into rinciP
    from jsonb_array_elements(case when jsonb_typeof(d -> 'penRinci') = 'array' then d -> 'penRinci' else '[]' end) with ordinality t(e, o) where o <= 40;
  select coalesce(jsonb_agg(jsonb_build_object('t', public._mp_t(e ->> 't', 10), 'v', round(public._mp_n(e ->> 'v')),
           'rek', left(regexp_replace(public._mp_t(e ->> 'rek', 4), '[^\d]', '', 'g'), 4)) order by o), '[]') into tarik
    from jsonb_array_elements(case when jsonb_typeof(d -> 'tarik') = 'array' then d -> 'tarik' else '[]' end) with ordinality t(e, o) where o <= 60;

  -- Ringkasan: satu baris per bulan + toko + platform (baris terakhir yang cocok, sama dengan Apps Script).
  select id, baris_sheet bs into x from dana_cair
   where public._bulan_teks(bulan) = v_bulan and public._mp_t(toko, 80) = v_toko and public._mp_t(platform, 20) = v_pf
   order by baris_sheet desc nulls first, id desc limit 1;
  if x.id is not null then
    if x.bs is not null then
      perform public._ubah_catat('dana_cair', x.id, array['akun_toko', 'dari', 'sampai', 'harga_produk', 'pengembalian_dana', 'total_pendapatan', 'total_biaya',
        'rincian_biaya', 'penyesuaian', 'rincian_penyesuaian', 'dana_cair', 'jumlah_pesanan', 'penarikan', 'nama_file', 'diupload_oleh', 'waktu_upload']);
    end if;
    update dana_cair set akun_toko = nullif(v_akun, ''), dari = to_char(v_dari::date, 'DD/MM/YYYY'), sampai = to_char(v_sampai::date, 'DD/MM/YYYY'),
      harga_produk = round(public._mp_n(d ->> 'harga')), pengembalian_dana = round(public._mp_n(d ->> 'refund')),
      total_pendapatan = round(public._mp_n(d ->> 'pendapatan')), total_biaya = round(public._mp_n(d ->> 'biayaTot')), rincian_biaya = rinciB,
      penyesuaian = round(public._mp_n(d ->> 'penyesuaian')), rincian_penyesuaian = rinciP, dana_cair = v_cair,
      jumlah_pesanan = round(public._mp_n(d ->> 'jml')), penarikan = tarik::text, nama_file = nullif(public._mp_t(p_file, 120), ''),
      diupload_oleh = 'manajemen', waktu_upload = kini
     where id = x.id;
  else
    insert into dana_cair (bulan, toko, platform, akun_toko, dari, sampai, harga_produk, pengembalian_dana, total_pendapatan, total_biaya, rincian_biaya,
                           penyesuaian, rincian_penyesuaian, dana_cair, jumlah_pesanan, penarikan, nama_file, diupload_oleh, waktu_upload)
    values (v_bulan, v_toko, v_pf, nullif(v_akun, ''), to_char(v_dari::date, 'DD/MM/YYYY'), to_char(v_sampai::date, 'DD/MM/YYYY'),
            round(public._mp_n(d ->> 'harga')), round(public._mp_n(d ->> 'refund')), round(public._mp_n(d ->> 'pendapatan')), round(public._mp_n(d ->> 'biayaTot')),
            rinciB, round(public._mp_n(d ->> 'penyesuaian')), rinciP, v_cair, round(public._mp_n(d ->> 'jml')), tarik::text,
            nullif(public._mp_t(p_file, 120), ''), 'manajemen', kini);
  end if;

  -- Dana diterima untuk hitungan bagi hasil (SALURAN_DANA) = dana cair bulan itu.
  select id, baris_sheet bs into s from saluran_dana
   where public._bulan_teks(bulan) = v_bulan and public._mp_t(toko, 80) = v_toko and public._mp_t(saluran, 30) = v_pf
   order by baris_sheet desc nulls first, id desc limit 1;
  if s.id is not null then
    if s.bs is not null then perform public._ubah_catat('saluran_dana', s.id, array['dana_diterima', 'diisi_oleh', 'waktu']); end if;
    update saluran_dana set dana_diterima = v_cair, diisi_oleh = 'upload laporan dana', waktu = kini where id = s.id;
  else
    insert into saluran_dana (bulan, toko, saluran, dana_diterima, diisi_oleh, waktu) values (v_bulan, v_toko, v_pf, v_cair, 'upload laporan dana', kini);
  end if;

  -- Rincian per pesanan ditulis Apps Script ke sheet DANA_CAIR_PESANAN (ganti baris lama toko/platform/bulan yang sama).
  insert into efek_antre (jenis, data) values ('dc_pesanan', jsonb_build_object('bulan', v_bulan, 'toko', v_toko, 'pf', v_pf, 'waktu', kini,
    'pesanan', (select coalesce(jsonb_agg(jsonb_build_array(public._mp_t(e ->> 'no', 40), coalesce(nullif(public._mp_t(e ->> 'j', 30), ''), 'Pesanan'),
        case when (e ->> 'tp') ~ '^\d{4}-\d{2}-\d{2}$' then e ->> 'tp' else '' end, case when (e ->> 'tc') ~ '^\d{4}-\d{2}-\d{2}$' then e ->> 'tc' else '' end,
        round(public._mp_n(e ->> 'h')), round(public._mp_n(e ->> 'rf')), round(public._mp_n(e ->> 'd')))), '[]') from jsonb_array_elements(psn) e)));

  return json_build_object('ok', true, 'pesan', 'Laporan dana ' || v_pf || ' ' || v_toko || ' ' || nb || ' tersimpan: dana cair Rp ' ||
    replace(to_char(v_cair, 'FM999,999,999,990'), ',', '.') || ' (' || jsonb_array_length(psn) || ' baris pesanan).');
end $$;
revoke all on function public.dana_cair_simpan(text, jsonb, text, boolean) from public, anon;
grant execute on function public.dana_cair_simpan(text, jsonb, text, boolean) to authenticated;

do $x$
declare d text;
begin
  d := pg_get_functiondef('public.tulis_balik_tandai(text, jsonb)'::regprocedure);
  if position('''dana_cair''' in d) = 0 then
    d := replace(d, '''po_biaya''', '''po_biaya'', ''dana_cair''');
    execute d;
  end if;
end $x$;
select position('''dana_cair''' in pg_get_functiondef('public.tulis_balik_tandai(text, jsonb)'::regprocedure)) > 0 as ok131;
