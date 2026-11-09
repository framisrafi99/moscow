-- 194 (9 Nov 2026): campur warna otomatis dari laporan produksi Erwin (Leather, Waterbased, Neon, Pastel).
-- Berat isi per botol ditimbang manajemen Moscow Supplies 9 Nov 2026 (gram). Resep per 1.000 g di bahan_warna.
-- Hasil: bahan dasar (bahan_warna_log.dasar_terpakai_gram) dan pigmen (bahan_baku_log Terpakai) terpotong otomatis.
-- Warna tanpa resep campur (Black, White, Brown) = bahan jadi langsung (mis. Leather Black, Waterbased Black) 100%.
-- Ronny tidak lagi mengisi "campur warna" untuk kelompok itu; pigment campuran & batch bahan dasar tetap diisi Ronny.

create table if not exists public.produk_berat (
  kode_produk text primary key,
  gram_per_pcs numeric not null,
  kelompok_warna text not null,          -- Leather / Waterbased / Neon / Pastel (kelompok di bahan_warna)
  catatan text,
  diubah timestamptz not null default now()
);
alter table public.produk_berat enable row level security;
insert into public.produk_berat (kode_produk, gram_per_pcs, kelompok_warna, catatan) values
  ('M02', 40, 'Leather', 'ditimbang 9 Nov (30ml)'), ('M02N30', 40, 'Neon', 'sama dengan Leather 30ml'), ('M02P30', 40, 'Pastel', 'sama dengan Leather 30ml'),
  ('M03', 90.8, 'Leather', 'ditimbang 9 Nov (60ml)'), ('M03N60', 90.8, 'Neon', 'sama dengan Leather 60ml'), ('M03P60', 90.8, 'Pastel', 'sama dengan Leather 60ml'),
  ('M04', 125, 'Leather', 'ditimbang 9 Nov (100ml)'), ('M01', 1250, 'Leather', 'perkiraan: 10 x Leather 100ml'),
  ('M05', 125, 'Waterbased', 'perkiraan: sama dengan Leather 100ml'), ('M06', 1250, 'Waterbased', 'perkiraan: 10 x Water Based 100ml')
on conflict (kode_produk) do update set gram_per_pcs = excluded.gram_per_pcs, kelompok_warna = excluded.kelompok_warna, catatan = excluded.catatan, diubah = now();
-- Finisher (belum dipotong otomatis, dicatat untuk nanti): Doff/Gloss 60ml 79 g, 30ml ±39,5 g.

