import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../.env') });

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin',
  database: process.env.DB_NAME || 'fuel_station',
  synchronize: false,
});

async function seed() {
  await AppDataSource.initialize();
  console.log('Connected to database');

  // Create default station
  const stationResult = await AppDataSource.query(`
    INSERT INTO stations (id, name, address, phone, "isActive")
    VALUES (uuid_generate_v4(), 'Main Station', '123 Main Street', '+1234567890', true)
    ON CONFLICT DO NOTHING
    RETURNING id
  `);

  const stationId = stationResult[0]?.id;
  if (!stationId) {
    const existing = await AppDataSource.query(`SELECT id FROM stations LIMIT 1`);
    if (!existing.length) { console.error('Could not create station'); process.exit(1); }
    console.log('Station already exists, using:', existing[0].id);
  }

  const sid = stationId || (await AppDataSource.query(`SELECT id FROM stations LIMIT 1`))[0].id;

  // Seed users
  const users = [
    { name: 'Owner',     email: 'owner@fuel.com',     password: 'owner123',   role: 'owner',      pin: null },
    { name: 'Manager',   email: 'manager@fuel.com',   password: 'manager123', role: 'manager',    pin: null },
    { name: 'Accountant',email: 'accountant@fuel.com',password: 'acc123',     role: 'accountant', pin: null },
    { name: 'Ahmed',     email: null,                  password: null,         role: 'employee',   pin: '1234' },
    { name: 'Mohammed',  email: null,                  password: null,         role: 'employee',   pin: '5678' },
  ];

  for (const u of users) {
    const hashedPw  = u.password ? await bcrypt.hash(u.password, 10) : null;
    const hashedPin = u.pin      ? await bcrypt.hash(u.pin, 10) : null;

    await AppDataSource.query(`
      INSERT INTO users (id, name, email, password, pin, role, "stationId", "isActive", "pinFailedAttempts", "pinLocked")
      VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, true, 0, false)
      ON CONFLICT (email) DO NOTHING
    `, [u.name, u.email, hashedPw, hashedPin, u.role, sid]);

    console.log(`✓ Seeded: ${u.name} (${u.role})`);
  }

  // Seed accounts — use WHERE NOT EXISTS to avoid duplicates on re-run
  for (const [name, type] of [['Cash Safe', 'safe'], ['Bank Account', 'bank'], ['Credit Account', 'credit']]) {
    await AppDataSource.query(`
      INSERT INTO accounts (id, "stationId", name, type, balance, currency, "isActive")
      SELECT gen_random_uuid(), $1, $2, $3, 0, 'SAR', true
      WHERE NOT EXISTS (
        SELECT 1 FROM accounts WHERE "stationId" = $1 AND type = $3
      )
    `, [sid, name, type]);
    console.log(`✓ Seeded account: ${name}`);
  }

  // Seed tanks
  const tanks = [
    { name: 'Tank A', fuelType: 'petrol_91', capacity: 10000, current: 5000 },
    { name: 'Tank B', fuelType: 'petrol_95', capacity: 8000,  current: 3500 },
    { name: 'Tank C', fuelType: 'diesel',    capacity: 15000, current: 7000 },
  ];
  for (const t of tanks) {
    await AppDataSource.query(`
      INSERT INTO tanks (id, "stationId", name, "fuelType", "capacityLiters", "currentLevelLiters", "lowLevelThreshold", "isActive")
      VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, 500, true)
      ON CONFLICT DO NOTHING
    `, [sid, t.name, t.fuelType, t.capacity, t.current]);
    console.log(`✓ Seeded: ${t.name} (${t.fuelType})`);
  }

  await AppDataSource.destroy();
  console.log('\n✅ Seed complete!');
  console.log('\n--- Login Credentials ---');
  console.log('Owner:      owner@fuel.com       / owner123');
  console.log('Manager:    manager@fuel.com     / manager123');
  console.log('Accountant: accountant@fuel.com  / acc123');
  console.log('Employee Ahmed PIN:    1234');
  console.log('Employee Mohammed PIN: 5678');
}

seed().catch((e) => { console.error(e); process.exit(1); });
