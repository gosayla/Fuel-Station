import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards, Request, Delete } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { PosService, CreatePosItemDto, UpdatePosItemDto, CreatePosSaleDto, CreatePosRestockDto } from './pos.service';

@ApiTags('POS')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pos')
export class PosController {
  constructor(private readonly service: PosService) {}

  @Get('items')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.EMPLOYEE)
  findItems(@Request() req: any, @Query('includeInactive') includeInactive?: string) {
    return this.service.findItems(req.user.stationId, includeInactive === 'true');
  }

  @Post('items')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  createItem(@Body() dto: CreatePosItemDto, @Request() req: any) {
    return this.service.createItem(req.user.stationId, dto);
  }

  @Patch('items/:id')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  updateItem(@Param('id') id: string, @Body() dto: UpdatePosItemDto, @Request() req: any) {
    return this.service.updateItem(req.user.stationId, id, dto);
  }

  @Delete('items/:id')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  deleteItem(@Param('id') id: string, @Request() req: any) {
    return this.service.deleteItem(req.user.stationId, id);
  }

  @Get('sales')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.EMPLOYEE)
  findSales(@Request() req: any, @Query('from') from?: string, @Query('to') to?: string) {
    const employeeId = req.user.role === UserRole.EMPLOYEE ? req.user.sub : undefined;
    return this.service.findSales(
      req.user.stationId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
      employeeId,
    );
  }

  @Get('sales/shift/:shiftId')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.EMPLOYEE)
  findByShift(@Param('shiftId') shiftId: string) {
    return this.service.findByShift(shiftId);
  }

  @Get('sales/shift/:shiftId/summary')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.EMPLOYEE)
  shiftSummary(@Param('shiftId') shiftId: string) {
    return this.service.getShiftSummary(shiftId);
  }

  @Post('sales')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.EMPLOYEE)
  createSale(@Body() dto: CreatePosSaleDto, @Request() req: any) {
    return this.service.createSale(req.user.stationId, req.user.sub, dto);
  }

  @Get('restocks')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  findRestocks(@Request() req: any, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.findRestocks(
      req.user.stationId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Post('restocks')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  createRestock(@Body() dto: CreatePosRestockDto, @Request() req: any) {
    return this.service.createRestock(req.user.stationId, req.user.sub, dto);
  }
}
