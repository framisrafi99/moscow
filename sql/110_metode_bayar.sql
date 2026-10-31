-- 110: Accounting › metode bayar nota Toko Offline (simpanMetodeBayar, file 66) langsung di Supabase.
--  Nota = No Nota kasir di TOKO_JUAL_LOG (toko offline); baris tanpa nomor dikelompokkan 'TANPA-NOTA|toko|tanggal' (MB_nota_).
--  Metode yang sudah ada diubah di baris yang sama (ubah_antre -> ditulis ke sheet TOKO_NOTA_BAYAR); nota baru ditambah (tulis balik).
create or replace function public.simpan_metode_bayar(p_ubah jsonb)
returns json language plpgsql volatile security definer set search_path = public as $$
declare u jsonb; v_no text; v_m text; v_raw text; nota record; e record; n int := 0; kini timestamptz := now(); daftar jsonb := '[]';
begin
  if coalesce((select public.peran_saya()), '') <> 'manajemen' then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  if p_ubah is null or jsonb_typeof(p_ubah) <> 'array' or jsonb_array_length(p_ubah) = 0 then return json_build_object('ok', false, 'pesan', 'Tidak ada perubahan.'); end if;
  if jsonb_array_length(p_ubah) > 500 then return json_build_object('ok', false, 'pesan', 'Terlalu banyak nota sekaligus (maksimal 500).'); end if;
  -- Periksa semua dulu (seperti Apps Script: satu nota salah = tidak ada yang disimpan).
  for u in select value from jsonb_array_elements(p_ubah) loop
    if jsonb_typeof(u) <> 'object' then u := '{}'; end if;
    v_no := btrim(coalesce(u ->> 'no', ''));
    select x.toko, x.t into nota from (
      select btrim(coalesce(j.toko, '')) toko, to_char(j.tanggal, 'YYYY-MM-DD') t,
             coalesce(nullif(btrim(coalesce(j.no_nota, '')), ''), 'TANPA-NOTA|' || btrim(coalesce(j.toko, '')) || '|' || to_char(j.tanggal, 'YYYY-MM-DD')) no
        from toko_jual_log j
       where j.tanggal is not null and j.toko ~* 'offline'
       order by j.baris_sheet nulls last, j.id) x
     where x.no = v_no limit 1;
    if nota.toko is null then return json_build_object('ok', false, 'pesan', 'Nota tidak ditemukan: ' || v_no); end if;
    -- if (u.m && !m): u.m dianggap ada seperti JavaScript (teks tidak kosong, angka bukan 0, true).
    v_raw := case jsonb_typeof(u -> 'm') when 'string' then case when u ->> 'm' <> '' then 'y' else '' end
                                          when 'number' then case when (u ->> 'm')::numeric <> 0 then 'y' else '' end
                                          when 'boolean' then case when (u ->> 'm')::boolean then 'y' else '' end else '' end;
    v_m := case lower(btrim(coalesce(u ->> 'm', ''))) when 'tunai' then 'Tunai' when 'cash' then 'Tunai' when 'qris' then 'QRIS' else '' end;
    if v_raw = 'y' and v_m = '' then return json_build_object('ok', false, 'pesan', 'Metode bayar tidak valid untuk ' || v_no || '.'); end if;
    daftar := daftar || jsonb_build_object('no', v_no, 'toko', nota.toko, 't', nota.t, 'm', v_m);
    nota := null;
  end loop;
  perform pg_advisory_xact_lock(hashtext('toko_nota_bayar'));
  -- MB_tulis_ (oleh 'manajemen', semua): baris terakhir per nota yang sudah ada diubah; yang belum ada ditambah.
  for u in select value from jsonb_array_elements(daftar) loop
    select id, case lower(btrim(coalesce(metode, ''))) when 'tunai' then 'Tunai' when 'cash' then 'Tunai' when 'qris' then 'QRIS' else '' end m
      into e from toko_nota_bayar where btrim(coalesce(no_nota, '')) = u ->> 'no' order by baris_sheet desc nulls first, id desc limit 1;
    if e.id is not null then
      if e.m = u ->> 'm' then continue; end if;
      perform public._ubah_catat('toko_nota_bayar', e.id, array['metode', 'diisi_oleh', 'waktu']);
      update toko_nota_bayar set metode = nullif(u ->> 'm', ''), diisi_oleh = 'manajemen', waktu = kini where id = e.id;
      n := n + 1;
    else
      if u ->> 'm' = '' then continue; end if;
      insert into toko_nota_bayar (no_nota, toko, tanggal, metode, diisi_oleh, waktu)
      values (u ->> 'no', u ->> 'toko', to_date(u ->> 't', 'YYYY-MM-DD'), u ->> 'm', 'manajemen', kini);
      n := n + 1;
    end if;
    e := null;
  end loop;
  return json_build_object('ok', true, 'pesan', n || ' nota diperbarui.');
end $$;
revoke all on function public.simpan_metode_bayar(jsonb) from public, anon;
grant execute on function public.simpan_metode_bayar(jsonb) to authenticated;
select 'ok110' as ok;
