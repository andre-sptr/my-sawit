# Desain: Integrasi Bot Telegram — Notifikasi Transaksi mySawit

- **Tanggal:** 2026-06-23
- **Status:** Disetujui (siap dibuatkan rencana implementasi)
- **Tipe:** Integrasi keluar (push-only), real-time per transaksi

## 1. Tujuan

Menghubungkan mySawit ke sebuah grup Telegram agar setiap transaksi finansial
(penjualan, pengeluaran, perawatan) yang dicatat lewat web **langsung dikirim
sebagai notifikasi** ke grup. Khusus **penjualan**, notifikasi membawa **dokumen
PDF invoice**. Tujuannya transparansi/audit ke pemilik + mandor secara real-time.

Bot bersifat **push-only**: hanya mengirim, tidak menerima/memproses perintah.
Konsekuensinya: tidak perlu webhook, polling, maupun URL publik. Cukup proses
web yang sudah ada memanggil Bot API saat transaksi tersimpan.

## 2. Ruang lingkup perilaku

| Transaksi               | Buat                          | Edit                            | Hapus              | PDF |
|-------------------------|-------------------------------|---------------------------------|--------------------|-----|
| **Penjualan** (Sale)    | notif + **PDF invoice**       | notif + **PDF invoice "Revisi"**| notif **teks saja**| Ya  |
| **Pengeluaran** (Expense) | notif teks                  | notif teks                      | notif teks         | Tidak |
| **Perawatan** (Maintenance) | notif teks                | notif teks                      | notif teks         | Tidak |
| **Panen** (Harvest)     | — (tidak ada notif)           | —                               | —                  | —   |

- Semua pesan dikirim ke **satu grup Telegram** (`TELEGRAM_CHAT_ID`).
- Nomor invoice memakai **kode otomatis** `INV-YYYYMMDD-xxxx` (turunan dari
  tanggal + sebagian id record). **Tanpa mengubah skema database.**
- PDF **tidak** menyertakan foto bukti (`photoPath`) — tata letak teks rapi saja.

### Aturan non-fungsional kritis
Kegagalan/lambatnya Telegram **tidak boleh** menggagalkan pencatatan data.
Penyimpanan ke database adalah sumber kebenaran dan harus selalu sukses lebih
dulu; notifikasi adalah efek samping best-effort.

## 3. Arsitektur & komponen baru

Tiga modul baru, tanpa mengubah pola arsitektur yang ada (Next.js server
actions + Prisma):

### 3.1 `src/lib/telegram.ts` — klien Bot API (transport)
- `sendMessage(text: string): Promise<void>`
- `sendDocument(bytes: Uint8Array, filename: string, caption: string): Promise<void>`
- Membaca `TELEGRAM_BOT_TOKEN` dan `TELEGRAM_CHAT_ID` dari env.
- Jika salah satu env kosong → **no-op diam** (dev tanpa konfigurasi tetap jalan,
  tidak ada error).
- Semua panggilan dibungkus `try/catch` + timeout `AbortController` (~5 dtk).
  Kegagalan hanya `console.warn`, tidak pernah `throw`.
- HTTP via `fetch` bawaan; upload PDF via `FormData`/`Blob` bawaan Node 18+.
  `sendMessage` memakai `parse_mode: 'HTML'` (escape input pengguna).
- **Tanggung jawab tunggal:** bicara ke Telegram. Tidak tahu soal domain sawit.

### 3.2 `src/lib/invoice-pdf.ts` — generator PDF (dokumen)
- `buildSaleInvoicePdf(input): Promise<Uint8Array>` memakai `pdf-lib`.
- Input: data penjualan (nama kapling, tanggal, kg, harga/kg, total, catatan),
  nomor invoice, nama usaha, dan flag `isRevision`.
- **Tanggung jawab tunggal:** merender PDF. Tidak tahu soal Telegram/DB.

### 3.3 `src/lib/notify.ts` — lapisan domain (apa yang dikirim)
Menyusun isi pesan & memutuskan kapan butuh PDF. Memanggil `invoice-pdf.ts`
lalu `telegram.ts`. Fungsi yang diekspor (nama final boleh disesuaikan saat
implementasi):
- `notifySaleCreated(sale)` / `notifySaleUpdated(sale)` / `notifySaleDeleted(info)`
- `notifyExpenseCreated(expense)` / `notifyExpenseUpdated(expense)` / `notifyExpenseDeleted(info)`
- `notifyMaintenanceCreated(m)` / `notifyMaintenanceUpdated(m)` / `notifyMaintenanceDeleted(info)`
- Helper internal: `formatRupiah()`, `formatTanggal()`, `buildInvoiceNumber(record)`.
- **Tanggung jawab tunggal:** menerjemahkan kejadian domain → pesan; tidak tahu
  detail HTTP Telegram maupun byte PDF.

### 3.4 Perubahan pada `src/app/actions.ts` (minimal)
- `create*`/`update*`: tangkap record hasilnya
  (`const sale = await prisma.sale.create({...})`) lalu panggil notify yang sesuai.
