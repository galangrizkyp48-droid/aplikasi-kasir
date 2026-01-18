# Cara Build APK untuk Android

## Prasyarat
1. **Android Studio** - Download dari https://developer.android.com/studio
2. **Java Development Kit (JDK)** - Biasanya sudah terinstall bersama Android Studio

## Langkah-Langkah Build APK

### 1. Buka Project Android
```bash
cd "C:\Users\ASUST\Downloads\aplikasi kasir"
npx cap open android
```

Perintah ini akan membuka Android Studio dengan project Android yang sudah disiapkan.

### 2. Di Android Studio

#### A. Tunggu Gradle Sync Selesai
- Setelah project terbuka, Android Studio akan otomatis melakukan "Gradle Sync"
- Tunggu hingga proses ini selesai (bisa 2-5 menit pertama kali)
- Lihat progress bar di bagian bawah Android Studio

#### B. Build APK
Ada 2 cara:

**Cara 1: Debug APK (Untuk Testing)**
1. Klik menu **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. Tunggu proses build selesai
3. Setelah selesai, akan muncul notifikasi di kanan bawah
4. Klik **locate** untuk membuka folder APK
5. File APK ada di: `android/app/build/outputs/apk/debug/app-debug.apk`

**Cara 2: Release APK (Untuk Distribusi)**
1. Klik menu **Build** → **Generate Signed Bundle / APK**
2. Pilih **APK** → **Next**
3. Jika belum punya keystore:
   - Klik **Create new...**
   - Isi form (simpan password dengan baik!)
   - Klik **OK**
4. Pilih **release** build variant
5. Centang **V1 (Jar Signature)** dan **V2 (Full APK Signature)**
6. Klik **Finish**
7. APK ada di: `android/app/release/app-release.apk`

### 3. Install APK ke HP
1. Transfer file APK ke HP Android
2. Buka file APK di HP
3. Izinkan "Install from Unknown Sources" jika diminta
4. Klik **Install**

## Upload ke Google Play Store

### Persiapan
1. Buat akun Google Play Console: https://play.google.com/console
2. Bayar biaya registrasi developer ($25 sekali seumur hidup)

### Langkah Upload
1. Di Android Studio, build **Android App Bundle (AAB)** bukan APK:
   - **Build** → **Generate Signed Bundle / APK**
   - Pilih **Android App Bundle**
2. Upload file `.aab` ke Play Console
3. Isi informasi aplikasi (nama, deskripsi, screenshot, dll)
4. Submit untuk review

## Troubleshooting

### Error: "SDK not found"
- Buka **Tools** → **SDK Manager**
- Install Android SDK yang diminta

### Error: "Gradle build failed"
- Buka **File** → **Invalidate Caches / Restart**
- Restart Android Studio

### APK tidak bisa diinstall
- Pastikan HP mengizinkan "Install from Unknown Sources"
- Cek apakah ada versi lama, uninstall dulu

## Update Aplikasi

Setiap kali ada perubahan kode:
```bash
# 1. Build web assets
npm run build

# 2. Sync ke Android
npx cap sync

# 3. Buka Android Studio dan build ulang APK
npx cap open android
```

## Catatan Penting
- **Debug APK**: Ukuran lebih besar, untuk testing saja
- **Release APK**: Ukuran lebih kecil, sudah dioptimasi, untuk distribusi
- **AAB (Android App Bundle)**: Format wajib untuk Play Store, ukuran paling kecil
