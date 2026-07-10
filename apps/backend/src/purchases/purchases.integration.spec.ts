import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { INestApplication } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { PurchasesModule } from './purchases.module';
import { TanksModule } from '../tanks/tanks.module';
import { Purchase } from './purchase.entity';
import { Tank } from '../tanks/tank.entity';
import { Account } from '../accounts/account.entity';
import { DataSource } from 'typeorm';

describe('Purchases Integration (create -> update -> delete)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let purchasesService: PurchasesService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Purchase, Tank, Account],
          synchronize: true,
        }),
        PurchasesModule,
        TanksModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    ds = moduleFixture.get(DataSource);
    purchasesService = moduleFixture.get(PurchasesService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates, updates, and deletes a purchase adjusting tank and account balances', async () => {
    // create tank
    const tankRepo = ds.getRepository(Tank);
    const acctRepo = ds.getRepository(Account);

    await tankRepo.save(tankRepo.create({ stationId: 's1', name: 'T1', fuelType: 'diesel', capacityLiters: 10000, currentLevelLiters: 1000 } as any));
    await acctRepo.save(acctRepo.create({ stationId: 's1', name: 'Safe', type: 'safe', balance: 10000 } as any));

    // locate saved tank and account
    const savedTank = await tankRepo.findOne({ where: { name: 'T1' } });
    const savedAcct = await acctRepo.findOne({ where: { name: 'Safe' } });
    if (!savedTank || !savedAcct) throw new Error('fixtures not created');

    // create purchase via service
    const created = await purchasesService.create('s1', 'test', { tankId: savedTank.id, supplierName: 'Sup', liters: 100, pricePerLiter: 2.5, deliveredAt: new Date().toISOString(), payments: [{ accountId: savedAcct.id, amount: 250 }] } as any);
    const purchaseId = created.id;
    const afterTank = await tankRepo.findOne({ where: { id: savedTank.id } });
    const afterAcct = await acctRepo.findOne({ where: { id: savedAcct.id } });
    expect(Number(afterTank!.currentLevelLiters)).toBe(1100);
    expect(Number(afterAcct!.balance)).toBe(9750);

    // update purchase: reduce liters to 50 and re-pay
    await purchasesService.update('s1', 'test', purchaseId, { liters: 50, pricePerLiter: 2.5, payments: [{ accountId: savedAcct.id, amount: 125 }] } as any);

    const updatedTank = await tankRepo.findOne({ where: { id: savedTank.id } });
    const updatedAcct = await acctRepo.findOne({ where: { id: savedAcct.id } });
    expect(Number(updatedTank!.currentLevelLiters)).toBe(1050);
    expect(Number(updatedAcct!.balance)).toBe(9875);

    // delete purchase
    await purchasesService.remove('s1', 'test', purchaseId);

    const finalTank = await tankRepo.findOne({ where: { id: savedTank.id } });
    const finalAcct = await acctRepo.findOne({ where: { id: savedAcct.id } });
    expect(Number(finalTank!.currentLevelLiters)).toBe(1000);
    expect(Number(finalAcct!.balance)).toBe(10000);
  }, 20000);
});
