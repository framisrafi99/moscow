-- 117: Koreksi laporan penjualan toko (consignment + Toko Offline), 31 Okt 2026.
--  Staf toko mengajukan koreksi satu baris penjualan (qty, barang/warna, harga, diskon, ongkir) atau pembatalan baris
--  (dobel / salah input) dengan alasan. Baru berlaku setelah disetujui manajemen Moscow Supplies (Persetujuan Master Data).
--  Saat disetujui: baris toko_jual_log diubah (stok toko, omzet, bagi hasil ikut benar karena semuanya dihitung dari baris ini),
--  perubahan dicatat di ubah_antre supaya baris yang sama di sheet TOKO_JUAL_LOG ikut ditimpa (tulis balik Apps Script).
--  Baris yang dibatalkan tidak dihapus: qty & total jadi 0 dan pengisi diberi tanda "(DIBATALKAN KJ-...)"; isi lama tersimpan di sini.

create table if not exists public.toko_koreksi_jual (
  id bigint generated always as identity primary key,
  no text not null unique,
  waktu_ajuan timestamptz not null default now(),
  toko text not null,
  jual_id bigint not null,
  jenis text not null check (jenis in ('ubah', 'batal')),
  lama jsonb not null,
  baru jsonb,
  alasan text not null,
  pengaju text not null,
  email text,
  status text not null default 'Menunggu',
  waktu_keputusan timestamptz,
  catatan_manajemen text,
  oleh text,
  dibuat timestamptz not null default now()
);
create index if not exists toko_koreksi_jual_toko on public.toko_koreksi_jual (toko, id desc);
create index if not exists toko_koreksi_jual_tunggu on public.toko_koreksi_jual (jual_id) where status = 'Menunggu';
alter table public.toko_koreksi_jual enable row level security;
-- Tanpa policy: hanya bisa dibaca / ditulis lewat fungsi di bawah.
revoke all on public.toko_koreksi_jual from anon, authenticated;

-- Isi satu baris penjualan sebagai json ringkas (dipakai simpanan "lama" dan pembanding sebelum diubah).
create or replace function public._kj_baris(j public.toko_jual_log)
returns jsonb language sql immutable as $$
  select jsonb_build_object('id', j.id, 'tanggal', to_char(j.tanggal, 'YYYY-MM-DD'), 'kode', upper(btrim(coalesce(j.kode, ''))),
    'nama', coalesce(j.nama_barang, ''), 'warna', coalesce(nullif(btrim(j.warna), ''), ''), 'qty', coalesce(j.qty_terjual, 0),
    'harga', coalesce(j.harga_jual, 0), 'total', coalesce(j.total, 0), 'diskon', coalesce(j.diskon_persen, 0), 'ongkir', coalesce(j.ongkir, 0),
    'nota', coalesce(j.no_nota, ''), 'pengisi', coalesce(j.pengisi, ''), 'saluran', coalesce(j.saluran, ''), 'pembeli', coalesce(j.pembeli, ''));
$$;

-- Kolom yang menentukan isi baris (kalau salah satunya berubah sesudah diajukan, ajuan tidak boleh diterapkan).
create or replace function public._kj_kunci(x jsonb)
returns text language sql immutable as $$
  select concat_ws('|', x ->> 'kode', x ->> 'warna', (x ->> 'qty')::numeric, (x ->> 'harga')::numeric, (x ->> 'total')::numeric,
                   (x ->> 'diskon')::numeric, (x ->> 'ongkir')::numeric, x ->> 'pengisi');
$$;

-- ---------------------------------------------------------------------
-- Data untuk menu "Koreksi penjualan" di form toko.
-- p_hari: berapa hari ke belakang (7-62). Baris yang sudah dibatalkan tetap tampil (bertanda).
-- ---------------------------------------------------------------------
create or replace function public.toko_koreksi_data(p_toko text, p_hari int)
returns json language plpgsql stable security definer set search_path = public as $$
declare hari int := greatest(7, least(coalesce(p_hari, 14), 62)); dari date := (now() at time zone 'Asia/Makassar')::date - hari;
  baris jsonb; ajuan jsonb; barang jsonb;
