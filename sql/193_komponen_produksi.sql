-- 193 (9 Nov 2026): komponen produksi (BOM). Setiap Erwin melapor produksi, komponen per produk terpotong otomatis:
--   botol (bahan), packing (Seal Filler, amplop), bahan jerigen (bahan_baku, mis. Kenka Bond 0,1 liter / botol 100ml).
-- Stiker & heat shrink isinya per roll / lembar tidak pasti, jadi TIDAK dipotong per botol (cara 'roll'):
--   Erwin mencatat 1 roll / lembar setiap membuka yang baru; sistem menghitung rata-rata isi per roll dari produksi di antaranya.
-- Daftar komponen dikonfirmasi manajemen Moscow Supplies (Excel "Komponen Produksi Moscow Supplies", 9 Nov 2026).

create table if not exists public.produk_komponen (
  id bigint generated always as identity primary key,
  kode_produk text not null,
  bagian text not null,                 -- Botol / Stiker body depan / Stiker body belakang / Stiker tutup / Heat shrink / Packaging / Bahan jerigen
  sumber text not null check (sumber in ('bahan', 'packing', 'bahan_baku')),
  ref text not null,                    -- bahan.nama | packing_barang.id | bahan_baku.kode
  qty numeric not null default 1,
  cara text not null default 'per_produk' check (cara in ('per_produk', 'roll')),
  aktif boolean not null default true,
  catatan text,
  dibuat timestamptz not null default now()
);
alter table public.produk_komponen enable row level security;
create unique index if not exists produk_komponen_unik on public.produk_komponen (kode_produk, bagian, ref);

-- Barang baru: stiker tutup Finisher (Doff / Gloss), amplop Sole Protector.
insert into public.bahan (jenis, nama, kode, stok_awal, satuan)
select 'Stiker', v.n, v.k, 0, 'lembar' from (values ('ST35', 'ST35 - Stiker Tutup Doff'), ('ST36', 'ST36 - Stiker Tutup Gloss')) v(k, n)
where not exists (select 1 from public.bahan b where b.kode = v.k);
insert into public.packing_barang (nama, satuan, stok_awal, aktif, oleh, catatan)
select v.n, 'pcs', 0, true, 'manajemen', 'Untuk ' || v.p || ' (komponen produksi)'
  from (values ('Amplop Sole Protector size M', 'Sole Protector (M)'), ('Amplop Sole Protector size L', 'Sole Protector (L)')) v(n, p)
 where not exists (select 1 from public.packing_barang b where b.nama = v.n);

-- ---------- Isi daftar komponen ----------
create or replace function public._komp_isi(p_kode text, p_bagian text, p_sumber text, p_ref text, p_qty numeric, p_cara text)
returns void language sql as $$
  insert into public.produk_komponen (kode_produk, bagian, sumber, ref, qty, cara)
  values (p_kode, p_bagian, p_sumber, p_ref, p_qty, p_cara)
  on conflict (kode_produk, bagian, ref) do update set sumber = excluded.sumber, qty = excluded.qty, cara = excluded.cara, aktif = true
$$;

do $$
declare
  r record; bn text;
  pk_seal text := (select id::text from public.packing_barang where nama like 'Seal Filler%' limit 1);
  pk_am text := (select id::text from public.packing_barang where nama = 'Amplop Sole Protector size M');
  pk_al text := (select id::text from public.packing_barang where nama = 'Amplop Sole Protector size L');
