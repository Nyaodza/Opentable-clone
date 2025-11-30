import { ApiProperty } from '@nestjs/swagger';

export class ReviewResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  restaurantId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  rating: number;

  @ApiProperty()
  comment: string;

  @ApiProperty()
  visitDate: Date;

  @ApiProperty()
  wouldRecommend: boolean;

  @ApiProperty({ minimum: 1, maximum: 5 })
  serviceRating: number;

  @ApiProperty({ minimum: 1, maximum: 5 })
  foodRating: number;

  @ApiProperty({ minimum: 1, maximum: 5 })
  ambianceRating: number;

  @ApiProperty({ minimum: 1, maximum: 5 })
  valueRating: number;

  @ApiProperty()
  isVerified: boolean;

  @ApiProperty()
  likes: number;

  @ApiProperty()
  dislikes: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}