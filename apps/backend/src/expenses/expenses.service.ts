import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, DataSource } from 'typeorm';
import { Expense, ExpenseCategory } from './expense.entity';
import { TransactionType, TransactionCategory, Account, AccountTransaction } from '../accounts/account.entity';
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

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
    @InjectRepository(Account) private accountRepo: Repository<Account>,
    @InjectRepository(AccountTransaction) private txRepo: Repository<AccountTransaction>,
    private dataSource: DataSource,
  ) {}

  async create(stationId: string, createdBy: string, dto: CreateExpenseDto): Promise<Expense> {
    return this.dataSource.transaction(async (manager) => {
      const account = await manager.findOne(Account, { where: { id: dto.accountId, stationId, isActive: true } });
      if (!account) throw new NotFoundException('Account not found');

      const amount = Number(dto.amount);
      if (Number(account.balance) < amount) {
        throw new BadRequestException('Insufficient account balance');
      }

      account.balance = Number(account.balance) - amount;
      await manager.save(account);

      const expense = await manager.save(
        manager.create(Expense, {
          ...dto,
          stationId,
          createdBy,
          paidAt: new Date(dto.paidAt),
        }),
      );

      await manager.save(
        manager.create(AccountTransaction, {
          accountId: dto.accountId,
          type: TransactionType.DEBIT,
          category: TransactionCategory.EXPENSE,
          amount,
          referenceId: expense.id,
          notes: dto.description,
          createdBy,
        }),
      );

      return expense;
    });
  }

  findAll(stationId: string, from?: Date, to?: Date): Promise<Expense[]> {
    const where: any = { stationId };
    if (from && to) where.paidAt = Between(from, to);
    return this.repo.find({ where, order: { paidAt: 'DESC' } });
  }
}
