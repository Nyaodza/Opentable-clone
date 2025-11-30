import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationController } from './reservation.controller';
import { ReservationService } from './reservation.service';
import { Reservation } from '../../entities/reservation.entity';
import { Restaurant } from '../../entities/restaurant.entity';
import { User } from '../../entities/user.entity';
import { Table } from '../../entities/table.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Reservation, Restaurant, User, Table])],
  controllers: [ReservationController],
  providers: [ReservationService],
  exports: [ReservationService],
})
export class ReservationModule {}