begin
  if public._boleh_tulis_toko(p_toko) is not true then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  select coalesce(jsonb_agg(public._kj_baris(j) order by j.tanggal desc, j.id desc), '[]') into baris
    from toko_jual_log j where j.toko = p_toko and j.tanggal >= dari;
  select coalesce(jsonb_agg(jsonb_build_object('no', k.no, 'jual_id', k.jual_id, 'jenis', k.jenis, 'lama', k.lama, 'baru', k.baru,
           'alasan', k.alasan, 'pengaju', k.pengaju, 'status', k.status, 'waktu', to_char(k.waktu_ajuan at time zone 'Asia/Makassar', 'DD/MM/YYYY HH24:MI'),
           'putus', to_char(k.waktu_keputusan at time zone 'Asia/Makassar', 'DD/MM/YYYY HH24:MI'), 'catatan', k.catatan_manajemen) order by k.id desc), '[]')
    into ajuan from (select * from toko_koreksi_jual where toko = p_toko order by id desc limit 60) k;
  select coalesce(jsonb_agg(jsonb_build_object('k', b.kode, 'n', b.nama, 'h', b.harga, 'w', to_jsonb(b.warna)) order by b.kode), '[]')
    into barang from public._barang_dasar_semua() b;
  return json_build_object('ok', true, 'toko', p_toko, 'hari', hari, 'offline', public._toko_offline(p_toko),
    'baris', baris, 'ajuan', ajuan, 'barang', barang);
end $$;
revoke all on function public.toko_koreksi_data(text, int) from public, anon;
grant execute on function public.toko_koreksi_data(text, int) to authenticated;

-- ---------------------------------------------------------------------
-- Staf mengajukan koreksi. p_baru: {kode, warna, qty, harga, diskon, ongkir} (jenis 'ubah'); diabaikan untuk 'batal'.
-- ---------------------------------------------------------------------
create or replace function public.toko_koreksi_ajukan(p_toko text, p_jual_id bigint, p_jenis text, p_baru jsonb, p_alasan text, p_nama text, p_token text)
returns json language plpgsql volatile security definer set search_path = public as $$
declare j public.toko_jual_log; lama jsonb; baru jsonb; b record; kode text; w text; q numeric; h numeric; d numeric; o numeric;
  alasan text := public._rapi_baris_baru(p_alasan, 200); pengaju text := public._rapi_baris_baru(p_nama, 40);
  jenis text := lower(btrim(coalesce(p_jenis, ''))); awalan text; maks int; v_no text; kini timestamptz := now(); t text; beda text[] := '{}';
