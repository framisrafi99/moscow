-- 232 (27 Nov 2026): Kendali Bisnis tahap 1.
--  a. Bukti biaya impor dari Telegram (ongkir cargo, bill kedua, pajak & bea masuk) bisa dimasukkan ke biaya PO impor
--     tanpa uang keluar baru -> ikut dihitung ke HPP (po_biaya + efek kb_biaya, sama dengan kb_bayar_lanjut).
--  b. Bukti yang bukan untuk PO bisa disembunyikan dari kotak (tetap ada riwayatnya: impor_bukti_abaikan).
--  c. Kotak Mike menampilkan PO impor yang sudah dibayar > 30 hari tapi belum diterima.
--  d. Pencegah dobel untuk DP di form Mike (kb_impor_bayar): tolak kalau DP-nya sudah tercatat dari bukti Telegram.
--  e. Laporan pagi: PO berstatus Dibayar > 30 hari belum diterima ikut dilaporkan (sebelumnya hanya "Dikirim supplier").

create table if not exists public.impor_bukti_abaikan (
  tr text primary key, alasan text, oleh text, waktu timestamptz not null default now()
);
alter table public.impor_bukti_abaikan enable row level security;

create or replace function public._impor_tr_terpakai(p_tr text) returns boolean
language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from po_log where public._rapi_spasi(asal, 20) = 'Impor' and position(btrim(p_tr) in coalesce(no_transaksi, '')) > 0)
      or exists (select 1 from pengadaan_ajuan where position('(' || btrim(p_tr) || ')' in coalesce(ref_po_supplier, '')) > 0)
      or exists (select 1 from pengadaan_ajuan where position(btrim(p_tr) in coalesce(ref_po_supplier, '')) > 0 and status in ('Dipesan', 'Diterima'))
      or exists (select 1 from po_biaya where btrim(coalesce(no_transaksi, '')) = btrim(p_tr))
      or exists (select 1 from kb_impor_bayar where btrim(coalesce(no_transaksi, '')) = btrim(p_tr))
      or exists (select 1 from impor_bukti_abaikan where tr = btrim(p_tr));
$$;
revoke all on function public._impor_tr_terpakai(text) from public, anon, authenticated;

create or replace function public.impor_biaya_tandai(p_tr text, p_bukti bigint, p_po text, p_jenis text, p_nominal text, p_catatan text, p_token text)
returns json language plpgsql security definer set search_path to 'public' as $function$
#variable_conflict use_column
declare
  peran text := (select public.peran_saya()); v_oleh text; a record; o record; v numeric; jenis text := public._rapi_spasi(p_jenis, 40);
  cat text := public._rapi_spasi(p_catatan, 200); tr text := btrim(coalesce(p_tr, '')); kini timestamptz := now();
