-- 109: form staf produksi › Harga kemasan (kemasanHargaSimpan, file 4 + pembungkus file 25) langsung di Supabase.
--  Mengisi harga total, supplier, dan pengisi harga pada baris BAHAN_MASUK yang sudah ada (ubah_antre -> ditulis ke sheet),
--  lalu efek 'kemasan_harga' di Apps Script mencatat kenaikan harga (HRG_catat_ -> HARGA_NAIK_LOG + Telegram) seperti sebelumnya.
create or replace function public.kemasan_harga_simpan(p_baris int, p_tanggal text, p_nama text, p_harga text, p_pengisi text, p_supplier text)
returns json language plpgsql volatile security definer set search_path = public as $$
declare h numeric; v_pengisi text; v_supplier text; b record; q numeric; v_nama text;
begin
  if not public._boleh_peran(array['produksi']) then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  h := nullif(regexp_replace(coalesce(p_harga, ''), '[^0-9]', '', 'g'), '')::numeric;
  if h is null or h <= 0 or h > 100000000000 then return json_build_object('ok', false, 'pesan', 'Harga total harus angka lebih dari 0.'); end if;
  v_pengisi := public._rapi(p_pengisi, 40);
  if length(v_pengisi) < 2 then return json_build_object('ok', false, 'pesan', 'Nama pengisi belum diisi.'); end if;
  v_supplier := public._rapi(p_supplier, 60);
  perform pg_advisory_xact_lock(hashtext('staf|bahan_masuk'));
  select id, tanggal, nama, qty, harga_total into b from bahan_masuk where baris_sheet = p_baris limit 1;
  if b.id is null or p_baris is null or p_baris < 2 then
    return json_build_object('ok', false, 'pesan', 'Baris stok masuk tidak ditemukan. Tekan Muat ulang.');
  end if;
  if lower(public._rapi(b.nama, 60)) <> lower(public._rapi(p_nama, 60)) or coalesce(to_char(b.tanggal, 'YYYY-MM-DD'), '') <> coalesce(p_tanggal, '') then
    return json_build_object('ok', false, 'pesan', 'Data stok masuk sudah berubah. Tekan Muat ulang lalu coba lagi.');
  end if;
  if coalesce(b.harga_total, 0) > 0 then return json_build_object('ok', false, 'pesan', 'Harga untuk stok masuk ini sudah diisi sebelumnya.'); end if;
  perform public._ubah_catat('bahan_masuk', b.id, array['harga_total', 'supplier', 'pengisi_harga']);
  update bahan_masuk set harga_total = round(h), supplier = v_supplier, pengisi_harga = 'form: ' || v_pengisi where id = b.id;
  insert into efek_antre (jenis, data) values ('kemasan_harga', jsonb_build_object('baris', p_baris, 'pengisi', v_pengisi,
    'asal', jsonb_build_object('e', '🏭', 'n', 'Staf Produksi', 'nama', v_pengisi)));
  q := coalesce(nullif(b.qty, 0), 1);
  v_nama := public._rapi(p_nama, 60);
  return json_build_object('ok', true, 'pesan', 'Harga tersimpan: ' || v_nama || ', Rp ' || public._gd_fmt(round(h)) || ' (Rp ' || public._gd_fmt(round(h) / q) || ' per satuan).');
end $$;
revoke all on function public.kemasan_harga_simpan(int, text, text, text, text, text) from public, anon;
grant execute on function public.kemasan_harga_simpan(int, text, text, text, text, text) to authenticated;
select 'ok109' as ok;
