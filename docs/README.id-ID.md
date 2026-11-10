<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="images/nococrm-logo-dark.svg">
    <img src="images/nococrm-logo.svg" width="240" alt="NocoCRM">
  </picture>
</h1>

<p align="center"><strong>Tim penjualan Anda kini punya tim agen 24/7.</strong></p>

<p align="center">CRM penjualan B2B open source · Dibangun di atas NocoBase</p>

<p align="center">
  <a href="../LICENSE.txt"><img src="https://img.shields.io/badge/license-NocoBase-blue" alt="NocoBase License"></a>
  <a href="https://github.com/nocobase/NocoCRM/tags"><img src="https://img.shields.io/github/v/tag/nocobase/NocoCRM?label=version&sort=semver&include_prereleases" alt="version"></a>
  <a href="https://www.nocobase.com"><img src="https://img.shields.io/badge/built%20on-NocoBase-1f6feb" alt="Built on NocoBase"></a>
</p>

<p align="center">
  <a href="https://solutions.nocobase.com/crm/"><strong>Coba online</strong></a> · <a href="https://www.nocobase.com/id-ID/solution-crm/">Situs web</a>
</p>

<p align="center">
  <a href="../README.MD">English</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.ja-JP.md">日本語</a> · <a href="README.ko-KR.md">한국어</a> · <a href="README.de-DE.md">Deutsch</a> · <a href="README.fr-FR.md">Français</a> · <a href="README.es-ES.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.ru-RU.md">Русский</a> · <strong>Bahasa Indonesia</strong> · <a href="README.vi-VN.md">Tiếng Việt</a>
</p>

NocoCRM adalah CRM penjualan B2B open source yang dibangun di atas [NocoBase](https://www.nocobase.com). Dilengkapi 6 agen penjualan dan terhubung dengan email serta WhatsApp Anda: menindaklanjuti prospek dan peluang, langsung membalas pesan, dan meninjau persetujuan bersama Anda. Agen memberi saran, Anda yang memutuskan.

https://github.com/user-attachments/assets/004dc069-299b-43e4-b515-825e9e71de55

## Fitur

- **Tindak lanjut otomatis.** Prospek atau peluang baru, balasan pelanggan, tugas yang selesai, pemeriksaan pagi: agen membaca seluruh konteks lalu menaruh langkah berikutnya di kotak masuk Anda, lengkap dengan keputusan, tingkat keyakinan, dan alasannya. Data baru berubah setelah Anda menerimanya.
- **Semua kanal dalam satu linimasa.** Setiap orang menghubungkan kotak suratnya sendiri (Gmail, Microsoft 365, atau server IMAP/SMTP apa pun), dan perusahaan menghubungkan nomor WhatsApp Business-nya. Pesan dicocokkan ke prospek dan kontak, dan balasan disiapkan untuk dikirim dari akun Anda sendiri.
- **6 agen penjualan.** Sales Expert untuk diajak bicara di halaman mana pun, ditambah lima agen yang bekerja di latar belakang: tindak lanjut prospek, tindak lanjut peluang, tinjauan persetujuan, persiapan tugas, dan riset perusahaan, masing-masing dengan pemicu, keahlian, dan catatan eksekusinya.
- **Pencatatan cerdas.** Tempel email, percakapan, atau kartu nama: AI mencocokkannya dengan data yang ada dan mengubahnya menjadi prospek atau peluang untuk Anda tinjau sebelum disimpan. Untuk perusahaan baru cukup tulis namanya, AI melengkapi datanya dari web. Prospek ganda ditemukan dan digabungkan.
- **Sinyal perusahaan.** Setiap pagi, riset perusahaan mencari berita di web tentang perusahaan yang punya peluang terbuka atau yang Anda pantau: pendanaan, perekrutan, pergantian pimpinan, langkah bisnis, dan risiko, lengkap dengan sumbernya. Sinyal penting memicu tindak lanjut peluang terbukanya.
- **Persetujuan tidak lagi macet.** Agen persetujuan memeriksa diskon atau ketentuan terhadap aturan dan keputusan Anda sebelumnya, lalu menyusun rekomendasi dan komentar untuk pemberi persetujuan.
- **Seluruh siklus penjualan.** Prospek, perusahaan, kontak, peluang, tugas, persetujuan, dan laporan, dengan papan peluang, kalender tugas, pencarian di semua data (⌘K / Ctrl+K), dan peran yang ditegakkan server untuk setiap data.
- **Bisa disesuaikan.** Tulis harga, batas diskon, dan ritme tindak lanjut sebagai panduan bisnis dalam teks biasa, dan setiap agen mengikutinya; cara kerja setiap agen adalah keahlian yang bisa Anda ubah. Kode sumbernya terbuka, jadi sisanya bisa diubah oleh agen pemrograman.
- **Di-host sendiri.** Data tetap di server Anda, dengan model pilihan Anda: DeepSeek, OpenAI, Claude, Gemini, Qwen, dan lainnya.

## Mulai cepat

Hanya ingin melihat-lihat? [Coba online](https://solutions.nocobase.com/crm/): Anda langsung masuk dengan akun demo, dan semua datanya fiktif.

### 1. Instal

**Dengan agen pemrograman.** Cara termudah. Buka Claude Code, Codex, atau Cursor di folder tempat NocoCRM akan disimpan, lalu berikan ini:

```text
Instal NocoCRM dari https://github.com/nocobase/NocoCRM dan jalankan, dengan mengikuti AGENTS.md dan README repositori.
```

**Secara manual.** Anda memerlukan Node.js 24 atau lebih baru dan pnpm 11 (`corepack enable`). Data secara bawaan disimpan dalam file SQLite; PostgreSQL dan MySQL juga bisa dipakai.

```bash
git clone https://github.com/nocobase/NocoCRM.git
cd NocoCRM
pnpm install
pnpm nocobase config init --dialect sqlite
pnpm dev
```

### 2. Masuk

Buka alamat `Local:` yang ditampilkan `pnpm dev`, biasanya `http://127.0.0.1:13000/main/`, lalu masuk sebagai `nocobase` dengan kata sandi `admin123`.

### 3. Impor data demo

Spanduk di bagian atas menawarkannya, atau buka **Pengaturan → Data demo**. Data ini membawa tim penjualan lengkap dengan pelanggan, peluang, tugas, persetujuan, email, dan percakapan; hapus di halaman yang sama saat Anda mulai menggunakan secara nyata.

### 4. Siapkan model AI

Tambahkan layanan model beserta kuncinya di **Tim Agent → Model**, misalnya DeepSeek, OpenAI, Claude, Gemini, atau Qwen. Asisten dan para agen memerlukannya; fitur lainnya tetap berjalan tanpanya.

[Panduan](guide.md) (bahasa Inggris) membahas langkah selanjutnya, akun demo, peran, konfigurasi (AI, email, WhatsApp, basis data), deployment, dan pengembangan.

Untuk produksi, lihat [Deployment](guide.md#deployment); untuk PostgreSQL dan MySQL, lihat [Konfigurasi](guide.md#configuration).

## Lisensi

NocoCRM dibangun di atas NocoBase dan dirilis dengan [Lisensi NocoBase](../LICENSE.txt).
