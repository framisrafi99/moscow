-- 172 (6 Nov 2026): akun Google Abi sempat tertaut ke staf "I Made Indra Dharmawan" sejak persetujuan 3 Nov
-- (absen_daftar_putus menimpa email lewat on conflict (nama)). Dipisah: Indra kembali ke akun Google-nya sendiri,
-- Abi mendapat baris staf sendiri; absen 4-5 Nov (foto dari akun Abi) dipindah ke Abi.
-- Pencegahan: persetujuan pendaftaran ditolak kalau nama staf sudah tertaut ke akun Google lain.
-- (Perbaikan data dijalankan langsung di database; di sini hanya pencegahannya.)
do $$ declare d text; lama text; begin
  d := pg_get_functiondef('public.absen_daftar_putus(bigint,boolean,text,bigint)'::regprocedure);
  if position('sudah tertaut ke akun Google lain' in d) > 0 then return; end if;
  lama := $q$  insert into public.absen_staf (nama, email, lokasi_id, aktif) values (n, d.email, p_lokasi_id, true)$q$;
  if position(lama in d) = 0 then raise exception 'baris tidak ditemukan'; end if;
  d := replace(d, lama, $q$  if exists (select 1 from public.absen_staf where nama = n and aktif and coalesce(email, '') <> '' and lower(email) <> d.email) then
    return jsonb_build_object('ok', false, 'pesan', 'Nama ' || n || ' sudah tertaut ke akun Google lain (' || (select email from public.absen_staf where nama = n) || '). Pilih nama staf yang benar; kalau staf ini belum ada di Payroll, tambahkan dulu.');
  end if;
$q$ || lama);
  execute d;
end $$;
