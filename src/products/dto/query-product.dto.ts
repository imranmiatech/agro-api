import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ProductStatus } from '../../generated/prisma/enums.js';

export class QueryProductDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Search term by product name, SKU, or summary',
    example: 'Chard',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by category (e.g. Seeds & Seedlings, Vegetables, Fertilizers)',
    example: 'Seeds & Seedlings',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    enum: ProductStatus,
    description: 'Filter by product status: ACTIVE, SUSPENDED, OUT_OF_STOCK',
    example: ProductStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({
    description: 'Minimum price filter',
    example: 50,
  })
  @IsOptional()
  @Transform(({ value }) => (value ? Number(value) : undefined))
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'Maximum price filter',
    example: 500,
  })
  @IsOptional()
  @Transform(({ value }) => (value ? Number(value) : undefined))
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Filter by Vendor Profile ID',
    example: 'v1d2e3f4-5678-90ab-cdef-1234567890cd',
  })
  @IsOptional()
  @IsString()
  vendorId?: string;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: ['createdAt', 'price', 'name', 'stock'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'price' | 'name' | 'stock' = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort direction',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
