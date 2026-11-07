# Folder sql/ — perubahan database Moscow Supplies

Setiap perubahan database disimpan sebagai satu file di folder ini (nomor berurutan, mis. `196_nama_singkat.sql`).

## Aturan (sejak 7 Nov 2026)

1. **Uji dulu** perubahan yang menyentuh data dengan `do $$ ... raise exception $$` supaya ter-rollback.
2. **Jalankan** file di Supabase (SQL Editor atau lewat Claude).
3. **Catat** bahwa file sudah terpasang:

   ```sql
   insert into public.sql_terpasang (file, cara, catatan)
   values ('196_nama_singkat.sql', 'Claude', 'disetujui Iqbal')
   on conflict (file) do nothing;
   ```

4. File yang belum tercatat tampil di **Master Data › Pusat agen › Penjaga sistem** ("Perubahan database"),
   dan dilaporkan agen Penjaga sistem.

Jangan menulis rahasia (API key, token, chat id) di file SQL — repo ini publik.
