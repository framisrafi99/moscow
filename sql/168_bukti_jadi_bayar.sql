-- 168 (5 Nov 2026): Bukti bayar di grup Telegram = tindakan "sudah dibayar".
-- Anggota grup (siapa pun yang membayar) cukup mengirim foto bukti. Robot mencocokkan barang di nota dengan pengajuan yang
-- belum dibayar (Menunggu / Disetujui) dan PO lokal yang sudah di-ACC, lalu menampilkan tombol "✅ Sudah dibayar".
-- Hanya PENGIRIM bukti yang bisa menekannya. Tombol itu menjalankan logika yang sama persis dengan tombol Bayar di Purchasing
-- (status pengajuan, accounting, harga satuan + laporan harga naik, PO barang jualan, pemberitahuan Telegram).
--
-- 1) _acc_akun_bayar: kalau p_bayar persis nama akun di ACC_AKUN, pakai akun itu (Rekening PT, Kas Toko Offline bisa dipakai).
--    Untuk masukan lama (Kas Tunai / Rekening Belanja / ShopeePay) hasilnya sama.
-- 2) plx_bayar & pl_po_bayar dipecah: isi logikanya pindah ke _plx_bayar_inti / _po_bayar_inti (tambahan p_oleh = nama pembayar,
--    akun boleh 5 akun bayar). Fungsi lama tetap memeriksa peran lalu memanggil inti -> aplikasi Purchasing tidak berubah.
-- 3) bb_belum_bayar(): daftar pengajuan belum dibayar + PO lokal Disetujui (untuk AI robot).
-- 4) bb_bayar(p_id, p_oleh): jalankan rencana bayar yang tersimpan di bb_bukti.baca.rencana; semua atau tidak sama sekali.

create or replace function public._acc_akun_bayar(p_bayar text)
returns text language sql stable security definer set search_path to 'public' as $function$
  with a as (
    select distinct on (n) n, j, u from (
      select left(public._rapi_spasi(nama_akun, 60), 60) n, public._rapi_spasi(jenis, 30) j, row_number() over (order by baris_sheet nulls last, id) u
        from acc_akun) z where n <> '' order by n, u)
  select n from (
    select n, 0 o, u from a where n = public._rapi_spasi(p_bayar, 60)
    union all
    select n, 1 o, u from a where lower(j) = lower(case p_bayar when 'Rekening Belanja' then 'Bank' when 'Rekening Bank' then 'Bank' when 'ShopeePay' then 'Marketplace'
                                                    when 'Kas Tunai' then 'Kas' else '' end)) z
  order by o, u limit 1;
$function$;

