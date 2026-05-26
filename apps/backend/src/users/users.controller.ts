import {
  Controller, Get, Post, Patch, Param, Body, Delete,
  UseGuards, Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './users.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './user.entity';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  findAll(@Request() req: any) {
    return this.service.findAll(req.user.stationId);
  }

  @Get('employees')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  findEmployees(@Request() req: any) {
    return this.service.findEmployeesByStation(req.user.stationId);
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles(UserRole.OWNER)
  create(@Body() dto: CreateUserDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/reset-pin')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  resetPin(@Param('id') id: string) {
    return this.service.resetPinLock(id);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER)
  deactivate(@Param('id') id: string) {
    return this.service.deactivate(id);
  }
}
