import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { Payment } from '../../entities/payment.entity';
import { User } from '../../entities/user.entity';
import { Reservation } from '../../entities/reservation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, User, Reservation])],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}