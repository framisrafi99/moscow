-- 10/11/2026: Admin Accounting lebih ketat mencocokkan bukti dengan transaksi yang sudah tercatat.
-- Nominal yang tidak persis sama hanya dicocokkan bila tanggalnya selisih maks. 2 hari.
-- Kasus: bukti kardus ShopeePay 10/11 Rp415.710 salah ditempel ke Wifi Kerobokan 03/11 Rp416.250.
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
