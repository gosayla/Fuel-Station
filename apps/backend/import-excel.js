/**
 * Excel → PostgreSQL Import Script
 * Clears all data except the manager user, then imports real data from excel-sheet.xlsx
 *
 * Run: node import-excel.js
 */

const { Client } = require('pg');
const xlsx = require('C:/Users/USER/AppData/Roaming/npm/node_modules/xlsx');
const { v4: uuidv4 } = require('crypto').webcrypto
  ? { v4: () => require('crypto').randomUUID() }
  : { v4: require('crypto').randomUUID ? () => require('crypto').randomUUID() : null };

// polyfill uuid using crypto
function uuid() { return require('crypto').randomUUID(); }

// ── Excel date serial → JS Date ──────────────────────────────────────────────
function excelDateToJS(serial) {
  if (!serial || typeof serial !== 'number') return null;
  // Excel epoch: Jan 0, 1900 (but Excel wrongly treats 1900 as leap year, so offset by 2)
  const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
  return date;
}

// ── DB Connection ─────────────────────────────────────────────────────────────
const db = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'admin',
  database: 'fuel_station',
});

async function main() {
  await db.connect();
  console.log('✓ Connected to PostgreSQL');

  try {
    // ── 1. Find the manager user (preserve it) ──────────────────────────────
    const managerRes = await db.query(
      `SELECT id, name, email FROM users WHERE role IN ('manager','owner') ORDER BY "createdAt" ASC LIMIT 1`
    );
    if (managerRes.rows.length === 0) {
      throw new Error('No manager/owner user found! Aborting.');
    }
    const manager = managerRes.rows[0];
    console.log(`✓ Manager preserved: ${manager.name} (${manager.email})`);

    // ── 2. Clear all data except the manager user ────────────────────────────
    console.log('\nClearing existing data...');
    await db.query('DELETE FROM account_transactions');
    await db.query('DELETE FROM cash_collections').catch(() => {}); // table may not exist
    await db.query('DELETE FROM transfers');
    await db.query('DELETE FROM expenses');
    await db.query('DELETE FROM sales');
    await db.query('DELETE FROM shifts');
    await db.query('DELETE FROM purchases');
    await db.query('DELETE FROM accounts');
    await db.query('DELETE FROM tanks');
    await db.query('DELETE FROM stations');
    await db.query(`DELETE FROM users WHERE id != $1`, [manager.id]);
    console.log('✓ Data cleared');

    // ── 3. Create Station ────────────────────────────────────────────────────
    const stationId = uuid();
    await db.query(
      `INSERT INTO stations (id, name, address, "isActive", "createdAt")
       VALUES ($1, $2, $3, true, NOW())`,
      [stationId, 'محطة الوقود', '']
    );
    console.log('✓ Station created');

    // Update manager's stationId
    await db.query(`UPDATE users SET "stationId" = $1 WHERE id = $2`, [stationId, manager.id]);

    // ── 4. Create Tank (petrol_91, 40000 L capacity) ──────────────────────────
    const tankId = uuid();
    await db.query(
      `INSERT INTO tanks (id, "stationId", name, "fuelType", "capacityLiters", "currentLevelLiters", "lowLevelThreshold", "currentPrice", "isActive", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())`,
      [tankId, stationId, 'خزان البنزين 91', 'petrol_91', 40000, 0, 2000, 2.2]
    );
    console.log('✓ Tank created (petrol_91, 40000L capacity)');

    // ── 5. Create Employee user (Salah) ──────────────────────────────────────
    const employeeId = uuid();
    const bcrypt = require('bcrypt');
    const defaultPin = await bcrypt.hash('1234', 10);
    await db.query(
      `INSERT INTO users (id, name, email, password, pin, role, "stationId", "isActive", "pinFailedAttempts", "pinLocked", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, 'employee', $6, true, 0, false, NOW(), NOW())`,
      [employeeId, 'Salah', 'salah@station.local', null, defaultPin, stationId]
    );
    console.log('✓ Employee Salah created (PIN: 1234)');

    // ── 6. Create Accounts (Safe + Bank) ─────────────────────────────────────
    const safeAccountId = uuid();
    const bankAccountId = uuid();
    await db.query(
      `INSERT INTO accounts (id, "stationId", name, type, currency, "isActive", "createdAt")
       VALUES ($1, $2, $3, 'safe', 'SAR', true, NOW())`,
      [safeAccountId, stationId, 'الخزنة']
    );
    await db.query(
      `INSERT INTO accounts (id, "stationId", name, type, currency, "isActive", "createdAt")
       VALUES ($1, $2, $3, 'bank', 'SAR', true, NOW())`,
      [bankAccountId, stationId, 'البنك']
    );
    console.log('✓ Accounts created (safe + bank)');

    // ── 7. Read Excel ─────────────────────────────────────────────────────────
    const wb = xlsx.readFile('C:/Users/USER/Fuel-Station/excel-sheet.xlsx', { cellStyles: true });
    const ws = wb.Sheets['ورقة1'];
    const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });

    // Account balances (tracked throughout import)
    let safeBalance = 0;
    let bankBalance = 0;

    // ── Pre-collect purchase rows (empty orange-colored rows) ─────────────────
    // Orange = ED7D31 or C55A11. These are truly empty rows = fuel delivery.
    const PURCHASE_LITERS   = 33000;
    const PURCHASE_COST     = 69630;
    const PURCHASE_PPL      = Math.round((PURCHASE_COST / PURCHASE_LITERS) * 10000) / 10000;
    const purchaseRowNums   = new Set(); // 1-based row numbers
    {
      const range = xlsx.utils.decode_range(ws['!ref']);
      let prevDateSerial = null;
      const purchaseRows = []; // { rowNum, dateSerial }
      for (let r = range.s.r; r <= range.e.r; r++) {
        const dateCell = ws[xlsx.utils.encode_cell({ r, c: 0 })];
        if (dateCell && typeof dateCell.v === 'number' && dateCell.v > 40000) prevDateSerial = dateCell.v;

        // Only consider rows with no liters
        const litersCell = ws[xlsx.utils.encode_cell({ r, c: 1 })];
        if (litersCell && litersCell.v) continue;

        // Check for orange fill
        let isOrange = false;
        for (let c = 0; c <= 8; c++) {
          const cell = ws[xlsx.utils.encode_cell({ r, c })];
          if (cell && cell.s && cell.s.fgColor) {
            const rgb = cell.s.fgColor.rgb;
            if (rgb === 'ED7D31' || rgb === 'C55A11') { isOrange = true; break; }
          }
        }
        if (!isOrange) continue;

        // Check it's truly empty (no expense data = not a bank transfer row)
        const expCell = ws[xlsx.utils.encode_cell({ r, c: 6 })];
        const hasExpense = expCell && expCell.v && parseFloat(expCell.v) > 0;
        if (hasExpense) continue;

        purchaseRowNums.add(r + 1); // store 1-based row num
        purchaseRows.push({ rowNum: r + 1, dateSerial: prevDateSerial });
      }

      // Insert purchases now (before main loop)
      let totalPurchases = 0;
      for (const pr of purchaseRows) {
        const purchaseDate = pr.dateSerial
          ? new Date(Math.round((pr.dateSerial - 25569) * 86400 * 1000))
          : new Date();
        const purchaseId = uuid();
        await db.query(
          `INSERT INTO purchases (id, "stationId", "tankId", "supplierName", "invoiceNumber", liters, "pricePerLiter", "totalCost", "deliveredAt", "createdBy", "createdAt")
           VALUES ($1,$2,$3,$4,NULL,$5,$6,$7,$8::timestamptz,$9,$8::timestamptz)`,
          [purchaseId, stationId, tankId, 'مورد الوقود', PURCHASE_LITERS, PURCHASE_PPL, PURCHASE_COST, purchaseDate, manager.id]
        );
        // Deduct purchase cost from bank account
        bankBalance -= PURCHASE_COST;
        await db.query(`UPDATE accounts SET balance = $1 WHERE id = $2`, [bankBalance, bankAccountId]);
        totalPurchases++;
      }
      console.log(`✓ Created ${totalPurchases} fuel purchases (${PURCHASE_LITERS.toLocaleString()} L × ${PURCHASE_PPL} SAR/L each)`);
      console.log(`  Bank deducted: SAR ${(totalPurchases * PURCHASE_COST).toLocaleString()} (${totalPurchases} × ${PURCHASE_COST.toLocaleString()})`);
    }

    // Skip header row (index 0)
    const dataRows = rows.slice(1);

    // ── 8. Group rows by date, build shifts + sales ───────────────────────────
    let currentDate = null;
    let currentShiftId = null;
    let shiftTotals = {}; // shiftId → { liters, revenue, cash, card }

    let totalSales = 0;
    let totalExpenses = 0;
    let totalTransfers = 0;
    let totalLitersTracked = 0;

    // Pre-pass: collect all valid dates to build shifts
    const allDates = new Set();
    for (const row of dataRows) {
      const dateVal = row[0];
      if (dateVal && typeof dateVal === 'number' && dateVal > 40000) {
        const d = excelDateToJS(dateVal);
        if (d) allDates.add(d.toISOString().split('T')[0]);
      }
    }

    // Maps: date string → shiftId
    const dateShiftMap = {};
    for (const dateStr of allDates) {
      const shiftId = uuid();
      dateShiftMap[dateStr] = shiftId;
      shiftTotals[shiftId] = { liters: 0, revenue: 0, cash: 0, card: 0 };
      // Insert shift (will update totals at end)
      const d = new Date(dateStr);
      const closedAt = new Date(d.getTime() + 23 * 3600 * 1000); // close at 11pm same day
      await db.query(
        `INSERT INTO shifts (id, "stationId", "employeeId", "startedAt", "closedAt",
          "openingCash", "expectedCash", "actualCash", discrepancy,
          "totalLitersSold", "totalRevenue", "cashRevenue", "cardRevenue", "creditRevenue",
          status, "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4::timestamptz,$5::timestamptz, 0,0,0,0, 0,0,0,0,0, 'reconciled', $4::timestamptz, $4::timestamptz)`,
        [shiftId, stationId, employeeId, d, closedAt]
      );
    }
    console.log(`✓ Created ${allDates.size} shifts (one per date)`);

    // ── 9. Process rows ───────────────────────────────────────────────────────
    let currentDateStr = null;

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];

      // Determine current date (carry forward if row has null date)
      const dateVal = row[0];
      if (dateVal && typeof dateVal === 'number' && dateVal > 40000) {
        const d = excelDateToJS(dateVal);
        if (d) currentDateStr = d.toISOString().split('T')[0];
      } else if (typeof dateVal === 'string' && dateVal.trim()) {
        // Non-standard date string (e.g. "17/092025") - skip date update
      }

      if (!currentDateStr) continue;

      const shiftId = dateShiftMap[currentDateStr];
      if (!shiftId) continue;

      const liters    = parseFloat(row[1]) || 0;
      const price     = parseFloat(row[2]) || 2.2;
      const total     = parseFloat(row[3]) || 0;
      const cardAmt   = parseFloat(row[4]) || 0;
      const cashAmt   = parseFloat(row[5]) || 0;
      const expenses  = parseFloat(row[6]) || 0;
      const notes     = typeof row[8] === 'string' ? row[8].trim() : '';
      const rowDate   = new Date(currentDateStr);

      // ── Skip summary/total rows ────────────────────────────────────────────
      if (notes && (notes.includes('إجمالي') || notes.includes('مجموع') || notes.includes('الجملة'))) continue;
      // Also skip rows with impossibly large liters (totals sneaking in without a label)
      if (liters > 15000) continue;

      // ── Bank transfer rows (0 liters, large expense) ──────────────────────
      if (liters === 0 && expenses > 0 && total === 0) {
        // Transfer from safe to bank
        const transferId = uuid();
        await db.query(
          `INSERT INTO transfers (id, "stationId", "fromAccountId", "toAccountId", amount, notes, "createdBy", "createdAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [transferId, stationId, safeAccountId, bankAccountId, expenses,
           notes || 'تحويل من الخزنة إلى البنك', manager.id, rowDate]
        );
        // Update balances
        safeBalance -= expenses;
        bankBalance += expenses;
        await db.query(`UPDATE accounts SET balance = $1 WHERE id = $2`, [safeBalance, safeAccountId]);
        await db.query(`UPDATE accounts SET balance = $1 WHERE id = $2`, [bankBalance, bankAccountId]);
        totalTransfers++;
        continue;
      }

      // ── Expense rows (0 liters, expense deducted from cash, has text note) ──
      if (liters === 0 && expenses > 0 && notes && total === 0) {
        const expId = uuid();
        await db.query(
          `INSERT INTO expenses (id, "stationId", "accountId", category, description, amount, "paidAt", "createdBy", "createdAt")
           VALUES ($1,$2,$3,'other',$4,$5,$6,$7,$8)`,
          [expId, stationId, safeAccountId, notes, expenses, rowDate, manager.id, rowDate]
        );
        safeBalance -= expenses;
        await db.query(`UPDATE accounts SET balance = $1 WHERE id = $2`, [safeBalance, safeAccountId]);
        totalExpenses++;
        continue;
      }

      // ── Sale rows (liters > 0) ────────────────────────────────────────────
      if (liters <= 0) continue;

      // Expense on a sale row (separate expense record for the deduction)
      if (expenses > 0) {
        const expId = uuid();
        const expNote = notes || 'مصروفات';
        await db.query(
          `INSERT INTO expenses (id, "stationId", "accountId", category, description, amount, "paidAt", "createdBy", "createdAt")
           VALUES ($1,$2,$3,'other',$4,$5,$6,$7,$8)`,
          [expId, stationId, safeAccountId, expNote, expenses, rowDate, manager.id, rowDate]
        );
        safeBalance -= expenses;
        await db.query(`UPDATE accounts SET balance = $1 WHERE id = $2`, [safeBalance, safeAccountId]);
        totalExpenses++;
      }

      // Determine payment method(s)
      const hasCash = cashAmt > 0;
      const hasCard = cardAmt > 0;

      if (hasCash && hasCard) {
        // Split into two sales proportionally
        const cardLiters = Math.round((liters * cardAmt / (cardAmt + cashAmt)) * 100) / 100;
        const cashLiters = Math.round((liters - cardLiters) * 100) / 100;

        // Card sale
        const saleId1 = uuid();
        await db.query(
          `INSERT INTO sales (id, "stationId", "shiftId", "tankId", "employeeId", liters, "pricePerLiter", "totalAmount", "paymentMethod", "createdAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'card',$9)`,
          [saleId1, stationId, shiftId, tankId, employeeId, cardLiters, price, cardAmt, rowDate]
        );
        shiftTotals[shiftId].liters  += cardLiters;
        shiftTotals[shiftId].revenue += cardAmt;
        shiftTotals[shiftId].card   += cardAmt;

        // Cash sale
        const saleId2 = uuid();
        await db.query(
          `INSERT INTO sales (id, "stationId", "shiftId", "tankId", "employeeId", liters, "pricePerLiter", "totalAmount", "paymentMethod", "createdAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'cash',$9)`,
          [saleId2, stationId, shiftId, tankId, employeeId, cashLiters, price, cashAmt, rowDate]
        );
        shiftTotals[shiftId].liters  += cashLiters;
        shiftTotals[shiftId].revenue += cashAmt;
        shiftTotals[shiftId].cash   += cashAmt;

        safeBalance  += cashAmt;
        bankBalance  += cardAmt;
        totalLitersTracked += liters;
        totalSales += 2;
      } else {
        const payMethod = hasCard ? 'card' : 'cash';
        const amount = hasCard ? cardAmt : cashAmt;
        const saleId = uuid();
        await db.query(
          `INSERT INTO sales (id, "stationId", "shiftId", "tankId", "employeeId", liters, "pricePerLiter", "totalAmount", "paymentMethod", "createdAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [saleId, stationId, shiftId, tankId, employeeId, liters, price, amount || total, payMethod, rowDate]
        );
        shiftTotals[shiftId].liters  += liters;
        shiftTotals[shiftId].revenue += (amount || total);
        if (payMethod === 'cash') {
          shiftTotals[shiftId].cash += (amount || total);
          safeBalance += (amount || total);
        } else {
          shiftTotals[shiftId].card += (amount || total);
          bankBalance += (amount || total);
        }
        totalLitersTracked += liters;
        totalSales++;
      }
    }

    // ── 10. Update shift totals ───────────────────────────────────────────────
    console.log('Updating shift totals...');
    for (const [shiftId, t] of Object.entries(shiftTotals)) {
      await db.query(
        `UPDATE shifts SET
          "totalLitersSold" = $1::numeric,
          "totalRevenue" = $2::numeric,
          "cashRevenue" = $3::numeric,
          "cardRevenue" = $4::numeric,
          "expectedCash" = $3::numeric,
          "actualCash" = $3::numeric,
          "discrepancy" = 0::numeric
         WHERE id = $5`,
        [t.liters, t.revenue, t.cash, t.card, shiftId]
      );
    }

    // ── 11. Update tank current level ─────────────────────────────────────────
    // Net level = total purchased - total sold (capped at capacity, min 0)
    const totalPurchasedLiters = 10 * PURCHASE_LITERS; // 10 deliveries × 33,000 L
    const netTankLevel = Math.max(0, Math.min(40000, totalPurchasedLiters - totalLitersTracked));
    await db.query(
      `UPDATE tanks SET "currentLevelLiters" = $1::numeric WHERE id = $2`,
      [netTankLevel, tankId]
    );

    // ── 12. Final account balances ────────────────────────────────────────────
    await db.query(`UPDATE accounts SET balance = $1 WHERE id = $2`, [Math.max(0, safeBalance), safeAccountId]);
    await db.query(`UPDATE accounts SET balance = $1 WHERE id = $2`, [Math.max(0, bankBalance), bankAccountId]);

    console.log('\n════════════════════════════════════════');
    console.log('✓ Import complete!');
    console.log(`  Shifts:    ${allDates.size}`);
    console.log(`  Sales:     ${totalSales}`);
    console.log(`  Expenses:  ${totalExpenses}`);
    console.log(`  Transfers: ${totalTransfers}`);
    console.log(`  Liters sold: ${totalLitersTracked.toFixed(1)} L`);
    console.log(`  Safe balance: SAR ${safeBalance.toFixed(2)}`);
    console.log(`  Bank balance: SAR ${bankBalance.toFixed(2)}`);
    console.log('════════════════════════════════════════');

  } catch (err) {
    console.error('✗ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await db.end();
  }
}

main();
