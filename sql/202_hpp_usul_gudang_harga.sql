-- 12 Nov 2026: Gudang Utama. HPP diperbarui otomatis saat Terima barang (file 200), jadi dari form gudang staf
-- tidak lagi mengusulkan HPP; yang diajukan harga jual baru (mis. HPP sudah > 35% harga jual). Perlu ACC manajemen.
do $$
declare d text := pg_get_functiondef('public.hpp_usul'::regproc); a text; b text;
begin
  if position('HPP Gudang Utama diperbarui otomatis' in d) > 0 then return; end if;
  a := '  elsif v_jenis <> ''hpp'' then';
  b := '  elsif v_app = ''gudang'' then
    if v_jenis <> ''harga'' then
      return json_build_object(''ok'', false, ''pesan'', ''HPP Gudang Utama diperbarui otomatis saat barang PO diterima. Dari sini cukup ajukan harga jual baru.'');
    end if;
  elsif v_jenis <> ''hpp'' then';
  if position(a in d) = 0 then raise exception 'pola 1'; end if;
  d := replace(d, a, b);
  execute d;
end $$;
