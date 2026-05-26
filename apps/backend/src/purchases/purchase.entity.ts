import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('purchases')
export class Purchase {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() stationId: string;
  @Column() tankId: string;
  @Column() supplierName: string;
  @Column({ nullable: true }) invoiceNumber: string;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) liters: number;
  @Column({ type: 'decimal', precision: 10, scale: 4 }) pricePerLiter: number;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) totalCost: number;
  @Column({ type: 'timestamptz' }) deliveredAt: Date;
  @Column() createdBy: string;
  @CreateDateColumn() createdAt: Date;
}
