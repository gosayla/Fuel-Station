import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Account,
  AccountTransaction,
  Transfer,
  CashCollection,
  AccountType,
  TransactionType,
  TransactionCategory,
  CreditLedgerEntry,
  CreditLedgerType,
} from './account.entity';
import { ShiftsService } from '../shifts/shifts.service';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PaymentMethod } from '../sales/sale.entity';

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
  @IsNumber() @Min(0) amountReceived: number;
  @IsOptional() @IsString() notes?: string;
}

export class CollectCreditDto {
  @IsNotEmpty() @IsString() toAccountId: string;
  @IsEnum(PaymentMethod) paymentMethod: PaymentMethod;
  @IsNumber() @Min(0.01) amount: number;
  @IsOptional() @IsString() notes?: string;
}

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account) private accountRepo: Repository<Account>,
    @InjectRepository(AccountTransaction) private txRepo: Repository<AccountTransaction>,
    @InjectRepository(Transfer) private transferRepo: Repository<Transfer>,
    @InjectRepository(CashCollection) private collectionRepo: Repository<CashCollection>,
    @InjectRepository(CreditLedgerEntry) private creditLedgerRepo: Repository<CreditLedgerEntry>,
    private shiftsService: ShiftsService,
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

    // Shift aggregate revenues include both fuel and POS sales.
    const expectedCash = Number(shift.cashRevenue ?? 0);
    const cardAmount = Number(shift.cardRevenue ?? 0);
    const creditAmount = Number(shift.creditRevenue ?? 0);
    const cashAmount = dto.amountReceived;
    const discrepancy = cashAmount - expectedCash;

    // Deposit cash → safe account
    const cashAccount = await this.findById(dto.cashAccountId);
    cashAccount.balance = Number(cashAccount.balance) + cashAmount;

    // Deposit card → bank account (if any card sales)
    let bankAccount: Account | null = null;
    if (cardAmount > 0 && dto.bankAccountId) {
      bankAccount = await this.findById(dto.bankAccountId);
      bankAccount.balance = Number(bankAccount.balance) + cardAmount;
    }

    await this.accountRepo.save([cashAccount, bankAccount].filter(Boolean) as Account[]);

    const collection = await this.collectionRepo.save(
      this.collectionRepo.create({
        shiftId: dto.shiftId,
        stationId,
        accountantId,
        toAccountId: dto.cashAccountId,
        bankAccountId: dto.bankAccountId || null,
        creditAccountId: null,
        amountExpected: expectedCash,
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

  async getCreditSummary(stationId: string) {
    const entries = await this.creditLedgerRepo.find({ where: { stationId } });
    const totalCharged = entries
      .filter((e) => e.type === CreditLedgerType.CHARGE)
      .reduce((sum, e) => sum + Number(e.amount), 0);
    const totalCollected = entries
      .filter((e) => e.type === CreditLedgerType.COLLECTION)
      .reduce((sum, e) => sum + Number(e.amount), 0);
    return {
      totalCharged,
      totalCollected,
      outstanding: Math.max(0, totalCharged - totalCollected),
    };
  }

  async collectCredit(stationId: string, createdBy: string, dto: CollectCreditDto) {
    if (dto.paymentMethod !== PaymentMethod.CASH && dto.paymentMethod !== PaymentMethod.CARD) {
      throw new BadRequestException('Credit can be collected only as cash or card');
    }

    const summary = await this.getCreditSummary(stationId);
    if (dto.amount > summary.outstanding) {
      throw new BadRequestException(`Amount exceeds outstanding credit (${summary.outstanding.toFixed(2)})`);
    }

    const toAccount = await this.findById(dto.toAccountId);
    if (toAccount.stationId !== stationId) {
      throw new BadRequestException('Invalid account for this station');
    }

    if (dto.paymentMethod === PaymentMethod.CASH && toAccount.type !== AccountType.SAFE) {
      throw new BadRequestException('Cash collection must go to a safe account');
    }
    if (dto.paymentMethod === PaymentMethod.CARD && toAccount.type !== AccountType.BANK) {
      throw new BadRequestException('Card collection must go to a bank account');
    }

    toAccount.balance = Number(toAccount.balance) + Number(dto.amount);
    await this.accountRepo.save(toAccount);

    const ledger = await this.creditLedgerRepo.save(
      this.creditLedgerRepo.create({
        stationId,
        type: CreditLedgerType.COLLECTION,
        amount: dto.amount,
        toAccountId: dto.toAccountId,
        notes: dto.notes || `Credit collection via ${dto.paymentMethod}`,
        createdBy,
      }),
    );

    await this.txRepo.save(
      this.txRepo.create({
        accountId: dto.toAccountId,
        type: TransactionType.CREDIT,
        category: TransactionCategory.CREDIT_COLLECTION,
        amount: dto.amount,
        referenceId: ledger.id,
        notes: dto.notes || `Credit collection via ${dto.paymentMethod}`,
        createdBy,
      }),
    );

    return {
      message: 'Credit collected successfully',
      ledgerId: ledger.id,
      amount: Number(dto.amount),
      paymentMethod: dto.paymentMethod,
    };
  }
}
