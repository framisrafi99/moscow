-- 118 (31 Okt 2026): tutup celah akses.
--  _boleh_tulis_toko dan _boleh_peran dulu menghasilkan NULL (bukan false) untuk akun yang tidak terdaftar di tabel pengguna
--  (peran_saya() kosong). Di fungsi pemakainya "if not ... then ditolak" tidak jalan untuk NULL, jadi akun Google yang belum
--  didaftarkan ikut lolos. Sekarang hasilnya selalu true / false.
--  Panggilan Apps Script (kunci rahasia) tidak memakai kedua fungsi ini, jadi tidak terpengaruh.
create or replace function public._boleh_tulis_toko(p_toko text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select public.peran_saya()) = 'manajemen'
      or ((select public.peran_saya()) = 'toko' and (select public.lingkup_saya()) = p_toko), false);
$$;
create or replace function public._boleh_peran(p text[])
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select public.peran_saya()) = 'manajemen' or (select public.peran_saya()) = any (p), false);
$$;
select coalesce(public._boleh_tulis_toko('Toko Offline')::text, 'NULL') || ' / ' || coalesce(public._boleh_peran(array['gudang'])::text, 'NULL') as cek;
