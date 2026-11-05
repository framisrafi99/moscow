-- 165 (5 Nov 2026): kelompok Magang & DW, dan "gaji berjalan" — gaji bulan berjalan langsung terupdate setiap staf absen.
-- Aturan (manajemen Moscow Supplies):
--   Karyawan : seperti sebelumnya (telat lewat toleransi 15 mnt dipotong per menit, lembur PP 35/2021 mulai 20 mnt sesudah jam pulang,
--              alpa dipotong gaji/26 + uang makan Rp 20.000/hari, masuk di luar hari kerja dibayar gaji/26).
--   Magang   : uang saku bulanan tetap (gaji pokok di Data staf) + uang makan tetap; ikut jam kerja karyawan, TANPA potongan telat/alpa,
--              tanpa lembur.
--   DW       : upah harian (gaji pokok di Data staf = upah per hari, bawaan Rp 100.000) x hari masuk; pulang jam berapa pun;
--              tanpa uang makan, BPJS, lembur, potongan.
--   Direksi  : tidak dihitung dari absensi.
-- Gaji berjalan: setiap absen masuk/pulang, koreksi absen, dan izin yang diputus memperbarui baris Draft gaji bulan itu (gaji_log).
-- Kolom yang diubah manual di Gaji staf (uang makan / lembur / telat) tidak ditimpa (dibandingkan dengan nilai otomatis terakhir).
-- Bonus, kasbon, BPJS tidak disentuh. Gaji yang sudah Menunggu / Disetujui tidak diubah. Tiap malam 00.05 WITA dihitung ulang (alpa).

create table if not exists public.gaji_atur (kunci text primary key, nilai jsonb not null, diubah timestamptz not null default now(), oleh text);
alter table public.gaji_atur enable row level security;
insert into public.gaji_atur (kunci, nilai) values ('libur', '[0]') on conflict do nothing;
alter table public.gaji_log add column if not exists otomatis jsonb;

-- Statistik absensi satu bulan per staf (hanya hari yang sudah lewat / hari ini).
create or replace function public._gaji_absen_stat(p_per text, p_nama text default null)
returns setof jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare
  a date := to_date(p_per || '-01', 'YYYY-MM-DD'); b date := (to_date(p_per || '-01', 'YYYY-MM-DD') + interval '1 month')::date;
  hari date := (now() at time zone 'Asia/Makassar')::date; libur int[]; merah int[]; s record; d date; dow int; h record; iz text;
  jm int; jp int; lib boolean; luar boolean; ms int; pl int; r jsonb; baris jsonb; t int; l int;
  v_hadir int; v_kerja int; v_alpa int; v_izin int; v_kurang int; v_th int; v_tm int; v_lh int; v_lm int; v_l15 int; v_l2 int; v_ml int; v_dw int; v_lib int; v_hari jsonb;
