-- 113: Master Data lama › persetujuan penyesuaian stok satu per satu langsung di Supabase:
--  putusSesuai (file 6, toko; satu nomor atau semua yang menunggu) dan prodSesuaiPutus (file 7 + Telegram file 23, produksi/gudang/KP).
--  Pekerjaannya memakai md_setuju_putus (072) yang sudah dipakai Master Data baru; fungsi ini hanya menyamakan pesan Apps Script.
create or replace function public.toko_sesuai_putus(p_no text, p_semua boolean, p_setuju boolean, p_catatan text)
returns json language plpgsql volatile security definer set search_path = public as $$
declare v_no text := left(btrim(regexp_replace(coalesce(p_no, ''), '\s+', ' ', 'g')), 30); nos jsonb; n int; r json; setuju boolean := p_setuju is true;
begin
  if (select public.peran_saya()) is distinct from 'manajemen' then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  if p_semua is not true and v_no = '' then return json_build_object('ok', false, 'pesan', 'Nomor ajuan tidak ada.'); end if;
  perform pg_advisory_xact_lock(hashtext('toko|toko_sesuai_log'));
  select coalesce(jsonb_agg(distinct btrim(no)), '[]'), count(*) into nos, n from toko_sesuai_log
   where btrim(coalesce(no, '')) <> '' and btrim(coalesce(toko, '')) <> '' and selisih is not null
     and coalesce(btrim(status), '') not in ('Disetujui', 'Ditolak')
     and (p_semua is true or btrim(no) = v_no);
  if n = 0 then return json_build_object('ok', false, 'pesan', 'Ajuan sudah diputuskan sebelumnya atau tidak ditemukan.'); end if;
  r := public.md_setuju_putus(nos, '[]'::jsonb, setuju, p_catatan);
  if coalesce((r ->> 'ok')::boolean, false) is not true then return r; end if;
  return json_build_object('ok', true, 'pesan', n || ' ajuan ' || case when setuju then 'disetujui. Stok toko sudah disesuaikan.' else 'ditolak. Stok toko tidak berubah.' end);
end $$;
revoke all on function public.toko_sesuai_putus(text, boolean, boolean, text) from public, anon;
grant execute on function public.toko_sesuai_putus(text, boolean, boolean, text) to authenticated;

create or replace function public.prod_sesuai_putus(p_no text, p_setuju boolean, p_catatan text)
returns json language plpgsql volatile security definer set search_path = public as $$
declare v_no text := btrim(coalesce(p_no, '')); x record; r json; setuju boolean := p_setuju is true;
begin
  if (select public.peran_saya()) is distinct from 'manajemen' then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  perform pg_advisory_xact_lock(hashtext('staf|produksi_sesuai_log'));
  select coalesce(nullif(regexp_replace(btrim(coalesce(nama_barang, '')), '\s+', ' ', 'g'), ''), '') nm, public._rapi_warna(warna) w, coalesce(selisih, 0) sel,
         btrim(coalesce(status, '')) st
    into x from produksi_sesuai_log where btrim(coalesce(no, '')) = v_no and v_no <> '' order by baris_sheet nulls last, id limit 1;
  if x.st is null then return json_build_object('ok', false, 'pesan', 'Pengajuan tidak ditemukan. Tekan Muat ulang.'); end if;
  if x.st <> 'Menunggu' then return json_build_object('ok', false, 'pesan', 'Pengajuan ' || v_no || ' sudah diputuskan sebelumnya (' || x.st || ').'); end if;
  r := public.md_setuju_putus('[]'::jsonb, jsonb_build_array(v_no), setuju, p_catatan);
  if coalesce((r ->> 'ok')::boolean, false) is not true then
    return json_build_object('ok', false, 'pesan', coalesce(regexp_replace(r -> 'gagal' ->> 0, '^[^:]*: ', ''), r ->> 'pesan'));
  end if;
  return json_build_object('ok', true, 'pesan', case when setuju
    then 'Disetujui: ' || x.nm || case when x.w <> '' then ' ' || x.w else '' end || ', stok disesuaikan ' || case when x.sel > 0 then '+' else '' end || public._angka_teks(x.sel) || ' pcs.'
    else 'Ditolak: ' || x.nm || case when x.w <> '' then ' ' || x.w else '' end || '. Stok tidak berubah.' end);
end $$;
revoke all on function public.prod_sesuai_putus(text, boolean, text) from public, anon;
grant execute on function public.prod_sesuai_putus(text, boolean, text) to authenticated;
select 'ok113' as ok;
