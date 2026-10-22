import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export enum ContentStatusInput {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
  Draft = 'Draft',
  Published = 'Published',
}

export class CreateArticleDto {
  @ApiProperty({
    example: 'Wind Power: A Breath of Fresh Air for Clean Energy Enthusiasts',
    description: 'Headline title of the article',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    example: 'Clean Energy',
    description: 'Category of the content (e.g. Clean Energy, AgriTech, Biomass Energy)',
  })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({
    example: 'In a world striving for green innovation, wind energy emerges as a vital clean energy source driving modern farming.',
    description: 'Short summary/excerpt of the article',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 'Detailed markdown or HTML article content...',
    description: 'Full body content of the article',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    example: 'https://images.unsplash.com/photo-1592417817098-8f3d69109853?w=800&auto=format&fit=crop&q=80',
    description: 'Cover image URL for article thumbnail/hero header',
  })
  @IsString()
  @IsOptional()
  coverImage?: string;

  @ApiPropertyOptional({
    example: '7 min read',
    description: 'Estimated reading duration',
    default: '5 min read',
  })
  @IsString()
  @IsOptional()
  readTime?: string;

  @ApiPropertyOptional({
    example: 'James Watson',
    description: 'Author full name',
    default: 'KrishiKunjo Contributor',
  })
  @IsString()
  @IsOptional()
  authorName?: string;

  @ApiPropertyOptional({
    example: 'Clean Energy Executive',
    description: 'Author role or job title',
    default: 'Agronomy Specialist',
  })
  @IsString()
  @IsOptional()
  authorRole?: string;

  @ApiPropertyOptional({
    example: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    description: 'Author avatar photo URL',
  })
  @IsString()
  @IsOptional()
  authorAvatar?: string;

  @ApiPropertyOptional({
    example: 'Published',
    description: 'Publication status (Published, Draft, DRAFT, PUBLISHED)',
    enum: ContentStatusInput,
    default: 'Draft',
  })
  @IsOptional()
  @IsEnum(ContentStatusInput)
  status?: string;
}
