import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.password) {
      throw new UnauthorizedException('This account uses PIN login');
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    return user;
  }

  async validatePin(employeeId: string, pin: string): Promise<User> {
    const user = await this.usersService.findById(employeeId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Employee not found');
    }
    if (user.pinLocked) {
      throw new ForbiddenException('Account locked. Contact your manager.');
    }
    if (!user.pin) {
      throw new UnauthorizedException('No PIN set for this employee');
    }
    const valid = await bcrypt.compare(pin, user.pin);
    if (!valid) {
      const remaining = await this.usersService.incrementPinFail(user.id);
      throw new UnauthorizedException(
        `Incorrect PIN. ${Math.max(0, 5 - remaining)} attempts remaining.`,
      );
    }
    // Reset fail count on success
    await this.usersService.resetPinLock(user.id);
    return user;
  }

  async login(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role, stationId: user.stationId };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });
    const hashed = await bcrypt.hash(refreshToken, 10);
    await this.usersService.updateRefreshToken(user.id, hashed);
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        stationId: user.stationId,
      },
    };
  }

  async refresh(userId: string, refreshToken: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Access denied');
    }
    const valid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!valid) throw new UnauthorizedException('Access denied');
    return this.login(user);
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.updateRefreshToken(userId, null);
  }
}
