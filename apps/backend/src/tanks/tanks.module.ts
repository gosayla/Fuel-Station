import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tank } from './tank.entity';
import { TanksService } from './tanks.service';
import { TanksController } from './tanks.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Tank])],
  providers: [TanksService],
  controllers: [TanksController],
  exports: [TanksService],
})
export class TanksModule {}
