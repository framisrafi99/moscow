-- 164 (5 Nov 2026): barang tanpa varian warna (mis. B01-B11 Benang Sol sepatu; warnanya bagian dari nama) tidak boleh punya "warna" di
-- pencocokan marketplace. Sebelumnya mp_padanan B01-B11 berisi warna (BLACK, BLUE, ...) sehingga penjualan membuat varian warna palsu di
-- stok Kantor Packing (barang tampil dobel: "BLACK" dan "belum dirinci warnanya").
-- Sudah dijalankan: 19 baris mp_padanan & 11 baris produksi_sesuai_log (SK-261031-038..048) warnanya dikosongkan (lewat _ubah_catat).
create or replace function public._mp_padanan_warna_rapi() returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if coalesce(btrim(new.warna), '') <> '' and btrim(coalesce(new.kode, '')) <> ''
     and exists (select 1 from barang_order b where upper(btrim(b.kode)) = upper(btrim(new.kode)))
     and not exists (select 1 from barang_order b where upper(btrim(b.kode)) = upper(btrim(new.kode)) and coalesce(btrim(b.varian_warna), '') <> '') then
    new.warna := null;
  end if;
  return new;
end $$;
revoke all on function public._mp_padanan_warna_rapi() from public, anon, authenticated;
create or replace trigger mp_padanan_warna_rapi before insert or update of kode, warna on public.mp_padanan
  for each row execute function public._mp_padanan_warna_rapi();
