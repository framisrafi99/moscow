-- 163 (5 Nov 2026): koreksi pengajuan pembelian oleh staf yang mengajukan (Gudang Utama, Bahan Baku, Produksi), langsung tanpa ACC Master Data.
--   Menunggu  : ubah qty, perkiraan harga satuan, alasan pengajuan; atau batalkan.
--   Disetujui : (belum dipesan / dibayar) hanya kurangi qty atau batalkan — tidak bisa melebihi yang sudah di-ACC.
-- Hanya pengajuan bagiannya sendiri. Tiap koreksi dicatat (pengadaan_koreksi_log) dan dikabarkan ke grup Telegram.

create table if not exists public.pengadaan_koreksi_log (
  id bigint generated always as identity primary key,
  waktu timestamptz not null default now(),
  no text, bagian text, aksi text, status_lama text,
  qty_lama numeric, qty_baru numeric, harga_lama numeric, harga_baru numeric, alasan_lama text, alasan_baru text,
  catatan text, oleh text, email text
);
alter table public.pengadaan_koreksi_log enable row level security;

create or replace function public.pengadaan_koreksi(p_no text, p_aksi text, p_qty text default null, p_harga text default null,
  p_alasan_ajuan text default null, p_catatan text default null, p_nama text default null)
returns json language plpgsql security definer set search_path to 'public' as $function$
#variable_conflict use_column
declare
  peran text := (select public.peran_saya()); mgmt boolean; v_bg text; v_no text := public._rapi_spasi(p_no, 30); aksi text := coalesce(p_aksi, '');
  x record; st text; qlama numeric; q numeric; h numeric; al text; cat text; v_nama text; v_oleh text; ubah text[] := '{}'; teks text; rinci text := '';
  kini timestamptz := now();
