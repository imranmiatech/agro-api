import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateExpertDto } from './create-expert.dto.js';
import { IsBoolean, IsNumber, IsOptional } from 'class-validator';

export class UpdateExpertDto extends PartialType(CreateExpertDto) {
  @ApiPropertyOptional({ example: true, description: 'Live support availability' })
  @IsOptional()
  @IsBoolean()
  isAvailableForSupport?: boolean;

  @ApiPropertyOptional({ example: 4.9, description: 'Expert performance rating' })
  @IsOptional()
  @IsNumber()
  rating?: number;

  @ApiPropertyOptional({ example: 10, description: 'Total assigned support tickets' })
  @IsOptional()
  @IsNumber()
  assignedTicketsCount?: number;
}
