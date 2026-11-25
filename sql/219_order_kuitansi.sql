-- 219 (25 Nov 2026): kuitansi pembayaran untuk setiap invoice order (Master Data > Penjualan > Order).
--  order_kuitansi menyimpan rincian pembayaran per order (DP / pelunasan, tanggal, nominal, referensi, pengirim dana)
--  supaya kuitansi bisa dicetak ulang. Tanda tangan manajemen & rekening tujuan disimpan di kasir_setelan 'Invoice order'
--  (bukan di kode, karena repo publik).
create table if not exists public.order_kuitansi (
  no_order text primary key,
  data jsonb not null default '{}'::jsonb,
  diubah timestamptz not null default now(),
  diubah_oleh text
);
alter table public.order_kuitansi enable row level security;
drop policy if exists order_kuitansi_baca on public.order_kuitansi;
create policy order_kuitansi_baca on public.order_kuitansi for select using ((select public.peran_saya()) = any (array['manajemen', 'kendali_bisnis', 'accounting']));
revoke insert, update, delete on public.order_kuitansi from anon, authenticated;
grant select on public.order_kuitansi to authenticated;

create or replace function public.order_kuitansi_simpan(p_no text, p_data jsonb)
returns json language plpgsql volatile security definer set search_path = public as $$
declare v_no text := btrim(coalesce(p_no, '')); b jsonb; n int := 0;
begin
  if (select public.peran_saya()) is distinct from 'manajemen' then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  if not exists (select 1 from order_log where btrim(no_order) = v_no) then return json_build_object('ok', false, 'pesan', 'Order ' || v_no || ' tidak ditemukan.'); end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' or jsonb_typeof(coalesce(p_data -> 'bayar', '[]')) <> 'array' then
    return json_build_object('ok', false, 'pesan', 'Data pembayaran tidak valid.');
  end if;
  for b in select value from jsonb_array_elements(coalesce(p_data -> 'bayar', '[]')) loop
    n := n + 1;
    if coalesce(b ->> 't', '') !~ '^\d{4}-\d{2}-\d{2}$' then return json_build_object('ok', false, 'pesan', 'Pembayaran ke-' || n || ': tanggal belum diisi.'); end if;
    if coalesce(b ->> 'v', '') !~ '^\d+$' or (b ->> 'v')::numeric <= 0 then return json_build_object('ok', false, 'pesan', 'Pembayaran ke-' || n || ': nominal belum diisi.'); end if;
  end loop;
  if n = 0 then return json_build_object('ok', false, 'pesan', 'Isi minimal satu pembayaran.'); end if;
  if n > 10 then return json_build_object('ok', false, 'pesan', 'Maksimal 10 pembayaran.'); end if;
  insert into order_kuitansi (no_order, data, diubah, diubah_oleh) values (v_no, p_data, now(), coalesce(auth.jwt() ->> 'email', ''))
    on conflict (no_order) do update set data = excluded.data, diubah = excluded.diubah, diubah_oleh = excluded.diubah_oleh;
  return json_build_object('ok', true, 'pesan', 'Pembayaran tersimpan.');
end $$;
revoke all on function public.order_kuitansi_simpan(text, jsonb) from public, anon;
grant execute on function public.order_kuitansi_simpan(text, jsonb) to authenticated;
