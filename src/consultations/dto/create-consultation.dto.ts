import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateConsultationDto {
  @ApiProperty({ example: 'Yellow mosaic patches on Boro paddy leaves' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiPropertyOptional({ example: 'user-uuid-1234' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ example: 'Crop Disease' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({ example: 'Boro Paddy (BRRI dhan29)' })
  @IsOptional()
  @IsString()
  crop?: string;

  @ApiPropertyOptional({ example: 'High', enum: ['Normal', 'High', 'Urgent'] })
  @IsOptional()
  @IsString()
  priority?: 'Normal' | 'High' | 'Urgent';

  @ApiProperty({ example: 'Hello doctor, my 35-day-old Boro seedlings are developing irregular pale-yellow mosaic mottling...' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ example: 'Kamal Harvey' })
  @IsOptional()
  @IsString()
  farmerName?: string;

  @ApiPropertyOptional({ example: 'kamal@example.com' })
  @IsOptional()
  @IsString()
  farmerEmail?: string;

  @ApiPropertyOptional({ example: '+880 1712-000000' })
  @IsOptional()
  @IsString()
  farmerPhone?: string;

  @ApiPropertyOptional({ type: [String], description: 'List of image URLs or base64 data URLs' })
  @IsOptional()
  @IsArray()
  attachments?: string[];
}

export class AddConsultationMessageDto {
  @ApiProperty({ example: 'user', enum: ['user', 'expert'] })
  @IsString()
  @IsNotEmpty()
  sender: 'user' | 'expert';

  @ApiProperty({ example: 'Kamal Harvey' })
  @IsString()
  @IsNotEmpty()
  senderName: string;

  @ApiPropertyOptional({ example: 'Senior Plant Pathologist' })
  @IsOptional()
  @IsString()
  senderRole?: string;

  @ApiPropertyOptional({ example: 'https://images.unsplash.com/...' })
  @IsOptional()
  @IsString()
  senderAvatar?: string;

  @ApiProperty({ example: 'Understood. What insecticide and dosage should I spray immediately?' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  attachments?: string[];

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  markResolved?: boolean;
}

export class UpdateConsultationStatusDto {
  @ApiProperty({ example: 'Resolved', enum: ['Waiting for Reply', 'Open', 'Resolved'] })
  @IsString()
  @IsNotEmpty()
  status: 'Waiting for Reply' | 'Open' | 'Resolved';
}

export class RateConsultationDto {
  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  stars: number;

  @ApiPropertyOptional({ example: 'Excellent and swift advice!' })
  @IsOptional()
  @IsString()
  comment?: string;
}
