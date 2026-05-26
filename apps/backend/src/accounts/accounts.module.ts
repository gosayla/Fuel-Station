import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account, AccountTransaction, Transfer, CashCollection, CreditLedgerEntry } from './account.entity';
import { AccountsService } from './accounts.service';
import { AccountsController } from './accounts.controller';
import { ShiftsModule } from '../shifts/shifts.module';
import { SalesModule } from '../sales/sales.module';

@Module({
  imports: [TypeOrmModule.forFeature([Account, AccountTransaction, Transfer, CashCollection, CreditLedgerEntry]), ShiftsModule, SalesModule],
  providers: [AccountsService],
  controllers: [AccountsController],
  exports: [AccountsService],
})
export class AccountsModule {}