begin
  -- kode, botol, stiker depan, stiker belakang, stiker tutup, heat shrink
  for r in select * from (values
    ('M01', 'BT11', 'ST26', null, 'ST27', 'PG5'), ('M02', 'BT2', 'ST2', null, 'ST27', null), ('M02N30', 'BT2', 'ST2', null, 'ST27', null),
    ('M02P30', 'BT2', 'ST2', null, 'ST27', null), ('M03', 'BT3', 'ST3', null, 'ST27', null), ('M03N60', 'BT3', 'ST3', null, 'ST27', null),
    ('M03P60', 'BT3', 'ST3', null, 'ST27', null), ('M04', 'BT1', 'ST1', null, 'ST27', null), ('M05', 'BT1', 'ST33', null, 'ST27', null),
    ('M06', 'BT11', 'ST34', null, 'ST27', null), ('M07', 'BT18', 'ST30', null, 'ST27', null), ('M07B', 'BT19', 'ST28', null, 'ST27', null),
    ('M07C', 'BT20', 'ST29', null, 'ST27', null), ('M08', 'BT2', 'ST13', null, 'ST35', null), ('M09', 'BT3', 'ST14', null, 'ST35', null),
    ('M10', 'BT2', 'ST13', null, 'ST36', null), ('M11', 'BT3', 'ST14', null, 'ST36', null),
    ('K001', 'BT6', 'ST10', null, null, 'PG2'), ('K001B', 'BT7', 'ST9', null, null, 'PG2'), ('K002', 'BT9', 'ST15', null, null, 'PG3'),
    ('K003', 'BT11', 'ST17', 'ST16', null, 'PG5'), ('K004', 'BT14', 'ST25', null, null, 'PG3'), ('K005', 'BT11', 'ST24', 'ST23', null, 'PG5'),
    ('K006', 'BT8', 'ST11', null, 'ST12', 'PG3'), ('K007', 'BT10', 'ST18', null, null, 'PG4'), ('K008', 'BT4', 'ST8', null, null, 'PG2'),
    ('K010', 'BT13', 'ST21', null, null, 'PG2'), ('K011', 'BT11', 'ST20', 'ST19', null, 'PG5'), ('K012', 'BT12', 'ST22', null, null, null),
    ('K013', 'BT15', 'ST4', null, 'ST5', 'PG3'), ('K014', 'BT16', 'ST6', null, 'ST7', 'PG3'), ('K017', 'BT5', 'ST32', null, null, 'PG2'),
    ('K018', 'BT17', 'ST31', null, null, 'PG4')
  ) v(k, bt, sd, sb, st, pg) loop
    select nama into bn from public.bahan where kode = r.bt; perform public._komp_isi(r.k, 'Botol', 'bahan', bn, 1, 'per_produk');
    select nama into bn from public.bahan where kode = r.sd; perform public._komp_isi(r.k, 'Stiker body depan', 'bahan', bn, 1, 'roll');
    if r.sb is not null then select nama into bn from public.bahan where kode = r.sb; perform public._komp_isi(r.k, 'Stiker body belakang', 'bahan', bn, 1, 'roll'); end if;
    if r.st is not null then select nama into bn from public.bahan where kode = r.st; perform public._komp_isi(r.k, 'Stiker tutup', 'bahan', bn, 1, 'roll'); end if;
    if r.pg is not null then select nama into bn from public.bahan where kode = r.pg; perform public._komp_isi(r.k, 'Heat shrink', 'bahan', bn, 1, 'roll'); end if;
  end loop;
  perform public._komp_isi('K006', 'Packaging', 'packing', pk_seal, 1, 'per_produk');
  perform public._komp_isi('K015', 'Packaging', 'packing', pk_am, 1, 'per_produk');
  perform public._komp_isi('K016', 'Packaging', 'packing', pk_al, 1, 'per_produk');
  perform public._komp_isi('K008', 'Bahan jerigen', 'bahan_baku', 'BK35', 0.1, 'per_produk');
end $$;

-- ---------- Pemotongan otomatis ----------
create or replace function public._komp_hapus(p_pl bigint)
returns void language plpgsql security definer set search_path = public as $$
declare tag text := '#PL' || p_pl;
begin
  delete from bahan_log where pengisi = 'otomatis (laporan produksi)' and catatan like '%' || tag;
  delete from bahan_baku_log where pengisi = 'otomatis (laporan produksi)' and catatan like '%' || tag;
  update packing_log set batal = true, batal_oleh = 'otomatis (laporan produksi diubah/dihapus)', batal_waktu = now()
   where oleh = 'otomatis (laporan produksi)' and not batal and catatan like '%' || tag;
