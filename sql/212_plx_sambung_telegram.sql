-- 212 (24 Nov 2026): Purchasing tidak lagi membuat catatan dobel dengan bukti Telegram.
-- Saat Viory menandai belanja lokal "sudah dibayar", sistem mencari catatan accounting dari Telegram (7 hari ke belakang,
-- 2 hari ke depan) yang nominalnya sama dengan sebagian / semua barang yang dibayar. Kalau ketemu, form menanyakan:
-- sambungkan ke catatan itu (tidak dicatat dua kali) atau catat sebagai belanja baru.
-- Pilihan dikirim per barang lewat p_items[].sambung = 'TR-xxxxxx-xxx' | 'baru'. Tanda tangan plx_bayar tidak berubah.

create or replace function public._plx_cari_telegram(p_rows jsonb, p_tanggal text)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare
  g record; c record; items jsonb; n int; mask int; best int; s numeric; bs numeric; i int;
  pakai_tr text[] := '{}'; pakai_no text[] := '{}'; nos text[]; hasil jsonb := '[]'; tgl date;
begin
  begin tgl := to_date(p_tanggal, 'YYYY-MM-DD'); exception when others then tgl := (now() at time zone 'Asia/Makassar')::date; end;
  for g in
    select q.kat, jsonb_agg(q.z order by q.o) its
      from (select z, o, case z ->> 'kel' when 'Barang jualan' then 'Pembelian barang dagang / impor' when 'Bahan baku' then 'Pembelian bahan baku'
                               when 'Botol & stiker' then 'Botol, stiker & kemasan' when 'Packaging & lainnya' then 'Botol, stiker & kemasan'
                               else 'Pembelian barang & bahan' end kat
              from jsonb_array_elements(p_rows) with ordinality e(z, o)) q
     group by q.kat
  loop
    for c in
      select a.no, a.tanggal, a.akun, a.nominal, a.keterangan
        from acc_log a
       where a.status = 'Aktif' and a.jenis = 'Keluar' and a.pengisi like 'telegram:%' and a.nominal >= 10000
         and coalesce(a.keterangan, '') !~ 'PG-[0-9]{6}-[0-9]{3}'
         and a.tanggal between tgl - 7 and tgl + 2
       order by abs(a.tanggal - tgl), a.id desc
       limit 30
    loop
      if c.no = any (pakai_tr) then continue; end if;
      select coalesce(jsonb_agg(z order by o), '[]') into items
        from jsonb_array_elements(g.its) with ordinality e(z, o) where not ((z ->> 'no') = any (pakai_no));
      n := least(jsonb_array_length(items), 10);
      if n = 0 then exit; end if;
      best := null; bs := null;
      for mask in 1 .. (1 << n) - 1 loop
        s := 0;
        for i in 0 .. n - 1 loop
          if ((mask >> i) & 1) = 1 then s := s + coalesce((items -> i ->> 'sub')::numeric, 0); end if;
        end loop;
        if abs(s - c.nominal) <= 1000 then best := mask; bs := s; exit; end if;
      end loop;
      if best is not null then
        nos := '{}';
        for i in 0 .. n - 1 loop
          if ((best >> i) & 1) = 1 then nos := nos || (items -> i ->> 'no'); end if;
        end loop;
        pakai_tr := pakai_tr || c.no; pakai_no := pakai_no || nos;
        hasil := hasil || jsonb_build_object('tr', c.no, 'tanggal', to_char(c.tanggal, 'YYYY-MM-DD'), 'akun', c.akun, 'nominal', c.nominal,
          'ket', left(regexp_replace(coalesce(c.keterangan, ''), '\s*\[Telegram:[^\]]*\]\s*$', ''), 140), 'nos', to_jsonb(nos), 'total', bs);
      end if;
    end loop;
  end loop;
  return hasil;
end $$;
revoke all on function public._plx_cari_telegram(jsonb, text) from public, anon, authenticated;

