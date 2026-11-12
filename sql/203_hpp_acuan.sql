-- 12 Nov 2026: Batas kenaikan HPP 35% dibanding HPP ACUAN (bukan dibanding harga jual).
-- HPP acuan = HPP saat harga jual barang itu terakhir ditetapkan. Kenaikan bertahap (mis. 20% + 20%) tetap terdeteksi.
-- - Terima barang PO: HPP tetap diperbarui otomatis. Kalau HPP baru >= 135% HPP acuan, sistem membuat laporan
--   perubahan harga jual (harga_usul_log jenis 'Harga Jual', status Menunggu) dengan saran harga jual
--   = harga jual sekarang x HPP baru / HPP acuan (persentase margin tetap). Laporan muncul di Master Data
--   (HPP & Harga, ACC usulan) dan di Kendali Bisnis (ACC ubah HPP), plus pesan Telegram.
-- - Setiap harga jual diubah (_mm_terapkan 'harga'), HPP acuan barang itu diganti HPP saat itu.
-- - Isi awal acuan: HPP sebelum perubahan otomatis pertama dari Terima barang (fitur mulai 12 Nov), selain itu HPP sekarang.

create table if not exists public.hpp_acuan (
  kode text primary key,
  hpp numeric not null,
  sejak timestamptz not null default now(),
  sumber text
);
alter table public.hpp_acuan enable row level security;

insert into public.hpp_acuan (kode, hpp, sejak, sumber)
select b.kode,
       coalesce((select nullif(regexp_replace(coalesce(m.lama::text, ''), '[^\d.]', '', 'g'), '')::numeric
                   from md_ubah_log m
                  where upper(btrim(coalesce(m.kode, ''))) = b.kode and m.jenis = 'HPP' and m.oleh like 'otomatis (Terima barang%'
                  order by m.id limit 1),
                round(public._mde_hpp_kini(b.kode))),
       now(), 'isi awal 12 Nov 2026'
  from public._barang_dasar_semua() b
 where coalesce(round(public._mde_hpp_kini(b.kode)), 0) > 0
on conflict (kode) do nothing;

-- Daftar acuan untuk form (Gudang Utama, Purchasing, Kendali Bisnis, manajemen)
create or replace function public.hpp_acuan_daftar()
 returns json language plpgsql stable security definer set search_path to 'public'
as $function$
begin
  if not public._boleh_peran(array['gudang', 'purchasing_shopeepay', 'kendali_bisnis', 'produksi', 'bahan_baku']) then
    return json_build_object('ok', false, 'pesan', 'Akses ditolak.');
  end if;
  return json_build_object('ok', true, 'batas', 35, 'acuan', coalesce((select json_object_agg(kode, round(hpp)) from hpp_acuan), '{}'::json));
end $function$;
grant execute on function public.hpp_acuan_daftar() to authenticated;

-- Laporan perubahan harga jual karena HPP naik >= 35% dari acuan
create or replace function public._hpp_naik_lapor(p_k text, p_acuan numeric, p_baru numeric, p_po text, p_tb text, p_nama text)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare b record; hj numeric; saran numeric; persen numeric; kini timestamptz := now(); awalan text; maks int; nomor text; x record; al text;
begin
  select * into b from public._barang_dasar_semua() z where z.kode = upper(btrim(p_k));
  if b.kode is null or coalesce(p_acuan, 0) <= 0 then return null; end if;
  hj := coalesce(b.harga, 0);
  persen := round((p_baru / p_acuan - 1) * 100, 1);
  saran := case when hj > 0 then ceil(hj * p_baru / p_acuan / 100) * 100 end;
  al := 'HPP naik ' || replace(persen::text, '.', ',') || '% dari acuan Rp ' || public._gd_fmt(round(p_acuan)) || ' menjadi Rp ' || public._gd_fmt(round(p_baru))
     || ' (' || p_po || ', terima ' || p_tb || '). HPP baru sudah berlaku otomatis.'
     || case when saran > 0 then ' Saran harga jual Rp ' || public._gd_fmt(saran) || ' (harga jual Rp ' || public._gd_fmt(hj) || ' x ' || public._gd_fmt(round(p_baru)) || ' / ' || public._gd_fmt(round(p_acuan)) || ') supaya persentase margin tetap.' else ' Harga jual belum diisi.' end;
  perform pg_advisory_xact_lock(hashtext('staf|harga_usul_log'));
  for x in select id, baris_sheet bs from harga_usul_log
            where btrim(coalesce(status, '')) = 'Menunggu' and upper(btrim(coalesce(kode, ''))) = b.kode and btrim(coalesce(jenis, '')) = 'Harga Jual'
              and btrim(coalesce(dari_link, '')) like 'Otomatis%' loop
    if x.bs is not null then perform public._ubah_catat('harga_usul_log', x.id, array['status', 'waktu_keputusan', 'diputus_oleh', 'catatan']); end if;
    update harga_usul_log set status = 'Diganti', waktu_keputusan = kini, diputus_oleh = 'otomatis', catatan = 'Diganti laporan yang lebih baru' where id = x.id;
  end loop;
  awalan := 'HU-' || to_char(kini at time zone 'Asia/Makassar', 'YYMMDD') || '-';
  select coalesce(max(case when substr(btrim(no), length(awalan) + 1) ~ '^\d+' then substring(substr(btrim(no), length(awalan) + 1) from '^\d+')::int else 0 end), 0)
    into maks from harga_usul_log where left(btrim(coalesce(no, '')), length(awalan)) = awalan;
  nomor := awalan || right('00' || (maks + 1)::text, 3);
  insert into harga_usul_log (no, waktu, dari_link, nama_pengusul, jenis, lokasi, kode, nama_barang, lama, baru, alasan, status)
  values (nomor, kini, 'Otomatis: HPP naik 35% atau lebih (Terima barang)', left('otomatis (' || coalesce(p_nama, '') || ')', 60), 'Harga Jual', 'Semua lokasi', b.kode, b.nama,
          case when hj > 0 then hj::text end, coalesce(saran, hj)::text, left(al, 300), 'Menunggu');
  insert into efek_antre (jenis, data) values ('tg', jsonb_build_object('asal', jsonb_build_object('e', '📦', 'n', 'Gudang Utama', 'nama', coalesce(p_nama, '')), 'teks',
    '📈 <b>HPP NAIK ' || replace(persen::text, '.', ',') || '%</b> ' || public._tg_esc(nomor)
    || E'\n' || public._tg_esc(b.nama) || ' (' || public._tg_esc(b.kode) || ')'
    || E'\nHPP acuan Rp ' || public._gd_fmt(round(p_acuan)) || ' → <b>Rp ' || public._gd_fmt(round(p_baru)) || '</b> (sudah berlaku)'
    || case when saran > 0 then E'\nHarga jual Rp ' || public._gd_fmt(hj) || E' → saran <b>Rp ' || public._gd_fmt(saran) || '</b>' else '' end
    || E'\nTentukan harga jual baru di Master Data > HPP & Harga atau Kendali Bisnis > ACC ubah HPP.'));
  return jsonb_build_object('no', nomor, 'saran', saran, 'persen', persen);
