const { Client } = require('pg');
const bcrypt = require('bcrypt');

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin',
  database: process.env.DB_NAME || 'fuel_station',
});

async function seed() {
  await client.connect();
  console.log('Connected to database');

  // Station
  let sid;
  const existing = await client.query('SELECT id FROM stations LIMIT 1');
  if (existing.rows.length) {
    sid = existing.rows[0].id;
    console.log('Using existing station:', sid);
  } else {
    const r = await client.query(
      `INSERT INTO stations (id, name, address, phone, "isActive")
       VALUES (uuid_generate_v4(), 'Main Station', '123 Main Street', '+1234567890', true)
       RETURNING id`
    );
    sid = r.rows[0].id;
    console.log('Created station:', sid);
  }

  // Users
  const users = [
    { name: 'Owner',      email: 'owner@fuel.com',      password: 'owner123',   role: 'owner',      pin: null },
    { name: 'Manager',    email: 'manager@fuel.com',    password: 'manager123', role: 'manager',    pin: null },
    { name: 'Accountant', email: 'accountant@fuel.com', password: 'acc123',     role: 'accountant', pin: null },
    { name: 'Ahmed',      email: null,                  password: null,         role: 'employee',   pin: '1234' },
    { name: 'Mohammed',   email: null,                  password: null,         role: 'employee',   pin: '5678' },
  ];

  for (const u of users) {
    const hashedPw  = u.password ? await bcrypt.hash(u.password, 10) : null;
    const hashedPin = u.pin      ? await bcrypt.hash(u.pin, 10)      : null;
    await client.query(
      `INSERT INTO users (id, name, email, password, pin, role, "stationId", "isActive", "pinFailedAttempts", "pinLocked")
       VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, true, 0, false)
       ON CONFLICT (email) DO NOTHING`,
      [u.name, u.email, hashedPw, hashedPin, u.role, sid]
    );
    console.log(`✓ ${u.name} (${u.role})`);
  }

  // Accounts
  await client.query(
    `INSERT INTO accounts (id, "stationId", name, type, balance, currency, "isActive")
     VALUES
       (uuid_generate_v4(), $1, 'Cash Safe',    'safe', 0, 'USD', true),
       (uuid_generate_v4(), $1, 'Bank Account', 'bank', 0, 'USD', true)`,
    [sid]
  );
  console.log('✓ Cash Safe + Bank accounts');

  // Tanks
  const tanks = [
    { name: 'Tank A', fuelType: 'petrol_91', capacity: 10000, current: 5000 },
    { name: 'Tank B', fuelType: 'petrol_95', capacity: 8000,  current: 3500 },
    { name: 'Tank C', fuelType: 'diesel',    capacity: 15000, current: 7000 },
  ];
  for (const t of tanks) {
    await client.query(
      `INSERT INTO tanks (id, "stationId", name, "fuelType", "capacityLiters", "currentLevelLiters", "lowLevelThreshold", "isActive")
       VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, 500, true)`,
      [sid, t.name, t.fuelType, t.capacity, t.current]
    );
    console.log(`✓ ${t.name} (${t.fuelType})`);
  }

  await client.end();

  console.log('\n✅ Seed complete!\n');
  console.log('--- Login Credentials ---');
  console.log('Owner:      owner@fuel.com      / owner123');
  console.log('Manager:    manager@fuel.com    / manager123');
  console.log('Accountant: accountant@fuel.com / acc123');
  console.log('Employee Ahmed PIN:    1234');
  console.log('Employee Mohammed PIN: 5678');
}

seed().catch((e) => { console.error(e.message); process.exit(1); });
