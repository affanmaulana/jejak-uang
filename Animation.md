Dokumentasi Rombak Animasi & Interaksi – Berbasis Phase

Phase 0 – Persiapan tanpa perubahan tampilan
Sebelum menambahkan animasi, pastikan proyek React Vite menginstal framer-motion. Jangan ubah struktur komponen apapun. Buat file reset CSS minimal (margin, padding, box-sizing) dan impor di main.jsx. Reset ini hanya menyamakan default browser, tidak menggeser atau merusak layout yang sudah ada. Anda akan melihat perubahan sangat kecil pada spasi antar elemen, tapi tidak ada konten yang hilang atau bergeser secara drastis. Lakukan pengecekan visual di halaman utama.

Phase 1 – Perbaikan layout tanpa animasi (hanya styling)
Buat satu komponen wrapper Container yang menerapkan max-width, margin auto, dan padding horizontal. Jangan langsung bungkus seluruh halaman – bungkus hanya area konten utama yang memang perlu rata tengah. Untuk setiap halaman, periksa apakah ada elemen yang menggunakan lebar absolut (px) – ubah ke persen atau rem. Pastikan semua gambar memiliki max-width: 100%. Jangan gunakan !important. Setelah phase ini, tampilan harus lebih rapi tanpa ada elemen yang tumpang tindih. Jika ada yang berantakan, batalkan perubahan di halaman itu dan lanjutkan ke halaman lain.

Phase 2 – Animasi masuk halaman (entry animation) tanpa mengganggu navigasi
Buat komponen PageTransition yang hanya membungkus children dengan motion.div dan properti initial, animate, exit. Jangan mengganti router atau struktur Routes dulu. Terapkan komponen ini hanya pada satu halaman statis (misalnya halaman About) sebagai uji coba. Pastikan halaman itu muncul dengan efek fade halus saat pertama kali diakses, dan saat pindah ke halaman lain tidak ada error. Setelah berhasil, baru bungkus semua halaman dengan AnimatePresence di level App. Pastikan key menggunakan location.pathname. Uji navigasi bolak-balik – tidak boleh ada komponen yang hilang atau state yang reset secara tidak wajar.

Phase 3 – Mikrointeraksi pada tombol dan kartu (hover & tap)
Pilih satu komponen tombol yang paling sederhana. Tambahkan properti whileHover dan whileTap tanpa mengubah logika onClick. Uji di browser – saat hover, tombol berubah skala atau warna latar, saat diklik sedikit mengecil, lalu kembali normal. Pastikan fungsi asli (submit, navigasi, dll) tetap berjalan. Setelah itu, terapkan ke semua tombol di website. Lakukan hal yang sama untuk kartu (card): tambahkan whileHover dengan efek angkat (translateY negatif) dan bayangan. Pastikan konten di dalam kartu tidak bergeser atau terpotong.

Phase 4 – Animasi saat scroll (reveal on scroll)
Pilih satu bagian konten yang panjang, misalnya daftar produk atau testimoni. Tambahkan whileInView dengan viewport: { once: true, amount: 0.2 } pada elemen induk bagian tersebut. Efek yang aman: opacity dari 0 ke 1 dan translateY sedikit (dari bawah). Pastikan saat discroll, bagian itu muncul dengan halus. Jangan tambahkan animasi ke setiap item individual dulu – cukup per blok. Periksa di mobile dan desktop: animasi tidak boleh muncul terus-menerus setiap kali scroll (karena once: true). Jika ada bagian yang sudah terlihat di awal, animasi tetap harus dijalankan (Framer Motion akan mendeteksi). Pastikan tidak ada layout shift.

Phase 5 – Animasi daftar dengan stagger (bertahap)
Hanya jika website memiliki daftar (list/grid) dengan minimal 3 item. Ubah container daftar menjadi motion.ul atau motion.div dengan varian container yang memiliki staggerChildren. Setiap item mendapat varian dari tersembunyi ke tampak. Jangan ubah struktur HTML di dalam item. Pastikan urutan animasi tidak membalik urutan item. Uji dengan item dinamis (dari API) – animasi harus tetap bekerja meskipun data berubah. Jika terjadi glitch atau item tidak muncul, hapus stagger dan kembali ke animasi serempak.

Phase 6 – Loading state dan modal
Untuk komponen yang mengambil data async (misalnya fetch), tambahkan state isLoading. Saat loading, tampilkan spinner dengan animasi rotasi kontinu – jangan gunakan gambar eksternal, cukup buat elemen div dengan border dan animasi CSS. Untuk modal (jika ada), bungkus dengan AnimatePresence dan berikan animasi mask (fade) serta konten modal (scale dari kecil). Pastikan modal bisa dibuka dan ditutup tanpa error, dan animasi tidak membuat modal terlihat dua kali.

Phase 7 – Optimalisasi performa dan aksesibilitas
Periksa semua animasi: ganti yang menggunakan width/height/left/top dengan transform dan opacity. Tambahkan aturan CSS @media (prefers-reduced-motion: reduce) untuk menonaktifkan semua animasi non-esensial jika pengguna memintanya. Uji di Chrome DevTools dengan throttling CPU (6x slowdown) – tidak boleh ada frame drop yang terlihat. Pastikan semua animasi tidak menyebabkan repaint berlebihan.

Phase 8 – Uji regresi akhir
Jalankan semua fungsionalitas website: form, navigasi, klik tombol, filter, search, modal, scroll. Bandingkan dengan versi sebelum rombakan: tidak boleh ada fitur yang rusak, data yang hilang, atau event handler yang tidak terpanggil. Periksa konsol browser – tidak boleh ada error atau warning dari React atau Framer Motion. Jika ada masalah, batalkan phase terakhir dan lakukan debugging pada komponen yang bermasalah sebelum melanjutkan.

Catatan penting untuk AI Agent

    Sebelum mulai, tiap phase harus pastikan backup dan checkpoint sudah dijalankan. Lalu jalankan aksi phase di dalam branch baru dan bukan branch main. Sesudah phase selesai, buatlah checkpoint sebelum melanjutkan ke phase berikutnya. Saat sudah di akhir, lalu gabungkan semua branch menjadi satu dan lakukan pengujian akhir.

    Setiap phase harus selesai dan diverifikasi secara visual serta fungsional sebelum melanjutkan ke phase berikutnya.

    Jangan pernah mengganti struktur komponen asli (props, state, hooks) – hanya tambahkan properti animasi di elemen JSX yang sudah ada.

    Jika suatu phase menyebabkan error atau tampilan rusak, batalkan perubahan di phase itu dan laporkan secara spesifik.

    Prioritaskan keamanan layout daripada efek animasi yang rumit.