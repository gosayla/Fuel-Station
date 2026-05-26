# Production Deployment Guide

## Files to transfer to server

| File | Purpose |
|------|---------|
| `production-seed.sql` | All historical data (shifts, sales, expenses, transfers, accounts, users) |
| Full project source | The NestJS backend, web app, etc. |

---

## Step-by-step: Deploy on server

### 1. Set up PostgreSQL

Create the database:
```sql
CREATE DATABASE fuel_station;
```

### 2. Configure environment variables

Create `apps/backend/.env` on the server:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=YOUR_STRONG_PASSWORD
DB_NAME=fuel_station

JWT_SECRET=CHANGE_TO_LONG_RANDOM_SECRET
JWT_EXPIRES_IN=8h
JWT_REFRESH_SECRET=CHANGE_TO_LONG_RANDOM_REFRESH_SECRET
JWT_REFRESH_EXPIRES_IN=7d

PORT=3000
NODE_ENV=production
```

### 3. Run the backend once (to create schema)

```bash
cd /path/to/project
pnpm install
pnpm dev:backend
# Wait until you see "Application is running on port 3000"
# Then stop it with Ctrl+C
```

TypeORM will auto-create all tables and enums via `synchronize: true`.

### 4. Restore the data

```bash
PGPASSWORD=YOUR_STRONG_PASSWORD psql \
  -U postgres \
  -h localhost \
  -d fuel_station \
  -f production-seed.sql
```

### 5. Start the backend in production mode

```bash
pnpm build:backend
pnpm start:backend
# or use PM2:
pm2 start dist/main.js --name fuel-station-api
```

---

## What's in production-seed.sql

| Table | Records |
|-------|---------|
| users | Manager (owner@fuel.com) + Employee Salah |
| stations | 1 station (محطة الوقود) |
| tanks | 1 tank — petrol_91, 40,000 L capacity |
| accounts | Safe (الخزنة) + Bank (البنك) |
| shifts | 350 shifts (one per day of historical data) |
| sales | 685 sale records |
| expenses | 32 expense records |
| transfers | 41 cash→bank transfer records |

**Total fuel sold:** ~830,248 L  
**Safe balance:** SAR 85,519  
**Bank balance:** SAR 1,068,355

---

## Default credentials

| User | Email | Role | Password/PIN |
|------|-------|------|--------------|
| Owner | owner@fuel.com | manager/owner | (existing password unchanged) |
| Salah | salah@station.local | employee | PIN: **1234** |

> Change Salah's PIN after first login.
