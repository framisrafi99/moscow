-- 166 (5 Nov 2026): pengaman uang keluar dobel. Sebelum menyimpan uang keluar (form Accounting manajemen & form Gudang),
-- dicari transaksi Keluar aktif dengan nominal sama dalam ±3 hari dari sumber mana pun (dibayar Viory di Purchasing, PO Mike,
-- form Gudang, catatan manajemen). Kalau ada, ditanyakan dulu: tetap simpan atau batal.

create or replace function public._acc_sumber(p text)
returns text language sql immutable as $$
  select case when coalesce(p, '') = '' then 'tidak diketahui'
              when p = 'pemilik' then 'dicatat manajemen Moscow Supplies'
              when p ilike 'purchasing:%' then 'dibayar ' || btrim(substr(p, 12)) || ' (Purchasing)'
              when p ilike '%mike%' then 'dibayar Mike'
              when p ilike 'staf:%(gudang)%' then 'form Gudang (' || btrim(replace(substr(p, 6), '(gudang)', '')) || ')'
              else p end;
$$;

create or replace function public.acc_cek_dobel(p_rows jsonb)
returns json language plpgsql stable security definer set search_path to 'public' as $$
declare x jsonb; i int := 0; d date; v numeric; hasil jsonb := '[]'; m jsonb;
begin
  if not public._boleh_peran(array['gudang', 'purchasing_shopeepay']) then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  for x in select value from jsonb_array_elements(case when jsonb_typeof(p_rows) = 'array' then p_rows else '[]' end) loop
    i := i + 1;
    if i > 60 then exit; end if;
    begin d := (x ->> 't')::date; v := round((x ->> 'v')::numeric); exception when others then continue; end;
    if d is null or v is null or v <= 0 then continue; end if;
    select coalesce(jsonb_agg(jsonb_build_object('no', btrim(no), 't', to_char(tanggal, 'DD/MM/YYYY'), 'ket', left(coalesce(keterangan, ''), 90),
             'akun', coalesce(akun, ''), 'sumber', public._acc_sumber(pengisi)) order by abs(tanggal - d), id), '[]') into m
      from acc_log
     where public._rapi_spasi(jenis, 10) = 'Keluar' and coalesce(public._rapi_spasi(status, 20), 'Aktif') <> 'Batal'
       and round(coalesce(nominal, 0)) = v and tanggal between d - 3 and d + 3;
    if jsonb_array_length(m) > 0 then hasil := hasil || jsonb_build_object('i', i, 'v', v, 't', to_char(d, 'DD/MM/YYYY'), 'ada', m); end if;
  end loop;
  return json_build_object('ok', true, 'dobel', hasil);
end $$;
revoke all on function public.acc_cek_dobel(jsonb) from public, anon;
grant execute on function public.acc_cek_dobel(jsonb) to authenticated;

-- Form Gudang: pengecekan yang sudah ada (tanggal persis sama) diperluas jadi ±3 hari dan menyebut sumbernya.
do $$
declare d text := pg_get_functiondef('public.gudang_uang_simpan(text,text,text,text,text,text,boolean,text)'::regprocedure); a text := d;
begin
  d := replace(d, $q$select public._rapi_spasi(no, 30) no, public._rapi_spasi(keterangan, 200) ket, public._rapi_spasi(akun, 60) a into x$q$,
                  $q$select public._rapi_spasi(no, 30) no, public._rapi_spasi(keterangan, 200) ket, public._rapi_spasi(akun, 60) || ', ' || to_char(tanggal, 'DD/MM') || ', ' || public._acc_sumber(pengisi) a into x$q$);
  d := replace(d, $q$and to_char(tanggal, 'YYYY-MM-DD') = v_tgl and round(coalesce(nominal, 0)) = v$q$,
                  $q$and tanggal between to_date(v_tgl, 'YYYY-MM-DD') - 3 and to_date(v_tgl, 'YYYY-MM-DD') + 3 and round(coalesce(nominal, 0)) = v$q$);
  d := replace(d, $q$'Sudah ada uang keluar dengan tanggal dan nominal yang sama: '$q$, $q$'Sudah ada uang keluar dengan nominal yang sama (selisih tanggal maks. 3 hari): '$q$);
  if (length(d) - length(a)) < 100 or position('- 3 and' in d) = 0 then raise exception 'gudang_uang_simpan tidak berubah'; end if;
  execute d;
end $$;
