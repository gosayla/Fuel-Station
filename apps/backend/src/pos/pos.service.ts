import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, DataSource, In } from 'typeorm';
import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PosItem, PosItemCategory, PosSale, PosSaleLine, PosRestock } from './pos.entity';
import { PaymentMethod } from '../sales/sale.entity';
import { ShiftsService } from '../shifts/shifts.service';
import { Account, AccountTransaction, CreditLedgerEntry, CreditLedgerType, TransactionCategory, TransactionType } from '../accounts/account.entity';

export class CreatePosItemDto {
  @IsNotEmpty() @IsString() sku: string;
  @IsNotEmpty() @IsString() name: string;
  @IsOptional() @IsEnum(PosItemCategory) category?: PosItemCategory;
  @IsNumber() @Min(0) quantity: number;
  @IsOptional() @IsNumber() @Min(0) reorderLevel?: number;
  @IsNumber() @Min(0.01) unitPrice: number;
}

export class UpdatePosItemDto {
  @IsOptional() @IsString() sku?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEnum(PosItemCategory) category?: PosItemCategory;
  @IsOptional() @IsNumber() @Min(0) quantity?: number;
  @IsOptional() @IsNumber() @Min(0) reorderLevel?: number;
  @IsOptional() @IsNumber() @Min(0.01) unitPrice?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class PosSaleLineDto {
  @IsNotEmpty() @IsString() itemId: string;
  @IsNumber() @Min(0.01) quantity: number;
}

export class CreatePosSaleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PosSaleLineDto)
  lines: PosSaleLineDto[];

  @IsOptional() @IsEnum(PaymentMethod) paymentMethod?: PaymentMethod;
  @IsOptional() @IsString() shiftId?: string;
}

export class CreatePosRestockDto {
  @IsNotEmpty() @IsString() itemId: string;
  @IsNotEmpty() @IsString() accountId: string;
  @IsNumber() @Min(0.01) quantity: number;
  @IsNumber() @Min(0.01) unitCost: number;
  @IsOptional() @IsString() supplierName?: string;
  @IsOptional() @IsString() invoiceNumber?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() purchasedAt?: string;
}

@Injectable()
export class PosService {
  constructor(
    @InjectRepository(PosItem) private itemRepo: Repository<PosItem>,
    @InjectRepository(PosSale) private saleRepo: Repository<PosSale>,
    @InjectRepository(PosSaleLine) private lineRepo: Repository<PosSaleLine>,
    @InjectRepository(PosRestock) private restockRepo: Repository<PosRestock>,
    @InjectRepository(Account) private accountRepo: Repository<Account>,
    @InjectRepository(AccountTransaction) private txRepo: Repository<AccountTransaction>,
    @InjectRepository(CreditLedgerEntry) private creditLedgerRepo: Repository<CreditLedgerEntry>,
    private shiftsService: ShiftsService,
    private dataSource: DataSource,
  ) {}

  async createItem(stationId: string, dto: CreatePosItemDto) {
    const normalizedSku = dto.sku.trim().toUpperCase();
    const existing = await this.itemRepo.findOne({ where: { stationId, sku: normalizedSku } });
    if (existing) throw new BadRequestException('SKU already exists');
    return this.itemRepo.save(
      this.itemRepo.create({
        stationId,
        sku: normalizedSku,
        name: dto.name.trim(),
        category: dto.category || PosItemCategory.OTHER,
        quantity: dto.quantity,
        reorderLevel: dto.reorderLevel || 0,
        unitPrice: dto.unitPrice,
      }),
    );
  }

  findItems(stationId: string, includeInactive = false) {
    const where: any = { stationId };
    if (!includeInactive) where.isActive = true;
    return this.itemRepo.find({ where, order: { name: 'ASC' } });
  }

