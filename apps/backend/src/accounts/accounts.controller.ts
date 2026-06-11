import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccountsService, CreateAccountDto, TransferDto, CollectCashDto, CollectCreditDto, ReverseCollectCashDto } from './accounts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
@Controller('accounts')
export class AccountsController {
  constructor(private readonly service: AccountsService) {}

  @Get()
  findAll(@Request() req: any) { return this.service.findAll(req.user.stationId); }

  @Post()
  @Roles(UserRole.OWNER)
  create(@Body() dto: CreateAccountDto, @Request() req: any) { return this.service.create(req.user.stationId, dto); }

  @Post('transfer')
  transfer(@Body() dto: TransferDto, @Request() req: any) { return this.service.transfer(req.user.stationId, req.user.sub, dto); }

  @Post('collect')
  collectCash(@Body() dto: CollectCashDto, @Request() req: any) { return this.service.collectCash(req.user.stationId, req.user.sub, dto); }

  @Post('reverse-collect')
  reverseCollectCash(@Body() dto: ReverseCollectCashDto, @Request() req: any) { 
    return this.service.reverseCollectCash(req.user.stationId, req.user.sub, dto); 
  }

  @Get('credit-summary')
  getCreditSummary(@Request() req: any) { return this.service.getCreditSummary(req.user.stationId); }

  @Post('collect-credit')
  collectCredit(@Body() dto: CollectCreditDto, @Request() req: any) { return this.service.collectCredit(req.user.stationId, req.user.sub, dto); }

  @Get('transactions')
  getAllTransactions(@Request() req: any) { return this.service.getAllTransactions(req.user.stationId); }

  @Get(':id/statement')
  getStatement(@Param('id') id: string) { return this.service.getStatement(id); }

  @Get(':id/transactions')
  getTransactions(@Param('id') id: string) { return this.service.getTransactions(id); }

  @Get('collections')
  getCollections(@Request() req: any) { return this.service.getCollections(req.user.stationId); }
}
