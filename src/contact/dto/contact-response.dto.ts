import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContactResponseDto {
  @ApiProperty({ example: 'f87b8d0e-26f6-4ef3-9bfb-0dae86208a0d' })
  id: string;

  @ApiProperty({ example: 'Tanvir Ahmed' })
  name: string;

  @ApiProperty({ example: 'tanvir@example.com' })
  email: string;

  @ApiPropertyOptional({ example: '+880 1712-345678' })
  phone?: string;

  @ApiPropertyOptional({ example: 'Soil Testing Request' })
  subject?: string;

  @ApiProperty({ example: 'I would like to schedule a professional soil pH & NPK nutrient analysis...' })
  message: string;

  @ApiProperty({ example: 'PENDING' })
  status: string;

  @ApiPropertyOptional({ example: 'Our agronomist has reviewed your request...' })
  replyMessage?: string;

  @ApiPropertyOptional({ example: '2026-10-22T09:40:00.000Z' })
  resolvedAt?: string;

  @ApiProperty({ example: '2026-10-22T09:30:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-10-22T09:30:00.000Z' })
  updatedAt: string;
}

export class ContactMetricsDto {
  @ApiProperty({ example: 48 })
  totalInquiries: number;

  @ApiProperty({ example: 12 })
  pendingCount: number;

  @ApiProperty({ example: 8 })
  inProgressCount: number;

  @ApiProperty({ example: 28 })
  resolvedCount: number;
}
