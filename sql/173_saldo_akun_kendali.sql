-- 173 (6 Nov 2026): saldo akun terlihat di Kendali Bisnis.
-- 1) akunting_baca boleh dibaca peran kendali_bisnis (Kendali Bisnis > Laporan bulanan menghitung saldo per akun di HP, hanya melihat).
-- 2) Beranda (Master Data & Kendali Bisnis): kartu "Saldo & pengeluaran" menampilkan Rekening PT, Rekening Belanja, ShopeePay, Kas Tunai
--    (sebelumnya Rekening PT tersembunyi di "Akun lain").
do $$ declare d text; begin
  d := pg_get_functiondef('public.akunting_baca'::regproc);
  if position($q$if coalesce((select public.peran_saya()), '') <> 'manajemen' then$q$ in d) > 0 then
    execute replace(d, $q$if coalesce((select public.peran_saya()), '') <> 'manajemen' then$q$, $q$if coalesce((select public.peran_saya()), '') not in ('manajemen', 'kendali_bisnis') then$q$);
  end if;
  d := pg_get_functiondef('public.beranda_data'::regproc);
  if position($q$values ('Kas Tunai', 1), ('Rekening Belanja', 2), ('ShopeePay', 3))$q$ in d) > 0 then
    execute replace(d, $q$values ('Kas Tunai', 1), ('Rekening Belanja', 2), ('ShopeePay', 3))$q$, $q$values ('Rekening PT', 1), ('Rekening Belanja', 2), ('ShopeePay', 3), ('Kas Tunai', 4))$q$);
  end if;
end $$;
