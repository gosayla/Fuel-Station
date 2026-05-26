import { Controller, Get, Post, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TanksService, CreateTankDto, UpdateTankDto } from './tanks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('Tanks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tanks')
export class TanksController {
  constructor(private readonly service: TanksService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.service.findAll(req.user.stationId);
  }

  @Get('low')
  getLow(@Request() req: any) {
    return this.service.getLowTanks(req.user.stationId);
  }

  @Get('archived')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  findArchived(@Request() req: any) {
    return this.service.findArchived(req.user.stationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  create(@Body() dto: CreateTankDto, @Request() req: any) {
    return this.service.create(req.user.stationId, dto);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateTankDto) {
    return this.service.update(id, dto);
  }
}
