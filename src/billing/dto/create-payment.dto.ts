import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({
    example: 150.0,
    description: 'Total payment amount to charge the customer',
  })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiPropertyOptional({
    example: 'usd',
    description: 'Three-letter ISO currency code',
    default: 'usd',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({
    example: 'v1d2e3f4-5678-90ab-cdef-1234567890cd',
    description: 'ID of the Vendor whose products are being purchased',
  })
  @IsString()
  @IsNotEmpty()
  vendorId!: string;

  @ApiPropertyOptional({
    example: 'ORD-98721',
    description: 'Associated Marketplace Order ID',
  })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({
    example: 'customer@gmail.com',
    description: 'Customer email address for Stripe receipt',
  })
  @IsOptional()
  @IsString()
  customerEmail?: string;

  @ApiPropertyOptional({
    example: 'pm_1QxYz2E52tJzIAwH...',
    description: 'Optional Stripe PaymentMethod ID or saved card ID to charge directly',
  })
  @IsOptional()
  @IsString()
  paymentMethodId?: string;
}