create or replace function public._warna_potong(p_pl bigint, p_tgl date, p_kode text, p_warna text, p_qty numeric)
returns void language plpgsql security definer set search_path = public as $$
declare pb record; g numeric; tot numeric; f numeric; r record; jd record; pg record; ket text; pertama boolean := true; q numeric;
begin
  select * into pb from produk_berat where kode_produk = upper(btrim(p_kode));
  if pb.kode_produk is null or nullif(btrim(coalesce(p_warna, '')), '') is null or coalesce(p_qty, 0) <= 0 then return; end if;
  g := p_qty * pb.gram_per_pcs;
  ket := 'Otomatis: campur warna ' || initcap(p_warna) || ' ' || public._angka_teks(round(g)) || ' g dari produksi ' || upper(p_kode) || ' ' || public._angka_teks(p_qty) || ' pcs #PL' || p_pl;
  select sum(takaran_gram) into tot from bahan_warna where kelompok = pb.kelompok_warna and upper(btrim(nama_warna)) = upper(btrim(p_warna));
  if coalesce(tot, 0) <= 0 then
    -- tanpa resep: bahan jadi langsung, mis. "Leather Black" / "Waterbased Black"
    select kode, nama_bahan_jadi into jd from bahan_jadi
     where upper(nama_bahan_jadi) = upper(pb.kelompok_warna || ' ' || btrim(p_warna)) order by baris_sheet nulls last, id limit 1;
    if jd.kode is null then return; end if;
    insert into bahan_warna_log (tanggal, warna, hasil_gram, dasar, dasar_terpakai_gram, waktu_masuk, pengisi, catatan, kelompok)
    values (p_tgl, initcap(p_warna), round(g, 3), jd.nama_bahan_jadi, round(g, 3), now(), 'otomatis (laporan produksi)', ket, pb.kelompok_warna);
    return;
  end if;
  f := g / tot;
  for r in select * from bahan_warna where kelompok = pb.kelompok_warna and upper(btrim(nama_warna)) = upper(btrim(p_warna)) order by baris_sheet nulls last, id loop
    jd := null; pg := null;
    select kode, nama_bahan_jadi into jd from bahan_jadi where lower(btrim(nama_bahan_jadi)) = lower(btrim(r.bahan)) order by baris_sheet nulls last, id limit 1;
    if jd.kode is not null then
      insert into bahan_warna_log (tanggal, warna, hasil_gram, dasar, dasar_terpakai_gram, waktu_masuk, pengisi, catatan, kelompok)
      values (p_tgl, initcap(p_warna), case when pertama then round(g, 3) else 0 end, jd.nama_bahan_jadi, round(r.takaran_gram * f, 3), now(), 'otomatis (laporan produksi)', ket, pb.kelompok_warna);
      pertama := false;
    else
      select kode, nama_bahan, satuan, berat_per_liter_kg into pg from bahan_baku where lower(btrim(nama_bahan)) = lower(btrim(r.bahan)) order by baris_sheet nulls last, id limit 1;
      if pg.kode is null then continue; end if;
      q := public._bbk_konversi(r.takaran_gram * f, 'gram', coalesce(pg.satuan, 'gram'), case when coalesce(pg.berat_per_liter_kg, 0) > 0 then pg.berat_per_liter_kg else 1 end);
      if q is null then continue; end if;
      insert into bahan_baku_log (tanggal, jenis, kode, nama_bahan, qty, satuan, waktu_masuk, pengisi, catatan, untuk_produksi)
      values (p_tgl, 'Terpakai', pg.kode, pg.nama_bahan, round(q, 3), pg.satuan, now(), 'otomatis (laporan produksi)', ket, initcap(p_warna));
    end if;
  end loop;
  if pertama then  -- resep hanya pigmen: tetap catat hasil campur
    insert into bahan_warna_log (tanggal, warna, hasil_gram, dasar, dasar_terpakai_gram, waktu_masuk, pengisi, catatan, kelompok)
    values (p_tgl, initcap(p_warna), round(g, 3), '', 0, now(), 'otomatis (laporan produksi)', ket, pb.kelompok_warna);
  end if;
end $$;
revoke all on function public._warna_potong(bigint, date, text, text, numeric) from public, anon, authenticated;

-- Pemotongan komponen (193) diperluas: + campur warna; hapus juga baris warna otomatis.
create or replace function public._komp_hapus(p_pl bigint)
returns void language plpgsql security definer set search_path = public as $$
declare tag text := '#PL' || p_pl;
begin
  delete from bahan_log where pengisi = 'otomatis (laporan produksi)' and catatan like '%' || tag;
  delete from bahan_baku_log where pengisi = 'otomatis (laporan produksi)' and catatan like '%' || tag;
  delete from bahan_warna_log where pengisi = 'otomatis (laporan produksi)' and catatan like '%' || tag;
  update packing_log set batal = true, batal_oleh = 'otomatis (laporan produksi diubah/dihapus)', batal_waktu = now()
   where oleh = 'otomatis (laporan produksi)' and not batal and catatan like '%' || tag;
end $$;

create or replace function public._tg_produksi_komponen()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.baris_sheet is null and new.tanggal >= date '2026-11-09' then
      perform public._komp_potong(new.id, new.tanggal, new.kode, new.nama, new.qty);
      perform public._warna_potong(new.id, new.tanggal, new.kode, new.warna, new.qty);
    end if;
    return new;
  elsif tg_op = 'UPDATE' then
    if (new.qty, new.kode, new.tanggal, new.warna) is distinct from (old.qty, old.kode, old.tanggal, old.warna)
       and (exists (select 1 from bahan_log where pengisi = 'otomatis (laporan produksi)' and catatan like '%#PL' || old.id)
            or exists (select 1 from packing_log where oleh = 'otomatis (laporan produksi)' and not batal and catatan like '%#PL' || old.id)
            or exists (select 1 from bahan_baku_log where pengisi = 'otomatis (laporan produksi)' and catatan like '%#PL' || old.id)
            or exists (select 1 from bahan_warna_log where pengisi = 'otomatis (laporan produksi)' and catatan like '%#PL' || old.id)) then
      perform public._komp_hapus(old.id);
      perform public._komp_potong(new.id, new.tanggal, new.kode, new.nama, new.qty);
      perform public._warna_potong(new.id, new.tanggal, new.kode, new.warna, new.qty);
    end if;
    return new;
  else
    perform public._komp_hapus(old.id);
    return old;
  end if;
