import { IsString, IsNumber, IsOptional, IsBoolean, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ example: 'restaurant-123' })
  @IsString()
  restaurantId: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ example: 'Great food and excellent service!' })
  @IsString()
  comment: string;

  @ApiProperty({ example: '2024-01-15T19:00:00Z' })
  @IsDateString()
  visitDate: string;

  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  wouldRecommend?: boolean;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  serviceRating?: number;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  foodRating?: number;

  @ApiProperty({ example: 4, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  ambianceRating?: number;

  @ApiProperty({ example: 4, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  valueRating?: number;
}