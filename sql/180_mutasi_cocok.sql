-- 180 (6 Nov 2026): Upload mutasi bank (PDF dibaca AI di Edge Function mutasi-baca) lalu dicocokkan otomatis dengan accounting.
-- Baris mutasi: {t:'YYYY-MM-DD', ket, v (>0), arah:'DB'|'CR'}.

create or replace function public.mutasi_cocok(p_akun text, p_rows jsonb)
returns json language plpgsql stable security definer set search_path = public as $$
declare r record; c record; pakai text[] := '{}'; hasil jsonb := '[]'; dari date; sampai date; lain jsonb;
begin
  if not public._boleh_peran(array['manajemen']) then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  if not public._acc_ada_akun(p_akun) then return json_build_object('ok', false, 'pesan', 'Akun tidak dikenal.'); end if;
  select min((e ->> 't')::date), max((e ->> 't')::date) into dari, sampai from jsonb_array_elements(p_rows) e where (e ->> 't') ~ '^\d{4}-\d{2}-\d{2}$';
  -- nominal sama, tanggal paling dekat (maks 4 hari), arah sesuai; satu catatan hanya dipakai sekali
  for r in select o - 1 i, (e ->> 't')::date t, round(public._mp_n(e ->> 'v')) v, upper(coalesce(e ->> 'arah', '')) arah, coalesce(e ->> 'ket', '') ket
             from jsonb_array_elements(p_rows) with ordinality x(e, o) where (e ->> 't') ~ '^\d{4}-\d{2}-\d{2}$' order by o loop
    select btrim(a.no) no, a.tanggal, a.jenis, a.akun, a.akun_tujuan, a.kategori, a.keterangan, a.pengisi into c
      from acc_log a
     where a.status = 'Aktif' and round(a.nominal) = r.v and a.tanggal between r.t - 4 and r.t + 4 and not (btrim(a.no) = any (pakai))
       and case when r.arah = 'DB' then (a.akun = p_akun and a.jenis in ('Keluar', 'Pindah'))
                else (a.akun = p_akun and a.jenis = 'Masuk') or (a.akun_tujuan = p_akun and a.jenis = 'Pindah') end
     order by abs(a.tanggal - r.t), a.no limit 1;
    if c.no is not null then pakai := pakai || c.no; end if;
    hasil := hasil || jsonb_build_object('i', r.i, 'st', case when c.no is null then 'belum' when c.tanggal = r.t then 'cocok' else 'geser' end,
      'no', c.no, 'tc', c.tanggal, 'jenis', c.jenis, 'kat', c.kategori, 'ket', left(coalesce(c.keterangan, ''), 140),
      'lawan', case when c.jenis = 'Pindah' then case when r.arah = 'DB' then c.akun_tujuan else c.akun end end);
  end loop;
  -- catatan accounting di periode mutasi yang tidak ada di bank
  select coalesce(jsonb_agg(jsonb_build_object('no', btrim(a.no), 't', a.tanggal, 'jenis', a.jenis, 'arah', case when a.akun = p_akun and a.jenis <> 'Masuk' then 'DB' else 'CR' end,
           'v', a.nominal, 'kat', a.kategori, 'ket', left(coalesce(a.keterangan, ''), 140), 'oleh', a.pengisi) order by a.tanggal, a.no), '[]') into lain
    from acc_log a
   where a.status = 'Aktif' and a.tanggal between dari and sampai and (a.akun = p_akun or (a.jenis = 'Pindah' and a.akun_tujuan = p_akun))
     and not (btrim(a.no) = any (pakai)) and a.jenis in ('Keluar', 'Masuk', 'Pindah');
  return json_build_object('ok', true, 'dari', dari, 'sampai', sampai, 'baris', hasil, 'lain', lain,
    'saldo', (select json_build_object('awal', saldo_awal, 'per', per_tanggal) from acc_akun where nama_akun = p_akun order by id limit 1));
end $$;

