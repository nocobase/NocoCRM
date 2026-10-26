import type { AppResource } from './en-US.js';
import { crmIdID } from './crm/id-ID.js';
import settingsIdID from './settings/id-ID.js';

// The pages in id-ID: the template's copy (./system/), the AI skills'
// display text and the CRM's own (./crm/id-ID.ts), with the same keys as
// ./en-US.ts. The template ships no id-ID, so its copy is translated
// here; a template upgrade that adds keys fails the type check until they
// are translated.
const idID: AppResource = {
  'auth.passwordResetSuccess':
    'Kata sandi Anda telah diatur ulang. Masuk dengan kata sandi baru Anda.',
  'auth.requestNewResetLink': 'Minta tautan atur ulang baru',
  'auth.preparingSession': 'Menyiapkan sesi Anda…',
  'auth.connectionFailed': 'Tidak dapat terhubung',
  'auth.connectionFailedDescription':
    'Koneksi waktu nyata tidak dapat disiapkan. Coba lagi untuk masuk ke aplikasi, atau keluar.',
  'deviceApproval.title': 'Otorisasi perangkat',
  'deviceApproval.description':
    'Baris perintah atau perangkat lain meminta untuk masuk sebagai Anda. Setujui hanya jika Anda sendiri yang memulai proses masuk ini.',
  'deviceApproval.enterCode': 'Masukkan kode yang ditampilkan perangkat Anda.',
  'deviceApproval.codeLabel': 'Kode',
  'deviceApproval.continue': 'Lanjutkan',
  'deviceApproval.checking': 'Memeriksa kode…',
  'deviceApproval.confirm':
    'Pastikan kode ini sama dengan yang ditampilkan perangkat Anda.',
  'deviceApproval.client': 'Diminta oleh {{client}}',
  'deviceApproval.approve': 'Setujui',
  'deviceApproval.approving': 'Menyetujui…',
  'deviceApproval.deny': 'Tolak',
  'deviceApproval.denying': 'Menolak…',
  'deviceApproval.approved':
    'Perangkat disetujui. Kembali ke terminal Anda untuk melanjutkan; Anda dapat menutup halaman ini.',
  'deviceApproval.denied':
    'Permintaan ditolak. Perangkat tidak masuk; Anda dapat menutup halaman ini.',
  'deviceApproval.expired':
    'Kode ini sudah kedaluwarsa. Mulai lagi proses masuk di perangkat Anda.',
  'deviceApproval.invalid':
    'Kode ini tidak valid. Cocokkan dengan perangkat Anda dan coba lagi.',
  'deviceApproval.notYours': 'Kode ini sedang disetujui oleh akun lain.',
  'deviceApproval.error': 'Terjadi kesalahan. Coba lagi.',
  'deviceApproval.retry': 'Coba lagi',
  'deviceApproval.otherCode': 'Masukkan kode lain',
  'inbox.title': 'Kotak masuk',
  'inbox.description': 'Notifikasi dan permintaan yang dikirim kepada Anda.',
  'inbox.views.all': 'Notifikasi',
  'inbox.views.todo': 'Saran AI',
  'inbox.kinds.label': 'Jenis',
  'inbox.kinds.all': 'Semua jenis',
  'inbox.kinds.decision': 'Keputusan',
  'inbox.kinds.info': 'Notifikasi',
  'inbox.tabs.decision': 'Perlu keputusan saya',
  'inbox.tabs.info': 'Notifikasi',
  'inbox.clearFilter': 'Hapus filter',
  'inbox.noMatchDescription': 'Hapus filter untuk melihat semua jenis.',
  'inbox.readAll': 'Tandai semua sudah dibaca',
  'inbox.allRead': 'Semua ditandai sudah dibaca.',
  'inbox.loading': 'Memuat',
  'inbox.loadFailed': 'Tidak dapat memuat kotak masuk',
  'inbox.loadFailedDescription': 'Periksa koneksi Anda dan coba lagi.',
  'inbox.retry': 'Coba lagi',
  'inbox.loadMore': 'Muat lebih banyak',
  'inbox.emptyAll': 'Tidak ada apa pun di sini',
  'inbox.empty.todo': 'Tidak ada yang menunggu Anda',
  'inbox.empty.decision': 'Tidak ada keputusan yang menunggu Anda',
  'inbox.empty.info': 'Tidak ada notifikasi',
  'inbox.emptyDescription':
    'Notifikasi dan permintaan yang dikirim kepada Anda muncul di sini.',
  'inbox.unread': 'Belum dibaca',
  'inbox.unreadCount': '{{count}} belum dibaca',
  'inbox.pendingDecisions': '{{count}} menunggu',
  'inbox.resolved': 'Selesai ditangani',
  'inbox.outcomes.approved': 'Disetujui',
  'inbox.outcomes.rejected': 'Ditolak',
  'inbox.outcomes.withdrawn': 'Ditarik',
  'inbox.count': '×{{count}}',
  'inbox.actionsFor': 'Tindakan untuk {{title}}',
  'inbox.actions.read': 'Tandai sudah dibaca',
  'inbox.actions.unread': 'Tandai belum dibaca',
  'inbox.actions.delete': 'Hapus',
  'inbox.deleted': 'Dihapus.',
  'inbox.requestFailed': 'Permintaan gagal. Coba lagi.',
  'inbox.forbidden': 'Anda tidak diizinkan melakukan ini.',
  'inbox.nothingSelected': 'Pilih item untuk melihatnya',
  'inbox.back': 'Kembali ke daftar',
  'inbox.open': 'Buka',
  'inbox.keyMove': 'Pindah',
  'inbox.keyOpen': 'Buka',
  'inbox.cancel': 'Batal',
  'inbox.request.approve': 'Setujui',
  'inbox.request.reject': 'Tolak',
  'inbox.request.commentPlaceholder': 'Tulis sesuatu…',
  'inbox.request.commentFor': '{{action}}: {{title}}',
  'inbox.request.quickSend': 'untuk mengirim',
  'inbox.request.newLine': 'untuk baris baru',
  'inboxButton.title': 'Kotak masuk',
  'inboxButton.pending': 'Kotak masuk, {{count}} menunggu',
  'inboxButton.unread': 'Kotak masuk, {{count}} belum dibaca',
  'inboxButton.pendingHint':
    '{{count}} menunggu Anda; jumlahnya berkurang setelah ditangani.',
  'inboxButton.unreadHint':
    '{{count}} belum dibaca; jumlahnya berkurang saat Anda membacanya.',
  'auth.welcome': 'Selamat datang kembali',
  'auth.loginDescription':
    'Masuk dengan nama pengguna atau email dan kata sandi Anda.',
  'auth.registerTitle': 'Buat akun',
  'auth.registerDescription': 'Buat akun untuk memulai.',
  'auth.forgotTitle': 'Lupa kata sandi',
  'auth.forgotDescription':
    'Masukkan email Anda dan kami akan mengirim tautan atur ulang jika akunnya ada.',
  'auth.passwordResetUnavailable':
    'Atur ulang kata sandi mandiri tidak diaktifkan. Hubungi administrator untuk mengatur ulang kata sandi Anda.',
  'auth.capabilityLoadFailed':
    'Tidak dapat memeriksa ketersediaan atur ulang kata sandi.',
  'auth.retry': 'Coba lagi',
  'auth.loading': 'Memuat',
  'auth.resetDescription': 'Pilih kata sandi baru untuk akun Anda.',
  'auth.resetTitle': 'Atur ulang kata sandi',
  'auth.identifier': 'Nama pengguna atau email',
  'auth.password': 'Kata sandi',
  'auth.signIn': 'Masuk',
  'auth.signingIn': 'Sedang masuk…',
  'auth.hidePassword': 'Sembunyikan kata sandi',
  'auth.showPassword': 'Tampilkan kata sandi',
  'auth.forgotLink': 'Lupa kata sandi?',
  'auth.noAccount': 'Belum punya akun?',
  'auth.signUp': 'Daftar',
  'auth.createAccount': 'Buat akun',
  'auth.creatingAccount': 'Membuat akun…',
  'auth.name': 'Nama',
  'auth.username': 'Nama pengguna',
  'auth.email': 'Email',
  'auth.confirmPassword': 'Konfirmasi kata sandi',
  'auth.existingAccount': 'Sudah punya akun?',
  'auth.passwordMismatch': 'Kata sandi tidak cocok.',
  'auth.resetting': 'Mengatur ulang…',
  'auth.newPassword': 'Kata sandi baru',
  'auth.confirmNewPassword': 'Konfirmasi kata sandi baru',
  'auth.invalidResetLink':
    'Tautan atur ulang kata sandi ini tidak valid atau sudah kedaluwarsa.',
  'auth.backToSignIn': 'Kembali ke halaman masuk',
  'auth.sendResetLink': 'Kirim tautan atur ulang',
  'auth.sending': 'Mengirim…',
  'auth.resetSent': 'Jika akunnya ada, tautan atur ulang telah dikirim.',
  'auth.rememberPassword': 'Ingat kata sandi Anda?',
  'auth.methods': 'Metode masuk',
  'auth.or': 'Atau lanjutkan dengan',
  'auth.continueWith': 'Lanjutkan dengan {provider}',
  'auth.about': 'Tentang aplikasi ini',
  'auth.platform': 'Platform aplikasi berbasis AI',
  'auth.marketingTitleFirst': 'Biarkan AI membangun dengan bebas.',
  'auth.marketingTitleSecond': 'NocoBase menjaganya tetap',
  'auth.marketingTitleThird': 'andal.',
  'auth.marketingDescription':
    'Beri AI kerangka frontend yang fleksibel untuk membentuk setiap pengalaman, sementara NocoBase mengamankan data, izin, dan tata kelola di bawahnya.',
  'auth.frontend': 'Frontend berbasis AI',
  'auth.frontendDescription':
    'Susun antarmuka dengan bebas di atas kerangka yang fleksibel.',
  'auth.foundation': 'Fondasi NocoBase',
  'auth.foundationDescription':
    'Data, kontrol akses, dan tata kelola yang andal.',
  'auth.marketingFooter': 'Bebas di atas. Yakin di bawah.',
  'status.loading': 'Memuat',
  'status.loadingPage': 'Memuat halaman',
  'status.denied': 'Akses ditolak',
  'status.pageFailed': 'Tidak dapat memuat halaman',
  'status.retry': 'Coba lagi',
  'navigation.brandHome': 'Beranda NocoCRM',
  'navigation.brandApps': 'Aplikasi NocoBase',
  'routeOverlay.close': 'Tutup',
  'status.deniedDescription':
    'Anda tidak memiliki izin untuk mengakses {{label}}.',
  'status.routeFailedDescription':
    'Rute {{label}} dari {{packageName}} tidak dapat dimuat.',
  shell: {
    buildFreely: 'AI membangun dengan bebas.',
    reliability: '<brand>NocoBase</brand> menjaganya tetap andal.',
  },
  home: {
    platform: 'NocoBase · Platform aplikasi berbasis AI',
    title: 'Jelaskan, dan agen Anda yang membangunnya',
    description:
      'Aplikasi ini dikembangkan dengan berbicara kepada agen coding Anda. Sampaikan kebutuhan bisnis dengan bahasa sehari-hari, dan agen akan menulis halaman, model data, API, dan proses bisnis di proyek ini.',
    steps: {
      describe: {
        title: 'Jelaskan kebutuhan',
        description:
          'Sebutkan siapa penggunanya, data apa yang disimpan, dan apa yang harus terjadi.',
      },
      build: {
        title: 'Biarkan agen membangun',
        description:
          'Agen membaca proyek ini dan kapabilitas bawaannya, lalu menulis kodenya.',
      },
      review: {
        title: 'Periksa dan sempurnakan',
        description:
          'Muat ulang halaman untuk mencobanya, lalu minta perubahan dengan cara yang sama.',
      },
    },
    example: {
      title: 'Coba permintaan seperti ini',
      text: 'Buat aplikasi pesanan pembelian.\n\nSebuah pesanan memiliki nomor, barang, pemohon, jumlah, dan status persetujuan. Pemohon membuat pesanan dan hanya melihat pesanan miliknya; peninjau melihat semua pesanan yang menunggu dan menyetujui atau menolaknya.\nSetelah ada keputusan, beri tahu pemohon di kotak masuk dengan tautan ke pesanan tersebut.',
      hint: 'Tempelkan ke Claude Code, Codex, Cursor, atau agen coding apa pun yang dibuka di proyek ini.',
    },
    capabilitiesTitle: 'Kapabilitas bawaan',
    capabilitiesDescription:
      'Agen Anda langsung menggunakan ini alih-alih membangunnya dari nol. Buka salah satunya untuk mendapatkan prompt yang dapat Anda edit dan salin.',
    viewPrompts: 'Lihat prompt ({{count}})',
    prompt: {
      label: 'Prompt',
      hint: 'Edit prompt agar sesuai dengan bisnis Anda sebelum menyalin. Perubahan tidak disimpan setelah dialog ditutup.',
      copy: 'Salin',
      copiedShort: 'Disalin',
      copied: 'Prompt disalin',
      copyFailed:
        'Tidak dapat menyalin. Pilih teksnya dan salin secara manual.',
      reset: 'Pulihkan bawaan',
    },
    capabilities: {
      auth: {
        title: 'Autentikasi',
        description:
          'Masuk, pendaftaran, atur ulang kata sandi, dan single sign-on perusahaan.',
        prompts: {
          disableSignUp: {
            label: 'Tutup pendaftaran',
            text: 'Aplikasi ini hanya untuk karyawan perusahaan. Administrator membuat semua akun.\nNonaktifkan pendaftaran mandiri dan hapus tautan pendaftaran dari halaman masuk.\nKaryawan yang sudah ada tetap harus dapat masuk dengan akun dan kata sandi mereka.\nPertahankan tautan lupa kata sandi.',
          },
          companySso: {
            label: 'SSO perusahaan',
            text: 'Izinkan karyawan masuk dengan platform identitas perusahaan kami menggunakan OIDC.\n\nPertahankan masuk dengan akun dan kata sandi, lalu tambahkan tombol Akun perusahaan.\nTombol tersebut membuka platform identitas perusahaan. Setelah berhasil masuk, kembali ke beranda aplikasi.\n\nIzinkan masuk pertama kali membuat akun aplikasi, yang diidentifikasi dengan pengenal pengguna platform yang stabil.\nJangan menautkan akun secara otomatis dengan mencocokkan nama atau email. Akun baru menggunakan izin bawaan aplikasi.\n\nSebutkan informasi yang harus diberikan administrator platform identitas dan URL callback yang perlu mereka daftarkan.',
          },
          apiKeys: {
            label: 'Kunci API',
            text: 'Tambahkan entri Kunci integrasi ke menu pengguna, menggunakan kapabilitas kunci API bawaan aplikasi.\nKaryawan hanya mengelola kunci yang mereka buat, dengan mengisi tujuan dan masa berlaku dalam hari.\nTampilkan kunci lengkap hanya sekali setelah dibuat, dengan pesan untuk segera menyalin dan menyimpannya.\nTampilkan nama, fragmen pengenal, status, masa berlaku, dan penggunaan terakhir setiap kunci, dan izinkan pencabutannya setelah konfirmasi.\nJangan pernah menampilkan kunci lengkap di daftar, log, atau detail.',
          },
        },
      },
      dataSources: {
        title: 'Sumber data',
        description:
          'Pilih database aplikasi dan gunakan data bisnis dari database eksternal yang sudah ada.',
        prompts: {
          postgres: {
            label: 'Ganti database',
            text: 'Ganti database aplikasi dari SQLite ke PostgreSQL.\nBaca detail koneksi dari konfigurasi runtime server, bukan dari kode sumber.\nJelaskan driver database mana yang perlu dipasang dan pengaturan mana yang perlu diisi, serta ingatkan saya bahwa data yang sudah ada tidak dimigrasikan secara otomatis.',
          },
          externalDatabase: {
            label: 'Database eksternal',
            text: 'Hubungkan database keuangan perusahaan yang sudah ada sebagai sumber data eksternal hanya-baca; jangan ubah tabelnya.\nCocokkan data berdasarkan nomor pemasok dan tambahkan bagian Penyelesaian di detail pemasok yang menampilkan siklus penyelesaian, batas kredit, dan status penyelesaian, dengan label sumbernya.\nTetap baca detail kontak pemasok dari database aplikasi, dan baca data penyelesaian langsung dari database eksternal tanpa mengimpornya.\nBaca kredensial koneksi dari konfigurasi runtime server.',
          },
        },
      },
      authorization: {
        title: 'Izin',
        description:
          'Atur siapa yang dapat membuka halaman mana, menjalankan tindakan mana, dan melihat data mana.',
        prompts: {
          jobs: {
            label: 'Jabatan',
            text: 'Buat jabatan Pemohon pembelian dan Peninjau pesanan untuk aplikasi.\nPemohon pembelian dapat membuka halaman pesanan dan melihat pesanan yang mereka ajukan.\nPeninjau pesanan dapat membuka halaman pesanan, melihat pesanan, serta menyetujui atau menolak pesanan yang menunggu.\nHanya administrator aplikasi yang dapat mengubah izin dan penugasan.\nGunakan kapabilitas otorisasi aplikasi yang sudah ada agar administrator dapat menyesuaikan izin dan menugaskan orang nanti.',
          },
          dataScopes: {
            label: 'Cakupan data',
            text: 'Izinkan pemohon pembelian hanya melihat pesanan mereka sendiri, menggunakan kolom pemohon pada pesanan untuk menentukan kepemilikan.\nPeninjau pesanan dapat melihat semua pesanan dan memproses persetujuan yang menunggu.\nAdministrator dapat menyesuaikan cakupan tampilan pesanan setiap jabatan di set izinnya.',
          },
          restrictions: {
            label: 'Pembatasan',
            text: 'Bob untuk sementara membantu meninjau pesanan pembelian dan hanya boleh melihat pesanan senilai 2.000 atau kurang.\nTambahkan batas jumlah pada tindakan Lihat pesanan miliknya, dengan tetap mempertahankan jabatan dan cakupan datanya yang sudah ada.\nTerapkan batas tersebut pada pesanannya sendiri dan pesanan yang dibagikan kepadanya.\nAdministrator dapat mengubah jumlahnya atau menghapus aturan; sebelum menghapus, jelaskan bahwa cakupan yang dapat dilihatnya mungkin bertambah.',
          },
        },
      },
      workflow: {
        title: 'Alur kerja',
        description:
          'Gerakkan data bisnis melalui tahap-tahap, dengan penantian, batas waktu, percobaan ulang, dan riwayat siapa melakukan apa.',
        prompts: {
          stages: {
            label: 'Tahap',
            text: 'Tambahkan proses pada pesanan pembelian: Menunggu persetujuan → Menunggu pembelian → Diterima → Selesai.\nPeninjau menyetujui atau menolak; penolakan wajib disertai alasan dan mengembalikan pesanan ke pemohon untuk direvisi dan diajukan ulang.\nSetelah pembeli melakukan pembelian, pesanan berstatus menunggu pembelian; konfirmasi pengiriman dengan tanda terima yang ditandatangani memindahkannya ke Diterima, dan konfirmasi pemohon menyelesaikannya.\nDetail pesanan hanya menawarkan tindakan tahap saat ini, dan pengeditan biasa tidak dapat mengubah tahap.\nPeriksa tahap dan informasi wajib di server, dan jangan pernah menimpa hasil yang sudah dikirim orang lain.',
          },
          backgroundExport: {
            label: 'Ekspor di latar belakang',
            text: 'Tambahkan halaman laporan pesanan yang mengekspor pesanan yang ada ke CSV.\nSetelah diajukan, ekspor menunggu untuk diproses, dibuat di latar belakang, dan selesai dengan tautan unduhan.\nTampilkan tahap saat ini, nama file, jumlah pesanan yang diekspor, serta catatan pengajuan dan pemrosesan sistem.\nCoba ulang pembuatan yang gagal sesuai aturan, dan simpan kegagalan akhir untuk ditangani pemiliknya; menjalankannya lagi tidak boleh membuat file laporan ganda.\nPertahankan kemajuan dan hasil tetap terlihat setelah halaman dimuat ulang, dan hanya izinkan orang yang berwenang untuk mengekspor pesanan.',
          },
          history: {
            label: 'Riwayat',
            text: 'Tampilkan tahap saat ini dan riwayat pemrosesan di detail pesanan.\nSetiap entri menunjukkan siapa yang bertindak, kapan, tindakannya, tahap sebelum dan sesudahnya, serta alasan penolakan atau tanda terima yang ditandatangani, jika ada.\nTandai tindakan yang dilakukan secara otomatis sebagai dilakukan oleh sistem.\nPertahankan kemajuan dan riwayat setelah halaman dimuat ulang, sehingga seluruh proses dapat ditinjau setelah selesai.',
          },
        },
      },
      scheduler: {
        title: 'Tugas terjadwal',
        description:
          'Jalankan pekerjaan bisnis pada waktu yang ditentukan, dan lihat jadwal berikutnya beserta hasilnya.',
        prompts: {
          reminder: {
            label: 'Pengingat harian',
            text: 'Tambahkan Pengingat pesanan tertunda ke aplikasi pesanan yang sudah ada.\n\nPukul 09.00 waktu Beijing setiap hari kerja, cari pesanan yang menunggu persetujuan, kelompokkan menurut peninjau, dan kirim satu notifikasi dalam aplikasi ke setiap peninjau.\nSertakan jumlah pesanan tertunda dan tautan ke daftar pesanan tertunda. Jangan kirim apa pun jika tidak ada pesanan tertunda.\nAdministrator dapat melihat jadwal dan catatan eksekusi, serta menjeda atau melanjutkan pengingat.',
          },
          weeklyReport: {
            label: 'Laporan mingguan',
            text: 'Pukul 08.00 waktu Beijing setiap Senin, buat ringkasan penjualan minggu lalu dan beri tahu manajer penjualan.\nSertakan pendapatan penjualan, jumlah pesanan, dan total per wilayah. Administrator dapat melihat tugas dan catatan eksekusinya.',
          },
        },
      },
      notification: {
        title: 'Notifikasi',
        description:
          'Kirim pesan dalam aplikasi, email, atau pesan bot grup saat sesuatu terjadi.',
        prompts: {
          inApp: {
            label: 'Pesan dalam aplikasi',
            text: 'Tambahkan persetujuan pesanan ke aplikasi saat ini dan beri tahu pemohon hasilnya melalui pesan dalam aplikasi.\n\nPesanan mencakup nomor, nama, pemohon, jumlah, dan status persetujuan.\nPemohon dapat melihat pesanan mereka sendiri. Peninjau dapat melihat pesanan yang menunggu serta menyetujui atau menolaknya. Gunakan kembali fitur pesanan dan persetujuan yang ada jika tersedia.\n\nSetelah disetujui atau ditolak, kirim satu pesan dalam aplikasi hanya kepada pemohon pesanan.\nJudulnya menunjukkan apakah pesanan disetujui atau ditolak. Isinya mencakup nomor pesanan, nama, dan hasil persetujuan.\nMengklik pesan membuka detail pesanan yang bersangkutan.\nJangan kirim selama persetujuan masih menunggu. Beri tahu hanya sekali untuk hasil persetujuan yang sama.\nKegagalan notifikasi tidak memengaruhi hasil persetujuan yang telah disimpan.',
          },
          email: {
            label: 'Email',
            text: 'Tambahkan email ke notifikasi persetujuan pesanan yang sudah ada, menggunakan saluran email yang telah dikonfigurasi di aplikasi.\n\nSetelah pesanan disetujui atau ditolak, kirim hasilnya ke email akun pemohon.\nSertakan nomor pesanan di subjek serta nama pesanan dan hasilnya di isi email.\nPertahankan pesan dalam aplikasi yang sudah ada. Jika pemohon tidak memiliki alamat email, kirim hanya pesan dalam aplikasi.\nKegagalan email tidak boleh memengaruhi hasil persetujuan atau pesan dalam aplikasi.',
          },
        },
      },
      mail: {
        title: 'Email',
        description:
          'Hubungkan kotak surat pribadi, lalu baca, balas, dan kirim email bisnis.',
        prompts: {
          providers: {
            label: 'Penyedia email',
            text: 'Konfigurasikan mailbox.org untuk aplikasi di mail.providers pada konfigurasi server:\n- Server masuk IMAP: imap.mailbox.org, port 993, SSL/TLS.\n- Server keluar SMTP: smtp.mailbox.org, port 465, SSL/TLS.\nPengguna memasukkan alamat email, nama pengguna, dan kata sandi mereka sendiri di halaman akun kotak surat dan memilih tanggal mulai sinkronisasi pertama; jangan pernah menulis kata sandi kotak surat ke konfigurasi atau kode sumber.',
          },
          mailCenter: {
            label: 'Pusat email',
            text: 'Email sudah tersedia di aplikasi ini; gunakan kembali alih-alih membangunnya lagi atau memasang plugin lain.\nTambahkan halaman Pusat email dan Akun kotak surat ke navigasi, menggunakan halaman ruang kerja email dan akun kotak surat yang disediakan kapabilitas email.\nPengguna dapat menghubungkan kotak surat mereka sendiri, menyinkronkan pesan masuk, membaca pesan dan lampiran, serta membalas dengan mempertahankan subjek asli dan konteks percakapan, dan membalas ke pengirim asli.\nSetiap pengguna bekerja dengan kotak surat yang mereka hubungkan sendiri.',
          },
          correspondence: {
            label: 'Email pelanggan',
            text: 'Tambahkan bagian korespondensi ke detail pelanggan, dengan menggunakan kembali komponen baca dan tulis email bawaan aplikasi.\nTampilkan pesan yang pengirim atau penerimanya cocok dengan alamat email kontak pelanggan saat ini. Tenaga penjualan dapat membaca pesan, melihat lampiran, dan membalas menggunakan kotak surat yang mereka hubungkan sendiri.',
          },
        },
      },
      file: {
        title: 'File',
        description:
          'Unggah file, lampirkan ke data, dan pratinjau atau unduh.',
        prompts: {
          attachments: {
            label: 'Lampiran',
            text: 'Tambahkan lampiran pembelian ke aplikasi manajemen pesanan saya yang sudah ada.\n\nTambahkan area lampiran ke detail pesanan. Setiap pesanan dapat memiliki beberapa file, termasuk PDF, gambar, dan DOCX.\nTampilkan nama file dan ukurannya, dengan tindakan untuk mempratinjau, mengunduh, dan menghapus lampiran.\nSetelah mengunggah, izinkan pengguna menyimpan lampiran ke pesanan saat ini. Pastikan lampiran tetap tersedia saat pesanan dibuka kembali.\nSiapa pun yang memiliki akses ke pesanan dapat melihat dan mengunduh lampirannya. Pemohon dan peninjau dapat menambahkan atau menghapus lampiran.\nMenghapus lampiran hanya melepas tautannya dari pesanan saat ini; file tetap disimpan.',
          },
          avatar: {
            label: 'Avatar',
            text: 'Tambahkan avatar untuk setiap karyawan, dengan satu gambar per karyawan.\nDukung pengunggahan dan penggantian avatar, dan tampilkan di daftar dan detail karyawan.\nGunakan avatar baru setelah diganti dan pastikan tetap terlihat setelah halaman dimuat ulang.',
          },
        },
      },
      i18n: {
        title: 'Bahasa',
        description:
          'Ganti bahasa antarmuka, tambahkan bahasa, dan atur bahasa bawaan.',
        prompts: {
          addLanguage: {
            label: 'Tambah bahasa',
            text: 'Tambahkan bahasa Spanyol ke aplikasi saya. Terjemahkan antarmuka dan pesan server, dan tambahkan bahasa Spanyol ke menu bahasa.',
          },
          defaultLanguage: {
            label: 'Bahasa bawaan',
            text: 'Jadikan bahasa Tionghoa Sederhana sebagai bahasa bawaan aplikasi bagi orang yang belum memilih bahasa. Tetap sediakan bahasa Inggris di menu bahasa.',
          },
        },
      },
      theme: {
        title: 'Tema',
        description:
          'Sesuaikan warna, font, dan kerapatan, serta beralih antara terang dan gelap.',
        prompts: {
          changeTheme: {
            label: 'Ubah tema',
            text: 'Perbarui tema Ringkas: gunakan biru sebagai warna utama dan sedikit perbesar radius sudut. Pertahankan font, ukuran teks, dan jarak ringkas yang sekarang.',
          },
          newTheme: {
            label: 'Tema baru',
            text: 'Buat tema Hutan dengan hijau sebagai warna utama, latar belakang lembut, sudut yang cukup membulat, dan bayangan halus.',
          },
        },
      },
    },
  },
  appearance: {
    title: 'Tampilan',
    mode: 'Mode warna',
    preset: 'Tema',
    light: 'Terang',
    dark: 'Gelap',
    system: 'Sistem',
    themes: {
      default: 'Lega',
      compact: 'Ringkas',
    },
  },
  app: {
    title: 'NocoCRM',
  },
  actions: {
    close: 'Tutup',
    save: 'Simpan',
    cancel: 'Batal',
    confirm: 'Konfirmasi',
    language: 'Bahasa',
  },
  notices: {
    serverLocaleFallback:
      'Server tidak mendukung bahasa ini, jadi pesan server akan menggunakan bahasa Inggris.',
    languageChangeFailed:
      'Tidak dapat menyelesaikan penggantian bahasa. Silakan coba lagi.',
  },
  account: {
    signOutFailed: 'Tidak dapat keluar. Silakan coba lagi.',
    openMenu: 'Buka menu akun',
    fallback: 'Akun',
    signOut: 'Keluar',
    signingOut: 'Sedang keluar…',
  },
  navigation: {
    home: 'Beranda',
    open: 'Buka navigasi',
    close: 'Tutup navigasi',
    expand: 'Bentangkan navigasi',
    collapse: 'Ciutkan navigasi',
    toggle: 'Bentangkan atau ciutkan navigasi',
    label: 'Navigasi aplikasi',
    description: 'Buka halaman aplikasi ini.',
    breadcrumb: 'Jejak navigasi',
    breadcrumbMore: 'Tampilkan tingkat di antaranya',
    back: 'Kembali',
  },
  dataTable: {
    noResults: 'Tidak ada hasil.',
    sortAscending: 'Naik',
    sortDescending: 'Turun',
    hideColumn: 'Sembunyikan',
    view: 'Tampilan',
    toggleColumns: 'Tampilkan/sembunyikan kolom',
    selectedCount: '{{selected}} dari {{total}} baris dipilih.',
    rowsPerPage: 'Baris per halaman',
    pageOf: 'Halaman {{page}} dari {{pageCount}}',
    firstPage: 'Ke halaman pertama',
    previousPage: 'Ke halaman sebelumnya',
    nextPage: 'Ke halaman berikutnya',
    lastPage: 'Ke halaman terakhir',
  },
  datePicker: {
    placeholder: 'Pilih tanggal',
    rangePlaceholder: 'Pilih rentang tanggal',
  },
  'Lead follow-up': 'Tindak lanjut prospek',
  'Review everything a lead has now (the lead itself, its tasks, comments and related records in the CRM) and recommend the next step — keep following up, nurture, convert or invalid — with the reasons; when following up, say clearly how to follow up and what exactly to do. Use when a new lead comes in, when the user asks to follow up a lead or follow it up again, or asks "what should I do next with this lead".':
    'Tinjau semua yang dimiliki prospek saat ini (prospek itu sendiri, tugas, komentar, dan data terkait di CRM) dan rekomendasikan langkah berikutnya — terus menindaklanjuti, dibina, konversi, atau tidak valid — beserta alasannya; saat menindaklanjuti, jelaskan dengan jelas cara menindaklanjutinya dan apa persisnya yang harus dilakukan. Gunakan saat prospek baru masuk, saat pengguna meminta untuk menindaklanjuti prospek atau menindaklanjutinya lagi, atau bertanya "apa yang harus saya lakukan selanjutnya dengan prospek ini".',
  'Opportunity follow-up': 'Tindak lanjut peluang',
  'Reviews everything about an opportunity as it now stands (the opportunity itself, the company, contacts and their roles, tasks, comments, approvals, the source lead) and judges whether its stage holds up and what to do next — advance to the next stage, keep at it in the current stage, pause, or mark it lost — with the reasons, risks and gaps to fill; when advancing, spells out exactly what to do. Use when a lead\'s conversion opens a new opportunity, when the outcome of an opportunity\'s task has been recorded, when the user asks for a follow-up, or when asked "what is the next step for this opportunity?".':
    'Meninjau semua hal tentang peluang sebagaimana kondisinya saat ini (peluang itu sendiri, perusahaan, kontak dan perannya, tugas, komentar, persetujuan, prospek asalnya) dan menilai apakah tahapnya masih tepat serta apa yang harus dilakukan selanjutnya — maju ke tahap berikutnya, terus berupaya di tahap saat ini, menjeda, atau menandainya kalah — beserta alasan, risiko, dan kekurangan yang perlu dilengkapi; saat maju, menjabarkan dengan tepat apa yang harus dilakukan. Gunakan saat konversi prospek membuka peluang baru, saat hasil tugas suatu peluang telah dicatat, saat pengguna meminta tindak lanjut, atau saat ditanya "apa langkah berikutnya untuk peluang ini?".',
  'Approval review': 'Tinjauan persetujuan',
  'Helps an approver judge whether an approval request (discount, payment terms, contract terms, delivery commitment) is worth approving — how far the asked terms are from the standard, the effect on the amount and on collection, the opportunity\'s situation and the evidence supporting this concession, the other approvals submitted with it on the same opportunity, how earlier requests of the same kind were decided, the risks and what the applicant left unclear — then recommends approve, approve on conditions, reject or ask for more information, and drafts the decision comment. Use it after an approval is submitted, or when the approver asks "should this approval be approved?".':
    'Membantu pemberi persetujuan menilai apakah permintaan persetujuan (diskon, ketentuan pembayaran, ketentuan kontrak, komitmen pengiriman) layak disetujui — seberapa jauh ketentuan yang diminta dari standar, dampaknya terhadap nilai dan penagihan, situasi peluang dan bukti yang mendukung konsesi ini, persetujuan lain yang diajukan bersamanya pada peluang yang sama, bagaimana permintaan sejenis sebelumnya diputuskan, risikonya, dan hal yang belum dijelaskan pemohon — lalu merekomendasikan setujui, setujui dengan syarat, tolak, atau minta informasi lebih lanjut, dan menyusun draf komentar keputusan. Gunakan setelah persetujuan diajukan, atau saat pemberi persetujuan bertanya "apakah persetujuan ini sebaiknya disetujui?".',
  'Task preparation': 'Persiapan tugas',
  "Prepares a salesperson for a task they are about to do with a customer (a call, a meeting, a visit, a demo) — what the task should achieve, where things stand from the record's tasks, comments and mail, who is on the other side and what part each plays, the questions to ask, what to bring, the risks, and the points to cover in order. Use it on the morning of a task, or when the task's owner asks to be prepared.":
    'Mempersiapkan tenaga penjualan untuk tugas yang akan dilakukannya bersama pelanggan (panggilan, rapat, kunjungan, demo) — apa yang harus dicapai tugas tersebut, posisi terkini berdasarkan tugas, komentar, dan email pada data, siapa saja di pihak pelanggan dan peran masing-masing, pertanyaan yang perlu diajukan, apa yang perlu dibawa, risikonya, dan poin yang perlu dibahas secara berurutan. Gunakan pada pagi hari tugas, atau saat penanggung jawab tugas meminta dipersiapkan.',
  flowDiagram: {
    controls: 'Kontrol diagram',
    fitView: 'Sesuaikan tampilan',
    fullscreen: 'Layar penuh',
    exitFullscreen: 'Keluar dari layar penuh',
    escapeHint: 'Tekan Esc untuk keluar',
    leavesTo: 'Menuju ke',
    arrivesFrom: 'Datang dari',
    otherRoutes: 'Jalur lain',
    minimap: 'Ikhtisar diagram',
    configure: 'Konfigurasi',
    overview: 'Ikhtisar diagram',
    actualSize: 'Ukuran asli',
    states: 'Status',
    transitions: 'Transisi',
    configurable: 'Parameter',
    current: 'Saat ini',
    visited: 'Sudah dilalui',
    initial: 'Awal',
    final: 'Akhir',
    state: 'Status',
    zoomOut: 'Perkecil',
    zoomIn: 'Perbesar',
    fit: 'Sesuaikan tampilan',
    empty: 'Tidak ada status untuk ditampilkan.',
    loading: 'Menyusun diagram…',
    failed: 'Tidak dapat menyusun diagram ini.',
    nodeHelp: 'Tekan Enter atau Spasi untuk memilih status.',
    edgeHelp: 'Tekan Enter atau Spasi untuk memilih transisi.',
  },
  loginActivity: {
    heading: 'Dari prospek pertama hingga kesepakatan yang ditandatangani.',
    description:
      'Tim penjualan AI Anda menindaklanjuti setiap prospek dan peluang, mempersiapkan setiap rapat dan setiap persetujuan, dan Anda yang memutuskan.',
    phases: {
      lead: 'Prospek',
      deal: 'Peluang',
      won: 'Ditutup',
    },
    participants: {
      rep: 'Sophie Bennett',
      leadAgent: 'Tindak lanjut prospek AI',
      prepAgent: 'Asisten tugas AI',
      dealAgent: 'Tindak lanjut peluang AI',
      approvalAgent: 'Tinjauan persetujuan AI',
      manager: 'Daniel Brooks',
      customer: 'Emma Walsh',
    },
    capabilities: {
      capture: 'Penangkapan AI',
      followUp: 'Tindak lanjut AI',
      pipeline: 'Pipeline',
      prep: 'Persiapan tugas',
      mail: 'Email',
      approval: 'Persetujuan',
    },
    timeline: 'Linimasa',
    lead: {
      kind: 'Prospek',
      title: 'Emma Walsh / Northwind Logistics',
      need: 'Dispatch armada, 200 truk · dari email',
      grade: 'Kelas A',
    },
    deal: {
      kind: 'Peluang',
      title: 'Platform dispatch armada (Enterprise)',
      company: 'Northwind Logistics',
      amount: '$48,000',
      owner: 'Sophie Bennett',
      won: 'Menang',
    },
    leadStatuses: {
      new: 'Baru',
      working: 'Ditindaklanjuti',
      converted: 'Dikonversi',
    },
    stages: {
      qualification: 'Kualifikasi',
      proposal: 'Proposal',
      negotiation: 'Negosiasi',
      won: 'Menang',
    },
    steps: {
      captured: {
        who: 'AI',
        what: 'menyusun prospek dari sebuah email',
      },
      leadFollowUp: {
        who: 'Tindak lanjut AI',
        what: 'kelas A, telepon hari ini pukul 15.00',
      },
      converted: {
        who: 'Sophie Bennett',
        what: 'mengonversi prospek menjadi peluang',
      },
      prepared: {
        who: 'AI',
        what: 'menyiapkan demo besok dengan rute milik pelanggan',
      },
      replied: {
        who: 'Emma Walsh',
        what: 'bisakah kami membayar 60 hari setelah faktur?',
      },
      dealFollowUp: {
        who: 'Tindak lanjut AI',
        what: 'lanjut ke negosiasi; 60 hari perlu persetujuan',
      },
      reviewed: {
        who: 'Tinjauan AI',
        what: 'setujui dengan syarat',
      },
      approved: {
        who: 'Daniel Brooks',
        what: 'menyetujui ketentuan 60 hari',
      },
      won: {
        who: 'Sophie Bennett',
        what: 'kontrak yang ditandatangani sudah kembali',
      },
    },
  },
  // The template's Settings copy, translated in ./settings/.
  settings: settingsIdID,
  crm: crmIdID,
};

export default idID;
