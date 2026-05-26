import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Expense, ExpenseCategory } from './expense.entity';
import { AccountsService } from '../accounts/accounts.service';
import { TransactionType, TransactionCategory } from '../accounts/account.entity';
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { InjectRepository as IR } from '@nestjs/typeorm';
import { AccountTransaction } from '../accounts/account.entity';

export class CreateExpenseDto {
  @IsNotEmpty() @IsString() accountId: string;
  @IsEnum(ExpenseCategory) category: ExpenseCategory;
  @IsNotEmpty() @IsString() description: string;
  @IsNumber() @Min(0.01) amount: number;
  @IsDateString() paidAt: string;
}

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense) private repo: Repository<Expense>,
    @InjectRepository(AccountTransaction) private txRepo: Repository<AccountTransaction>,
    private accountsService: AccountsService,
  ) {}

  async create(stationId: string, createdBy: string, dto: CreateExpenseDto): Promise<Expense> {
    const account = await this.accountsService.findById(dto.accountId);
    if (Number(account.balance) < dto.amount) throw new Error('Insufficient account balance');
    account.balance = Number(account.balance) - dto.amount;
    const expense = await this.repo.save(this.repo.create({ ...dto, stationId, createdBy, paidAt: new Date(dto.paidAt) }));
    await this.txRepo.save(this.txRepo.create({ accountId: dto.accountId, type: TransactionType.DEBIT, category: TransactionCategory.EXPENSE, amount: dto.amount, referenceId: expense.id, notes: dto.description, createdBy }));
    return expense;
  }

  findAll(stationId: string, from?: Date, to?: Date): Promise<Expense[]> {
    const where: any = { stationId };
    if (from && to) where.paidAt = Between(from, to);
    return this.repo.find({ where, order: { paidAt: 'DESC' } });
  }
}
