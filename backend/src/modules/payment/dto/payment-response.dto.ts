import { ApiProperty } from '@nestjs/swagger';

export class PaymentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  reservationId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ description: 'Amount in cents' })
  amount: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  paymentMethod: string;

  @ApiProperty({ enum: ['pending', 'completed', 'failed', 'refunded'] })
  status: string;

  @ApiProperty()
  transactionId: string;

  @ApiProperty()
  stripePaymentIntentId: string;

  @ApiProperty()
  fee: number;

  @ApiProperty()
  netAmount: number;

  @ApiProperty()
  description: string;

  @ApiProperty()
  metadata: any;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  processedAt: Date;
}