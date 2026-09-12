# Profit Kalkulator App
> By **WendStudio** · Offline PWA untuk pencatatan stok & keuntungan toko

---

## TUTORIAL LENGKAP: Upload ke GitHub → Deploy → Install di HP Android

---

### LANGKAH 1 — Buat Akun GitHub (kalau belum)
1. Buka `github.com` di browser HP
2. Daftar akun (gratis)
3. Verifikasi email

---

### LANGKAH 2 — Buat Repository Baru
1. Login ke GitHub
2. Tap tombol **+** di pojok kanan atas → **New repository**
3. Isi:
   - Repository name: `profit-kalkulator-app`
   - Visibility: **Public** ✅ (wajib untuk GitHub Pages gratis)
   - **Jangan** centang "Initialize this repository"
4. Tap **Create repository**

---

### LANGKAH 3 — Upload File dari HP

Cara termudah dari HP: gunakan **GitHub Web Editor**

1. Setelah buat repo, kamu akan melihat halaman kosong
2. Tap link **"uploading an existing file"**
3. Extract file ZIP yang kamu download dari sini
4. Upload semua file satu per satu (atau gunakan folder ZIP jika ada opsi)

**Alternatif lebih mudah — gunakan aplikasi GitHub:**
1. Install app **GitHub** dari Play Store
2. Login
3. Buka repo yang baru dibuat
4. Upload file langsung dari app

**Struktur yang harus diupload:**
```
profit-kalkulator-app/
├── index.html
├── manifest.json
├── sw.js
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── db.js
│   ├── calc.js
│   ├── files.js
│   ├── spreadsheet.js
│   ├── calculator.js
│   ├── notes.js
│   ├── settings.js
│   └── export.js
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── .github/
    └── workflows/
        └── deploy.yml
```

---

### LANGKAH 4 — Aktifkan GitHub Pages

1. Di halaman repo, tap tab **Settings**
2. Di menu kiri, tap **Pages**
3. Di bagian **Source**, pilih:
   - **Deploy from a branch**
   - Branch: `main`
   - Folder: `/ (root)`
4. Tap **Save**
5. Tunggu 1-2 menit

Atau jika kamu upload file `.github/workflows/deploy.yml`:
- Tap tab **Actions**
- Tunggu workflow selesai (ada centang hijau ✅)
- Alamat aplikasimu:
  `https://USERNAME.github.io/profit-kalkulator-app/`

---

### LANGKAH 5 — Install ke HP Android (Jadi seperti APK)

1. Buka Chrome di HP Android
2. Buka URL: `https://USERNAME.github.io/profit-kalkulator-app/`
   (ganti USERNAME dengan username GitHub kamu)
3. Tunggu aplikasi loading
4. Tap menu Chrome (**titik tiga** di kanan atas)
5. Tap **"Tambahkan ke layar utama"** atau **"Install app"**
6. Tap **Install**
7. Aplikasi sekarang ada di homescreen seperti APK!

---

### CARA PAKAI APLIKASI

**Membuat file stok baru:**
1. Tap **Beranda** → Tap **Buat File Baru**
2. Isi nama file (contoh: "Stok Rokok")
3. Pilih kategori
4. Set persentase keuntungan (default 8%)
5. Tap **Simpan**

**Menambah barang:**
1. Buka file yang sudah dibuat
2. Tap **Tambah Barang**
3. Isi: Nama Barang, Stock, Modal
4. Persentase sudah otomatis dari file
5. Lihat preview "Per Satuan" dan "Total Jumlah" langsung berubah
6. Tap **Simpan**

**Rumus perhitungan:**
```
Per Satuan = Modal × (1 + Persentase%)
Total Jumlah = Stock × Per Satuan

Contoh:
Stock: 10 | Modal: Rp20.000 | Persentase: 8%
Per Satuan = 20.000 × 1.08 = Rp21.600
Total Jumlah = 10 × 21.600 = Rp216.000
```

**Backup data:**
- Pengaturan → Backup Data → file `.json` tersimpan di HP
- Untuk restore: Pengaturan → Restore Data → pilih file backup

**Export ke CSV:**
- Pengaturan → Export Semua Data (CSV)
- Bisa dibuka di Excel / Google Sheets

---

### KONVERSI KE APK (Opsional)

Jika ingin file `.apk` yang bisa di-share:

1. Buka `pwabuilder.com` di browser HP
2. Masukkan URL GitHub Pages aplikasimu
3. Tap **Start** → **Android**
4. Download file `.apk` / `.aab`
5. Install di HP (aktifkan "Unknown sources" di Settings HP)

---

### TROUBLESHOOTING

**App tidak muncul setelah upload:**
- Pastikan semua file sudah terupload
- Pastikan ada file `index.html` di root folder
- Tunggu 2-3 menit setelah upload pertama

**Data hilang:**
- Data tersimpan di browser storage HP
- Jangan clear data Chrome
- Selalu backup secara berkala

**Tidak bisa install ke homescreen:**
- Pastikan menggunakan Chrome (bukan browser lain)
- Pastikan akses lewat HTTPS (GitHub Pages otomatis HTTPS)

---

**WendStudio · Profit Kalkulator App v1.0.0**
