import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus, PaymentStatus } from '../../generated/prisma/enums.js';
export class UpdateOrderStatusDto {
  @ApiPropertyOptional({ description: 'Order Status (e.g. PROCESSING, SHIPPED, DELIVERED, CANCELLED, New, Delivery Sent)' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Payment Status (e.g. SUCCEEDED, PENDING, FAILED, Paid)' })
  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @ApiPropertyOptional({ example: 'Pathao Courier' })
  @IsOptional()
  @IsString()
  courierName?: string;

  @ApiPropertyOptional({ example: 'PATH-889922' })
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @ApiPropertyOptional({ example: 'Tomorrow Afternoon' })
  @IsOptional()
  @IsString()
  estimatedDelivery?: string;
}
