-- 116: Master Data › Titipan staf (ttpPemilikData, file 39) dihitung langsung di Supabase (sebelumnya potret md:titip dari Apps Script).
create or replace function public.ttp_pemilik_data(p_toko text, p_bulan text)
returns json language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare v_toko text := public._ttp_t(p_toko, 60); bulan text := public._ttp_t(p_bulan, 7); stok jsonb; per jsonb; tot jsonb; jual jsonb;
begin
  if (select public.peran_saya()) is distinct from 'manajemen' then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  if v_toko is distinct from 'Consignment Medan' then v_toko := 'Consignment Medan'; end if;
  if bulan !~ '^\d{4}-(0[1-9]|1[0-2])$' then bulan := to_char(now() at time zone 'Asia/Makassar', 'YYYY-MM'); end if;
  stok := public._ttp_stok(v_toko);
  select coalesce(jsonb_agg(jsonb_build_object('k', k, 'n', n, 'q', q, 'omzet', omzet, 'hpp', hpp) order by omzet desc, fi), '[]'::jsonb),
         jsonb_build_object('pcs', coalesce(sum(q), 0), 'omzet', coalesce(sum(omzet), 0), 'hpp', coalesce(sum(hpp), 0),
                            'laba', coalesce(sum(omzet), 0) - coalesce(sum(hpp), 0)),
         coalesce(jsonb_object_agg(k, q), '{}'::jsonb)
    into per, tot, jual
    from (select k, (array_agg(n order by i))[1] n, sum(q) q, sum(q * h) omzet, sum(q * hpp) hpp, min(i) fi
            from public._ttp_log() where toko = v_toko and j = 'JUAL' and left(t, 7) = bulan group by k) z;
  return json_build_object('ok', true, 'toko', v_toko, 'daftarToko', json_build_array('Consignment Medan'), 'bulan', bulan,
    'ajuanBrg', (select coalesce(json_agg(json_build_object('k', b.k, 'n', b.n, 'hpp', b.hpp, 'h', b.h, 'oleh', public._ttp_t(x.diajukan_oleh, 60), 'wa', b.wa,
                                                             'awal', b.awal, 'c', b.c) order by b.i), '[]'::json)
                   from public._ttp_brg() b join (select row_number() over (order by baris_sheet nulls last, id) i, diajukan_oleh from ttp_barang) x on x.i = b.i
                  where b.toko = v_toko and b.st = 'Menunggu'),
    'ajuanStok', (select coalesce(json_agg(json_build_object('no', l.no, 'k', l.k, 'n', l.n, 'q', l.q, 'oleh', l.oleh, 'wm', x.wm, 'c', l.c) order by l.i), '[]'::json)
                    from public._ttp_log() l join (select row_number() over (order by baris_sheet nulls last, id) i,
                                                          coalesce(to_char(waktu_masuk at time zone 'Asia/Makassar', 'YYYY-MM-DD HH24:MI'), '') wm from ttp_log) x on x.i = l.i
                   where l.toko = v_toko and l.j = 'MASUK' and l.st = 'Menunggu'),
    'barang', (select coalesce(json_agg(json_build_object('k', k, 'n', n, 'hpp', hpp, 'h', h, 'st', st, 'stok', coalesce((stok ->> k)::numeric, 0),
                                                           'jual', coalesce((jual ->> k)::numeric, 0)) order by i), '[]'::json)
                 from public._ttp_brg() where toko = v_toko and st in ('Aktif', 'Nonaktif')),
    'ringkas', json_build_object('bulan', bulan, 'tot', tot, 'per', per),
    'riwayat', (select coalesce(json_agg(json_build_object('no', no, 't', t, 'j', j, 'k', k, 'n', n, 'q', q, 'h', h, 'st', st, 'oleh', oleh) order by i desc), '[]'::json)
                  from (select * from public._ttp_log() where toko = v_toko order by i desc limit 80) z));
end $$;
revoke all on function public.ttp_pemilik_data(text, text) from public, anon;
grant execute on function public.ttp_pemilik_data(text, text) to authenticated;
select 'ok116' ok;
