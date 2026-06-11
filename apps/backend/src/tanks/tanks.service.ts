import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tank } from './tank.entity';
import { IsNotEmpty, IsNumber, IsEnum, IsOptional, IsString, IsBoolean, Min } from 'class-validator';
import { FuelType } from './tank.entity';

export class CreateTankDto {
  @IsNotEmpty() @IsString() name: string;
  @IsEnum(FuelType) fuelType: FuelType;
  @IsNumber() @Min(1) capacityLiters: number;
  @IsOptional() @IsNumber() @Min(0) currentPrice?: number;
  @IsOptional() @IsNumber() lowLevelThreshold?: number;
}

export class UpdateTankDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEnum(FuelType) fuelType?: FuelType;
  @IsOptional() @IsNumber() @Min(1) capacityLiters?: number;
  @IsOptional() @IsNumber() @Min(0) currentLevelLiters?: number;
  @IsOptional() @IsNumber() @Min(0) currentPrice?: number;
  @IsOptional() @IsNumber() @Min(0) lowLevelThreshold?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class AdjustLevelDto {
  @IsNumber() @Min(0) liters: number;
  @IsString() @IsNotEmpty() reason: string;
}

@Injectable()
export class TanksService {
  constructor(@InjectRepository(Tank) private repo: Repository<Tank>) {}

  findAll(stationId: string): Promise<Tank[]> {
    return this.repo.find({ where: { stationId, isActive: true } });
  }

  findArchived(stationId: string): Promise<Tank[]> {
    return this.repo.find({ where: { stationId, isActive: false } });
  }

  async findById(id: string): Promise<Tank> {
    const tank = await this.repo.findOne({ where: { id } });
    if (!tank) throw new NotFoundException('Tank not found');
    return tank;
  }

  create(stationId: string, dto: CreateTankDto): Promise<Tank> {
    return this.repo.save(this.repo.create({ ...dto, stationId }));
  }

  async update(id: string, dto: UpdateTankDto): Promise<Tank> {
    const tank = await this.findById(id);
    Object.assign(tank, dto);
    return this.repo.save(tank);
  }

  async addFuel(id: string, liters: number): Promise<Tank> {
    const tank = await this.findById(id);
    const newLevel = Number(tank.currentLevelLiters) + Number(liters);
    if (newLevel > Number(tank.capacityLiters)) {
      throw new BadRequestException(
        `Cannot exceed tank capacity. Available space: ${Number(tank.capacityLiters) - Number(tank.currentLevelLiters)}L`,
      );
    }
    tank.currentLevelLiters = newLevel;
    return this.repo.save(tank);
  }

  async deductFuel(id: string, liters: number): Promise<Tank> {
    const tank = await this.findById(id);
    const newLevel = Number(tank.currentLevelLiters) - Number(liters);
    if (newLevel < 0) {
      throw new BadRequestException(
        `Insufficient fuel. Available: ${tank.currentLevelLiters}L`,
      );
    }
    tank.currentLevelLiters = newLevel;
    return this.repo.save(tank);
  }

  async returnFuel(id: string, liters: number): Promise<Tank> {
    const tank = await this.findById(id);
    const newLevel = Number(tank.currentLevelLiters) + Number(liters);

    // Safeguard: Make sure returning the fuel doesn't break physical bounds
    if (newLevel > Number(tank.capacityLiters)) {
      throw new BadRequestException(
        `Cannot return fuel; calculation exceeds tank capacity limit (${tank.capacityLiters}L).`,
      );
    }

    tank.currentLevelLiters = newLevel;
    return this.repo.save(tank);
  }

  getLowTanks(stationId: string): Promise<Tank[]> {
    return this.repo
      .createQueryBuilder('tank')
      .where('tank.stationId = :stationId', { stationId })
      .andWhere('tank.isActive = true')
      .andWhere('tank.currentLevelLiters <= tank.lowLevelThreshold')
      .getMany();
  }
}
