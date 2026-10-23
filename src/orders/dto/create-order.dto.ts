import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateOrderItemDto {
  @ApiPropertyOptional({ example: 'prod-uuid' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty({ example: 'Hybrid Tomato F1 Seeds' })
  @IsString()
  @IsNotEmpty()
  productName!: string;

  @ApiProperty({ example: 'https://images.unsplash.com/...' })
  @IsString()
  @IsNotEmpty()
  productImage!: string;

  @ApiPropertyOptional({ example: 'Seeds & Seedlings' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'SEED-TOM-001' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ example: 45 })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ example: 60, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryCharge?: number;

  @ApiPropertyOptional({ example: 'vendor-uuid' })
  @IsOptional()
  @IsString()
  vendorId?: string;
}

export class CreateOrderDto {
  @ApiProperty({ example: 'Mohammad Rahim' })
  @IsString()
  @IsNotEmpty()
  customerName!: string;

  @ApiProperty({ example: 'rahim.farmer@agroai.bd' })
  @IsEmail()
  @IsNotEmpty()
  customerEmail!: string;

  @ApiProperty({ example: '+880 1712-345678' })
  @IsString()
  @IsNotEmpty()
  customerPhone!: string;

  @ApiProperty({ example: 'Green Valley Farm, Village: Bhabanipur, Post: Joydebpur' })
  @IsString()
  @IsNotEmpty()
  deliveryAddress!: string;

  @ApiProperty({ example: 'Gazipur' })
  @IsString()
  @IsNotEmpty()
  district!: string;

  @ApiPropertyOptional({ example: 'Sadar' })
  @IsOptional()
  @IsString()
  upazila?: string;

  @ApiPropertyOptional({ example: 'Gazipur' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: '1700' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ example: 'Please call before arrival.' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ example: 'Cash on Delivery', default: 'Cash on Delivery' })
  @IsString()
  paymentMethod!: string;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @ApiPropertyOptional({ example: 90 })
  @IsOptional()
  @IsNumber()
  subtotal?: number;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @IsNumber()
  deliveryFee?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  discount?: number;

  @ApiPropertyOptional({ example: 150 })
  @IsOptional()
  @IsNumber()
  total?: number;

  // Stripe Card Details if paying online
  @ApiPropertyOptional({ example: '4242 4242 4242 4242' })
  @IsOptional()
  @IsString()
  cardNumber?: string;

  @ApiPropertyOptional({ example: '12/28' })
  @IsOptional()
  @IsString()
  cardExpiry?: string;

  @ApiPropertyOptional({ example: '123' })
  @IsOptional()
  @IsString()
  cardCvc?: string;

  @ApiPropertyOptional({ example: 'Mohammad Rahim' })
  @IsOptional()
  @IsString()
  cardholderName?: string;
}