-- Catat satu baris mutasi yang belum ada di accounting. p_lawan diisi = pindah dana antar akun Moscow.
create or replace function public.mutasi_catat(p_akun text, p_t text, p_arah text, p_v numeric, p_kat text, p_ket text, p_lawan text)
returns json language plpgsql volatile security definer set search_path = public as $$
declare nomor text; v_jenis text; kat text := nullif(btrim(coalesce(p_kat, '')), ''); lawan text := nullif(btrim(coalesce(p_lawan, '')), ''); a1 text; a2 text;
begin
  if not public._boleh_peran(array['manajemen']) then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  if not public._acc_ada_akun(p_akun) then return json_build_object('ok', false, 'pesan', 'Akun tidak dikenal.'); end if;
  if coalesce(p_t, '') !~ '^\d{4}-\d{2}-\d{2}$' or not (p_v > 0) then return json_build_object('ok', false, 'pesan', 'Tanggal / nominal tidak valid.'); end if;
  if public._tb_tolak(p_t) <> '' then return json_build_object('ok', false, 'pesan', public._tb_tolak(p_t)); end if;
  if length(btrim(coalesce(p_ket, ''))) < 3 then return json_build_object('ok', false, 'pesan', 'Isi keterangan.'); end if;
  if lawan is not null then
    if not public._acc_ada_akun(lawan) or lawan = p_akun then return json_build_object('ok', false, 'pesan', 'Akun lawan tidak valid.'); end if;
    v_jenis := 'Pindah'; kat := null;
    if upper(p_arah) = 'DB' then a1 := p_akun; a2 := lawan; else a1 := lawan; a2 := p_akun; end if;
  else
    v_jenis := case when upper(p_arah) = 'DB' then 'Keluar' else 'Masuk' end; a1 := p_akun; a2 := null;
    if kat is null or not exists (select 1 from acc_kategori where acc_kategori.jenis ~* case when v_jenis = 'Keluar' then 'keluar' else 'masuk' end and acc_kategori.kategori = kat) then
      return json_build_object('ok', false, 'pesan', 'Pilih kategori ' || lower(v_jenis) || '.');
    end if;
  end if;
  perform pg_advisory_xact_lock(hashtext('staf|acc_log'));
  if exists (select 1 from acc_log where status = 'Aktif' and round(nominal) = round(p_v) and tanggal = p_t::date and akun = a1 and acc_log.jenis = v_jenis
               and coalesce(akun_tujuan, '') = coalesce(a2, '') and pengisi = 'manajemen (cocok mutasi bank)' and keterangan = left(btrim(p_ket), 190)) then
    return json_build_object('ok', false, 'pesan', 'Baris ini sudah dicatat.');
  end if;
  nomor := public._acc_no_baru();
  insert into acc_log (no, tanggal, jenis, akun, akun_tujuan, kategori, keterangan, nominal, waktu_input, pengisi, status)
  values (nomor, p_t::date, v_jenis, a1, a2, kat, left(btrim(p_ket), 190), round(p_v), now(), 'manajemen (cocok mutasi bank)', 'Aktif');
  return json_build_object('ok', true, 'no', nomor, 'pesan', 'Dicatat ' || nomor || '.');
end $$;

create or replace function public.mutasi_pilihan()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('akun', (select json_agg(nama_akun order by id) from acc_akun),
    'keluar', (select json_agg(kategori order by kategori) from acc_kategori where jenis ~* 'keluar'),
    'masuk', (select json_agg(kategori order by kategori) from acc_kategori where jenis ~* 'masuk'))
   where public._boleh_peran(array['manajemen'])
$$;
revoke all on function public.mutasi_cocok(text, jsonb) from public, anon;
revoke all on function public.mutasi_catat(text, text, text, numeric, text, text, text) from public, anon;
revoke all on function public.mutasi_pilihan() from public, anon;
grant execute on function public.mutasi_cocok(text, jsonb), public.mutasi_catat(text, text, text, numeric, text, text, text), public.mutasi_pilihan() to authenticated;