- `delete*`: lakukan **read-before-delete** (ambil record + nama kapling) sebelum
  `delete`, agar detail bisa masuk pesan "dihapus".
- Pemanggilan notify: `await notify*(...)` yang sudah aman internal (tidak melempar).
  Diletakkan **setelah** tulis DB sukses dan **sebelum** `revalidatePath`/return.

## 4. Alur data

```
User submit form (web)
  → server action (createSale/updateSale/deleteSale/createExpense/...)
  → prisma write  ✅  (sumber kebenaran — sukses lebih dulu)
  → notify*(record)            (aman: try/catch internal, tidak melempar)
       → notify.ts susun teks (+ panggil invoice-pdf.ts untuk Sale)
       → telegram.ts kirim ke grup (timeout ~5s; gagal → console.warn)
  → revalidatePath + return { ok: true }   (tak terpengaruh status Telegram)
```

## 5. Contoh keluaran

**Penjualan baru** (1 pesan: dokumen PDF + caption):
```
💰 Penjualan baru — Kapling 1
100 kg × Rp2.500 = Rp250.000 · 23 Jun 2026
📄 Invoice INV-20260623-A1B2 terlampir
```

**Penjualan diedit** (PDF revisi + caption diawali "✏️ Penjualan diperbarui …").

**Penjualan dihapus** (teks saja):
```
🗑️ Penjualan dihapus — Kapling 1: 100 kg (Rp250.000), 23 Jun 2026
```

**Pengeluaran baru** (teks):
```
🧾 Pengeluaran baru (Gaji Karyawan) — Kapling 1: Rp200.000 · 23 Jun 2026
```

**Perawatan baru** (teks):
```
🛠️ Perawatan baru (Pupuk) — Kapling 1: Rp50.000 · 23 Jun 2026
```

### Isi PDF invoice penjualan
1. Kop: `BUSINESS_NAME` + judul "INVOICE PENJUALAN" (+ label **REVISI** bila edit).
2. Nomor invoice + tanggal terbit.
3. Tabel: Kapling, tanggal penjualan, berat (kg), harga/kg, **Total**.
4. Catatan (jika ada).
5. Footer: "Dokumen dibuat otomatis oleh mySawit".

## 6. Konfigurasi & keamanan

`.env.local` (server-only — TANPA prefix `NEXT_PUBLIC_`; pastikan `.env*` ada di
`.gitignore`):
```
TELEGRAM_BOT_TOKEN=<token BARU hasil /revoke @BotFather>
TELEGRAM_CHAT_ID=<id grup, umumnya angka negatif>
BUSINESS_NAME=<nama usaha untuk kop invoice>
```

- **Token lama sudah terekspos di chat dan WAJIB di-`/revoke`** lewat @BotFather;
  pakai token baru. Token tidak boleh masuk repo/kode.
- Mendapatkan `TELEGRAM_CHAT_ID`: tambahkan bot ke grup → kirim satu pesan di
  grup → panggil `getUpdates` sekali untuk membaca `chat.id`.

## 7. Penanganan error

- Notif dipanggil **hanya setelah** DB sukses.
- Lapisan transport (`telegram.ts`) menelan semua error (timeout, jaringan,
  token salah, chat id salah) → `console.warn`, tidak pernah `throw`.
- Akibatnya `ActionResult` tetap `{ ok: true }` walau notif gagal terkirim.

## 8. Pengujian

- **Unit (deterministik):** `buildInvoiceNumber()`, `formatRupiah()`,
  `formatTanggal()`, dan penyusunan teks tiap jenis pesan.
- **Generator PDF:** `buildSaleInvoicePdf()` menghasilkan byte PDF valid
  (header `%PDF`), termasuk varian normal & "Revisi".
- **No-op:** dengan env kosong, semua fungsi notify selesai tanpa error & tanpa
  panggilan jaringan.
- **Smoke manual:** satu transaksi nyata tiap jenis → cek pesan/PDF muncul di
  grup; uji token salah memastikan tidak ada crash & data tetap tersimpan.

## 9. Dependensi baru

- **`pdf-lib`** (pure-JS, MIT) untuk PDF. HTTP & multipart memakai bawaan Node
  (`fetch`, `FormData`, `Blob`) — tidak ada dependensi tambahan.

## 10. Input yang diperlukan dari pemilik sebelum implementasi

1. **Token baru** dari `/revoke` @BotFather (ditaruh di `.env.local`).
2. **Nama usaha** untuk kop invoice (`BUSINESS_NAME`).
3. **ID grup** Telegram (atau izin memandu `getUpdates`).

## 11. Di luar lingkup (YAGNI untuk v1)

- Perintah masuk / bot interaktif (query, pencatatan via chat).
- Laporan terjadwal (harian/mingguan/bulanan) & alert cerdas.
- Notifikasi panen.
- PDF untuk pengeluaran/perawatan.
- Foto bukti di dalam PDF.
- Nomor invoice urut resmi (butuh field counter di DB).
