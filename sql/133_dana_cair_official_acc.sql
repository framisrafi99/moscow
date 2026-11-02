-- 133 (2 Nov 2026): laporan dana Official (Shopee, Tokopedia/TikTok, Lazada) otomatis dicatat di accounting.
--  Penjualan Official sudah masuk otomatis per hari ke akun "Dana <platform> (belum cair)" (dari laporan pesanan).
--  Saat laporan dana bulanan diupload, dicatat dari akun dana itu:
--    - tiap potongan platform (rincian biaya)        -> Keluar (biaya admin marketplace / ongkir / iklan / pajak)
--    - tiap penyesuaian (+ pendapatan lain, - biaya)  -> Masuk / Keluar
--    - tiap penarikan dana ke rekening                -> Pindah ke Rekening PT
--  Semua bertanda [DC Official <platform> <bulan>]. Upload ulang: catatan bertanda lama dibatalkan lalu dibuat ulang.
--  Penarikan yang sudah dicatat manual (akun, tanggal, nominal sama) tidak dicatat lagi.

create or replace function public._dc_kategori(p_nama text, p_v numeric)
returns text language sql immutable set search_path = '' as $$
  select case
    when p_v > 0 then 'Pendapatan lain-lain'
    when p_nama ~* '(tax|pajak|pph|ppn)' then 'Pajak & perizinan'
    when p_nama ~* '(ads|iklan|affiliate|afiliasi|promosi|promo|voucher)' then 'Iklan & promosi'
    when p_nama ~* '(shipping|ongkir|ongkos kirim|pengiriman|logistic)' then 'Ongkos kirim & ekspedisi'
    else 'Biaya admin marketplace' end
$$;

create or replace function public._dc_official_acc(p_bulan text, p_pf text)
returns json language plpgsql volatile security definer set search_path = public as $$
declare
  x record; e record; v_akun text; tag text; tgl date; nomor text; sisa numeric; v numeric; nm text;
  n_batal int := 0; n_baru int := 0; n_lewat int := 0;