begin
  if public._boleh_tulis_toko(p_toko) is not true then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  if jenis not in ('ubah', 'batal') then return json_build_object('ok', false, 'pesan', 'Jenis koreksi tidak dikenal.'); end if;
  if pengaju = '' then return json_build_object('ok', false, 'pesan', 'Nama pengaju belum diisi.'); end if;
  if length(alasan) < 5 then return json_build_object('ok', false, 'pesan', 'Tulis alasan koreksinya (minimal 5 huruf).'); end if;
  perform pg_advisory_xact_lock(hashtext('toko|toko_koreksi_jual'));
  if coalesce(p_token, '') <> '' and exists (select 1 from toko_token where token = 'koreksi|' || left(p_token, 60)) then
    return json_build_object('ok', true, 'pesan', 'Ajuan ini sudah terkirim sebelumnya (tidak dicatat dua kali).');
  end if;
  select * into j from toko_jual_log where id = p_jual_id and toko = p_toko;
  if j.id is null then return json_build_object('ok', false, 'pesan', 'Baris penjualan tidak ditemukan. Tekan Muat ulang.'); end if;
  if j.tanggal < (now() at time zone 'Asia/Makassar')::date - 62 then
    return json_build_object('ok', false, 'pesan', 'Penjualan lebih dari 62 hari lalu tidak bisa dikoreksi dari form. Hubungi manajemen Moscow Supplies.');
  end if;
  if coalesce(j.pengisi, '') ~* 'DIBATALKAN' then return json_build_object('ok', false, 'pesan', 'Baris ini sudah dibatalkan sebelumnya.'); end if;
  if exists (select 1 from toko_koreksi_jual where jual_id = j.id and status = 'Menunggu') then
    return json_build_object('ok', false, 'pesan', 'Baris ini masih punya ajuan koreksi yang menunggu persetujuan.');
  end if;
  lama := public._kj_baris(j);

  if jenis = 'ubah' then
    if p_baru is null or jsonb_typeof(p_baru) <> 'object' then return json_build_object('ok', false, 'pesan', 'Isi koreksinya belum ada.'); end if;
    kode := upper(btrim(coalesce(p_baru ->> 'kode', lama ->> 'kode')));
    select * into b from public._barang_dasar(kode);
    if b.kode is null then return json_build_object('ok', false, 'pesan', 'Kode tidak dikenal: ' || kode); end if;
    w := upper(btrim(regexp_replace(coalesce(p_baru ->> 'warna', ''), '\s+', ' ', 'g')));
    if cardinality(b.warna) > 0 then
      if w = '' then return json_build_object('ok', false, 'pesan', 'Pilih warna untuk ' || b.nama || '.'); end if;
      if w <> 'LAINNYA' and not (w = any (b.warna)) then return json_build_object('ok', false, 'pesan', 'Warna ' || w || ' tidak ada di daftar ' || b.nama || '.'); end if;
    else w := ''; end if;
    q := public._qty_sah(p_baru ->> 'qty');
    if q is null then return json_build_object('ok', false, 'pesan', 'Jumlah terjual harus angka bulat minimal 1. Kalau barisnya mau dihapus, pilih "Batalkan baris".'); end if;
    begin h := nullif(btrim(coalesce(p_baru ->> 'harga', '')), '')::numeric; exception when others then h := -1; end;
    if h is null then h := case when kode = lama ->> 'kode' then (lama ->> 'harga')::numeric else b.harga end; end if;
    if h < 0 or h > 100000000 then return json_build_object('ok', false, 'pesan', 'Harga tidak valid.'); end if;
    begin d := coalesce(nullif(btrim(coalesce(p_baru ->> 'diskon', '')), '')::numeric, 0); exception when others then d := -1; end;
    if d < 0 or d > 100 then return json_build_object('ok', false, 'pesan', 'Diskon harus 0 sampai 100 persen.'); end if;
    begin o := coalesce(nullif(btrim(coalesce(p_baru ->> 'ongkir', '')), '')::numeric, 0); exception when others then o := -1; end;
    if o < 0 or o > 100000000 then return json_build_object('ok', false, 'pesan', 'Ongkir tidak valid.'); end if;
    baru := jsonb_build_object('kode', kode, 'nama', b.nama, 'warna', w, 'qty', q, 'harga', h, 'diskon', d, 'ongkir', o,
      'total', round(q * h * (1 - d / 100)));
    if kode <> lama ->> 'kode' or w <> lama ->> 'warna' then beda := beda || 'barang'; end if;
    if q <> (lama ->> 'qty')::numeric then beda := beda || 'qty'; end if;
    if h <> (lama ->> 'harga')::numeric then beda := beda || 'harga'; end if;
    if d <> (lama ->> 'diskon')::numeric then beda := beda || 'diskon'; end if;
    if o <> (lama ->> 'ongkir')::numeric then beda := beda || 'ongkir'; end if;
    if cardinality(beda) = 0 then return json_build_object('ok', false, 'pesan', 'Tidak ada yang berubah dari isi laporan sekarang.'); end if;
  end if;

  awalan := 'KJ-' || to_char(kini at time zone 'Asia/Makassar', 'YYMMDD') || '-';
  select coalesce(max(substring(substr(no, length(awalan) + 1) from '^\d+')::int), 0) into maks
    from toko_koreksi_jual where left(no, length(awalan)) = awalan;
  v_no := awalan || right('00' || (maks + 1)::text, 3);
  insert into toko_koreksi_jual (no, waktu_ajuan, toko, jual_id, jenis, lama, baru, alasan, pengaju, email)
  values (v_no, kini, p_toko, j.id, jenis, lama, baru, alasan, pengaju, lower(coalesce(auth.jwt() ->> 'email', '')));
  if coalesce(p_token, '') <> '' then insert into toko_token (token) values ('koreksi|' || left(p_token, 60)) on conflict do nothing; end if;

  t := '📝 <b>KOREKSI PENJUALAN DIAJUKAN</b> ' || v_no || E'\n' || public._tg_esc(p_toko) || ' · penjualan ' || to_char(j.tanggal, 'DD/MM/YYYY')
    || case when coalesce(j.no_nota, '') <> '' then ' · ' || public._tg_esc(j.no_nota) else '' end || E'\n'
    || 'Sekarang: ' || public._tg_esc((lama ->> 'nama') || case when lama ->> 'warna' <> '' then ' ' || (lama ->> 'warna') else '' end)
    || ' × ' || public._angka_teks((lama ->> 'qty')::numeric) || E'\n'
    || case when jenis = 'batal' then 'Diminta: <b>batalkan baris</b>'
            else 'Diminta: ' || public._tg_esc((baru ->> 'nama') || case when baru ->> 'warna' <> '' then ' ' || (baru ->> 'warna') else '' end)
              || ' × ' || public._angka_teks(q) || ' · total ' || public._angka_teks((baru ->> 'total')::numeric) end || E'\n'
    || 'Alasan: ' || public._tg_esc(alasan) || E'\nOleh: ' || public._tg_esc(pengaju)
    || E'\n\n<i>Setujui / tolak di Master Data › Persetujuan › Koreksi penjualan</i>';
  insert into efek_antre (jenis, data) values ('tg', jsonb_build_object('teks', t, 'asal', jsonb_build_object('e', '🏪', 'n', pengaju)));

  return json_build_object('ok', true, 'no', v_no, 'pesan', 'Ajuan ' || v_no || ' terkirim. Laporan belum berubah sampai disetujui manajemen Moscow Supplies.');
