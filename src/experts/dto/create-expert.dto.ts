import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserStatus } from '../../generated/prisma/enums.js';

export class CreateExpertDto {
  @ApiProperty({ example: 'Dr. Tariqul Islam', description: 'Full name of the agricultural expert' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'tariqul.agri@krishikunjo.com', description: 'Expert login email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ example: 'Expert123!', description: 'Initial login password (defaults to Expert@123 if not provided)' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ example: '+880 1712-345678', description: 'Direct contact phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    example: 'Crop Disease & Pest Management',
    description: 'Expert specialization area',
  })
  @IsString()
  @IsNotEmpty()
  specialization: string;

  @ApiPropertyOptional({ example: 'Senior Plant Pathologist', description: 'Professional designation' })
  @IsOptional()
  @IsString()
  designation?: string;

  @ApiPropertyOptional({ example: '12 years', description: 'Years of professional experience' })
  @IsOptional()
  experienceYears?: string | number;

  @ApiPropertyOptional({
    example: 'Specialized in rice blast, fungal leaf blight, and integrated biological pest management.',
    description: 'Expert background bio',
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({
    example: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    description: 'Avatar photo URL',
  })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({
    enum: UserStatus,
    example: UserStatus.ACTIVE,
    description: 'Account active status',
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
