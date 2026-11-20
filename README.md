# DKI IT Service Desk — UI Prototype & Database

## Isi paket
- `src/`: React + Vite responsive UI prototype.
- `supabase/schema.sql`: struktur database PostgreSQL, enum, indeks, trigger nomor tiket, dan RLS dasar.
- `supabase/seed.sql`: master Plant 1/Plant 2, template, checklist dan kategori tiket.
- `docs/`: dokumentasi rancangan.

## Menjalankan UI
1. Install Node.js LTS.
2. Ekstrak folder.
3. Jalankan `npm install`.
4. Jalankan `npm run dev`.
5. Buka alamat lokal yang ditampilkan Vite.

UI saat ini adalah prototype interaktif dengan data contoh lokal (state browser). Belum menyimpan ke Supabase, belum login sungguhan, dan belum multi-user secara real. File SQL adalah fondasi database untuk tahap integrasi.

## Integrasi Supabase
1. Buat project Supabase setelah mendapat persetujuan perusahaan.
2. Jalankan `supabase/schema.sql` melalui SQL Editor.
3. Jalankan `supabase/seed.sql`.
4. Buat akun melalui Supabase Auth; admin mengisi `profiles` dengan UUID auth, role, plant, dan departemen.
5. Hubungkan frontend menggunakan `@supabase/supabase-js` dan environment variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
6. Jangan pernah memasukkan `service_role` key ke frontend.

## Keputusan rancangan yang dikonfirmasi
- Semua item checksheet berlaku di Plant 1 dan Plant 2.
- Pemeriksa dapat terdiri dari beberapa akun IT Support.
- Pemeriksaan factory bell dilakukan manual.
- Hasil NG meminta catatan dan menawarkan pembuatan tiket (tidak membuat tiket otomatis).
- Batas minimum internet speed belum ditentukan; sistem hanya menyimpan nilai Mbps.
- Tidak ada upload evidence pada checksheet.

## Catatan penting
- Kriteria DKI-CS-IT-01 revisi a2 dipertahankan: UPS 23–27 V, suhu 19–24°C, power server berfungsi, admin web berhasil diakses, UPS tidak menampilkan error, CCTV semua kamera menyala, router berwarna hijau dan HISS/MES dapat diakses, Cisco berkedip dan hijau.
- Dokumen asli menyatakan cek harian sebelum mulai bekerja/1 kali. Kriteria yang tidak dijelaskan pada dokumen ditandai sebagai tambahan operasional atau belum ditetapkan.
- Perlu review keamanan RLS oleh admin database sebelum data perusahaan dipakai. Untuk kebutuhan produksi, tambahkan workflow approval akun, audit log yang lebih lengkap, backup terjadwal, dan aturan pembatasan akses data per plant.
