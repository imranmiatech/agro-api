import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { ContentStatusInput } from './create-article.dto.js';

export class UpdateArticleStatusDto {
  @ApiProperty({
    example: 'Published',
    description: 'Updated publication status for the article: Published, Draft, PUBLISHED, DRAFT, ARCHIVED',
    enum: ContentStatusInput,
  })
  @IsNotEmpty()
  @IsEnum(ContentStatusInput)
  status: string;
}
