import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || 'file:./dev.db' }),
});

const appTimeZone = 'Asia/Jakarta';
const jakartaOffsetHours = 7;

function getJakartaDateParts(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: appTimeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  return {
    year: Number(parts.find(p => p.type === 'year')?.value),
    month: Number(parts.find(p => p.type === 'month')?.value),
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
  const range = getCurrentMonthRange(now);
  console.log('Server time:', now.toISOString());
  console.log('Server TZ:', Intl.DateTimeFormat().resolvedOptions().timeZone);
  console.log('Jakarta:', getJakartaDateParts(now));
  console.log('Query range:', range.start.toISOString(), '→', range.end.toISOString());

  const sales = await prisma.sale.findMany({ include: { kapling: { select: { name: true } } } });
  const expenses = await prisma.expense.findMany({ include: { kapling: { select: { name: true } } } });
  const maintenance = await prisma.maintenance.findMany({ include: { kapling: { select: { name: true } } } });
  const harvests = await prisma.harvest.findMany({ include: { kapling: { select: { name: true } } } });

  console.log('\n=== HARVESTS (' + harvests.length + ') ===');
  harvests.forEach(h => {
    const inRange = h.harvestDate >= range.start && h.harvestDate < range.end;
    console.log(`  ${inRange ? '✅' : '❌'} ${h.kapling.name} | ${h.harvestDate.toISOString()} | ${h.weightKg} kg`);
  });

  console.log('\n=== SALES (' + sales.length + ') ===');
  sales.forEach(s => {
    const inRange = s.saleDate >= range.start && s.saleDate < range.end;
    console.log(`  ${inRange ? '✅' : '❌'} ${s.kapling.name} | ${s.saleDate.toISOString()} | ${s.weightKg}kg x Rp${s.pricePerKg}`);
  });

  console.log('\n=== EXPENSES (' + expenses.length + ') ===');
  expenses.forEach(e => {
    const inRange = e.expenseDate >= range.start && e.expenseDate < range.end;
    console.log(`  ${inRange ? '✅' : '❌'} ${e.kapling.name} | ${e.expenseDate.toISOString()} | Rp${e.amount} (${e.category})`);
  });

  console.log('\n=== MAINTENANCE (' + maintenance.length + ') ===');
  maintenance.forEach(m => {
    const inRange = m.activityDate >= range.start && m.activityDate < range.end;
    console.log(`  ${inRange ? '✅' : '❌'} ${m.kapling.name} | ${m.activityDate.toISOString()} | Rp${m.cost ?? 0} (${m.type})`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
