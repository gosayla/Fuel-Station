import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PosItem, PosSale, PosSaleLine, PosRestock } from './pos.entity';
import { PosController } from './pos.controller';
import { PosService } from './pos.service';
import { Account, AccountTransaction, CreditLedgerEntry } from '../accounts/account.entity';
import { ShiftsModule } from '../shifts/shifts.module';

@Module({
  imports: [TypeOrmModule.forFeature([PosItem, PosSale, PosSaleLine, PosRestock, CreditLedgerEntry, Account, AccountTransaction]), ShiftsModule],
  controllers: [PosController],
  providers: [PosService],
  exports: [PosService],
})
export class PosModule {}
