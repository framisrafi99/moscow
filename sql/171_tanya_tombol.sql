-- 171 (6 Nov 2026): pertanyaan konfirmasi dari robot dengan tombol jawaban.
-- Robot mengirim pertanyaan ke satu / beberapa grup (Bukti Bayar, pemberitahuan pengajuan). Siapa pun di grup bisa menjawab
-- (nama penjawab dicatat). Jawaban pertama yang berlaku; pesan di semua grup diganti dengan siapa yang menjawab + hasilnya.
-- Aksi per pilihan (pilihan[k].aksi):
--   {jenis:'pgd_tandai', no, q, t, tr, toko} : pengajuan ditandai dibayar dengan qty q & total t, ditautkan ke transaksi tr (tanpa catat uang lagi)
--   {jenis:'catat'}                          : hanya dicatat (ditindaklanjuti manajemen)

create table if not exists public.bb_tanya (
  id bigint generated always as identity primary key,
  dibuat timestamptz not null default now(),
  teks text not null, pilihan jsonb not null, pesan jsonb,
  status text not null default 'buka', jawab_k int, jawab_oleh text, hasil text, dijawab timestamptz
);
alter table public.bb_tanya enable row level security;

create or replace function public.bb_tanya_jawab(p_id bigint, p_k int, p_oleh text)
returns json language plpgsql security definer set search_path to 'public' as $function$
declare q record; p jsonb; a jsonb; acc record; res jsonb; hasil text := ''; oleh text := left(btrim(coalesce(p_oleh, '')), 40);
begin
  select * into q from bb_tanya where id = p_id for update;
  if q.id is null then return json_build_object('ok', false, 'pesan', 'Pertanyaan tidak ditemukan.'); end if;
  if q.status <> 'buka' then
    return json_build_object('ok', false, 'pesan', 'Sudah dijawab ' || coalesce(q.jawab_oleh, '') || ': ' || coalesce(q.pilihan -> q.jawab_k ->> 'label', ''));
  end if;
  p := q.pilihan -> p_k;
  if p is null then return json_build_object('ok', false, 'pesan', 'Pilihan tidak dikenal.'); end if;
  a := coalesce(p -> 'aksi', '{}');
  if a ->> 'jenis' = 'pgd_tandai' then
    select btrim(no) no, public._rapi_spasi(akun, 60) akun, tanggal into acc from acc_log where btrim(no) = a ->> 'tr';
    if acc.no is null then return json_build_object('ok', false, 'pesan', 'Transaksi ' || coalesce(a ->> 'tr', '?') || ' tidak ditemukan.'); end if;
    res := public._plx_bayar_inti(coalesce(nullif(a ->> 'toko', ''), 'Toko'), acc.akun, to_char(acc.tanggal, 'YYYY-MM-DD'), oleh,
             jsonb_build_array(jsonb_build_object('no', a ->> 'no', 'q', a ->> 'q', 't', a ->> 't')), 'tanya' || q.id, oleh, acc.no)::jsonb;
    if res ? 'perluAlasan' then return json_build_object('ok', false, 'pesan', 'Barang ini pernah dibelanjakan; tandai lewat aplikasi Purchasing supaya alasannya bisa diisi.'); end if;
    if not coalesce((res ->> 'ok')::boolean, false) then return json_build_object('ok', false, 'pesan', coalesce(res ->> 'pesan', 'Gagal menyimpan.')); end if;
    hasil := (a ->> 'no') || ' ditandai dibayar (' || public._gd_fmt((a ->> 'q')::numeric) || ' pcs, Rp ' || public._gd_fmt((a ->> 't')::numeric) || ', ' || acc.no || '). Uang tidak dicatat lagi.';
  else
    hasil := 'Dicatat. Ditindaklanjuti manajemen Moscow Supplies.';
  end if;
  update bb_tanya set status = 'dijawab', jawab_k = p_k, jawab_oleh = oleh, hasil = hasil, dijawab = now() where id = q.id;
  return json_build_object('ok', true, 'teks', q.teks, 'label', p ->> 'label', 'hasil', hasil, 'pesan', coalesce(q.pesan, '[]'));
end $function$;

revoke all on function public.bb_tanya_jawab(bigint, int, text) from public, anon, authenticated;
grant execute on function public.bb_tanya_jawab(bigint, int, text) to service_role;
