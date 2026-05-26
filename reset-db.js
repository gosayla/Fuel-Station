const { Client } = require('pg');
const crypto = require('crypto');

const db = new Client({
  host: 'localhost', port: 5432,
  user: 'postgres', password: 'admin',
  database: 'fuel_station',
});

async function main() {
  await db.connect();
  console.log('Connected');

  // Clear everything except users
  await db.query('DELETE FROM account_transactions');
  await db.query('DELETE FROM cash_collections').catch(() => {});
  await db.query('DELETE FROM transfers');
  await db.query('DELETE FROM expenses');
  await db.query('DELETE FROM sales');
  await db.query('DELETE FROM shifts');
  await db.query('DELETE FROM purchases');
  await db.query('DELETE FROM accounts');
  await db.query('DELETE FROM tanks');
  await db.query('DELETE FROM stations');
  console.log('Cleared all data (users kept)');

  // Station
  const stationId = crypto.randomUUID();
  await db.query(
    `INSERT INTO stations (id, name, address, "isActive", "createdAt")
     VALUES ($1, $2, $3, true, NOW())`,
    [stationId, 'محطة الوقود', '']
  );
  await db.query(`UPDATE users SET "stationId" = $1`, [stationId]);
  console.log('Station created');

  // Tank — petrol_91, 40,000 L capacity, 5,652 L current level
  const tankId = crypto.randomUUID();
  await db.query(
    `INSERT INTO tanks (id, "stationId", name, "fuelType", "capacityLiters", "currentLevelLiters", "lowLevelThreshold", "currentPrice", "isActive", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, 40000, 5652, 2000, 2.2, true, NOW(), NOW())`,
    [tankId, stationId, 'خزان البنزين 91', 'petrol_91']
  );
  console.log('Tank created: 5,652 L current level');

  // Safe account — opening balance 42,229.33 SAR
  const safeId = crypto.randomUUID();
  await db.query(
    `INSERT INTO accounts (id, "stationId", name, type, balance, currency, "isActive", "createdAt")
     VALUES ($1, $2, $3, 'safe', $4, 'SAR', true, NOW())`,
    [safeId, stationId, 'الخزنة', 42229.33]
  );
  console.log('Safe account: SAR 42,229.33');

  // Bank account — opening balance 25,809.88 SAR
  const bankId = crypto.randomUUID();
  await db.query(
    `INSERT INTO accounts (id, "stationId", name, type, balance, currency, "isActive", "createdAt")
     VALUES ($1, $2, $3, 'bank', $4, 'SAR', true, NOW())`,
    [bankId, stationId, 'البنك', 25809.88]
  );
  console.log('Bank account: SAR 25,809.88');

  console.log('\n════════════════════════════════════');
  console.log('Reset complete.');
  console.log('  Tank:  5,652 L');
  console.log('  Safe:  SAR 42,229.33');
  console.log('  Bank:  SAR 25,809.88');
  console.log('════════════════════════════════════');

  await db.end();
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
