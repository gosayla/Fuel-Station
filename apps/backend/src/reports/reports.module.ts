import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sale } from '../sales/sale.entity';
import { Purchase } from '../purchases/purchase.entity';
import { Expense } from '../expenses/expense.entity';
import { Shift } from '../shifts/shift.entity';
import { Account } from '../accounts/account.entity';
import { PosSale, PosSaleLine } from '../pos/pos.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Sale, Purchase, Expense, Shift, Account, PosSale, PosSaleLine])],
  providers: [ReportsService],
  controllers: [ReportsController],
})
export class ReportsModule {}
