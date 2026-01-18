@echo off
title Kasir UMKM POS Builder
echo ===================================================
echo   OTOMATISASI BUILD KASIR UMKM POS - ANTI ERROR
echo ===================================================
echo.

echo [1/4] Mengatur Environment Java Khusus Sesi Ini...
REM Kita paksa pakai Java dari Android Studio agar tidak konflik
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "PATH=%JAVA_HOME%\bin;%PATH%"

REM Cek versi untuk memastikan
echo Menggunakan Java:
java -version
echo.

echo [2/4] Build Web Assets (Vite)...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo Gagal build web assets!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [3/4] Sinkronisasi ke Project Android...
call npx cap sync
if %ERRORLEVEL% NEQ 0 (
    echo Gagal sync capacitor!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [4/4] Build AAB Release via Gradle...
cd android
echo Membersihkan build sebelumnya...
call gradlew clean
echo Memulai proses build release (ini agak lama)...
call gradlew bundleRelease --no-daemon

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] BUILD GAGAL!
    echo Silakan cek pesan error di atas.
    cd ..
    pause
    exit /b %ERRORLEVEL%
)

cd ..
echo.
echo ===================================================
echo           BUILD SUKSES! ALHAMDULILLAH
echo ===================================================
echo.
echo File AAB siap upload ada di:
echo android\app\build\outputs\bundle\release\app-release.aab
echo.
pause
