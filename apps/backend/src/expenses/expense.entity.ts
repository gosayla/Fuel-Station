import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum ExpenseCategory { SALARY = 'salary', UTILITIES = 'utilities', MAINTENANCE = 'maintenance', FUEL_PURCHASE = 'fuel_purchase', OTHER = 'other' }

@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() stationId: string;
  @Column() accountId: string;
  @Column({ type: 'enum', enum: ExpenseCategory }) category: ExpenseCategory;
  @Column() description: string;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) amount: number;
  @Column({ type: 'timestamptz' }) paidAt: Date;
  @Column() createdBy: string;
  @CreateDateColumn() createdAt: Date;
}