end $$;

create or replace function public._komp_potong(p_pl bigint, p_tgl date, p_kode text, p_nama text, p_qty numeric)
returns void language plpgsql security definer set search_path = public as $$
declare k record; ket text := 'Otomatis: produksi ' || upper(p_kode) || ' ' || public._angka_teks(p_qty) || ' pcs #PL' || p_pl;
begin
  if coalesce(p_qty, 0) <= 0 then return; end if;
  for k in select * from produk_komponen where kode_produk = upper(btrim(p_kode)) and aktif and cara = 'per_produk' loop
    if k.sumber = 'bahan' then
      insert into bahan_log (tanggal, jenis, nama, qty, waktu_masuk, pengisi, catatan)
      select p_tgl, case when b.jenis ~* 'stik' then 'Stiker' else 'Botol' end, b.nama, p_qty * k.qty, now(), 'otomatis (laporan produksi)', ket
        from bahan b where b.nama = k.ref order by b.baris_sheet nulls last, b.id limit 1;
    elsif k.sumber = 'packing' then
      insert into packing_log (tanggal, jenis, barang_id, qty, pengambil, catatan, oleh)
      values (p_tgl, 'Keluar', k.ref::bigint, p_qty * k.qty, 'Produksi', ket, 'otomatis (laporan produksi)');
    else
      insert into bahan_baku_log (tanggal, jenis, kode, nama_bahan, qty, satuan, waktu_masuk, pengisi, catatan, untuk_produksi)
      select p_tgl, 'Terpakai', x.kode, x.nama_bahan, round(p_qty * k.qty, 3), x.satuan, now(), 'otomatis (laporan produksi)', ket, p_nama
        from bahan_baku x where upper(btrim(x.kode)) = k.ref order by x.baris_sheet nulls last, x.id limit 1;
    end if;
  end loop;
end $$;

create or replace function public._tg_produksi_komponen()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    -- hanya laporan baru dari aplikasi (bukan baris lama hasil salin Google Sheets), mulai 9 Nov 2026
    if new.baris_sheet is null and new.tanggal >= date '2026-11-09' then
      perform public._komp_potong(new.id, new.tanggal, new.kode, new.nama, new.qty);
    end if;
    return new;
  elsif tg_op = 'UPDATE' then
    if (new.qty, new.kode, new.tanggal) is distinct from (old.qty, old.kode, old.tanggal)
       and (exists (select 1 from bahan_log where pengisi = 'otomatis (laporan produksi)' and catatan like '%#PL' || old.id)
            or exists (select 1 from packing_log where oleh = 'otomatis (laporan produksi)' and not batal and catatan like '%#PL' || old.id)
            or exists (select 1 from bahan_baku_log where pengisi = 'otomatis (laporan produksi)' and catatan like '%#PL' || old.id)) then
      perform public._komp_hapus(old.id);
      perform public._komp_potong(new.id, new.tanggal, new.kode, new.nama, new.qty);
    end if;
    return new;
  else
    perform public._komp_hapus(old.id);
    return old;
  end if;
end $$;
drop trigger if exists produksi_log_komponen on public.produksi_log;
create trigger produksi_log_komponen after insert or update of qty, kode, tanggal or delete on public.produksi_log
  for each row execute function public._tg_produksi_komponen();

-- ---------- Laporan produksi: pesan berisi komponen yang terpotong ----------
do $$ begin
  if not exists (select 1 from pg_proc where proname = '_produksi_simpan_laporan_inti') then
    alter function public.produksi_simpan_laporan(text, text, text, text, jsonb, text) rename to _produksi_simpan_laporan_inti;
  end if;
