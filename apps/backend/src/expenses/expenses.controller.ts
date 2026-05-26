import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ExpensesService, CreateExpenseDto } from './expenses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('Expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly service: ExpensesService) {}

  @Get()
  findAll(@Request() req: any, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.findAll(req.user.stationId, from ? new Date(from) : undefined, to ? new Date(to) : undefined);
  }

  @Post()
  create(@Body() dto: CreateExpenseDto, @Request() req: any) {
    return this.service.create(req.user.stationId, req.user.sub, dto);
  }
}
