import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { VendorStatus } from '../../generated/prisma/enums.js';

export class UpdatePartnerStatusDto {
  @ApiProperty({
    enum: VendorStatus,
    example: VendorStatus.APPROVED,
    description: 'New status for the partnership application (PENDING, APPROVED, REJECTED, SUSPENDED)',
  })
  @IsEnum(VendorStatus)
  status!: VendorStatus;

  @ApiPropertyOptional({
    example: 'All required documents verified successfully.',
    description: 'Reason or note if rejecting or suspending',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
