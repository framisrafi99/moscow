-- 214 (24 Nov 2026): sama/beda belanja diputuskan sendiri, tanpa bertanya.
-- Nominal sama (selisih <= Rp1.000) DAN ada kata bermakna yang sama di nama barang / toko = belanja yang sama -> disambung otomatis.
-- Nominal sama tapi barangnya lain = belanja berbeda -> dicatat baru. Aturan yang sama dipakai robot Telegram (bukti.ts: miripBelanja).
create or replace function public._kata_belanja(p text) returns text[] language sql immutable as $$
  -- kata bermakna (>= 5 huruf) dari teks belanja; huruf ganda dirapatkan (bubble = buble), kata umum dibuang.
  select coalesce(array_agg(distinct w), '{}') from (
    select regexp_replace(w0, '(.)\1+', '\1', 'g') w
      from regexp_split_to_table(lower(regexp_replace(coalesce(p, ''), '[^A-Za-z]+', ' ', 'g')), '\s+') w0
     where length(w0) >= 5) z
   where length(w) >= 5 and not (w = any (array['untuk','dengan','pesan','pesanan','shope','shopepay','transfer','pembelian','pembayaran','belanja','lokal','invoice',
     'faktur','penjualan','total','barang','bayar','dibayar','tokopedia','rekening','saldo','ongkir','ongkos','kirim','paket','telegram','viory','erdanela',
     'purchasing','status','dikemas','model','ukuran','warna','kemasan','sudah','belum','tempo','jatuh','lewat','tagihan','nomor','biaya','admin','virtual',
     'acount','account','tanpa','keterangan','sebesar','melalui','cargo','ekspedisi','supplier','store','official','mandiri','danamon','belanja']));
$$;
create or replace function public._mirip_belanja(a text, b text) returns boolean language sql immutable as $$
  select exists (select 1 from unnest(public._kata_belanja(a)) x, unnest(public._kata_belanja(b)) y
                  where x = y or (length(x) >= 5 and length(y) >= 5 and (position(x in y) = 1 or position(y in x) = 1)));
$$;
-- _plx_bayar_inti (dipatch lewat MCP, DO block): blok "return ... 'sambung'" dari SQL 212 diganti:
--   for r in select value from jsonb_array_elements(sb_saran) loop
--     if _mirip_belanja(toko || nama barang yang cocok, ket catatan Telegram) then rows[nos].sb := tr; end if;
--   end loop;
insert into sql_terpasang (file, cara, catatan)
select '214_mirip_belanja.sql', 'mcp', 'Sambung Purchasing–Telegram otomatis berdasar nominal + nama barang'
where not exists (select 1 from sql_terpasang where file = '214_mirip_belanja.sql');
