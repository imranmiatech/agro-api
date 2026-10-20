import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'admin@gmail.com',
    description: 'Registered account email',
    format: 'email',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    example: '482910',
    description: '6-digit OTP verification code received via email',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  otpCode!: string;

  @ApiProperty({
    example: 'NewSecurePassword@123',
    description: 'New password for the account (minimum 6 characters)',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword!: string;
}
