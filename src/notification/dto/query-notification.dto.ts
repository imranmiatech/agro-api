import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { NotificationType } from '../../generated/prisma/enums.js';

export class QueryNotificationDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Page number (1-indexed)',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    description: 'Items per page (max 100)',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    enum: ['true', 'false'],
    description: 'Filter by read status',
  })
  @IsOptional()
  @IsIn(['true', 'false'])
  isRead?: 'true' | 'false';

  @ApiPropertyOptional({
    enum: NotificationType,
    description: 'Filter by notification category type',
  })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;
}