do $$
declare d text; asli text;
begin
  d := pg_get_functiondef('public._plx_bayar_inti(text,text,text,text,jsonb,text,text,text)'::regprocedure);
  asli := d;
  -- variabel tambahan
  if position('ulang int := 0; t_bayar timestamptz;' in d) = 0 then raise exception 'anchor deklarasi'; end if;
  d := replace(d, 'ulang int := 0; t_bayar timestamptz;',
    'ulang int := 0; t_bayar timestamptz; sb_saran jsonb; v_id bigint; v_bs bigint; v_nos text; v_kat text; v_akun text; v_sbsum numeric := 0; v_sbtr text[] := ''{}'';');
  -- pilihan sambung dibawa per barang
  if position($a$'alasan', case when jsonb_array_length(dobel) > 0 then alasan else '' end);$a$ in d) = 0 then raise exception 'anchor rows'; end if;
  d := replace(d, $a$'alasan', case when jsonb_array_length(dobel) > 0 then alasan else '' end);$a$,
    $a$'alasan', case when jsonb_array_length(dobel) > 0 then alasan else '' end,
      'sb', case when coalesce(m ->> 'sambung', '') ~ '^TR-[0-9]{6}-[0-9]{3}$' then m ->> 'sambung' else '' end);$a$);
  -- cari catatan Telegram sebelum membuat catatan accounting baru
  if position(E'  for r in select value from jsonb_array_elements(rows) loop\n    kat := case r ->> ''kel''' in d) = 0 then raise exception 'anchor kats'; end if;
  d := replace(d, E'  for r in select value from jsonb_array_elements(rows) loop\n    kat := case r ->> ''kel''',
$b$  -- 24 Nov 2026 (SQL 212): sambung ke catatan dari bukti Telegram supaya tidak tercatat dua kali.
  if coalesce(btrim(p_tr), '') = '' and coalesce(btrim(p_oleh), '') = '' then
    if not exists (select 1 from jsonb_array_elements(masuk) v2 where jsonb_typeof(v2) = 'object' and v2 ? 'sambung') then
      sb_saran := public._plx_cari_telegram(rows, p_tanggal);
      if jsonb_array_length(sb_saran) > 0 then
        return json_build_object('ok', false, 'sambung', sb_saran, 'pesan', 'Pembayaran ini sepertinya sudah tercatat dari bukti Telegram. Pilih: sambungkan atau catat baru.');
      end if;
    end if;
    for tr in select distinct z ->> 'sb' from jsonb_array_elements(rows) z where coalesce(z ->> 'sb', '') <> '' loop
      select a.id, a.baris_sheet, a.akun into v_id, v_bs, v_akun from acc_log a
       where a.no = tr and a.status = 'Aktif' and a.jenis = 'Keluar' and a.pengisi like 'telegram:%' and coalesce(a.keterangan, '') !~ 'PG-[0-9]{6}-[0-9]{3}'
       order by a.id desc limit 1;
      if v_id is null then
        return json_build_object('ok', false, 'pesan', 'Catatan ' || tr || ' tidak bisa disambungkan (sudah dibatalkan atau sudah tersambung). Muat ulang lalu coba lagi.');
      end if;
      select string_agg(z ->> 'no', ', ' order by o2), sum((z ->> 'sub')::numeric),
             min(case z ->> 'kel' when 'Barang jualan' then 'Pembelian barang dagang / impor' when 'Bahan baku' then 'Pembelian bahan baku'
                    when 'Botol & stiker' then 'Botol, stiker & kemasan' when 'Packaging & lainnya' then 'Botol, stiker & kemasan' else 'Pembelian barang & bahan' end)
        into v_nos, tot, v_kat
        from jsonb_array_elements(rows) with ordinality e(z, o2) where z ->> 'sb' = tr;
      if v_bs is not null then perform public._ubah_catat('acc_log', v_id, array['keterangan', 'kategori']); end if;
      update acc_log set keterangan = keterangan || ' (' || v_nos || '; disambungkan dengan Purchasing ' || v_oleh || ')', kategori = v_kat where id = v_id;
      trs := trs || tr; v_sbtr := v_sbtr || tr; v_sbsum := v_sbsum + tot;
      for r in select value from jsonb_array_elements(rows) loop
        if r ->> 'sb' = tr then per_tr := per_tr || jsonb_build_object(r ->> 'no', tr); end if;
      end loop;
      v_id := null;
    end loop;
  end if;
  for r in select value from jsonb_array_elements(rows) loop
    kat := case r ->> 'kel'$b$);
  -- barang yang disambungkan tidak ikut catatan baru
  if position('    if not (kat = any (kats)) then kats := kats || kat; end if;' in d) = 0 then raise exception 'anchor kats2'; end if;
  d := replace(d, '    if not (kat = any (kats)) then kats := kats || kat; end if;',
                  '    if coalesce(r ->> ''sb'', '''') = '''' and not (kat = any (kats)) then kats := kats || kat; end if;');
  if position(E'else ''Pembelian barang & bahan'' end = kat;\n    tr := coalesce(' in d) = 0 then raise exception 'anchor jumlah'; end if;
  d := replace(d, E'else ''Pembelian barang & bahan'' end = kat;\n    tr := coalesce(',
                  E'else ''Pembelian barang & bahan'' end = kat and coalesce(z ->> ''sb'', '''') = '''';\n    tr := coalesce(');
  if position(E'else ''Pembelian barang & bahan'' end) = kat then\n        per_tr' in d) = 0 then raise exception 'anchor per_tr'; end if;
  d := replace(d, E'else ''Pembelian barang & bahan'' end) = kat then\n        per_tr',
                  E'else ''Pembelian barang & bahan'' end) = kat and coalesce(r ->> ''sb'', '''') = '''' then\n        per_tr');
  -- kabar ke Viory
  if position($c$    || case when ulang > 0 then ' ' || ulang || ' belanja ulang dengan alasan dilaporkan ke grup.' else '' end$c$ in d) = 0 then raise exception 'anchor pesan'; end if;
  d := replace(d, $c$    || case when ulang > 0 then ' ' || ulang || ' belanja ulang dengan alasan dilaporkan ke grup.' else '' end$c$,
    $c$    || case when v_sbsum > 0 then ' Rp ' || public._gd_fmt(v_sbsum) || ' disambungkan ke catatan dari bukti Telegram (' || array_to_string(v_sbtr, ', ') || '), tidak dicatat dua kali.' else '' end
    || case when ulang > 0 then ' ' || ulang || ' belanja ulang dengan alasan dilaporkan ke grup.' else '' end$c$);
  if d = asli then raise exception 'tidak ada perubahan'; end if;
  execute d;
end $$;

insert into sql_terpasang (file, cara, catatan) values ('212_plx_sambung_telegram.sql', 'mcp', 'Purchasing menyambung ke catatan bukti Telegram (cegah dobel)');
