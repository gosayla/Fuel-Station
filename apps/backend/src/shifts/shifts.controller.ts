import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ShiftsService, OpenShiftDto, CloseShiftDto } from './shifts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('Shifts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly service: ShiftsService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  findAll(@Request() req: any, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.findAll(req.user.stationId, from ? new Date(from) : undefined, to ? new Date(to) : undefined);
  }

  @Get('pending')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  pending(@Request() req: any) {
    return this.service.findPendingReconciliation(req.user.stationId);
  }

  @Get('my')
  myShifts(
    @Request() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.findMyShifts(
      req.user.sub,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const shift = await this.service.findOne(id);
    if (!shift) throw new NotFoundException('Shift not found');
    return shift;
  }

  @Post()
  openShiftAlias(@Body() dto: OpenShiftDto, @Request() req: any) {
    return this.service.openShift(req.user.stationId, dto.employeeId || req.user.sub, dto);
  }

  @Post('open')
  openShift(@Body() dto: OpenShiftDto, @Request() req: any) {
    return this.service.openShift(req.user.stationId, dto.employeeId || req.user.sub, dto);
  }

  @Patch(':id/close')
  closeShift(@Param('id') id: string, @Body() dto: CloseShiftDto, @Request() req: any) {
    return this.service.closeShift(id, dto);
  }

  @Patch(':id/reconcile')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  reconcile(@Param('id') id: string) {
    return this.service.markReconciled(id);
  }
}
