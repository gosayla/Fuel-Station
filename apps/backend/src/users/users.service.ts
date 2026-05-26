import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './user.entity';
import { CreateUserDto, UpdateUserDto } from './users.dto';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}

  async findAll(stationId?: string): Promise<User[]> {
    const where: any = { isActive: true };
    if (stationId) where.stationId = stationId;
    return this.repo.find({ where });
  }

  async findById(id: string): Promise<User> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  async findEmployeesByStation(stationId: string): Promise<User[]> {
    return this.repo.find({
      where: { stationId, role: UserRole.EMPLOYEE, isActive: true },
      select: ['id', 'name', 'role', 'pinLocked'],
    });
  }

  async findAllEmployees(): Promise<User[]> {
    return this.repo.find({
      where: { role: UserRole.EMPLOYEE, isActive: true },
      select: ['id', 'name', 'stationId', 'pinLocked'],
    });
  }

  async create(dto: CreateUserDto): Promise<User> {
    if (dto.email) {
      const existing = await this.findByEmail(dto.email);
      if (existing) throw new ConflictException('Email already in use');
    }
    const user = this.repo.create(dto);
    if (dto.password) {
      user.password = await bcrypt.hash(dto.password, 12);
    }
    if (dto.pin) {
      user.pin = await bcrypt.hash(dto.pin, 12);
    }
    return this.repo.save(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 12);
    }
    if (dto.pin) {
      (dto as any).pin = await bcrypt.hash(dto.pin, 12);
    }
    Object.assign(user, dto);
    return this.repo.save(user);
  }

  async deactivate(id: string): Promise<void> {
    await this.repo.update(id, { isActive: false });
  }

  async updateRefreshToken(id: string, token: string | null): Promise<void> {
    await this.repo.update(id, { refreshToken: token });
  }

  async incrementPinFail(id: string): Promise<number> {
    await this.repo.increment({ id }, 'pinFailedAttempts', 1);
    const user = await this.findById(id);
    if (user.pinFailedAttempts >= 5) {
      await this.repo.update(id, { pinLocked: true });
    }
    return user.pinFailedAttempts;
  }

  async resetPinLock(id: string): Promise<void> {
    await this.repo.update(id, { pinFailedAttempts: 0, pinLocked: false });
  }
}
