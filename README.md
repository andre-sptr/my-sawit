# Rekapal (`my-sawit`)

Aplikasi web Next.js untuk manajemen operasional kebun kelapa sawit: pencatatan panen, perawatan, pengeluaran, penjualan, laporan keuangan per kapling, invoice PDF, dan integrasi bot Telegram.

## Fitur Utama

- Dashboard ringkasan bulanan, performa per kapling, feed aktivitas, dan insight biaya.
- Workspace per kapling untuk panen, perawatan, pengeluaran, penjualan, laporan bulanan, serta kategori/jenis kustom.
- Lampiran foto bukti transaksi disimpan di disk lokal (`storage/uploads/`).
- Invoice PDF otomatis untuk setiap penjualan dan notifikasi/laporan ke Telegram.
- Proteksi akses opsional berbasis password (`APP_PASSWORD`).

## Tech Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Prisma 7 + SQLite (`better-sqlite3`)
- Tailwind CSS v4
- `pdf-lib`
- Vitest

## Setup Lokal & Deployment VPS Ubuntu

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

4. Build dan jalankan server produksi:

```bash
npm run build
npm start
```

Untuk pengujian unit:

```bash
npm test
```

## Autentikasi Web

- Set `APP_PASSWORD` di `.env` untuk mengaktifkan halaman `/login` dan melindungi dashboard, Server Actions, serta endpoint `/uploads/[filename]`.
- Set `AUTH_SECRET` ke string acak panjang untuk kunci tanda tangan cookie sesi (`rekapal_session`).
- Jika `APP_PASSWORD` dikosongkan, autentikasi dilewati untuk kemudahan pengembangan lokal.

## Telegram Bot

Bot mengirim notifikasi otomatis (panen, penjualan + invoice PDF, pengeluaran, perawatan) ke grup Telegram, dan menerima command dari user.

### Command yang didukung

- `/laporan` — ringkasan hari ini
- `/laporan minggu` — ringkasan minggu berjalan
- `/laporan bulan` — ringkasan bulan berjalan
- `/kapling` — laporan per kapling (bulan ini)
- `/help` — bantuan

### Setup webhook (satu kali)

Setelah deploy dengan HTTPS, daftarkan webhook ke Telegram:

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://<domain>/api/telegram/webhook",
    "secret_token": "<TELEGRAM_WEBHOOK_SECRET>",
    "allowed_updates": ["message"]
  }'
```

### Scheduled report (Cron di VPS Ubuntu)

Endpoint `/api/cron/daily-report` mengirim laporan harian ke `TELEGRAM_CHAT_ID`. Jadwalkan dari `crontab` di VPS (mis. pukul 20:00 WIB):

```cron
0 20 * * * curl -fsS -H "Authorization: Bearer <CRON_SECRET>" https://<domain>/api/cron/daily-report >/dev/null
```

> Endpoint juga menerima `?token=<CRON_SECRET>` sebagai fallback untuk scheduler yang tidak mendukung custom header, namun `Authorization: Bearer` disarankan agar secret tidak tercatat di URL access log.