begin
  if not public._boleh_peran(array['kendali_bisnis', 'manajemen']) then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  v_oleh := case when peran = 'kendali_bisnis' then 'Mike' else coalesce(public._mgmt_nama(), 'Manajemen') end;
  if not (jenis = any (array['Ongkir cargo', 'Bill kedua / IMP', 'Pajak & bea masuk', 'Lainnya'])) then return json_build_object('ok', false, 'pesan', 'Pilih jenis biaya.'); end if;
  if jenis = 'Lainnya' and length(cat) < 3 then return json_build_object('ok', false, 'pesan', 'Untuk biaya "Lainnya", tulis keterangannya.'); end if;
  select btrim(no) no, tanggal, public._rapi_spasi(akun, 60) akun, nominal, jenis j, coalesce(status, 'Aktif') st into a from acc_log where btrim(no) = tr order by id desc limit 1;
  if a.no is null or a.j <> 'Keluar' or a.st <> 'Aktif' then return json_build_object('ok', false, 'pesan', 'Transaksi ' || tr || ' bukan uang keluar yang aktif.'); end if;
  v := round(coalesce(nullif(regexp_replace(coalesce(p_nominal, ''), '[^0-9]', '', 'g'), '')::numeric, a.nominal));
  if not (v > 0) or v > a.nominal + 5000 then return json_build_object('ok', false, 'pesan', 'Nominal biaya harus lebih dari 0 dan tidak lebih dari bukti (Rp ' || public._gd_fmt(a.nominal) || ').'); end if;
  perform pg_advisory_xact_lock(hashtext('kb_impor_bayar'));
  if coalesce(p_token, '') <> '' and exists (select 1 from toko_token where token = 'gdimpbiaya|' || left(p_token, 60)) then
    return json_build_object('ok', true, 'ulang', true, 'pesan', 'Data ini sudah tersimpan sebelumnya (tidak dicatat dua kali).');
  end if;
  if public._impor_tr_terpakai(tr) then return json_build_object('ok', false, 'pesan', 'Bukti ' || tr || ' sudah dipakai. Muat ulang.'); end if;
  select id, public._rapi(no_po, 30) no, public._rapi(supplier, 80) sup, public._rapi(status, 40) st into o
    from po_log where public._rapi(no_po, 30) = public._rapi_spasi(p_po, 30) and public._rapi_spasi(asal, 20) = 'Impor' order by baris_sheet nulls last, id limit 1;
  if o.id is null then return json_build_object('ok', false, 'pesan', 'Pilih PO impor.'); end if;
  if o.st in ('Ditolak', 'Batal') then return json_build_object('ok', false, 'pesan', 'PO ' || o.no || ' sudah ' || lower(o.st) || '.'); end if;
  insert into po_biaya (no_po, tanggal, jenis_biaya, nominal, cara_bayar, status_bayar, no_transaksi, waktu_masuk, pengisi, catatan)
  values (o.no, a.tanggal, jenis, v, a.akun, 'Dibayar', tr, kini, v_oleh, left('Dari bukti Telegram' || coalesce(' #' || p_bukti, '') || case when cat <> '' then ' - ' || cat else '' end, 200));
  insert into kb_impor_bayar (waktu, ref, jenis, nominal, tanggal_bayar, no_transaksi, oleh, catatan, total_invoice, supplier)
  values (kini, o.no, jenis, v, a.tanggal, tr, v_oleh, 'Dari bukti Telegram' || coalesce(' #' || p_bukti, ''), null, nullif(o.sup, ''));
  if p_bukti is not null then insert into acc_bukti (acc_no, bukti_id) values (tr, p_bukti) on conflict do nothing; end if;
  insert into efek_antre (jenis, data) values ('kb_biaya', jsonb_build_object('po', o.no, 'v', v, 'jenis', jenis, 'tr', tr));
  insert into efek_antre (jenis, data) values ('tg', jsonb_build_object('asal', jsonb_build_object('e', '👤', 'n', v_oleh, 'nama', ''), 'teks',
    '🌏🧾 <b>BIAYA PO IMPOR</b> (dari bukti Telegram)' || E'\nOleh: <b>' || public._tg_esc(v_oleh) || '</b> · PO ' || public._tg_esc(o.no) || ' · ' || public._tg_esc(o.sup)
    || E'\n' || public._tg_esc(jenis) || ': Rp ' || public._gd_fmt(v) || E'\nBukti ' || public._tg_esc(tr) || '. Uang keluar tidak dicatat ulang. Ikut dihitung ke HPP barang PO ini.'));
  if coalesce(p_token, '') <> '' then insert into toko_token (token) values ('gdimpbiaya|' || left(p_token, 60)) on conflict do nothing; end if;
  return json_build_object('ok', true, 'pesan', jenis || ' Rp ' || public._gd_fmt(v) || ' masuk ke biaya PO ' || o.no || ' (bukti ' || tr || '). Ikut dihitung ke HPP.'
    || case when exists (select 1 from hpp_hitung_log where public._rapi(no_po, 30) = o.no and public._rapi(jenis, 30) = 'Terima' and public._rapi(bukti_terima, 30) <> '')
            then ' Barang PO ini sudah diterima, jadi usulan koreksi HPP dibuat otomatis (tab Harga naik).' else '' end);
end $function$;
grant execute on function public.impor_biaya_tandai(text, bigint, text, text, text, text, text) to authenticated;

create or replace function public.impor_bukti_abaikan_simpan(p_tr text, p_alasan text) returns json
language plpgsql security definer set search_path to 'public' as $$
declare peran text := (select public.peran_saya()); al text := public._rapi_spasi(p_alasan, 200);
begin
  if not public._boleh_peran(array['kendali_bisnis', 'manajemen']) then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  if length(al) < 3 then return json_build_object('ok', false, 'pesan', 'Pilih alasannya.'); end if;
  if not exists (select 1 from acc_log where btrim(no) = btrim(coalesce(p_tr, ''))) then return json_build_object('ok', false, 'pesan', 'Transaksi tidak ditemukan.'); end if;
  insert into impor_bukti_abaikan (tr, alasan, oleh) values (btrim(p_tr), al, case when peran = 'kendali_bisnis' then 'Mike' else coalesce(public._mgmt_nama(), 'Manajemen') end)
  on conflict (tr) do nothing;
  return json_build_object('ok', true, 'pesan', 'Bukti ' || btrim(p_tr) || ' tidak ditampilkan lagi (' || al || '). Uang keluarnya tetap tercatat di accounting.');