begin
  select coalesce(array(select jsonb_array_elements_text(nilai)::int), '{0}') into libur from gaji_atur where kunci = 'libur';
  libur := coalesce(libur, '{0}');
  select coalesce(array(select jsonb_array_elements_text(nilai)::int), '{}') into merah from gaji_atur where kunci = 'merah:' || p_per;
  merah := coalesce(merah, '{}');
  for s in select st.id, st.nama, st.jam_masuk, st.jam_pulang, st.hari_kerja from absen_staf st
            where (st.aktif or exists (select 1 from absen_hari x where x.staf_id = st.id and x.tanggal >= a and x.tanggal < b))
              and (p_nama is null or lower(btrim(st.nama)) = lower(btrim(p_nama))) order by st.nama loop
    jm := coalesce(extract(hour from s.jam_masuk) * 60 + extract(minute from s.jam_masuk), 600);
    jp := coalesce(extract(hour from s.jam_pulang) * 60 + extract(minute from s.jam_pulang), 1020);
    v_hadir := 0; v_kerja := 0; v_alpa := 0; v_izin := 0; v_kurang := 0; v_th := 0; v_tm := 0; v_lh := 0; v_lm := 0; v_l15 := 0; v_l2 := 0; v_ml := 0; v_dw := 0; v_lib := 0; v_hari := '[]';
    d := a;
    while d < b and d <= hari loop
      if exists (select 1 from absen_uji u where u.tanggal = d) then d := d + 1; continue; end if;
      dow := extract(dow from d)::int;
      luar := s.hari_kerja is not null and not (dow = any (s.hari_kerja));
      lib := dow = any (libur) or extract(day from d)::int = any (merah) or luar;
      select x.masuk, x.pulang into h from absen_hari x where x.staf_id = s.id and x.tanggal = d;
      ms := case when h.masuk is null then null else (extract(hour from h.masuk at time zone 'Asia/Makassar') * 60 + extract(minute from h.masuk at time zone 'Asia/Makassar'))::int end;
      pl := case when h.pulang is null then null else (extract(hour from h.pulang at time zone 'Asia/Makassar') * 60 + extract(minute from h.pulang at time zone 'Asia/Makassar'))::int end;
      if not lib then v_kerja := v_kerja + 1; end if;
      baris := jsonb_build_object('tg', d, 'd', extract(day from d)::int, 'dow', dow, 'libur', lib, 'masuk', ms, 'pulang', pl, 'telat', 0, 'lembur', 0, 'ket', '');
      if ms is null and pl is null then
        select i.jenis into iz from absen_izin i where i.staf_id = s.id and i.status = 'disetujui' and d between i.mulai and i.selesai limit 1;
        if not lib and iz is not null then
          v_izin := v_izin + 1; v_hari := v_hari || (baris || jsonb_build_object('ket', initcap(iz) || ' (disetujui)'));
        elsif not lib and d < hari then
          v_alpa := v_alpa + 1; v_hari := v_hari || (baris || jsonb_build_object('ket', 'Tidak absen'));
        end if;
        iz := null; d := d + 1; continue;
      end if;
      v_dw := v_dw + 1;
      if ms is null or pl is null then
        if not (pl is null and d = hari) then
          v_kurang := v_kurang + 1; baris := baris || jsonb_build_object('ket', case when pl is null then 'Tidak absen pulang' else 'Tidak absen masuk' end);
        end if;
      end if;
      if lib and luar and not (dow = any (libur)) and not (extract(day from d)::int = any (merah)) and ms is not null then
        v_ml := v_ml + 1;
        v_hari := v_hari || (baris || jsonb_build_object('ket', ltrim(coalesce(baris ->> 'ket', '') || '; ', '; ') || 'Masuk di luar hari kerja: upah 1 hari'));
        d := d + 1; continue;
      end if;
      if lib then
        v_lib := v_lib + 1; v_hari := v_hari || (baris || jsonb_build_object('ket', ltrim(coalesce(baris ->> 'ket', '') || '; ', '; ') || 'Hari libur (tidak dihitung lembur)'));
        d := d + 1; continue;
      end if;
      v_hadir := v_hadir + 1;
      t := 0; l := 0;
      if ms is not null and ms > jm + 15 then t := ms - jm; v_th := v_th + 1; v_tm := v_tm + t; end if;
      if pl is not null and pl > jp + 20 then
        l := pl - (jp + 20); v_lh := v_lh + 1; v_lm := v_lm + l; v_l15 := v_l15 + least(l, 60); v_l2 := v_l2 + greatest(l - 60, 0);
      end if;
      if t > 0 or l > 0 or baris ->> 'ket' <> '' then v_hari := v_hari || (baris || jsonb_build_object('telat', t, 'lembur', l)); end if;
      d := d + 1;
    end loop;
    return next jsonb_build_object('nama', s.nama, 'hadir', v_hadir, 'kerja', v_kerja, 'alpa', v_alpa, 'izin', v_izin, 'kurang', v_kurang,
      'telatHari', v_th, 'telatMenit', v_tm, 'lemburHari', v_lh, 'lemburMenit', v_lm, 'lembur15', v_l15, 'lembur2', v_l2,
      'masukLibur', v_ml, 'masukHari', v_dw, 'libur', v_lib, 'hari', v_hari, 'sampai', least(b - 1, hari));
  end loop;
end $$;

-- Uang dari statistik: sama persis dengan Payroll › Hitung absensi (absen.js).
create or replace function public._gaji_uang(st jsonb, p_kel text, p_gp numeric, p_um numeric, p_alpa int default null)
returns jsonb language plpgsql stable set search_path to 'public' as $$
declare kel text := coalesce(nullif(p_kel, ''), 'Karyawan'); gp numeric := coalesce(p_gp, 0); alpa int := coalesce(p_alpa, (st ->> 'alpa')::int, 0);
  telat numeric; lembur numeric; ml numeric; alpa_rp numeric; um numeric;
