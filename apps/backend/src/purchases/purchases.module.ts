import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Purchase } from './purchase.entity';
import { PurchasesService } from './purchases.service';
import { PurchasesController } from './purchases.controller';
import { TanksModule } from '../tanks/tanks.module';
import { Account, AccountTransaction } from '../accounts/account.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Purchase, Account, AccountTransaction]), TanksModule],
  providers: [PurchasesService],
  controllers: [PurchasesController],
  exports: [PurchasesService],
})
export class PurchasesModule {}
