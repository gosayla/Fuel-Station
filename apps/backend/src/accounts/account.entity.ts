import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum AccountType { SAFE = 'safe', BANK = 'bank', CREDIT = 'credit' }
export enum TransactionCategory {
  COLLECTION = 'collection',
  TRANSFER = 'transfer',
  EXPENSE = 'expense',
  PURCHASE = 'purchase',
  POS_SALE = 'pos_sale',
  CREDIT_SALE = 'credit_sale',
  CREDIT_COLLECTION = 'credit_collection',
}
export enum TransactionType { CREDIT = 'credit', DEBIT = 'debit' }
export enum CreditLedgerType { CHARGE = 'charge', COLLECTION = 'collection' }

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() stationId: string;
  @Column() name: string;
  @Column({ type: 'enum', enum: AccountType }) type: AccountType;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 }) balance: number;
  @Column({ default: 'USD' }) currency: string;
  @Column({ default: true }) isActive: boolean;
  @CreateDateColumn() createdAt: Date;
}

@Entity('account_transactions')
export class AccountTransaction {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() accountId: string;
  @Column({ type: 'enum', enum: TransactionType }) type: TransactionType;
  @Column({ type: 'enum', enum: TransactionCategory }) category: TransactionCategory;
  @Column({ type: 'decimal', precision: 12, scale: 2 }) amount: number;
  @Column({ nullable: true }) referenceId: string;
  @Column({ nullable: true }) notes: string;
  @Column() createdBy: string;
  @CreateDateColumn() createdAt: Date;
}

@Entity('transfers')
export class Transfer {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() stationId: string;
  @Column() fromAccountId: string;
  @Column() toAccountId: string;
  @Column({ type: 'decimal', precision: 12, scale: 2 }) amount: number;
  @Column({ nullable: true }) notes: string;
  @Column() createdBy: string;
  @CreateDateColumn() createdAt: Date;
}

@Entity('cash_collections')
export class CashCollection {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() shiftId: string;
  @Column() stationId: string;
  @Column() accountantId: string;
  @Column() toAccountId: string;
  @Column({ nullable: true }) bankAccountId: string;
  @Column({ nullable: true }) creditAccountId: string;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) amountExpected: number;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) amountReceived: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) cardAmount: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) creditAmount: number;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) discrepancy: number;
  @Column({ nullable: true }) notes: string;
  @CreateDateColumn() collectedAt: Date;
}

@Entity('credit_ledger_entries')
export class CreditLedgerEntry {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() stationId: string;
  @Column({ type: 'enum', enum: CreditLedgerType }) type: CreditLedgerType;
  @Column({ type: 'decimal', precision: 12, scale: 2 }) amount: number;
  @Column({ nullable: true }) saleId: string;
  @Column({ nullable: true }) toAccountId: string;
  @Column({ nullable: true }) notes: string;
  @Column() createdBy: string;
  @CreateDateColumn() createdAt: Date;
}
