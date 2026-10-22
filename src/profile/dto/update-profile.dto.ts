import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Jane Smith', description: 'User display name (Customer, Vendor, Admin)' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Avatar image file (PNG/JPG/WEBP) or URL for Customer, Vendor, Admin',
  })
  @IsOptional()
  avatar?: any;

  @ApiPropertyOptional({ example: 'Little Stars Nursery Ltd.', description: 'Store or business name (for Vendor)' })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Store logo or avatar image file (PNG/JPG) or URL',
  })
  @IsOptional()
  logo?: any;

  @ApiPropertyOptional({ example: 'Updated description of our store and offerings.', description: 'Short business overview (for Vendor)' })
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiPropertyOptional({ example: '+44 7700 900000', description: 'Official business phone (for Vendor)' })
  @IsOptional()
  @IsString()
  businessPhone?: string;

  @ApiPropertyOptional({ example: 'Supermarket', description: 'Business category (for Vendor)' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'United Arab Emirates', description: 'Country' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'Dubai', description: 'City' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: '123 High Street, Business Bay', description: 'Address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Mon–Sat 9:00–20:00', description: 'Store operational opening hours (for Vendor)' })
  @IsOptional()
  @IsString()
  openingHours?: string;

  @ApiPropertyOptional({ example: 'Jane Smith', description: 'Contact person or store owner name' })
  @IsOptional()
  @IsString()
  contactPerson?: string;

  @ApiPropertyOptional({ example: 'Store Manager', description: 'Role of contact person' })
  @IsOptional()
  @IsString()
  contactRole?: string;

  @ApiPropertyOptional({ example: '+44 7700 900001', description: 'Direct contact phone' })
  @IsOptional()
  @IsString()
  contactPhone?: string;
}
