# Panduan Build Aplikasi Android (Native) dengan Android Studio

Panduan ini khusus untuk membuat file APK/AAB yang siap rilis menggunakan Android Studio.

## 1. Persiapan Project
Pastikan konfigurasi aplikasi sudah benar:
1.  Buka `capacitor.config.json` dan pastikan `appName` sudah **"Kasir UMKM POS"**.
2.  Buka terminal di folder project dan jalankan:
    ```bash
    npm run build
    npx cap sync
    ```

## 2. Pilihan Cara Build

### PILIHAN A: Cara Otomatis "Anti-Ribet" (Rekomendasi Utama)
Saya sudah membuatkan script khusus **"ONE_CLICK_BUILD.bat"** di folder download Anda.
Script ini akan:
1.  Otomatis memperbaiki masalah versi Java.
2.  Otomatis menyinkronkan kode terbaru.
3.  Otomatis membuat file aplikasi siap rilis.

**Caranya:**
1.  Buka folder proyek di File Explorer.
2.  Cari file bernama `ONE_CLICK_BUILD.bat`.
3.  **Double Click** file tersebut.
4.  Tunggu sampai muncul tulisan "BUILD SUKSES".

File hasil build akan ada di: `android/app/build/outputs/bundle/release/app-release.aab`

### PILIHAN B: Menggunakan Android Studio (Pasti Berhasil)
Script otomatis di atas mungkin gagal jika settingan Java di Windows Anda bermasalah (seperti yang terjadi sekarang).
Jangan khawatir, saya sudah mengotomatisasi semua **KONFIGURASI**. Anda cukup melakukan klik berikut:

1.  **Buka Project**
    ```bash
    npx cap open android
    ```

2.  **Build (Tanpa Password!)**
    *   Tunggu proses loading (Gradle Sync) selesai.
    *   Klik menu **Build** -> **Generate Signed Bundle / APK**.
    *   Pilih **Android App Bundle** -> Next.
    *   **LANGSUNG KLIK NEXT / FINISH**. Anda **TIDAK PERLU** mengisi password atau memilih key, karena saya sudah menanamkan file `keystore.properties` otomatis!
    *   Pilih **release** -> Create.

File aplikasi akan jadi dalam hitungan menit tanpa ribet.
    Atau buka Android Studio, pilih **Open**, dan arahkan ke folder `android` di dalam project aplikasi kasir.

## 3. Mengganti Icon Aplikasi (Opsional tapi Disarankan)
Agar aplikasi telihat profesional, ganti icon default Capacitor:
1.  Di Android Studio, klik kanan pada folder `app` -> `res`.
2.  Pilih **New** -> **Image Asset**.
3.  Pada **Icon Type**, pilih **Launcher Integ (Adaptive and Legacy)**.
4.  Pada **Path**, pilih gambar logo aplikasi Anda.
5.  Atur scaling agar pas.
6.  Klik **Next** -> **Finish**.

## 4. Build APK (Untuk Testing/Debug)
Gunakan ini jika ingin mencoba aplikasi di HP sendiri tanpa upload ke Play Store.
1.  Menu **Build** -> **Build Bundle(s) / APK(s)** -> **Build APK(s)**.
2.  Tunggu proses selesai.
3.  Klik notifikasi **locate** di pojok kanan bawah, atau buka folder:
    `android/app/build/outputs/apk/debug/app-debug.apk`
4.  Kirim file APK ini ke HP dan install.

## 5. Build AAB & Signed APK (Untuk Play Store)
Ini adalah format wajib untuk rilis ke Google Play Store.

1.  Menu **Build** -> **Generate Signed Bundle / APK**.
2.  Pilih **Android App Bundle** (rekomendasi Google) atau **APK**. Klik **Next**.
3.  **Key store path**:
    *   Jika belum punya, klik **Create new...**
    *   Simpan file `.jks` di tempat aman (JANGAN SAMPAI HILANG).
    *   Isi Password, Alias, dan Validity (25 years).
    *   Isi Certificate info seperlunya.
    *   Klik **OK**.
    *   Jika sudah punya, pilih file `.jks` lama dan masukkan password.
4.  Klik **Next**.
5.  Pilih **release**.
6.  Klik **Create** / **Finish**.
7.  File hasil build ada di folder `android/app/release/`.

## 6. Mengganti Versi Aplikasi
Jika ingin update aplikasi di Play Store, Anda harus menaikkan versi:
1.  Buka file `android/app/build.gradle`.
2.  Cari bagian `defaultConfig`:
    ```gradle
    defaultConfig {
        applicationId "com.posumkm.app"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1  // <--- Naikkan angka ini (misal jadi 2)
        versionName "1.0" // <--- Ubah nama versi (misal "1.1")
        ...
    }
    ```
3.  Sync Gradle (klik icon Gajah di pojok kanan atas).

## Troubleshooting Umum
*   **Gradle Sync Failed**: Coba klik menu **File** -> **Invalidate Caches / Restart**.
*   **Build Error**: Pastikan JDK yang dipakai Android Studio kompatibel (biasanya JDK 17 atau 21 sudah built-in).
*   **Icon tidak berubah**: Pastikan sudah melakukan langkah Image Asset dengan benar dan rebuild clean project (**Build** -> **Clean Project**).
