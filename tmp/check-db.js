import Database from 'better-sqlite3';
import path from 'path';

// Check the root dev.db directly
const dbPath = path.join(process.cwd(), 'dev.db');
console.log('Opening DB at:', dbPath);

const db = new Database(dbPath);

const tables = ['Sale', 'Harvest', 'Expense', 'Maintenance', 'Kapling'];
for (const table of tables) {
  try {
    const row = db.prepare(`SELECT COUNT(*) as cnt FROM ${table}`).get();
    console.log(`${table}: ${row.cnt} records`);
  } catch (e) {
    console.log(`${table}: ERROR - ${e.message}`);
  }
}

// Also check if there are tables at all
const allTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('\nAll tables in DB:', allTables.map(t => t.name));

db.close();
