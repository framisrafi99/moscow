-- 216 (24 Nov 2026): daftar "Perlu tindakan" tiap pagi, dikirim pribadi ke manajemen Moscow Supplies (efek_antre 'pl_gm').
-- Isi: uang keluar belanja yang belum tersambung ke pengajuan, barang dibayar tapi belum diterima, pengajuan menunggu ACC,
-- pengajuan sudah ACC tapi belum dibelanjakan, dugaan catatan dobel, dan bukti Telegram yang belum selesai diproses.
-- perlu_tindakan_teks() hanya menyusun teks (bisa dicoba tanpa mengirim); perlu_tindakan_kirim() memasukkannya ke antrean.

create or replace function public.perlu_tindakan_teks()
returns text language plpgsql stable security definer set search_path to 'public', 'audit' as $$
declare
  hari date := (now() at time zone 'Asia/Makassar')::date;
  h text := ''; bag text; n int; total int := 0;
  fmt text := 'FM999,999,999,990';
begin
  -- 1. uang keluar belanja dari Telegram yang belum tersambung ke pengajuan (14 hari)
  select count(*), string_agg('• ' || a.no || ' · ' || to_char(a.tanggal, 'DD/MM') || ' · Rp ' || replace(to_char(a.nominal, fmt), ',', '.') || ' · '
           || public._tg_esc(left(regexp_replace(coalesce(a.keterangan, ''), '\s*\[[^\]]*\]', '', 'g'), 70)), E'\n' order by a.tanggal desc, a.no)
    into n, bag
    from (select * from acc_log a
           where a.status = 'Aktif' and a.jenis = 'Keluar' and a.pengisi like 'telegram:%' and a.nominal >= 50000
             and a.kategori in ('Pembelian bahan baku', 'Botol, stiker & kemasan', 'Pembelian barang dagang / impor', 'Pembelian barang & bahan')
             and coalesce(a.keterangan, '') !~ 'PG-[0-9]{6}-[0-9]{3}' and coalesce(a.keterangan, '') !~* 'disambungkan|proforma|commercial invoice|ongkir|biaya kirim'
             and a.tanggal >= hari - 14
           order by a.tanggal desc limit 10) a;
  if n > 0 then total := total + n;
    h := h || E'\n\n💸 <b>Uang keluar belanja belum tersambung ke pengajuan (' || n || ')</b>\n' || bag
         || E'\n<i>Kalau barangnya ada pengajuannya, pengajuan itu perlu ditandai dibayar supaya staf bisa menerima barang.</i>';
  end if;
  -- 2. sudah dibayar tapi belum diterima (lokal > 3 hari sejak dibayar)
  select count(*), string_agg('• ' || p.no || ' · ' || public._tg_esc(left(p.nama, 40)) || ' · ' || public._tg_esc(coalesce(p.pengaju, '-')) || ' · dibayar ' || to_char(p.waktu_pesan at time zone 'Asia/Makassar', 'DD/MM')
           || ' (' || (hari - (p.waktu_pesan at time zone 'Asia/Makassar')::date) || ' hari)', E'\n' order by p.waktu_pesan)
    into n, bag
    from (select * from pengadaan_ajuan p where p.status = 'Dipesan' and coalesce(p.asal_barang, 'Lokal') <> 'Impor'
            and p.waktu_pesan is not null and p.waktu_pesan < now() - interval '3 days' order by p.waktu_pesan limit 12) p;
  if n > 0 then total := total + n;
    h := h || E'\n\n📦 <b>Sudah dibayar, barang belum ditandai diterima (' || n || ')</b>\n' || bag
         || E'\n<i>Tanyakan ke staf: barangnya sudah datang? Kalau sudah, tandai diterima di form masing-masing.</i>';
  end if;
  -- 3. menunggu ACC
  select count(*), string_agg('• ' || p.no || ' · ' || public._tg_esc(left(p.nama, 40)) || ' · ' || public._js_angka(p.qty) || ' ' || public._tg_esc(coalesce(p.satuan, ''))
           || ' · ' || public._tg_esc(coalesce(p.pengaju, '-')) || ' · ' || (hari - (p.waktu at time zone 'Asia/Makassar')::date) || ' hari', E'\n' order by p.waktu)
    into n, bag
    from (select * from pengadaan_ajuan p where p.status = 'Menunggu' order by p.waktu limit 12) p;
  if n > 0 then total := total + n;
    h := h || E'\n\n⏳ <b>Pengajuan menunggu ACC (' || n || ')</b>\n' || bag;
  end if;
  -- 4. sudah ACC tapi belum dibelanjakan (lokal > 3 hari)
  select count(*), string_agg('• ' || p.no || ' · ' || public._tg_esc(left(p.nama, 40)) || ' · di-ACC ' || to_char(p.waktu_putus at time zone 'Asia/Makassar', 'DD/MM'), E'\n' order by p.waktu_putus)
    into n, bag
    from (select * from pengadaan_ajuan p where p.status = 'Disetujui' and coalesce(p.asal_barang, 'Lokal') <> 'Impor'
            and coalesce(p.waktu_putus, p.waktu) < now() - interval '3 days' order by p.waktu_putus limit 10) p;
  if n > 0 then total := total + n;
    h := h || E'\n\n🛒 <b>Sudah di-ACC, belum dibelanjakan (' || n || ')</b>\n' || bag;
  end if;
  -- 5. dugaan dobel (agen audit)
  select count(*), string_agg('• ' || public._tg_esc(masalah), E'\n') into n, bag from audit.peringatan where data ? 'dobel_lintas';
  if n > 0 then total := total + n;
    h := h || E'\n\n⚠️ <b>Dugaan catatan dobel (' || n || ')</b>\n' || bag;
  end if;
  -- 6. bukti Telegram yang belum selesai (> 1 hari)
  select count(*), string_agg('• #' || b.id || ' · ' || public._tg_esc(coalesce(b.pengirim, '-')) || ' · ' || to_char(b.waktu at time zone 'Asia/Makassar', 'DD/MM')
           || coalesce(' · Rp ' || replace(to_char(b.nominal, fmt), ',', '.'), '') || ' · ' || case b.status when 'gagal' then 'gagal terbaca' when 'tunggu' then 'menunggu dicatat di aplikasi' else 'menunggu konfirmasi' end, E'\n' order by b.id)
    into n, bag
    from (select * from bb_bukti b where b.status in ('usul', 'tunggu', 'gagal') and b.waktu < now() - interval '1 day' order by b.id limit 10) b;
  if n > 0 then total := total + n;
    h := h || E'\n\n🧾 <b>Bukti Telegram belum selesai (' || n || ')</b>\n' || bag;
  end if;
  return '📋 <b>PERLU TINDAKAN · ' || to_char(hari, 'DD/MM/YYYY') || '</b>'
    || case when total = 0 then E'\n\n✅ Semua beres: tidak ada pembayaran yang belum tersambung, barang yang tertahan, atau catatan dobel.' else h end;
