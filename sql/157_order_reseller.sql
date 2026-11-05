-- 5 Nov 2026: form order reseller pindah dari Apps Script ke aplikasi (order.html), tanpa akun:
-- reseller masuk dengan kode 8 huruf (kolom pelanggan.kunci_link), atau link order.html?k=<kode>.
-- Pengganti cekKodeReseller / simpanOrder / riwayatOrder / tambahPelanggan (Apps Script file 00).

create table if not exists public.order_kode_salah (id bigint generated always as identity primary key, waktu timestamptz not null default now());
alter table public.order_kode_salah enable row level security;
revoke all on public.order_kode_salah from anon, authenticated;

-- Pelanggan pemilik kunci/kode itu. Kode salah dicatat; 20 kali salah dalam 10 menit = dikunci 10 menit (sama dengan Apps Script).
create or replace function public._order_pel(p_kunci text)
 returns json language plpgsql security definer set search_path to 'public'
as $function$
declare k text := lower(btrim(coalesce(p_kunci, ''))); pel record; salah int;
begin
  select count(*) into salah from order_kode_salah where waktu > now() - interval '10 minutes';
  if salah >= 20 then return json_build_object('ok', false, 'pesan', 'Terlalu banyak percobaan kode yang salah. Coba lagi 10 menit lagi.'); end if;
  if length(k) >= 8 and length(k) <= 64 then
    select nama_pelanggan n, case when coalesce(tipe, '') ~* 'resel|putus' then 'Reseller' else 'Consignment' end t,
           coalesce(diskon_persen, 0) d, btrim(kunci_link) kunci
      into pel from pelanggan where lower(btrim(coalesce(kunci_link, ''))) = k order by baris_sheet nulls last, id limit 1;
  end if;
  if pel.n is null then
    delete from order_kode_salah where waktu < now() - interval '1 day';
    insert into order_kode_salah default values;
    return json_build_object('ok', false, 'pesan', 'Kode tidak dikenal. Periksa lagi, atau hubungi Moscow Supplies.');
  end if;
  if pel.t <> 'Reseller' then
    return json_build_object('ok', false, 'toko', true, 'pesan', 'Ini kunci toko consignment. Order re-stock toko sekarang lewat aplikasi Moscow (masuk dengan akun toko).');
  end if;
  return json_build_object('ok', true, 'kunci', pel.kunci, 'pelanggan', json_build_object('n', pel.n, 't', pel.t, 'd', case when pel.t = 'Reseller' then pel.d else 0 end));
end $function$;

-- Layar masuk: tukar kode dengan nama & diskon reseller.
create or replace function public.order_masuk(p_kode text)
 returns json language sql security definer set search_path to 'public'
as $$ select public._order_pel(p_kode) $$;

-- Data halaman order: pelanggan, tanggal hari ini (WITA), status, daftar barang (satu baris per kode dasar, w = pilihan warna).
create or replace function public.order_halaman(p_kunci text)
 returns json language plpgsql security definer set search_path to 'public'
as $function$
declare r json; items json;
begin
  r := public._order_pel(p_kunci);
  if (r->>'ok')::boolean is not true then return r; end if;
  with b as (
    select distinct on (upper(btrim(kode))) upper(btrim(kode)) kode, btrim(coalesce(nama_barang, '')) nama,
           case when harga_jual is null or harga_jual < 0 then 0 else harga_jual end harga,
           coalesce(nullif(btrim(kategori), ''), 'Lainnya') kat, varian_warna, baris_sheet, id
      from barang_order
     where btrim(coalesce(kode, '')) <> '' and position('-' in btrim(kode)) = 0
     order by upper(btrim(kode)), baris_sheet nulls last, id
  )
  select coalesce(json_agg(json_build_object('kode', b.kode, 'nama', b.nama, 'harga', b.harga, 'kat', b.kat,
           'w', coalesce((select json_agg(w order by u) from (
                    select w, min(o) u from (
                      select upper(btrim(regexp_replace(replace(v, '-', ' '), '\s+', ' ', 'g'))) w, o
                        from unnest(string_to_array(coalesce(b.varian_warna, ''), ',')) with ordinality as t(v, o)) z
                     where w not in ('', 'LAINNYA') group by w) y), '[]'::json))
         order by b.baris_sheet nulls last, b.id), '[]'::json)
    into items from b;
  return json_build_object('ok', true, 'kunci', r->'kunci', 'pelanggan', r->'pelanggan',
    'tanggal', to_char(now() at time zone 'Asia/Makassar', 'YYYY-MM-DD'),
    'status', json_build_array('Menunggu', 'Disetujui', 'Dikirim', 'Selesai', 'Batal'), 'items', items);
