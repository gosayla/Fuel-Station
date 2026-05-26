import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SalesService, CreateSaleDto } from './sales.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../users/user.entity';

@ApiTags('Sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly service: SalesService) {}

  @Get()
  findAll(@Request() req: any, @Query('from') from?: string, @Query('to') to?: string) {
    const employeeId = req.user.role === UserRole.EMPLOYEE ? req.user.sub : undefined;
    return this.service.findAll(
      req.user.stationId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
      employeeId,
    );
  }

  @Get('daily-summary')
  dailySummary(@Request() req: any, @Query('date') date?: string) {
    return this.service.getDailySummary(req.user.stationId, date ? new Date(date) : new Date());
  }

  @Get('shift/:shiftId/summary')
  shiftPaymentSummary(@Param('shiftId') shiftId: string) {
    return this.service.getShiftPaymentSummary(shiftId);
  }

  @Get('shift/:shiftId')
  findByShift(@Param('shiftId') shiftId: string) {
    return this.service.findByShift(shiftId);
  }

  @Post()
  create(@Body() dto: CreateSaleDto, @Request() req: any) {
    return this.service.create(req.user.stationId, req.user.sub, dto);
  }
}
