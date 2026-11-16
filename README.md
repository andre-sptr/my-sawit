# Rekapal (`my-sawit`)

Aplikasi web Next.js untuk manajemen operasional kebun kelapa sawit pribadi: pencatatan panen, perawatan, pengeluaran, penjualan, laporan keuangan per kapling, invoice PDF, serta integrasi bot Telegram.

## Fitur Utama

- **Landing Page & Autentikasi Pribadi**: Halaman utama (`/`) menampilkan landing page identitas **REKAPAL** dan portal login sebelum masuk ke website (tanpa pendaftaran publik), menggunakan `APP_USERNAME` dan `APP_PASSWORD` dari `.env` dengan sesi permanen.
- **Dashboard Keuangan**: Hero saldo bersih periode, pemilih bulan, ringkasan KPI (panen, pendapatan, pengeluaran, laba bersih), performa per kapling, feed aktivitas terbaru, dan insight komposisi biaya.
- **Workspace per Kapling**:
  - **Panen**: Pencatatan berat (kg & konversi `~ton`), foto bukti lapangan, filter bulan, pencarian, dan pengurutan (terbaru/terberat).
  - **Perawatan**: Pencatatan semprot, babat, pemupukan, jenis kustom, biaya opsional, filter chip jenis, dan pengurutan.
  - **Pengeluaran**: Pencatatan gaji karyawan, kategori kustom, ringkasan pos terbesar, dan bukti transaksi.
  - **Penjualan**: Kalkulator estimasi omset otomatis (`berat × harga/kg`), rata-rata harga tertimbang, dan arsip slip penjualan.
  - **Laporan**: Filter tahun, ringkasan finansial, indikator efisiensi (`biaya/kg`, `rasio jual/panen`), komposisi biaya, laporan bulanan, dan tren volume panen.
  - **Pengaturan**: Ubah nama kapling dan nonaktifkan/aktifkan kembali kapling.
- **Penyimpanan Foto Lokal**: Lampiran foto (JPG, PNG, WebP, maks. 10 MB) disimpan di disk lokal (`storage/uploads/`) dan dilayani secara terproteksi lewat `/uploads/[filename]`.
- **Telegram & PDF**: Invoice PDF otomatis (`pdf-lib`) untuk penjualan serta notifikasi & command bot Telegram.

## Tech Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Prisma 7 + SQLite (`better-sqlite3`)
- Tailwind CSS v4
- `pdf-lib`
- Vitest

## Setup Lokal

1. Install dependensi (menjalankan `prisma generate` otomatis lewat `postinstall`):

```bash
npm install
```

2. Salin `.env.example` menjadi `.env` dan isi nilai konfigurasi:

```bash
cp .env.example .env
```

3. Terapkan migrasi database SQLite:

```bash
npx prisma migrate deploy
```

> Catatan jika upgrade dari database lama yang dibuat sebelum migrasi awal ada: tandai migrasi baseline sudah terpasang lalu jalankan deploy:
> `npx prisma migrate resolve --applied 20260601000000_init && npx prisma migrate deploy`

4. Jalankan mode pengembangan atau produksi:

```bash
# Pengembangan
npm run dev

# Produksi
npm run build
npm start
```

Untuk pengujian unit:

```bash
npm test
```

## Autentikasi & Sesi Permanen

- Set `APP_USERNAME` dan `APP_PASSWORD` di `.env` untuk mengaktifkan proteksi login pada landing page (`/`), `/login`, `/kapling/*`, Server Actions, dan endpoint `/uploads/[filename]`.
- Set `AUTH_SECRET` ke string acak panjang (mis. `openssl rand -hex 32`) untuk kunci tanda tangan HMAC cookie sesi (`rekapal_session`).
- Cookie sesi bersifat **permanen** (token HMAC tanpa kedaluwarsa jangka pendek dengan masa berlaku cookie bergulir 400 hari yang diperpanjang otomatis di `src/proxy.ts`) sampai pengguna menekan **Keluar** atau mengubah `APP_USERNAME` / `APP_PASSWORD` / `AUTH_SECRET` di `.env`.
- Jika `APP_PASSWORD` dikosongkan, autentikasi dilewati untuk kemudahan pengembangan lokal.