end $$;
create or replace function public.produksi_simpan_laporan(p_jenis text, p_tanggal text, p_tujuan text, p_nama text, p_items jsonb, p_token text)
returns json language plpgsql security definer set search_path = public as $$
declare r jsonb; t text;
begin
  r := public._produksi_simpan_laporan_inti(p_jenis, p_tanggal, p_tujuan, p_nama, p_items, p_token)::jsonb;
  if coalesce((r ->> 'ok')::boolean, false) then
    select string_agg(x, ', ' order by x) into t from (
      select n || ' ' || public._angka_teks(sum(q)) x from (
        select regexp_replace(nama, '^\S+ - ', '') n, qty q from bahan_log where pengisi = 'otomatis (laporan produksi)' and dibuat = now()
        union all select b.nama, l.qty from packing_log l join packing_barang b on b.id = l.barang_id where l.oleh = 'otomatis (laporan produksi)' and l.waktu = now()
        union all select nama_bahan || ' (' || coalesce(satuan, '') || ')', qty from bahan_baku_log where pengisi = 'otomatis (laporan produksi)' and dibuat = now()
      ) z group by n) y;
    if t is not null then r := jsonb_set(r, '{pesan}', to_jsonb((r ->> 'pesan') || ' Komponen terpotong otomatis: ' || t || '.')); end if;
  end if;
  return r::json;
end $$;
revoke all on function public._produksi_simpan_laporan_inti(text, text, text, text, jsonb, text) from public, anon, authenticated;
revoke all on function public._komp_hapus(bigint) from public, anon, authenticated;
revoke all on function public._komp_potong(bigint, date, text, text, numeric) from public, anon, authenticated;
revoke all on function public._komp_isi(text, text, text, text, numeric, text) from public, anon, authenticated;
grant execute on function public.produksi_simpan_laporan(text, text, text, text, jsonb, text) to authenticated;

-- ---------- Pemakaian botol manual ditutup (botol terpotong otomatis); stiker & shrink = catat roll / lembar yang dibuka ----------
do $$ begin
  if not exists (select 1 from pg_proc where proname = '_produksi_simpan_bahan_inti') then
    alter function public.produksi_simpan_bahan(text, text, text, text, text, text, text) rename to _produksi_simpan_bahan_inti;
  end if;
end $$;
create or replace function public.produksi_simpan_bahan(p_tanggal text, p_jenis text, p_nama text, p_qty text, p_pengisi text, p_catatan text, p_token text)
returns json language plpgsql security definer set search_path = public as $$
begin
  if coalesce(p_jenis, '') = 'Botol' and exists (select 1 from produk_komponen k where k.aktif and k.cara = 'per_produk' and k.sumber = 'bahan'
       and lower(k.ref) = lower(btrim(regexp_replace(coalesce(p_nama, ''), '\s+', ' ', 'g')))) then
    return json_build_object('ok', false, 'pesan', 'Botol ini sudah terpotong otomatis setiap kamu melapor produksi, jadi tidak perlu dicatat lagi. Kalau ada botol rusak / pecah, catat di menu Rusak.');
  end if;
  return public._produksi_simpan_bahan_inti(p_tanggal, p_jenis, p_nama, p_qty, p_pengisi, p_catatan, p_token);
