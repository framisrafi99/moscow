-- 184 (7 Nov 2026): barang hasil produksi (Moscow & Kenka, daftar katalog produksi) yang dibawa ke Kantor Packing
-- dicatat oleh staf produksi dari aplikasi Staf Produksi, bukan lagi oleh staf Gudang Utama.
--  * gudang_kirim: peran produksi boleh memakai fungsi ini, hanya untuk tujuan Kantor Packing dan hanya barang katalog produksi.
--  * Staf Gudang Utama / Purchasing tidak bisa lagi mencatat barang katalog produksi ke Kantor Packing (pesan mengarahkan ke staf produksi).
--  * produksi_stok_gu(): stok Gudang Utama langsung (bukan potret 30 menit) untuk barang katalog produksi + kiriman ke Kantor Packing terakhir.

create or replace function public._produk_produksi(p_kode text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from katalog where upper(btrim(kode)) = upper(btrim(coalesce(p_kode, ''))) and btrim(coalesce(kode, '')) <> '')
$$;
revoke all on function public._produk_produksi(text) from public, anon, authenticated;

do $$
declare d text := pg_get_functiondef('public.gudang_kirim'::regproc); a text; b text; c text;
begin
  if position('_produk_produksi' in d) > 0 then return; end if;
  a := $x$if not public._boleh_peran(array['gudang', 'purchasing_shopeepay']) then$x$;
  b := $x$  -- Order yang ditunggu (GD_orderTunggu_$x$;
  c := $x$'asal', jsonb_build_object('e', '📦', 'n', 'Gudang Utama', 'nama', nama),
    'p', jsonb_build_object('tujuan'$x$;
  if position(a in d) = 0 or position(b in d) = 0 or position(c in d) = 0 then raise exception 'gudang_kirim berubah, periksa manual'; end if;
  d := replace(d, a, $x$if not public._boleh_peran(array['gudang', 'purchasing_shopeepay', 'produksi']) then$x$);
  d := replace(d, b, $x$  -- 7 Nov 2026: barang katalog produksi ke Kantor Packing dicatat staf produksi.
  if peran = 'produksi' then
    if tujuan <> 'Kantor Packing' or no_order <> '' then
      return json_build_object('ok', false, 'pesan', 'Dari aplikasi Staf Produksi hanya bisa mencatat barang yang dibawa ke Kantor Packing.');
    end if;
    for x in select value from jsonb_array_elements(baris) loop
      if not public._produk_produksi(x ->> 'k') then
        return json_build_object('ok', false, 'pesan', (x ->> 'n') || ' bukan produk hasil produksi. Barang ini dicatat staf Gudang Utama.');
      end if;
    end loop;
  elsif tujuan = 'Kantor Packing' and peran <> 'manajemen' then
    for x in select value from jsonb_array_elements(baris) loop
      if public._produk_produksi(x ->> 'k') then
        return json_build_object('ok', false, 'pesan', (x ->> 'n') || ' adalah produk hasil produksi (Moscow / Kenka). Mulai 7 Nov 2026 yang dibawa ke Kantor Packing dicatat staf produksi dari aplikasi Staf Produksi, bukan dari Gudang Utama. Hapus baris ini lalu simpan lagi.');
      end if;
    end loop;
  end if;

$x$ || b);
  d := replace(d, c, $x$'asal', jsonb_build_object('e', case when peran = 'produksi' then '🏭' else '📦' end, 'n', case when peran = 'produksi' then 'Staf Produksi' else 'Gudang Utama' end, 'nama', nama),
    'p', jsonb_build_object('tujuan'$x$);
  execute d;
end $$;

-- Stok Gudang Utama sekarang (langsung dihitung) untuk barang katalog produksi, dan kiriman ke Kantor Packing 14 hari terakhir.
create or replace function public.produksi_stok_gu()
returns json language plpgsql stable security definer set search_path = public as $$
declare stok jsonb;
begin
  if not public._boleh_peran(array['produksi']) then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  stok := public._gd_stok();
  return json_build_object('ok', true,
    'waktu', to_char(now() at time zone 'Asia/Makassar', 'DD/MM/YYYY HH24:MI'),
    'hari', to_char(now() at time zone 'Asia/Makassar', 'YYYY-MM-DD'),
    'items', coalesce((
      select json_agg(json_build_object('k', b.kode, 'n', b.nama, 'kat', k.kat, 'w', to_json(b.warna),
               'stok', (select coalesce(jsonb_object_agg(split_part(s.key, '|', 2), s.value), '{}'::jsonb)
                          from jsonb_each(stok) s where split_part(s.key, '|', 1) = b.kode and (s.value)::numeric <> 0))
             order by k.urut)
        from (select distinct on (upper(btrim(kode))) upper(btrim(kode)) kode, btrim(coalesce(kategori, '')) kat, coalesce(baris_sheet, id::int) urut
                from katalog where btrim(coalesce(kode, '')) <> '' order by upper(btrim(kode)), baris_sheet nulls last, id) k
        join public._barang_dasar_semua() b on b.kode = k.kode), '[]'::json),
    'kirim', coalesce((
      select json_agg(json_build_object('t', g.tanggal, 'k', g.kode, 'n', g.nama_barang, 'w', coalesce(g.warna, ''), 'q', g.qty,
               'p', regexp_replace(coalesce(g.pengisi, ''), '^form:\s*', ''), 'sj', split_part(coalesce(g.ref, ''), '|', 1),
               'jam', to_char(g.waktu_masuk at time zone 'Asia/Makassar', 'HH24:MI')) order by g.waktu_masuk desc, g.id)
        from (select * from gudang_log where jenis = 'Keluar' and sumber_tujuan = 'Kantor Packing' and public._produk_produksi(kode)
                and tanggal >= ((now() at time zone 'Asia/Makassar')::date - 14) order by waktu_masuk desc, id limit 200) g), '[]'::json));
end $$;
revoke all on function public.produksi_stok_gu() from public, anon;
grant execute on function public.produksi_stok_gu() to authenticated;
