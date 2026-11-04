-- 4 Nov 2026: "Terima" barang yang sudah dibayar Purchasing (ptrTerima) dipindah dari Apps Script ke aplikasi.
-- Fungsi ini = PTR_tandaiSaja_ (file 72): pengajuan ditandai Diterima tanpa mengubah stok sistem
-- (barang di luar stok sistem, barang jualan tanpa PO, botol/stiker yang tidak ada di daftar).
-- Cabang lain (PO gudang, bahan baku, botol & stiker) memakai fungsi yang sudah ada (gudang_terima_po, bbk_beli + bbk_sampai,
-- produksi_simpan_masuk), dirangkai di aplikasi (ptr.js).
create or replace function public.ptr_tandai_terima(p_app text, p_no text, p_qty text, p_ket text, p_nama text)
returns json language plpgsql security definer set search_path = public as $$
declare
  bg text := case p_app when 'gudang' then 'Gudang' when 'produksi' then 'Produksi' when 'bahanbaku' then 'Bahan Baku' end;
  boleh text[] := case p_app when 'gudang' then array['gudang', 'purchasing_shopeepay'] when 'produksi' then array['produksi'] when 'bahanbaku' then array['bahan_baku'] end;
  x record; q numeric; v_nama text := public._rapi_spasi(p_nama, 40); ket text := public._rapi_spasi(p_ket, 80);
  kini timestamptz := now(); jam text := to_char(now() at time zone 'Asia/Makassar', 'DD/MM/YYYY HH24:MI');
begin
  if bg is null or not public._boleh_peran(boleh) then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  if length(coalesce(v_nama, '')) < 2 then return json_build_object('ok', false, 'pesan', 'Isi nama penerima.'); end if;
  begin q := round(replace(btrim(coalesce(p_qty, '')), ',', '.')::numeric, 3); exception when others then q := null; end;
  if q is null or not (q > 0) or q > 1000000 then return json_build_object('ok', false, 'pesan', 'Isi jumlah yang diterima.'); end if;
  perform pg_advisory_xact_lock(hashtext('staf|pengadaan_ajuan'));
  select a.id, a.baris_sheet, btrim(a.no) no, public._rapi_spasi(a.nama, 120) n, public._rapi_spasi(a.satuan, 15) s,
         coalesce(nullif(public._rapi_spasi(a.status, 20), ''), 'Menunggu') st, coalesce(a.ref_po_supplier, '') ref, public._rapi_spasi(a.bagian, 40) bg
    into x from pengadaan_ajuan a where btrim(coalesce(a.no, '')) = btrim(coalesce(p_no, '')) order by a.baris_sheet nulls last, a.id limit 1;
  if x.id is null or x.bg <> bg then return json_build_object('ok', false, 'pesan', 'Pengajuan ' || coalesce(p_no, '') || ' tidak ada di daftar barang dibayar bagian ' || bg || '. Muat ulang.'); end if;
  if x.st = 'Diterima' then return json_build_object('ok', true, 'pesan', x.no || ' sudah ditandai diterima sebelumnya (tidak dicatat dua kali).'); end if;
  if x.st <> 'Dipesan' or x.ref not like 'Dibayar Viory%' or x.ref ~* 'Form (bahan baku|produksi)' then
    return json_build_object('ok', false, 'pesan', 'Pengajuan ' || x.no || ' tidak ada di daftar barang dibayar bagian ' || bg || '. Muat ulang.');
  end if;
  if x.baris_sheet is not null then perform public._ubah_catat('pengadaan_ajuan', x.id, array['status', 'ref_po_supplier', 'waktu_terima']); end if;
  update pengadaan_ajuan set status = 'Diterima',
    ref_po_supplier = left(x.ref || ' · diterima ' || public._gd_fmt(q) || ' ' || coalesce(x.s, '') || ' (' || coalesce(nullif(ket, ''), 'tanpa stok sistem') || ')', 300),
    waktu_terima = kini where id = x.id;
  insert into efek_antre (jenis, data) values ('tg', jsonb_build_object(
    'asal', jsonb_build_object('e', '📦', 'n', 'Staf ' || bg, 'nama', v_nama),
    'teks', '📦 <b>PENGAJUAN SUDAH DITERIMA</b>' || E'\n' || public._tg_esc(x.no || ' ' || coalesce(x.n, '')) || ' — diterima ' || public._tg_esc(public._gd_fmt(q)) || ' '
      || public._tg_esc(coalesce(x.s, '')) || ' (' || public._tg_esc(bg) || ', ' || public._tg_esc(coalesce(nullif(ket, ''), 'tanpa stok sistem')) || E').\n\n<i>' || jam || '</i>'));
  return json_build_object('ok', true, 'pesan', x.no || ' ditandai diterima.');
end $$;
revoke all on function public.ptr_tandai_terima(text, text, text, text, text) from public, anon;
grant execute on function public.ptr_tandai_terima(text, text, text, text, text) to authenticated;
