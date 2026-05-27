## BRIEF FITUR: MONTHLY SNAPSHOT & SUB-PROFILE (BERBASIS ALOKASI ASET)

### INTI FITUR
User tidak mengisi pendapatan/pengeluaran. User hanya **menduplikasi seluruh alokasi 16 aset dari bulan sebelumnya** lalu **mengedit angka saldo** masing-masing aset sesuai keadaan aktual di bulan ini. Sistem menghitung otomatis:
- **Kenaikan saldo** = tambahan investasi (inflow)
- **Penurunan saldo** = penarikan (outflow)
- **Perubahan wajar karena return pasar** akan dihitung sebagai selisih antara saldo aktual vs saldo yang seharusnya jika tidak ada intervensi.

### STRUKTUR DATA (di dalam profil)
```json
"monthlySnapshots": [
  {
    "id": "2026-05",
    "yearMonth": "2026-05",
    "assetValues": {
      "cash": 5000000,
      "bankDigital": 10000000,
      "rdpu": 15000000,
      "sahamIDX": 20000000,
      "sp500": 30000000,
      ... (16 aset, nilai saldo absolut)
    },
    "notes": "Ada bonus"
  }
]
```
**Tidak ada field income/expense terpisah.** Nilai `assetValues` adalah **saldo akhir** aset tersebut pada akhir bulan itu.

### LOGIKA PERHITUNGAN OTOMATIS (ditampilkan sebagai info, tidak disimpan)
Dari snapshot bulan M ke bulan M+1:
1. Hitung `expectedGrowth` tiap aset:  
   `saldoBulanLalu * (1 + netReturnBulanan)`  
   (netReturnBulanan = (1 + netReturnTahunan)^(1/12) - 1)
2. `netInflowAset` = `saldoAktualBulanIni - expectedGrowth`
3. Jika `netInflowAset` positif → artinya user menambah dana ke aset itu. Negatif → menarik dana.
4. Total inflow/outflow bulan itu = jumlah semua `netInflowAset`.

**Tampilkan ringkasan**: "Bulan ini Anda menambah Rp X ke portofolio" atau "Menarik Rp Y".

### TAMPILAN UI (Tab baru: "📆 Snapshot Bulanan")

**Komponen:**
1. **Daftar snapshot** (tabel dengan kolom: Bulan, Total Portofolio, Net Inflow, Aksi)
2. **Tombol "+ Catat bulan ini"** → buka modal
3. **Modal "Catat Snapshot Bulanan"**:
   - Pilih bulan (default bulan lalu+1, bisa juga backdate)
   - **Tabel 16 aset** dengan 2 kolom:
     - Nama aset (bisa disembunyikan untuk efisiensi)
     - **Input angka: Saldo akhir bulan ini** (format rupiah/USD sesuai mata uang aset)
   - Tombol "Ambil dari bulan lalu" (isi otomatis dengan nilai snapshot terakhir)
   - Tombol "Simpan"
4. **Perbandingan grafis** di tab yang sama:
   - Grafik garis: Total portofolio aktual (dari snapshot) vs Total portofolio proyeksi (berdasarkan rencana awal).
   - Grafik batang: Net inflow per bulan.

### PERUBAHAN PROYEKSI PORTOFOLIO (Tab "Proyeksi FIRE")
- Jika ada snapshot, maka untuk bulan-bulan yang memiliki snapshot, proyeksi harus **menggunakan saldo aktual** sebagai titik awal untuk bulan berikutnya (bukan dari rencana).
- Tahun-tahun setelah snapshot terakhir, lanjutkan dengan asumsi kontribusi bulanan tetap dari rencana awal (atau bisa juga user menginginkan snapshot sebagai pengganti rencana selamanya? Cukup gunakan snapshot untuk melompati periode yang sudah terjadi, lalu setelah snapshot terakhir pakai rencana biasa).