end $$;
revoke all on function public.perlu_tindakan_teks() from public, anon, authenticated;

create or replace function public.perlu_tindakan_kirim()
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  insert into efek_antre (jenis, data) values ('pl_gm', jsonb_build_object('teks', left(public.perlu_tindakan_teks(), 3900)));
end $$;
revoke all on function public.perlu_tindakan_kirim() from public, anon, authenticated;

-- tiap pagi 08.12 WITA (00.12 UTC), Senin–Sabtu
select cron.schedule('perlu-tindakan-pagi', '12 0 * * 1-6', 'select public.perlu_tindakan_kirim()');

insert into sql_terpasang (file, cara, catatan)
select '216_perlu_tindakan_pagi.sql', 'mcp', 'Daftar Perlu tindakan tiap pagi ke manajemen'
where not exists (select 1 from sql_terpasang where file = '216_perlu_tindakan_pagi.sql');

-- Sesudah dipasang (24 Nov 2026, lewat MCP):
--   * judul tiap bagian memakai E')</b>\n' supaya baris baru tidak tertulis "\n";
--   * bagian 1 tidak memuat pembayaran impor Mike (kategori Pembelian barang dagang / impor), karena alurnya lewat pengajuan impor;
--   * _plx_bayar_inti: bila p_tr dipakai ulang (bukti Telegram yang sudah tercatat), catatan accounting itu ikut memuat nomor pengajuan;
--   * audit.peringatan: cabang 'dobel_barang' = catatan Telegram yang nominal & nama barangnya sama dengan SATU barang
--     (harga_beli_log) di dalam catatan Purchasing yang berisi beberapa barang (contoh: kardus & sticker di TR-261119-002).
