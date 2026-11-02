-- 132: daftar laporan dana cair yang sudah diupload (status per platform di layar Upload dana cair).
--  Tabel dana_cair tidak bisa dibaca langsung dari aplikasi, jadi lewat fungsi ini (khusus manajemen).
create or replace function public.dana_cair_ada(p_toko text, p_bulan text)
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if (select public.peran_saya()) is distinct from 'manajemen' then return '[]'::json; end if;
  return coalesce((select json_agg(json_build_object('bulan', public._bulan_teks(bulan), 'platform', platform, 'akun_toko', akun_toko, 'dari', dari, 'sampai', sampai,
      'total_pendapatan', total_pendapatan, 'total_biaya', total_biaya, 'penyesuaian', penyesuaian, 'dana_cair', dana_cair, 'jumlah_pesanan', jumlah_pesanan,
      'nama_file', nama_file, 'diupload_oleh', diupload_oleh, 'waktu_upload', waktu_upload) order by baris_sheet nulls last, id)
    from dana_cair where public._mp_t(toko, 80) = public._mp_t(p_toko, 80) and public._bulan_teks(bulan) = p_bulan), '[]'::json);
end $$;
revoke all on function public.dana_cair_ada(text, text) from public, anon;
grant execute on function public.dana_cair_ada(text, text) to authenticated;
