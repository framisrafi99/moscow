-- 129: upload penjualan harian marketplace (mpUpload, file 38) langsung di Supabase.
--  Pemeriksaan sama persis dengan Apps Script: toko/platform dikenal, baris tanpa no pesanan / nama / qty / waktu dibuat dilewati,
--  pesanan yang sama (platform|no|nama|variasi) dalam satu kiriman hanya dihitung sekali, pesanan yang sudah ada hanya
--  diperbarui status, waktu kirim, waktu selesai, dan qty return; pesanan milik toko lain tidak disentuh (bentrok).
--  Baris baru ditulis balik ke sheet MP_PESANAN; baris lama yang berubah ditulis lewat ubah_antre.
--  Simpanan hitungan Apps Script dihapus lewat efek 'mp_cache'.

create or replace function public._mp_t(v text, n int)
returns text language sql immutable set search_path = '' as $$
  select left(btrim(regexp_replace(regexp_replace(coalesce(v, ''), '[\r\n\t]+', ' ', 'g'),
    '[\s   -     　﻿]+', ' ', 'g'), ' '), n)
$$;

create or replace function public._mp_n(v text)
returns numeric language sql immutable set search_path = '' as $$
  select case when btrim(coalesce(v, '')) ~ '^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d{1,3})?$' then btrim(v)::numeric else 0 end
$$;

-- MP_jamTeks_: teks 'yyyy-MM-dd HH:mm' (16 huruf pertama) -> waktu WITA.
create or replace function public._mp_waktu(v text)
returns timestamptz language plpgsql immutable set search_path = '' as $$
declare s text := left(public._mp_t(v, 20), 16); m text[];
begin
  m := regexp_match(s, '^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}):(\d{2}))?');
  if m is null then return null; end if;
  return ((m[1] || ' ' || coalesce(m[2], '00') || ':' || coalesce(m[3], '00'))::timestamp) at time zone 'Asia/Makassar';
exception when others then return null;
end $$;

create or replace function public.mp_upload(p_toko text, p_platform text, p_up text, p_rows jsonb)
returns json language plpgsql volatile security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_toko text := public._mp_t(p_toko, 40);
  v_pf text := public._mp_t(p_platform, 20);
  v_up text := public._mp_t(p_up, 40);
  kini timestamptz := date_trunc('minute', now());
  r record; x record; e jsonb;
  no text; st text; dib timestamptz; kir timestamptz; sel timestamptz; nm text; vr text;
  q numeric; ret numeric; ha numeric; hd numeric; sb numeric; k text;
  dilihat text[] := '{}';
  baru int := 0; ubah int := 0; sama int := 0; bentrok int := 0; lewat int := 0;
begin
  if (select public.peran_saya()) is distinct from 'manajemen' then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  if not ((v_toko = 'Consignment Medan' and v_pf in ('Shopee', 'Tokopedia')) or (v_toko = 'Consignment Sidoarjo' and v_pf = 'Shopee')
          or (v_toko = 'Official' and v_pf in ('Shopee', 'Tokopedia', 'Lazada'))) then
    return json_build_object('ok', false, 'pesan', 'Toko / platform tidak dikenal.');
  end if;
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) = 0 then
    return json_build_object('ok', false, 'pesan', 'Tidak ada baris yang dikirim.');
  end if;
  if jsonb_array_length(p_rows) > 3000 then return json_build_object('ok', false, 'pesan', 'Potongan data terlalu besar.'); end if;
  perform pg_advisory_xact_lock(hashtext('mp|mp_pesanan'));

  for e in select value from jsonb_array_elements(p_rows) loop
    if jsonb_typeof(e) <> 'array' then lewat := lewat + 1; continue; end if;
    no := public._mp_t(e ->> 0, 40); st := public._mp_t(e ->> 1, 160);
    dib := public._mp_waktu(e ->> 2); kir := public._mp_waktu(e ->> 3); sel := public._mp_waktu(e ->> 4);
    nm := public._mp_t(e ->> 5, 250); vr := public._mp_t(e ->> 6, 120);
    q := round(public._mp_n(e ->> 7)); ret := greatest(0, round(public._mp_n(e ->> 8)));
    ha := public._mp_n(e ->> 9); hd := public._mp_n(e ->> 10); sb := public._mp_n(e ->> 11);
    if no = '' or nm = '' or not (q > 0) or dib is null then lewat := lewat + 1; continue; end if;
    k := upper(v_pf || '|' || no || '|' || nm || '|' || vr);
    if k = any(dilihat) then continue; end if;
    dilihat := dilihat || k;
    select id, baris_sheet bs, toko t, status s, waktu_kirim wk, waktu_selesai ws, qty_return qr into x
      from mp_pesanan where kunci = k order by baris_sheet desc nulls first, id desc limit 1;
    if x.id is null then
      insert into mp_pesanan (kunci, toko, platform, no_pesanan, status, waktu_dibuat, waktu_kirim, waktu_selesai, nama_produk, variasi,
                              qty, qty_return, harga_awal, harga_setelah_diskon, subtotal, upload, waktu_upload)
      values (k, v_toko, v_pf, no, nullif(st, ''), dib, kir, sel, nm, nullif(vr, ''), q, ret, ha, hd, sb, nullif(v_up, ''), kini);
      baru := baru + 1;
      continue;
    end if;
    if public._mp_t(x.t, 40) <> v_toko then bentrok := bentrok + 1; continue; end if;
    if coalesce(public._mp_t(x.s, 160), '') = st and x.wk is not distinct from kir and x.ws is not distinct from sel
       and coalesce(x.qr, 0) = ret then
      sama := sama + 1; continue;
    end if;
    if x.bs is not null then
      perform public._ubah_catat('mp_pesanan', x.id, array['status', 'waktu_kirim', 'waktu_selesai', 'qty_return']);
    end if;
    update mp_pesanan set status = nullif(st, ''), waktu_kirim = kir, waktu_selesai = sel, qty_return = ret where id = x.id;
    ubah := ubah + 1;
  end loop;

  if baru > 0 or ubah > 0 then
    insert into efek_antre (jenis, data) values ('mp_cache', jsonb_build_object('toko', v_toko));
  end if;
  return json_build_object('ok', true, 'baru', baru, 'ubah', ubah, 'sama', sama, 'bentrok', bentrok, 'lewat', lewat);
end $$;
revoke all on function public.mp_upload(text, text, text, jsonb) from public, anon;
grant execute on function public.mp_upload(text, text, text, jsonb) to authenticated;

do $x$
declare d text;
begin
  d := pg_get_functiondef('public.tulis_balik_tandai(text, jsonb)'::regprocedure);
  if position('''mp_pesanan''' in d) = 0 then
    d := replace(d, '''po_biaya''', '''po_biaya'', ''mp_pesanan''');
    execute d;
  end if;
end $x$;
select position('''mp_pesanan''' in pg_get_functiondef('public.tulis_balik_tandai(text, jsonb)'::regprocedure)) > 0 as ok129;
