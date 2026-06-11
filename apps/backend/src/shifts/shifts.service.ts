import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Shift, ShiftStatus } from './shift.entity';
import { User } from '../users/user.entity';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class OpenShiftDto {
  @IsOptional() @IsString() employeeId?: string;
  @IsNumber() @Min(0) openingCash: number;
}

export class CloseShiftDto {
  @IsNumber() @Min(0) actualCash: number;
}

@Injectable()
export class ShiftsService {
  constructor(
    @InjectRepository(Shift) private repo: Repository<Shift>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async getOpenShift(employeeId: string): Promise<Shift | null> {
    return this.repo.findOne({ where: { employeeId, status: ShiftStatus.OPEN } });
  }

  async getAnyOpenShift(stationId: string): Promise<Shift | null> {
    return this.repo.findOne({ where: { stationId, status: ShiftStatus.OPEN }, order: { startedAt: 'DESC' } });
  }

  async getShiftById(shiftId: string): Promise<Shift | null> {
    return this.repo.findOne({ where: { id: shiftId } });
  }

  async findOne(shiftId: string): Promise<any | null> {
    const shift = await this.repo.findOne({ where: { id: shiftId } });
    if (!shift) return null;
    const enriched = await this.enrichWithNames([shift]);
    return enriched[0];
  }

  async openShift(stationId: string, employeeId: string, dto: OpenShiftDto): Promise<Shift> {
    const existing = await this.getOpenShift(employeeId);
    if (existing) throw new BadRequestException('You already have an open shift');
    return this.repo.save(
      this.repo.create({ stationId, employeeId, openingCash: dto.openingCash, startedAt: new Date() }),
    );
  }

  async closeShift(shiftId: string, dto: CloseShiftDto): Promise<Shift> {
    const shift = await this.repo.findOne({ where: { id: shiftId, status: ShiftStatus.OPEN } });
    if (!shift) throw new NotFoundException('Open shift not found');
    const expectedCash = Number(shift.openingCash) + Number(shift.cashRevenue);
    const discrepancy = Number(dto.actualCash) - expectedCash;
    shift.actualCash = dto.actualCash;
    shift.expectedCash = expectedCash;
    shift.discrepancy = discrepancy;
    shift.closedAt = new Date();
    shift.status = ShiftStatus.CLOSED;
    return this.repo.save(shift);
  }

  async addSaleToShift(shiftId: string, liters: number, amount: number, paymentMethod: string): Promise<void> {
    await this.repo.increment({ id: shiftId }, 'totalLitersSold', Number(liters));
    await this.repo.increment({ id: shiftId }, 'totalRevenue', Number(amount));
    if (paymentMethod === 'cash') await this.repo.increment({ id: shiftId }, 'cashRevenue', Number(amount));
    else if (paymentMethod === 'card') await this.repo.increment({ id: shiftId }, 'cardRevenue', Number(amount));
    else if (paymentMethod === 'credit') await this.repo.increment({ id: shiftId }, 'creditRevenue', Number(amount));
  }

  async addPosSaleToShift(shiftId: string, itemsSold: number, amount: number, paymentMethod: string): Promise<void> {
    await this.repo.increment({ id: shiftId }, 'totalPosItemsSold', Number(itemsSold));
    await this.repo.increment({ id: shiftId }, 'totalPosRevenue', Number(amount));
    await this.repo.increment({ id: shiftId }, 'totalRevenue', Number(amount));
    if (paymentMethod === 'cash') await this.repo.increment({ id: shiftId }, 'cashRevenue', Number(amount));
    else if (paymentMethod === 'card') await this.repo.increment({ id: shiftId }, 'cardRevenue', Number(amount));
    else if (paymentMethod === 'credit') await this.repo.increment({ id: shiftId }, 'creditRevenue', Number(amount));
  }

  async findAll(stationId: string, from?: Date, to?: Date): Promise<any[]> {
    const where: any = { stationId };
    if (from && to) where.startedAt = Between(from, to);
    const shifts = await this.repo.find({ where, order: { startedAt: 'DESC' } });
    return this.enrichWithNames(shifts);
  }

  async findPendingReconciliation(stationId: string): Promise<any[]> {
    const shifts = await this.repo.find({ where: { stationId, status: ShiftStatus.CLOSED }, order: { closedAt: 'DESC' } });
    return this.enrichWithNames(shifts);
  }

  private async enrichWithNames(shifts: Shift[]): Promise<any[]> {
    if (!shifts.length) return [];
    const ids = [...new Set(shifts.map(s => s.employeeId))];
    const users = await this.userRepo.find({ where: { id: In(ids) }, select: ['id', 'name'] });
    const nameMap = Object.fromEntries(users.map(u => [u.id, u.name]));
    return shifts.map(s => ({ ...s, employeeName: nameMap[s.employeeId] ?? s.employeeId }));
  }

  async markReconciled(id: string): Promise<Shift> {
    await this.repo.update(id, { status: ShiftStatus.RECONCILED });
    return this.repo.findOne({ where: { id } });
  }

  getMyCurrentShift(employeeId: string): Promise<Shift | null> {
    return this.getOpenShift(employeeId);
  }

  async findMyShifts(employeeId: string, from?: Date, to?: Date): Promise<any[]> {
    const where: any = { employeeId };
    if (from && to) where.startedAt = Between(from, to);
    const shifts = await this.repo.find({ where, order: { startedAt: 'DESC' } });
    return this.enrichWithNames(shifts);
  }

  async unmarkReconciled(id: string): Promise<void> {
    // Sets the status flag configuration back to closed
    await this.repo.update(id, { status: ShiftStatus.CLOSED });
  }

  async reopenShift(shiftId: string): Promise<Shift> {
    const shift = await this.repo.findOne({ where: { id: shiftId } });
    if (!shift) throw new NotFoundException('Shift record not found');
    
    // ⚠️ Hardened Guard Clause
    if (shift.status !== ShiftStatus.CLOSED) {
      throw new BadRequestException(
        `Cannot reopen this shift. Status is currently '${shift.status}'. Only closed shifts can be reopened. Reconciled shifts must be reversed first.`
      );
    }

    // Reset closing metrics cleanly
    shift.status = ShiftStatus.OPEN;
    shift.closedAt = null;
    shift.actualCash = null;
    shift.expectedCash = 0;
    shift.discrepancy = null;

    return this.repo.save(shift);
  }

  async deleteShift(shiftId: string): Promise<void> {
    const shift = await this.repo.findOne({ where: { id: shiftId } });
    if (!shift) {
      throw new NotFoundException('Shift record not found');
    }

    // Protection Guard: Ensure no activity exists on this shift
    const hasRevenue = Number(shift.totalRevenue) > 0 || Number(shift.totalPosRevenue) > 0;
    const hasVolume = Number(shift.totalLitersSold) > 0 || Number(shift.totalPosItemsSold) > 0;

    if (hasRevenue || hasVolume) {
      throw new BadRequestException(
        'Cannot delete this shift because it contains recorded transactions or sales activity.'
      );
    }

    await this.repo.remove(shift);
  }  
}