## Deployment VPS Ubuntu dengan 1Panel

1. **Siapkan Direktori & `.env` di VPS** (misalnya `/opt/apps/rekapal`):
   - Clone/upload kode proyek ke `/opt/apps/rekapal`.
   - Salin `.env.example` menjadi `.env` lalu isi `DATABASE_URL="file:./dev.db"`, `APP_USERNAME`, `APP_PASSWORD`, `AUTH_SECRET`, `BUSINESS_NAME`, serta konfigurasi Telegram/Cron jika digunakan.

2. **Buat Node.js Runtime di 1Panel** (`Websites → Runtime → Node.js`):
   - Arahkan **Directory** ke `/opt/apps/rekapal` dan pilih port kosong (mis. `5000`).
   - Pada awal deploy (atau saat ada migrasi/update), gunakan Startup Command:
     ```bash
     npx prisma migrate deploy && npm run build && npx next start -H 0.0.0.0 -p 5000
     ```
   - Setelah build pertama selesai dan `.next` terbentuk, Startup Command boleh disederhanakan menjadi `npx next start -H 0.0.0.0 -p 5000` agar restart lebih cepat.
   - Ikat port host ke `127.0.0.1:5000->5000/tcp` agar hanya bisa diakses melalui reverse proxy OpenResty.

3. **Hubungkan Domain & HTTPS di 1Panel** (`Websites → Websites`):
   - Buat website dengan Reverse Proxy ke `http://127.0.0.1:5000` (atau pilih Runtime terkait).
   - Aktifkan **HTTPS (Let's Encrypt)** agar cookie `Secure` dan webhook Telegram berfungsi.
   - Tambahkan `client_max_body_size 15m;` di konfigurasi server OpenResty agar upload foto hingga 10 MB tidak terkena `413 Request Entity Too Large`.

4. **Backup Data Berkala** (`Cronjobs → Backup directory` di 1Panel):
   - Backup direktori `/opt/apps/rekapal` dengan pengecualian (`Exclusion rules`) `node_modules` dan `.next` agar `dev.db`, `.env`, dan `storage/uploads/` tersimpan rutin.

### Update Aplikasi di VPS

```bash
cd /opt/apps/rekapal
git pull
npm ci
npx prisma migrate deploy
npm run build
docker restart rekapal
```

## Telegram Bot & Cron Harian

Bot mengirim notifikasi otomatis (panen, penjualan + invoice PDF, pengeluaran, perawatan) ke grup Telegram dan menerima command dari user.

### Command yang didukung

- `/laporan` — ringkasan hari ini
- `/laporan minggu` — ringkasan minggu berjalan
- `/laporan bulan` — ringkasan bulan berjalan
- `/kapling` — laporan per kapling (bulan ini)
- `/help` — bantuan

### Setup webhook (satu kali)

Setelah deploy dengan HTTPS, muat `.env` di folder proyek lalu daftarkan webhook ke Telegram:

```bash
cd /opt/apps/rekapal
set -a && . ./.env && set +a
curl -sS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://<domain>/api/telegram/webhook\",\"secret_token\":\"${TELEGRAM_WEBHOOK_SECRET}\",\"allowed_updates\":[\"message\"]}"
```

### Scheduled report (Cron di 1Panel / Ubuntu)

Endpoint `/api/cron/daily-report` mengirim laporan harian ke `TELEGRAM_CHAT_ID`. Jadwalkan melalui **Cronjobs → Shell** di 1Panel (sesuaikan jam dengan timezone VPS, mis. `20:00` WIB):

```bash
set -a && . /opt/apps/rekapal/.env && set +a
curl -fsS -H "Authorization: Bearer ${CRON_SECRET}" https://<domain>/api/cron/daily-report >/dev/null
```

> Endpoint juga menerima `?token=<CRON_SECRET>` sebagai fallback untuk scheduler yang tidak mendukung custom header, namun `Authorization: Bearer` disarankan agar secret tidak tercatat di URL access log.
