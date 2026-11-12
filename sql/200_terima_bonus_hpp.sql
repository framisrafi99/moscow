-- 12 Nov 2026: Terima barang PO (Gudang Utama)
-- 1) Kolom Bonus: barang bonus dari supplier masuk stok gudang (gudang_log jenis 'Masuk Bonus', ref 'BN-<TB>|<PO>'),
--    tidak mengubah HPP dan tidak dihitung sebagai barang PO yang datang. Laporan: gudang_bonus_bulan(p_bulan).
-- 2) HPP otomatis: setelah barang diterima, HPP di daftar barang langsung diganti HPP dari PO ini
--    (harga beli + bagian ongkir PO) lewat _mm_terapkan, tanpa usulan HPP ke Mike.
-- 3) Barang yang HPP-nya > 35% dari harga jual (standar margin Moscow Supplies) dikembalikan di 'tinjau'
--    dan disebut di pesan, supaya staf mengajukan harga jual baru.
do $$
declare d text := pg_get_functiondef('public.gudang_terima_po'::regproc); a text; b text;
begin
  if position('Masuk Bonus' in d) > 0 then return; end if;
  a := 'st text; x jsonb; n int;';
  b := 'st text; x jsonb; n int; bonus numeric; total_bonus numeric := 0; hpp_ubah int := 0; tinjau jsonb := ''[]''; tambah text := '''';';
  if position(a in d) = 0 then raise exception 'pola 1'; end if; d := replace(d, a, b);

  a := 'if baik = 0 and rusak = 0 then j := null; continue; end if;';
  b := 'bonus := case when it -> ''bonus'' is null or jsonb_typeof(it -> ''bonus'') = ''null'' or it ->> ''bonus'' = '''' then 0 else public._gd_int(it -> ''bonus'') end;
      if bonus is null or bonus = ''NaN''::numeric or bonus < 0 then
        return json_build_object(''ok'', false, ''pesan'', ''Jumlah bonus untuk '' || (x ->> ''n'') || '' harus angka bulat, minimal 0.'');
      end if;
      if baik = 0 and rusak = 0 and bonus = 0 then j := null; continue; end if;';
  if position(a in d) = 0 then raise exception 'pola 2'; end if; d := replace(d, a, b);

  a := '''baik'', baik, ''rusak'', rusak);';
  b := '''baik'', baik, ''rusak'', rusak, ''bonus'', bonus);
      total_bonus := total_bonus + bonus;';
  if position(a in d) = 0 then raise exception 'pola 3'; end if; d := replace(d, a, b);

  a := 'from jsonb_array_elements(baris) with ordinality t(x, o2) order by o2;';
  b := 'from jsonb_array_elements(baris) with ordinality t(x, o2) where (x ->> ''baik'')::numeric > 0 or (x ->> ''rusak'')::numeric > 0 order by o2;
  insert into gudang_log (tanggal, jenis, kode, nama_barang, warna, qty, sumber_tujuan, waktu_masuk, pengisi, catatan, ref, qty_rusak)
  select to_date(p_tanggal, ''YYYY-MM-DD''), ''Masuk Bonus'', x ->> ''k'', x ->> ''n'', nullif(x ->> ''w'', ''''), (x ->> ''bonus'')::numeric,
         o.asal || '' - '' || o.sup || '' (bonus)'', kini, ''form: '' || nama, ''Bonus supplier dari '' || no, ''BN-'' || tb || ''|'' || no, null
    from jsonb_array_elements(baris) with ordinality t(x, o2) where (x ->> ''bonus'')::numeric > 0 order by o2;
  declare v_brg numeric; v_biaya numeric; r2 record; t2 jsonb; unit numeric; hj numeric; begin
    select coalesce(sum(coalesce(subtotal, coalesce(qty, 0) * coalesce(harga_satuan, 0))), 0) into v_brg from po_item where public._rapi_spasi(no_po, 30) = no;
    select coalesce(sum(coalesce(nominal, 0)), 0) into v_biaya from po_biaya where public._rapi_spasi(no_po, 30) = no;
    for r2 in select upper(public._rapi_spasi(i.kode, 30)) k, max(coalesce(i.harga_satuan, 0)) h, sum(coalesce(i.qty, 0)) q,
                     sum(coalesce(i.subtotal, coalesce(i.qty, 0) * coalesce(i.harga_satuan, 0))) s
                from po_item i where public._rapi_spasi(i.no_po, 30) = no
                 and upper(public._rapi_spasi(i.kode, 30)) in (select upper(v ->> ''k'') from jsonb_array_elements(baris) v where (v ->> ''baik'')::numeric > 0)
               group by 1 loop
      if r2.h <= 0 or r2.q <= 0 then continue; end if;
      unit := round(r2.h + case when v_brg > 0 then v_biaya * r2.s / v_brg / r2.q else 0 end);
      t2 := public._mm_terapkan(''hpp'', r2.k, unit, '''', ''HPP otomatis dari '' || no || '' (terima '' || tb || '')'', ''otomatis (Terima barang, '' || nama || '')'');
      if not (t2 ? ''lewat'') then hpp_ubah := hpp_ubah + 1; end if;
      select z.harga into hj from public._barang_dasar_semua() z where z.kode = r2.k;
      if coalesce(hj, 0) > 0 and unit / hj > 0.35 then
        tinjau := tinjau || jsonb_build_object(''k'', r2.k, ''hpp'', unit, ''hj'', hj, ''persen'', round(unit / hj * 100, 1));
      end if;
    end loop;
  end;
  if total_bonus > 0 then tambah := tambah || '' Bonus '' || public._gd_fmt(total_bonus) || '' pcs masuk stok.''; end if;
  if hpp_ubah > 0 then tambah := tambah || '' HPP '' || hpp_ubah || '' barang diperbarui otomatis.''; end if;
  if jsonb_array_length(tinjau) > 0 then
    tambah := tambah || '' Perlu ajukan harga jual baru (HPP lebih dari 35% harga jual): ''
      || (select string_agg((v ->> ''k'') || '' '' || (v ->> ''persen'') || ''%'', '', '') from jsonb_array_elements(tinjau) v) || ''.'';
  end if;';
  if position(a in d) = 0 then raise exception 'pola 4'; end if; d := replace(d, a, b);

  a := 'return json_build_object(''ok'', true, ''no'', tb, ''pesan'', ';
  b := 'return json_build_object(''ok'', true, ''no'', tb, ''tinjau'', tinjau, ''pesan'', ';
  if position(a in d) = 0 then raise exception 'pola 5'; end if; d := replace(d, a, b);

  a := 'else ''selesai.'' end);
end $function$';
  b := 'else ''selesai.'' end || tambah);
end $function$';
  if position(a in d) = 0 then raise exception 'pola 6'; end if; d := replace(d, a, b);
  execute d;
end $$;

-- Laporan barang bonus per bulan (YYYY-MM)
create or replace function public.gudang_bonus_bulan(p_bulan text)
 returns json language plpgsql stable security definer set search_path to 'public'
as $function$
declare b text := coalesce(nullif(btrim(p_bulan), ''), to_char(now() at time zone 'Asia/Makassar', 'YYYY-MM'));
begin
  if not public._boleh_peran(array['gudang', 'purchasing_shopeepay', 'kendali_bisnis']) then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  if b !~ '^\d{4}-\d{2}$' then return json_build_object('ok', false, 'pesan', 'Bulan tidak valid.'); end if;
  return json_build_object('ok', true, 'bulan', b, 'list', coalesce((
    select json_agg(json_build_object('t', to_char(g.tanggal, 'YYYY-MM-DD'), 'k', upper(btrim(g.kode)), 'n', g.nama_barang, 'w', coalesce(g.warna, ''),
             'q', g.qty, 'po', split_part(coalesce(g.ref, ''), '|', 2), 'sup', g.sumber_tujuan, 'oleh', g.pengisi,
             'hpp', round(public._mde_hpp_kini(upper(btrim(g.kode))))) order by g.tanggal, g.id)
      from gudang_log g where btrim(coalesce(g.jenis, '')) = 'Masuk Bonus' and to_char(g.tanggal, 'YYYY-MM') = b), '[]'::json));
end $function$;
grant execute on function public.gudang_bonus_bulan(text) to authenticated;