end $$;
revoke all on function public.toko_koreksi_ajukan(text, bigint, text, jsonb, text, text, text) from public, anon;
grant execute on function public.toko_koreksi_ajukan(text, bigint, text, jsonb, text, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- Daftar untuk Master Data › Persetujuan (manajemen).
-- ---------------------------------------------------------------------
create or replace function public.toko_koreksi_daftar()
returns json language plpgsql stable security definer set search_path = public as $$
declare tunggu jsonb; riwayat jsonb;
begin
  if (select public.peran_saya()) is distinct from 'manajemen' then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  select coalesce(jsonb_agg(jsonb_build_object('no', k.no, 'toko', k.toko, 'jenis', k.jenis, 'lama', k.lama, 'baru', k.baru, 'alasan', k.alasan,
           'pengaju', k.pengaju, 'waktu', to_char(k.waktu_ajuan at time zone 'Asia/Makassar', 'DD/MM/YYYY HH24:MI'),
           'berubah', (j.id is null or public._kj_kunci(public._kj_baris(j)) <> public._kj_kunci(k.lama))) order by k.id), '[]')
    into tunggu from toko_koreksi_jual k left join toko_jual_log j on j.id = k.jual_id where k.status = 'Menunggu';
  select coalesce(jsonb_agg(jsonb_build_object('no', k.no, 'toko', k.toko, 'jenis', k.jenis, 'lama', k.lama, 'baru', k.baru, 'alasan', k.alasan,
           'pengaju', k.pengaju, 'status', k.status, 'oleh', k.oleh, 'catatan', k.catatan_manajemen,
           'putus', to_char(k.waktu_keputusan at time zone 'Asia/Makassar', 'DD/MM/YYYY HH24:MI')) order by k.waktu_keputusan desc), '[]')
    into riwayat from (select * from toko_koreksi_jual where status <> 'Menunggu' order by waktu_keputusan desc limit 20) k;
  return json_build_object('ok', true, 'menunggu', jsonb_array_length(tunggu), 'tunggu', tunggu, 'riwayat', riwayat);
end $$;
revoke all on function public.toko_koreksi_daftar() from public, anon;
grant execute on function public.toko_koreksi_daftar() to authenticated;

-- ---------------------------------------------------------------------
-- Manajemen menyetujui / menolak satu ajuan.
-- ---------------------------------------------------------------------
create or replace function public.toko_koreksi_putus(p_no text, p_setuju boolean, p_catatan text)
returns json language plpgsql volatile security definer set search_path = public as $$
declare k public.toko_koreksi_jual; j public.toko_jual_log; setuju boolean := p_setuju is true; kini timestamptz := now();
  cat text := public._rapi_baris_baru(p_catatan, 160); v_oleh text := public._mgmt_nama(); ada numeric; butuh numeric; t text; nb jsonb;
begin
  if (select public.peran_saya()) is distinct from 'manajemen' then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  if not setuju and length(cat) < 3 then return json_build_object('ok', false, 'pesan', 'Isi alasan penolakan dulu.'); end if;
  perform pg_advisory_xact_lock(hashtext('toko|toko_koreksi_jual'));
  select * into k from toko_koreksi_jual where no = btrim(coalesce(p_no, ''));
  if k.id is null then return json_build_object('ok', false, 'pesan', 'Ajuan tidak ditemukan. Tekan Muat ulang.'); end if;
  if k.status <> 'Menunggu' then return json_build_object('ok', false, 'pesan', 'Ajuan ' || k.no || ' sudah diputuskan sebelumnya (' || k.status || ').'); end if;

  if setuju then
    perform pg_advisory_xact_lock(hashtext('toko_stok|' || k.toko));
    select * into j from toko_jual_log where id = k.jual_id for update;
    if j.id is null then return json_build_object('ok', false, 'pesan', 'Baris penjualannya sudah tidak ada. Tolak ajuan ini.'); end if;
    if public._kj_kunci(public._kj_baris(j)) <> public._kj_kunci(k.lama) then
      return json_build_object('ok', false, 'pesan', 'Baris penjualan ini sudah berubah sejak diajukan. Tolak ajuan ini lalu minta staf mengajukan ulang.');
    end if;
    nb := k.baru;
    if k.jenis = 'ubah' then
      -- Stok cukup? Hanya tambahan pemakaian (barang baru atau qty naik) yang diperiksa.
      butuh := (nb ->> 'qty')::numeric - case when nb ->> 'kode' = k.lama ->> 'kode' then (k.lama ->> 'qty')::numeric else 0 end;
      if butuh > 0 then
        select coalesce((select s.qty from public.toko_stok_hitung(k.toko) s where s.kode = nb ->> 'kode'), 0) into ada;
        if butuh > ada then
          return json_build_object('ok', false, 'pesan', 'Stok ' || (nb ->> 'nama') || ' di ' || k.toko || ' tinggal ' || public._angka_teks(ada)
            || ', koreksi ini butuh tambahan ' || public._angka_teks(butuh) || '. Cek stok toko dulu.');
        end if;
      end if;
    end if;
    if j.baris_sheet is not null then
      perform public._ubah_catat('toko_jual_log', j.id, case when k.jenis = 'batal' then array['qty_terjual', 'total', 'ongkir', 'pengisi']
        else array['kode', 'nama_barang', 'warna', 'qty_terjual', 'harga_jual', 'total', 'diskon_persen', 'ongkir'] end);
    end if;
    if k.jenis = 'batal' then
      update toko_jual_log set qty_terjual = 0, total = 0, ongkir = case when ongkir is null then null else 0 end,
             pengisi = left(coalesce(pengisi, '') || ' (DIBATALKAN ' || k.no || ')', 120)
       where id = j.id;
    else
      update toko_jual_log set kode = nb ->> 'kode', nama_barang = nb ->> 'nama', warna = nullif(nb ->> 'warna', ''),
             qty_terjual = (nb ->> 'qty')::numeric, harga_jual = (nb ->> 'harga')::numeric, total = (nb ->> 'total')::numeric,
             diskon_persen = case when (nb ->> 'diskon')::numeric = 0 and j.diskon_persen is null then null else (nb ->> 'diskon')::numeric end,
             ongkir = case when (nb ->> 'ongkir')::numeric = 0 and j.ongkir is null then null else (nb ->> 'ongkir')::numeric end
       where id = j.id;
    end if;
  end if;

  update toko_koreksi_jual set status = case when setuju then 'Disetujui' else 'Ditolak' end, waktu_keputusan = kini, catatan_manajemen = cat, oleh = v_oleh
   where id = k.id;

  t := case when setuju then '✅ <b>KOREKSI PENJUALAN DISETUJUI</b> ' else '❌ <b>KOREKSI PENJUALAN DITOLAK</b> ' end || k.no || E'\n'
    || public._tg_esc(k.toko) || ' · ' || public._tg_esc((k.lama ->> 'nama') || case when k.lama ->> 'warna' <> '' then ' ' || (k.lama ->> 'warna') else '' end)
    || case when k.jenis = 'batal' then ' (batalkan baris)' else '' end
    || case when setuju then E'\nLaporan penjualan dan stok toko sudah dibetulkan.' else E'\nLaporan tidak berubah.' end
    || E'\nOleh: ' || public._tg_esc(v_oleh) || case when cat <> '' then E'\nCatatan: ' || public._tg_esc(cat) else '' end;
  insert into efek_antre (jenis, data) values ('tg', jsonb_build_object('teks', t, 'asal', jsonb_build_object('e', '🔑', 'n', v_oleh)));

  return json_build_object('ok', true, 'pesan', case when setuju
    then k.no || ' disetujui. Laporan penjualan, stok toko, dan omzet sudah dibetulkan.'
    else k.no || ' ditolak. Laporan tidak berubah.' end);
end $$;
revoke all on function public.toko_koreksi_putus(text, boolean, text) from public, anon;
grant execute on function public.toko_koreksi_putus(text, boolean, text) to authenticated;
select 'ok117' as ok;
