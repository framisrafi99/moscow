-- 178 (6 Nov 2026): Purchasing - pengajuan yang sudah dibayar orang lain (Junior / Mike / manajemen) dan SUDAH tercatat di accounting
-- cukup ditautkan ke transaksinya: status pengajuan jadi dibayar, TIDAK ada uang keluar baru.

-- Daftar transaksi pengeluaran 45 hari terakhir yang bisa dipilih.
create or replace function public.plx_tercatat_daftar()
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not public._boleh_peran(array['purchasing_shopeepay', 'manajemen']) then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  return json_build_object('ok', true, 'data', coalesce((
    select json_agg(json_build_object('no', btrim(a.no), 't', a.tanggal, 'akun', a.akun, 'kat', a.kategori, 'v', a.nominal,
             'ket', left(coalesce(a.keterangan, ''), 140), 'oleh', public._plx_pembayar(a.pengisi, a.keterangan)) order by a.tanggal desc, a.no desc)
      from acc_log a
     where a.status = 'Aktif' and a.jenis = 'Keluar' and a.tanggal >= (now() at time zone 'Asia/Makassar')::date - 45
       and a.akun in ('Rekening Belanja', 'Rekening PT', 'ShopeePay', 'Kas Tunai')
       and coalesce(a.kategori, '') in ('Pembelian bahan baku', 'Botol, stiker & kemasan', 'Pembelian barang dagang / impor', 'Perlengkapan & ATK', 'Pembelian aset / peralatan', 'Biaya lain-lain')), '[]'::json));
end $$;

-- Siapa yang membayar, dari pengisi / tanda di keterangan.
create or replace function public._plx_pembayar(p_pengisi text, p_ket text)
returns text language sql immutable set search_path = '' as $$
  select coalesce(
    nullif(btrim(substring(coalesce(p_ket, '') from '\[(?:Telegram|WA Admin Moscow): ([^\]]+)\]')), ''),
    nullif(btrim(regexp_replace(coalesce(p_pengisi, ''), '^(telegram|purchasing):\s*', '', 'i')), ''), '-')
$$;

create or replace function public.plx_bayar_tercatat(p_tr text, p_toko text, p_nama text, p_items jsonb, p_token text)
returns json language plpgsql volatile security definer set search_path = public as $$
declare a record; res jsonb; siapa text; n text;
begin
  if not public._boleh_peran(array['purchasing_shopeepay', 'manajemen']) then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  select btrim(no) no, akun, tanggal, nominal, pengisi, keterangan, jenis, status into a from acc_log where btrim(no) = btrim(coalesce(p_tr, '')) limit 1;
  if a.no is null or a.status <> 'Aktif' or a.jenis <> 'Keluar' then return json_build_object('ok', false, 'pesan', 'Pilih transaksi accounting yang masih aktif.'); end if;
  siapa := public._plx_pembayar(a.pengisi, a.keterangan);
  if siapa = 'pemilik' then siapa := 'manajemen Moscow Supplies'; end if;
  res := public._plx_bayar_inti(coalesce(nullif(btrim(p_toko), ''), 'Toko (tercatat ' || a.no || ')'), a.akun, to_char(a.tanggal, 'YYYY-MM-DD'), p_nama,
           p_items, 'tc' || coalesce(p_token, ''), null, a.no)::jsonb;
  if res ? 'perluAlasan' or not coalesce((res ->> 'ok')::boolean, false) then return res::json; end if;
  -- tandai siapa yang membayar di keterangan pengajuan
  for n in select btrim(z ->> 'no') from jsonb_array_elements(p_items) z loop
    update pengadaan_ajuan set ref_po_supplier = ref_po_supplier || ' · dibayar ' || siapa || ' (' || a.no || ')'
     where no = n and ref_po_supplier like 'Dibayar Viory%' and position(a.no in ref_po_supplier) = 0;
  end loop;
  return json_build_object('ok', true, 'pesan', jsonb_array_length(p_items) || ' barang ditandai sudah dibayar ' || siapa || ', tertaut ke ' || a.no || '. Tidak ada uang keluar baru di accounting.');
end $$;
revoke all on function public.plx_tercatat_daftar() from public, anon;
revoke all on function public.plx_bayar_tercatat(text, text, text, jsonb, text) from public, anon;
grant execute on function public.plx_tercatat_daftar() to authenticated;
grant execute on function public.plx_bayar_tercatat(text, text, text, jsonb, text) to authenticated;
