import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || 'file:./dev.db' }),
});

// ── Helpers ────────────────────────────────────────────────
const appTimeZone = 'Asia/Jakarta';

/** Get current year/month/day in Jakarta timezone */
function getJakartaDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: appTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  return {
    year: Number(parts.find(p => p.type === 'year')?.value),
    month: Number(parts.find(p => p.type === 'month')?.value),
    day: Number(parts.find(p => p.type === 'day')?.value),
  };
}

/** Buat tanggal UTC dari tanggal lokal WIB (UTC+7) */
function wib(year, month, day) {
  // month: 1-12
  return new Date(Date.UTC(year, month - 1, day, -7)); // offset -7 agar simpan sebagai WIB midnight
}

/** Jumlah hari dalam bulan tertentu */
function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/** Clamp hari agar tidak melebihi jumlah hari di bulan itu */
function safeDay(year, month, day) {
  return Math.min(day, daysInMonth(year, month));
}

async function main() {
  // ── Hitung bulan dinamis ─────────────────────────────────
  const now = getJakartaDateParts();
  const Y = now.year;
  const M = now.month; // bulan ini (1-12)
  const prevM = M === 1 ? 12 : M - 1;
  const prevY = M === 1 ? Y - 1 : Y;

  console.log(`🌴 Memulai seeding data dummy mySawit...`);
  console.log(`📅 Bulan ini: ${M}/${Y}, bulan lalu: ${prevM}/${prevY}\n`);

  // ── CLEAR DATA LAMA ──────────────────────────────────────
  await prisma.sale.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.maintenance.deleteMany();
  await prisma.harvest.deleteMany();
  await prisma.kapling.deleteMany();
  console.log('✓ Data lama dihapus');

  // ── KAPLING ───────────────────────────────────────────────
  const kaplings = await Promise.all([
    prisma.kapling.create({ data: { name: 'Blok A — Utara', isActive: true } }),
    prisma.kapling.create({ data: { name: 'Blok B — Selatan', isActive: true } }),
    prisma.kapling.create({ data: { name: 'Blok C — Timur', isActive: true } }),
    prisma.kapling.create({ data: { name: 'Blok D — Barat', isActive: false } }), // nonaktif
  ]);
  const [blokA, blokB, blokC] = kaplings;
  console.log(`✓ ${kaplings.length} kapling dibuat`);

  // ── HARVEST (Panenan) ─────────────────────────────────────
  const harvestData = [
    // Blok A — bulan ini + bulan lalu
    { kaplingId: blokA.id, harvestDate: wib(Y, M, safeDay(Y, M, 3)),  weightKg: 1240.5, note: 'Panen perdana bulan ini, cuaca cerah' },
    { kaplingId: blokA.id, harvestDate: wib(Y, M, safeDay(Y, M, 10)), weightKg: 980.0,  note: null },
    { kaplingId: blokA.id, harvestDate: wib(Y, M, safeDay(Y, M, 14)), weightKg: 1105.5, note: 'Sedikit hujan saat panen' },
    { kaplingId: blokA.id, harvestDate: wib(prevY, prevM, safeDay(prevY, prevM, 8)),  weightKg: 1350.0, note: 'Hasil bagus' },
    { kaplingId: blokA.id, harvestDate: wib(prevY, prevM, safeDay(prevY, prevM, 22)), weightKg: 1180.0, note: null },
    // Blok B
    { kaplingId: blokB.id, harvestDate: wib(Y, M, safeDay(Y, M, 5)),  weightKg: 870.0,  note: null },
    { kaplingId: blokB.id, harvestDate: wib(Y, M, safeDay(Y, M, 12)), weightKg: 920.5,  note: 'TBS grade A' },
    { kaplingId: blokB.id, harvestDate: wib(prevY, prevM, safeDay(prevY, prevM, 10)), weightKg: 1050.0, note: null },
    { kaplingId: blokB.id, harvestDate: wib(prevY, prevM, safeDay(prevY, prevM, 25)), weightKg: 990.0,  note: 'Sebagian TBS masak lambat' },
    // Blok C
    { kaplingId: blokC.id, harvestDate: wib(Y, M, safeDay(Y, M, 7)),  weightKg: 1560.0, note: 'Panen terbesar tahun ini' },
    { kaplingId: blokC.id, harvestDate: wib(Y, M, safeDay(Y, M, 14)), weightKg: 1340.5, note: null },
    { kaplingId: blokC.id, harvestDate: wib(prevY, prevM, safeDay(prevY, prevM, 5)),  weightKg: 1420.0, note: null },
    { kaplingId: blokC.id, harvestDate: wib(prevY, prevM, safeDay(prevY, prevM, 20)), weightKg: 1280.0, note: 'Cuaca kering, buah sedikit kecil' },
  ];
  await prisma.harvest.createMany({ data: harvestData });
  console.log(`✓ ${harvestData.length} data panenan dibuat`);

  // ── MAINTENANCE (Perawatan) ───────────────────────────────
  const maintenanceData = [
    // Blok A
    { kaplingId: blokA.id, activityDate: wib(Y, M, safeDay(Y, M, 2)),  type: 'SEMPROT', cost: 850000,  note: 'Herbisida glifosat 2 liter' },
    { kaplingId: blokA.id, activityDate: wib(Y, M, safeDay(Y, M, 9)),  type: 'BABAT',   cost: 500000,  note: 'Babat pasar piringan & parit' },
    { kaplingId: blokA.id, activityDate: wib(prevY, prevM, safeDay(prevY, prevM, 15)), type: 'PUPUK',   cost: 2100000, note: 'NPK Mutiara 200 kg' },
    { kaplingId: blokA.id, activityDate: wib(prevY, prevM, safeDay(prevY, prevM, 28)), type: 'SEMPROT', cost: 750000,  note: 'Insektisida ulat api' },
    // Blok B
    { kaplingId: blokB.id, activityDate: wib(Y, M, safeDay(Y, M, 4)),  type: 'PUPUK',   cost: 1800000, note: 'MOP + Urea 150 kg' },
    { kaplingId: blokB.id, activityDate: wib(Y, M, safeDay(Y, M, 11)), type: 'BABAT',   cost: 450000,  note: null },
    { kaplingId: blokB.id, activityDate: wib(prevY, prevM, safeDay(prevY, prevM, 12)), type: 'SEMPROT', cost: 680000,  note: 'Herbisida jalur tanam' },
    // Blok C
    { kaplingId: blokC.id, activityDate: wib(Y, M, safeDay(Y, M, 1)),  type: 'SEMPROT', cost: 920000,  note: 'Fungisida + Insektisida mix' },
    { kaplingId: blokC.id, activityDate: wib(Y, M, safeDay(Y, M, 8)),  type: 'PUPUK',   cost: 2400000, note: 'Dolomit + NPK 250 kg, aplikasi manual' },
    { kaplingId: blokC.id, activityDate: wib(prevY, prevM, safeDay(prevY, prevM, 18)), type: 'BABAT',   cost: 600000,  note: 'Semua blok selesai 2 hari' },
    { kaplingId: blokC.id, activityDate: wib(prevY, prevM, safeDay(prevY, prevM, 30)), type: 'SEMPROT', cost: 780000,  note: null },
  ];
  await prisma.maintenance.createMany({ data: maintenanceData });
  console.log(`✓ ${maintenanceData.length} data perawatan dibuat`);

  // ── EXPENSE (Pengeluaran) ─────────────────────────────────
  const expenseData = [
    // Blok A
    { kaplingId: blokA.id, expenseDate: wib(Y, M, safeDay(Y, M, 1)),  category: 'GAJI_KARYAWAN', amount: 3500000, note: 'Gaji mandor Pak Slamet + 2 pemanen' },
    { kaplingId: blokA.id, expenseDate: wib(Y, M, safeDay(Y, M, 8)),  category: 'LAIN_LAIN',     amount: 250000,  note: 'Bensin chainsaw + angkut TBS' },
    { kaplingId: blokA.id, expenseDate: wib(prevY, prevM, safeDay(prevY, prevM, 1)),  category: 'GAJI_KARYAWAN', amount: 3500000, note: 'Gaji bulan lalu' },
    { kaplingId: blokA.id, expenseDate: wib(prevY, prevM, safeDay(prevY, prevM, 20)), category: 'LAIN_LAIN',     amount: 180000,  note: 'Perbaikan egrek & dodos' },
    // Blok B
    { kaplingId: blokB.id, expenseDate: wib(Y, M, safeDay(Y, M, 1)),  category: 'GAJI_KARYAWAN', amount: 2800000, note: 'Gaji 2 pemanen Blok B' },
    { kaplingId: blokB.id, expenseDate: wib(Y, M, safeDay(Y, M, 10)), category: 'LAIN_LAIN',     amount: 320000,  note: 'Sewa angkutan + timbangan' },
    { kaplingId: blokB.id, expenseDate: wib(prevY, prevM, safeDay(prevY, prevM, 1)),  category: 'GAJI_KARYAWAN', amount: 2800000, note: 'Gaji bulan lalu' },
    // Blok C
    { kaplingId: blokC.id, expenseDate: wib(Y, M, safeDay(Y, M, 1)),  category: 'GAJI_KARYAWAN', amount: 4200000, note: 'Gaji mandor + 3 pemanen Blok C' },
    { kaplingId: blokC.id, expenseDate: wib(Y, M, safeDay(Y, M, 7)),  category: 'LAIN_LAIN',     amount: 450000,  note: 'Perbaikan jalan kebun Blok C' },
    { kaplingId: blokC.id, expenseDate: wib(prevY, prevM, safeDay(prevY, prevM, 1)),  category: 'GAJI_KARYAWAN', amount: 4200000, note: 'Gaji bulan lalu' },
    { kaplingId: blokC.id, expenseDate: wib(prevY, prevM, safeDay(prevY, prevM, 25)), category: 'LAIN_LAIN',     amount: 600000,  note: 'Beli cangkul & sprayer baru' },
  ];
  await prisma.expense.createMany({ data: expenseData });
  console.log(`✓ ${expenseData.length} data pengeluaran dibuat`);

  // ── SALE (Penjualan) ──────────────────────────────────────
  // Harga TBS kisaran Rp 2.400–2.600/kg
  const saleData = [
    // Blok A
    { kaplingId: blokA.id, saleDate: wib(Y, M, safeDay(Y, M, 4)),  weightKg: 1220.0, pricePerKg: 2480, note: 'Jual ke PKS Sinar Mas, harga kontrak' },
    { kaplingId: blokA.id, saleDate: wib(Y, M, safeDay(Y, M, 11)), weightKg: 975.5,  pricePerKg: 2520, note: null },
    { kaplingId: blokA.id, saleDate: wib(prevY, prevM, safeDay(prevY, prevM, 9)),  weightKg: 1340.0, pricePerKg: 2350, note: 'Harga bulan lalu lebih rendah' },
    { kaplingId: blokA.id, saleDate: wib(prevY, prevM, safeDay(prevY, prevM, 23)), weightKg: 1175.0, pricePerKg: 2380, note: null },
    // Blok B
    { kaplingId: blokB.id, saleDate: wib(Y, M, safeDay(Y, M, 6)),  weightKg: 862.0,  pricePerKg: 2480, note: null },
    { kaplingId: blokB.id, saleDate: wib(Y, M, safeDay(Y, M, 13)), weightKg: 915.0,  pricePerKg: 2550, note: 'Harga naik, langsung jual' },
    { kaplingId: blokB.id, saleDate: wib(prevY, prevM, safeDay(prevY, prevM, 11)), weightKg: 1045.0, pricePerKg: 2350, note: null },
    { kaplingId: blokB.id, saleDate: wib(prevY, prevM, safeDay(prevY, prevM, 26)), weightKg: 985.0,  pricePerKg: 2400, note: null },
    // Blok C
    { kaplingId: blokC.id, saleDate: wib(Y, M, safeDay(Y, M, 8)),  weightKg: 1550.0, pricePerKg: 2480, note: 'Hasil terbaik, grading A' },
    { kaplingId: blokC.id, saleDate: wib(Y, M, safeDay(Y, M, 15)), weightKg: 1330.0, pricePerKg: 2560, note: 'Harga minggu ke-3 naik' },
    { kaplingId: blokC.id, saleDate: wib(prevY, prevM, safeDay(prevY, prevM, 6)),  weightKg: 1410.0, pricePerKg: 2350, note: null },
    { kaplingId: blokC.id, saleDate: wib(prevY, prevM, safeDay(prevY, prevM, 21)), weightKg: 1270.0, pricePerKg: 2380, note: null },
  ];
  await prisma.sale.createMany({ data: saleData });
  console.log(`✓ ${saleData.length} data penjualan dibuat`);

  // ── RINGKASAN ─────────────────────────────────────────────
  console.log('\n📊 Ringkasan Data Dummy:');
  console.log(`   Kapling  : ${kaplings.length} (3 aktif, 1 nonaktif)`);
  console.log(`   Panenan  : ${harvestData.length} entri`);
  console.log(`   Perawatan: ${maintenanceData.length} entri`);
  console.log(`   Pengeluaran: ${expenseData.length} entri`);
  console.log(`   Penjualan: ${saleData.length} entri`);

  const bulanIniFilter = (d) => {
    const p = getJakartaDateParts(d);
    return p.year === Y && p.month === M;
  };

  const totalPanen  = harvestData.filter(h => bulanIniFilter(h.harvestDate)).reduce((s, h) => s + h.weightKg, 0);
  const totalRevenue = saleData.filter(s => bulanIniFilter(s.saleDate)).reduce((s, x) => s + x.weightKg * x.pricePerKg, 0);
  const totalExpenseAmt = expenseData.filter(e => bulanIniFilter(e.expenseDate)).reduce((s, e) => s + e.amount, 0);
  const totalMaintCost = maintenanceData.filter(m => bulanIniFilter(m.activityDate)).reduce((s, m) => s + (m.cost ?? 0), 0);

  console.log(`\n   📅 Bulan ini (${M}/${Y}):`);
  console.log(`   Total Panen     : ${totalPanen.toLocaleString('id-ID')} kg`);
  console.log(`   Total Revenue   : Rp ${totalRevenue.toLocaleString('id-ID')}`);
  console.log(`   Total Expense   : Rp ${totalExpenseAmt.toLocaleString('id-ID')}`);
  console.log(`   Total Maint     : Rp ${totalMaintCost.toLocaleString('id-ID')}`);
  console.log(`   Net Profit      : Rp ${(totalRevenue - totalExpenseAmt - totalMaintCost).toLocaleString('id-ID')}`);
  console.log('\n✅ Seeding selesai!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
