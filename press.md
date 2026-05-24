Dokumentasi Rombak Press-State (Mobile Touch Feedback) – Berbasis Phase

Latar belakang: Saat ini, ketika pengguna menekan (tap) elemen interaktif di perangkat mobile, muncul kotak biru persegi panjang yang tidak sesuai bentuk objek (misal tombol bundar atau kartu). Ini adalah perilaku default browser (-webkit-tap-highlight-color). Target kita adalah menggantinya dengan efek visual yang halus dan proporsional terhadap bentuk elemen yang ditekan, misalnya perubahan opacity, redup latar, atau sedikit skala. Hover state desktop tetap dipertahankan seperti semula dan tidak boleh terganggu.
Phase 0 – Persiapan & identifikasi elemen bermasalah

Buat branch phase-0-tap-prep dari main (atau branch terakhir yang stabil). Instalasi tidak perlu library baru. Lakukan identifikasi seluruh elemen interaktif di aplikasi: tombol, kartu yang bisa diklik, item daftar, link, dan elemen dengan onClick. Catat bentuk visualnya (lingkaran, persegi panjang dengan sudut melengkung, atau bentuk tidak beraturan). Verifikasi bahwa di desktop, hover state masih bekerja sempurna. Belum ada perubahan kode.
Phase 1 – Menonaktifkan highlight biru default secara global

Buat branch phase-1-tap-disable dari phase-0-tap-prep. Di file CSS global (misal index.css atau reset.css), tambahkan aturan untuk semua elemen yang bisa disentuh: hilangkan -webkit-tap-highlight-color menjadi transparan. Jangan gunakan !important jika tidak perlu. Pastikan juga untuk pseudo-elemen :focus dan :active tidak menampilkan outline kotak biru pada mobile (tapi outline untuk aksesibilitas keyboard di desktop tetap dipertahankan secara terpisah). Uji di perangkat mobile atau emulator: saat tap, tidak boleh ada kotak biru sama sekali. Jika ada, cek apakah ada CSS lain yang override.
Phase 2 – Menambahkan efek press-state ringan (opacity atau redup)

Buat branch phase-2-tap-feedback dari phase-1-tap-disable. Pilih satu jenis elemen (misal tombol utama). Tambahkan properti untuk efek :active di CSS atau melalui library animasi yang sudah ada (Framer Motion). Untuk CSS murni: gunakan pseudo-class :active dengan perubahan opacity (misal menjadi 0.7) atau background-color sedikit lebih gelap. Pastikan efek ini hanya muncul saat tap berlangsung (jika menggunakan CSS, akan otomatis). Jika proyek menggunakan Framer Motion, tambahkan properti whileTap dengan skala sedikit mengecil (0.97) tanpa mengubah whileHover yang sudah ada. Verifikasi bahwa di desktop, hover dan tap tidak saling mengganggu (tap di desktop dengan mouse tidak perlu efek press, tapi aman jika ada). Uji di mobile: saat jari menekan, efek muncul; saat lepas, efek hilang.
Phase 3 – Menyesuaikan bentuk press-state dengan bentuk elemen

Buat branch phase-3-tap-shape dari phase-2-tap-feedback. Untuk elemen yang bentuknya tidak persegi (misal tombol bulat atau kartu dengan border-radius besar), pastikan efek press-state mengikuti bentuk tersebut. Jika menggunakan CSS :active dengan opacity, bentuk otomatis mengikuti elemen. Jika menggunakan transform: scale, pastikan elemen memiliki border-radius yang sama. Untuk elemen dengan bayangan atau background gradien, uji apakah perubahan opacity membuat teks terlalu pudar – jika ya, gunakan transform: scale saja. Jangan tambahkan box-shadow saat press karena dapat mengganggu performa di mobile. Verifikasi bahwa setiap jenis elemen interaktif memiliki feedback yang proporsional dan tidak ada bentuk kotak aneh yang muncul.
Phase 4 – Menangani elemen dengan event handler kompleks (drag, long press)

Buat branch phase-4-tap-complex dari phase-3-tap-shape. Identifikasi apakah ada elemen yang memiliki onTouchStart atau onTouchEnd manual, atau yang membutuhkan long press. Untuk elemen seperti itu, jangan terapkan :active CSS biasa karena bisa konflik. Sebagai gantinya, gunakan state lokal React (misal isPressing) yang di-set true pada onTouchStart dan false pada onTouchEnd atau onTouchCancel. Tambahkan kelas dinamis untuk efek visual. Pastikan efek tidak tertinggal jika terjadi scroll saat jari masih menekan (gunakan onTouchCancel). Uji dengan gestur kompleks, misal geser pada slider – efek press tidak boleh muncul.
Phase 5 – Optimalisasi performa dan aksesibilitas

Buat branch phase-5-tap-perf dari phase-4-tap-complex. Pastikan efek press-state tidak menyebabkan repaint atau layout shift. Gunakan transform dan opacity saja, hindari animasi width, height, margin, padding. Untuk perangkat dengan prefers-reduced-motion: reduce, sederhanakan efek press menjadi hanya perubahan opacity tanpa scale atau durasi nol. Uji di perangkat mid-range Android (contoh: throttling 4x CPU) – tidak boleh ada frame drop saat tap cepat berulang kali. Verifikasi bahwa efek tetap terasa responsif (latensi < 100ms).
Phase 6 – Uji regresi final (mobile & desktop)

Buat branch phase-6-tap-regression dari phase-5-tap-perf, lalu merge ke branch pengembangan sementara. Uji semua fungsionalitas di perangkat mobile nyata (iOS dan Android) serta desktop (mouse). Pastikan:

    Tombol, kartu, link, modal close, dan semua elemen interaktif memiliki feedback tap yang sesuai bentuknya.

    Desktop hover state tetap berfungsi sempurna (tidak ada efek press saat mouse diklik, kecuali jika memang diinginkan – biasanya tidak perlu).

    Tidak ada error konsol, tidak ada event yang gagal terpanggil.

    Untuk elemen yang tadinya memiliki outline biru untuk aksesibilitas keyboard, pastikan outline tetap ada saat navigasi dengan Tab (jika Anda mengubahnya di phase 1, pulihkan outline untuk :focus-visible). Jika semua ok, merge ke main.

Catatan penting untuk AI Agent

    Pastikan membuat checkpoint sebelum memulai phase baru sehingga dapat melakukan reset ke checkpoint sebelumnya jika menemukan error.
    
    Jangan mengubah atau menghapus properti whileHover atau efek hover desktop yang sudah ada.

    Efek press-state di mobile hanya berlaku saat sentuhan aktif; setelah jari diangkat, efek harus hilang sempurna.

    Jangan gunakan JavaScript murni untuk efek tap biasa jika CSS :active sudah cukup – lebih performan.

    Jika proyek sudah menggunakan Framer Motion, manfaatkan whileTap secara konsisten.

    Setiap phase harus diverifikasi dengan emulator mobile atau perangkat fisik sebelum melanjutkan.

    Jangan langsung commit dan push ke production. Saya akan review dulu di npm run dev manual.