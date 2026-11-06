-- 136: total gaji / payroll / bonus bagi hasil Kenka yang tercatat di Accounting (semua akun) satu bulan,
--  supaya laporan pajak tidak menghitung gaji dua kali bila payroll sudah diisi.
create or replace function public.laporan_gaji_acc(p_bulan text)
returns numeric language plpgsql stable security definer set search_path = public as $$
begin
  if (select public.peran_saya()) is distinct from 'manajemen' then return 0; end if;
  return coalesce((select sum(nominal) from acc_log where status = 'Aktif' and jenis = 'Keluar' and left(tanggal::text, 7) = p_bulan
    and kategori ~* '(gaji|payroll|bonus bagi hasil kenka)'), 0);
end $$;
revoke all on function public.laporan_gaji_acc(text) from public, anon;
grant execute on function public.laporan_gaji_acc(text) to authenticated;

-- 6 Nov 2026: hanya gaji payroll & bonus bagi hasil Kenka yang diganti angka Payroll; upah harian (DW) di luar payroll tetap biaya operasional.
create or replace function public.laporan_gaji_acc(p_bulan text)
returns numeric language plpgsql stable security definer set search_path = public as $$
begin
  if (select public.peran_saya()) is distinct from 'manajemen' then return 0; end if;
  return coalesce((select sum(nominal) from acc_log where status = 'Aktif' and jenis = 'Keluar' and left(tanggal::text, 7) = p_bulan
    and kategori ~* '(gaji|payroll|bonus bagi hasil kenka)' and (kategori ~* 'kenka' or coalesce(keterangan, '') ~* '(payroll|bagi hasil)')), 0);
end $$;
