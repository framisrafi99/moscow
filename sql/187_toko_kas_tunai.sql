-- 187 (7 Nov 2026): menu "Kas tunai" di aplikasi Toko Offline (di samping Biaya), supaya kasir tahu uang tunai yang dipegang.
--  * toko_kas(p_toko): saldo Kas Toko Offline (sama dengan hitungan Accounting) + rincian gerak bulan berjalan.
--  * Biaya yang diisi kasir Toko Offline di menu Biaya (mulai 7 Nov 2026) juga dicatat di Accounting sebagai uang keluar
--    dari Kas Toko Offline (sebelumnya tidak mengurangi kas dan tidak masuk laporan).

create or replace function public.toko_kas(p_toko text)
returns json language plpgsql stable security definer set search_path = public as $$
declare v_toko text := public._toko_akun(p_toko); v_akun text := 'Kas Toko Offline'; awal numeric; per date; v_hari date := (now() at time zone 'Asia/Makassar')::date;
  bln date := date_trunc('month', (now() at time zone 'Asia/Makassar'))::date; g jsonb; v_saldo numeric; s0 numeric;
begin
  if v_toko is null or v_toko <> 'Toko Offline' then return json_build_object('ok', false, 'pesan', 'Kas tunai hanya untuk Toko Offline.'); end if;
  select coalesce(saldo_awal, 0), coalesce(per_tanggal, '2026-10-01'::date) into awal, per from acc_akun where nama_akun = v_akun;
  with tutup as (select bulan from tutup_buku where status = 'Ditutup'),
  nota as (
    select coalesce(nullif(btrim(j.no_nota), ''), 'TANPA-NOTA|' || btrim(j.toko) || '|' || to_char(j.tanggal, 'YYYY-MM-DD')) no, min(j.tanggal) t,
           sum(coalesce(j.total, 0)) tot, max(coalesce(j.ongkir, 0)) ong
      from toko_jual_log j where j.toko ~* 'offline' and j.tanggal is not null group by 1),
  mt as (select distinct on (btrim(no_nota)) btrim(no_nota) no, lower(btrim(coalesce(metode, ''))) m from toko_nota_bayar order by btrim(no_nota), baris_sheet desc nulls first, id desc),
  ev as (
    -- penjualan tunai per nota (bulan yang belum ditutup)
    select n.t, 'Penjualan tunai ' || case when n.no like 'TANPA-NOTA|%' then '(tanpa nomor nota)' else n.no end ket, n.tot + n.ong v, 'jual' jenis
      from nota n join mt on mt.no = n.no
     where mt.m in ('tunai', 'cash') and n.t >= per and to_char(n.t, 'YYYY-MM') not in (select bulan from tutup)
    union all
    -- bulan yang sudah ditutup: potret otomatis saat tutup buku
    select (e ->> 't')::date, coalesce(e ->> 'k', 'Penjualan tunai'), (e ->> 'v')::numeric, 'jual'
      from tutup_buku b, jsonb_array_elements(case when jsonb_typeof(b.oto::jsonb) = 'array' then b.oto::jsonb else '[]'::jsonb end) e
     where b.status = 'Ditutup' and e ->> 'a' = v_akun and (e ->> 't')::date >= per
    union all
    select a.tanggal, coalesce(nullif(a.keterangan, ''), a.kategori, a.jenis),
           case when a.akun_tujuan = v_akun and a.jenis = 'Pindah' then a.nominal when a.akun = v_akun and a.jenis = 'Masuk' then a.nominal else -a.nominal end,
           case when a.jenis = 'Pindah' then 'pindah' when a.jenis = 'Masuk' then 'masuk' else 'keluar' end
      from acc_log a where a.status = 'Aktif' and a.tanggal >= per and (a.akun = v_akun or (a.jenis = 'Pindah' and a.akun_tujuan = v_akun))
  )
  select coalesce(sum(v), 0), coalesce(sum(v) filter (where t < bln), 0),
         coalesce(jsonb_agg(jsonb_build_object('t', t, 'ket', left(ket, 140), 'v', v, 'j', jenis) order by t desc, v) filter (where t >= bln), '[]')
    into v_saldo, s0, g from ev;
  return json_build_object('ok', true, 'toko', v_toko, 'hari', v_hari, 'saldo', awal + v_saldo, 'awalBulan', awal + s0, 'gerak', g,
    'waktu', to_char(now() at time zone 'Asia/Makassar', 'DD/MM/YYYY HH24:MI'));
end $$;
revoke all on function public.toko_kas(text) from public, anon;
grant execute on function public.toko_kas(text) to authenticated;

-- Biaya Toko Offline -> Accounting (uang keluar dari Kas Toko Offline).
do $$
declare d text := pg_get_functiondef('public.toko_simpan_biaya'::regproc); a text;
begin
  if position('Kas Toko Offline' in d) > 0 then return; end if;
  a := $x$  if coalesce(p_token, '') <> '' then insert into toko_token (token) values ('biaya|' || left(p_token, 60)) on conflict do nothing; end if;$x$;
  if position(a in d) = 0 then raise exception 'toko_simpan_biaya berubah'; end if;
  d := replace(d, a, a || $x$
  -- 7 Nov 2026: biaya kasir Toko Offline dibayar dari uang tunai toko -> uang keluar Kas Toko Offline di Accounting.
  if p_toko = 'Toko Offline' and public._tb_tolak(p_tanggal) = '' then
    insert into acc_log (no, tanggal, jenis, akun, kategori, keterangan, nominal, waktu_input, pengisi, status)
    values (public._acc_no_baru(), to_date(p_tanggal, 'YYYY-MM-DD'), 'Keluar', 'Kas Toko Offline', 'Biaya lain-lain',
            left('Biaya Toko Offline: ' || ket || ' (dicatat kasir di menu Biaya)', 190), nom, now(),
            'staf: ' || case when nama <> '' then nama else 'kasir Toko Offline' end, 'Aktif');
  end if;$x$);
  execute d;
end $$;
