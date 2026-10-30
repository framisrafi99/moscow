-- =====================================================================
-- ABSENSI STAF (absensi.html + Payroll › Absensi staf)
-- Jalankan sekali di Supabase: SQL Editor > New query > tempel semua > Run.
-- Aman dijalankan ulang (memakai "if not exists" / "or replace").
--
-- Staf absen masuk & pulang dari HP: lokasi GPS + selfie, jam diambil dari server.
-- Hanya staf Moscow (consignment tidak). Lokasi: Kerobokan dan Gunung Agung.
-- Semua tulis-baca lewat fungsi (RPC) di bawah; tabelnya tidak bisa dibuka langsung.
-- Rekap bulanan dibaca form Payroll (absen_rekap) untuk hitung telat, lembur, alpa.
-- =====================================================================

-- 1. Peran baru "staf" (hanya absensi) untuk staf yang belum punya peran lain.
do $$
declare c record; daftar text;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class t on t.oid = con.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public' and t.relname = 'pengguna' and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%peran%'
  loop
    execute format('alter table public.pengguna drop constraint %I', c.conname);
  end loop;
  -- daftar lama + semua peran yang sudah terpakai + 'staf'
  select string_agg(quote_literal(p), ', ') into daftar from (
    select unnest(array['manajemen', 'kendali_bisnis', 'accounting', 'gudang', 'purchasing_shopeepay', 'produksi',
                        'bahan_baku', 'payroll', 'toko', 'kreatif_manager', 'kreatif', 'staf']) as p
    union select distinct peran from public.pengguna where peran is not null
  ) x;
  execute 'alter table public.pengguna add constraint pengguna_peran_check check (peran in (' || daftar || ')) not valid';
end $$;

-- 2. Tabel
create table if not exists public.absen_lokasi (
  id bigint generated always as identity primary key,
  nama text not null unique,
  lat double precision,
  lng double precision,
  radius_m int not null default 100 check (radius_m between 20 and 1000),
  aktif boolean not null default true,
  diubah timestamptz not null default now()
);
insert into public.absen_lokasi (nama) values ('Kerobokan'), ('Gunung Agung') on conflict (nama) do nothing;

-- nama = sama persis dengan nama staf di Payroll (dipakai untuk mencocokkan gaji).
create table if not exists public.absen_staf (
  id bigint generated always as identity primary key,
  nama text not null unique,
  email text unique,
  lokasi_id bigint references public.absen_lokasi (id),
  aktif boolean not null default true,
  dibuat timestamptz not null default now()
);

-- Satu baris per staf per hari (tanggal WITA).
create table if not exists public.absen_hari (
  id bigint generated always as identity primary key,
  staf_id bigint not null references public.absen_staf (id) on delete cascade,
  tanggal date not null,
  masuk timestamptz,
  masuk_lat double precision, masuk_lng double precision, masuk_akurasi real, masuk_jarak int, masuk_foto text,
  pulang timestamptz,
  pulang_lat double precision, pulang_lng double precision, pulang_akurasi real, pulang_jarak int, pulang_foto text,
  koreksi boolean not null default false,
  catatan text,
  diubah timestamptz not null default now(),
  unique (staf_id, tanggal)
);
create index if not exists absen_hari_tanggal on public.absen_hari (tanggal);

create table if not exists public.absen_izin (
  id bigint generated always as identity primary key,
  staf_id bigint not null references public.absen_staf (id) on delete cascade,
  jenis text not null check (jenis in ('izin', 'cuti', 'sakit')),
  mulai date not null,
  selesai date not null,
  alasan text not null,
  status text not null default 'menunggu' check (status in ('menunggu', 'disetujui', 'ditolak', 'batal')),
  diajukan timestamptz not null default now(),
  diputus_oleh text,
  diputus timestamptz,
  catatan_putus text,
  check (selesai >= mulai)
);
create index if not exists absen_izin_staf on public.absen_izin (staf_id, mulai);

