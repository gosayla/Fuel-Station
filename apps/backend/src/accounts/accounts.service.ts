import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account, AccountTransaction, Transfer, CashCollection, AccountType, TransactionType, TransactionCategory } from './account.entity';
import { ShiftsService } from '../shifts/shifts.service';
import { SalesService } from '../sales/sales.service';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateAccountDto {
  @IsNotEmpty() @IsString() name: string;
  @IsEnum(AccountType) type: AccountType;
  @IsOptional() @IsString() currency?: string;
}

export class TransferDto {
  @IsNotEmpty() @IsString() fromAccountId: string;
  @IsNotEmpty() @IsString() toAccountId: string;
  @IsNumber() @Min(0.01) amount: number;
  @IsOptional() @IsString() notes?: string;
}

export class CollectCashDto {
  @IsNotEmpty() @IsString() shiftId: string;
  @IsNotEmpty() @IsString() cashAccountId: string;
  @IsOptional() @IsString() bankAccountId?: string;
  @IsOptional() @IsString() creditAccountId?: string;
  @IsNumber() @Min(0) amountReceived: number;
  @IsOptional() @IsString() notes?: string;
}

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account) private accountRepo: Repository<Account>,
    @InjectRepository(AccountTransaction) private txRepo: Repository<AccountTransaction>,
    @InjectRepository(Transfer) private transferRepo: Repository<Transfer>,
    @InjectRepository(CashCollection) private collectionRepo: Repository<CashCollection>,
    private shiftsService: ShiftsService,
    private salesService: SalesService,
  ) {}

  findAll(stationId: string): Promise<Account[]> {
    return this.accountRepo.find({ where: { stationId, isActive: true } });
  }

  async findById(id: string): Promise<Account> {
    const a = await this.accountRepo.findOne({ where: { id } });
    if (!a) throw new NotFoundException('Account not found');
    return a;
  }

  create(stationId: string, dto: CreateAccountDto): Promise<Account> {
    return this.accountRepo.save(this.accountRepo.create({ ...dto, stationId }));
  }

  async transfer(stationId: string, createdBy: string, dto: TransferDto): Promise<Transfer> {
    const from = await this.findById(dto.fromAccountId);
    const to = await this.findById(dto.toAccountId);
    if (Number(from.balance) < dto.amount) {
      throw new BadRequestException(`Insufficient balance. Available: ${from.balance}`);
    }
    from.balance = Number(from.balance) - dto.amount;
    to.balance = Number(to.balance) + dto.amount;
    await this.accountRepo.save([from, to]);
    const transfer = await this.transferRepo.save(
      this.transferRepo.create({ stationId, fromAccountId: dto.fromAccountId, toAccountId: dto.toAccountId, amount: dto.amount, notes: dto.notes, createdBy }),
    );
    await this.txRepo.save([
      this.txRepo.create({ accountId: dto.fromAccountId, type: TransactionType.DEBIT, category: TransactionCategory.TRANSFER, amount: dto.amount, referenceId: transfer.id, notes: dto.notes, createdBy }),
      this.txRepo.create({ accountId: dto.toAccountId, type: TransactionType.CREDIT, category: TransactionCategory.TRANSFER, amount: dto.amount, referenceId: transfer.id, notes: dto.notes, createdBy }),
    ]);
    return transfer;
  }

  async collectCash(stationId: string, accountantId: string, dto: CollectCashDto): Promise<CashCollection> {
    const shift = await this.shiftsService.findPendingReconciliation(stationId).then(s => s.find(x => x.id === dto.shiftId));
    if (!shift) throw new NotFoundException('Shift not found or already reconciled');

    // Get actual payment breakdown from sales records
    const summary = await this.salesService.getShiftPaymentSummary(dto.shiftId);
    const cardAmount = Number(summary.card);
    const creditAmount = Number(summary.credit);
    const cashAmount = dto.amountReceived;
    const discrepancy = cashAmount - Number(summary.cash);

    // Deposit cash → safe account
    const cashAccount = await this.findById(dto.cashAccountId);
    cashAccount.balance = Number(cashAccount.balance) + cashAmount;

    // Deposit card → bank account (if any card sales)
    let bankAccount: Account | null = null;
    if (cardAmount > 0 && dto.bankAccountId) {
      bankAccount = await this.findById(dto.bankAccountId);
      bankAccount.balance = Number(bankAccount.balance) + cardAmount;
    }

    // Deposit credit → credit account (if any credit sales)
    let creditAccount: Account | null = null;
    if (creditAmount > 0 && dto.creditAccountId) {
      creditAccount = await this.findById(dto.creditAccountId);
      creditAccount.balance = Number(creditAccount.balance) + creditAmount;
    }

    await this.accountRepo.save([cashAccount, bankAccount, creditAccount].filter(Boolean) as Account[]);

    const collection = await this.collectionRepo.save(
      this.collectionRepo.create({
        shiftId: dto.shiftId,
        stationId,
        accountantId,
        toAccountId: dto.cashAccountId,
        bankAccountId: dto.bankAccountId || null,
        creditAccountId: dto.creditAccountId || null,
        amountExpected: summary.cash,
        amountReceived: cashAmount,
        cardAmount,
        creditAmount,
        discrepancy,
        notes: dto.notes,
      }),
    );

    await this.shiftsService.markReconciled(dto.shiftId);

    // Record transactions per payment method
    const txs = [
      this.txRepo.create({ accountId: dto.cashAccountId, type: TransactionType.CREDIT, category: TransactionCategory.COLLECTION, amount: cashAmount, referenceId: collection.id, notes: `Cash - ${dto.notes || 'Shift collection'}`, createdBy: accountantId }),
    ];
    if (cardAmount > 0 && dto.bankAccountId) {
      txs.push(this.txRepo.create({ accountId: dto.bankAccountId, type: TransactionType.CREDIT, category: TransactionCategory.COLLECTION, amount: cardAmount, referenceId: collection.id, notes: `Card - ${dto.notes || 'Shift collection'}`, createdBy: accountantId }));
    }
    if (creditAmount > 0 && dto.creditAccountId) {
      txs.push(this.txRepo.create({ accountId: dto.creditAccountId, type: TransactionType.CREDIT, category: TransactionCategory.COLLECTION, amount: creditAmount, referenceId: collection.id, notes: `Credit - ${dto.notes || 'Shift collection'}`, createdBy: accountantId }));
    }
    await this.txRepo.save(txs);

    return collection;
  }

  getTransactions(accountId: string): Promise<AccountTransaction[]> {
    return this.txRepo.find({ where: { accountId }, order: { createdAt: 'DESC' }, take: 100 });
  }

  async getStatement(accountId: string) {
    const account = await this.findById(accountId);
    const txs = await this.txRepo.find({ where: { accountId }, order: { createdAt: 'ASC' } });

    // Reconstruct opening balance: work backwards from current balance
    const totalCredits = txs.filter(t => t.type === TransactionType.CREDIT).reduce((s, t) => s + Number(t.amount), 0);
    const totalDebits  = txs.filter(t => t.type === TransactionType.DEBIT).reduce((s, t) => s + Number(t.amount), 0);
    const openingBalance = Number(account.balance) - totalCredits + totalDebits;

    // Attach running balance to each entry (forward pass)
    let running = openingBalance;
    const transactions = txs.map(tx => {
      running = tx.type === TransactionType.CREDIT
        ? running + Number(tx.amount)
        : running - Number(tx.amount);
      return { ...tx, runningBalance: running };
    });

    return {
      account,
      openingBalance,
      totalCredits,
      totalDebits,
      transactions,
    };
  }

  async getAllTransactions(stationId: string): Promise<AccountTransaction[]> {
    const accounts = await this.accountRepo.find({ where: { stationId } });
    const ids = accounts.map(a => a.id);
    if (!ids.length) return [];
    return this.txRepo.find({ where: ids.map(id => ({ accountId: id })), order: { createdAt: 'DESC' }, take: 50 });
  }

  getCollections(stationId: string): Promise<CashCollection[]> {
    return this.collectionRepo.find({ where: { stationId }, order: { collectedAt: 'DESC' } });
  }
}
