-- 169 (5 Nov 2026): pembayaran pengajuan IMPOR lewat bukti di grup Telegram "Bukti Bayar Moscow".
-- impor_bayar (halaman Mike) dipecah: logikanya pindah ke _impor_bayar_inti (+ p_oleh = pembayar, p_akun = akun bayar,
-- bawaan Rekening Belanja). impor_bayar tetap memeriksa peran lalu memanggil inti -> halaman Mike tidak berubah.
-- bb_belum_bayar: + 'i' = pengajuan impor Disetujui yang belum dibayar.
-- bb_bayar: + rencana.i = [{no, t}] -> _impor_bayar_inti (PO impor otomatis untuk barang jualan, seperti di halaman Mike).

do $$
declare d text;
begin
  d := pg_get_functiondef('public.impor_bayar(jsonb,jsonb,text,text,text,text,text)'::regprocedure);
  d := replace(d, 'FUNCTION public.impor_bayar(p_nos jsonb, p_total jsonb, p_supplier text, p_tanggal text, p_eta text, p_catatan text, p_token text)',
                  'FUNCTION public._impor_bayar_inti(p_nos jsonb, p_total jsonb, p_supplier text, p_tanggal text, p_eta text, p_catatan text, p_token text, p_oleh text, p_akun text)');
  d := replace(d, $q$  if not public._boleh_peran(array['kendali_bisnis']) then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
$q$, '');
  d := replace(d, $q$'Rekening Belanja'$q$, 'v_akun');
  d := replace(d, $q$peran text := (select public.peran_saya());$q$, $q$peran text := (select public.peran_saya()); v_akun text := coalesce(nullif(btrim(p_akun), ''), 'Rekening Belanja');$q$);
  d := replace(d, $q$v_oleh := case when peran = 'kendali_bisnis' then 'Mike' else (public._mgmt_nama() || '') end;$q$,
                  $q$v_oleh := case when peran = 'kendali_bisnis' then 'Mike' else (public._mgmt_nama() || '') end;
  if coalesce(btrim(p_oleh), '') <> '' then v_oleh := left(btrim(p_oleh), 30) || ' (Telegram)'; end if;
  if not (v_akun = any (array['Rekening Belanja', 'Rekening PT', 'ShopeePay', 'Kas Tunai', 'Kas Toko Offline'])) then return json_build_object('ok', false, 'pesan', 'Pilih akun bayar.'); end if;$q$);
  d := replace(d, $q$'asal', case when peran = 'kendali_bisnis' then jsonb_build_object('e', '👤', 'n', 'Mike', 'nama', '')$q$,
                  $q$'asal', case when peran = 'kendali_bisnis' or coalesce(p_oleh, '') <> '' then jsonb_build_object('e', '👤', 'n', case when coalesce(p_oleh, '') <> '' then v_oleh else 'Mike' end, 'nama', '')$q$);
  if position('_impor_bayar_inti' in d) = 0 or position('_boleh_peran' in d) > 0 or position('(Telegram)' in d) = 0 or position('_acc_cek_akun(v_akun)' in d) = 0
     or position('v_akun text :=' in d) = 0 or position('or coalesce(p_oleh' in d) = 0 then raise exception '_impor_bayar_inti: penggantian gagal'; end if;
  execute d;
end $$;

create or replace function public.impor_bayar(p_nos jsonb, p_total jsonb, p_supplier text, p_tanggal text, p_eta text, p_catatan text, p_token text)
returns json language plpgsql security definer set search_path to 'public' as $function$
begin
  if not public._boleh_peran(array['kendali_bisnis']) then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  return public._impor_bayar_inti(p_nos, p_total, p_supplier, p_tanggal, p_eta, p_catatan, p_token, null, 'Rekening Belanja');
end $function$;