**Logika khusus di App.jsx:**
```js
function getEffectivePortfolioAtMonth(targetMonth) {
  // Cari snapshot terakhir sebelum atau sama dengan targetMonth
  // Jika ada, gunakan saldo snapshot sebagai basis.
  // Jika tidak, gunakan rencana awal + kontribusi bulanan.
}
```

### MANIPULASI STATE GLOBAL (App.jsx)
Fungsi baru:
- `addSnapshot(profileId, snapshot)`
- `updateSnapshot(profileId, monthId, newAssetValues)`
- `deleteSnapshot(profileId, monthId)`
- `getLatestSnapshot(profileId)` -> untuk modal "Ambil dari bulan lalu"

### PENTING UNTUK BACKWARD COMPATIBILITY
- Profil lama tanpa `monthlySnapshots` tetap berfungsi.
- Schema version naik ke 2.
- Jika pengguna tidak pernah membuat snapshot, tidak ada perubahan perilaku.

### PRIORITAS DALAM SATU SPRINT (MVP)
1. Tambahkan field `monthlySnapshots` di state dan schema.
2. Buat tab baru "Snapshot Bulanan" dengan daftar snapshot (hanya baca).
3. Modal input untuk mencatat snapshot: tampilkan semua 16 aset dengan nilai default dari snapshot terakhir atau dari `assets` (nilai awal) jika belum ada.
4. Simpan snapshot ke LocalStorage.
5. Ubah logika proyeksi di `ProjectionTab.jsx` agar jika ada snapshot, grafik menunjukkan garis aktual (berdasarkan snapshot) dan garis rencana (sebagai pembanding).

### FILE YANG WAJIB DIUBAH
- `App.jsx`: state `monthlySnapshots`, fungsi CRUD, fungsi `computeProjectionWithSnapshots`
- `ProjectionTab.jsx`: terima prop `monthlySnapshots` dan hitung dua jalur (aktual vs rencana)
- `InputTab.jsx`: mungkin tambahkan tombol pintas ke tab snapshot
- Buat komponen baru: `MonthlySnapshotTab.jsx`
- `formatters.js`: fungsi `calculateMonthlyNetReturn` dan `applySnapshotToProjection`
- `storage.js` (jika ada) atau langsung di App: migrasi schema.

### CONTOH ALUR PENGGUNA
1. Buka profil "Rencana 2026" (saldo awal cash 5jt, S&P 500 10jt, dll).
2. Setelah satu bulan, user buka tab Snapshot, klik "Catat bulan ini" (Mei 2026).
3. Modal muncul dengan angka dari bulan sebelumnya (Mei 2026? seharusnya dari bulan April? Lebih tepat: "Ambil dari snapshot terakhir" atau jika belum ada, ambil dari nilai awal aset).
4. User ubah angka S&P 500 dari 10jt menjadi 15jt (berarti inflow 5jt dikurangi return pasar). Ubah RDPU dari 8jt jadi 7jt (outflow).
5. Simpan. Di tab Proyeksi FIRE, grafik sekarang menampilkan:
   - Garis biru (rencana): sesuai kontribusi bulanan tetap.
   - Garis hijau (aktual): mulai dari saldo awal, lalu di bulan Mei melompat ke nilai snapshot, lalu setelah Mei kembali mengikuti rencana (kecuali ada snapshot Juni).

### CATATAN TEKNIS UNTUK AI
- Jangan gunakan state pendapatan/pengeluaran. Semua berbasis `assetValues`.
- Setiap snapshot merepresentasikan **saldo akhir bulan**.
- Nilai `netReturnTahunan` per aset sudah ada di `afterTaxReturn` (di `formatters.js`). Gunakan untuk menghitung `expectedGrowth`.
- Untuk menampilkan ringkasan "Net inflow bulan ini", hitung dari selisih snapshot bulan ini dan bulan lalu dikurangi return pasar. Jangan disimpan, cukup dihitung saat render.
- Pastikan mata uang per aset (USD/IDR) dihormati di tampilan input modal. Untuk aset USD, nilai disimpan dalam USD (angka murni) tapi ditampilkan dengan kurs jika perlu.
