-- 135: lampiran pengeluaran bahan baku Kenka (dibeli dengan uang Moscow) di invoice bagi hasil Kenka.
--  kenka_bh_beli(bulan): pembelian bahan baku & kemasan bulan itu dari acc_log (calon lampiran, dipilih di aplikasi).
--  kenka_bh_lampiran(bulan, bahan): simpan pilihan lampiran ke invoice yang sudah terbit (tidak mengubah angka bagi hasil).
create or replace function public.kenka_bh_beli(p_bulan text)
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if (select public.peran_saya()) is distinct from 'manajemen' then return '[]'::json; end if;
  if coalesce(p_bulan, '') !~ '^\d{4}-(0[1-9]|1[0-2])$' then return '[]'::json; end if;
  return coalesce((select json_agg(json_build_object('no', no, 't', tanggal::text, 'a', akun, 'k', kategori,
           'ket', btrim(regexp_replace(coalesce(keterangan, ''), '\s*\[JUR\d+\]', '')), 'v', nominal) order by tanggal, no)
    from acc_log where status = 'Aktif' and jenis = 'Keluar' and left(tanggal::text, 7) = p_bulan
      and kategori in ('Pembelian bahan baku', 'Botol, stiker & kemasan')), '[]'::json);
end $$;
revoke all on function public.kenka_bh_beli(text) from public, anon;
grant execute on function public.kenka_bh_beli(text) to authenticated;

create or replace function public.kenka_bh_lampiran(p_bulan text, p_bahan jsonb)
returns json language plpgsql volatile security definer set search_path = public as $$
declare tot numeric;
begin
  if (select public.peran_saya()) is distinct from 'manajemen' then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  if jsonb_typeof(p_bahan) is distinct from 'array' then return json_build_object('ok', false, 'pesan', 'Lampiran tidak valid.'); end if;
  if not exists (select 1 from kenka_bh where bulan = p_bulan) then return json_build_object('ok', false, 'pesan', 'Invoice bulan ini belum terbit.'); end if;
  update kenka_bh set data = jsonb_set(data, '{bahan}', p_bahan) where bulan = p_bulan;
  select coalesce(sum(public._mp_n(e ->> 'v')), 0) into tot from jsonb_array_elements(p_bahan) e;
  return json_build_object('ok', true, 'pesan', 'Lampiran bahan baku disimpan: ' || jsonb_array_length(p_bahan) || ' pembelian, Rp ' || replace(to_char(tot, 'FM999,999,999,990'), ',', '.') || '.');
end $$;
revoke all on function public.kenka_bh_lampiran(text, jsonb) from public, anon;
grant execute on function public.kenka_bh_lampiran(text, jsonb) to authenticated;
