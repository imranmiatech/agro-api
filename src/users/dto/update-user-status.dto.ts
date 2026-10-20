import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserStatus } from '../../generated/prisma/enums.js';

export class UpdateUserStatusDto {
  @ApiProperty({
    enum: UserStatus,
    description: 'New status for the user account',
    example: UserStatus.ACTIVE,
  })
  @IsNotEmpty()
  @IsEnum(UserStatus)
  status!: UserStatus;
}
