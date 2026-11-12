-- 12 Nov 2026: Re-stock toko & consignment dibangun ulang (satu sumber hitungan untuk form toko dan Persetujuan Master Data).
-- 1) _gd_tersedia(): stok Gudang Utama yang masih bisa diminta = stok gudang - sisa order yang sudah disetujui tetapi belum dikirim.
-- 2) toko_restok_info(toko): per barang (dan per warna) -> stok gudang tersedia, terjual, rata-rata per bulan, saran robot
--    (supaya stok toko cukup paling lama 2 bulan), plus stok toko & rata-rata per kode. Rata-rata dihitung dari penjualan
--    paling lama 90 hari terakhir (toko yang datanya belum 90 hari: sejak penjualan pertama, minimal 30 hari).
-- 3) toko_simpan_order: jumlah request tidak boleh melebihi stok Gudang Utama yang tersedia.

create or replace function public._gd_tersedia()
 returns jsonb language sql stable security definer set search_path to 'public'
as $function$
  with pesan as (
    select btrim(no_order) no, split_part(upper(btrim(kode)), '-', 1) k,
           case when position('-' in btrim(kode)) > 0 then public._rapi_warna(substr(btrim(kode), position('-' in btrim(kode)) + 1)) else '' end w,
           sum(coalesce(qty, 0)) q
      from order_log where btrim(coalesce(status, '')) = 'Disetujui' and coalesce(btrim(no_order), '') <> '' group by 1, 2, 3
  ), kirim as (
    select split_part(coalesce(ref, ''), '|', 2) no, upper(public._rapi_spasi(kode, 30)) k, public._rapi_warna(warna) w, sum(coalesce(qty, 0)) q
      from gudang_log where public._rapi_spasi(jenis, 30) ~* '^keluar' and split_part(coalesce(ref, ''), '|', 2) in (select no from pesan) group by 1, 2, 3
  ), tahan as (
    select p.k || '|' || p.w kw, sum(greatest(0, p.q - coalesce(c.q, 0))) q
      from pesan p left join kirim c on c.no = p.no and c.k = p.k and c.w = p.w group by 1
  )
  select coalesce(jsonb_object_agg(s.key, greatest(0, (s.value)::numeric - coalesce(t.q, 0))), '{}'::jsonb)
    from jsonb_each_text(public._gd_stok()) s left join tahan t on t.kw = s.key;
$function$;

create or replace function public.toko_restok_info(p_toko text)
 returns json language plpgsql stable security definer set search_path to 'public'
as $function$
declare v_toko text := btrim(coalesce(p_toko, '')); hari int; awal date; kini date := (now() at time zone 'Asia/Makassar')::date;
  gd jsonb; v_items json; v_kode json;
begin
  if not (public._boleh_tulis_toko(v_toko) or public._boleh_peran(array['kendali_bisnis', 'gudang', 'purchasing_shopeepay'])) then
    return json_build_object('ok', false, 'pesan', 'Akses ditolak.');
  end if;
  select min(tanggal) into awal from toko_jual_log where btrim(toko) = v_toko and tanggal is not null and coalesce(qty_terjual, 0) > 0;
  hari := least(90, greatest(30, coalesce(kini - awal + 1, 30)));
  gd := public._gd_tersedia();
  with jual as (
    select split_part(upper(btrim(kode)), '-', 1) k,
           coalesce(nullif(public._rapi_warna(warna), ''),
                    case when position('-' in btrim(kode)) > 0 then public._rapi_warna(substr(btrim(kode), position('-' in btrim(kode)) + 1)) else '' end) w,
           sum(coalesce(qty_terjual, 0)) q
      from toko_jual_log where btrim(toko) = v_toko and tanggal is not null and tanggal > kini - hari group by 1, 2
  ), jk as (select k, sum(q) q from jual group by 1),
  st as (select kode k, qty q from public.toko_stok_hitung(v_toko)),
  brg as (select b.kode k, b.warna ws, coalesce(st.q, 0) s, coalesce(jk.q, 0) jq
            from public._barang_dasar_semua() b left join st on st.k = b.kode left join jk on jk.k = b.kode),
  -- kebutuhan per kode supaya stok toko cukup 2 bulan (60 hari)
  butuh as (select k, ws, s, jq, round(jq * 30.0 / hari, 1) rb, greatest(0, ceil(jq * 60.0 / hari) - greatest(s, 0)) perlu from brg),
  baris as (
    select u.k kunci, u.k, '' w, u.jq j, u.rb, u.perlu saran from butuh u where coalesce(cardinality(u.ws), 0) = 0
    union all
    select u.k || '-' || x.w, u.k, public._rapi_warna(x.w), coalesce(j.q, 0), round(coalesce(j.q, 0) * 30.0 / hari, 1),
           case when u.jq > 0 then ceil(u.perlu * coalesce(j.q, 0) / u.jq) else 0 end
      from butuh u cross join lateral unnest(u.ws) x(w) left join jual j on j.k = u.k and j.w = public._rapi_warna(x.w)
     where coalesce(cardinality(u.ws), 0) > 0
  )
  select json_object_agg(b.kunci, json_build_array(
           coalesce((gd ->> (b.k || '|' || b.w))::numeric, 0), b.j, b.rb,
           least(b.saran, coalesce((gd ->> (b.k || '|' || b.w))::numeric, 0)), b.saran)),
         (select json_object_agg(u.k, json_build_array(u.s, u.rb)) from butuh u where u.s <> 0 or u.jq <> 0)
    into v_items, v_kode from baris b;
  -- items: kunci -> [stok gudang tersedia, terjual dalam `hari`, rata-rata per bulan, saran (dibatasi stok gudang), kebutuhan 2 bulan]
  -- kode:  kode  -> [stok toko, rata-rata per bulan semua warna]
  return json_build_object('ok', true, 'toko', v_toko, 'hari', hari, 'target', 60, 'items', coalesce(v_items, '{}'::json), 'kode', coalesce(v_kode, '{}'::json));
end $function$;
grant execute on function public.toko_restok_info(text) to authenticated;

-- Request order: tidak boleh melebihi stok Gudang Utama yang tersedia
do $$
declare d text := pg_get_functiondef('public.toko_simpan_order'::regproc); a text; b text;
begin
  if position('_gd_tersedia' in d) > 0 then return; end if;
  a := 'dilihat text[] := ''{}''; isi jsonb := ''[]'';';
  b := 'dilihat text[] := ''{}''; isi jsonb := ''[]''; sedia jsonb := public._gd_tersedia(); ada numeric;';
  if position(a in d) = 0 then raise exception 'pola 1'; end if; d := replace(d, a, b);
  a := '    dilihat := dilihat || kode;';
  b := '    ada := coalesce((sedia ->> (dasar || ''|'' || coalesce(public._rapi_warna(w), '''')))::numeric, 0);
    if q > ada then
      return json_build_object(''ok'', false, ''pesan'', ''Stok Gudang Utama untuk '' || nm || '' tinggal '' || public._gd_fmt(ada) || '' pcs, jadi tidak bisa diminta '' || public._gd_fmt(q) || '' pcs. Kurangi jumlahnya.'');
    end if;
    dilihat := dilihat || kode;';
  if position(a in d) = 0 then raise exception 'pola 2'; end if; d := replace(d, a, b);
  execute d;
end $$;

-- 12 Nov 2026 (lanjutan): stok toko per warna, disamakan dengan Gudang Utama.
-- _toko_stok_warna(toko) dan toko_restok_info (elemen ke-6 = stok toko per barang/warna) versi akhir ada di file 206.
