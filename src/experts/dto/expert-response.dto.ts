import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExpertResponseDto {
  @ApiProperty({ example: 'b94e77da-085e-49fb-8561-1ff5733f52da' })
  id: string;

  @ApiProperty({ example: 'Dr. Tariqul Islam' })
  name: string;

  @ApiProperty({ example: 'tariqul.agri@krishikunjo.com' })
  email: string;

  @ApiPropertyOptional({ example: '+880 1712-345678' })
  phone?: string;

  @ApiProperty({ example: 'EXPERT' })
  role: string;

  @ApiProperty({ example: 'Crop Disease & Pest Management' })
  specialization: string;

  @ApiProperty({ example: 'Senior Plant Pathologist' })
  designation: string;

  @ApiProperty({ example: '12 years' })
  experienceYears: string;

  @ApiPropertyOptional({ example: 'Specialized in rice blast...' })
  bio?: string;

  @ApiPropertyOptional({ example: 'https://images.unsplash.com/...' })
  avatar?: string;

  @ApiProperty({ example: 'ACTIVE' })
  status: string;

  @ApiProperty({ example: true })
  isAvailableForSupport: boolean;

  @ApiProperty({ example: 42 })
  assignedTicketsCount: number;

  @ApiProperty({ example: 4.9 })
  rating: number;

  @ApiProperty({ example: '2024-03-15T09:00:00.000Z' })
  createdAt: string;
}

export class ExpertMetricsDto {
  @ApiProperty({ example: 4 })
  totalExperts: number;

  @ApiProperty({ example: 3 })
  activeSupport: number;

  @ApiProperty({ example: 154 })
  totalTickets: number;

  @ApiProperty({ example: 4.9 })
  averageRating: number;
}