end $$;
revoke all on function public._produksi_simpan_bahan_inti(text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.produksi_simpan_bahan(text, text, text, text, text, text, text) to authenticated;

-- Packing: barang yang terpotong otomatis (Seal Filler, amplop) tidak dicatat keluar manual, kecuali rusak.
do $$ begin
  if not exists (select 1 from pg_proc where proname = '_packing_catat_inti') then
    alter function public.packing_catat(text, bigint, numeric, date, numeric, text, text, text) rename to _packing_catat_inti;
  end if;
end $$;
create or replace function public.packing_catat(p_jenis text, p_barang bigint, p_qty numeric, p_tanggal date, p_harga numeric, p_supplier text, p_pengambil text, p_catatan text)
returns json language plpgsql security definer set search_path = public as $$
begin
  if coalesce(p_jenis, '') ~* 'keluar' and coalesce(p_catatan, '') !~* 'rusak|pecah|buang'
     and exists (select 1 from produk_komponen k where k.aktif and k.cara = 'per_produk' and k.sumber = 'packing' and k.ref = p_barang::text) then
    return json_build_object('ok', false, 'pesan', 'Barang ini terpotong otomatis setiap ada laporan produksi, jadi tidak perlu dicatat keluar. Kalau rusak, tulis "rusak" di catatan.');
  end if;
  return public._packing_catat_inti(p_jenis, p_barang, p_qty, p_tanggal, p_harga, p_supplier, p_pengambil, p_catatan);
end $$;
revoke all on function public._packing_catat_inti(text, bigint, numeric, date, numeric, text, text, text) from public, anon, authenticated;
grant execute on function public.packing_catat(text, bigint, numeric, date, numeric, text, text, text) to authenticated;

-- ---------- Isi per roll / lembar stiker & heat shrink (dipelajari dari data) ----------
-- Setiap catatan pemakaian stiker / shrink = membuka roll / lembar baru. Isi 1 roll = produk yang memakai barang itu
-- di antara dua kali buka, dibagi jumlah roll yang dibuka pertama.
create or replace function public._komponen_isi_roll_data()
returns json language sql stable security definer set search_path = public as $$
  select coalesce((
    with it as (select distinct ref from produk_komponen where aktif and cara = 'roll' and sumber = 'bahan'),
    buka as (select l.nama, l.tanggal, sum(l.qty) q from bahan_log l join it on it.ref = l.nama where l.tanggal >= date '2026-09-01' group by 1, 2),
    urut as (select nama, tanggal, q, lead(tanggal) over (partition by nama order by tanggal) brk from buka),
    pakai as (select pl.tanggal, k.ref, sum(pl.qty * k.qty) n from produksi_log pl join produk_komponen k on k.kode_produk = upper(pl.kode) and k.aktif and k.cara = 'roll'
               where pl.tanggal >= date '2026-09-01' group by 1, 2),
    sel as (select u.nama, u.tanggal, u.q, u.brk,
                   (select coalesce(sum(n), 0) from pakai p where p.ref = u.nama and p.tanggal >= u.tanggal and (u.brk is null or p.tanggal < u.brk)) prod
              from urut u),
    ring as (select b.nama, b.satuan,
                    round(avg(s.prod / nullif(s.q, 0)) filter (where s.brk is not null and s.prod > 0)) isi,
                    count(*) filter (where s.brk is not null and s.prod > 0) n_sampel,
                    max(s.tanggal) buka_terakhir,
                    max(s.prod) filter (where s.brk is null) sejak_buka
               from bahan b join it on it.ref = b.nama left join sel s on s.nama = b.nama group by 1, 2)
    select json_agg(json_build_object('nama', nama, 'satuan', satuan, 'isi_rata', isi, 'sampel', n_sampel, 'buka_terakhir', buka_terakhir,
             'terpakai_sejak_buka', coalesce(sejak_buka, 0),
             'sisa_persen', case when isi > 0 then greatest(0, round(100 - 100.0 * coalesce(sejak_buka, 0) / isi)) end) order by nama) from ring), '[]')
$$;
revoke all on function public._komponen_isi_roll_data() from public, anon, authenticated;
create or replace function public.komponen_isi_roll()
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not public._boleh_peran(array['produksi', 'manajemen', 'kendali_bisnis', 'purchasing_shopeepay']) then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  return json_build_object('ok', true, 'data', public._komponen_isi_roll_data());
end $$;
revoke all on function public.komponen_isi_roll() from public, anon;
grant execute on function public.komponen_isi_roll() to authenticated;
