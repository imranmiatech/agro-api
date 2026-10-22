import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ContactStatus } from '../../generated/prisma/enums.js';

export class UpdateContactStatusDto {
  @ApiProperty({
    enum: ContactStatus,
    example: ContactStatus.RESOLVED,
    description: 'Updated inquiry moderation status',
  })
  @IsNotEmpty()
  @IsEnum(ContactStatus)
  status: ContactStatus;

  @ApiPropertyOptional({
    example: 'Our agronomist team has scheduled a field visit on October 25th.',
    description: 'Optional resolution message or email response sent to the customer',
  })
  @IsOptional()
  @IsString()
  replyMessage?: string;
}
