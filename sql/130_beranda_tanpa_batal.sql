-- 130: Beranda (beranda_data) tidak menghitung laporan toko yang diarsipkan / dibatalkan
--  (nama toko berlabel "(BATAL ...)" atau "(ARSIP ...)", mis. laporan lama Renon yang diganti rekap PDF Oktober).
do $x$
declare d text; n int := 0;
begin
  d := pg_get_functiondef('public.beranda_data(text)'::regprocedure);
  if position('(batal|arsip)' in d) = 0 then
    d := replace(d, 'from toko_jual_log where tanggal between la and b)',
                    'from toko_jual_log where tanggal between la and b and coalesce(toko, '''') !~* ''\((batal|arsip)'')');
    d := replace(d, 'from toko_jual_log where tanggal between a and b',
                    'from toko_jual_log where tanggal between a and b and coalesce(toko, '''') !~* ''\((batal|arsip)''');
    execute d;
  end if;
end $x$;
select (length(pg_get_functiondef('public.beranda_data(text)'::regprocedure)) - length(replace(pg_get_functiondef('public.beranda_data(text)'::regprocedure), '(batal|arsip)', ''))) / 13 as jumlah_filter_130;
