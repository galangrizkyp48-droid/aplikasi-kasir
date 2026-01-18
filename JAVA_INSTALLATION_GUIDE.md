# Java Installation Required

Untuk build APK menggunakan Android Studio/Gradle, sistem Anda memerlukan **Java Development Kit (JDK)** yang belum terinstall.

## Pilihan 1: Install JDK (Untuk Build APK)

### Download JDK
- Download dari: https://adoptium.net/
- Pilih **JDK 17** atau **JDK 21** untuk Windows (x64)
- Download file `.msi` installer

### Install JDK
1. Jalankan file installer yang sudah didownload
2. Ikuti wizard instalasi (Next, Next, Install)
3. Tunggu hingga selesai

### Set JAVA_HOME (Otomatis)
Installer biasanya sudah mengatur JAVA_HOME secara otomatis. Untuk memastikan:

1. Buka **Command Prompt** baru (PENTING: buka yang baru)
2. Ketik: `java -version`
3. Jika muncul versi Java, berarti sudah berhasil

### Build APK Setelah Install Java
Setelah Java terinstall, jalankan command berikut:
```bash
cd "C:\Users\ASUST\Downloads\aplikasi kasir\android"
.\gradlew assembleDebug
```

APK akan tersimpan di:
```
C:\Users\ASUST\Downloads\aplikasi kasir\android\app\build\outputs\apk\debug\app-debug.apk
```

---

## Pilihan 2: Gunakan PWA (Lebih Mudah, Tanpa APK)

Aplikasi sudah bisa diinstall langsung dari browser sebagai **Progressive Web App (PWA)**:

### Untuk Android (Chrome):
1. Buka website aplikasi di Google Chrome
2. Tunggu pop-up **"Add to Home Screen"** atau **"Install App"**
3. Atau tekan **menu (⋮)** → **"Install App"**
4. Aplikasi akan terinstall seperti aplikasi native

### Untuk iOS (Safari):
1. Buka website di Safari
2. Tekan tombol **Share** (kotak dengan panah)
3. Pilih **"Add to Home Screen"**
4. Tekan **Add**

---

## Rekomendasi
Jika tujuannya hanya untuk distribusi ke user, **gunakan PWA** (Pilihan 2) karena:
- Tidak perlu install JDK
- Tidak perlu build APK
- Update otomatis tanpa perlu download ulang
- Ukuran lebih kecil
- Bisa digunakan di Android dan iOS
