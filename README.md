# Finance Familia

Aplikasi pencatatan keuangan pribadi offline-first berbasis Expo Router. Tidak ada akun, login, backend, database online, atau API eksternal. Transaksi, hutang, saham, kategori, dan pengaturan disimpan di SQLite lokal.

## Fitur

- Dashboard saldo, ringkasan bulanan, dan grafik lokal.
- CRUD transaksi pemasukan/pengeluaran, kategori, pencarian, serta filter.
- Pengelolaan hutang/piutang dan pembayaran sebagian.
- Portofolio saham manual dengan estimasi nilai dan profit.
- Backup/restore JSON melalui pemilih file dan native share sheet.
- Sinkronisasi pasangan dengan bertukar file; konflik ditampilkan agar pengguna memilih salinan.
- Tema sistem/terang/gelap dan App Lock PIN dengan hash di SecureStore.

## Jalankan untuk pengembangan

```bash
npm install
npx expo start
```

Jalankan di perangkat Android dengan Expo Go untuk uji coba, atau buat APK mandiri melalui Expo Application Services (EAS). Modul SQLite, file sharing, dan SecureStore dapat digunakan dalam build Expo yang didukung; perubahan dependency native memerlukan build baru.

## Validasi

```bash
npm run lint
npm run typecheck
npx expo-doctor
```

## Build APK Android

Build `preview` dikonfigurasi untuk menghasilkan APK yang dapat diunduh dan dipasang langsung. Langkah lengkap, termasuk konfigurasi EAS dan instalasi APK di perangkat Android, ada di [PANDUAN_BUILD_ANDROID.md](./PANDUAN_BUILD_ANDROID.md).

## Catatan privasi dan sinkronisasi

- Data utama tersimpan di SQLite pada perangkat.
- Ekspor JSON menggunakan file lokal dan menu berbagi Android; WhatsApp hanya menjadi media pengiriman file.
- Sinkronisasi bukan real-time dan tidak memakai server. Impor menggabungkan record berdasarkan ID, menyimpan tombstone penghapusan, dan meminta pilihan untuk konflik.
- Simpan salinan backup di lokasi aman. Menghapus aplikasi dapat menghapus database lokal.
