-- 176 (6 Nov 2026): HPP barang terjual per saluran untuk laba rugi di laporan konsultan pajak.
--  qty terjual (Official via mp_padanan, consignment & toko offline via toko_jual_log, reseller via order_log) x HPP produk (hasil_hitung 'hpp').
--  Barang tanpa padanan kode / tanpa HPP dilaporkan terpisah (nilai jual), tidak ditebak.
create or replace function public.laporan_hpp_jual(p_bulan text)
returns json language plpgsql stable security definer set search_path = public as $$
declare dari timestamptz; sampai timestamptz; d1 date; d2 date; h jsonb;
begin
  if (select public.peran_saya()) is distinct from 'manajemen' then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  if coalesce(p_bulan, '') !~ '^\d{4}-(0[1-9]|1[0-2])$' then return json_build_object('ok', false, 'pesan', 'Bulan tidak valid.'); end if;
  d1 := (p_bulan || '-01')::date; d2 := (d1 + interval '1 month')::date;
  dari := d1::timestamp at time zone 'Asia/Makassar'; sampai := d2::timestamp at time zone 'Asia/Makassar';
  h := coalesce((select data::jsonb -> 'hpp' from hasil_hitung where kunci = 'hpp'), '{}'::jsonb);
  return (with jual as (
      select 'Official ' || o.platform s, p.kode k, o.nama_produk n, greatest(o.qty - coalesce(o.qty_return, 0), 0) q,
             case when o.qty > 0 then coalesce(o.subtotal, 0) * greatest(o.qty - coalesce(o.qty_return, 0), 0) / o.qty else 0 end v
        from mp_pesanan o
        left join (select distinct on (kunci) kunci, kode, st from (
                select upper(public._mp_t(nama_produk, 250) || '|' || public._mp_t(coalesce(variasi, ''), 120)) kunci, upper(trim(kode)) kode,
                       coalesce(nullif(trim(status), ''), 'Dikonfirmasi') st, baris_sheet, id from mp_padanan) x
              order by kunci, baris_sheet desc nulls first, id desc) p
          on p.kunci = upper(public._mp_t(o.nama_produk, 250) || '|' || public._mp_t(coalesce(o.variasi, ''), 120)) and p.st = 'Dikonfirmasi'
       where o.toko = 'Official' and o.waktu_dibuat >= dari and o.waktu_dibuat < sampai and coalesce(o.status, '') !~* '(batal|cancel|belum bayar|unpaid)'
      union all
      select t.toko, upper(trim(t.kode)), t.nama_barang, t.qty_terjual, t.total from toko_jual_log t
       where t.tanggal >= d1 and t.tanggal < d2 and t.toko !~* '\((batal|arsip)'
      union all
      select 'Reseller', upper(trim(r.kode)), r.nama, r.qty, r.total from order_log r
       where r.tipe = 'Reseller' and r.status ~* '^(dikirim|selesai)$' and r.tanggal >= d1 and r.tanggal < d2),
    nilai as (select s, k, n, q, v, coalesce(nullif(h ->> k, ''), nullif(h ->> split_part(k, '-', 1), ''))::numeric hp from jual where q <> 0)
    select json_build_object('ok', true, 'bulan', p_bulan,
      'saluran', coalesce((select json_agg(json_build_object('s', s, 'q', q, 'hpp', round(hpp), 'jual', round(jual), 'tanpa_q', tq, 'tanpa_v', round(tv)) order by s) from (
          select s, sum(q) q, sum(case when hp > 0 then q * hp else 0 end) hpp, sum(v) jual,
                 sum(case when hp > 0 then 0 else q end) tq, sum(case when hp > 0 then 0 else v end) tv from nilai group by s) z), '[]'),
      'tanpa', coalesce((select json_agg(json_build_object('s', s, 'k', k, 'n', n, 'q', q, 'v', round(v)) order by v desc) from (
          select s, k, max(n) n, sum(q) q, sum(v) v from nilai where not coalesce(hp > 0, false) group by s, k, case when k is null then n end order by sum(v) desc limit 25) z), '[]')));
end $$;
revoke all on function public.laporan_hpp_jual(text) from public, anon;
grant execute on function public.laporan_hpp_jual(text) to authenticated;
