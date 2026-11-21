Saya ingin membangun aplikasi Android **Personal Finance Offline** menggunakan **React Native + Expo + JavaScript**.

Aplikasi ini adalah aplikasi keuangan pribadi untuk mencatat pemasukan, pengeluaran, hutang, dan saham. Aplikasi harus **offline-first** dan **tidak menggunakan backend, server, API, database online, atau sistem login**.

## 1. Teknologi

Gunakan:

- React Native
- Expo
- JavaScript
- Expo Router
- SQLite untuk penyimpanan data lokal
- AsyncStorage hanya jika diperlukan untuk settings/preferences sederhana
- React Navigation/Expo Router untuk navigasi
- Library chart yang kompatibel dengan Expo untuk grafik
- Native Share API / Expo Sharing untuk fitur berbagi file
- Date picker yang kompatibel dengan Expo
- WhatsApp sebagai salah satu target sharing melalui native share sheet

Jangan menggunakan:

- Backend
- Node.js server
- Go
- PostgreSQL
- Firebase
- Supabase
- Authentication/Login
- REST API
- Cloud database

Semua data utama harus tersimpan di SQLite lokal pada perangkat.

---

# 2. Konsep Utama

Aplikasi harus bisa digunakan **100% tanpa internet**.

Internet hanya diperlukan ketika pengguna ingin melakukan sinkronisasi data dengan pasangan.

Flow:

```text
HP User A
SQLite
   ↓
Buat file sync
   ↓
Share
   ↓
WhatsApp
   ↓
HP User B
   ↓
Import file
   ↓
SQLite User B
```

WhatsApp hanya digunakan sebagai media mengirim file/data.

Jangan membuat WhatsApp menjadi database.

Aplikasi tidak membutuhkan login.

---

# 3. Dashboard

Halaman utama adalah Dashboard.

Tampilkan:

- Total saldo
- Total pemasukan bulan ini
- Total pengeluaran bulan ini
- Total hutang
- Total investasi/saham
- Grafik pemasukan vs pengeluaran
- Pengeluaran berdasarkan kategori
- Transaksi terbaru

Contoh:

```text
--------------------------------
       PERSONAL FINANCE
--------------------------------

Saldo
Rp 4.250.000

Pemasukan
Rp 5.000.000

Pengeluaran
Rp 750.000

--------------------------------

Pemasukan vs Pengeluaran

     📊 Grafik

--------------------------------

Transaksi Terbaru

+ Rp 5.000.000
Gaji

- Rp 50.000
Makanan

- Rp 25.000
Transport

--------------------------------
```

Dashboard harus mengambil data langsung dari SQLite.

---

# 4. Input Pemasukan dan Pengeluaran

Buat satu form transaksi yang dapat digunakan untuk:

- Pemasukan
- Pengeluaran

Field:

```text
Jenis
[ Pemasukan ▼ ]

Description
[........................]

Nominal
[ Rp ................... ]

Tanggal
[ 19 November 2026 ▼ ]

Kategori
[ Makanan ▼ ]

[ SIMPAN ]
```

## Tanggal

Tanggal harus otomatis menggunakan tanggal hari ini sebagai default.

Tetapi user tetap dapat memilih tanggal lain menggunakan date picker.

User mengatakan "dropdown tanggal dulu", jadi buat UI tanggal yang mudah dipilih. Jangan meminta user mengetik tanggal secara manual.

Format tanggal:

```text
19 November 2026
```

Simpan ke database dalam format ISO:

```text
YYYY-MM-DD
```

Timestamp internal juga boleh disimpan untuk kebutuhan sinkronisasi.

---

# 5. Transaksi

Buat halaman Transactions.

Tampilkan:

```text
November 2026

19 Nov
+ Rp 5.000.000
Gaji

18 Nov
- Rp 50.000
Makanan

17 Nov
- Rp 30.000
Transport
```

Tambahkan:

- Search
- Filter pemasukan/pengeluaran
- Filter tanggal
- Filter kategori
- Edit transaksi
- Delete transaksi

Gunakan SQLite.

---

# 6. Hamburger Menu

Gunakan hamburger menu/drawer.

Menu:

```text
🏠 Dashboard

💰 Transaksi

📊 Statistik

💳 Hutang

📈 Saham

👥 Pasangan

⚙️ Pengaturan
```

---

# 7. Halaman Pasangan

Nama halaman:

```text
Pasangan
```

Tujuannya agar dua orang dapat bertukar data keuangan tanpa backend.

Tidak perlu login.

Tampilkan:

