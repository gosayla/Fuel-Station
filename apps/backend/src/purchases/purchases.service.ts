import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, EntityManager } from 'typeorm';
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

export class UpdatePurchaseDto {
  @IsOptional() @IsString() tankId?: string;
  @IsOptional() @IsString() supplierName?: string;
  @IsOptional() @IsString() invoiceNumber?: string;
  @IsOptional() @IsNumber() @Min(1) liters?: number;
  @IsOptional() @IsNumber() @Min(0) pricePerLiter?: number;
  @IsOptional() @IsDateString() deliveredAt?: string;
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

    // ── 3. All checks passed — now write inside a transaction ────────────────
    return await this.repo.manager.transaction(async (manager: EntityManager) => {
      // add fuel using transactional manager
      await this.tanksService.addFuel(dto.tankId, dto.liters, manager);

      const purchaseRepo = manager.getRepository(Purchase);
      const accountRepo = manager.getRepository(Account);
      const txRepo = manager.getRepository(AccountTransaction);

      const saved = await purchaseRepo.save(
        purchaseRepo.create({ ...dto, stationId, createdBy, totalCost, deliveredAt: new Date(dto.deliveredAt) }),
      );

      for (const { account, amount } of validPayments) {
        account.balance = Number(account.balance) - amount;
        await accountRepo.save(account);
        await txRepo.save(
          txRepo.create({
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
    });
  }

  async update(stationId: string, updatedBy: string, id: string, dto: UpdatePurchaseDto): Promise<Purchase> {
    return await this.repo.manager.transaction(async (manager: EntityManager) => {
      const purchaseRepo = manager.getRepository(Purchase);
      const accountRepo = manager.getRepository(Account);
      const txRepo = manager.getRepository(AccountTransaction);

      const existing = await purchaseRepo.findOne({ where: { id } });
      if (!existing) throw new NotFoundException('Purchase not found');

      // Revert any previous account transactions (refund accounts)
      const oldTxs = await txRepo.find({ where: { referenceId: existing.id, category: TransactionCategory.PURCHASE } });
      for (const tx of oldTxs) {
        const acct = await accountRepo.findOne({ where: { id: tx.accountId } });
        if (!acct) continue;
        if (tx.type === TransactionType.DEBIT) {
          acct.balance = Number(acct.balance) + Number(tx.amount);
          await accountRepo.save(acct);
        } else if (tx.type === TransactionType.CREDIT) {
          acct.balance = Number(acct.balance) - Number(tx.amount);
          await accountRepo.save(acct);
        }
        await txRepo.remove(tx);
      }

      // Revert tank levels for original purchase
      if (dto.tankId && dto.tankId !== existing.tankId) {
        await this.tanksService.deductFuel(existing.tankId, existing.liters, manager);
      }

      // Apply tank changes based on new liters / tank
      const newTankId = dto.tankId ?? existing.tankId;
      const newLiters = dto.liters ?? existing.liters;

      if (newTankId === existing.tankId) {
        const diff = Number(newLiters) - Number(existing.liters);
        if (diff > 0) await this.tanksService.addFuel(newTankId, diff, manager);
        else if (diff < 0) await this.tanksService.deductFuel(newTankId, Math.abs(diff), manager);
      } else {
        await this.tanksService.addFuel(newTankId, newLiters, manager);
      }

      // Validate new payments (accounts should have been refunded above)
      const validPayments: { account: Account; amount: number }[] = [];
      for (const payment of dto.payments ?? []) {
        if (!payment.accountId || Number(payment.amount) <= 0) continue;
        const account = await accountRepo.findOne({ where: { id: payment.accountId } });
        if (!account) throw new NotFoundException(`Account not found: ${payment.accountId}`);
        if (Number(account.balance) < Number(payment.amount)) {
          throw new BadRequestException(
            `Insufficient balance in "${account.name}". Available: SAR ${Number(account.balance).toFixed(2)}, requested: SAR ${Number(payment.amount).toFixed(2)}`,
          );
        }
        validPayments.push({ account, amount: Number(payment.amount) });
      }

      // Update purchase fields
      existing.tankId = newTankId;
      if (dto.supplierName !== undefined) existing.supplierName = dto.supplierName;
      if (dto.invoiceNumber !== undefined) existing.invoiceNumber = dto.invoiceNumber;
      if (dto.liters !== undefined) existing.liters = dto.liters;
      if (dto.pricePerLiter !== undefined) existing.pricePerLiter = dto.pricePerLiter;
      existing.totalCost = Number(existing.liters) * Number(existing.pricePerLiter);
      if (dto.deliveredAt) existing.deliveredAt = new Date(dto.deliveredAt);

      const saved = await purchaseRepo.save(existing);

      // Apply new payments
      for (const { account, amount } of validPayments) {
        account.balance = Number(account.balance) - amount;
        await accountRepo.save(account);
        await txRepo.save(
          txRepo.create({
            accountId: account.id,
            type: TransactionType.DEBIT,
            category: TransactionCategory.PURCHASE,
            amount,
            referenceId: saved.id,
            notes: `Fuel purchase — ${saved.supplierName}${saved.invoiceNumber ? ` (${saved.invoiceNumber})` : ''}`,
            createdBy: updatedBy,
          }),
        );
      }

      return saved;
    });
  }

  async remove(stationId: string, deletedBy: string, id: string): Promise<void> {
    return await this.repo.manager.transaction(async (manager: EntityManager) => {
      const purchaseRepo = manager.getRepository(Purchase);
      const accountRepo = manager.getRepository(Account);
      const txRepo = manager.getRepository(AccountTransaction);

      const existing = await purchaseRepo.findOne({ where: { id } });
      if (!existing) throw new NotFoundException('Purchase not found');

      // Refund account transactions
      const txs = await txRepo.find({ where: { referenceId: existing.id, category: TransactionCategory.PURCHASE } });
      for (const tx of txs) {
        const acct = await accountRepo.findOne({ where: { id: tx.accountId } });
        if (!acct) continue;
        if (tx.type === TransactionType.DEBIT) {
          acct.balance = Number(acct.balance) + Number(tx.amount);
          await accountRepo.save(acct);
        } else if (tx.type === TransactionType.CREDIT) {
          acct.balance = Number(acct.balance) - Number(tx.amount);
          await accountRepo.save(acct);
        }
        await txRepo.remove(tx);
      }

      // Deduct fuel from tank
      await this.tanksService.deductFuel(existing.tankId, existing.liters, manager);

      // Remove purchase record
      await purchaseRepo.remove(existing);
    });
  }

  async getPaymentsForPurchase(id: string): Promise<PaymentLineDto[]> {
    const txs = await this.txRepo.find({ where: { referenceId: id, category: TransactionCategory.PURCHASE } });
    return txs.map((tx) => ({ accountId: tx.accountId, amount: Number(tx.amount) }));
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