  async updateItem(stationId: string, id: string, dto: UpdatePosItemDto) {
    const item = await this.itemRepo.findOne({ where: { id, stationId } });
    if (!item) throw new NotFoundException('POS item not found');

    if (dto.sku) {
      const normalizedSku = dto.sku.trim().toUpperCase();
      const existing = await this.itemRepo.findOne({ where: { stationId, sku: normalizedSku } });
      if (existing && existing.id !== id) throw new BadRequestException('SKU already exists');
      item.sku = normalizedSku;
    }

    if (typeof dto.name === 'string') {
      item.name = dto.name.trim();
    }

    if (dto.category !== undefined) item.category = dto.category;
    if (dto.quantity !== undefined) item.quantity = dto.quantity;
    if (dto.reorderLevel !== undefined) item.reorderLevel = dto.reorderLevel;
    if (dto.unitPrice !== undefined) item.unitPrice = dto.unitPrice;
    if (dto.isActive !== undefined) item.isActive = dto.isActive;

    return this.itemRepo.save(item);
  }

  async deleteItem(stationId: string, id: string) {
    const item = await this.itemRepo.findOne({ where: { id, stationId } });
    if (!item) throw new NotFoundException('POS item not found');
    if (!item.isActive) return item;

    item.isActive = false;
    return this.itemRepo.save(item);
  }

  async createRestock(stationId: string, createdBy: string, dto: CreatePosRestockDto) {
    const quantity = Number(dto.quantity);
    const unitCost = Number(dto.unitCost);
    const totalCost = quantity * unitCost;

    if (!Number.isFinite(totalCost) || totalCost <= 0) {
      throw new BadRequestException('Invalid restock total cost');
    }

    return this.dataSource.transaction(async (manager) => {
      const item = await manager.findOne(PosItem, {
        where: { id: dto.itemId, stationId },
      });
      if (!item) throw new NotFoundException('POS item not found');

      const account = await manager.findOne(Account, {
        where: { id: dto.accountId, stationId, isActive: true },
      });
      if (!account) throw new NotFoundException('Account not found');

      if (Number(account.balance) < totalCost) {
        throw new BadRequestException(`Insufficient account balance. Available: ${Number(account.balance).toFixed(2)}`);
      }

      account.balance = Number(account.balance) - totalCost;
      item.quantity = Number(item.quantity) + quantity;

      const restock = manager.create(PosRestock, {
        stationId,
        posItemId: item.id,
        itemName: item.name,
        accountId: account.id,
        quantity,
        unitCost,
        totalCost,
        supplierName: dto.supplierName || null,
        invoiceNumber: dto.invoiceNumber || null,
        notes: dto.notes || null,
        purchasedAt: dto.purchasedAt ? new Date(dto.purchasedAt) : new Date(),
        createdBy,
      });

      const savedRestock = await manager.save(restock);

      await manager.save(
        manager.create(AccountTransaction, {
          accountId: account.id,
          type: TransactionType.DEBIT,
          category: TransactionCategory.PURCHASE,
          amount: totalCost,
          referenceId: savedRestock.id,
          notes: dto.notes || `POS restock: ${item.name}`,
          createdBy,
        }),
      );

      await manager.save([item, account]);

      return savedRestock;
    });
  }

  findRestocks(stationId: string, from?: Date, to?: Date) {
    const where: any = { stationId };
    if (from && to) where.purchasedAt = Between(from, to);
    return this.restockRepo.find({ where, order: { purchasedAt: 'DESC' } });
  }

