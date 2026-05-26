import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  CREDIT = 'credit',
}

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() stationId: string;
  @Column() shiftId: string;
  @Column() tankId: string;
  @Column() employeeId: string;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) liters: number;
  @Column({ type: 'decimal', precision: 10, scale: 4 }) pricePerLiter: number;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) totalAmount: number;
  @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.CASH }) paymentMethod: PaymentMethod;
  @CreateDateColumn() createdAt: Date;
}