-- Catatan: percobaan absen yang ditolak (di luar lokasi dsb.), koreksi manajemen, pendaftaran.
create table if not exists public.absen_log (
  id bigint generated always as identity primary key,
  staf_id bigint references public.absen_staf (id) on delete set null,
  tanggal date,
  aksi text not null,
  isi jsonb,
  oleh text default auth.email(),
  waktu timestamptz not null default now()
);
create index if not exists absen_log_tanggal on public.absen_log (tanggal);

-- Hari uji coba: absen tetap tercatat dan diberi keterangan, tapi tidak dihitung ke gaji.
create table if not exists public.absen_uji (
  tanggal date primary key,
  keterangan text not null default 'Uji coba absen aplikasi Moscow'
);

-- Tidak ada akses langsung ke tabel: hanya lewat fungsi di bawah.
alter table public.absen_lokasi enable row level security;
alter table public.absen_staf enable row level security;
alter table public.absen_hari enable row level security;
alter table public.absen_izin enable row level security;
alter table public.absen_log enable row level security;
alter table public.absen_uji enable row level security;
revoke all on public.absen_lokasi, public.absen_staf, public.absen_hari, public.absen_izin, public.absen_log, public.absen_uji from anon, authenticated;

-- 3. Penyimpanan foto selfie (privat, maks 1 MB, JPEG). Folder = id akun staf.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('absen', 'absen', false, 1048576, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = 1048576, allowed_mime_types = array['image/jpeg'];

-- 4. Fungsi bantu
create or replace function public.absen_kelola() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.peran_saya() in ('manajemen', 'kendali_bisnis'), false)
$$;

create or replace function public.absen_jarak(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision language sql immutable as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)))
$$;

create or replace function public.absen_hari_ini() returns date
language sql stable as $$ select (now() at time zone 'Asia/Makassar')::date $$;

create or replace function public.absen_jam(t timestamptz) returns text
language sql stable as $$ select to_char(t at time zone 'Asia/Makassar', 'HH24.MI') $$;

create or replace function public.absen_uji_ket(d date) returns text
language sql stable security definer set search_path = public as $$
  select keterangan from public.absen_uji where tanggal = d
$$;

create or replace function public.absen_staf_saya() returns public.absen_staf
language sql stable security definer set search_path = public as $$
  select * from public.absen_staf where aktif and lower(email) = lower(auth.email()) limit 1
$$;

drop policy if exists absen_unggah on storage.objects;
drop policy if exists absen_lihat on storage.objects;
create policy absen_unggah on storage.objects for insert to authenticated
  with check (bucket_id = 'absen' and (storage.foldername(name))[1] = auth.uid()::text);
create policy absen_lihat on storage.objects for select to authenticated
  using (bucket_id = 'absen' and ((storage.foldername(name))[1] = auth.uid()::text or public.absen_kelola()));

-- 5. Fungsi untuk staf
-- Data layar absen: siapa saya, lokasi kerja, absen hari ini, izin terakhir, jam server.
create or replace function public.absen_saya() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s public.absen_staf; l public.absen_lokasi; h public.absen_hari;
begin
  s := public.absen_staf_saya();
  if s.id is null then
    return jsonb_build_object('ok', false, 'pesan', 'Akun ' || coalesce(auth.email(), '') || ' belum terdaftar untuk absensi. Minta manajemen Moscow Supplies mendaftarkannya di Payroll › Absensi staf.');
  end if;
  select * into l from public.absen_lokasi where id = s.lokasi_id;
  select * into h from public.absen_hari where staf_id = s.id and tanggal = public.absen_hari_ini();
  return jsonb_build_object('ok', true,
    'nama', s.nama, 'server', now(), 'tanggal', public.absen_hari_ini(), 'uji', public.absen_uji_ket(public.absen_hari_ini()),
    'lokasi', case when l.id is null then null else jsonb_build_object('nama', l.nama, 'lat', l.lat, 'lng', l.lng, 'radius', l.radius_m) end,
    'masuk', public.absen_jam(h.masuk), 'pulang', public.absen_jam(h.pulang),
    'izin', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'jenis', i.jenis, 'mulai', i.mulai, 'selesai', i.selesai, 'alasan', i.alasan,
                       'status', i.status, 'catatan', i.catatan_putus) order by i.mulai desc)
                      from (select * from public.absen_izin where staf_id = s.id and status <> 'batal' order by mulai desc limit 20) i), '[]'::jsonb));
