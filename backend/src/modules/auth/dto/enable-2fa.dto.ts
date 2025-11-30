import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Enable2FADto {
  @ApiProperty({ enum: ['totp', 'sms'] })
  @IsString()
  @IsIn(['totp', 'sms'])
  type: 'totp' | 'sms';
}