begin
  v_akun := case p_pf when 'Shopee' then 'Dana Shopee (belum cair)' when 'Tokopedia' then 'Dana Tokopedia/TikTok (belum cair)'
                    when 'Lazada' then 'Dana Lazada (belum cair)' end;
  if v_akun is null or not public._acc_ada_akun(v_akun) then return json_build_object('ok', false, 'pesan', 'Akun dana ' || coalesce(p_pf, '-') || ' tidak ada.'); end if;
  select * into x from dana_cair where public._bulan_teks(bulan) = p_bulan and toko = 'Official' and platform = p_pf
   order by baris_sheet desc nulls first, id desc limit 1;
  if x.id is null then return json_build_object('ok', false, 'pesan', 'Laporan dana belum ada.'); end if;
  if public._tb_tolak(p_bulan || '-01') <> '' then return json_build_object('ok', false, 'pesan', 'Buku sudah ditutup.'); end if;
  tag := '[DC Official ' || p_pf || ' ' || p_bulan || ']';
  tgl := least((to_date(p_bulan || '-01', 'YYYY-MM-DD') + interval '1 month' - interval '1 day')::date, (now() at time zone 'Asia/Makassar')::date);
  perform pg_advisory_xact_lock(hashtext('staf|acc_log'));

  update acc_log set status = 'Batal', waktu_batal = now()
   where status = 'Aktif' and pengisi = 'sistem: laporan dana' and position(tag in coalesce(keterangan, '')) > 0;
  get diagnostics n_batal = row_count;

  -- Potongan platform per baris rincian; sisa yang tidak terinci jadi satu baris.
  sisa := coalesce(x.total_biaya, 0);
  for e in select btrim(split_part(it, ':', 1)) n, nullif(regexp_replace(split_part(it, ':', 2), '[^\d.-]', '', 'g'), '')::numeric val
             from unnest(string_to_array(coalesce(x.rincian_biaya, ''), ';')) it where btrim(it) <> '' loop
    continue when e.val is null or e.val = 0;
    sisa := sisa - e.val;
    nomor := public._acc_no_baru();
    insert into acc_log (no, tanggal, jenis, akun, akun_tujuan, kategori, keterangan, nominal, waktu_input, pengisi, status)
    values (nomor, tgl, case when e.val < 0 then 'Keluar' else 'Masuk' end, v_akun, '', public._dc_kategori(e.n, e.val),
            left(p_pf || ' Official: ' || e.n || ' ' || tag, 200), abs(e.val), now(), 'sistem: laporan dana', 'Aktif');
    n_baru := n_baru + 1;
  end loop;
  if abs(sisa) >= 1 then
    nomor := public._acc_no_baru();
    insert into acc_log (no, tanggal, jenis, akun, akun_tujuan, kategori, keterangan, nominal, waktu_input, pengisi, status)
    values (nomor, tgl, case when sisa < 0 then 'Keluar' else 'Masuk' end, v_akun, '', case when sisa < 0 then 'Biaya admin marketplace' else 'Pendapatan lain-lain' end,
            left(p_pf || ' Official: potongan lain (tidak terinci) ' || tag, 200), abs(sisa), now(), 'sistem: laporan dana', 'Aktif');
    n_baru := n_baru + 1;
  end if;

  -- Penyesuaian (kompensasi, subsidi, iklan yang dipotong dari saldo, dll).
  sisa := coalesce(x.penyesuaian, 0);
  for e in select btrim(split_part(it, ':', 1)) n, nullif(regexp_replace(split_part(it, ':', 2), '[^\d.-]', '', 'g'), '')::numeric val
             from unnest(string_to_array(coalesce(x.rincian_penyesuaian, ''), ';')) it where btrim(it) <> '' loop
    continue when e.val is null or e.val = 0;
    sisa := sisa - e.val;
    nomor := public._acc_no_baru();
    insert into acc_log (no, tanggal, jenis, akun, akun_tujuan, kategori, keterangan, nominal, waktu_input, pengisi, status)
    values (nomor, tgl, case when e.val < 0 then 'Keluar' else 'Masuk' end, v_akun, '', public._dc_kategori(e.n, e.val),
            left(p_pf || ' Official penyesuaian: ' || e.n || ' ' || tag, 200), abs(e.val), now(), 'sistem: laporan dana', 'Aktif');
    n_baru := n_baru + 1;
  end loop;
  if abs(sisa) >= 1 then
    nomor := public._acc_no_baru();
    insert into acc_log (no, tanggal, jenis, akun, akun_tujuan, kategori, keterangan, nominal, waktu_input, pengisi, status)
    values (nomor, tgl, case when sisa < 0 then 'Keluar' else 'Masuk' end, v_akun, '', case when sisa < 0 then 'Biaya admin marketplace' else 'Pendapatan lain-lain' end,
            left(p_pf || ' Official: penyesuaian lain ' || tag, 200), abs(sisa), now(), 'sistem: laporan dana', 'Aktif');
    n_baru := n_baru + 1;
  end if;

  -- Penarikan dana ke rekening.
  for e in select (j ->> 't') t, round(public._mp_n(j ->> 'v')) val, coalesce(j ->> 'rek', '') rek
             from jsonb_array_elements(case when coalesce(x.penarikan, '') ~ '^\s*\[' then x.penarikan::jsonb else '[]'::jsonb end) j loop
    continue when e.t !~ '^\d{4}-\d{2}-\d{2}$' or e.val is null or e.val <= 0;
    if exists (select 1 from acc_log where status = 'Aktif' and jenis = 'Pindah' and akun = v_akun and akun_tujuan = 'Rekening PT'
                 and tanggal = e.t::date and nominal = e.val and coalesce(pengisi, '') <> 'sistem: laporan dana') then
      n_lewat := n_lewat + 1; continue;
    end if;
    continue when public._tb_tolak(e.t) <> '';
    nomor := public._acc_no_baru();
    insert into acc_log (no, tanggal, jenis, akun, akun_tujuan, kategori, keterangan, nominal, waktu_input, pengisi, status)
    values (nomor, e.t::date, 'Pindah', v_akun, 'Rekening PT', '',
            left('Penarikan saldo ' || p_pf || ' Official ke Rekening PT' || case when e.rek <> '' then ' (rek. ..' || e.rek || ')' else '' end || ' ' || tag, 200),
            e.val, now(), 'sistem: laporan dana', 'Aktif');
    n_baru := n_baru + 1;
  end loop;
  return json_build_object('ok', true, 'baru', n_baru, 'batal', n_batal, 'lewat', n_lewat);
end $$;
revoke all on function public._dc_official_acc(text, text) from public, anon, authenticated;

-- dana_cair_simpan: setelah laporan Official tersimpan, catat ke accounting.
do $$
declare d text; lama text; baru text;
begin
  d := pg_get_functiondef('public.dana_cair_simpan'::regproc);
  if position('_dc_official_acc' in d) > 0 then return; end if;
  lama := $q$  return json_build_object('ok', true, 'pesan', 'Laporan dana ' || v_pf || ' ' || v_toko || ' ' || nb || ' tersimpan: dana cair Rp ' ||$q$;
  baru := $q$  if v_toko = 'Official' then
    tarik := to_jsonb(public._dc_official_acc(v_bulan, v_pf));
    if coalesce((tarik ->> 'ok')::boolean, false) then
      return json_build_object('ok', true, 'pesan', 'Laporan dana ' || v_pf || ' Official ' || nb || ' tersimpan: dana cair Rp ' ||
        replace(to_char(v_cair, 'FM999,999,999,990'), ',', '.') || '. Accounting: ' || (tarik ->> 'baru') || ' catatan potongan, penyesuaian & penarikan dibuat otomatis.');
    end if;
  end if;
  return json_build_object('ok', true, 'pesan', 'Laporan dana ' || v_pf || ' ' || v_toko || ' ' || nb || ' tersimpan: dana cair Rp ' ||$q$;
  if position(lama in d) = 0 then raise exception 'dana_cair_simpan: baris akhir tidak ditemukan'; end if;
  execute replace(d, lama, baru);
end $$;
