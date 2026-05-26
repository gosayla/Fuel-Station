import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum ShiftStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  RECONCILED = 'reconciled',
}

@Entity('shifts')
export class Shift {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() stationId: string;
  @Column() employeeId: string;
  @Column({ type: 'timestamptz' }) startedAt: Date;
  @Column({ type: 'timestamptz', nullable: true }) closedAt: Date;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) openingCash: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) expectedCash: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }) actualCash: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }) discrepancy: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) totalLitersSold: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) totalRevenue: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) cashRevenue: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) cardRevenue: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) creditRevenue: number;
  @Column({ type: 'enum', enum: ShiftStatus, default: ShiftStatus.OPEN }) status: ShiftStatus;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
