import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { StationsService, CreateStationDto } from './stations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('Stations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stations')
export class StationsController {
  constructor(private readonly service: StationsService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Post() @Roles(UserRole.OWNER) create(@Body() dto: CreateStationDto) { return this.service.create(dto); }
}