end $$;

-- Absen masuk / pulang. Jam & tanggal dari server; lokasi diperiksa di server.
create or replace function public.absen_catat(p_jenis text, p_lat double precision, p_lng double precision, p_akurasi real, p_foto text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare s public.absen_staf; l public.absen_lokasi; h public.absen_hari; tg date := public.absen_hari_ini(); j double precision; batas double precision;
begin
  s := public.absen_staf_saya();
  if s.id is null then return jsonb_build_object('ok', false, 'pesan', 'Akun ini belum terdaftar untuk absensi.'); end if;
  if p_jenis not in ('masuk', 'pulang') then return jsonb_build_object('ok', false, 'pesan', 'Jenis absen tidak dikenal.'); end if;
  select * into l from public.absen_lokasi where id = s.lokasi_id and aktif;
  if l.id is null or l.lat is null or l.lng is null then
    return jsonb_build_object('ok', false, 'pesan', 'Lokasi kerjamu belum diatur. Hubungi manajemen Moscow Supplies.');
  end if;
  if p_foto is null or p_foto not like auth.uid()::text || '/%'
     or not exists (select 1 from storage.objects where bucket_id = 'absen' and name = p_foto) then
    return jsonb_build_object('ok', false, 'pesan', 'Foto selfie belum terkirim. Coba lagi.');
  end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    return jsonb_build_object('ok', false, 'pesan', 'Lokasi HP tidak terbaca. Nyalakan GPS lalu coba lagi.');
  end if;
  j := public.absen_jarak(l.lat, l.lng, p_lat, p_lng);
  batas := l.radius_m + least(coalesce(p_akurasi, 0), 50);
  if coalesce(p_akurasi, 9999) > 200 or j > batas then
    insert into public.absen_log (staf_id, tanggal, aksi, isi)
    values (s.id, tg, 'ditolak', jsonb_build_object('jenis', p_jenis, 'lat', p_lat, 'lng', p_lng, 'akurasi', p_akurasi, 'jarak', round(j), 'foto', p_foto));
    if coalesce(p_akurasi, 9999) > 200 then
      return jsonb_build_object('ok', false, 'pesan', 'Sinyal GPS terlalu lemah (±' || round(coalesce(p_akurasi, 0)) || ' m). Pindah ke dekat pintu atau jendela, tunggu sebentar, lalu coba lagi.');
    end if;
    return jsonb_build_object('ok', false, 'pesan', 'Kamu berada ' || round(j) || ' m dari ' || l.nama || ' (batas ' || l.radius_m || ' m). Absen hanya bisa di lokasi kerja.');
  end if;

  select * into h from public.absen_hari where staf_id = s.id and tanggal = tg for update;
  if p_jenis = 'masuk' then
    if h.masuk is not null then return jsonb_build_object('ok', false, 'pesan', 'Kamu sudah absen masuk hari ini jam ' || public.absen_jam(h.masuk) || '.'); end if;
    insert into public.absen_hari (staf_id, tanggal, masuk, masuk_lat, masuk_lng, masuk_akurasi, masuk_jarak, masuk_foto)
    values (s.id, tg, now(), p_lat, p_lng, p_akurasi, round(j), p_foto)
    on conflict (staf_id, tanggal) do update set masuk = excluded.masuk, masuk_lat = excluded.masuk_lat, masuk_lng = excluded.masuk_lng,
      masuk_akurasi = excluded.masuk_akurasi, masuk_jarak = excluded.masuk_jarak, masuk_foto = excluded.masuk_foto, diubah = now();
  else
    if h.id is null or h.masuk is null then return jsonb_build_object('ok', false, 'pesan', 'Belum ada absen masuk hari ini. Absen masuk dulu, atau minta manajemen mengoreksi.'); end if;
    if h.pulang is not null then return jsonb_build_object('ok', false, 'pesan', 'Kamu sudah absen pulang hari ini jam ' || public.absen_jam(h.pulang) || '.'); end if;
    update public.absen_hari set pulang = now(), pulang_lat = p_lat, pulang_lng = p_lng, pulang_akurasi = p_akurasi, pulang_jarak = round(j), pulang_foto = p_foto, diubah = now()
    where id = h.id;
  end if;
  return jsonb_build_object('ok', true, 'jenis', p_jenis, 'jam', public.absen_jam(now()), 'jarak', round(j), 'lokasi', l.nama, 'uji', public.absen_uji_ket(tg));
end $$;

-- Pengajuan izin / cuti / sakit (paling lama 14 hari, boleh mundur 7 hari untuk sakit / lupa mengajukan).
create or replace function public.absen_izin_ajukan(p_jenis text, p_mulai date, p_selesai date, p_alasan text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare s public.absen_staf;
begin
  s := public.absen_staf_saya();
  if s.id is null then return jsonb_build_object('ok', false, 'pesan', 'Akun ini belum terdaftar untuk absensi.'); end if;
  if p_jenis not in ('izin', 'cuti', 'sakit') then return jsonb_build_object('ok', false, 'pesan', 'Pilih jenis: izin, cuti, atau sakit.'); end if;
  if p_mulai is null or p_selesai is null or p_selesai < p_mulai then return jsonb_build_object('ok', false, 'pesan', 'Tanggal selesai tidak boleh sebelum tanggal mulai.'); end if;
  if p_selesai - p_mulai > 13 then return jsonb_build_object('ok', false, 'pesan', 'Satu pengajuan paling lama 14 hari.'); end if;
  if p_mulai < public.absen_hari_ini() - 7 then return jsonb_build_object('ok', false, 'pesan', 'Tanggal mulai paling jauh 7 hari ke belakang.'); end if;
  if length(trim(coalesce(p_alasan, ''))) < 3 then return jsonb_build_object('ok', false, 'pesan', 'Tulis alasannya.'); end if;
  if exists (select 1 from public.absen_izin where staf_id = s.id and status in ('menunggu', 'disetujui') and mulai <= p_selesai and selesai >= p_mulai) then
    return jsonb_build_object('ok', false, 'pesan', 'Sudah ada pengajuan di tanggal itu.');
  end if;
  insert into public.absen_izin (staf_id, jenis, mulai, selesai, alasan) values (s.id, p_jenis, p_mulai, p_selesai, left(trim(p_alasan), 300));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.absen_izin_batal(p_id bigint) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare s public.absen_staf;
begin
  s := public.absen_staf_saya();
  update public.absen_izin set status = 'batal' where id = p_id and staf_id = s.id and status = 'menunggu';
  if not found then return jsonb_build_object('ok', false, 'pesan', 'Pengajuan sudah diputus manajemen, tidak bisa dibatalkan.'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- Riwayat absen sendiri satu bulan (p_per = 'yyyy-mm').
create or replace function public.absen_riwayat(p_per text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s public.absen_staf; a date;
begin
  s := public.absen_staf_saya();
  if s.id is null then return jsonb_build_object('ok', false, 'pesan', 'Akun ini belum terdaftar untuk absensi.'); end if;
  a := to_date(p_per || '-01', 'YYYY-MM-DD');
  return jsonb_build_object('ok', true, 'hari', coalesce((select jsonb_agg(jsonb_build_object('tanggal', tanggal, 'masuk', public.absen_jam(masuk),
      'pulang', public.absen_jam(pulang), 'koreksi', koreksi, 'uji', public.absen_uji_ket(tanggal)) order by tanggal)
    from public.absen_hari where staf_id = s.id and tanggal >= a and tanggal < (a + interval '1 month')::date), '[]'::jsonb));
end $$;

-- 6. Fungsi untuk manajemen (Payroll › Absensi staf)
create or replace function public.absen_kelola_data(p_tanggal date) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.absen_kelola() then return jsonb_build_object('ok', false, 'pesan', 'Khusus manajemen Moscow Supplies.'); end if;
  return jsonb_build_object('ok', true, 'tanggal', p_tanggal, 'hari_ini', public.absen_hari_ini(), 'uji', public.absen_uji_ket(p_tanggal),
    'lokasi', coalesce((select jsonb_agg(to_jsonb(l) order by l.id) from public.absen_lokasi l), '[]'::jsonb),
    'staf', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'nama', s.nama, 'email', s.email, 'lokasi_id', s.lokasi_id, 'aktif', s.aktif) order by s.nama) from public.absen_staf s), '[]'::jsonb),
    'hari', coalesce((select jsonb_agg(jsonb_build_object('staf_id', h.staf_id, 'masuk', public.absen_jam(h.masuk), 'pulang', public.absen_jam(h.pulang),
        'masuk_jarak', h.masuk_jarak, 'pulang_jarak', h.pulang_jarak, 'masuk_akurasi', h.masuk_akurasi, 'pulang_akurasi', h.pulang_akurasi,
        'masuk_foto', h.masuk_foto, 'pulang_foto', h.pulang_foto, 'koreksi', h.koreksi, 'catatan', h.catatan))
      from public.absen_hari h where h.tanggal = p_tanggal), '[]'::jsonb),
    'izin_hari', coalesce((select jsonb_agg(jsonb_build_object('staf_id', i.staf_id, 'jenis', i.jenis))
      from public.absen_izin i where i.status = 'disetujui' and p_tanggal between i.mulai and i.selesai), '[]'::jsonb),
    'ditolak', coalesce((select jsonb_agg(jsonb_build_object('staf_id', g.staf_id, 'jam', public.absen_jam(g.waktu), 'jenis', g.isi->>'jenis',
        'jarak', g.isi->'jarak', 'akurasi', g.isi->'akurasi', 'foto', g.isi->>'foto') order by g.waktu)
      from public.absen_log g where g.aksi = 'ditolak' and g.tanggal = p_tanggal), '[]'::jsonb),
    'izin', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'staf_id', i.staf_id, 'jenis', i.jenis, 'mulai', i.mulai, 'selesai', i.selesai,
        'alasan', i.alasan, 'status', i.status, 'diajukan', i.diajukan, 'oleh', i.diputus_oleh, 'catatan', i.catatan_putus) order by (i.status = 'menunggu') desc, i.mulai desc)
      from (select * from public.absen_izin where status <> 'batal' and (status = 'menunggu' or mulai >= public.absen_hari_ini() - 60) order by mulai desc limit 80) i), '[]'::jsonb));
