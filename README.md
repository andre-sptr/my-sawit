This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy ke VPS Ubuntu dari aaPanel

Berikut adalah langkah-langkah untuk mendeploy aplikasi Next.js ke VPS Ubuntu menggunakan aaPanel:

### 1. Persiapan VPS & aaPanel
1. Pastikan Anda telah menginstal **aaPanel** di VPS Ubuntu Anda.
2. Login ke dashboard aaPanel.
3. Buka menu **App Store** di aaPanel dan instal aplikasi berikut:
   - **Nginx** (Web Server)
   - **PM2 Manager** (Untuk menjalankan aplikasi Node.js)

### 2. Build Aplikasi di Lokal
Sebelum mengunggah, Anda perlu mem-build aplikasi Next.js Anda:
```bash
npm run build
```

### 3. Upload File ke aaPanel
1. Buka menu **Files** di aaPanel.
2. Buat folder baru untuk aplikasi Anda, misalnya di direktori `/www/wwwroot/mysawit`.
3. Upload file dan folder berikut dari proyek lokal Anda (yang sudah dibuild) ke folder tersebut:
   - folder `.next`
   - folder `public` (jika ada)
   - file `package.json`
   - file `next.config.mjs` (atau `.js`)
   - file `.env` (jika menggunakan environment variable)

### 4. Install Dependencies
1. Di aaPanel, buka **Terminal**.
2. Masuk ke direktori aplikasi Anda:
   ```bash
   cd /www/wwwroot/mysawit
   ```
3. Install dependensi (hanya untuk production):
   ```bash
   npm install --production
   ```

### 5. Menjalankan Aplikasi dengan PM2 Manager
1. Buka **App Store** > cari **PM2 Manager** > klik **Settings**.
2. Klik tombol **Add Project**.
3. Isi formulir konfigurasi berikut:
   - **Project Name**: `mysawit` (bebas)
   - **Start File**: Pilih file `next` di dalam direktori `node_modules/next/dist/bin/next` di aplikasi Anda.
   - **Run Directory**: `/www/wwwroot/mysawit`
   - **Arguments**: `start`
   - **Port**: `3000` (Pastikan port ini sudah dibuka di menu **Security** aaPanel dan firewall/security group VPS Anda)
4. Klik **Submit**. Aplikasi Next.js Anda sekarang berjalan di background menggunakan port 3000.

### 6. Mapping Domain (Reverse Proxy dengan Nginx)
Agar aplikasi dapat diakses menggunakan nama domain tanpa perlu mengetikkan port (contoh: `mysawit.com` bukan `mysawit.com:3000`):
1. Masih di pengaturan **PM2 Manager**, pada baris project yang baru dibuat, klik tombol **Mapping** atau **Map**.
2. Masukkan nama domain Anda.
3. aaPanel akan secara otomatis membuatkan pengaturan Website dan mengarahkan domain tersebut (Reverse Proxy) ke port aplikasi Anda.
4. Buka menu **Website**, klik pada nama domain Anda yang baru dibuat, dan buka tab **SSL** lalu gunakan Let's Encrypt agar website dapat diakses dengan aman (HTTPS).

Selesai! Aplikasi Next.js Anda sudah berhasil di-deploy ke VPS Ubuntu menggunakan aaPanel.