```text
Pasangan

Status:
Belum terhubung

Nomor WhatsApp pasangan

[ +62 ................ ]

[ Kirim Undangan ]

----------------------------

Sinkronisasi

[ 🔄 Sync Data ]

Last sync:
Belum pernah
```

---

# 8. Sistem Undangan Pasangan

User memasukkan nomor WhatsApp pasangan.

Contoh:

```text
+628123456789
```

Kemudian tekan:

```text
Kirim Undangan
```

Aplikasi membuat pesan WhatsApp seperti:

```text
Hai ❤️

Yuk gunakan Personal Finance bersama untuk memantau keuangan kita.

Download dan buka aplikasi ini untuk mulai sinkronisasi data.

Invite Code:
XXXXXX
```

Gunakan WhatsApp deep link/share mechanism jika memungkinkan.

Jangan membuat API WhatsApp sendiri.

Jangan menggunakan WhatsApp Business API.

---

# 9. Sinkronisasi Tanpa Backend

Ini adalah bagian paling penting.

Saya ingin sistem sinkronisasi yang **tidak menggunakan server**.

Gunakan file lokal sebagai media pertukaran data.

Contoh:

```text
personal_finance_sync.json
```

Isi file:

```json
{
  "version": 1,
  "deviceId": "unique-device-id",
  "exportedAt": "2026-11-19T12:00:00Z",
  "transactions": [],
  "debts": [],
  "stocks": [],
  "categories": []
}
```

File tersebut dapat dikirim melalui:

- WhatsApp
- Telegram
- Nearby Share
- Email
- Bluetooth/share sheet
- File manager

Gunakan native share sheet.

---

# 10. Tombol Sync

Di halaman Pasangan tampilkan tombol:

```text
🔄 Sinkronkan
```

Tetapi jelaskan kepada user bahwa karena aplikasi tidak menggunakan backend, sinkronisasi dilakukan dengan bertukar file.

Flow:

```text
User A
   ↓
Tekan Sync
   ↓
Generate sync file
   ↓
Share
   ↓
WhatsApp
   ↓
Pasangan menerima file
   ↓
Open With Personal Finance
   ↓
Import
   ↓
Merge database lokal
```

---

# 11. Jangan Menghapus Data Lama

Sistem sync harus menggunakan mekanisme merge.

Jangan melakukan:

```text
DROP DATABASE
```

dan jangan mengganti seluruh database lokal secara sembarangan.

Setiap record harus mempunyai:

```text
id
device_id
created_at
updated_at
deleted_at
```

Gunakan UUID untuk ID.

Contoh:

```text
transaction_id
device_id
created_at
updated_at
```

Jika data belum ada:

```text
INSERT
```

Jika data sudah ada dan versi remote lebih baru:

```text
UPDATE
```

Jika tidak berubah:

```text
SKIP
```

---

# 12. Two-Way Sync

Harus mendukung:

```text
User A → User B
User B → User A
```

Contoh:

User A mencatat:

```text
Makan
Rp50.000
```

Kemudian sync ke User B.

User B mencatat:

```text
Belanja
Rp100.000
```

Kemudian sync kembali ke User A.

Setelah kedua perangkat melakukan sync, keduanya memiliki data yang sama.

Gunakan:

```text
updated_at
```

untuk membantu menentukan data terbaru.

Jika terjadi conflict, jangan diam-diam menghapus data.

Tampilkan conflict dan berikan pilihan:

```text
Conflict ditemukan

Data A:
Makan
Rp50.000

Data B:
Makan
Rp75.000

[ Gunakan Data Saya ]

[ Gunakan Data Pasangan ]
```

---

# 13. Sync File Harus Kecil

Jangan mengirim seluruh aplikasi.

Hanya kirim data yang diperlukan.

Jika memungkinkan, buat delta sync:

```text
transactions changed
debts changed
stocks changed
```

Jangan memasukkan:

- cache
- gambar
- temporary files
- UI state
- settings yang tidak diperlukan

Jika database masih kecil, full export JSON juga boleh sebagai MVP.

Prioritaskan sistem yang stabil dan mudah dipahami.

---

# 14. Status Sync

Setiap data mempunyai status:

```text
synced
pending
updated
```

Contoh:

```text
Makan
Rp50.000

Status:
⏳ Belum disinkronkan
```

Setelah berhasil:

```text
Makan
Rp50.000

Status:
✓ Tersinkron
```

Di dashboard atau halaman Pasangan tampilkan:

```text
3 data belum disinkronkan
```

dan tombol:

```text
🔄 Sinkronkan Sekarang
```

---

# 15. Halaman Hutang

Buat page:

```text
Hutang
```

Hutang dapat berupa:

```text
Saya berhutang kepada seseorang
```

atau:

```text
Seseorang berhutang kepada saya
```

Field:

```text
Nama
Description
Nominal
Tanggal
Jatuh tempo
Tipe hutang
Status
```

Tipe:

```text
Saya Berhutang
Orang Berhutang Kepada Saya
```

Status:

```text
Belum Lunas
Sebagian
Lunas
```

Contoh:

```text
Hutang

Budi
Rp500.000
Jatuh tempo:
25 November 2026

Status:
Belum Lunas

[ Bayar ]
```

Saat pembayaran sebagian dilakukan:

```text
Total hutang: Rp500.000
Sudah dibayar: Rp200.000
Sisa: Rp300.000
```

Semua data hutang juga harus masuk sistem sync.

---

# 16. Halaman Saham

Buat page:

```text
Saham
```

Karena aplikasi harus offline, jangan mengambil harga saham secara realtime dari API.

User memasukkan data secara manual.

Field:

```text
Kode Saham
Nama
Jumlah Lot
Harga Beli
Tanggal Beli
Catatan
```

Contoh:

```text
BBCA

10 Lot

Harga beli:
Rp9.000

Total:
Rp9.000.000
```

Tampilkan:

```text
Total Investasi
Rp9.000.000
```

User dapat mengubah harga pasar secara manual jika ingin menghitung estimasi keuntungan.

Contoh:

```text
Harga Beli:
Rp9.000

Harga Sekarang:
Rp10.000

Profit:
+Rp1.000.000
```

Jangan membutuhkan internet untuk fitur saham MVP.

Semua data saham juga harus dapat disinkronkan dengan pasangan.

---

# 17. Database Schema

Gunakan SQLite.

Minimal tabel:

```text
transactions
----------------
id
device_id
type
description
amount
category
date
created_at
updated_at
deleted_at
sync_status
```

```text
debts
----------------
id
device_id
person_name
description
type
amount
paid_amount
due_date
status
created_at
updated_at
deleted_at
sync_status
```

```text
stocks
----------------
id
device_id
symbol
name
lots
buy_price
current_price
buy_date
description
created_at
updated_at
deleted_at
sync_status
```

```text
categories
----------------
id
name
type
created_at
updated_at
```

```text
sync_metadata
----------------
id
device_id
partner_id
last_sync_at
```

---

# 18. Security

Karena aplikasi menyimpan data keuangan pribadi, jangan menyimpan data sensitif secara sembarangan.

Tambahkan opsi:

```text
App Lock
```

dengan:

```text
PIN 4-6 digit
```

Tetapi fitur PIN jangan menghambat penggunaan aplikasi.

Jika memungkinkan gunakan secure storage untuk menyimpan credential/secret.

Jangan menyimpan PIN dalam plaintext.

---

# 19. Backup

Tambahkan menu:

```text
Backup & Restore
```

Fitur:

```text
Export Data
Import Data
```

Format:

```text
JSON
```

Opsional:

```text
CSV
```

User dapat menyimpan backup ke:

- Google Drive
- File Manager
- WhatsApp
- Telegram
- Email

melalui native share sheet.

---

# 20. UI/UX

Buat desain modern, minimalis, dan nyaman untuk aplikasi keuangan.

Gunakan:

- Card
- Rounded corners
- Bottom sheet
- Floating Action Button
- Drawer/Hamburger
- Chart
- Icon yang jelas
- Dark mode
- Light mode

Warna harus menunjukkan:

```text
Hijau = pemasukan / positif

Merah = pengeluaran / hutang

Netral = informasi
```

Jangan terlalu banyak animasi.

Prioritaskan performa dan usability.

---

# 21. Floating Action Button

Di Dashboard:

```text
             +
```

Ketika ditekan:

```text
Tambah

[ + Pemasukan ]

[ - Pengeluaran ]

[ 💳 Hutang ]

[ 📈 Saham ]
```

---

# 22. Offline Requirement

Pastikan aplikasi tetap dapat:

- dibuka tanpa internet
- melihat dashboard
- melihat transaksi
- menambah transaksi
- mengedit transaksi
- menghapus transaksi
- melihat grafik
- menambah hutang
- mengubah hutang
- menambah saham
- mengubah saham
- membuat backup
- mengimpor backup

tanpa internet.

Hanya fitur berikut yang memerlukan koneksi/share:

```text
Sinkronisasi dengan pasangan
```

Tetapi sebenarnya proses import/export file sendiri juga dapat dilakukan tanpa internet jika file sudah tersedia di perangkat.

---

# 23. Jangan Buat Login

