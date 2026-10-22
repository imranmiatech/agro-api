import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateContactDto {
  @ApiProperty({ example: 'Tanvir Ahmed', description: 'Full name of the user/farmer' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'tanvir@example.com', description: 'Email address of the sender' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ example: '+880 1712-345678', description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    example: 'Soil Testing Request',
    description: 'Topic or subject of inquiry',
  })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({
    example: 'I would like to schedule a professional soil pH & NPK nutrient analysis for my 5-acre paddy field.',
    description: 'Inquiry details and message body',
  })
  @IsString()
  @IsNotEmpty()
  message: string;
}
