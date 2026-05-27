# Cara Kerja Sistem (Behind the Scenes - Jejak Uang)

Dokumen ini menjelaskan arsitektur kode, mekanisme penghitungan, alokasi dana darurat bertingkat (tiered allocation), serta sistem manajemen state dalam aplikasi **Jejak Uang**.

---

## 1. Arsitektur Aplikasi & Struktur File

Aplikasi ini dibangun menggunakan **React 19** dan **Vite** sebagai bundler berkinerja tinggi. Desain antarmuka dirancang dengan pendekatan modern yang memprioritaskan estetika premium (dark mode, transisi halus, interaksi responsif).

### Peta Komponen Utama:
*   **App.jsx**: Pusat *global state* aplikasi. Menangani kalkulasi portofolio keseluruhan, manajemen profil pengguna (*user templates*), simulasi pasar terburuk (*worst case*), koordinasi toast/modal, serta pemilih tab aktif.
*   **InputTab.jsx**: Antarmuka pengisian aset. Menyediakan slider, input ekspresi aritmatika, pemilihan instrumen baru via modal katalog, serta penyetelan alokasi Dana Darurat.
*   **ProjectionTab.jsx**: Dashboard analisis hasil proyeksi masa depan. Berisi grafik interaktif berbasis *Recharts*, ringkasan metrik FIRE (*Financial Independence, Retire Early*), breakdown alokasi, serta analisis risiko portofolio.
*   **KalkulatorPensiun.jsx**: Kalkulator independen untuk memproyeksikan masa pensiun dengan dua opsi data input: input manual terpisah atau memuat profil aset terintegrasi yang telah dibuat pengguna.
*   **assets.js**: Menyimpan skema referensi 16 instrumen aset beserta properti defaultnya (imbal hasil, toleransi krisis/drawdown, likuiditas, kategori risiko, status kelas ekuitas, dan penanganan valas).
*   **formatters.js**: Menyediakan fungsi bantu pengolahan angka, formatting mata uang IDR cerdas (*compact formatting*), evaluasi ekspresi matematika langsung di input, serta logika hitung bunga bersih setelah pajak.

---

## 2. Alur Kerja Perhitungan Finansial

Aplikasi ini menggunakan beberapa formulir matematika keuangan tingkat lanjut untuk menghasilkan proyeksi yang akurat dan realistis.

### A. Perhitungan Bunga Bersih Setelah Pajak (Net Return)
Tiap instrumen investasi memiliki persentase pajak dan potongan biaya tersendiri. Fungsi `afterTaxReturn` di `formatters.js` mereduksi *Gross Return* ($r$) menjadi *Net Return* ($r_{\text{net}}$) menggunakan aturan berikut:

1.  **Saham IDX**: Pajak transaksi final/dividen memotong return secara proporsional.
    $$r_{\text{net}} = r \times 0.97$$
2.  **Emas (Gold)**: Dikenai pengurangan biaya spread fisik/digital dan estimasi pajak buyback secara langsung sebesar $1.5\%$ per tahun.
    $$r_{\text{net}} = r - 1.5$$
3.  **Instrumen Kena Pajak Lainnya (Tabungan, Deposito, SBN, RDPU, dll.)**:
    $$r_{\text{net}} = r \times (1 - \text{taxRate})$$
    *Contoh: Bank Digital ($r = 4.0\%$, $\text{taxRate} = 0.20$) menghasilkan $r_{\text{net}} = 3.2\%$.*
4.  **Bebas Pajak (Valas USD murni, Kripto, RDPU USD)**:
    $$r_{\text{net}} = r$$

### B. Rumus Proyeksi Nilai Deposito Masa Depan (Future Value)
Penghitungan proyeksi akumulasi kekayaan dilakukan secara terpisah untuk setiap kelas aset demi akurasi bobot return per instrumen. 
Untuk tahun ke-$y$, nilai aset $i$ ($FV_{i, y}$) dihitung dari kombinasi pertumbuhan modal awal ($init_i$) ditambah kontribusi bulanan rutin ($mc_i$):

$$FV_{i, y} = [ init_i \times (1 + r_i)^y ] + [ \frac{mc_i \times 12 \times ((1 + r_i)^y - 1)}{r_i} ]$$

Jika return bersih instrumen ($r_i$) sama dengan $0$:
$$FV_{i, y} = init_i + (mc_i \times 12 \times y)$$

