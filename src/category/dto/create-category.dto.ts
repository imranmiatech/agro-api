import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Seeds & Seedlings', description: 'Category name' })
  @IsNotEmpty({ message: 'Category name is required' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'seeds-seedlings', description: 'URL slug' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: 'High quality agricultural seeds and seedlings' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'Category image file' })
  @IsOptional()
  image?: any;
}
