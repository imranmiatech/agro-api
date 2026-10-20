import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'OldPass@123',
    description: 'Current password for verification',
  })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({
    example: 'NewSecurePass@2026',
    description: 'New password containing at least 6 characters',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  newPassword!: string;
}
