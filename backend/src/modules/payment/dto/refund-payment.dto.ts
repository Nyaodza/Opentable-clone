import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefundPaymentDto {
  @ApiProperty({ example: 2500, description: 'Refund amount in cents' })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'Customer cancelled reservation' })
  @IsString()
  reason: string;

  @ApiProperty({ example: 'Customer requested refund due to restaurant closure' })
  @IsOptional()
  @IsString()
  description?: string;
}