  async createSale(stationId: string, employeeId: string, dto: CreatePosSaleDto) {
    if (!dto.lines?.length) throw new BadRequestException('At least one sale line is required');

    const paymentMethod = dto.paymentMethod || PaymentMethod.CASH;
    const shift = dto.shiftId
      ? await this.shiftsService.getShiftById(dto.shiftId)
      : await this.shiftsService.getOpenShift(employeeId) || await this.shiftsService.getAnyOpenShift(stationId);

    if (!shift) throw new BadRequestException('No open shift. Start a shift first.');

    const lineMap = new Map<string, number>();
    for (const line of dto.lines) {
      const current = lineMap.get(line.itemId) || 0;
      lineMap.set(line.itemId, current + Number(line.quantity));
    }

    const itemIds = [...lineMap.keys()];
    const result = await this.dataSource.transaction(async (manager) => {
      const items = await manager.find(PosItem, {
        where: { id: In(itemIds), stationId, isActive: true },
      });
      if (items.length !== itemIds.length) {
        throw new BadRequestException('One or more POS items are invalid');
      }

      const itemMap = new Map(items.map((item) => [item.id, item]));
      const saleLinesDraft: Array<Omit<PosSaleLine, 'id'>> = [];
      let totalItems = 0;
      let totalAmount = 0;

      for (const [itemId, qty] of lineMap.entries()) {
        const item = itemMap.get(itemId)!;
        const available = Number(item.quantity);
        if (available < qty) {
          throw new BadRequestException(`Insufficient stock for ${item.name}. Available: ${available}`);
        }
        item.quantity = available - qty;
        const lineTotal = qty * Number(item.unitPrice);
        totalItems += qty;
        totalAmount += lineTotal;
        saleLinesDraft.push({
          posSaleId: '',
          posItemId: item.id,
          itemName: item.name,
          quantity: qty,
          unitPrice: Number(item.unitPrice),
          lineTotal,
        } as any);
      }

      await manager.save(items);

      const savedSale = await manager.save(
        manager.create(PosSale, {
          stationId,
          shiftId: shift.id,
          employeeId,
          paymentMethod,
          totalItems,
          totalAmount,
        }),
      );

      const lines = saleLinesDraft.map((line) =>
        manager.create(PosSaleLine, {
          ...line,
          posSaleId: savedSale.id,
        }),
      );
      await manager.save(lines);

      return { sale: savedSale, lines };
    });

    await this.shiftsService.addPosSaleToShift(shift.id, Number(result.sale.totalItems), Number(result.sale.totalAmount), paymentMethod);

    if (paymentMethod === PaymentMethod.CREDIT) {
      await this.creditLedgerRepo.save(
        this.creditLedgerRepo.create({
          stationId,
          type: CreditLedgerType.CHARGE,
          amount: Number(result.sale.totalAmount),
          saleId: result.sale.id,
          createdBy: employeeId,
          notes: 'Credit POS sale',
        }),
      );
    }

    return result;
  }

  async findSales(stationId: string, from?: Date, to?: Date, employeeId?: string) {
    const where: any = { stationId };
    if (from && to) where.createdAt = Between(from, to);
    if (employeeId) where.employeeId = employeeId;
    const sales = await this.saleRepo.find({ where, order: { createdAt: 'DESC' } });
    const saleIds = sales.map((sale) => sale.id);
    const lines = saleIds.length
      ? await this.lineRepo.find({ where: saleIds.map((id) => ({ posSaleId: id })) })
      : [];
    const linesBySaleId = new Map<string, PosSaleLine[]>();
    for (const line of lines) {
      const current = linesBySaleId.get(line.posSaleId) || [];
      current.push(line);
      linesBySaleId.set(line.posSaleId, current);
    }
    return sales.map((sale) => ({ ...sale, lines: linesBySaleId.get(sale.id) || [] }));
  }

  async findByShift(shiftId: string) {
    const sales = await this.saleRepo.find({ where: { shiftId }, order: { createdAt: 'DESC' } });
    const saleIds = sales.map((sale) => sale.id);
    const lines = saleIds.length
      ? await this.lineRepo.find({ where: saleIds.map((id) => ({ posSaleId: id })) })
      : [];
    const linesBySaleId = new Map<string, PosSaleLine[]>();
    for (const line of lines) {
      const current = linesBySaleId.get(line.posSaleId) || [];
      current.push(line);
      linesBySaleId.set(line.posSaleId, current);
    }
    return sales.map((sale) => ({ ...sale, lines: linesBySaleId.get(sale.id) || [] }));
  }

  async getShiftSummary(shiftId: string) {
    const sales = await this.saleRepo.find({ where: { shiftId } });
    const summary = {
      cash: 0,
      card: 0,
      credit: 0,
      cashCount: 0,
      cardCount: 0,
      creditCount: 0,
      totalItems: 0,
    } as any;

    for (const sale of sales) {
      const pm = sale.paymentMethod as string;
      summary[pm] += Number(sale.totalAmount);
      summary[`${pm}Count`] += 1;
      summary.totalItems += Number(sale.totalItems);
    }

    return summary;
  }
}
