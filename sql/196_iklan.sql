-- 10 Nov 2026: Pemantauan iklan (Kendali Bisnis › Iklan).
-- iklan_bulan  : ringkasan per bulan per platform. Jan–Okt 2026 diisi dari laporan Shopee, laporan settlement TikTok/Tokopedia
--                dan laporan pengeluaran (disusun manajemen); mulai Nov dihitung langsung dari acc_log + mp_pesanan.
-- iklan_catatan: catatan analisis mingguan (ditulis tugas terjadwal tiap Senin pagi).
-- Angka tidak disimpan di repo. Hanya manajemen & kendali bisnis yang boleh membaca.
create table if not exists public.iklan_bulan (
  bulan text not null, platform text not null,
  iklan numeric not null default 0, affiliate numeric not null default 0, penjualan numeric not null default 0,
  sumber text, primary key (bulan, platform));
create table if not exists public.iklan_catatan (
  id bigserial primary key, minggu text not null, teks text not null, dibuat timestamptz not null default now(), oleh text);
alter table public.iklan_bulan enable row level security;
alter table public.iklan_catatan enable row level security;
revoke all on public.iklan_bulan, public.iklan_catatan from anon, authenticated;

-- Perhitungan langsung dari data sistem untuk satu rentang tanggal.
create or replace function public._iklan_hitung(p_dari date, p_sampai date)
returns table (platform text, iklan numeric, affiliate numeric, penjualan numeric)
language sql stable security definer set search_path = public as $$
  with a as (
    select case when akun ilike 'Dana Tokopedia%' then 'TikTok/Tokopedia'
                when akun ilike 'Dana Shopee%' and keterangan !~* 'meta|eksternal' then 'Shopee'
                else 'Iklan lain (Meta, eksternal, rekening)' end p,
           case when keterangan ~* 'AMS|affiliate' then 0 else nominal end ik,
           case when keterangan ~* 'AMS|affiliate' then nominal else 0 end af
      from acc_log where kategori = 'Iklan & promosi' and coalesce(status, '') <> 'Batal' and tanggal between p_dari and p_sampai),
  j as (
    select case when platform = 'Shopee' then 'Shopee' when platform = 'Tokopedia' then 'TikTok/Tokopedia' else platform end p,
           sum(coalesce(subtotal, harga_setelah_diskon * qty)) v
      from mp_pesanan where toko = 'Official' and coalesce(status, '') !~* 'batal|cancel'
       and (waktu_dibuat at time zone 'Asia/Makassar')::date between p_dari and p_sampai group by 1)
  select x.p, coalesce(sum(a.ik), 0), coalesce(sum(a.af), 0), coalesce(max(j.v), 0)
    from (select unnest(array['Shopee', 'TikTok/Tokopedia', 'Iklan lain (Meta, eksternal, rekening)']) p) x
    left join a on a.p = x.p left join j on j.p = x.p group by x.p;
$$;
revoke all on function public._iklan_hitung(date, date) from public, anon, authenticated;

create or replace function public.iklan_baca()
returns json language plpgsql stable security definer set search_path = public as $$
declare v_hari date := (now() at time zone 'Asia/Makassar')::date; v_bulan json; v_minggu json; v_cat json; v_data json;
begin
  if not public._boleh_peran(array['kendali_bisnis']) then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  select json_agg(z order by z.bulan, z.platform) into v_bulan from (
    select bulan, platform, iklan, affiliate, penjualan, sumber from iklan_bulan
    union all
    select to_char(m, 'YYYY-MM'), h.platform, h.iklan, h.affiliate, h.penjualan, 'sistem (berjalan)'
      from generate_series(date '2026-11-01', date_trunc('month', v_hari)::date, interval '1 month') m,
           lateral public._iklan_hitung(m::date, least((m + interval '1 month - 1 day')::date, v_hari)) h
     where not exists (select 1 from iklan_bulan b where b.bulan = to_char(m, 'YYYY-MM'))) z;
  select json_agg(z order by z.mulai) into v_minggu from (
    select to_char(w, 'YYYY-MM-DD') mulai, h.platform, h.iklan, h.affiliate, h.penjualan
      from generate_series(date_trunc('week', v_hari)::date - 7 * 8, date_trunc('week', v_hari)::date - 7, interval '7 day') w,
           lateral public._iklan_hitung(w::date, (w + interval '6 day')::date) h) z;
  select json_agg(c order by c.id desc) into v_cat from (select id, minggu, teks, dibuat from iklan_catatan order by id desc limit 6) c;
  select json_build_object('iklan_terakhir', (select max(tanggal) from acc_log where kategori = 'Iklan & promosi' and coalesce(status, '') <> 'Batal'),
                           'pesanan_terakhir', (select max((waktu_dibuat at time zone 'Asia/Makassar')::date) from mp_pesanan where toko = 'Official')) into v_data;
  return json_build_object('ok', true, 'bulan', coalesce(v_bulan, '[]'), 'minggu', coalesce(v_minggu, '[]'), 'catatan', coalesce(v_cat, '[]'), 'data', v_data);
end $$;
revoke all on function public.iklan_baca() from public, anon;
grant execute on function public.iklan_baca() to authenticated;