do $$
declare d text; a text;
begin
  -- _plx_bayar_inti
  d := pg_get_functiondef('public.plx_bayar(text,text,text,text,jsonb,text)'::regprocedure); a := d;
  d := replace(d, 'FUNCTION public.plx_bayar(p_toko text, p_bayar text, p_tanggal text, p_nama text, p_items jsonb, p_token text)',
                  'FUNCTION public._plx_bayar_inti(p_toko text, p_bayar text, p_tanggal text, p_nama text, p_items jsonb, p_token text, p_oleh text)');
  d := replace(d, $q$  if not public._boleh_peran(array['purchasing_shopeepay']) or (select public.peran_saya()) = 'manajemen' then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
$q$, '');
  d := replace(d, $q$array['ShopeePay', 'Kas Tunai', 'Rekening Belanja']$q$, $q$array['ShopeePay', 'Kas Tunai', 'Rekening Belanja', 'Rekening PT', 'Kas Toko Offline']$q$);
  d := replace(d, $q$v_oleh := case when length(v_nama) >= 2 and lower(v_nama) <> 'viory' then 'Viory (' || v_nama || ')' else 'Viory' end;$q$,
                  $q$v_oleh := case when length(v_nama) >= 2 and lower(v_nama) <> 'viory' then 'Viory (' || v_nama || ')' else 'Viory' end;
  if coalesce(btrim(p_oleh), '') <> '' then v_oleh := left(btrim(p_oleh), 30) || ' (Telegram)'; end if;$q$);
  d := replace(d, $q$return json_build_object('ok', true, 'pesan', jsonb_array_length(rows)$q$, $q$return json_build_object('ok', true, 'trs', to_jsonb(trs), 'pesan', jsonb_array_length(rows)$q$);
  if position('_plx_bayar_inti' in d) = 0 or position('_boleh_peran' in d) > 0 or position('(Telegram)' in d) = 0 or position('''trs'', to_jsonb' in d) = 0
     or position('Kas Toko Offline' in d) = 0 then raise exception '_plx_bayar_inti: penggantian gagal'; end if;
  execute d;

  -- _po_bayar_inti
  d := pg_get_functiondef('public.pl_po_bayar(text,text,text,text,text)'::regprocedure); a := d;
  d := replace(d, 'FUNCTION public.pl_po_bayar(p_no text, p_bayar text, p_tanggal text, p_nama text, p_token text)',
                  'FUNCTION public._po_bayar_inti(p_no text, p_bayar text, p_tanggal text, p_nama text, p_token text, p_oleh text)');
  d := replace(d, $q$  if not public._boleh_peran(array['purchasing_shopeepay']) or (select public.peran_saya()) = 'manajemen' then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
$q$, '');
  d := replace(d, $q$array['ShopeePay', 'Kas Tunai', 'Rekening Belanja']$q$, $q$array['ShopeePay', 'Kas Tunai', 'Rekening Belanja', 'Rekening PT', 'Kas Toko Offline']$q$);
  d := replace(d, $q$v_oleh := case when length(v_nama) >= 2 and lower(v_nama) <> 'viory' then 'Viory (' || v_nama || ')' else 'Viory' end;$q$,
                  $q$v_oleh := case when length(v_nama) >= 2 and lower(v_nama) <> 'viory' then 'Viory (' || v_nama || ')' else 'Viory' end;
  if coalesce(btrim(p_oleh), '') <> '' then v_oleh := left(btrim(p_oleh), 30) || ' (Telegram)'; end if;$q$);
  d := replace(d, $q$return json_build_object('ok', true, 'pesan', 'PO ' || o.no || ' ditandai dibayar$q$, $q$return json_build_object('ok', true, 'tr', tr, 'pesan', 'PO ' || o.no || ' ditandai dibayar$q$);
  if position('_po_bayar_inti' in d) = 0 or position('_boleh_peran' in d) > 0 or position('(Telegram)' in d) = 0 or position('''tr'', tr' in d) = 0
     or position('Kas Toko Offline' in d) = 0 then raise exception '_po_bayar_inti: penggantian gagal'; end if;
  execute d;
end $$;

-- fungsi lama: periksa peran + 3 cara bayar seperti sebelumnya, lalu panggil inti
create or replace function public.plx_bayar(p_toko text, p_bayar text, p_tanggal text, p_nama text, p_items jsonb, p_token text)
returns json language plpgsql security definer set search_path to 'public' as $function$
begin
  if not public._boleh_peran(array['purchasing_shopeepay']) or (select public.peran_saya()) = 'manajemen' then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  if not (coalesce(p_bayar, '') = any (array['ShopeePay', 'Kas Tunai', 'Rekening Belanja'])) then return json_build_object('ok', false, 'pesan', 'Pilih cara bayar.'); end if;
  return public._plx_bayar_inti(p_toko, p_bayar, p_tanggal, p_nama, p_items, p_token, null);
end $function$;

create or replace function public.pl_po_bayar(p_no text, p_bayar text, p_tanggal text, p_nama text, p_token text)
returns json language plpgsql security definer set search_path to 'public' as $function$
begin
  if not public._boleh_peran(array['purchasing_shopeepay']) or (select public.peran_saya()) = 'manajemen' then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  if not (coalesce(p_bayar, '') = any (array['ShopeePay', 'Kas Tunai', 'Rekening Belanja'])) then return json_build_object('ok', false, 'pesan', 'Pilih cara bayar.'); end if;
  return public._po_bayar_inti(p_no, p_bayar, p_tanggal, p_nama, p_token, null);
end $function$;

-- daftar yang belum dibayar, untuk robot
create or replace function public.bb_belum_bayar()
returns jsonb language sql stable security definer set search_path to 'public' as $function$
  select jsonb_build_object(
    'p', (select coalesce(jsonb_agg(jsonb_build_object('no', z.no, 'n', left(z.n || case when z.w <> '' and position(upper(z.w) in upper(z.n)) = 0 then ' ' || z.w else '' end, 60),
                    'q', coalesce(z.qs, z.q), 's', coalesce(nullif(z.s, ''), 'pcs'), 'h', coalesce(z.h, 0), 'kel', z.kel, 'bg', z.bg) order by z.u desc), '[]')
            from (select * from public._pgd_ajuan() a where a.st in ('Menunggu', 'Disetujui') and not a.imp order by a.u desc limit 40) z),
    'o', (select coalesce(jsonb_agg(jsonb_build_object('no', public._rapi_spasi(p.no_po, 30), 'sup', public._rapi_spasi(p.supplier, 60), 'tot', round(coalesce(p.total_barang, 0)))
                    order by p.id desc), '[]')
            from po_log p where public._rapi_spasi(p.asal, 20) = 'Lokal' and public._rapi_spasi(p.status, 40) = 'Disetujui' and p.waktu_dibayar is null));
$function$;

-- jalankan rencana bayar dari bukti (semua berhasil atau tidak ada yang tersimpan)
create or replace function public.bb_bayar(p_id bigint, p_oleh text)
returns json language plpgsql security definer set search_path to 'public' as $function$
declare b record; rc jsonb; res jsonb; x jsonb; tgl text; sisa numeric; tr text; trs text[] := '{}'; oleh text := left(btrim(coalesce(p_oleh, '')), 30);
begin
  select * into b from bb_bukti where id = p_id for update;
  if b.id is null then return json_build_object('ok', false, 'pesan', 'Bukti tidak ditemukan.'); end if;
  if b.status in ('dicatat', 'cocok') then return json_build_object('ok', false, 'pesan', 'Sudah tercatat: ' || coalesce(b.acc_no, '-')); end if;
  rc := b.baca -> 'rencana';
  if rc is null then return json_build_object('ok', false, 'pesan', 'Tidak ada pengajuan yang cocok di bukti ini.'); end if;
  if coalesce(b.akun, '') = '' then return json_build_object('ok', false, 'pesan', 'Pilih akun bayarnya dulu.'); end if;
  if b.tanggal is null then return json_build_object('ok', false, 'pesan', 'Tanggal belum terbaca. Tekan ✏️ Ubah lalu tulis tanggalnya.'); end if;
  if length(oleh) < 2 then oleh := coalesce(b.pengirim, 'Telegram'); end if;
  tgl := to_char(b.tanggal, 'YYYY-MM-DD');
  begin
    if jsonb_array_length(coalesce(rc -> 'p', '[]')) > 0 then
      res := public._plx_bayar_inti(coalesce(nullif(btrim(rc ->> 'toko'), ''), 'Toko (bukti Telegram)'), b.akun, tgl, oleh,
               (select jsonb_agg(jsonb_build_object('no', z ->> 'no', 'q', z ->> 'q', 't', z ->> 't')) from jsonb_array_elements(rc -> 'p') z), 'bb' || b.id, oleh)::jsonb;
      if res ? 'perluAlasan' then
        raise exception 'Ada barang yang sudah pernah dibelanjakan (%). Bayar lewat aplikasi Purchasing supaya alasan belanja ulang bisa diisi.',
          (select string_agg(k, ', ') from jsonb_object_keys(res -> 'perluAlasan') k);
      end if;
      if coalesce((res ->> 'lewat')::boolean, false) then raise exception 'Ada barang jualan yang belum punya kode di Master Data. Bayar lewat aplikasi Purchasing.'; end if;
      if not coalesce((res ->> 'ok')::boolean, false) then raise exception '%', coalesce(res ->> 'pesan', 'Gagal menyimpan.'); end if;
      if coalesce((res ->> 'ulang')::boolean, false) then raise exception 'Bukti ini sudah pernah dipakai untuk membayar.'; end if;
      trs := trs || array(select jsonb_array_elements_text(coalesce(res -> 'trs', '[]')));
    end if;
    for x in select value from jsonb_array_elements(coalesce(rc -> 'o', '[]')) loop
      res := public._po_bayar_inti(x ->> 'no', b.akun, tgl, oleh, 'bb' || b.id || '|' || (x ->> 'no'), oleh)::jsonb;
      if not coalesce((res ->> 'ok')::boolean, false) or coalesce((res ->> 'ulang')::boolean, false) then raise exception '%', coalesce(res ->> 'pesan', 'Gagal membayar PO.'); end if;
      trs := trs || (res ->> 'tr');
    end loop;
    sisa := round(coalesce((rc ->> 'sisa')::numeric, 0));
    if sisa > 0 then
      tr := public._acc_keluar(tgl, b.akun, coalesce(nullif(b.kategori, ''), 'Biaya lain-lain'),
              left('Sisa nota di luar pengajuan' || coalesce(': ' || nullif(rc ->> 'sisa_ket', ''), '') || ' [Telegram: ' || oleh || ']', 190), sisa, 'telegram: ' || oleh);
      trs := trs || tr;
    end if;
    trs := trs || array(select jsonb_array_elements_text(coalesce(rc -> 'b', '[]')));
    if cardinality(trs) = 0 then raise exception 'Tidak ada yang dibayar.'; end if;
    insert into acc_bukti (acc_no, bukti_id) select distinct n, b.id from unnest(trs) n where n is not null on conflict do nothing;
    update bb_bukti set status = 'dicatat', acc_no = array_to_string(trs, ', '), diubah = now() where id = b.id;
  exception when others then
    return json_build_object('ok', false, 'pesan', sqlerrm);
  end;
  return json_build_object('ok', true, 'trs', to_jsonb(trs));
end $function$;

revoke all on function public._plx_bayar_inti(text, text, text, text, jsonb, text, text) from public, anon, authenticated;
revoke all on function public._po_bayar_inti(text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.bb_belum_bayar() from public, anon, authenticated;
revoke all on function public.bb_bayar(bigint, text) from public, anon, authenticated;
grant execute on function public._plx_bayar_inti(text, text, text, text, jsonb, text, text), public._po_bayar_inti(text, text, text, text, text, text),
  public.bb_belum_bayar(), public.bb_bayar(bigint, text) to service_role;
grant execute on function public.plx_bayar(text, text, text, text, jsonb, text), public.pl_po_bayar(text, text, text, text, text) to authenticated;
