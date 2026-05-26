import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Purchase } from './purchase.entity';
import { TanksService } from '../tanks/tanks.service';
import { Account, AccountTransaction, TransactionType, TransactionCategory } from '../accounts/account.entity';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsDateString, Min } from 'class-validator';

export class PaymentLineDto {
  accountId: string;
  amount: number;
}

export class CreatePurchaseDto {
  @IsNotEmpty() @IsString() tankId: string;
  @IsNotEmpty() @IsString() supplierName: string;
  @IsOptional() @IsString() invoiceNumber?: string;
  @IsNumber() @Min(1) liters: number;
  @IsNumber() @Min(0) pricePerLiter: number;
  @IsDateString() deliveredAt: string;
  @IsOptional() payments?: PaymentLineDto[];
}

@Injectable()
export class PurchasesService {
  constructor(
    @InjectRepository(Purchase) private repo: Repository<Purchase>,
    @InjectRepository(Account) private accountRepo: Repository<Account>,
    @InjectRepository(AccountTransaction) private txRepo: Repository<AccountTransaction>,
    private tanksService: TanksService,
  ) {}

  async create(stationId: string, createdBy: string, dto: CreatePurchaseDto): Promise<Purchase> {
    const totalCost = Number(dto.liters) * Number(dto.pricePerLiter);

    // ── 1. Validate tank capacity BEFORE any writes ───────────────────────────
    const tank = await this.tanksService.findById(dto.tankId);
    const newLevel = Number(tank.currentLevelLiters) + Number(dto.liters);
    if (newLevel > Number(tank.capacityLiters)) {
      const available = Number(tank.capacityLiters) - Number(tank.currentLevelLiters);
      throw new BadRequestException(
        `Exceeds tank capacity. Available space: ${available.toFixed(2)} L, tried to add: ${Number(dto.liters).toFixed(2)} L`,
      );
    }

    // ── 2. Validate all account balances BEFORE any writes ────────────────────
    const validPayments: { account: Account; amount: number }[] = [];
    for (const payment of dto.payments ?? []) {
      if (!payment.accountId || Number(payment.amount) <= 0) continue;
      const account = await this.accountRepo.findOne({ where: { id: payment.accountId } });
      if (!account) throw new NotFoundException(`Account not found: ${payment.accountId}`);
      if (Number(account.balance) < Number(payment.amount)) {
        throw new BadRequestException(
          `Insufficient balance in "${account.name}". Available: SAR ${Number(account.balance).toFixed(2)}, requested: SAR ${Number(payment.amount).toFixed(2)}`,
        );
      }
      validPayments.push({ account, amount: Number(payment.amount) });
    }

    // ── 3. All checks passed — now write ──────────────────────────────────────
    await this.tanksService.addFuel(dto.tankId, dto.liters);

    const saved = await this.repo.save(
      this.repo.create({ ...dto, stationId, createdBy, totalCost, deliveredAt: new Date(dto.deliveredAt) }),
    );

    for (const { account, amount } of validPayments) {
      account.balance = Number(account.balance) - amount;
      await this.accountRepo.save(account);
      await this.txRepo.save(
        this.txRepo.create({
          accountId: account.id,
          type: TransactionType.DEBIT,
          category: TransactionCategory.PURCHASE,
          amount,
          referenceId: saved.id,
          notes: `Fuel purchase — ${dto.supplierName}${dto.invoiceNumber ? ` (${dto.invoiceNumber})` : ''}`,
          createdBy,
        }),
      );
    }

    return saved;
  }

  findAll(stationId: string, from?: Date, to?: Date): Promise<Purchase[]> {
    const where: any = { stationId };
    if (from && to) where.deliveredAt = Between(from, to);
    return this.repo.find({ where, order: { deliveredAt: 'DESC' } });
  }

  async findById(id: string): Promise<Purchase> {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Purchase not found');
    return p;
  }
}
