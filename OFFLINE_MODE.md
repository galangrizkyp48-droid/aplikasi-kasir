# Mode Offline - Panduan Penggunaan

## Fitur Offline

Aplikasi POS UMKM sekarang dapat bekerja **tanpa koneksi internet** untuk fitur-fitur berikut:

### ✅ Fitur yang Bisa Digunakan Offline
1. **Kasir (POS)** - Buat transaksi dan simpan pesanan
2. **Pengeluaran** - Catat pengeluaran operasional
3. **List Belanja** - Kelola daftar belanjaan
4. **Laporan** - Lihat laporan yang sudah di-cache

### ❌ Fitur yang Membutuhkan Internet
1. **Kirim Bill ke WhatsApp** - Butuh koneksi untuk membuka WhatsApp
2. **Sync Data** - Upload data offline ke server
3. **Login** - Verifikasi akun (tapi tetap bisa pakai jika sudah login sebelumnya)

## Cara Kerja

### 1. Deteksi Otomatis
- Aplikasi otomatis mendeteksi status koneksi internet
- Jika offline, data akan disimpan di perangkat

### 2. Menyimpan Data Offline
Ketika Anda membuat pesanan atau transaksi saat offline:
- Data disimpan di **memori perangkat**
- Muncul notifikasi: **"Mode Offline: Pesanan disimpan di perangkat!"**
- Data aman tersimpan meskipun aplikasi ditutup

### 3. Auto-Sync (Sinkronisasi Otomatis)
Ketika koneksi internet kembali:
- Aplikasi **otomatis mendeteksi** koneksi
- Semua data offline akan **di-upload ke server**
- Muncul notifikasi: **"X data offline berhasil di-upload!"**

## Contoh Skenario

### Skenario 1: Listrik Mati, WiFi Mati
1. Anda tetap bisa melayani pelanggan
2. Buat pesanan seperti biasa di POS
3. Klik **"Dapur"** atau **"Bayar"**
4. Pesanan tersimpan di HP
5. Ketika WiFi nyala lagi → Data otomatis terupload

### Skenario 2: Warung di Daerah Sinyal Lemah
1. Login sekali saat ada sinyal
2. Aplikasi akan cache data produk
3. Seharian bisa transaksi tanpa internet
4. Malam hari saat sinyal bagus → Auto-sync

## Tips Penggunaan

### 1. Cache Data Produk
- Buka halaman **Produk** minimal sekali saat online
- Data produk akan tersimpan untuk digunakan offline

### 2. Cek Status Koneksi
- Lihat indikator di header aplikasi
- Jika ada ikon "offline", berarti sedang tidak terhubung

### 3. Jangan Uninstall Aplikasi
- Data offline tersimpan di aplikasi
- Jika uninstall, data offline yang belum ter-sync akan hilang

### 4. Sync Manual (Jika Perlu)
- Tutup dan buka ulang aplikasi saat sudah online
- Atau tunggu beberapa detik, sync otomatis berjalan

## Batasan & Catatan

### Data yang Di-cache
- **Produk**: Tersimpan setelah dibuka sekali
- **Kategori**: Tersimpan setelah dibuka sekali
- **User & Shift**: Tersimpan otomatis saat login

### Kapasitas Penyimpanan
- Data offline menggunakan **localStorage** browser
- Kapasitas: ~5-10 MB (cukup untuk ratusan transaksi)
- Jika penuh, data lama otomatis terhapus setelah di-sync

### Konflik Data
- Jika ada 2 HP yang sama-sama offline dan buat pesanan berbeda
- Saat sync, kedua pesanan akan masuk semua (tidak ada konflik)
- Pastikan hanya 1 kasir yang aktif untuk menghindari duplikasi

## Troubleshooting

### Data Tidak Ter-sync
1. Pastikan koneksi internet stabil
2. Buka aplikasi dan tunggu 10 detik
3. Cek console browser (F12) untuk error

### Pesanan Hilang
- Cek di **Pesanan** → Lihat apakah ada pesanan dengan ID `offline_...`
- Jika ada, berarti belum ter-sync
- Tunggu koneksi internet kembali

### Aplikasi Lambat
- Terlalu banyak data offline yang belum ter-sync
- Hubungkan ke internet untuk sync
- Setelah sync, aplikasi akan kembali cepat

## FAQ

**Q: Apakah data offline aman?**  
A: Ya, data tersimpan di perangkat Anda sendiri (localStorage). Tidak ada yang bisa akses kecuali Anda.

**Q: Berapa lama data offline bisa tersimpan?**  
A: Selama aplikasi tidak di-uninstall dan cache browser tidak dihapus, data akan tetap ada.

**Q: Bisa offline berapa lama?**  
A: Tidak ada batasan waktu. Tapi disarankan sync minimal 1x sehari untuk backup.

**Q: Apakah bisa cetak struk saat offline?**  
A: Ya, fitur cetak tidak membutuhkan internet.

**Q: Bagaimana jika HP mati saat offline?**  
A: Data tetap aman tersimpan. Saat HP dinyalakan lagi, data masih ada dan akan ter-sync saat online.