begin
  if kel = 'DW' then
    return jsonb_build_object('gp', round(gp * coalesce((st ->> 'masukHari')::int, 0)), 'um', 0, 'lb', 0, 'tl', 0,
      'cat', 'Absensi: masuk ' || coalesce((st ->> 'masukHari')::int, 0) || ' hari x Rp ' || public._gd_fmt(gp) || ' (DW)');
  end if;
  if kel = 'Magang' then
    return jsonb_build_object('gp', gp, 'um', coalesce(p_um, 0), 'lb', 0, 'tl', 0,
      'cat', 'Absensi: hadir ' || coalesce((st ->> 'hadir')::int, 0) || ' hari (magang, tanpa potongan)');
  end if;
  telat := gp / 26 / 8 / 60 * coalesce((st ->> 'telatMenit')::int, 0);
  lembur := gp / 173 * (1.5 * coalesce((st ->> 'lembur15')::numeric, 0) / 60 + 2 * coalesce((st ->> 'lembur2')::numeric, 0) / 60);
  ml := gp / 26 * coalesce((st ->> 'masukLibur')::int, 0);
  alpa_rp := gp / 26 * alpa;
  um := case when coalesce(p_um, 0) > 0 then greatest(0, 20000 * (26 - alpa)) else 0 end;
  return jsonb_build_object('gp', gp, 'um', um, 'lb', round(lembur + ml), 'tl', round(telat + alpa_rp),
    'cat', left('Absensi: telat ' || coalesce((st ->> 'telatMenit')::int, 0) || ' mnt, alpa ' || alpa || ' hr (Rp ' || public._gd_fmt(round(alpa_rp)) || '), lembur '
      || coalesce((st ->> 'lemburMenit')::int, 0) || ' mnt'
      || case when coalesce((st ->> 'masukLibur')::int, 0) > 0 then ', masuk di luar hari kerja ' || (st ->> 'masukLibur') || ' hr (Rp ' || public._gd_fmt(round(ml)) || ')' else '' end, 200));
end $$;

-- Perbarui baris Draft gaji bulan p_per untuk satu staf (atau semua staf absensi kalau p_nama null).
create or replace function public._gaji_berjalan_segarkan(p_per text, p_nama text default null)
returns int language plpgsql security definer set search_path to 'public' as $$
declare st jsonb; g record; l record; u jsonb; o jsonb; n int := 0; v_gp numeric; v_um numeric; v_lb numeric; v_tl numeric; v_cat text; ub text[];
  status_per text;
