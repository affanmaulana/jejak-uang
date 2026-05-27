# 💸 Jejak Uang (Wealth Forecasting & FIRE Calculator)

**Jejak Uang** adalah aplikasi kalkulator perencanaan keuangan dan investasi (*wealth planning*) premium yang dirancang secara modern untuk memproyeksikan akumulasi kekayaan jangka panjang, mengoptimalkan alokasi dana darurat bertingkat, serta menghitung target kesiapan masa pensiun mandiri (*Financial Independence, Retire Early - FIRE*).

Aplikasi ini menghadirkan antarmuka pengguna (*User Interface*) berskala industri dengan estetika tinggi (kombinasi *glassmorphism*, skema warna harmoni bertema gelap, mikro-animasi halus, dan visualisasi grafik interaktif).

---

## ✨ Fitur Unggulan

### 1. **Interactive Asset Class Allocator**
*   Mendukung **16 instrumen kelas aset spesifik** di pasar keuangan Indonesia & Global (Cash Bank, Bank Digital, SBN Ritel, RDPU, Valas USD, RDPU USD, Obligasi FR, Reksadana Obligasi, Emas/Gold, Reksadana Campuran, S&P 500 ETF, Reksadana Saham, Saham IDX, NASDAQ 100 ETF, Saham US, dan Aset Kripto).
*   **Dual-Currency Toggle**: Mendukung peralihan mata uang dinamis (USD vs IDR) pada instrumen valuta asing/saham global dengan penyetelan nilai kurs manual interaktif.
*   **Custom Overrides**: Pengguna dapat mengubah ekspektasi imbal hasil (*return rate*) tahunan serta toleransi penurunan krisis (*drawdown*) pada masing-masing instrumen secara kustom.
*   **Matematika Input Cerdas**: Pengguna dapat langsung mengetik rumus hitungan matematika sederhana seperti `50,000,000 + 25,000,000 - 15,000,000` langsung di dalam input angka. Sistem otomatis mengevaluasi rumus tersebut dan memformat angka secara real-time saat mengetik.

### 2. **Tiered Emergency Fund Calculator (Alokasi Bertingkat)**
*   Kalkulator Dana Darurat pintar yang membagi target simpanan darurat secara otomatis ke dalam **3 tingkat likuiditas**:
    *   **Tier 1 (Cash / Bank)**: Menyimpan pengeluaran **1 bulan** pertama (sangat likuid untuk kebutuhan mendesak instan).
    *   **Tier 2 (Bank Digital)**: Menyimpan pengeluaran **2 bulan** berikutnya (likuid dengan imbal hasil moderat ~4.0%).
    *   **Tier 3 (Reksadana Pasar Uang / RDPU)**: Menyimpan **sisa target bulan** pengeluaran (likuiditas sedang dengan imbal hasil tinggi ~5.1%).
*   **Integrated Injection**: Pilihan untuk mengintegrasikan alokasi dana darurat bertingkat langsung ke dalam grafik proyeksi portofolio utama secara real-time.

### 3. **FIRE & Compound Growth Projection Tab**
*   Visualisasi pertumbuhan kekayaan dari waktu ke waktu (Tahun ke-0 hingga Tahun ke-10) menggunakan grafik interaktif cerdas **Recharts**.
*   **Metrik Proyeksi Komprehensif**: Menghitung akumulasi pertumbuhan bersih setelah potongan pajak/biaya instrumen, total akumulasi modal, nilai kekayaan riil setelah disesuaikan dengan inflasi tahunan, kelipatan pertumbuhan (*growth multiple*), hingga total keuntungan.
*   **Analisis Skenario Krisis (*Worst Case Scenario*)**: Menguji portofolio terhadap simulasi goncangan ekonomi serentak berbasis tingkat *drawdown* masing-masing instrumen untuk menyimpulkan indikator profil risiko portofolio (dari *Sangat Konservatif* hingga *Sangat Agresif*).
*   **Kalkulator Pensiun Independen**: Memiliki mode proyeksi pensiun instan yang fleksibel, baik secara manual murni atau langsung memuat profil angka dari portofolio aktif Anda.

### 4. **Manajemen Profil Pengguna (User Templates & Schema Versioning)**
*   Dapat menyimpan hingga **3 profil kustom berbeda** secara lokal (*LocalStorage*).
*   Menyimpan preferensi alokasi aset, kontribusi bulanan, modifikasi return kustom, preferences mata uang per instrumen, hingga target FIRE.
*   Dilengkapi dengan **Data Migration Pipeline** untuk mendeteksi skema data usang dan memperbaruinya secara aman tanpa merusak profil yang sudah disimpan pengguna.

### 5. **Pengalaman Pengguna (UX) Premium**
*   **Aksesibilitas Seluler Unggul**: Mengganti kotak highlight biru bawaan browser yang mengganggu pada perangkat mobile dengan transisi feedback sentuhan (*press-state scale & opacity*) yang halus dan proporsional.
*   **Scroll Reset & Layout Anti-Lag**: Optimasi navigasi tab anti-lag yang mulus menggunakan `requestAnimationFrame` dan fitur pengunci scroll dinamis (*body scroll lock*) saat dialog modal atau menu navigasi seluler terbuka.

---

## 🛠️ Stack Teknologi

Aplikasi ini dikembangkan menggunakan teknologi mutakhir berikut:
*   **React 19** - Library UI deklaratif berkinerja tinggi.
*   **Vite** - Bundler front-end super cepat dengan Hot Module Replacement (HMR).
*   **Framer Motion 12** - Library animasi intuitif untuk menyajikan transisi mikro dan interaksi antarmuka yang premium.
*   **Recharts 3.8.1** - Library grafik berbasis SVG yang interaktif dan responsif.
*   **TailwindCSS v4 & PostCSS** - Kerangka kerja desain CSS modern yang efisien.
*   **Vercel Analytics** - Memantau statistik kinerja aplikasi secara berkala.

---

## 🚀 Cara Menjalankan Aplikasi Secara Lokal

Pastikan Anda memiliki [Node.js](https://nodejs.org/) terinstal di komputer Anda. Ikuti langkah-langkah di bawah ini:

1.  **Clone atau unduh repositori ini** ke direktori lokal Anda.
2.  **Buka terminal** di folder proyek lalu instal seluruh dependensi:
    ```bash
    npm install
    ```
3.  **Jalankan server pengembangan lokal**:
    ```bash
    npm run dev
    ```
4.  **Buka peramban** Anda pada alamat yang tertera di terminal (biasanya `http://localhost:5173`).

---

## 📖 Dokumentasi Teknis

Untuk memahami detail kalkulasi finansial di balik layar (termasuk rumus matematika *Future Value*, hitungan potongan pajak per kelas instrumen, serta algoritma pembagian Dana Darurat bertingkat), silakan baca dokumen:
*   👉 **[Cara Kerja Sistem (HOW_IT_WORKS.md)](HOW_IT_WORKS.md)**
