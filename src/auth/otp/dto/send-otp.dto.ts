import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class SendOtpDto {
  @ApiProperty({
    example: 'hello@business.com',
    description: 'Target email address for OTP delivery',
    format: 'email',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}