Aplikasi harus langsung bisa digunakan setelah install.

Flow pertama:

```text
Install
 ↓
Open
 ↓
Masukkan nama
 ↓
Pilih mata uang
 ↓
Dashboard
```

Tidak ada:

```text
Login
Register
Email
Password
OTP
```

Buat device ID otomatis ketika aplikasi pertama kali dibuka.

---

# 24. Struktur Project

Gunakan struktur yang bersih:

```text
app/
├── _layout.js
├── index.js
├── transactions.js
├── statistics.js
├── debts.js
├── stocks.js
├── partner.js
└── settings.js

components/
├── BalanceCard.js
├── TransactionItem.js
├── TransactionForm.js
├── DebtCard.js
├── StockCard.js
├── ChartCard.js
└── SyncButton.js

database/
├── db.js
├── schema.js
├── migrations.js
└── repositories/
    ├── transactionRepository.js
    ├── debtRepository.js
    ├── stockRepository.js
    └── categoryRepository.js

services/
├── syncService.js
├── exportService.js
├── importService.js
└── whatsappService.js

utils/
├── currency.js
├── date.js
├── uuid.js
└── calculations.js

constants/
├── categories.js
└── colors.js
```

---

# 25. Coding Rules

Saya ingin kode production-quality tetapi tetap sederhana.

Gunakan:

- reusable components
- service layer
- repository pattern sederhana
- centralized database initialization
- validation
- error handling
- loading state
- empty state
- confirmation dialog sebelum delete
- Toast/Snackbar untuk feedback

Jangan membuat kode terlalu kompleks.

Jangan menggunakan backend.

Jangan membuat authentication.

Jangan menggunakan API eksternal untuk core functionality.

---

# 26. Prioritas Development

Jangan langsung membuat seluruh fitur sekaligus.

Bangun secara bertahap.

Phase 1:

```text
Expo project
SQLite
Dashboard
Transaction CRUD
```

Phase 2:

```text
Categories
Statistics
Charts
```

Phase 3:

```text
Hutang
```

Phase 4:

```text
Saham
```

Phase 5:

```text
Partner
Export
Import
Sync
```

Phase 6:

```text
Backup
App Lock
Dark Mode
Polishing
```

Setelah setiap phase selesai, pastikan aplikasi masih dapat dijalankan.

---

# 27. Acceptance Criteria

Aplikasi dianggap berhasil jika:

1. Bisa diinstall di Android.
2. Bisa digunakan tanpa internet.
3. Tidak membutuhkan login.
4. Data transaksi tersimpan di HP.
5. Data tetap ada setelah aplikasi ditutup.
6. Data tetap ada setelah HP offline.
7. User dapat mencatat pemasukan.
8. User dapat mencatat pengeluaran.
9. Tanggal otomatis terisi tanggal hari ini.
10. User dapat mengubah tanggal.
11. User dapat melihat saldo.
12. User dapat melihat statistik.
13. User dapat mengelola hutang.
14. User dapat mengelola saham.
15. User dapat export data.
16. User dapat import data.
17. User dapat mengirim file sync melalui WhatsApp/share sheet.
18. Pasangan dapat mengimport file tersebut.
19. Data pasangan tidak menghapus data lokal.
20. Data dapat di-merge.
21. Tidak ada backend.
22. Tidak ada database online.
23. Aplikasi gratis untuk dibuka/digunakan.
24. Tidak ada subscription requirement.
25. Core functionality tetap 100% offline.

---

# 28. Output yang Saya Inginkan dari Agent

Jangan hanya memberikan contoh kode.

Bangun project yang benar-benar runnable.

Berikan:

1. Struktur project.
2. Semua dependency yang diperlukan.
3. Semua file source code.
4. Database schema.
5. SQLite initialization.
6. CRUD transaksi.
7. Dashboard.
8. Statistik.
9. Hutang.
10. Saham.
11. Partner.
12. Export/import.
13. Sync/merge system.
14. WhatsApp/share integration.
15. Error handling.
16. README.
17. Cara menjalankan dengan:

```bash
npm install
npx expo start
```

dan cara build Android.

Jika terdapat dependency yang tidak kompatibel dengan Expo managed workflow, pilih alternatif yang kompatibel dengan Expo atau jelaskan dengan jelas jika membutuhkan development build.

Jangan mengubah requirement utama:

**Aplikasi harus offline-first, tanpa backend, tanpa login, tanpa database online, menggunakan JavaScript + React Native + Expo + SQLite.**

jadi user hanya perlu download dan juga pakai download pakai data jaringan ketika dipakai 100% offline, kecuali ketika syncron ke pasangan