end $$;
drop trigger if exists produksi_log_komponen on public.produksi_log;
create trigger produksi_log_komponen after insert or update of qty, kode, tanggal, warna or delete on public.produksi_log
  for each row execute function public._tg_produksi_komponen();

-- Pesan laporan produksi: komponen + campur warna (gram) yang terpotong.
create or replace function public.produksi_simpan_laporan(p_jenis text, p_tanggal text, p_tujuan text, p_nama text, p_items jsonb, p_token text)
returns json language plpgsql security definer set search_path = public as $$
declare r jsonb; t text; w text;
begin
  r := public._produksi_simpan_laporan_inti(p_jenis, p_tanggal, p_tujuan, p_nama, p_items, p_token)::jsonb;
  if coalesce((r ->> 'ok')::boolean, false) then
    select string_agg(x, ', ' order by x) into t from (
      select n || ' ' || public._angka_teks(sum(q)) x from (
        select regexp_replace(nama, '^\S+ - ', '') n, qty q from bahan_log where pengisi = 'otomatis (laporan produksi)' and dibuat = now()
        union all select b.nama, l.qty from packing_log l join packing_barang b on b.id = l.barang_id where l.oleh = 'otomatis (laporan produksi)' and l.waktu = now()
        union all select nama_bahan || ' (' || coalesce(satuan, '') || ')', qty from bahan_baku_log
                   where pengisi = 'otomatis (laporan produksi)' and dibuat = now() and catatan not like 'Otomatis: campur warna%'
      ) z group by n) y;
    select string_agg(x, ', ' order by x) into w from (
      select kelompok || ' ' || warna || ' ' || public._angka_teks(round(sum(hasil_gram))) || ' g' x from bahan_warna_log
       where pengisi = 'otomatis (laporan produksi)' and dibuat = now() group by kelompok, warna) y;
    if t is not null then r := jsonb_set(r, '{pesan}', to_jsonb((r ->> 'pesan') || ' Komponen terpotong otomatis: ' || t || '.')); end if;
    if w is not null then r := jsonb_set(r, '{pesan}', to_jsonb((r ->> 'pesan') || ' Cat terpakai (bahan dasar & pigmen terpotong): ' || w || '.')); end if;
  end if;
  return r::json;
end $$;
revoke all on function public.produksi_simpan_laporan(text, text, text, text, jsonb, text) from public, anon;
grant execute on function public.produksi_simpan_laporan(text, text, text, text, jsonb, text) to authenticated;

-- Form Ronny: "campur warna" Leather / Waterbased / Neon / Pastel ditolak (sudah otomatis). Pigment campuran tetap boleh.
do $$ begin
  if not exists (select 1 from pg_proc where proname = '_bbk_simpan_baris_inti') then
    alter function public.bbk_simpan_baris(text, text, text, jsonb, jsonb, jsonb, text) rename to _bbk_simpan_baris_inti;
  end if;
end $$;
create or replace function public.bbk_simpan_baris(p_tanggal text, p_awalan text, p_token text, p_jadi jsonb, p_pakai jsonb, p_warna jsonb, p_pesan text)
returns json language plpgsql security definer set search_path = public as $$
begin
  if coalesce(p_awalan, '') = 'bbkwarna' and p_tanggal >= '2026-11-09' and jsonb_typeof(p_warna) = 'array'
     and exists (select 1 from jsonb_array_elements(p_warna) e where coalesce(e ->> 'kel', 'Leather') in ('Leather', 'Waterbased', 'Neon', 'Pastel')) then
    return json_build_object('ok', false, 'pesan', 'Campur warna Leather / Waterbased / Neon / Pastel sekarang tercatat otomatis dari laporan produksi (jumlah botol per warna), jadi tidak perlu diisi lagi. Pigment campuran dan pembuatan bahan dasar tetap diisi di sini.');
  end if;
  return public._bbk_simpan_baris_inti(p_tanggal, p_awalan, p_token, p_jadi, p_pakai, p_warna, p_pesan);
end $$;
revoke all on function public._bbk_simpan_baris_inti(text, text, text, jsonb, jsonb, jsonb, text) from public, anon, authenticated;
revoke all on function public.bbk_simpan_baris(text, text, text, jsonb, jsonb, jsonb, text) from public, anon;
grant execute on function public.bbk_simpan_baris(text, text, text, jsonb, jsonb, jsonb, text) to authenticated;
