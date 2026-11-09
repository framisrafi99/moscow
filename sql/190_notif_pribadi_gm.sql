-- 190 (9 Nov 2026): notifikasi Telegram PRIBADI untuk general manager (akun Telegram yang terdaftar peran "manajemen"
-- lewat /daftar di bot Admin Accounting). Dikirim Edge Function kirim-telegram (jenis efek_antre 'pl_gm').
-- Sumber: 4 agen Moscow -> Penjaga sistem, Penjaga bisnis, Audit perusahaan, Asisten GM.

create or replace function public._gm_pribadi(p_teks text)
returns void language sql security definer set search_path = public as $$
  insert into efek_antre (jenis, data) values ('pl_gm', jsonb_build_object('teks', left(p_teks, 3900)))
$$;
revoke all on function public._gm_pribadi(text) from public, anon, authenticated;

-- Penjaga sistem: hanya kalau ada kendala / perbaikan / perlu keputusan (laporan "sehat" tidak dikirim).
create or replace function public._tg_penjaga_sistem()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.status, '') <> 'sehat' or nullif(btrim(coalesce(new.diperbaiki, '')), '') is not null or nullif(btrim(coalesce(new.perlu_keputusan, '')), '') is not null then
    perform public._gm_pribadi('🛡️ <b>PENJAGA SISTEM</b> · ' || public._tg_esc(upper(coalesce(new.status, '-'))) || E'\n<i>Kesehatan aplikasi, jadwal otomatis & database</i>\n\n' ||
      '<b>' || public._tg_esc(coalesce(new.ringkas, '')) || '</b>' ||
      case when nullif(btrim(coalesce(new.diperbaiki, '')), '') is not null then E'\n\n🔧 Sudah diperbaiki:\n' || public._tg_esc(left(new.diperbaiki, 1200)) else '' end ||
      case when nullif(btrim(coalesce(new.perlu_keputusan, '')), '') is not null then E'\n\n❓ Perlu keputusanmu:\n' || public._tg_esc(left(new.perlu_keputusan, 1200)) else '' end ||
      case when coalesce(new.status, '') <> 'sehat' then E'\n\n' || public._tg_esc(left(coalesce(new.rinci, ''), 1200)) else '' end ||
      E'\n\n<i>Master Data › Pusat agen</i>');
  end if;
  return new;
end $$;
drop trigger if exists penjaga_log_tg on public.penjaga_log;
create trigger penjaga_log_tg after insert on public.penjaga_log for each row execute function public._tg_penjaga_sistem();

-- Penjaga bisnis: ringkasan pagi (uang, stok, penjualan, tindakan).
create or replace function public._tg_penjaga_bisnis()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public._gm_pribadi('📊 <b>PENJAGA BISNIS</b> · ' || public._tg_esc(upper(coalesce(new.status, '-'))) || E'\n<i>Ringkasan pagi: uang, stok, penjualan</i>\n\n' ||
    '<b>' || public._tg_esc(coalesce(new.ringkas, '')) || '</b>' ||
    case when nullif(btrim(coalesce(new.tindakan, '')), '') is not null then E'\n\n✅ Tindakan hari ini:\n' || public._tg_esc(left(new.tindakan, 1500)) else '' end ||
    case when nullif(btrim(coalesce(new.uang, '')), '') is not null then E'\n\n💰 Uang:\n' || public._tg_esc(left(new.uang, 700)) else '' end ||
    E'\n\n<i>Rincian stok & penjualan: Master Data › Pusat agen</i>');
  return new;
end $$;
drop trigger if exists penjaga_bisnis_log_tg on public.penjaga_bisnis_log;
create trigger penjaga_bisnis_log_tg after insert on public.penjaga_bisnis_log for each row execute function public._tg_penjaga_bisnis();

-- Asisten GM: rencana mingguan (Senin) / evaluasi (Jumat).
create or replace function public._tg_gm_laporan()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public._gm_pribadi('🧭 <b>ASISTEN GM</b> · ' || public._tg_esc(case new.jenis when 'rencana' then 'Rencana minggu ini' when 'evaluasi' then 'Evaluasi minggu ini' else coalesce(new.jenis, 'Laporan') end) ||
    E'\n<i>Prioritas kerja general manager</i>\n\n' || public._tg_esc(left(coalesce(new.isi, new.ringkas, ''), 3300)));
  return new;
end $$;
drop trigger if exists gm_laporan_tg on public.gm_laporan;
create trigger gm_laporan_tg after insert on public.gm_laporan for each row execute function public._tg_gm_laporan();

-- Asisten GM: setiap tindakan baru di daftar tindakan (dari agen mana pun).
create or replace function public._tg_gm_tindakan_baru()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public._gm_pribadi('🧭 <b>ASISTEN GM</b> · Tindakan baru ' || case when new.prioritas <= 1 then '🔴 darurat' when new.prioritas = 2 then '🟠 penting' else '🟢 biasa' end ||
    case when nullif(new.sumber, '') is not null then ' <i>(dari ' || public._tg_esc(new.sumber) || ')</i>' else '' end || E'\n\n' ||
    '<b>' || public._tg_esc(new.judul) || '</b>' ||
    case when nullif(btrim(coalesce(new.ket, '')), '') is not null then E'\n' || public._tg_esc(left(new.ket, 1200)) else '' end ||
    case when new.tenggat is not null then E'\n\nTenggat: ' || to_char(new.tenggat, 'DD/MM/YYYY') else '' end);
  return new;
end $$;
drop trigger if exists gm_tindakan_tg_baru on public.gm_tindakan;
create trigger gm_tindakan_tg_baru after insert on public.gm_tindakan for each row execute function public._tg_gm_tindakan_baru();

-- Audit perusahaan: setiap hasil audit baru (hasil_hitung 'agen:audit'), ringkas jumlah temuan + temuan CRITICAL teratas.
create or replace function public._tg_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare j jsonb := coalesce(new.data -> 'jumlah', '{}'); kritis text;
begin
  if new.kunci <> 'agen:audit' then return new; end if;
  if tg_op = 'UPDATE' and (old.data ->> 'dihitung') is not distinct from (new.data ->> 'dihitung') then return new; end if;
  select string_agg('• ' || public._tg_esc(coalesce(p ->> 'masalah', '')) || case when nullif(p ->> 'solusi', '') is not null then E'\n  → ' || public._tg_esc(p ->> 'solusi') else '' end, E'\n')
    into kritis from (select p from jsonb_array_elements(coalesce(new.data -> 'peringatan', '[]')) p where p ->> 'p' = 'CRITICAL' limit 5) z;
  perform public._gm_pribadi('🔎 <b>AUDIT PERUSAHAAN</b>' || E'\n<i>Pemeriksaan stok, keuangan & operasional</i>\n\n' ||
    'Temuan: 🔴 Critical <b>' || coalesce(j ->> 'CRITICAL', '0') || '</b> · 🟠 High <b>' || coalesce(j ->> 'HIGH', '0') || '</b> · 🟡 Medium ' || coalesce(j ->> 'MEDIUM', '0') ||
    case when kritis is not null then E'\n\n<b>Critical teratas:</b>\n' || kritis else '' end ||
    E'\n\n<i>Rincian: Master Data › Pusat agen › Audit</i>');
  return new;
end $$;
drop trigger if exists hasil_hitung_audit_tg on public.hasil_hitung;
create trigger hasil_hitung_audit_tg after insert or update of data on public.hasil_hitung for each row when (new.kunci = 'agen:audit') execute function public._tg_audit();