create or replace function public.bb_belum_bayar()
returns jsonb language sql stable security definer set search_path to 'public' as $function$
  select jsonb_build_object(
    'p', (select coalesce(jsonb_agg(jsonb_build_object('no', z.no, 'n', left(z.n || case when z.w <> '' and position(upper(z.w) in upper(z.n)) = 0 then ' ' || z.w else '' end, 60),
                    'q', coalesce(z.qs, z.q), 's', coalesce(nullif(z.s, ''), 'pcs'), 'h', coalesce(z.h, 0), 'kel', z.kel, 'bg', z.bg) order by z.u desc), '[]')
            from (select * from public._pgd_ajuan() a where a.st in ('Menunggu', 'Disetujui') and not a.imp order by a.u desc limit 40) z),
    'i', (select coalesce(jsonb_agg(jsonb_build_object('no', z.no, 'n', left(z.n || case when z.w <> '' and position(upper(z.w) in upper(z.n)) = 0 then ' ' || z.w else '' end, 60),
                    'q', coalesce(z.qs, z.q), 's', coalesce(nullif(z.s, ''), 'pcs'), 'h', coalesce(z.h, 0), 'kel', z.kel, 'bg', z.bg) order by z.u desc), '[]')
            from (select * from public._pgd_ajuan() a where a.st = 'Disetujui' and a.imp order by a.u desc limit 20) z),
    'o', (select coalesce(jsonb_agg(jsonb_build_object('no', public._rapi_spasi(p.no_po, 30), 'sup', public._rapi_spasi(p.supplier, 60), 'tot', round(coalesce(p.total_barang, 0)))
                    order by p.id desc), '[]')
            from po_log p where public._rapi_spasi(p.asal, 20) = 'Lokal' and public._rapi_spasi(p.status, 40) = 'Disetujui' and p.waktu_dibayar is null));
$function$;

-- bb_bayar: tambah blok impor (rencana.i) sebelum PO lokal
do $$
declare d text := pg_get_functiondef('public.bb_bayar(bigint,text)'::regprocedure);
begin
  d := replace(d, $q$    for x in select value from jsonb_array_elements(coalesce(rc -> 'o', '[]')) loop$q$,
                  $q$    if jsonb_array_length(coalesce(rc -> 'i', '[]')) > 0 then
      res := public._impor_bayar_inti((select jsonb_agg(z ->> 'no') from jsonb_array_elements(rc -> 'i') z),
               (select jsonb_object_agg(z ->> 'no', round((z ->> 't')::numeric)) from jsonb_array_elements(rc -> 'i') z),
               coalesce(nullif(btrim(rc ->> 'toko'), ''), 'Supplier impor (bukti Telegram)'), tgl, '', 'Bukti bayar Telegram #' || b.id, 'bb' || b.id || '|imp', oleh, b.akun)::jsonb;
      if not coalesce((res ->> 'ok')::boolean, false) or coalesce((res ->> 'ulang')::boolean, false) then raise exception '%', coalesce(res ->> 'pesan', 'Gagal membayar impor.'); end if;
      trs := trs || (res ->> 'tr');
    end if;
    for x in select value from jsonb_array_elements(coalesce(rc -> 'o', '[]')) loop$q$);
  if position('_impor_bayar_inti' in d) = 0 then raise exception 'bb_bayar: penggantian gagal'; end if;
  execute d;
end $$;

