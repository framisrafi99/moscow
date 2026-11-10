-- 10/11/2026: Admin Accounting lebih teliti mencocokkan bukti dengan transaksi yang sudah tercatat.
-- Kasus: bukti kardus ShopeePay 10/11 Rp415.710 salah ditempel ke Wifi Kerobokan (Rekening Belanja) 03/11 Rp416.250.
--
-- 1) bb_cocok (dipakai versi bot yang sedang jalan): nominal yang tidak persis sama hanya dicocokkan
--    bila tanggalnya selisih maks. 2 hari.
-- 2) bb_cocok_detail (dipakai bot versi baru): ikut membandingkan akun, kategori, nomor invoice / pesanan,
--    tanggal invoice dan tanggal bayar; mengembalikan 'yakin' (boleh ditempel otomatis) dan 'alasan' (kalau ragu, ditanyakan).

CREATE OR REPLACE FUNCTION public.bb_cocok(p_nominal numeric, p_tanggal date, p_pengirim text DEFAULT ''::text)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v numeric := round(coalesce(p_nominal, 0)); tol numeric; hasil jsonb := '[]'; d date := coalesce(p_tanggal, (now() at time zone 'Asia/Makassar')::date);
  x record;
begin
  if v <= 0 then return '[]'; end if;
  tol := greatest(5000, round(v * 0.005));
  select coalesce(jsonb_agg(jsonb_build_object('no', jsonb_build_array(btrim(no)), 't', to_char(tanggal, 'DD/MM/YYYY'), 'v', round(nominal),
           'ket', left(coalesce(keterangan, ''), 90), 'sumber', public._acc_sumber(pengisi), 'cara', 'satu',
           'beda', round(nominal) - v) order by abs(round(nominal) - v), abs(tanggal - d)), '[]') into hasil
    from (select * from acc_log a
           where public._rapi_spasi(a.jenis, 10) = 'Keluar' and coalesce(public._rapi_spasi(a.status, 20), 'Aktif') <> 'Batal'
             and abs(round(coalesce(a.nominal, 0)) - v) <= tol and a.tanggal between d - 7 and d + 2
             and (round(a.nominal) = v or abs(a.tanggal - d) <= 2)
             and not exists (select 1 from acc_bukti b where b.acc_no = btrim(a.no))
           order by abs(round(a.nominal) - v), abs(a.tanggal - d) limit 3) z;
  if jsonb_array_length(hasil) > 0 then return hasil; end if;
  for x in select a.tanggal, a.pengisi, array_agg(btrim(a.no) order by a.no) nos, sum(round(a.nominal)) jml, string_agg(left(coalesce(a.keterangan, ''), 40), ' + ' order by a.no) ket
             from acc_log a
            where public._rapi_spasi(a.jenis, 10) = 'Keluar' and coalesce(public._rapi_spasi(a.status, 20), 'Aktif') <> 'Batal'
              and a.tanggal between d - 7 and d + 2 and coalesce(a.pengisi, '') <> 'pemilik'
              and not exists (select 1 from acc_bukti b where b.acc_no = btrim(a.no))
            group by a.tanggal, a.pengisi having count(*) between 2 and 8 and abs(sum(round(a.nominal)) - v) <= tol
               and (sum(round(a.nominal)) = v or abs(a.tanggal - d) <= 2)
            order by abs(sum(round(a.nominal)) - v) limit 1 loop
    hasil := jsonb_build_array(jsonb_build_object('no', to_jsonb(x.nos), 't', to_char(x.tanggal, 'DD/MM/YYYY'), 'v', x.jml, 'ket', left(x.ket, 120),
      'sumber', public._acc_sumber(x.pengisi), 'cara', 'jumlah', 'beda', x.jml - v));
  end loop;
  return hasil;
end $function$;

CREATE OR REPLACE FUNCTION public.bb_cocok_detail(p_nominal numeric, p_tanggal date, p_pengirim text DEFAULT '', p_akun text DEFAULT '',
  p_kategori text DEFAULT '', p_ref text DEFAULT '', p_tgl_invoice date DEFAULT NULL)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v numeric := round(coalesce(p_nominal, 0)); tol numeric; d date := coalesce(p_tanggal, (now() at time zone 'Asia/Makassar')::date);
  di date := coalesce(p_tgl_invoice, coalesce(p_tanggal, (now() at time zone 'Asia/Makassar')::date));
  ak text := coalesce(public._rapi_spasi(p_akun, 60), ''); kt text := coalesce(public._rapi_spasi(p_kategori, 80), '');
  rf text := lower(btrim(coalesce(p_ref, ''))); hasil jsonb;
begin
  if v <= 0 then return '[]'; end if;
  if length(rf) < 6 then rf := ''; end if;
  tol := greatest(5000, round(v * 0.005));
  with c as (
    select a.*, round(a.nominal) - v beda, least(abs(a.tanggal - d), abs(a.tanggal - di)) jarak,
           (rf <> '' and lower(coalesce(a.keterangan, '')) like '%' || rf || '%') refok,
           (ak = '' or coalesce(public._rapi_spasi(a.akun, 60), '') in ('', ak)) akok,
           (kt = '' or kt = 'Biaya lain-lain' or coalesce(public._rapi_spasi(a.kategori, 80), '') in ('', kt, 'Biaya lain-lain')) ktok
      from acc_log a
     where public._rapi_spasi(a.jenis, 10) = 'Keluar' and coalesce(public._rapi_spasi(a.status, 20), 'Aktif') <> 'Batal'
       and abs(round(coalesce(a.nominal, 0)) - v) <= tol
       and a.tanggal between least(d, di) - 45 and greatest(d, di) + 2
       and not exists (select 1 from acc_bukti b where b.acc_no = btrim(a.no))
  ), s as (
    select c.*,
      -- boleh ditempel otomatis
      (refok or (beda = 0 and akok and ktok and jarak <= 2)) yakin,
      -- layak ditanyakan (tidak otomatis)
      (refok or (beda = 0 and jarak <= 7) or (akok and ktok and jarak <= 2)) layak
      from c
  )
  select coalesce(jsonb_agg(jsonb_build_object('no', jsonb_build_array(btrim(no)), 't', to_char(tanggal, 'DD/MM/YYYY'), 'v', round(nominal),
           'ket', left(coalesce(keterangan, ''), 90), 'akun', akun, 'kategori', kategori, 'sumber', public._acc_sumber(pengisi), 'cara', 'satu',
           'beda', beda, 'yakin', yakin,
           'alasan', array_to_string(array_remove(array[
              case when not refok and beda <> 0 then 'nominal beda ' || abs(beda) end,
              case when not refok and jarak > 2 then 'tanggal beda ' || jarak || ' hari' end,
              case when not akok then 'akun beda (' || coalesce(akun, '-') || ')' end,
              case when not ktok then 'kategori beda (' || coalesce(kategori, '-') || ')' end], null), ', '))
         order by yakin desc, refok desc, abs(beda), jarak), '[]') into hasil
    from (select * from s where layak order by yakin desc, refok desc, abs(beda), jarak limit 3) z;
  return hasil;
end $function$;

grant execute on function public.bb_cocok_detail(numeric, date, text, text, text, text, date) to service_role;
