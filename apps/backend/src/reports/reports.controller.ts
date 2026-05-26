import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('dashboard')
  dashboard(@Request() req: any) { return this.service.getDashboardKpis(req.user.stationId); }

  @Get('sales')
  salesReport(@Request() req: any, @Query('from') from: string, @Query('to') to: string) {
    return this.service.getSalesReport(req.user.stationId, new Date(from), new Date(to));
  }

  @Get('profit-loss')
  profitLoss(@Request() req: any, @Query('from') from?: string, @Query('to') to?: string) {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    return this.service.getProfitLoss(req.user.stationId, fromDate, toDate);
  }
}
