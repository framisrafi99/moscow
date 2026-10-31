-- Izinkan antrean "gjStafUbah" (Payroll › Data staf: tambah / ubah / resign staf).
alter table md_aksi drop constraint md_aksi_fungsi_check;
alter table md_aksi add constraint md_aksi_fungsi_check check (fungsi = any (array['mdSetujuPutus','rpPutus','rpTandai','segarkan','ubahStatusOrder','ttpPutus','ttpBarangUbah','bagiHasilSimpanX','gdPoPutus','gdPoBayar','gdBiayaBayar','gdPoBatalMgmt','pgdAksi','pgsTanpaCek','mdeSimpanBaru','aksesPutus','gjPutus','gjStafUbah']));