end $function$;

-- Harga jual diubah -> HPP acuan barang itu = HPP sekarang
do $$
declare d text := pg_get_functiondef('public._mm_terapkan'::regproc); a text; b text;
begin
  if position('hpp_acuan' in d) > 0 then return; end if;
  a := '    v_lok := ''Semua saluran'';';
  b := '    if coalesce(round(public._mde_hpp_kini(v_k)), 0) > 0 then
      insert into hpp_acuan (kode, hpp, sejak, sumber) values (v_k, round(public._mde_hpp_kini(v_k)), kini, ''harga jual diubah: '' || left(coalesce(p_oleh, ''''), 80))
      on conflict (kode) do update set hpp = excluded.hpp, sejak = excluded.sejak, sumber = excluded.sumber;
    end if;
    v_lok := ''Semua saluran'';';
  if position(a in d) = 0 then raise exception 'pola mm'; end if;
  execute replace(d, a, b);
end $$;

-- Terima barang PO: bandingkan HPP baru dengan HPP acuan
do $$
declare d text := pg_get_functiondef('public.gudang_terima_po'::regproc); a text; b text;
begin
  if position('hpp_acuan' in d) > 0 then return; end if;
  a := 'r2 record; t2 jsonb; unit numeric; hj numeric; begin';
  b := 'r2 record; t2 jsonb; unit numeric; hj numeric; acu numeric; lp jsonb; begin';
  if position(a in d) = 0 then raise exception 'pola 1'; end if; d := replace(d, a, b);

  a := '      t2 := public._mm_terapkan(''hpp'', r2.k, unit,';
  b := '      select ha.hpp into acu from hpp_acuan ha where ha.kode = r2.k;
      if acu is null then
        acu := round(public._mde_hpp_kini(r2.k));
        if acu > 0 then insert into hpp_acuan (kode, hpp, sejak, sumber) values (r2.k, acu, now(), ''HPP sebelum '' || no) on conflict (kode) do nothing; end if;
      end if;
      t2 := public._mm_terapkan(''hpp'', r2.k, unit,';
  if position(a in d) = 0 then raise exception 'pola 2'; end if; d := replace(d, a, b);

  a := '      if coalesce(hj, 0) > 0 and unit / hj > 0.35 then
        tinjau := tinjau || jsonb_build_object(''k'', r2.k, ''hpp'', unit, ''hj'', hj, ''persen'', round(unit / hj * 100, 1));
      end if;';
  b := '      if coalesce(acu, 0) > 0 and unit >= acu * 1.35 then
        lp := public._hpp_naik_lapor(r2.k, acu, unit, no, tb, nama);
        tinjau := tinjau || jsonb_build_object(''k'', r2.k, ''hpp'', unit, ''acuan'', acu, ''hj'', hj, ''persen'', round((unit / acu - 1) * 100, 1),
                                               ''saran'', lp -> ''saran'', ''no'', lp -> ''no'');
      end if;';
  if position(a in d) = 0 then raise exception 'pola 3'; end if; d := replace(d, a, b);

  a := '    tambah := tambah || '' Perlu ajukan harga jual baru (HPP lebih dari 35% harga jual): ''
      || (select string_agg((v ->> ''k'') || '' '' || (v ->> ''persen'') || ''%'', '', '') from jsonb_array_elements(tinjau) v) || ''.'';';
  b := '    tambah := tambah || '' HPP naik 35% atau lebih dari HPP acuan: ''
      || (select string_agg((v ->> ''k'') || '' +'' || replace(v ->> ''persen'', ''.'', '','') || ''%'', '', '') from jsonb_array_elements(tinjau) v)
      || ''. Laporan perubahan harga jual sudah dikirim ke manajemen Moscow Supplies.'';';
  if position(a in d) = 0 then raise exception 'pola 4'; end if; d := replace(d, a, b);
  execute d;
end $$;

-- Kendali Bisnis (ACC ubah HPP): laporan otomatis "Harga Jual" ikut bisa diputus. HPP sudah berlaku,
-- jadi yang diterapkan hanya harga jual baru (kalau diisi); kalau tidak diisi, harga jual tetap.
do $$
declare d text := pg_get_functiondef('public.hpp_mike_putus'::regproc); a text; b text;
begin
  if position('Otomatis%' in d) > 0 then return; end if;
  a := '  if x.id is null or x.j <> ''HPP'' then return json_build_object(''ok'', false, ''pesan'', ''Usulan HPP tidak ditemukan. Muat ulang.''); end if;
  if x.st <> ''Menunggu'' then return json_build_object(''ok'', false, ''pesan'', ''Usulan '' || x.no || '' sudah '' || lower(x.st) || ''.''); end if;';
  b := '  if x.id is not null and x.j = ''Harga Jual'' and x.dari like ''Otomatis%'' then
    if x.st <> ''Menunggu'' then return json_build_object(''ok'', false, ''pesan'', ''Laporan '' || x.no || '' sudah '' || lower(x.st) || ''.''); end if;
    s := regexp_replace(coalesce(p_harga, ''''), ''[^\d]'', '''', ''g'');
    hj := case when s <> '''' and length(s) <= 12 and s::numeric > 0 then s::numeric end;
    if x.bs is not null then perform public._ubah_catat(''harga_usul_log'', x.id, array[''status'', ''waktu_keputusan'', ''diputus_oleh'', ''catatan'']); end if;
    if not acc then
      update harga_usul_log set status = ''Ditolak'', waktu_keputusan = kini, diputus_oleh = public._kb_nama(), catatan = cat where id = x.id;
      if coalesce(p_token, '''') <> '''' then insert into toko_token (token) values (''hmk|'' || left(p_token, 60)) on conflict do nothing; end if;
      return json_build_object(''ok'', true, ''pesan'', ''Laporan '' || x.no || '' ditutup. Harga jual '' || x.n || '' tetap.'');
    end if;
    if hj > 0 then
      h := public._mm_terapkan(''harga'', x.k, hj, '''', ''Harga jual baru karena HPP naik (laporan '' || x.no || '')'', (public._kb_nama() || '' (Kendali Bisnis)''));
      if h ? ''lewat'' then return json_build_object(''ok'', false, ''pesan'', h ->> ''lewat''); end if;
      update harga_usul_log set status = case when hj = coalesce(nullif(regexp_replace(coalesce(x.baru::text, ''''), ''[^\d.]'', '''', ''g''), '''')::numeric, 0) then ''Di-ACC'' else ''Di-ACC (diubah)'' end, waktu_keputusan = kini, diputus_oleh = public._kb_nama(),
             catatan = coalesce(nullif(cat, ''''), ''Harga jual disetujui Rp '' || public._gd_fmt(hj)) where id = x.id;
      insert into efek_antre (jenis, data) values (''tg'', jsonb_build_object(''asal'', asal, ''teks'', ''🏷️ <b>HARGA JUAL DIUBAH</b> (HPP naik) '' || public._tg_esc(x.no) || E''\n'' || public._tg_esc(h ->> ''pesan'')));
      pesan := ''Laporan '' || x.no || '' selesai. '' || (h ->> ''pesan'');
    else
      update harga_usul_log set status = ''Di-ACC (harga jual tetap)'', waktu_keputusan = kini, diputus_oleh = public._kb_nama(), catatan = nullif(cat, '''') where id = x.id;
      pesan := ''Laporan '' || x.no || '' selesai. Harga jual '' || x.n || '' tetap.'';
    end if;
    if coalesce(p_token, '''') <> '''' then insert into toko_token (token) values (''hmk|'' || left(p_token, 60)) on conflict do nothing; end if;
    return json_build_object(''ok'', true, ''pesan'', pesan);
  end if;
' || a;
  if position(a in d) = 0 then raise exception 'pola mike'; end if;
  execute replace(d, a, b);
end $$;