begin
  if coalesce(p_per, '') !~ '^\d{4}-(0[1-9]|1[0-2])$' then return 0; end if;
  perform pg_advisory_xact_lock(hashtext('staf|gaji_log'));
  select public._gj_status(array_agg(z.st)) into status_per from public._gj_log() z where z.per = p_per and z.st <> 'Ditolak';
  if status_per in ('Menunggu', 'Disetujui') then return 0; end if;
  for st in select * from public._gaji_absen_stat(p_per, p_nama) loop
    select * into g from public._gj_staf() z where lower(btrim(z.n)) = lower(btrim(st ->> 'nama')) order by z.aktif desc, z.u desc limit 1;
    if g.n is null or g.kel = 'Direksi' then g := null; continue; end if;
    u := public._gaji_uang(st, g.kel, g.gp, g.um);
    select gl.id, gl.baris_sheet, gl.uang_makan, gl.lembur, gl.telat, gl.gaji_pokok, gl.bonus, gl.bpjs_karyawan, gl.kasbon, gl.catatan, gl.otomatis, gl.status
      into l from gaji_log gl
     where public._gj_per(gl.periode) = p_per and lower(btrim(gl.nama)) = lower(btrim(g.n)) and coalesce(gl.status, 'Draft') <> 'Ditolak'
     order by gl.baris_sheet nulls last, gl.id desc limit 1;
    if l.id is null then
      if not ((st ->> 'hadir')::int > 0 or (st ->> 'masukHari')::int > 0 or (st ->> 'alpa')::int > 0) then g := null; continue; end if;
      insert into gaji_log (periode, nama, divisi, gaji_pokok, uang_makan, lembur, bonus, bpjs_karyawan, bpjs_ditanggung_pt, telat, kasbon, thp,
                            status, diisi_oleh, waktu_isi, catatan, kelompok, otomatis)
      values (p_per, g.n, nullif(g.div, ''), (u ->> 'gp')::numeric, (u ->> 'um')::numeric, (u ->> 'lb')::numeric, 0,
              case when g.kel = 'DW' then 0 else g.bk end, case when g.kel = 'DW' then 0 else g.bp end, (u ->> 'tl')::numeric, 0,
              (u ->> 'gp')::numeric + (u ->> 'um')::numeric + (u ->> 'lb')::numeric - case when g.kel = 'DW' then 0 else g.bk end - (u ->> 'tl')::numeric,
              'Draft', 'Otomatis (absensi)', now(), u ->> 'cat', g.kel, u);
      n := n + 1;
    else
      o := l.otomatis;
      -- kolom yang sudah diubah manual (beda dari nilai otomatis terakhir) dibiarkan
      v_gp := case when o is null or l.gaji_pokok = (o ->> 'gp')::numeric then (u ->> 'gp')::numeric else l.gaji_pokok end;
      v_um := case when o is null or l.uang_makan = (o ->> 'um')::numeric then (u ->> 'um')::numeric else l.uang_makan end;
      v_lb := case when o is null or l.lembur = (o ->> 'lb')::numeric then (u ->> 'lb')::numeric else l.lembur end;
      v_tl := case when o is null or l.telat = (o ->> 'tl')::numeric then (u ->> 'tl')::numeric else l.telat end;
      v_cat := btrim(regexp_replace(coalesce(l.catatan, ''), '^\s*Absensi:[^|]*(\|\s*)?', ''));
      v_cat := left(u ->> 'cat' || case when v_cat <> '' then ' | ' || v_cat else '' end, 200);
      if v_gp is distinct from l.gaji_pokok or v_um is distinct from l.uang_makan or v_lb is distinct from l.lembur or v_tl is distinct from l.telat
         or v_cat is distinct from l.catatan or o is distinct from u then
        if l.baris_sheet is not null then
          perform public._ubah_catat('gaji_log', l.id, array['gaji_pokok', 'uang_makan', 'lembur', 'telat', 'thp', 'catatan', 'kelompok']);
        end if;
        update gaji_log set gaji_pokok = v_gp, uang_makan = v_um, lembur = v_lb, telat = v_tl, catatan = v_cat, kelompok = g.kel,
               thp = v_gp + v_um + v_lb + coalesce(bonus, 0) - coalesce(bpjs_karyawan, 0) - v_tl - coalesce(kasbon, 0), otomatis = u
         where id = l.id;
        n := n + 1;
      end if;
    end if;
    g := null; l := null;
  end loop;
  return n;
end $$;
revoke all on function public._gaji_absen_stat(text, text) from public, anon, authenticated;
revoke all on function public._gaji_berjalan_segarkan(text, text) from public, anon, authenticated;

-- Pemicu: absen masuk / pulang / koreksi, dan izin yang diputus. Tidak pernah menggagalkan absen.
create or replace function public._absen_ke_gaji() returns trigger language plpgsql security definer set search_path to 'public' as $$
declare nm text; per text; tg date; m date;
begin
  begin
    if tg_table_name = 'absen_hari' then
      select nama into nm from absen_staf where id = new.staf_id;
      perform public._gaji_berjalan_segarkan(to_char(new.tanggal, 'YYYY-MM'), nm);
    elsif tg_table_name = 'absen_izin' then
      select nama into nm from absen_staf where id = new.staf_id;
      m := date_trunc('month', new.mulai)::date;
      while m <= new.selesai loop perform public._gaji_berjalan_segarkan(to_char(m, 'YYYY-MM'), nm); m := (m + interval '1 month')::date; end loop;
    end if;
  exception when others then
    insert into robot_log (jenis, detik, hasil) values ('gaji_berjalan', 0, jsonb_build_object('galat', sqlerrm, 'tabel', tg_table_name));
  end;
  return null;
