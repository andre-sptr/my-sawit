# my-sawit

Next.js web application for palm oil management, operational reporting, and document/PDF workflows.

## Features

- Web dashboard for palm oil-related operational data.
- Prisma-backed data model.
- SQLite/libSQL support for local or lightweight deployments.
- PDF tooling for generated reports or documents.

## Tech Stack

- Next.js
- TypeScript
- Prisma
- SQLite / libSQL
- Tailwind CSS
- Vitest

## Getting Started

```bash
npm install
npm run dev
```

Run tests:

```bash
npm test
```

## Environment Variables

Copy `.env.example` to `.env` and fill in local values. Do not commit real `.env` files.

## Telegram Bot

Bot mengirim notifikasi otomatis (panen, penjualan, pengeluaran, perawatan) ke grup Telegram, dan menerima command dari user.

### Command yang didukung

- `/laporan` — ringkasan hari ini
- `/laporan minggu` — ringkasan minggu berjalan
- `/laporan bulan` — ringkasan bulan berjalan
- `/kapling` — laporan per kapling (bulan ini)
- `/help` — bantuan

### Setup webhook (satu kali)

Setelah deploy, daftarkan webhook ke Telegram:

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://<domain>/api/telegram/webhook",
    "secret_token": "<TELEGRAM_WEBHOOK_SECRET>",
    "allowed_updates": ["message"]
  }'
```

### Scheduled report

Endpoint `/api/cron/daily-report` mengirim laporan harian ke `TELEGRAM_CHAT_ID`. Jadwalkan via cron eksternal (Vercel Cron, GitHub Actions, dst.):

```bash
curl "https://<domain>/api/cron/daily-report?token=<CRON_SECRET>"
```

Contoh Vercel Cron (`vercel.json`):

```json
{
  "crons": [{ "path": "/api/cron/daily-report", "schedule": "0 13 * * *" }]
}
```

> Catatan: Vercel Cron menjalankan cron dalam UTC. `0 13 * * *` = 20:00 WIB.

## Status

Active web application.