end $$;
grant execute on function public.impor_bukti_abaikan_simpan(text, text) to authenticated;

-- impor_bukti_calon: + kategori & jenis bukti (barang / biaya), daftar PO impor (pilihan biaya), PO impor terlambat, ongkir cargo Telegram.
create or replace function public.impor_bukti_calon() returns json
language plpgsql stable security definer set search_path to 'public' as $$
declare hasil json; hari date := (now() at time zone 'Asia/Makassar')::date;
begin
  if not public._boleh_peran(array['kendali_bisnis', 'manajemen']) then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  select json_build_object('ok', true,
    'bukti', coalesce((
      select json_agg(z order by z.t desc, z.tr desc) from (
        select btrim(l.no) tr, l.tanggal t, public._rapi_spasi(l.akun, 60) akun, l.nominal v, left(l.keterangan, 160) ket, public._rapi_spasi(l.kategori, 60) kat,
               case when l.kategori ilike 'ongkos%' or l.keterangan ~* '(bill|bil kedua|cargo|kargo|bea masuk|pajak impor|\mimp ?\d)' then 'biaya' else 'barang' end jenis,
               (select b.pengirim from bb_bukti b where b.id in (select ab.bukti_id from acc_bukti ab where ab.acc_no = btrim(l.no)) order by b.id limit 1) oleh,
               (select b.id from bb_bukti b where b.id in (select ab.bukti_id from acc_bukti ab where ab.acc_no = btrim(l.no)) and b.baca ->> 'dokumen' = 'transfer' order by b.id limit 1) bukti,
               (select coalesce(nullif(b.baca ->> 'penerima', ''), '') from bb_bukti b where b.id in (select ab.bukti_id from acc_bukti ab where ab.acc_no = btrim(l.no)) order by (b.baca ->> 'dokumen' = 'invoice') desc, b.id limit 1) sup,
               (select b.baca -> 'barang' from bb_bukti b where b.id in (select ab.bukti_id from acc_bukti ab where ab.acc_no = btrim(l.no))
                  and jsonb_array_length(coalesce(b.baca -> 'barang', '[]')) > 0 order by b.id limit 1) barang
          from acc_log l
         where l.jenis = 'Keluar' and coalesce(l.status, 'Aktif') = 'Aktif' and l.tanggal >= hari - 60
           and coalesce(l.pengisi, '') ilike 'telegram%'
           and (l.kategori ilike '%impor%'
                or exists (select 1 from acc_bukti ab join bb_bukti b on b.id = ab.bukti_id where ab.acc_no = btrim(l.no) and (b.kategori ilike '%impor%' or b.baca ->> 'kategori' ilike '%impor%'))
                or (l.kategori ilike 'ongkos%' and (l.pengisi ilike 'telegram: mike%' or l.keterangan ~* '(cargo|kargo|\mimp ?\d)')))
           and not public._impor_tr_terpakai(btrim(l.no))
      ) z), '[]'),
    'produk', coalesce((select json_agg(json_build_object('k', b.kode, 'n', b.nama, 'w', b.warna) order by b.kode) from public._barang_dasar_semua() b), '[]'),
    'po', coalesce((select json_agg(json_build_object('no', public._rapi(p.no_po, 30), 'sup', public._rapi(p.supplier, 80), 't', p.tanggal, 'st', public._rapi(p.status, 40),
                                                      'tot', round(coalesce(p.total_barang, 0))) order by p.tanggal desc, p.id desc)
                    from po_log p where public._rapi_spasi(p.asal, 20) = 'Impor' and coalesce(p.status, '') not in ('Batal', 'Ditolak') and p.tanggal >= hari - 150), '[]'),
    'telat', coalesce((select json_agg(json_build_object('no', public._rapi(p.no_po, 30), 'sup', public._rapi(p.supplier, 80), 'st', public._rapi(p.status, 40),
                                                         'tot', round(coalesce(p.total_barang, 0)), 'hari', hari - coalesce(p.waktu_dibayar::date, p.tanggal)) order by p.tanggal)
                       from po_log p where public._rapi_spasi(p.asal, 20) = 'Impor' and p.status in ('Dibayar', 'Dikirim supplier', 'Diterima sebagian')
                        and coalesce(p.waktu_dibayar::date, p.tanggal) <= hari - 30), '[]'),
    'tunggu', coalesce((
      select json_agg(json_build_object('no', a.no, 'n', a.n, 'w', a.w, 'k', a.k, 'q', coalesce(a.qs, a.q), 's', coalesce(nullif(a.s, ''), 'pcs'), 'h', coalesce(a.h, 0),
                                        't', a.t, 'pg', a.pg, 'bg', a.bg) order by a.t, a.no)
        from public._pgd_ajuan() a where a.st = 'Disetujui' and a.imp), '[]'),
    'dibayar', coalesce((
      select json_agg(json_build_object('no', a.no, 'n', a.n, 'w', a.w, 'q', coalesce(a.qs, a.q), 's', coalesce(nullif(a.s, ''), 'pcs'), 'st', a.st, 'ref', a.ref) order by a.u desc)
        from (select * from public._pgd_ajuan() a2 where a2.st in ('Dipesan') and a2.imp order by a2.u desc limit 40) a), '[]')
  ) into hasil;
  return hasil;