end $$;
revoke all on function public._absen_ke_gaji() from public, anon, authenticated;
create or replace trigger absen_hari_ke_gaji after insert or update of masuk, pulang on public.absen_hari for each row execute function public._absen_ke_gaji();
create or replace trigger absen_izin_ke_gaji after insert or update of status, mulai, selesai on public.absen_izin for each row execute function public._absen_ke_gaji();

-- Pengaturan libur rutin & tanggal merah (Payroll › Hitung absensi). Mengubahnya langsung menghitung ulang gaji bulan itu.
create or replace function public.gaji_atur_baca(p_per text)
returns json language plpgsql stable security definer set search_path to 'public' as $$
begin
  if (select public.peran_saya()) is null or not ((select public.peran_saya()) = any (array['manajemen', 'payroll'])) then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  return json_build_object('ok', true, 'libur', coalesce((select nilai from gaji_atur where kunci = 'libur'), '[0]'),
    'merah', coalesce((select nilai from gaji_atur where kunci = 'merah:' || p_per), '[]'));
end $$;
create or replace function public.gaji_atur_simpan(p_per text, p_libur jsonb, p_merah jsonb)
returns json language plpgsql security definer set search_path to 'public' as $$
declare lb jsonb; mr jsonb; n int;
begin
  if (select public.peran_saya()) is null or not ((select public.peran_saya()) = any (array['manajemen', 'payroll'])) then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  if coalesce(p_per, '') !~ '^\d{4}-(0[1-9]|1[0-2])$' then return json_build_object('ok', false, 'pesan', 'Periode tidak valid.'); end if;
  select coalesce(jsonb_agg(distinct v::int order by v::int), '[]') into lb from jsonb_array_elements_text(case when jsonb_typeof(p_libur) = 'array' then p_libur else '[]' end) v where v ~ '^[0-6]$';
  select coalesce(jsonb_agg(distinct v::int order by v::int), '[]') into mr from jsonb_array_elements_text(case when jsonb_typeof(p_merah) = 'array' then p_merah else '[]' end) v where v ~ '^\d{1,2}$' and v::int between 1 and 31;
  insert into gaji_atur (kunci, nilai, diubah, oleh) values ('libur', lb, now(), lower(coalesce(auth.jwt() ->> 'email', '')))
    on conflict (kunci) do update set nilai = excluded.nilai, diubah = now(), oleh = excluded.oleh;
  insert into gaji_atur (kunci, nilai, diubah, oleh) values ('merah:' || p_per, mr, now(), lower(coalesce(auth.jwt() ->> 'email', '')))
    on conflict (kunci) do update set nilai = excluded.nilai, diubah = now(), oleh = excluded.oleh;
  n := public._gaji_berjalan_segarkan(p_per, null);
  return json_build_object('ok', true, 'libur', lb, 'merah', mr, 'pesan', 'Pengaturan tersimpan. ' || n || ' baris gaji berjalan diperbarui.');
end $$;
-- Statistik + uang untuk menu Hitung absensi (sumber: aplikasi Absensi).
create or replace function public.gaji_absen_hitung(p_per text)
returns json language plpgsql stable security definer set search_path to 'public' as $$
begin
  if (select public.peran_saya()) is null or not ((select public.peran_saya()) = any (array['manajemen', 'payroll'])) then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  if coalesce(p_per, '') !~ '^\d{4}-(0[1-9]|1[0-2])$' then return json_build_object('ok', false, 'pesan', 'Periode tidak valid.'); end if;
  return json_build_object('ok', true, 'per', p_per,
    'libur', coalesce((select nilai from gaji_atur where kunci = 'libur'), '[0]'), 'merah', coalesce((select nilai from gaji_atur where kunci = 'merah:' || p_per), '[]'),
    'uji', coalesce((select jsonb_agg(jsonb_build_object('tanggal', tanggal, 'keterangan', keterangan)) from absen_uji where to_char(tanggal, 'YYYY-MM') = p_per), '[]'),
    'staf', coalesce((select jsonb_agg(x || coalesce((select jsonb_build_object('kel', g.kel, 'upah', g.gp, 'umStaf', g.um) from public._gj_staf() g
                                                       where lower(btrim(g.n)) = lower(btrim(x ->> 'nama')) order by g.aktif desc, g.u desc limit 1), '{}'))
                      from public._gaji_absen_stat(p_per, null) x), '[]'));
