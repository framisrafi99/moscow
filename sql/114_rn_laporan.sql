-- 114: laporan bulan toko consignment offline (rnLaporanSimpan, file 78/79) diisi / ditutup / dibuka manajemen langsung di Supabase.
--  Baris LAPORAN_BULAN_TOKO baru ditulis balik ke sheet; baris yang sudah ada diubah lewat ubah_antre. Cache Apps Script dihapus lewat efek 'rn_cache'.
create or replace function public.rn_laporan_simpan(p_toko text, p_bulan text, p_aksi text, p_tunai text, p_transfer text)
returns json language plpgsql volatile security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_toko text := left(btrim(regexp_replace(coalesce(p_toko, ''), '\s+', ' ', 'g')), 80);
  v_bulan text := left(btrim(regexp_replace(coalesce(p_bulan, ''), '\s+', ' ', 'g')), 10);
  v_aksi text := coalesce(nullif(left(btrim(regexp_replace(coalesce(p_aksi, ''), '\s+', ' ', 'g')), 10), ''), 'simpan');
  oleh text := 'manajemen'; x record; s1 text; s2 text; tutup boolean; kini timestamptz := now(); pesan text;
begin
  if (select public.peran_saya()) is distinct from 'manajemen' then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  if v_toko <> 'Consignment Renon' then return json_build_object('ok', false, 'pesan', 'Laporan bulan ini tidak dipakai untuk toko ini.'); end if;
  if v_bulan !~ '^\d{4}-(0[1-9]|1[0-2])$' then return json_build_object('ok', false, 'pesan', 'Bulan tidak valid.'); end if;
  if public._tb_tolak(v_bulan || '-01') <> '' then return json_build_object('ok', false, 'pesan', 'Buku bulan ini sudah ditutup manajemen Moscow Supplies.'); end if;
  perform pg_advisory_xact_lock(hashtext('toko|laporan_bulan_toko'));
  -- RN_baca_: baris terakhir untuk toko + bulan itu.
  select id, baris_sheet bs, btrim(coalesce(status, '')) = 'Ditutup' tt, ditutup_oleh ot, waktu_tutup wt into x from laporan_bulan_toko
   where public._bulan_teks(bulan) = v_bulan and left(btrim(regexp_replace(coalesce(toko, ''), '\s+', ' ', 'g')), 80) = v_toko
   order by baris_sheet desc nulls first, id desc limit 1;
  if v_aksi = 'buka' then
    if x.id is null or not x.tt then return json_build_object('ok', false, 'pesan', 'Laporan bulan ini belum ditutup.'); end if;
    if x.bs is not null then perform public._ubah_catat('laporan_bulan_toko', x.id, array['status']); end if;
    update laporan_bulan_toko set status = 'Terbuka' where id = x.id;
    pesan := 'Laporan dibuka kembali. Staf bisa memperbaiki angkanya lalu menutupnya lagi.';
  else
    s1 := regexp_replace(coalesce(p_tunai, ''), '[^\d]', '', 'g'); s2 := regexp_replace(coalesce(p_transfer, ''), '[^\d]', '', 'g');
    if s1 = '' or s2 = '' then return json_build_object('ok', false, 'pesan', 'Isi total tunai dan total transfer/QRIS (boleh 0).'); end if;
    if length(s1) > 15 or length(s2) > 15 or s1::numeric > 100000000000 or s2::numeric > 100000000000 then
      return json_build_object('ok', false, 'pesan', 'Angka terlalu besar. Periksa lagi.');
    end if;
    tutup := v_aksi = 'tutup' or coalesce(x.tt, false);
    if x.id is not null then
      if x.bs is not null then
        perform public._ubah_catat('laporan_bulan_toko', x.id, array['tunai', 'transfer', 'status', 'diisi_oleh', 'waktu', 'ditutup_oleh', 'waktu_tutup']);
      end if;
      update laporan_bulan_toko set tunai = s1::numeric, transfer = s2::numeric,
             status = case when tutup then 'Ditutup' else 'Terbuka' end, diisi_oleh = oleh, waktu = kini,
             ditutup_oleh = case when v_aksi = 'tutup' then oleh else coalesce(x.ot, '') end,
             waktu_tutup = case when v_aksi = 'tutup' then kini else x.wt end
       where id = x.id;
    else
      insert into laporan_bulan_toko (bulan, toko, tunai, transfer, status, diisi_oleh, waktu, ditutup_oleh, waktu_tutup)
      values (v_bulan, v_toko, s1::numeric, s2::numeric, case when tutup then 'Ditutup' else 'Terbuka' end, oleh, kini,
              case when v_aksi = 'tutup' then oleh else '' end, case when v_aksi = 'tutup' then kini end);
    end if;
    pesan := case when v_aksi = 'tutup' then 'Laporan bulan ini ditutup. Invoice bagi hasil sudah terbit.'
                  else 'Tersimpan. Tekan "Tutup laporan bulan ini" setelah angkanya final.' end;
  end if;
  insert into efek_antre (jenis, data) values ('rn_cache', '{}'::jsonb);
  return json_build_object('ok', true, 'pesan', pesan);
end $$;
revoke all on function public.rn_laporan_simpan(text, text, text, text, text) from public, anon;
grant execute on function public.rn_laporan_simpan(text, text, text, text, text) to authenticated;

do $x$
declare d text;
begin
  d := pg_get_functiondef('public.tulis_balik_tandai(text, jsonb)'::regprocedure);
  if position('''laporan_bulan_toko''' in d) = 0 then
    d := replace(d, '''po_biaya''', '''po_biaya'', ''laporan_bulan_toko''');
    execute d;
  end if;
end $x$;
select position('''laporan_bulan_toko''' in pg_get_functiondef('public.tulis_balik_tandai(text, jsonb)'::regprocedure)) > 0 as ok114;
