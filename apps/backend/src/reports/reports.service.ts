import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Sale } from '../sales/sale.entity';
import { Purchase } from '../purchases/purchase.entity';
import { Expense } from '../expenses/expense.entity';
import { Shift } from '../shifts/shift.entity';
import { Account } from '../accounts/account.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Sale) private saleRepo: Repository<Sale>,
    @InjectRepository(Purchase) private purchaseRepo: Repository<Purchase>,
    @InjectRepository(Expense) private expenseRepo: Repository<Expense>,
    @InjectRepository(Shift) private shiftRepo: Repository<Shift>,
    @InjectRepository(Account) private accountRepo: Repository<Account>,
  ) {}

  async getDashboardKpis(stationId: string) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const [sales, purchases, expenses, openShifts, accounts] = await Promise.all([
      this.saleRepo.find({ where: { stationId, createdAt: Between(today, todayEnd) } }),
      this.purchaseRepo.find({ where: { stationId, deliveredAt: Between(today, todayEnd) } }),
      this.expenseRepo.find({ where: { stationId, paidAt: Between(today, todayEnd) } }),
      this.shiftRepo.count({ where: { stationId, status: 'open' as any } }),
      this.accountRepo.find({ where: { stationId, isActive: true } }),
    ]);

    const totalRevenue = sales.reduce((s, x) => s + Number(x.totalAmount), 0);
    const totalLiters = sales.reduce((s, x) => s + Number(x.liters), 0);
    const totalPurchases = purchases.reduce((s, x) => s + Number(x.totalCost), 0);
    const totalExpenses = expenses.reduce((s, x) => s + Number(x.amount), 0);
    const safe = accounts.find(a => a.type === 'safe');
    const bank = accounts.find(a => a.type === 'bank');

    return {
      totalSalesToday: totalRevenue,
      totalLitersSoldToday: totalLiters,
      totalPurchasesToday: totalPurchases,
      totalExpensesToday: totalExpenses,
      netProfitToday: totalRevenue - totalExpenses,
      safeBalance: safe ? Number(safe.balance) : 0,
      bankBalance: bank ? Number(bank.balance) : 0,
      openShiftsCount: openShifts,
    };
  }

  async getSalesReport(stationId: string, from: Date, to: Date) {
    const sales = await this.saleRepo.find({ where: { stationId, createdAt: Between(from, to) } });
    const byDay: Record<string, { liters: number; revenue: number }> = {};
    for (const sale of sales) {
      const day = sale.createdAt.toISOString().split('T')[0];
      if (!byDay[day]) byDay[day] = { liters: 0, revenue: 0 };
      byDay[day].liters += Number(sale.liters);
      byDay[day].revenue += Number(sale.totalAmount);
    }
    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      totalRevenue: sales.reduce((s, x) => s + Number(x.totalAmount), 0),
      totalLiters: sales.reduce((s, x) => s + Number(x.liters), 0),
      salesCount: sales.length,
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

    const [sales, purchases, expenses] = await Promise.all([
      this.saleRepo.find({ where: saleDateFilter }),
      this.purchaseRepo.find({ where: purDateFilter }),
      this.expenseRepo.find({ where: expDateFilter }),
    ]);

    const totalRevenue = sales.reduce((s, x) => s + Number(x.totalAmount), 0);
    const totalFuelPurchases = purchases.reduce((s, x) => s + Number(x.totalCost), 0);
    const totalOperationalExpenses = expenses.reduce((s, x) => s + Number(x.amount), 0);
    const totalCosts = totalFuelPurchases + totalOperationalExpenses;

    const expensesByCategory: Record<string, number> = {};
    for (const exp of expenses) {
      expensesByCategory[exp.category] = (expensesByCategory[exp.category] ?? 0) + Number(exp.amount);
    }

    return {
      period: hasRange ? { from: from!.toISOString(), to: to!.toISOString() } : null,
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