end $$;
create or replace function public.gaji_berjalan_hitung(p_per text)
returns json language plpgsql security definer set search_path to 'public' as $$
declare n int;
begin
  if (select public.peran_saya()) is null or not ((select public.peran_saya()) = any (array['manajemen', 'payroll'])) then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  n := public._gaji_berjalan_segarkan(p_per, null);
  return json_build_object('ok', true, 'pesan', n || ' baris gaji berjalan diperbarui dari absensi.');
end $$;
revoke all on function public.gaji_atur_baca(text) from public, anon;
revoke all on function public.gaji_atur_simpan(text, jsonb, jsonb) from public, anon;
revoke all on function public.gaji_absen_hitung(text) from public, anon;
revoke all on function public.gaji_berjalan_hitung(text) from public, anon;
grant execute on function public.gaji_atur_baca(text), public.gaji_atur_simpan(text, jsonb, jsonb), public.gaji_absen_hitung(text), public.gaji_berjalan_hitung(text) to authenticated;

-- Hitung ulang tiap malam 00.05 WITA (hari tanpa absen jadi alpa; tanggal 1 menutup bulan lalu).
select cron.schedule('gaji-berjalan', '5 16 * * *', $c$
  select public._gaji_berjalan_segarkan(to_char((now() at time zone 'Asia/Makassar')::date - 1, 'YYYY-MM'));
  select public._gaji_berjalan_segarkan(to_char((now() at time zone 'Asia/Makassar')::date, 'YYYY-MM'));
$c$);

-- Data staf: kelompok hanya Karyawan / Magang / DW / Direksi.
do $$
declare d text := pg_get_functiondef('public.gaji_staf_ubah(jsonb)'::regprocedure); a text := d;
begin
  d := replace(d, $q$  perform pg_advisory_xact_lock(hashtext('gaji|gaji_staf'));$q$,
    $q$  if btrim(coalesce(p->>'kelompok', '')) <> '' and btrim(p->>'kelompok') not in ('Karyawan', 'Magang', 'DW', 'Direksi') then
    return json_build_object('ok', false, 'pesan', 'Kelompok harus Karyawan, Magang, DW, atau Direksi.');
  end if;
  perform pg_advisory_xact_lock(hashtext('gaji|gaji_staf'));$q$);
  if d = a then raise exception 'gaji_staf_ubah tidak berubah'; end if;
  execute d;
end $$;

-- Gaji staf: DW memakai total upah harian dari absensi (item gp); baris baru DW tanpa absen = Rp 0.
do $$
declare d text := pg_get_functiondef('public.gaji_simpan(text,text,boolean,boolean,boolean,jsonb,text)'::regprocedure); a text := d;
begin
  d := replace(d, $q$'gp', case when l.n is not null then l.gp else s.gp end,$q$,
    $q$'gp', case when coalesce(s.kel, l.kel) = 'DW' and it ? 'gp' and public._gj_int(it -> 'gp') is not null then public._gj_int(it -> 'gp') when l.n is not null then l.gp else s.gp end,$q$);
  if d = a then raise exception 'gaji_simpan tidak berubah'; end if;
  execute d;
  d := pg_get_functiondef('public.gaji_data(text)'::regprocedure); a := d;
  d := replace(d, $q$select 1, s.u, jsonb_build_object('n', s.n, 'div', s.div, 'kel', s.kel, 'gp', s.gp, 'um', s.um,$q$,
    $q$select 1, s.u, jsonb_build_object('n', s.n, 'div', s.div, 'kel', s.kel, 'gp', case when s.kel = 'DW' then 0 else s.gp end, 'um', case when s.kel = 'DW' then 0 else s.um end,$q$);
  d := replace(d, $q$'thp', s.gp + s.um - s.bk,$q$, $q$'thp', case when s.kel = 'DW' then 0 else s.gp + s.um - s.bk end, 'upah', s.gp,$q$);
  d := replace(d, $q$'wa', coalesce((select public._gj_wa(s.wa) from s where s.n = l.n order by s.u limit 1), ''))$q$,
    $q$'wa', coalesce((select public._gj_wa(s.wa) from s where s.n = l.n order by s.u limit 1), ''), 'upah', coalesce((select s.gp from s where s.n = l.n order by s.u limit 1), l.gp))$q$);
  if d = a then raise exception 'gaji_data tidak berubah'; end if;
  execute d;
end $$;
