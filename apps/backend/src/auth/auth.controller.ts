import { Controller, Get, Post, Body, Request, UseGuards, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto, PinLoginDto, RefreshDto } from './auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UsersService } from '../users/users.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Get('employees')
  async getEmployees(@Query('stationId') stationId?: string) {
    if (stationId) {
      const employees = await this.usersService.findEmployeesByStation(stationId);
      return employees.map(e => ({ id: e.id, name: e.name, pinLocked: e.pinLocked }));
    }
    const employees = await this.usersService.findAllEmployees();
    return employees.map(e => ({ id: e.id, name: e.name, pinLocked: (e as any).pinLocked }));
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async login(@Body() dto: LoginDto) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    return this.authService.login(user);
  }

  @Post('pin-login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async pinLogin(@Body() dto: PinLoginDto) {
    const user = await this.authService.validatePin(dto.employeeId, dto.pin);
    return this.authService.login(user);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto, @Request() req: any) {
    const token = dto.refreshToken;
    const payload = this.parseRefreshToken(token);
    return this.authService.refresh(payload.sub, token);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req: any) {
    await this.authService.logout(req.user.sub);
    return { message: 'Logged out successfully' };
  }

  private parseRefreshToken(token: string): any {
    try {
      const [, payload] = token.split('.');
      return JSON.parse(Buffer.from(payload, 'base64').toString());
    } catch {
      return {};
    }
  }
}
