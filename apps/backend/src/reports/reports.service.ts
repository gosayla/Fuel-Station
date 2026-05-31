import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Sale } from '../sales/sale.entity';
import { Purchase } from '../purchases/purchase.entity';
import { Expense } from '../expenses/expense.entity';
import { Shift } from '../shifts/shift.entity';
import { Account } from '../accounts/account.entity';
import { PosSale } from '../pos/pos.entity';

type DashboardKpiVersion = 'v1' | 'v2';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Sale) private saleRepo: Repository<Sale>,
    @InjectRepository(PosSale) private posSaleRepo: Repository<PosSale>,
    @InjectRepository(Purchase) private purchaseRepo: Repository<Purchase>,
    @InjectRepository(Expense) private expenseRepo: Repository<Expense>,
    @InjectRepository(Shift) private shiftRepo: Repository<Shift>,
    @InjectRepository(Account) private accountRepo: Repository<Account>,
  ) {}

  async getDashboardKpis(stationId: string, version: DashboardKpiVersion = 'v1') {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const [fuelSales, posSales, purchases, expenses, openShifts, accounts] = await Promise.all([
      this.saleRepo.find({ where: { stationId, createdAt: Between(today, todayEnd) } }),
      this.posSaleRepo.find({ where: { stationId, createdAt: Between(today, todayEnd) } }),
      this.purchaseRepo.find({ where: { stationId, deliveredAt: Between(today, todayEnd) } }),
      this.expenseRepo.find({ where: { stationId, paidAt: Between(today, todayEnd) } }),
      this.shiftRepo.count({ where: { stationId, status: 'open' as any } }),
      this.accountRepo.find({ where: { stationId, isActive: true } }),
    ]);

    const totalFuelRevenue = fuelSales.reduce((s, x) => s + Number(x.totalAmount), 0);
    const totalPosRevenue = posSales.reduce((s, x) => s + Number(x.totalAmount), 0);
    const totalRevenue = totalFuelRevenue + totalPosRevenue;
    const totalLiters = fuelSales.reduce((s, x) => s + Number(x.liters), 0);
    const totalPosItems = posSales.reduce((s, x) => s + Number(x.totalItems), 0);
    const totalPurchases = purchases.reduce((s, x) => s + Number(x.totalCost), 0);
    const totalExpenses = expenses.reduce((s, x) => s + Number(x.amount), 0);
    const netProfitToday =
      version === 'v2'
        ? totalRevenue - totalExpenses - totalPurchases
        : totalRevenue - totalExpenses;
    const safe = accounts.find(a => a.type === 'safe');
    const bank = accounts.find(a => a.type === 'bank');

    return {
      totalSalesToday: totalRevenue,
      totalFuelSalesToday: totalFuelRevenue,
      totalPosSalesToday: totalPosRevenue,
      totalLitersSoldToday: totalLiters,
      totalPosItemsSoldToday: totalPosItems,
      totalPurchasesToday: totalPurchases,
      totalExpensesToday: totalExpenses,
      netProfitToday,
      safeBalance: safe ? Number(safe.balance) : 0,
      bankBalance: bank ? Number(bank.balance) : 0,
      openShiftsCount: openShifts,
    };
  }

  async getSalesReport(stationId: string, from: Date, to: Date) {
    const [fuelSales, posSales] = await Promise.all([
      this.saleRepo.find({ where: { stationId, createdAt: Between(from, to) } }),
      this.posSaleRepo.find({ where: { stationId, createdAt: Between(from, to) } }),
    ]);
    const byDay: Record<string, { liters: number; fuelRevenue: number; posRevenue: number; revenue: number; posItems: number }> = {};
    for (const sale of fuelSales) {
      const day = sale.createdAt.toISOString().split('T')[0];
      if (!byDay[day]) byDay[day] = { liters: 0, fuelRevenue: 0, posRevenue: 0, revenue: 0, posItems: 0 };
      byDay[day].liters += Number(sale.liters);
      byDay[day].fuelRevenue += Number(sale.totalAmount);
      byDay[day].revenue += Number(sale.totalAmount);
    }
    for (const sale of posSales) {
      const day = sale.createdAt.toISOString().split('T')[0];
      if (!byDay[day]) byDay[day] = { liters: 0, fuelRevenue: 0, posRevenue: 0, revenue: 0, posItems: 0 };
      byDay[day].posRevenue += Number(sale.totalAmount);
      byDay[day].posItems += Number(sale.totalItems);
      byDay[day].revenue += Number(sale.totalAmount);
    }
    const totalFuelRevenue = fuelSales.reduce((s, x) => s + Number(x.totalAmount), 0);
    const totalPosRevenue = posSales.reduce((s, x) => s + Number(x.totalAmount), 0);
    const totalRevenue = totalFuelRevenue + totalPosRevenue;
    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      totalFuelRevenue,
      totalPosRevenue,
      totalRevenue,
      totalLiters: fuelSales.reduce((s, x) => s + Number(x.liters), 0),
      totalPosItems: posSales.reduce((s, x) => s + Number(x.totalItems), 0),
      salesCount: fuelSales.length + posSales.length,
      byDay: Object.entries(byDay).map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  async getProfitLoss(stationId: string, from?: Date, to?: Date) {
    const hasRange = from && to;

    const saleDateFilter: any = { stationId };
    const purDateFilter: any = { stationId };
    const expDateFilter: any = { stationId };

    if (hasRange) {
      saleDateFilter.createdAt = Between(from, to);
      purDateFilter.deliveredAt = Between(from, to);
      expDateFilter.paidAt = Between(from, to);
    }

    const [fuelSales, posSales, purchases, expenses] = await Promise.all([
      this.saleRepo.find({ where: saleDateFilter }),
      this.posSaleRepo.find({ where: saleDateFilter }),
      this.purchaseRepo.find({ where: purDateFilter }),
      this.expenseRepo.find({ where: expDateFilter }),
    ]);

    const totalFuelRevenue = fuelSales.reduce((s, x) => s + Number(x.totalAmount), 0);
    const totalPosRevenue = posSales.reduce((s, x) => s + Number(x.totalAmount), 0);
    const totalRevenue = totalFuelRevenue + totalPosRevenue;
    const totalFuelPurchases = purchases.reduce((s, x) => s + Number(x.totalCost), 0);
    const totalOperationalExpenses = expenses.reduce((s, x) => s + Number(x.amount), 0);
    const totalCosts = totalFuelPurchases + totalOperationalExpenses;

    const expensesByCategory: Record<string, number> = {};
    for (const exp of expenses) {
      expensesByCategory[exp.category] = (expensesByCategory[exp.category] ?? 0) + Number(exp.amount);
    }

    return {
      period: hasRange ? { from: from!.toISOString(), to: to!.toISOString() } : null,
      totalFuelRevenue,
      totalPosRevenue,
      totalRevenue,
      totalFuelPurchases,
      totalOperationalExpenses,
      totalCosts,
      grossProfit: totalRevenue - totalFuelPurchases,
      netProfit: totalRevenue - totalCosts,
      expensesByCategory,
    };
  }
}
