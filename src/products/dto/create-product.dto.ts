import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { ProductStatus } from '../../generated/prisma/enums.js';

export class CreateProductDto {
  @ApiProperty({
    example: 'Rainbow Chard Seeds — Swiss',
    description: 'Product title / name',
  })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({
    example: 'rainbow-chard-seeds-swiss',
    description: 'Unique URL slug (auto-generated from name if omitted)',
  })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({
    example: 'AGRO-SD-CHARD-RNB',
    description: 'Stock Keeping Unit (SKU) identifier',
  })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({
    example: 'Seeds & Seedlings',
    description: 'Product category (e.g. Seeds & Seedlings, Vegetables, Plants & Seedlings, Fertilizers)',
  })
  @IsString()
  category!: string;

  @ApiProperty({
    example: 300.0,
    description: 'Current selling price in BDT / Currency',
  })
  @Transform(({ value }) => (value !== undefined && value !== '' ? Number(value) : value))
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({
    example: 350.0,
    description: 'Original / Compare-at price before discount',
  })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined && value !== '' ? Number(value) : undefined))
  @IsNumber()
  @Min(0)
  compareAtPrice?: number;

  @ApiPropertyOptional({
    example: 130,
    default: 0,
    description: 'Available stock count in inventory',
  })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined && value !== '' ? Number(value) : 0))
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock?: number = 0;

  @ApiPropertyOptional({
    enum: ProductStatus,
    default: ProductStatus.ACTIVE,
    description: 'Product status: ACTIVE, SUSPENDED, or OUT_OF_STOCK',
  })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus = ProductStatus.ACTIVE;

  @ApiPropertyOptional({
    example: 'Multicolor stems in ruby red, sunny gold, magenta, and bright white with tender savoyed greens.',
    description: 'Short promotional overview or summary',
  })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({
    example: 'Premium Swiss Rainbow Chard heirloom seeds with high germination rate and vibrant coloration.',
    description: 'Full detailed product description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: [
      'High concentrations of Vitamin A, C, and K',
      'Extremely bolt-resistant in warm weather',
      'Tender crisp stems with earthy beet-like sweetness',
      'Both stems and ruffled leaves are fully edible',
    ],
    description: 'Key highlights or bullet points',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return value.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  highlights?: string[];

  @ApiPropertyOptional({
    example: ['Cold-Chain Delivery', 'Lab Tested Genuine'],
    description: 'Product feature badges / tags',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return value.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  badges?: string[];

  @ApiPropertyOptional({
    example: [
      'https://res.cloudinary.com/demo/image/upload/sample1.jpg',
      'https://res.cloudinary.com/demo/image/upload/sample2.jpg',
    ],
    description: 'Image URLs (if not uploading multipart files; max 4 images)',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return value.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({
    example: 'https://res.cloudinary.com/demo/image/upload/sample1.jpg',
    description: 'Main product display thumbnail (defaults to first image)',
  })
  @IsOptional()
  @IsString()
  thumbnail?: string;

  @ApiPropertyOptional({
    example: {
      variety: 'Five Color Silverbeet Rainbow',
      maturity: '50 - 55 Days',
      germination: '93%',
      packaging: 'Standard 15g Pack',
      origin: 'Colorful Crops, Gazipur',
    },
    description: 'Key-value technical specifications / details',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  })
  @IsObject()
  specifications?: Record<string, any>;

  @ApiPropertyOptional({
    example: 'v1d2e3f4-5678-90ab-cdef-1234567890cd',
    description: 'Vendor Profile ID (Admins can specify; for Vendors it is auto-inferred)',
  })
  @IsOptional()
  @IsString()
  vendorId?: string;
}
