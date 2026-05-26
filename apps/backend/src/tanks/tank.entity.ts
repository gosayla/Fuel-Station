import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

export enum FuelType {
  PETROL_91 = 'petrol_91',
  PETROL_95 = 'petrol_95',
  DIESEL = 'diesel',
  PREMIUM = 'premium',
}

@Entity('tanks')
export class Tank {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  stationId: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: FuelType })
  fuelType: FuelType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  capacityLiters: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  currentLevelLiters: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 500 })
  lowLevelThreshold: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
  currentPrice: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
