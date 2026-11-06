-- 174 (6 Nov 2026): Laporan untuk konsultan pajak - rincian semua transaksi accounting bulan itu (semua akun),
-- dipakai bagian "Rincian biaya per kategori" dan "Saldo rekening & piutang" di Master Data › Laporan.
create or replace function public.laporan_pajak_rinci(p_bulan text)
returns json language plpgsql stable security definer set search_path to 'public' as $function$
declare a date; b date;
begin
  if (select public.peran_saya()) is distinct from 'manajemen' then raise exception 'Akses ditolak.'; end if;
  if coalesce(p_bulan, '') !~ '^\d{4}-\d{2}$' then raise exception 'Bulan tidak valid.'; end if;
  a := to_date(p_bulan || '-01', 'YYYY-MM-DD'); b := (a + interval '1 month' - interval '1 day')::date;
  return json_build_object('bulan', p_bulan,
    'trx', coalesce((select json_agg(json_build_object('no', btrim(l.no), 't', l.tanggal, 'j', l.jenis, 'kat', coalesce(l.kategori, ''),
        'kel', coalesce(k.kelompok, case when l.jenis = 'Pindah' then 'Pindah dana' else '' end),
        'ket', coalesce(l.keterangan, ''), 'akun', public._rapi_spasi(l.akun, 60), 'ke', coalesce(public._rapi_spasi(l.akun_tujuan, 60), ''),
        'v', l.nominal, 'o', coalesce(l.pengisi, '')) order by l.tanggal, l.no)
      from acc_log l left join acc_kategori k on k.kategori = l.kategori and k.jenis = l.jenis
      where l.status = 'Aktif' and l.tanggal between a and b), '[]'));
end $function$;
revoke all on function public.laporan_pajak_rinci(text) from public, anon;
grant execute on function public.laporan_pajak_rinci(text) to authenticated;
