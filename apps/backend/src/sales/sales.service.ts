import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Sale, PaymentMethod } from './sale.entity';
import { TanksService } from '../tanks/tanks.service';
import { ShiftsService } from '../shifts/shifts.service';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateSaleDto {
  @IsNotEmpty() @IsString() tankId: string;
  @IsNumber() @Min(0.01) liters: number;
  @IsNumber() @Min(0) pricePerLiter: number;
  @IsOptional() @IsEnum(PaymentMethod) paymentMethod?: PaymentMethod;
  @IsOptional() @IsString() shiftId?: string;
}

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale) private repo: Repository<Sale>,
    private tanksService: TanksService,
    private shiftsService: ShiftsService,
  ) {}

  async create(stationId: string, employeeId: string, dto: CreateSaleDto): Promise<Sale> {
    // If shiftId provided, use it directly; otherwise find open shift for this employee or any open shift for the station
    let shift = dto.shiftId
      ? await this.shiftsService.getShiftById(dto.shiftId)
      : await this.shiftsService.getOpenShift(employeeId) ||
        await this.shiftsService.getAnyOpenShift(stationId);
    if (!shift) throw new BadRequestException('No open shift. Start a shift first.');
    const totalAmount = Number(dto.liters) * Number(dto.pricePerLiter);
    await this.tanksService.deductFuel(dto.tankId, dto.liters);
    const sale = this.repo.create({
      tankId: dto.tankId,
      liters: dto.liters,
      pricePerLiter: dto.pricePerLiter,
      paymentMethod: dto.paymentMethod || PaymentMethod.CASH,
      stationId,
      employeeId,
      shiftId: shift.id,
      totalAmount,
    });
    await this.shiftsService.addSaleToShift(shift.id, dto.liters, totalAmount, dto.paymentMethod || PaymentMethod.CASH);
    return this.repo.save(sale);
  }

  findAll(stationId: string, from?: Date, to?: Date, employeeId?: string): Promise<Sale[]> {
    const where: any = { stationId };
    if (from && to) where.createdAt = Between(from, to);
    if (employeeId) where.employeeId = employeeId;
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  findByShift(shiftId: string): Promise<Sale[]> {
    return this.repo.find({ where: { shiftId }, order: { createdAt: 'DESC' } });
  }

  async getShiftPaymentSummary(shiftId: string) {
    const sales = await this.repo.find({ where: { shiftId } });
    const summary = { cash: 0, card: 0, credit: 0, cashLiters: 0, cardLiters: 0, creditLiters: 0, cashCount: 0, cardCount: 0, creditCount: 0 };
    sales.forEach(s => {
      const pm = s.paymentMethod as string;
      (summary as any)[pm] += Number(s.totalAmount);
      (summary as any)[`${pm}Liters`] += Number(s.liters);
      (summary as any)[`${pm}Count`] += 1;
    });
    return summary;
  }

  findByEmployee(employeeId: string, from?: Date, to?: Date): Promise<Sale[]> {
    const where: any = { employeeId };
    if (from && to) where.createdAt = Between(from, to);
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  async getDailySummary(stationId: string, date: Date) {
    const start = new Date(date); start.setHours(0, 0, 0, 0);
    const end = new Date(date); end.setHours(23, 59, 59, 999);
    const sales = await this.repo.find({ where: { stationId, createdAt: Between(start, end) } });
    return {
      totalSales: sales.length,
      totalLiters: sales.reduce((s, x) => s + Number(x.liters), 0),
      totalRevenue: sales.reduce((s, x) => s + Number(x.totalAmount), 0),
      cashRevenue: sales.filter(x => x.paymentMethod === 'cash').reduce((s, x) => s + Number(x.totalAmount), 0),
    };
  }
}
