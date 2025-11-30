import { IsString, IsNumber, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({ example: 'reservation-123' })
  @IsString()
  reservationId: string;

  @ApiProperty({ example: 5000, description: 'Amount in cents' })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ example: 'card', enum: ['card', 'paypal', 'apple_pay', 'google_pay'] })
  @IsString()
  paymentMethod: string;

  @ApiProperty({ example: 'Dinner reservation deposit' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: { tip: 1000, discount: 500 } })
  @IsOptional()
  @IsObject()
  metadata?: any;
}