end $function$;

-- Simpan order reseller: harga dari daftar barang order, diskon dari kontrak pelanggan (bukan dari formulir), anti dobel lewat token.
create or replace function public.order_kunci_simpan(p_kunci text, p_tanggal text, p_nama text, p_catatan text, p_items jsonb, p_token text)
 returns json language plpgsql security definer set search_path to 'public'
as $function$
declare
  r json; pn text; disk numeric; d date; selisih numeric; nama text; catatan text;
  it jsonb; kode text; q numeric; b record; dasar text; w text; nm text; s numeric; dd numeric;
  dilihat text[] := '{}'; isi jsonb := '[]'; sub numeric := 0; nd numeric := 0; nomor text; waktu timestamptz := now(); k text; lama text;
begin
  r := public._order_pel(p_kunci);
  if (r->>'ok')::boolean is not true then return r; end if;
  pn := r->'pelanggan'->>'n'; disk := coalesce((r->'pelanggan'->>'d')::numeric, 0);

  if coalesce(p_tanggal, '') !~ '^\d{4}-\d{2}-\d{2}$' then return json_build_object('ok', false, 'pesan', 'Tanggal tidak valid.'); end if;
  begin d := to_date(p_tanggal, 'YYYY-MM-DD'); exception when others then return json_build_object('ok', false, 'pesan', 'Tanggal tidak valid.'); end;
  if to_char(d, 'YYYY-MM-DD') <> p_tanggal then return json_build_object('ok', false, 'pesan', 'Tanggal tidak valid.'); end if;
  selisih := extract(epoch from ((d::timestamp at time zone 'Asia/Makassar') - now())) / 86400;
  if selisih > 31 then return json_build_object('ok', false, 'pesan', 'Tanggal terlalu jauh di masa depan. Periksa lagi.'); end if;
  if selisih < -400 then return json_build_object('ok', false, 'pesan', 'Tanggal terlalu lama. Periksa lagi tahunnya.'); end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    return json_build_object('ok', false, 'pesan', 'Tidak ada barang yang diisi.');
  end if;
  if jsonb_array_length(p_items) > 100 then return json_build_object('ok', false, 'pesan', 'Terlalu banyak barang dalam satu order.'); end if;
  nama := left(btrim(regexp_replace(coalesce(p_nama, ''), '[\r\n]+', ' ', 'g')), 40);
  catatan := left(btrim(regexp_replace(coalesce(p_catatan, ''), '[\r\n]+', ' ', 'g')), 200);

  for it in select value from jsonb_array_elements(p_items) loop
    kode := upper(btrim(coalesce(case when jsonb_typeof(it) = 'object' then it ->> 'kode' end, '')));
    dasar := split_part(kode, '-', 1);
    w := case when position('-' in kode) > 0 then substr(kode, position('-' in kode) + 1) end;
    select * into b from public._barang_dasar(dasar);
    if b.kode is null or kode = '' or (w is null and cardinality(b.warna) > 0) or (w is not null and not (w = any (b.warna))) then
      return json_build_object('ok', false, 'pesan', 'Kode tidak dikenal: ' || kode);
    end if;
    if kode = any (dilihat) then return json_build_object('ok', false, 'pesan', 'Kode muncul dua kali: ' || kode); end if;
    q := public._qty_sah(case when jsonb_typeof(it) = 'object' then it ->> 'qty' end);
    if q is null then return json_build_object('ok', false, 'pesan', 'Jumlah tidak valid untuk ' || kode); end if;
    nm := case when w is null then b.nama else b.nama || ' - ' || w end;
    if not (b.harga > 0) then return json_build_object('ok', false, 'pesan', 'Harga ' || nm || ' belum tersedia, barang ini belum bisa dipesan.'); end if;
    dilihat := dilihat || kode;
    s := q * b.harga; dd := round(s * disk / 100); sub := sub + s; nd := nd + dd;
    isi := isi || jsonb_build_object('k', kode, 'n', nm, 'q', q, 'h', b.harga, 's', s, 'dd', dd);
  end loop;

  perform pg_advisory_xact_lock(hashtext('toko|order_log'));
  if coalesce(p_token, '') <> '' then
    k := 'order|' || left(p_token, 60) || '|';
    select substr(token, length(k) + 1) into lama from toko_token where left(token, length(k)) = k limit 1;
    if lama is not null then
      return json_build_object('ok', true, 'ganda', true, 'pesan', 'Order ini sudah tersimpan sebelumnya dengan nomor ' || lama || ' (tidak dicatat dua kali).');
    end if;
  end if;
  nomor := public._nomor_order(d);
  insert into order_log (no_order, tanggal, pelanggan, tipe, kode, nama, qty, harga, diskon_persen, subtotal, nilai_diskon, total,
                         status, waktu_masuk, pengisi, catatan)
  select nomor, d, pn, 'Reseller', x ->> 'k', x ->> 'n', (x ->> 'q')::numeric, (x ->> 'h')::numeric, disk, (x ->> 's')::numeric,
         (x ->> 'dd')::numeric, (x ->> 's')::numeric - (x ->> 'dd')::numeric,
         'Menunggu', waktu, case when nama <> '' then 'form: ' || nama else 'form' end, nullif(catatan, '')
    from jsonb_array_elements(isi) with ordinality t(x, o) order by o;
  if coalesce(p_token, '') <> '' then insert into toko_token (token) values (k || nomor) on conflict do nothing; end if;
  -- Telegram REQUEST ORDER BARU + catatan robot (sama dengan order toko).
  perform public._rp_tg_masuk_d(jsonb_build_object(
    'asal', jsonb_build_object('e', '🛍️', 'n', pn, 'nama', case when length(nama) >= 2 then nama else '' end),
    'order', jsonb_build_object('no', nomor, 't', p_tanggal, 'pl', pn, 'tp', 'Reseller', 'd', disk, 'sub', sub, 'disk', nd,
      'tot', sub - nd, 'st', 'Menunggu', 'p', nama, 'c', catatan, 'items', isi)));
  return json_build_object('ok', true,
    'pesan', 'Order ' || nomor || ' untuk ' || pn || ' tersimpan (' || jsonb_array_length(isi) || ' barang).',
    'order', json_build_object('no', nomor, 't', p_tanggal, 'pl', pn, 'tp', 'Reseller', 'd', disk, 'sub', sub, 'disk', nd, 'tot', sub - nd,
      'st', 'Menunggu', 'p', nama, 'c', catatan, 'items', isi));
