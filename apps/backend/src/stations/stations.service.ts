import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Station } from './station.entity';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateStationDto {
  @IsNotEmpty() @IsString() name: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() phone?: string;
}

@Injectable()
export class StationsService {
  constructor(@InjectRepository(Station) private repo: Repository<Station>) {}
  findAll(): Promise<Station[]> { return this.repo.find({ where: { isActive: true } }); }
  create(dto: CreateStationDto): Promise<Station> { return this.repo.save(this.repo.create(dto)); }
}
