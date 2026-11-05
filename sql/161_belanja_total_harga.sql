-- 161 (5 Nov 2026): Purchasing mengisi TOTAL yang dibayar per barang (termasuk ongkir); harga satuan dihitung & disimpan otomatis.
-- Pembelian berikutnya menampilkan perbandingan dengan harga terakhir; kenaikan > 0,5% dilaporkan ke Kendali Bisnis (harga_naik_log + Telegram).
-- Sudah diterapkan langsung di Supabase. plx_bayar diubah di tempat (lihat catatan di bawah); definisi lengkapnya: pg_get_functiondef('public.plx_bayar'::regproc).

create table if not exists public.harga_beli_log (
  id bigint generated always as identity primary key,
  waktu timestamptz not null default now(),
  tanggal date,
  sumber text,          -- 'Belanja lokal'
  no text,              -- nomor pengajuan
  kelompok text,        -- Barang jualan / Bahan baku / Botol & stiker / Packaging & lainnya
  kode text, warna text, nama text, satuan text,
  qty numeric, total numeric, harga_satuan numeric,
  toko text, pengisi text
);
alter table public.harga_beli_log enable row level security;

CREATE OR REPLACE FUNCTION public._harga_beli_akhir(p_kel text, p_k text, p_w text, p_n text)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
-- harga beli satuan terakhir: harga_beli_log, lalu cadangan riwayat lama (po_item untuk barang jualan, bahan_baku_beli untuk bahan baku).
declare kel text := btrim(coalesce(p_kel, '')); k text := upper(btrim(coalesce(p_k, ''))); w text := upper(btrim(coalesce(p_w, ''))); n text := lower(btrim(coalesce(p_n, ''))); r jsonb;
begin
  select jsonb_build_object('h', harga_satuan, 't', to_char(tanggal, 'YYYY-MM-DD'), 'sup', coalesce(toko, ''), 'sumber', 'Belanja ' || coalesce(no, '')) into r
    from harga_beli_log where kelompok = kel and harga_satuan > 0
     and case when k <> '' then upper(coalesce(kode, '')) = k and upper(coalesce(warna, '')) = w else coalesce(kode, '') = '' and lower(btrim(coalesce(nama, ''))) = n end
   order by tanggal desc nulls last, id desc limit 1;
  if r is not null then return r; end if;
  if kel = 'Barang jualan' and k <> '' then
    select jsonb_build_object('h', i.harga_satuan, 't', to_char(p.tanggal, 'YYYY-MM-DD'), 'sup', coalesce(p.supplier, ''), 'sumber', 'PO ' || coalesce(p.no_po, '')) into r
      from po_item i join po_log p on btrim(p.no_po) = btrim(i.no_po)
     where upper(btrim(i.kode)) = k and coalesce(i.harga_satuan, 0) > 0 and coalesce(btrim(p.status), '') not in ('Ditolak', 'Batal')
     order by p.tanggal desc nulls last, p.id desc, i.id desc limit 1;
  elsif kel = 'Bahan baku' and k <> '' then
    select jsonb_build_object('h', round(harga_total / qty_dipesan, 2), 't', to_char(tanggal_beli, 'YYYY-MM-DD'), 'sup', coalesce(supplier, ''), 'sumber', 'Pembelian ' || coalesce(no, '')) into r
      from bahan_baku_beli where upper(btrim(kode)) = k and coalesce(harga_total, 0) > 0 and coalesce(qty_dipesan, 0) > 0
     order by tanggal_beli desc nulls last, id desc limit 1;
  end if;
  return r;
end $function$;

CREATE OR REPLACE FUNCTION public.plx_harga_terakhir(p_nos text[])
 RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare out jsonb := '{}'; x record; r jsonb;
begin
  if not public._boleh_peran(array['purchasing_shopeepay']) and (select public.peran_saya()) is distinct from 'manajemen' then return json_build_object('ok', false, 'pesan', 'Akses ditolak.'); end if;
  for x in select distinct on (a.no) a.no, a.kel, a.k, a.w, a.n from public._pgd_ajuan() a where a.no = any (coalesce(p_nos, '{}')) order by a.no, a.u desc loop
    r := public._harga_beli_akhir(x.kel, x.k, x.w, x.n);
    if r is not null then out := out || jsonb_build_object(x.no, r); end if;
  end loop;
  return json_build_object('ok', true, 'harga', out);
end $function$;

-- Perubahan di plx_bayar(p_toko, p_bayar, p_tanggal, p_nama, p_items, p_token):
--  * item boleh membawa 't' = total dibayar untuk barang itu (ongkir sudah dibagi rata oleh form): h = round(t / q, 2), sub = t.
--    Jalur lama 'h' (harga satuan) tetap diterima.
--  * tiap baris dicatat ke harga_beli_log; dibandingkan dengan _harga_beli_akhir sebelum dicatat.
--    Kalau harga satuan baru > harga lama x 1,005 -> dikumpulkan dan dikirim ke _hrg_catat(naik) (sumber 'Belanja lokal'):
--    masuk harga_naik_log (dibaca Kendali Bisnis) + Telegram "HARGA BELI NAIK".
--  * pesan Telegram per barang: "qty × Rp harga satuan = Rp subtotal"; pesan balik menyebut jumlah barang yang harganya naik.
