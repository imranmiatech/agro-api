import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class VendorRegisterDto {
  // ------------------------------------------------------
  // Step 1: Business Details
  // ------------------------------------------------------
  @ApiProperty({
    example: 'Little Stars Nursery',
    description: 'Registered name of the business or partner store',
  })
  @IsString()
  @IsNotEmpty()
  businessName!: string;

  @ApiPropertyOptional({
    example: 'Leading early childhood education and care services in Dubai.',
    description: 'Short description of the business and its offerings',
  })
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiProperty({
    example: 'hello@business.com',
    description: 'Official business email (used as the vendor login email)',
    format: 'email',
  })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    example: '+44 7700 900000',
    description: 'Business contact phone number',
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({
    example: 'SecureVendor@123',
    description: 'Account password (minimum 6 characters)',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiPropertyOptional({
    example: 'Supermarket',
    description: 'Business category (e.g. Supermarket, Agro/Farming, General Store, etc.)',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Business brand logo image file (PNG/JPG) or URL',
  })
  @IsOptional()
  logo?: any;

  // ------------------------------------------------------
  // Step 3: Business Location
  // ------------------------------------------------------
  @ApiProperty({
    example: 'United Arab Emirates',
    description: 'Country where the business is registered',
  })
  @IsString()
  @IsNotEmpty()
  country!: string;

  @ApiProperty({
    example: 'Dubai',
    description: 'City where the business is based',
  })
  @IsString()
  @IsNotEmpty()
  city!: string;

  @ApiPropertyOptional({
    example: '123 High Street, Business Bay',
    description: 'Detailed street address',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    example: 'Mon–Fri 9:00–18:00',
    description: 'Store operational opening hours',
  })
  @IsOptional()
  @IsString()
  openingHours?: string;

  // ------------------------------------------------------
  // Step 4: Contact Information
  // ------------------------------------------------------
  @ApiProperty({
    example: 'Jane Smith',
    description: 'Full name of the authorized contact person or owner',
  })
  @IsString()
  @IsNotEmpty()
  contactPerson!: string;

  @ApiPropertyOptional({
    example: 'Store Manager',
    description: 'Role or designation of the contact person',
  })
  @IsOptional()
  @IsString()
  contactRole?: string;

  @ApiProperty({
    example: 'jane@business.com',
    description: 'Direct email of the contact person',
    format: 'email',
  })
  @IsEmail()
  contactEmail!: string;

  @ApiProperty({
    example: '+44 7700 900001',
    description: 'Direct mobile phone number of the contact person',
  })
  @IsString()
  @IsNotEmpty()
  contactPhone!: string;
}
