import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sale } from './sale.entity';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { TanksModule } from '../tanks/tanks.module';
import { ShiftsModule } from '../shifts/shifts.module';
import { CreditLedgerEntry } from '../accounts/account.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Sale, CreditLedgerEntry]), TanksModule, ShiftsModule],
  providers: [SalesService],
  controllers: [SalesController],
  exports: [SalesService],
})
export class SalesModule {}
