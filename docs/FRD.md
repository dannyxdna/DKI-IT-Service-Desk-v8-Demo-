# FRD — DKI IT Service Desk & Monitoring (Draft 1.0)

## Scope
Web application untuk Plant 1 dan Plant 2, dengan Ticketing, Daily IT Checksheet, Dashboard, Riwayat, Laporan, dan Master Data.

## Role
- Employee: membuat tiket dan melihat tiket sendiri.
- IT Support: menangani tiket dan mengisi checksheet kedua plant.
- Admin: mengelola akun, role, plant, kategori, template, dan item checksheet.

## Functional requirements
1. Login berbasis akun.
2. Tiket dibuat dengan nomor otomatis IT-YYYY-#####; status Open, In Progress, Pending, Resolved, Closed.
3. Tiket memiliki reporter, plant, departemen, kategori, prioritas, deskripsi, assignee, root cause, resolution notes, timestamp, komentar, dan histori status.
4. Beberapa IT Support dapat membuat sesi checksheet per plant/tanggal.
5. Semua item checklist berlaku di kedua plant.
6. Setiap hasil checksheet berstatus OK, NG, atau N/A; NG wajib disertai catatan.
7. Setelah menyimpan hasil NG, UI menampilkan prompt untuk membuat tiket; tidak ada tiket otomatis.
8. Factory bell dicek manual.
9. Tidak ada upload evidence pada checksheet.
10. Saat tiket diubah ke Resolved, IT Support mengisi tanggal selesai, waktu penyelesaian (menit, pilih cepat atau ketik sendiri) dan downtime (menit, opsional).
11. Dashboard menampilkan ringkasan tiket, progress checksheet, NG, dan tren.
12. Tiket wajib memilih Departemen dan Lokasi (Office, Production, Outdoor). PIC tiket dipilih dari daftar: Mnafik, Rio, Danny.
13. Daily Checksheet menampilkan tabel Server terpisah dari tabel Network & lainnya.
14. Grafik Ticket Trend, Waktu Penyelesaian, dan Downtime masing-masing punya pilihan rentang waktu (7/14/30/60 hari, bulan ini, bulan lalu, atau tanggal bebas) dan filter plant; total ditampilkan di atas grafik. Laporan memuat rekap per tiket + total dan export CSV.
15. Laporan dapat difilter berdasarkan tanggal dan plant; export Excel/PDF merupakan tahap integrasi berikutnya.

## Non-functional requirements
- Responsive desktop/tablet/mobile.
- PostgreSQL terpusat.
- Auth dan Row Level Security.
- Audit status tiket.
- Backup terjadwal sebelum penggunaan produksi.
- Cloud deployment hanya setelah mendapat persetujuan perusahaan.

## KPI
- Service Rate = tiket resolved ÷ tiket masuk × 100%.
- Checksheet Completion = item wajib terisi ÷ total item wajib × 100%.
- NG Rate = item NG ÷ item yang diperiksa × 100%.
- N/A ditampilkan sebagai hasil yang sudah diisi; belum diisi tetap outstanding.

## Open decisions
- Batas minimum internet speed belum ditetapkan.
- Kriteria rinci firewall, WLC, AC, dan status login page perlu dikonfirmasi oleh IT.
- SLA response/resolution belum ditentukan.