end $function$;

-- Riwayat order milik pemilik kode itu saja (terbaru dulu, paling banyak 200).
create or replace function public.order_kunci_riwayat(p_kunci text)
 returns json language plpgsql security definer set search_path to 'public'
as $function$
declare r json; pn text; v_o json; v_n int; v_tot numeric; v_semua int;
begin
  r := public._order_pel(p_kunci);
  if (r->>'ok')::boolean is not true then return r; end if;
  pn := r->'pelanggan'->>'n';
  with x as (
    select btrim(no_order) no, tanggal, coalesce(nullif(btrim(status), ''), 'Menunggu') st, waktu_masuk, pengisi, catatan, diskon_persen,
           kode, nama, qty, harga, subtotal, nilai_diskon, total, baris_sheet, id
      from order_log where btrim(pelanggan) = pn and coalesce(btrim(no_order), '') <> '' and tanggal is not null
  ), per as (
    select no, min(tanggal) t, (array_agg(st order by baris_sheet nulls last, id))[1] st, max(waktu_masuk) ms,
           (array_agg(coalesce(pengisi, '') order by baris_sheet nulls last, id))[1] p, (array_agg(coalesce(catatan, '') order by baris_sheet nulls last, id))[1] c,
           max(coalesce(diskon_persen, 0)) d, sum(coalesce(subtotal, 0)) sub, sum(coalesce(nilai_diskon, 0)) disk, sum(coalesce(total, 0)) tot,
           json_agg(json_build_object('k', kode, 'n', nama, 'q', coalesce(qty, 0), 'h', coalesce(harga, 0), 's', coalesce(subtotal, 0)) order by baris_sheet nulls last, id) items
      from x group by no
  )
  select count(*) filter (where st <> 'Batal'), coalesce(sum(tot) filter (where st <> 'Batal'), 0), count(*),
         coalesce((select json_agg(z) from (select json_build_object('no', no, 't', to_char(t, 'YYYY-MM-DD'), 'pl', pn, 'tp', 'Reseller', 'd', d,
            'sub', sub, 'disk', disk, 'tot', tot, 'st', st, 'p', regexp_replace(p, '^form:?\s*', ''), 'c', c, 'items', items) z
            from per order by t desc, ms desc nulls last limit 200) q), '[]'::json)
    into v_n, v_tot, v_semua, v_o from per;
  return json_build_object('ok', true, 'jumlah', v_n, 'total', v_tot, 'orders', v_o, 'terpotong', v_semua > 200,
    'diperbarui', to_char(now() at time zone 'Asia/Makassar', 'DD/MM/YYYY HH24:MI'));
