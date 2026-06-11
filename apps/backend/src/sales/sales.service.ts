import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Sale, PaymentMethod } from './sale.entity';
import { TanksService } from '../tanks/tanks.service';
import { ShiftsService } from '../shifts/shifts.service';
import { CreditLedgerEntry, CreditLedgerType } from '../accounts/account.entity';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Shift, ShiftStatus } from 'src/shifts/shift.entity';

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
    @InjectRepository(CreditLedgerEntry) private creditLedgerRepo: Repository<CreditLedgerEntry>,
    private tanksService: TanksService,
    private shiftsService: ShiftsService,
  ) {}

  async create(stationId: string, employeeId: string, dto: CreateSaleDto): Promise<Sale> {
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
    const saved = await this.repo.save(sale);

    if (saved.paymentMethod === PaymentMethod.CREDIT) {
      await this.creditLedgerRepo.save(
        this.creditLedgerRepo.create({
          stationId,
          type: CreditLedgerType.CHARGE,
          amount: totalAmount,
          saleId: saved.id,
          createdBy: employeeId,
          notes: 'Credit sale',
        }),
      );
    }

    return saved;
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

  async remove(id: string) {
    // 1. Fixed: Changed this.saleRepo.manager to this.repo.manager
    return await this.repo.manager.transaction(async (entityManager) => {
      
      const sale = await entityManager.findOne(Sale, { where: { id } });
      if (!sale) {
        throw new NotFoundException('Sale record not found');
      }

      const shift = await entityManager.findOne(Shift, { where: { id: sale.shiftId } });
      if (!shift) {
        throw new NotFoundException('Associated shift not found for this sale');
      }

      // Re-enforce your required structural guardrail rule
      if (shift.status !== ShiftStatus.OPEN) {
        throw new BadRequestException('Cannot delete a sale from a shift that is closed or reconciled.');
      }

      // 2. Revert physical stock back to the tank before deletion
      if (typeof this.tanksService.returnFuel === 'function') {
        await this.tanksService.returnFuel(sale.tankId, sale.liters);
      } else {
        // Fallback if your TanksService uses a different naming convention:
        // Make sure to add a corresponding adjustment method inside your TanksService!
        await this.tanksService.deductFuel(sale.tankId, -Number(sale.liters));
      }

      // 3. If it was a credit transaction, wipe the customer ledger entry charge
      if (sale.paymentMethod === PaymentMethod.CREDIT) {
        await entityManager.delete(CreditLedgerEntry, { saleId: sale.id });
      }

      // 4. Reverse / Decrement the aggregated shift statistics counters
      shift.totalLitersSold = Number(shift.totalLitersSold) - Number(sale.liters);
      shift.totalRevenue = Number(shift.totalRevenue) - Number(sale.totalAmount);

      if (sale.paymentMethod === PaymentMethod.CASH) {
        shift.cashRevenue = Number(shift.cashRevenue) - Number(sale.totalAmount);
      } else if (sale.paymentMethod === PaymentMethod.CARD) {
        shift.cardRevenue = Number(shift.cardRevenue) - Number(sale.totalAmount);
      } else if (sale.paymentMethod === PaymentMethod.CREDIT) {
        shift.creditRevenue = Number(shift.creditRevenue) - Number(sale.totalAmount);
      }

      // 5. Commit entity updates and delete the target sale row
      await entityManager.save(Shift, shift);
      await entityManager.remove(Sale, sale);

      return {
        success: true,
        message: 'Sale record deleted successfully, inventory returned, and shift metrics updated.',
      };
    });
  }
}