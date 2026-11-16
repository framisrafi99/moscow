-- 210 · 16 Nov 2026 · Link order khusus: kategori tertentu saja + tanpa harga (daftar rencana order)
-- Pelanggan (reseller) bisa diberi:
--   kategori_boleh : hanya kategori ini yang tampil & boleh dipesan lewat link order-nya (null = semua barang)
--   tanpa_harga    : form tidak menampilkan harga (harga menyusul lewat penawaran). Di order_log harga jual resmi
--                    tetap tercatat untuk manajemen Moscow Supplies; yang disembunyikan hanya tampilan di form pelanggan.
-- Pelanggan lain tidak berubah.

alter table public.pelanggan add column if not exists tanpa_harga boolean not null default false;
alter table public.pelanggan add column if not exists kategori_boleh text[];

-- _order_pel: ikut mengembalikan th (tanpa harga) dan kb (kategori boleh)
do $do$
declare f text := pg_get_functiondef('public._order_pel(text)'::regprocedure); a text; b text;
begin
  if position('tanpa_harga' in f) > 0 then return; end if;
  a := E'btrim(kunci_link) kunci\n      into pel';
  b := E'''d'', case when pel.t = ''Reseller'' then pel.d else 0 end))';
  if position(a in f) = 0 or position(b in f) = 0 then raise exception '210: jangkar _order_pel tidak ditemukan'; end if;
  f := replace(f, a, E'btrim(kunci_link) kunci, coalesce(tanpa_harga, false) th, kategori_boleh kb\n      into pel');
  f := replace(f, b, E'''d'', case when pel.t = ''Reseller'' then pel.d else 0 end, ''th'', coalesce(pel.th, false), ''kb'', to_json(pel.kb)))');
  execute f;
end $do$;

-- order_halaman: saring kategori, kosongkan harga bila tanpa harga
create or replace function public.order_halaman(p_kunci text)
 returns json language plpgsql security definer set search_path to 'public'
as $function$
declare r json; th boolean; kb json; v_items json;
begin
  r := public._order_pel(p_kunci);
  if (r->>'ok')::boolean is not true then return r; end if;
  th := coalesce((r->'pelanggan'->>'th')::boolean, false);
  kb := r->'pelanggan'->'kb';
  v_items := public._barang_order_daftar();
  if th or coalesce(json_typeof(kb), '') = 'array' then
    select coalesce(json_agg(case when th then (x::jsonb || '{"harga":0}'::jsonb)::json else x end order by o), '[]'::json)
      into v_items
      from json_array_elements(v_items) with ordinality t(x, o)
     where coalesce(json_typeof(kb), '') <> 'array' or (x->>'kat') in (select json_array_elements_text(kb));
  end if;
  return json_build_object('ok', true, 'kunci', r->'kunci', 'pelanggan', r->'pelanggan',
    'tanggal', to_char(now() at time zone 'Asia/Makassar', 'YYYY-MM-DD'),
    'status', json_build_array('Menunggu', 'Disetujui', 'Dikirim', 'Selesai', 'Batal'), 'items', v_items);
end $function$;

-- order_kunci_simpan: tolak barang di luar kategori; tanpa harga = harga tidak dikembalikan ke form
do $do$
declare f text := pg_get_functiondef('public.order_kunci_simpan(text,text,text,text,jsonb,text)'::regprocedure);
  a1 text := 'nomor text; waktu timestamptz := now(); k text; lama text;';
  a2 text := E'pn := r->''pelanggan''->>''n''; disk := coalesce((r->''pelanggan''->>''d'')::numeric, 0);';
  a3 text := 'for it in select value from jsonb_array_elements(p_items) loop';
  a4 text := 'if kode = any (dilihat) then';
  a5 text := 'if not (b.harga > 0) then';
  a6 text := E'return json_build_object(''ok'', true,\n    ''pesan'', ''Order '' || nomor';
begin
  if position('v_kat' in f) > 0 then return; end if;
  if position(a1 in f) = 0 or position(a2 in f) = 0 or position(a3 in f) = 0 or position(a4 in f) = 0 or position(a5 in f) = 0 or position(a6 in f) = 0 then
    raise exception '210: jangkar order_kunci_simpan tidak ditemukan';
  end if;
  f := replace(f, a1, a1 || ' th boolean; kb json; v_kat text;');
  f := replace(f, a2, a2 || E' th := coalesce((r->''pelanggan''->>''th'')::boolean, false); kb := r->''pelanggan''->''kb'';');
  f := replace(f, a3, E'if th then catatan := left(''Rencana order, harga menyusul'' || case when catatan <> '''' then ''. '' || catatan else '''' end, 240); end if;\n  ' || a3);
  f := replace(f, a4, E'if coalesce(json_typeof(kb), '''') = ''array'' then\n      select coalesce(nullif(btrim(kategori), ''''), ''Lainnya'') into v_kat from barang_order bo where upper(btrim(bo.kode)) = dasar order by bo.baris_sheet nulls last, bo.id limit 1;\n      if v_kat is null or v_kat not in (select json_array_elements_text(kb)) then\n        return json_build_object(''ok'', false, ''pesan'', ''Barang ini tidak tersedia di link ini: '' || kode);\n      end if;\n    end if;\n    ' || a4);
  f := replace(f, a5, 'if not th and not (b.harga > 0) then');
  f := replace(f, a6, E'if th then\n    select coalesce(jsonb_agg(x || ''{"h":0,"s":0,"dd":0}''::jsonb order by o), ''[]''::jsonb) into isi from jsonb_array_elements(isi) with ordinality t(x, o);\n    sub := 0; nd := 0;\n  end if;\n  ' || a6);
  execute f;
end $do$;

-- order_kunci_riwayat: tanpa harga = nilai tidak ditampilkan di riwayat pelanggan
do $do$
declare f text := pg_get_functiondef('public.order_kunci_riwayat(text)'::regprocedure);
  a text := E'return json_build_object(''ok'', true, ''jumlah'', v_n';
begin
  if position('"tot":0' in f) > 0 then return; end if;
  if position(a in f) = 0 then raise exception '210: jangkar order_kunci_riwayat tidak ditemukan'; end if;
  f := replace(f, a, E'if coalesce((r->''pelanggan''->>''th'')::boolean, false) then\n    v_tot := 0;\n    select coalesce(json_agg((o::jsonb || ''{"sub":0,"disk":0,"tot":0}''::jsonb || jsonb_build_object(''items'',\n             (select coalesce(jsonb_agg(i || ''{"h":0,"s":0}''::jsonb), ''[]''::jsonb) from jsonb_array_elements(o::jsonb->''items'') i)))::json order by n), ''[]''::json)\n      into v_o from json_array_elements(v_o) with ordinality t(o, n);\n  end if;\n  ' || a);
  execute f;
end $do$;

insert into public.sql_terpasang (file, cara, catatan)
values ('210_order_kategori_tanpa_harga.sql', 'mcp', 'Link order khusus: kategori tertentu + tanpa harga')
on conflict do nothing;
