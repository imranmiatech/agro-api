import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsOptional()
  orderId?: string;

  @IsString()
  @IsOptional()
  productName?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @IsNotEmpty()
  comment: string;

  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsString()
  @IsOptional()
  customerEmail?: string;
}