revoke all on function public._impor_bayar_inti(jsonb, jsonb, text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public._impor_bayar_inti(jsonb, jsonb, text, text, text, text, text, text, text) to service_role;
grant execute on function public.impor_bayar(jsonb, jsonb, text, text, text, text, text) to authenticated;

-- ===== Pindah dana antar akun Moscow lewat bukti Telegram =====
-- Siklus: Rekening PT -> Rekening Belanja (sumber dana utama) -> ShopeePay (top up) / Kas Tunai (kas kantor) / Kas Toko Offline.
-- Robot membaca bukti transfer / top up: kalau penerimanya akun Moscow sendiri, dicatat sebagai Pindah (bukan pengeluaran).
-- Biaya admin transfer (kalau ada) dicatat terpisah sebagai uang keluar dari akun asal.

-- sudah tercatat? (Pindah, nominal sama +-Rp 1.000, tanggal -3..+2 hari, akun asal atau tujuan sama, belum ada buktinya)
create or replace function public.bb_cocok_pindah(p_nominal numeric, p_tanggal date, p_dari text, p_ke text)
returns jsonb language sql stable security definer set search_path to 'public' as $function$
  select coalesce(jsonb_agg(jsonb_build_object('no', jsonb_build_array(btrim(z.no)), 't', to_char(z.tanggal, 'DD/MM/YYYY'), 'v', round(z.nominal),
           'ket', left(coalesce(z.keterangan, ''), 90), 'sumber', public._acc_sumber(z.pengisi), 'cara', 'pindah', 'beda', round(z.nominal) - round(p_nominal))), '[]')
    from (select a.* from acc_log a
           where public._rapi_spasi(a.jenis, 10) = 'Pindah' and coalesce(public._rapi_spasi(a.status, 20), 'Aktif') <> 'Batal'
             and abs(round(coalesce(a.nominal, 0)) - round(p_nominal)) <= 1000
             and a.tanggal between coalesce(p_tanggal, current_date) - 3 and coalesce(p_tanggal, current_date) + 2
             and (public._rapi_spasi(a.akun, 60) = p_dari or public._rapi_spasi(a.akun_tujuan, 60) = p_ke)
             and not exists (select 1 from acc_bukti b where b.acc_no = btrim(a.no))
           order by abs(round(a.nominal) - round(p_nominal)), abs(a.tanggal - coalesce(p_tanggal, current_date)) limit 1) z;
$function$;

create or replace function public.bb_catat_pindah(p_id bigint, p_oleh text)
returns json language plpgsql security definer set search_path to 'public' as $function$
declare b record; pd jsonb; dari text; ke text; v numeric; biaya numeric; nomor text; tr2 text; salah text; oleh text;
  awalan text := 'TR-' || to_char(now() at time zone 'Asia/Makassar', 'YYMMDD') || '-';
begin
  perform pg_advisory_xact_lock(hashtext('staf|acc_log'));
  select * into b from bb_bukti where id = p_id for update;
  if b.id is null then return json_build_object('ok', false, 'pesan', 'Bukti tidak ditemukan.'); end if;
  if b.status in ('dicatat', 'cocok') then return json_build_object('ok', false, 'pesan', 'Sudah tercatat: ' || coalesce(b.acc_no, '-')); end if;
  pd := b.baca -> 'pindah';
  if pd is null then return json_build_object('ok', false, 'pesan', 'Bukti ini bukan pindah dana.'); end if;
  dari := public._rapi_spasi(pd ->> 'dari', 60); ke := public._rapi_spasi(pd ->> 'ke', 60);
  if not exists (select 1 from acc_akun where public._rapi_spasi(nama_akun, 60) = dari) then return json_build_object('ok', false, 'pesan', 'Pilih akun asal (🏦 Dari).'); end if;
  if not exists (select 1 from acc_akun where public._rapi_spasi(nama_akun, 60) = ke) then return json_build_object('ok', false, 'pesan', 'Pilih akun tujuan (🏦 Ke).'); end if;
  if dari = ke then return json_build_object('ok', false, 'pesan', 'Akun asal dan tujuan tidak boleh sama.'); end if;
  v := round(coalesce(b.nominal, 0));
  if v <= 0 then return json_build_object('ok', false, 'pesan', 'Nominal belum terbaca. Tekan ✏️ Ubah lalu tulis nominalnya.'); end if;
  if b.tanggal is null then return json_build_object('ok', false, 'pesan', 'Tanggal belum terbaca. Tekan ✏️ Ubah lalu tulis tanggalnya.'); end if;
  salah := public._tb_tolak(to_char(b.tanggal, 'YYYY-MM-DD'));
  if salah <> '' then return json_build_object('ok', false, 'pesan', salah); end if;
  oleh := left(coalesce(nullif(btrim(p_oleh), ''), b.pengirim, ''), 40);
  nomor := awalan || right('00' || (public._acc_urut() + 1)::text, 3);
  insert into acc_log (no, tanggal, jenis, akun, akun_tujuan, kategori, keterangan, nominal, waktu_input, pengisi, status)
  values (nomor, b.tanggal, 'Pindah', dari, ke, '', left(coalesce(nullif(b.keterangan, ''), 'Pindah dana ' || dari || ' ke ' || ke) || ' [Telegram: ' || coalesce(b.pengirim, '?') || ']', 190),
          v, now(), 'telegram: ' || oleh, 'Aktif');
  insert into acc_bukti (acc_no, bukti_id) values (nomor, b.id) on conflict do nothing;
  biaya := round(coalesce(nullif(regexp_replace(coalesce(pd ->> 'biaya', ''), '[^0-9.]', '', 'g'), '')::numeric, 0));
  if biaya > 0 and biaya < v then
    tr2 := public._acc_keluar(to_char(b.tanggal, 'YYYY-MM-DD'), dari, 'Biaya lain-lain', 'Biaya admin transfer ' || dari || ' ke ' || ke || ' [Telegram: ' || coalesce(b.pengirim, '?') || ']', biaya, 'telegram: ' || oleh);
    insert into acc_bukti (acc_no, bukti_id) values (tr2, b.id) on conflict do nothing;
  end if;
  update bb_bukti set status = 'dicatat', acc_no = nomor || coalesce(', ' || tr2, ''), akun = dari, diubah = now() where id = b.id;
  return json_build_object('ok', true, 'no', nomor, 'biaya', tr2);
end $function$;

revoke all on function public.bb_cocok_pindah(numeric, date, text, text), public.bb_catat_pindah(bigint, text) from public, anon, authenticated;
grant execute on function public.bb_cocok_pindah(numeric, date, text, text), public.bb_catat_pindah(bigint, text) to service_role;
