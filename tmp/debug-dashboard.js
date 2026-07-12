import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || 'file:./dev.db' }),
});

// Replicate the exact logic from date.ts
const appTimeZone = 'Asia/Jakarta';
const jakartaOffsetHours = 7;

function getJakartaDateParts(date) {
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

function getCurrentMonthRange(now = new Date()) {
  const { year, month } = getJakartaDateParts(now);
  const start = new Date(Date.UTC(year, month - 1, 1) - jakartaOffsetHours * 60 * 60 * 1000);
  const end   = new Date(Date.UTC(year, month,     1) - jakartaOffsetHours * 60 * 60 * 1000);
  return { start, end };
}

async function main() {
  const now = new Date();
  console.log('=== DEBUG DASHBOARD DATA ===');
  console.log('Current time (UTC):', now.toISOString());
  console.log('Jakarta date parts:', getJakartaDateParts(now));

  const range = getCurrentMonthRange(now);
  console.log('\nMonth range used for query:');
  console.log('  start:', range.start.toISOString());
  console.log('  end:  ', range.end.toISOString());

  // Count all records
  const totalSales = await prisma.sale.count();
  const totalHarvests = await prisma.harvest.count();
  const totalExpenses = await prisma.expense.count();
  const totalMaintenance = await prisma.maintenance.count();
  console.log('\n=== TOTAL RECORDS IN DB ===');
  console.log('Sales:', totalSales);
  console.log('Harvests:', totalHarvests);
  console.log('Expenses:', totalExpenses);
  console.log('Maintenance:', totalMaintenance);

  // Check what dates exist in each table
  const allSales = await prisma.sale.findMany({ select: { saleDate: true } });
  const allHarvests = await prisma.harvest.findMany({ select: { harvestDate: true } });
  const allExpenses = await prisma.expense.findMany({ select: { expenseDate: true } });
  const allMaint = await prisma.maintenance.findMany({ select: { activityDate: true } });

  console.log('\n=== ALL SALE DATES ===');
  allSales.forEach(s => console.log('  ', s.saleDate.toISOString()));

  console.log('\n=== ALL HARVEST DATES ===');
  allHarvests.forEach(h => console.log('  ', h.harvestDate.toISOString()));

  console.log('\n=== ALL EXPENSE DATES ===');
  allExpenses.forEach(e => console.log('  ', e.expenseDate.toISOString()));

  console.log('\n=== ALL MAINTENANCE DATES ===');
  allMaint.forEach(m => console.log('  ', m.activityDate.toISOString()));

  // Query with the actual range
  const salesInRange = await prisma.sale.findMany({
    where: { saleDate: { gte: range.start, lt: range.end } },
  });
  const harvestsInRange = await prisma.harvest.findMany({
    where: { harvestDate: { gte: range.start, lt: range.end } },
  });
  const expensesInRange = await prisma.expense.findMany({
    where: { expenseDate: { gte: range.start, lt: range.end } },
  });
  const maintInRange = await prisma.maintenance.findMany({
    where: { activityDate: { gte: range.start, lt: range.end } },
  });

  console.log('\n=== RECORDS IN CURRENT MONTH RANGE ===');
  console.log('Sales in range:', salesInRange.length);
  console.log('Harvests in range:', harvestsInRange.length);
  console.log('Expenses in range:', expensesInRange.length);
  console.log('Maintenance in range:', maintInRange.length);

  // Calculate revenue
  const totalRevenue = salesInRange.reduce((sum, s) => sum + s.weightKg * s.pricePerKg, 0);
  const totalExpenseAmt = expensesInRange.reduce((sum, e) => sum + e.amount, 0);
  const totalMaintCost = maintInRange.reduce((sum, m) => sum + (m.cost ?? 0), 0);

  console.log('\n=== CALCULATED VALUES ===');
  console.log('Total Revenue:', totalRevenue);
  console.log('Total Direct Expenses:', totalExpenseAmt);
  console.log('Total Maintenance Cost:', totalMaintCost);
  console.log('Total Expenses:', totalExpenseAmt + totalMaintCost);
  console.log('Net Profit:', totalRevenue - totalExpenseAmt - totalMaintCost);
}

main()
  .catch(e => console.error('ERROR:', e))
  .finally(() => prisma.$disconnect());
