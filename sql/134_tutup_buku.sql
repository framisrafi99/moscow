-- 134: tutup buku bulanan langsung di Supabase dari Master Data baru (pengganti tpbTutup / tpbBuka Apps Script file 74).
--  Baris baru tutup_buku (Ditutup / Dibuka) ditulis balik ke sheet TUTUP_BUKU sehingga Apps Script ikut menganggap bulan itu ditutup
--  (penjualan otomatis dibekukan dari kolom oto). _tb_tolak membaca tabel ini untuk mengunci catatan bertanggal di bulan itu.
--  Isi saldo / ring / oto / stok dihitung di aplikasi (Akunting.inti + Dasbor.dsData), sama dengan tpbTutup.
create or replace function public.tutup_buku_daftar()
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if (select public.peran_saya()) is distinct from 'manajemen' then return '[]'::json; end if;
  return coalesce((select json_agg(json_build_object('bulan', left(btrim(bulan), 7), 'status', status, 'waktu', waktu, 'oleh', oleh, 'ring', ring, 'catatan', catatan,
           'baris_sheet', baris_sheet, 'id', id) order by baris_sheet nulls last, id) from tutup_buku), '[]'::json);
end $$;
revoke all on function public.tutup_buku_daftar() from public, anon;
grant execute on function public.tutup_buku_daftar() to authenticated;

create or replace function public.tutup_buku_tutup(p_bulan text, p_saldo jsonb, p_ring jsonb, p_oto jsonb, p_stok jsonb, p_catatan text)
returns json language plpgsql volatile security definer set search_path = public as $$
declare nb text; kini text := to_char((now() at time zone 'Asia/Makassar')::date, 'YYYY-MM'); o text;
  nm text[] := array['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
begin
  if (select public.peran_saya()) is distinct from 'manajemen' then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  if coalesce(p_bulan, '') !~ '^\d{4}-(0[1-9]|1[0-2])$' then return json_build_object('ok', false, 'pesan', 'Bulan tidak valid.'); end if;
  nb := nm[right(p_bulan, 2)::int] || ' ' || left(p_bulan, 4);
  if p_bulan >= kini then return json_build_object('ok', false, 'pesan', 'Bulan berjalan belum bisa ditutup. Tutup buku dilakukan setelah bulan selesai.'); end if;
  if jsonb_typeof(p_oto) is distinct from 'array' or jsonb_typeof(p_saldo) is distinct from 'object' then return json_build_object('ok', false, 'pesan', 'Data tutup buku tidak lengkap.'); end if;
  perform pg_advisory_xact_lock(hashtext('tutup_buku'));
  if public._tb_tolak(p_bulan || '-01') <> '' then return json_build_object('ok', true, 'pesan', 'Buku ' || nb || ' sudah ditutup sebelumnya.'); end if;
  o := p_oto::text;
  if length(o) > 45000 then
    select coalesce(jsonb_agg(jsonb_build_object('t', e ->> 't', 'a', e ->> 'a', 'k', e ->> 'k', 'kel', e ->> 'kel', 'v', round(public._mp_n(e ->> 'v')), 's', coalesce(e ->> 's', ''))), '[]')::text
      into o from jsonb_array_elements(p_oto) e;
  end if;
  insert into tutup_buku (bulan, status, waktu, oleh, saldo, ring, oto, stok, catatan)
  values (p_bulan, 'Ditutup', now(), 'manajemen Moscow Supplies', p_saldo::text, coalesce(p_ring, 'null'::jsonb)::text, o, coalesce(p_stok, 'null'::jsonb)::text, left(coalesce(p_catatan, ''), 1000));
  insert into efek_antre (jenis, data) values ('tpb_cache', jsonb_build_object('bulan', p_bulan));
  return json_build_object('ok', true, 'pesan', 'Buku ' || nb || ' ditutup. Catatan accounting bulan itu sekarang terkunci dan penjualan otomatisnya dibekukan.');
end $$;
revoke all on function public.tutup_buku_tutup(text, jsonb, jsonb, jsonb, jsonb, text) from public, anon;
grant execute on function public.tutup_buku_tutup(text, jsonb, jsonb, jsonb, jsonb, text) to authenticated;

create or replace function public.tutup_buku_buka(p_bulan text, p_alasan text)
returns json language plpgsql volatile security definer set search_path = public as $$
declare nb text; al text := btrim(regexp_replace(coalesce(p_alasan, ''), '\s+', ' ', 'g'));
  nm text[] := array['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
begin
  if (select public.peran_saya()) is distinct from 'manajemen' then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  if coalesce(p_bulan, '') !~ '^\d{4}-(0[1-9]|1[0-2])$' then return json_build_object('ok', false, 'pesan', 'Bulan tidak valid.'); end if;
  nb := nm[right(p_bulan, 2)::int] || ' ' || left(p_bulan, 4);
  perform pg_advisory_xact_lock(hashtext('tutup_buku'));
  if public._tb_tolak(p_bulan || '-01') = '' then return json_build_object('ok', false, 'pesan', 'Bulan itu belum ditutup.'); end if;
  if length(al) < 3 then return json_build_object('ok', false, 'pesan', 'Tulis alasan membuka kembali buku bulan ini.'); end if;
  insert into tutup_buku (bulan, status, waktu, oleh, saldo, ring, oto, stok, catatan)
  values (p_bulan, 'Dibuka', now(), 'manajemen Moscow Supplies', '', '', '', '', left('Dibuka kembali: ' || al, 300));
  insert into efek_antre (jenis, data) values ('tpb_cache', jsonb_build_object('bulan', p_bulan));
  return json_build_object('ok', true, 'pesan', 'Buku ' || nb || ' dibuka kembali. Jangan lupa tutup lagi setelah koreksi selesai.');
end $$;
revoke all on function public.tutup_buku_buka(text, text) from public, anon;
grant execute on function public.tutup_buku_buka(text, text) to authenticated;

do $x$
declare d text;
begin
  d := pg_get_functiondef('public.tulis_balik_tandai(text, jsonb)'::regprocedure);
  if position('''tutup_buku''' in d) = 0 then
    d := replace(d, '''po_biaya''', '''po_biaya'', ''tutup_buku''');
    execute d;
  end if;
end $x$;
select (position('''tutup_buku''' in pg_get_functiondef('public.tulis_balik_tandai(text, jsonb)'::regprocedure)) > 0)::text as ok134;
