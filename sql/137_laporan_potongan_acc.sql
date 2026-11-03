-- Potongan platform marketplace yang dicatat sebagai Keluar dari akun "(belum cair)".
-- Dana cair sudah dipotong biaya ini, jadi laporan konsultan pajak tidak menghitungnya lagi sebagai biaya operasional.
create or replace function public.laporan_potongan_acc(p_bulan text)
returns numeric language plpgsql stable security definer set search_path = public as $$
begin
  if (select public.peran_saya()) is distinct from 'manajemen' then return 0; end if;
  return coalesce((select sum(nominal) from acc_log where status = 'Aktif' and jenis = 'Keluar' and left(tanggal::text, 7) = p_bulan
    and akun ~* '\(belum cair\)'
    and keterangan ~* '^(Biaya marketplace |Iklan TikTok Ads \(GMV Pay\)|PPh 22 dipotong (TikTok|Shopee)|Ongkir ditanggung penjual |Komisi affiliate Shopee|Isi saldo iklan otomatis Shopee|Biaya pengiriman ditanggung penjual )'), 0);
end $$;
revoke all on function public.laporan_potongan_acc(text) from public, anon;
grant execute on function public.laporan_potongan_acc(text) to authenticated;
