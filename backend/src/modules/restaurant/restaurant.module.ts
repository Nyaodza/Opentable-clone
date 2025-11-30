import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantController } from './restaurant.controller';
import { RestaurantService } from './restaurant.service';
import { Restaurant } from '../../entities/restaurant.entity';
import { Table } from '../../entities/table.entity';
import { Menu } from '../../entities/menu.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Restaurant, Table, Menu])],
  controllers: [RestaurantController],
  providers: [RestaurantService],
  exports: [RestaurantService],
})
export class RestaurantModule {}