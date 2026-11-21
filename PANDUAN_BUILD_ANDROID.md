# Panduan konfigurasi dan membuat APK Android

Ikuti langkah berikut dari folder `Finance_Apps`. Konfigurasi proyek sudah disiapkan agar build `preview` menghasilkan **APK** yang bisa diunduh dan dipasang di Android.

## 1. Siapkan komputer

1. Pasang Node.js versi LTS dan npm.
2. Buka terminal/PowerShell pada folder proyek:

   ```powershell
   cd E:\Project\Keuangan-Apps\Finance_Apps
   ```

3. Pasang dependency:

   ```powershell
   npm install
   ```

4. Pastikan konfigurasi bisa dibaca dan source lolos pemeriksaan:

   ```powershell
   npx expo-doctor
   npm run lint
   npm run typecheck
   ```

## 2. Coba aplikasi saat pengembangan (opsional)

Jalankan:

```powershell
npx expo start
```

Pindai QR dari perangkat atau jalankan di emulator Android. Expo Go berguna untuk uji coba; untuk membagikan aplikasi sebagai APK mandiri, lanjutkan ke EAS Build.

## 3. Siapkan akun build

EAS Build mengompilasi aplikasi di layanan Expo. Build **memerlukan internet**, akun Expo, dan proses login satu kali. Setelah APK dipasang, fitur utama aplikasi tetap berjalan offline.

1. Buat atau gunakan akun Expo di [expo.dev](https://expo.dev).
2. Login dari terminal:

   ```powershell
   npx eas-cli@latest login
   ```

3. Pastikan akun aktif:

   ```powershell
   npx eas-cli@latest whoami
   ```

4. Hubungkan konfigurasi lokal dengan project EAS Anda:

   ```powershell
   npx eas-cli@latest build:configure
   ```

   Pilih Android dan ikuti prompt untuk membuat project EAS baru atau menghubungkan project yang sudah ada. Perintah ini menambahkan ID project EAS ke konfigurasi aplikasi.

5. Profil build APK sudah berada di `eas.json`; ID aplikasi Android sudah ditetapkan sebagai `com.personalfinance.offline`. Jika ID tersebut sudah dipakai aplikasi lain milik Anda, ganti `expo.android.package` pada `app.json` ke ID unik sebelum build pertama.

## 4. Buat APK

Jalankan:

```powershell
npm run build:android:apk
```

Perintah yang sama secara langsung:

```powershell
npx eas-cli@latest build --platform android --profile preview
```

Pada build pertama, EAS mungkin meminta persetujuan untuk membuat Android keystore. Pilih agar EAS membuat dan mengelola keystore, lalu simpan akses akun Expo dengan aman. Keystore yang sama diperlukan untuk pembaruan APK agar dapat memperbarui aplikasi yang sudah terpasang.

Tunggu build selesai. Terminal menampilkan URL halaman build dan tautan unduhan. Anda juga dapat membuka **expo.dev → project → Builds**, memilih build `preview` yang berhasil, lalu mengunduh artefak `.apk`.

> APK belum dapat disertakan langsung dari workspace ini: proses penerbitan binary memerlukan login akun Expo dan build cloud milik pemilik aplikasi. Setelah langkah ini berhasil, URL artefak EAS menjadi tautan download APK Anda.

## 5. Unduh dan pasang di HP

1. Kirim URL APK dari EAS ke HP Android atau unduh APK ke komputer lalu salin ke HP.
2. Buka file `.apk` di HP.
3. Jika diminta, izinkan **Install unknown apps / Izinkan dari sumber ini** untuk browser atau file manager yang digunakan.
4. Tekan **Install**. Setelah terpasang, aplikasi dapat dibuka tanpa koneksi internet.

Pengaturan izin instalasi berasal dari Android, bukan aplikasi ini. Jangan pasang APK dari sumber yang tidak Anda percaya.

## 6. Buat APK pembaruan

Setelah mengubah source code, jalankan kembali:

```powershell
npm run build:android:apk
```

Unduh APK hasil build terbaru. Untuk memperbarui instalasi lama, jangan ubah `expo.android.package` dan gunakan keystore/akun EAS yang sama.

## 7. Cara kerja offline dan pertukaran data

- Dashboard, transaksi, statistik, hutang, saham, serta pengaturan menggunakan penyimpanan SQLite perangkat.
- Saat pertama kali dibuka, aplikasi meminta nomor WhatsApp pemilik dan menyimpannya hanya di perangkat. Tidak ada OTP atau login; nomor pasangan/penerima undangan diatur terpisah pada menu **Pasangan**.
- Untuk bertukar data: buka menu **Pasangan → Bagikan file sync**, pilih WhatsApp atau aplikasi lain di share sheet, lalu penerima membuka aplikasi dan memilih **Impor file JSON**.
- Sinkronisasi tidak otomatis dan tidak memakai server. Bila data yang sama berubah pada kedua perangkat, aplikasi meminta pilihan **Gunakan data saya** atau **Gunakan pasangan**.
- Buat backup berkala ke lokasi aman. Data SQLite di perangkat dapat hilang jika aplikasi dihapus atau perangkat rusak.

## 8. Publikasikan ke Google Play (opsional)

Untuk menguji aplikasi di perangkat sendiri atau membagikan APK langsung, gunakan profil `preview` dan perintah `npm run build:android:apk` di atas. Untuk mengirim aplikasi ke Google Play, buat Android App Bundle (AAB) dengan profil `production`:

```powershell
npx eas-cli@latest build --platform android --profile production
```

Unduh file `.aab` dari halaman build EAS, lalu buat aplikasi di Google Play Console dan unggah AAB ke jalur **Internal testing** untuk uji coba. Setelah listing aplikasi, kebijakan privasi, formulir keamanan data, dan persyaratan Play Console dilengkapi, kirim rilis untuk ditinjau. Pastikan `expo.android.package` tetap sama pada pembaruan berikutnya dan gunakan project/keystore EAS yang sama.

Build dan publikasi memerlukan internet. Akun EAS dipakai untuk mengompilasi aplikasi; akun Google Play Console diperlukan untuk menerbitkan aplikasi di Play Store. Pengguna tetap dapat memakai fitur inti aplikasi secara offline setelah aplikasi terpasang.

## Jika build bermasalah

- Jalankan `npm install`, `npx expo-doctor`, `npm run lint`, dan `npm run typecheck` kembali.
- Pastikan terminal berada di folder `Finance_Apps` dan login EAS benar dengan `npx eas-cli@latest whoami`.
- Buka halaman build EAS untuk membaca log build lengkap. Jangan menghapus Android/iOS native folders secara manual; proyek ini menggunakan konfigurasi Expo dan EAS.
- Untuk APK yang dapat dipasang langsung, gunakan profil `preview` khusus Android (`npm run build:android:apk`). `eas build --platform all` membangun seluruh platform native yang dipilih, bukan web; profil `production` Android menghasilkan AAB.
- Jika preview web menampilkan error `Unable to resolve module ./wa-sqlite/wa-sqlite.wasm`, hentikan server Expo yang sedang berjalan lalu jalankan `npx expo start --web --clear` agar konfigurasi Metro WASM yang baru dimuat.
- Jika build gagal karena versi dependency, periksa pesan Expo SDK dan gunakan `npx expo install --fix`, lalu validasi lagi.
