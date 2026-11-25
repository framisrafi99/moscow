-- 217 (25 Nov 2026): Kasir dipakai juga oleh Consignment Renon (pengganti report penjualan harian manual).
--  * kasir_toko_saya: staf toko Renon boleh memakai kasir; manajemen bisa memilih Toko Offline / Consignment Renon.
--  * kasir_simpan: nomor nota Renon berawalan RN- (Toko Offline tetap TO-); pesan akses umum.
--  Uang QRIS Renon masuk rekening Renon (bukan Rekening PT): Accounting toko offline tetap hanya membaca toko ~* 'offline'.
create or replace function public.kasir_toko_saya(minta text default null)
returns text language plpgsql stable security definer set search_path to '' as $function$
declare p text := public.peran_saya(); l text := public.lingkup_saya(); m text := nullif(trim(coalesce(minta, '')), '');
begin
  if p = 'toko' and (l ilike '%offline%' or l = 'Consignment Renon') then return l; end if;
  if p = 'manajemen' then
    if m is null then return 'Toko Offline'; end if;
    if m ilike '%offline%' or m = 'Consignment Renon' then return m; end if;
    return null;
  end if;
  return null;
end $function$;

do $x$
declare d text;
begin
  d := pg_get_functiondef('public.kasir_simpan(jsonb)'::regprocedure);
  if position('v_awalan := ''TO-'' || to_char(v_tgl' in d) = 0 then raise exception 'pola nomor nota tidak ditemukan'; end if;
  d := replace(d, 'v_awalan := ''TO-'' || to_char(v_tgl',
                  'v_awalan := case when v_toko = ''Consignment Renon'' then ''RN-'' else ''TO-'' end || to_char(v_tgl');
  d := replace(d, '''Akun ini tidak punya akses kasir toko offline.''', '''Akun ini tidak punya akses kasir.''');
  execute d;
end $x$;
