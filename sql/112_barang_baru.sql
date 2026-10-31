-- 112: sheet BARANG_BARU (barang jualan baru yang menunggu harga jual, file 73) ikut disinkron ke Supabase, dan
--  halaman Mike › HPP & Harga › isi harga jual barang baru (bbrSimpan) langsung di Supabase:
--  barang masuk BARANG_ORDER (tulis balik), baris BARANG_BARU jadi 'Lengkap' (ubah_antre), Telegram lewat efek 'tg'.
create table if not exists public.barang_baru (
  id bigint generated always as identity primary key,
  baris_sheet int unique,
  kode text, nama text, warna text, tanggal date, pengajuan text, diajukan text, harga_beli numeric, qty numeric, toko text, po text,
  status text, harga_jual numeric, kategori text, diisi_oleh text, waktu_diisi timestamptz,
  dibuat timestamptz not null default now(), sidik text
);
alter table public.barang_baru enable row level security;
revoke all on public.barang_baru from anon, authenticated;

create or replace function public.bbr_simpan(p_k text, p_harga text, p_kat text, p_token text)
returns json language plpgsql volatile security definer set search_path = public as $$
#variable_conflict use_column
declare peran text := (select public.peran_saya()); oleh text; v_kode text := upper(public._kb_t(p_k, 20)); h numeric; kat text := public._kb_t(p_kat, 60);
  b record; r record; v_warna text; kini timestamptz := now(); n int := 0;
begin
  if not public._boleh_peran(array['kendali_bisnis']) then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  oleh := case when peran = 'kendali_bisnis' then 'Mike' else 'Manajemen Moscow Supplies' end;
  begin
    h := round(replace(replace(btrim(coalesce(p_harga, '')), '.', ''), ',', '.')::numeric);
  exception when others then h := null;
  end;
  if h is null or not (h >= 1) or h > 1000000000 then return json_build_object('ok', false, 'pesan', 'Isi harga jual (angka lebih dari 0).'); end if;
  if length(kat) < 2 then return json_build_object('ok', false, 'pesan', 'Pilih / tulis kategori barang.'); end if;
  perform pg_advisory_xact_lock(hashtext('staf|barang_order'));
  if coalesce(p_token, '') <> '' and exists (select 1 from toko_token where token = 'gdbbr|' || left(public._kb_t(p_token, 60), 60)) then
    return json_build_object('ok', true, 'ulang', true, 'pesan', 'Data ini sudah tersimpan sebelumnya (tidak dicatat dua kali).');
  end if;
  -- BBR_baca_: baris yang masih menunggu harga jual (urut sheet).
  select id, public._kb_t(nama, 120) n into b from barang_baru
   where public._kb_t(kode, 20) = v_kode and public._kb_t(status, 30) = 'Menunggu harga jual' order by baris_sheet nulls last, id limit 1;
  if b.id is null then return json_build_object('ok', false, 'pesan', 'Barang ' || v_kode || ' sudah dilengkapi atau tidak ditemukan. Muat ulang.'); end if;
  if not exists (select 1 from public._barang_dasar_semua() d where upper(d.kode) = v_kode) then
    select string_agg(w, ', ' order by u) into v_warna from (
      select distinct on (w) w, u from (
        select public._kb_t(warna, 30) w, row_number() over (order by baris_sheet nulls last, id) u from barang_baru
         where public._kb_t(kode, 20) = v_kode and public._kb_t(status, 30) = 'Menunggu harga jual') z where w <> '' order by w, u) y;
    insert into barang_order (kode, nama_barang, harga_jual, kategori, varian_warna) values (v_kode, b.n, h, kat, nullif(coalesce(v_warna, ''), ''));
  end if;
  for r in select id, baris_sheet from barang_baru where public._kb_t(kode, 20) = v_kode and public._kb_t(status, 30) = 'Menunggu harga jual' loop
    if r.baris_sheet is not null then perform public._ubah_catat('barang_baru', r.id, array['status', 'harga_jual', 'kategori', 'diisi_oleh', 'waktu_diisi']); end if;
    update barang_baru set status = 'Lengkap', harga_jual = h, kategori = kat, diisi_oleh = oleh, waktu_diisi = kini where id = r.id;
  end loop;
  if coalesce(p_token, '') <> '' then insert into toko_token (token) values ('gdbbr|' || left(public._kb_t(p_token, 60), 60)) on conflict do nothing; end if;
  insert into efek_antre (jenis, data) values ('tg', jsonb_build_object(
    'asal', case when peran = 'kendali_bisnis' then jsonb_build_object('e', '👤', 'n', 'Mike', 'nama', '') else jsonb_build_object('e', '🔑', 'n', 'Manajemen Moscow Supplies', 'nama', '') end,
    'teks', '✅ <b>HARGA JUAL BARANG BARU DITETAPKAN</b>' || E'\n' || public._tg_esc(v_kode || ' · ' || b.n) || E'\nHarga jual: <b>Rp ' || public._gd_fmt(h) || '</b> · '
      || public._tg_esc(kat) || E'\nOleh: ' || public._tg_esc(oleh) || E'\nBarang sudah masuk daftar barang dan bisa dijual.\n\n<i>'
      || to_char(kini at time zone 'Asia/Makassar', 'DD/MM/YYYY HH24:MI') || '</i>'));
  return json_build_object('ok', true, 'pesan', b.n || ' (' || v_kode || ') masuk daftar barang dengan harga jual Rp ' || public._gd_fmt(h) || ' (' || kat || ').');
end $$;
revoke all on function public.bbr_simpan(text, text, text, text) from public, anon;
grant execute on function public.bbr_simpan(text, text, text, text) to authenticated;
select 'ok112' as ok;