begin
  if not public._boleh_peran(array['gudang', 'produksi', 'bahan_baku', 'purchasing_shopeepay']) then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  mgmt := peran = 'manajemen';
  v_bg := case peran when 'gudang' then 'Gudang' when 'purchasing_shopeepay' then 'Gudang' when 'produksi' then 'Produksi' when 'bahan_baku' then 'Bahan Baku' else '' end;
  select a.id, a.baris_sheet bs, btrim(a.no) no, coalesce(nullif(public._rapi_spasi(a.status, 20), ''), 'Menunggu') st, coalesce(a.qty, 0) q, a.qty_disetujui qs,
         coalesce(a.perkiraan_harga_satuan, 0) h, coalesce(a.alasan, '') al, public._rapi_spasi(a.bagian, 40) bg, public._rapi_spasi(a.nama, 120) n,
         public._rapi_spasi(a.satuan, 15) s, public._rapi_spasi(a.pengaju, 60) pg, coalesce(a.ref_po_supplier, '') ref, upper(public._rapi_spasi(a.warna, 30)) w
    into x from pengadaan_ajuan a where btrim(coalesce(a.no, '')) = v_no and v_no <> '' order by a.baris_sheet nulls last, a.id limit 1;
  if x.id is null then return json_build_object('ok', false, 'pesan', 'Pengajuan ' || v_no || ' tidak ditemukan. Muat ulang.'); end if;
  if not mgmt and x.bg <> v_bg then return json_build_object('ok', false, 'pesan', 'Pengajuan ini milik bagian ' || x.bg || '. Yang bisa mengoreksi hanya bagian yang mengajukan.'); end if;
  st := x.st;
  if aksi = 'lihat' then
    return json_build_object('ok', true, 'no', x.no, 'st', st, 'n', x.n || case when x.w <> '' and position(x.w in upper(x.n)) = 0 then ' · ' || x.w else '' end,
      's', x.s, 'q', x.q, 'qs', x.qs, 'h', x.h, 'al', x.al, 'bg', x.bg,
      'boleh', st in ('Menunggu', 'Disetujui') and position('Dibayar' in x.ref) = 0,
      'info', case when st = 'Menunggu' then 'Belum di-ACC: qty, perkiraan harga dan alasan bisa diubah, atau pengajuan dibatalkan.'
                   when st = 'Disetujui' then 'Sudah di-ACC: qty hanya bisa dikurangi (maks. ' || public._gd_fmt(coalesce(x.qs, x.q)) || '), atau pengajuan dibatalkan.'
                   else 'Pengajuan berstatus ' || st || ', tidak bisa dikoreksi lagi.' end);
  end if;
  if aksi not in ('ubah', 'batal') then return json_build_object('ok', false, 'pesan', 'Aksi tidak dikenal.'); end if;
  if st not in ('Menunggu', 'Disetujui') or position('Dibayar' in x.ref) > 0 then
    return json_build_object('ok', false, 'pesan', x.no || ' sudah berstatus ' || st || ', tidak bisa dikoreksi lagi. Hubungi purchasing.');
  end if;
  cat := public._rapi_spasi(p_catatan, 200);
  if length(cat) < 3 then return json_build_object('ok', false, 'pesan', 'Tulis alasan koreksinya.'); end if;
  v_nama := public._rapi_spasi(p_nama, 40);
  if mgmt and length(v_nama) < 2 then v_nama := (public._mgmt_nama() || ''); end if;
  if length(v_nama) < 2 then return json_build_object('ok', false, 'pesan', 'Isi nama kamu dulu.'); end if;
  v_oleh := v_nama;
  perform pg_advisory_xact_lock(hashtext('staf|pengadaan_ajuan'));
  qlama := coalesce(x.qs, x.q);
  if aksi = 'batal' then
    if x.bs is not null then perform public._ubah_catat('pengadaan_ajuan', x.id, array['status', 'diputus_oleh', 'waktu_putus', 'catatan_putus']); end if;
    update pengadaan_ajuan set status = 'Batal', diputus_oleh = v_oleh || ' (pengaju)', waktu_putus = kini, catatan_putus = left('Dibatalkan pengaju: ' || cat, 300) where id = x.id;
    insert into pengadaan_koreksi_log (no, bagian, aksi, status_lama, qty_lama, harga_lama, alasan_lama, catatan, oleh, email)
    values (x.no, x.bg, 'batal', st, qlama, x.h, x.al, cat, v_oleh, lower(coalesce(auth.jwt() ->> 'email', '')));
    rinci := 'Dibatalkan';
  else
    q := public._pgd_num(to_jsonb(coalesce(p_qty, '')));
    if btrim(coalesce(p_qty, '')) = '' then q := qlama; end if;
    if q is null or not (q > 0) or q > 1000000 then return json_build_object('ok', false, 'pesan', 'Qty harus angka lebih dari 0.'); end if;
    if st = 'Disetujui' and q > qlama then
      return json_build_object('ok', false, 'pesan', 'Pengajuan sudah di-ACC ' || public._gd_fmt(qlama) || ' ' || coalesce(nullif(x.s, ''), 'pcs') || '. Qty hanya bisa dikurangi. Untuk menambah, buat pengajuan baru.');
    end if;
    h := x.h; al := x.al;
    if st = 'Menunggu' then
      if btrim(coalesce(p_harga, '')) <> '' then
        h := public._pgd_num(to_jsonb(p_harga));
        if h is null or h < 0 or h > 1000000000 then return json_build_object('ok', false, 'pesan', 'Perkiraan harga harus angka.'); end if;
      end if;
      if p_alasan_ajuan is not null and length(public._rapi_spasi(p_alasan_ajuan, 300)) >= 3 then al := public._rapi_spasi(p_alasan_ajuan, 300); end if;
    end if;
    if q <> qlama then ubah := ubah || ('qty ' || public._gd_fmt(qlama) || ' → ' || public._gd_fmt(q)); end if;
    if h <> x.h then ubah := ubah || ('perkiraan harga Rp ' || public._gd_fmt(x.h) || ' → Rp ' || public._gd_fmt(h)); end if;
    if al <> x.al then ubah := ubah || 'alasan diubah'::text; end if;
    if cardinality(ubah) = 0 then return json_build_object('ok', false, 'pesan', 'Tidak ada yang berubah.'); end if;
    if x.bs is not null then
      perform public._ubah_catat('pengadaan_ajuan', x.id, case when st = 'Disetujui' then array['qty_disetujui'] else array['qty', 'perkiraan_harga_satuan', 'alasan'] end);
    end if;
    if st = 'Disetujui' then update pengadaan_ajuan set qty_disetujui = q where id = x.id;
    else update pengadaan_ajuan set qty = q, perkiraan_harga_satuan = h, alasan = al where id = x.id; end if;
    insert into pengadaan_koreksi_log (no, bagian, aksi, status_lama, qty_lama, qty_baru, harga_lama, harga_baru, alasan_lama, alasan_baru, catatan, oleh, email)
    values (x.no, x.bg, 'ubah', st, qlama, q, x.h, h, x.al, al, cat, v_oleh, lower(coalesce(auth.jwt() ->> 'email', '')));
    rinci := array_to_string(ubah, ', ');
  end if;
  teks := '✏️ <b>PENGAJUAN DIKOREKSI PENGAJU</b>' || E'\nOleh: <b>' || public._tg_esc(v_oleh) || '</b> · ' || public._tg_esc(case x.bg when 'Gudang' then 'Gudang Utama' else x.bg end) || E'\n\n'
    || '• ' || public._tg_esc(x.no || ' · ' || x.n || case when x.w <> '' and position(x.w in upper(x.n)) = 0 then ' · ' || x.w else '' end)
    || ' <i>(' || public._tg_esc(st) || ')</i>' || E'\n   ' || public._tg_esc(rinci)
    || E'\nAlasan koreksi: ' || public._tg_esc(cat)
    || E'\n\n<i>' || to_char(kini at time zone 'Asia/Makassar', 'DD/MM/YYYY HH24:MI') || '</i>';
  insert into efek_antre (jenis, data) values ('tg', jsonb_build_object('teks', teks,
    'asal', jsonb_build_object('e', case x.bg when 'Gudang' then '📦' when 'Produksi' then '🏭' else '🧪' end,
                               'n', case x.bg when 'Gudang' then 'Gudang Utama' when 'Produksi' then 'Staf Produksi' else 'Staf Bahan Baku' end, 'nama', v_nama)));
  return json_build_object('ok', true, 'st', case when aksi = 'batal' then 'Batal' else st end, 'q', case when aksi = 'batal' then qlama else q end,
    'h', coalesce(h, x.h), 'al', coalesce(al, x.al),
    'pesan', x.no || case when aksi = 'batal' then ' dibatalkan.' else ' dikoreksi: ' || rinci || '.' end || ' Sudah dikabarkan ke grup.');
end $function$;
revoke all on function public.pengadaan_koreksi(text, text, text, text, text, text, text) from public, anon;
grant execute on function public.pengadaan_koreksi(text, text, text, text, text, text, text) to authenticated;
