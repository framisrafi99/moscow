-- 9 Nov 2026: Laporan laba bersih per periode (Jan–Okt 2026 dan seterusnya).
-- Isi laporan disusun dari rekening koran, laporan marketplace, laporan pengeluaran dan payroll,
-- lalu disimpan sebagai satu dokumen JSON per periode. Angka TIDAK disimpan di repo ini.
-- Hanya manajemen dan kendali bisnis yang boleh membaca.

create table if not exists public.laporan_laba (
  periode text primary key,          -- contoh '2026-01..2026-10'
  judul text not null,
  isi jsonb not null,
  dibuat timestamptz not null default now(),
  oleh text
);
alter table public.laporan_laba enable row level security;
revoke all on public.laporan_laba from anon, authenticated;

create or replace function public.laporan_laba_baca()
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not public._boleh_peran(array['kendali_bisnis']) then
    return json_build_object('ok', false, 'pesan', 'Akses ditolak.');
  end if;
  return json_build_object('ok', true, 'laporan',
    coalesce((select json_agg(json_build_object('periode', periode, 'judul', judul, 'isi', isi, 'dibuat', dibuat) order by periode desc)
              from public.laporan_laba), '[]'::json));
end $$;
revoke all on function public.laporan_laba_baca() from public, anon;
grant execute on function public.laporan_laba_baca() to authenticated;