*   **Total Portofolio Gabungan**: Jumlah FV untuk seluruh instrumen aktif.
*   **Nilai Riil Disesuaikan Inflasi**: Diperoleh dengan mendiskontokan total portofolio dengan tingkat inflasi tahunan ($inf$):
    $$\text{Nilai Riil}_y = \frac{\text{Total Portofolio}_y}{(1 + inf)^y}$$

### C. Alokasi Bertingkat Dana Darurat (Tiered Emergency Fund)
Salah satu fitur unik adalah alokasi dana darurat bertingkat berbasis likuiditas. Dari total target dana darurat yang disetel (misal $N$ bulan pengeluaran), sistem membagi dana tersebut ke dalam 3 instrumen berbeda secara otomatis:

1.  **Tier 1 (Cash / Bank)**: Menyimpan **1 bulan** pengeluaran. Sangat likuid ($T+0$), bunga sangat rendah.
2.  **Tier 2 (Bank Digital)**: Menyimpan **2 bulan** pengeluaran berikutnya. Likuid ($T+0$), imbal hasil moderat (~4%).
3.  **Tier 3 (Reksadana Pasar Uang / RDPU)**: Menyimpan **sisa** dari total bulan target ($N - 3$ bulan). Likuiditas menengah ($T+1$), imbal hasil tinggi (~5.1%).

Jika fitur *"Gabungkan Dana Darurat ke Total Aset"* diaktifkan, sistem secara dinamis menambahkan nominal masing-masing Tier di atas ke saldo input aset pengguna saat kalkulasi visualisasi dijalankan (`effectiveAssets`):
*   `effectiveAssets.cash` = `assets.cash` + (1 * Pengeluaran Bulanan)
*   `effectiveAssets.bankDigital` = `assets.bankDigital` + (2 * Pengeluaran Bulanan)
*   `effectiveAssets.rdpu` = `assets.rdpu` + (Sisa Bulan * Pengeluaran Bulanan)

---

## 3. Simulasi Skenario Terburuk (Worst Case Crisis)

Simulasi Krisis (*Worst Case*) memproyeksikan penyusutan portofolio seketika apabila terjadi crash ekonomi global serentak. Sistem menguji setiap kelas aset terhadap batasan *default drawdown* historisnya (atau input kustom pengguna):

$$\text{Nilai Setelah Krisis} = \sum [ \text{Nilai Aset}_i \times (1 - \frac{\text{Drawdown}_i}{100}) ]$$

### Contoh Parameter Penurunan Instan Default (Drawdown):
*   **Kas / Bank / Bank Digital**: $0\%$ (Aman penuh)
*   **Emas**: $20\%$ (Aset pelindung nilai)
*   **S&P 500 ETF**: $50\%$ (Volatilitas pasar saham maju)
*   **Saham IDX / NASDAQ**: $60\% - 65\%$ (Volatilitas pasar lokal/saham teknologi)
*   **Aset Kripto**: $90\%$ (Volatilitas ekstrem)

Hasil kalkulasi ini ditampilkan dalam bentuk persentase kerugian potensial (*Crash Ratio*) untuk mengedukasi profil risiko pengguna secara visual.

---

## 4. Manajemen State & Sinkronisasi Lokal

Aplikasi menggunakan React State yang terpusat di `App.jsx` untuk memastikan sinkronisasi data antar tab bersifat *real-time*:

*   **Penyimpanan Lokal (LocalStorage)**: Template profil pengguna disimpan dalam *key* `wealth_templates`. Struktur penyimpanan dilengkapi dengan **Schema Migration Pipeline** (`CURRENT_SCHEMA_VERSION = 1`). Jika terdapat perubahan struktur state pada rilis mendatang, data lama akan otomatis dimigrasi tanpa menyebabkan crash.
*   **Evaluasi Ekspresi Dinamis**: Pengguna dapat menulis ekspresi penjumlahan sederhana seperti `2,500,000 + 1,200,000` pada kolom input angka. Input ini diproses secara real-time oleh `parseExpression` untuk menampilkan estimasi hasil sekaligus memformat teks dengan separator ribuan khas Indonesia (`.` dan `,`) saat mengetik.
*   **Pencegahan Scroll Lock & Latensi**: Sistem menyematkan mekanisme reset scroll asinkron saat perpindahan tab menggunakan `requestAnimationFrame` untuk mencegah lag visual, serta mengunci overflow body HTML saat dialog modal terbuka untuk menyajikan nuansa premium setara aplikasi native.
