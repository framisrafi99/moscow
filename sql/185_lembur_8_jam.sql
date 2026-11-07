-- 185 (7 Nov 2026): lembur dihitung sesudah 8 jam kerja (keputusan manajemen Moscow Supplies untuk kontrak kerja baru).
-- Batas lembur = jam masuk + 8 jam; jam masuk = jadwal masuk staf, atau jam absen masuk kalau datang lebih siang.
-- Sebelumnya: 20 menit sesudah jam pulang (17.20). Tanpa absen masuk tidak dihitung lembur.
do $$
declare d text := pg_get_functiondef('public._gaji_absen_stat'::regproc);
  a text := $x$if pl is not null and pl > jp + 20 then
        l := pl - (jp + 20);$x$;
  b text := $x$if pl is not null and ms is not null and pl > greatest(ms, jm) + 480 then   -- 7 Nov 2026: lembur sesudah 8 jam kerja
        l := pl - (greatest(ms, jm) + 480);$x$;
begin
  if position(a in d) = 0 then return; end if;
  execute replace(d, a, b);
end $$;
select public._gaji_berjalan_segarkan('2026-11');
