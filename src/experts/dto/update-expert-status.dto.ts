import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserStatus } from '../../generated/prisma/enums.js';

export class UpdateExpertStatusDto {
  @ApiProperty({
    enum: UserStatus,
    example: UserStatus.ACTIVE,
    description: 'Expert status (ACTIVE, INACTIVE, SUSPENDED)',
  })
  @IsNotEmpty()
  @IsEnum(UserStatus)
  status: UserStatus;
}
