-- 12 Nov 2026: pengadaan_robot ikut mengirim kp (stok Kantor Packing) dan toko (stok toko/consignment) per barang jualan.
-- Stok & saran pengajuan sekarang hanya dari Gudang Utama (robot.js); kp/toko hanya keterangan di form pengajuan.
-- Dipasang dengan mengganti bagian json_build_object di fungsi yang sudah ada:
do $$
declare d text := pg_get_functiondef('public.pengadaan_robot'::regproc);
  a text := $q$'saran', x -> 'saran', 'h', x -> 'h', 'st', x -> 'st') e, o$q$;
begin
  if position('''kp''' in d) > 0 then return; end if;
  if position(a in d) = 0 then raise exception 'pola tidak ketemu'; end if;
  execute replace(d, a, $q$'saran', x -> 'saran', 'h', x -> 'h', 'st', x -> 'st', 'kp', x -> 'kp', 'toko', x -> 'toko') e, o$q$);
end $$;
