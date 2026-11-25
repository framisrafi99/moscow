-- 218 (25 Nov 2026): gm_tindakan #28 - halaman staf sering gagal memuat di jam sibuk (lembar_baca statement timeout).
--  mp_pesanan (~31 ribu baris, 26 MB) dirangkum ulang di setiap panggilan lembar_baca; 4-5 panggilan bersamaan membuat
--  database Micro kewalahan. Sekarang hasil rangkuman mp_pesanan disimpan di lembar_cache dan dipakai ulang sampai
--  mp_pesanan berubah (pemicu per pernyataan menghapus cache) atau paling lama 10 menit. lembar_baca menjadi VOLATILE (boleh menulis cache).
create table if not exists public.lembar_cache (tabel text primary key, isi jsonb not null, dibuat timestamptz not null default now());
alter table public.lembar_cache enable row level security;
revoke all on public.lembar_cache from anon, authenticated;

create or replace function public._lembar_cache_hapus() returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.lembar_cache where tabel = tg_table_name;
  return null;
end $$;

drop trigger if exists lembar_cache_mp_pesanan on public.mp_pesanan;
create trigger lembar_cache_mp_pesanan after insert or update or delete or truncate on public.mp_pesanan
  for each statement execute function public._lembar_cache_hapus();

do $x$
declare d text;
begin
  d := pg_get_functiondef('public.lembar_baca(text[])'::regprocedure);
  if position(' STABLE SECURITY DEFINER' in d) = 0 then raise exception 'pola STABLE tidak ditemukan'; end if;
  d := replace(d, ' STABLE SECURITY DEFINER', ' VOLATILE SECURITY DEFINER');
  if position('    select string_agg(format(''%I'', c)' in d) = 0 then raise exception 'pola kolom tidak ditemukan'; end if;
  d := replace(d, '    select string_agg(format(''%I'', c)',
'    if t = ''mp_pesanan'' then
      if not exists (select 1 from public.lembar_cache c where c.tabel = t and c.dibuat > now() - interval ''10 minutes'') then
        perform pg_advisory_xact_lock(hashtext(''lembar_cache|'' || t));
      end if;
      if exists (select 1 from public.lembar_cache c where c.tabel = t and c.dibuat > now() - interval ''10 minutes'') then
        hasil := hasil || (select jsonb_build_object(t, c.isi) from public.lembar_cache c where c.tabel = t and c.dibuat > now() - interval ''10 minutes'');
        continue;
      end if;
    end if;
    select string_agg(format(''%I'', c)');
  if position('    hasil := hasil || jsonb_build_object(t, isi);
  end loop;' in d) = 0 then raise exception 'pola hasil tidak ditemukan'; end if;
  d := replace(d, '    hasil := hasil || jsonb_build_object(t, isi);
  end loop;',
'    if t = ''mp_pesanan'' then
      insert into public.lembar_cache (tabel, isi, dibuat) values (t, isi::jsonb, now())
        on conflict (tabel) do update set isi = excluded.isi, dibuat = excluded.dibuat;
    end if;
    hasil := hasil || jsonb_build_object(t, isi);
  end loop;');
  execute d;
end $x$;