end $$;

create or replace function public.absen_izin_putus(p_id bigint, p_status text, p_catatan text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.absen_kelola() then return jsonb_build_object('ok', false, 'pesan', 'Khusus manajemen Moscow Supplies.'); end if;
  if p_status not in ('disetujui', 'ditolak') then return jsonb_build_object('ok', false, 'pesan', 'Pilih setujui atau tolak.'); end if;
  if p_status = 'ditolak' and length(trim(coalesce(p_catatan, ''))) < 3 then return jsonb_build_object('ok', false, 'pesan', 'Tulis alasan penolakan.'); end if;
  update public.absen_izin set status = p_status, diputus_oleh = auth.email(), diputus = now(), catatan_putus = nullif(left(trim(coalesce(p_catatan, '')), 300), '')
  where id = p_id and status in ('menunggu', 'disetujui', 'ditolak');
  if not found then return jsonb_build_object('ok', false, 'pesan', 'Pengajuan tidak ditemukan.'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- Koreksi jam (lupa absen pulang, HP rusak, GPS error). p_masuk / p_pulang: 'HH:MM', '' = hapus, null = tidak diubah.
create or replace function public.absen_koreksi(p_staf_id bigint, p_tanggal date, p_masuk text, p_pulang text, p_alasan text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare h public.absen_hari; m timestamptz; p timestamptz;
begin
  if not public.absen_kelola() then return jsonb_build_object('ok', false, 'pesan', 'Khusus manajemen Moscow Supplies.'); end if;
  if not exists (select 1 from public.absen_staf where id = p_staf_id) then return jsonb_build_object('ok', false, 'pesan', 'Staf tidak ditemukan.'); end if;
  if length(trim(coalesce(p_alasan, ''))) < 3 then return jsonb_build_object('ok', false, 'pesan', 'Tulis alasan koreksi.'); end if;
  if coalesce(p_masuk, '') <> '' and p_masuk !~ '^([01]?\d|2[0-3])[:.][0-5]\d$' then return jsonb_build_object('ok', false, 'pesan', 'Jam masuk harus seperti 10:00.'); end if;
  if coalesce(p_pulang, '') <> '' and p_pulang !~ '^([01]?\d|2[0-3])[:.][0-5]\d$' then return jsonb_build_object('ok', false, 'pesan', 'Jam pulang harus seperti 17:00.'); end if;
  select * into h from public.absen_hari where staf_id = p_staf_id and tanggal = p_tanggal for update;
  m := case when p_masuk is null then h.masuk when p_masuk = '' then null else (p_tanggal + replace(p_masuk, '.', ':')::time) at time zone 'Asia/Makassar' end;
  p := case when p_pulang is null then h.pulang when p_pulang = '' then null else (p_tanggal + replace(p_pulang, '.', ':')::time) at time zone 'Asia/Makassar' end;
  if m is not null and p is not null and p <= m then return jsonb_build_object('ok', false, 'pesan', 'Jam pulang harus setelah jam masuk.'); end if;
  insert into public.absen_log (staf_id, tanggal, aksi, isi)
  values (p_staf_id, p_tanggal, 'koreksi', jsonb_build_object('masuk_lama', public.absen_jam(h.masuk), 'pulang_lama', public.absen_jam(h.pulang),
          'masuk', public.absen_jam(m), 'pulang', public.absen_jam(p), 'alasan', trim(p_alasan)));
  insert into public.absen_hari (staf_id, tanggal, masuk, pulang, koreksi, catatan)
  values (p_staf_id, p_tanggal, m, p, true, left(trim(p_alasan), 300))
  on conflict (staf_id, tanggal) do update set masuk = excluded.masuk, pulang = excluded.pulang, koreksi = true, catatan = excluded.catatan, diubah = now();
  return jsonb_build_object('ok', true);
end $$;

-- Daftar staf absensi. p_items: [{nama, email, lokasi_id, aktif}] (nama = nama di Payroll).
-- Email baru yang belum ada di tabel pengguna ikut didaftarkan dengan peran "staf" (hanya absensi).
create or replace function public.absen_staf_simpan(p_items jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare it jsonb; e text; gagal text[] := '{}'; baru text[] := '{}';
begin
  if not public.absen_kelola() then return jsonb_build_object('ok', false, 'pesan', 'Khusus manajemen Moscow Supplies.'); end if;
  for it in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    e := nullif(lower(trim(coalesce(it->>'email', ''))), '');
    if e is not null and e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      return jsonb_build_object('ok', false, 'pesan', 'Email ' || e || ' tidak valid.');
    end if;
    if e is not null and exists (select 1 from public.absen_staf where lower(email) = e and nama <> trim(it->>'nama')) then
      return jsonb_build_object('ok', false, 'pesan', 'Email ' || e || ' sudah dipakai staf lain.');
    end if;
    insert into public.absen_staf (nama, email, lokasi_id, aktif)
    values (trim(it->>'nama'), e, nullif(it->>'lokasi_id', '')::bigint, coalesce((it->>'aktif')::boolean, true))
    on conflict (nama) do update set email = excluded.email, lokasi_id = excluded.lokasi_id, aktif = excluded.aktif;
    if e is not null and not exists (select 1 from public.pengguna where lower(email) = e) then
      begin
        insert into public.pengguna (email, nama, peran) values (e, trim(it->>'nama'), 'staf');
        baru := baru || e;
      exception when others then
        gagal := gagal || e;
      end;
    end if;
  end loop;
  insert into public.absen_log (aksi, isi) values ('staf', jsonb_build_object('items', p_items));
  return jsonb_build_object('ok', true, 'akun_baru', to_jsonb(baru), 'akun_gagal', to_jsonb(gagal));
end $$;

create or replace function public.absen_lokasi_simpan(p_id bigint, p_lat double precision, p_lng double precision, p_radius int) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.absen_kelola() then return jsonb_build_object('ok', false, 'pesan', 'Khusus manajemen Moscow Supplies.'); end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    return jsonb_build_object('ok', false, 'pesan', 'Titik lokasi tidak valid.');
  end if;
  if p_radius is null or p_radius not between 20 and 1000 then return jsonb_build_object('ok', false, 'pesan', 'Radius 20–1000 meter.'); end if;
  update public.absen_lokasi set lat = p_lat, lng = p_lng, radius_m = p_radius, diubah = now() where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'pesan', 'Lokasi tidak ditemukan.'); end if;
  insert into public.absen_log (aksi, isi) values ('lokasi', jsonb_build_object('id', p_id, 'lat', p_lat, 'lng', p_lng, 'radius', p_radius));
  return jsonb_build_object('ok', true);
end $$;

-- Rekap satu bulan untuk Payroll › Upload absensi (p_per = 'yyyy-mm'): jam masuk/pulang dalam menit + izin yang disetujui.
create or replace function public.absen_rekap(p_per text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare a date; b date;
begin
  if not public.absen_kelola() then return jsonb_build_object('ok', false, 'pesan', 'Khusus manajemen Moscow Supplies.'); end if;
  if p_per !~ '^\d{4}-\d{2}$' then return jsonb_build_object('ok', false, 'pesan', 'Periode harus yyyy-mm.'); end if;
  a := to_date(p_per || '-01', 'YYYY-MM-DD'); b := (a + interval '1 month')::date;
  return jsonb_build_object('ok', true, 'per', p_per,
    'uji', coalesce((select jsonb_agg(jsonb_build_object('tanggal', tanggal, 'keterangan', keterangan)) from public.absen_uji where tanggal >= a and tanggal < b), '[]'::jsonb),
    'staf', coalesce((select jsonb_agg(nama order by nama) from public.absen_staf where aktif), '[]'::jsonb),
    'hari', coalesce((select jsonb_agg(jsonb_build_object('nama', s.nama, 'tanggal', h.tanggal,
        'masuk', case when h.masuk is null then null else extract(hour from h.masuk at time zone 'Asia/Makassar') * 60 + extract(minute from h.masuk at time zone 'Asia/Makassar') end,
        'pulang', case when h.pulang is null then null else extract(hour from h.pulang at time zone 'Asia/Makassar') * 60 + extract(minute from h.pulang at time zone 'Asia/Makassar') end))
      from public.absen_hari h join public.absen_staf s on s.id = h.staf_id where h.tanggal >= a and h.tanggal < b), '[]'::jsonb),
    'izin', coalesce((select jsonb_agg(jsonb_build_object('nama', s.nama, 'tanggal', d::date, 'jenis', i.jenis))
      from public.absen_izin i join public.absen_staf s on s.id = i.staf_id
      cross join generate_series(greatest(i.mulai, a), least(i.selesai, b - 1), interval '1 day') d
      where i.status = 'disetujui' and i.mulai < b and i.selesai >= a), '[]'::jsonb));
end $$;

-- 7. Izin menjalankan fungsi
revoke all on function public.absen_saya(), public.absen_catat(text, double precision, double precision, real, text),
  public.absen_izin_ajukan(text, date, date, text), public.absen_izin_batal(bigint), public.absen_riwayat(text),
  public.absen_kelola_data(date), public.absen_izin_putus(bigint, text, text), public.absen_koreksi(bigint, date, text, text, text),
  public.absen_staf_simpan(jsonb), public.absen_lokasi_simpan(bigint, double precision, double precision, int), public.absen_rekap(text),
  public.absen_staf_saya(), public.absen_kelola() from public, anon;
grant execute on function public.absen_saya(), public.absen_catat(text, double precision, double precision, real, text),
  public.absen_izin_ajukan(text, date, date, text), public.absen_izin_batal(bigint), public.absen_riwayat(text),
  public.absen_kelola_data(date), public.absen_izin_putus(bigint, text, text), public.absen_koreksi(bigint, date, text, text, text),
  public.absen_staf_simpan(jsonb), public.absen_lokasi_simpan(bigint, double precision, double precision, int), public.absen_rekap(text),
  public.absen_kelola() to authenticated;