end $function$;

-- Manajemen: tambah pelanggan (Reseller dengan kode masuk 8 huruf, atau Consignment). Link order langsung ke aplikasi.
create or replace function public.pelanggan_tambah(p_nama text, p_tipe text, p_diskon numeric)
 returns json language plpgsql security definer set search_path to 'public'
as $function$
declare nama text := left(btrim(regexp_replace(coalesce(p_nama, ''), '\s+', ' ', 'g')), 60); tipe text; d numeric := 0; k text; huruf text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i int;
begin
  if (select public.peran_saya()) is distinct from 'manajemen' then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  if length(nama) < 2 then return json_build_object('ok', false, 'pesan', 'Nama pelanggan belum diisi.'); end if;
  tipe := case when p_tipe = 'Reseller' then 'Reseller' when p_tipe = 'Consignment' then 'Consignment' end;
  if tipe is null then return json_build_object('ok', false, 'pesan', 'Pilih tipe pelanggan.'); end if;
  if tipe = 'Reseller' then
    d := coalesce(p_diskon, 0);
    if d <> 0 and not (d = any (array[15, 20, 25, 35]::numeric[])) then return json_build_object('ok', false, 'pesan', 'Pilih diskon: 15, 20, 25, 35 persen, atau tanpa diskon.'); end if;
  end if;
  perform pg_advisory_xact_lock(hashtext('pelanggan'));
  if exists (select 1 from pelanggan where lower(btrim(nama_pelanggan)) = lower(nama)) then
    return json_build_object('ok', false, 'pesan', 'Nama "' || nama || '" sudah ada di daftar pelanggan.');
  end if;
  loop
    if tipe = 'Consignment' then k := left(replace(gen_random_uuid()::text, '-', ''), 16);
    else k := ''; for i in 1..8 loop k := k || substr(huruf, 1 + floor(random() * 32)::int, 1); end loop; end if;
    exit when not exists (select 1 from pelanggan where lower(btrim(coalesce(kunci_link, ''))) = lower(k));
  end loop;
  insert into pelanggan (nama_pelanggan, tipe, diskon_persen, kunci_link, link_order)
  values (nama, tipe, case when tipe = 'Reseller' then d end, k,
          case when tipe = 'Reseller' then 'https://app.moscowsupplies.com/order.html?k=' || k else 'https://app.moscowsupplies.com/consignment.html' end);
  return json_build_object('ok', true, 'pesan', nama || ' ditambahkan sebagai ' || tipe || '.' ||
    case when tipe = 'Reseller' then ' Kode masuk: ' || k || '.' else ' Buatkan akun toko di Akses & perangkat supaya stafnya bisa masuk aplikasi.' end,
    'kode', case when tipe = 'Reseller' then k end);
end $function$;

revoke all on function public._order_pel(text) from public, anon, authenticated;
revoke all on function public.order_masuk(text), public.order_halaman(text), public.order_kunci_riwayat(text),
  public.order_kunci_simpan(text, text, text, text, jsonb, text), public.pelanggan_tambah(text, text, numeric) from public;
grant execute on function public.order_masuk(text), public.order_halaman(text), public.order_kunci_riwayat(text),
  public.order_kunci_simpan(text, text, text, text, jsonb, text) to anon, authenticated;
grant execute on function public.pelanggan_tambah(text, text, numeric) to authenticated;

-- Sesudah uji (5 Nov 2026):
-- * order_kunci_riwayat: variabel diganti v_n/v_tot/v_semua/v_o (bentrok dengan kolom CTE).
-- * _order_tg_reseller(o jsonb): Telegram "🛍️ ORDER RESELLER BARU" (barang × harga, subtotal, diskon, total); dipanggil order_kunci_simpan
--   menggantikan _rp_tg_masuk_d (teks "pindah stok" hanya untuk consignment). Definisi lengkap: pg_get_functiondef('public._order_tg_reseller(jsonb)'::regprocedure).
-- * _rp_tg_masuk: warna tidak ditulis dua kali bila nama barang sudah berakhiran warna ("Leather Paint - BLACK BLACK").
-- * pelanggan.link_order diganti ke aplikasi: reseller order.html?k=<kode>, consignment consignment.html.
