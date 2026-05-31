import { ReportsService } from './reports.service';

type MockRepo = {
  find: jest.Mock<Promise<any[]>, [any?]>;
  count: jest.Mock<Promise<number>, [any?]>;
};

function createRepoMock(findResult: any[] = [], countResult = 0): MockRepo {
  return {
    find: jest.fn().mockResolvedValue(findResult),
    count: jest.fn().mockResolvedValue(countResult),
  };
}

describe('ReportsService.getDashboardKpis', () => {
  it('uses v1 formula by default (revenue - expenses)', async () => {
    const saleRepo = createRepoMock([{ totalAmount: 100, liters: 20 }]);
    const posSaleRepo = createRepoMock([{ totalAmount: 50, totalItems: 3 }]);
    const purchaseRepo = createRepoMock([{ totalCost: 70 }]);
    const expenseRepo = createRepoMock([{ amount: 20 }]);
    const shiftRepo = createRepoMock([], 2);
    const accountRepo = createRepoMock([
      { type: 'safe', balance: '1000' },
      { type: 'bank', balance: '2000' },
    ]);

    const service = new ReportsService(
      saleRepo as any,
      posSaleRepo as any,
      purchaseRepo as any,
      expenseRepo as any,
      shiftRepo as any,
      accountRepo as any,
    );

    const result = await service.getDashboardKpis('station-1');

    expect(result.totalSalesToday).toBe(150);
    expect(result.totalExpensesToday).toBe(20);
    expect(result.totalPurchasesToday).toBe(70);
    expect(result.netProfitToday).toBe(130);
    expect(result.openShiftsCount).toBe(2);
    expect(result.safeBalance).toBe(1000);
    expect(result.bankBalance).toBe(2000);
  });

  it('uses v2 formula when requested (revenue - expenses - purchases)', async () => {
    const saleRepo = createRepoMock([{ totalAmount: 100, liters: 20 }]);
    const posSaleRepo = createRepoMock([{ totalAmount: 50, totalItems: 3 }]);
    const purchaseRepo = createRepoMock([{ totalCost: 70 }]);
    const expenseRepo = createRepoMock([{ amount: 20 }]);
    const shiftRepo = createRepoMock([], 1);
    const accountRepo = createRepoMock([]);

    const service = new ReportsService(
      saleRepo as any,
      posSaleRepo as any,
      purchaseRepo as any,
      expenseRepo as any,
      shiftRepo as any,
      accountRepo as any,
    );

    const result = await service.getDashboardKpis('station-1', 'v2');

    expect(result.totalSalesToday).toBe(150);
    expect(result.totalExpensesToday).toBe(20);
    expect(result.totalPurchasesToday).toBe(70);
    expect(result.netProfitToday).toBe(60);
    expect(result.openShiftsCount).toBe(1);
    expect(result.safeBalance).toBe(0);
    expect(result.bankBalance).toBe(0);
  });
});
