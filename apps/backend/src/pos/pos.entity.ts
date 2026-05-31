import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { PaymentMethod } from '../sales/sale.entity';

export enum PosItemCategory {
  ENGINE_OIL = 'engine_oil',
  CLEANING_TOOLS = 'cleaning_tools',
  ACCESSORIES = 'accessories',
  OTHER = 'other',
}

@Entity('pos_items')
export class PosItem {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() stationId: string;
  @Column() sku: string;
  @Column() name: string;
  @Column({ type: 'enum', enum: PosItemCategory, default: PosItemCategory.OTHER }) category: PosItemCategory;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) quantity: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) reorderLevel: number;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) unitPrice: number;
  @Column({ default: true }) isActive: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('pos_sales')
export class PosSale {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() stationId: string;
  @Column() shiftId: string;
  @Column() employeeId: string;
  @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.CASH }) paymentMethod: PaymentMethod;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) totalItems: number;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) totalAmount: number;
  @CreateDateColumn() createdAt: Date;
}

@Entity('pos_sale_lines')
export class PosSaleLine {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() posSaleId: string;
  @Column() posItemId: string;
  @Column() itemName: string;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) quantity: number;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) unitPrice: number;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) lineTotal: number;
}

@Entity('pos_restocks')
export class PosRestock {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() stationId: string;
  @Column() posItemId: string;
  @Column() itemName: string;
  @Column() accountId: string;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) quantity: number;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) unitCost: number;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) totalCost: number;
  @Column({ nullable: true }) supplierName: string;
  @Column({ nullable: true }) invoiceNumber: string;
  @Column({ nullable: true }) notes: string;
  @Column({ type: 'timestamptz' }) purchasedAt: Date;
  @Column() createdBy: string;
  @CreateDateColumn() createdAt: Date;
}