end $$;

-- d. kb_impor_bayar: DP yang sudah tercatat dari bukti Telegram ditolak (sebelum DP dicatat).
do $$ declare d text; s text := 'select coalesce(max(id), 0) into efek_awal from efek_antre;'; g text;
begin
  d := pg_get_functiondef('public.kb_impor_bayar'::regproc);
  if position('_impor_tr_terpakai' in d) > 0 then return; end if;
  if position(s in d) = 0 then raise exception 'pola kb_impor_bayar tidak ketemu'; end if;
  g := 'if exists (select 1 from acc_log l where l.jenis = ''Keluar'' and coalesce(l.status, ''Aktif'') = ''Aktif'' and coalesce(l.pengisi, '''') ilike ''telegram%''
      and abs(l.nominal - dp) <= 5000 and abs(l.tanggal - to_date(p_tanggal, ''YYYY-MM-DD'')) <= 10 and not public._impor_tr_terpakai(btrim(l.no))) then
    return json_build_object(''ok'', false, ''pesan'', ''DP ini sepertinya sudah tercatat dari bukti Telegram ('' || (select btrim(l.no) from acc_log l where l.jenis = ''Keluar''
      and coalesce(l.status, ''Aktif'') = ''Aktif'' and coalesce(l.pengisi, '''') ilike ''telegram%'' and abs(l.nominal - dp) <= 5000
      and abs(l.tanggal - to_date(p_tanggal, ''YYYY-MM-DD'')) <= 10 and not public._impor_tr_terpakai(btrim(l.no)) order by abs(l.nominal - dp) limit 1)
      || ''). Supaya uang keluar tidak dobel, jangan dicatat lagi di sini. Kabari manajemen Moscow Supplies untuk menyambungkan DP-nya.'');
  end if;
  ';
  execute replace(d, s, g || s);
end $$;

-- e. laporan pagi: PO berstatus Dibayar > 30 hari belum diterima.
do $$ declare d text; s text := 'select ''PO dikirim supplier > 30 hari'', ''Manajemen'', p.no_po, coalesce(p.supplier,''''), (k.t - coalesce(p.waktu_dibayar::date, p.tanggal))::int
    from po_log p, kini k where p.status = ''Dikirim supplier'' and';
begin
  d := pg_get_functiondef('public._menunggu_tindakan'::regproc);
  if position('Dibayar / dikirim supplier > 30 hari' in d) > 0 then return; end if;
  if position(s in d) = 0 then raise exception 'pola _menunggu_tindakan tidak ketemu'; end if;
  execute replace(d, s, 'select ''PO dibayar / dikirim supplier > 30 hari, belum diterima'', ''Manajemen'', p.no_po, coalesce(p.supplier,''''), (k.t - coalesce(p.waktu_dibayar::date, p.tanggal))::int
    from po_log p, kini k where p.status in (''Dikirim supplier'', ''Dibayar'') and');
end $$;
