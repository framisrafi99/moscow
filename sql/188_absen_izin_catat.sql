-- 188 (9 Nov 2026): manajemen bisa mencatat sakit / izin / cuti atas nama staf (staf konfirmasi lewat WA / telepon),
-- langsung berstatus disetujui sehingga hari itu tidak dihitung alpa di Payroll.
create or replace function public.absen_izin_catat(p_staf_id bigint, p_jenis text, p_mulai date, p_selesai date, p_alasan text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare s record; a date := p_mulai; b date := coalesce(p_selesai, p_mulai); al text := left(btrim(coalesce(p_alasan, '')), 300);
begin
  if not public.absen_kelola() then return jsonb_build_object('ok', false, 'pesan', 'Khusus manajemen Moscow Supplies.'); end if;
  if p_jenis not in ('sakit', 'izin', 'cuti') then return jsonb_build_object('ok', false, 'pesan', 'Pilih sakit, izin, atau cuti.'); end if;
  select id, nama into s from absen_staf where id = p_staf_id;
  if s.id is null then return jsonb_build_object('ok', false, 'pesan', 'Staf tidak ditemukan.'); end if;
  if a is null or b < a then return jsonb_build_object('ok', false, 'pesan', 'Tanggal tidak valid.'); end if;
  if b - a > 30 then return jsonb_build_object('ok', false, 'pesan', 'Paling lama 31 hari sekali catat.'); end if;
  if exists (select 1 from absen_izin where staf_id = s.id and status in ('menunggu', 'disetujui') and mulai <= b and selesai >= a) then
    -- pengajuan staf yang tumpang tindih: setujui saja
    update absen_izin set status = 'disetujui', diputus_oleh = auth.email(), diputus = now(), catatan_putus = 'Dikonfirmasi manajemen'
     where staf_id = s.id and status = 'menunggu' and mulai <= b and selesai >= a;
    if found then return jsonb_build_object('ok', true, 'pesan', 'Pengajuan ' || s.nama || ' yang sudah ada disetujui.'); end if;
    return jsonb_build_object('ok', false, 'pesan', s.nama || ' sudah punya izin / sakit / cuti yang disetujui di tanggal itu.');
  end if;
  insert into absen_izin (staf_id, jenis, mulai, selesai, alasan, status, diajukan, diputus_oleh, diputus, catatan_putus)
  values (s.id, p_jenis, a, b, coalesce(nullif(al, ''), initcap(p_jenis) || ' (konfirmasi ke manajemen)'), 'disetujui', now(), auth.email(), now(), 'Dicatat manajemen');
  return jsonb_build_object('ok', true, 'pesan', initcap(p_jenis) || ' ' || s.nama || ' tercatat.');
end $$;
revoke all on function public.absen_izin_catat(bigint, text, date, date, text) from public, anon;
grant execute on function public.absen_izin_catat(bigint, text, date, date, text) to authenticated;
