import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class SaveCardDto {
  @ApiProperty({
    example: 'Aoife Turner',
    description: 'Cardholder full name as printed on the card',
  })
  @IsString()
  @IsNotEmpty()
  cardholderName!: string;

  @ApiProperty({
    example: '4242 4242 4242 8892',
    description: '12 to 19 digit credit or debit card number',
  })
  @IsString()
  @IsNotEmpty()
  cardNumber!: string;

  @ApiProperty({
    example: '08/29',
    description: 'Expiry date in MM/YY format',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(0[1-9]|1[0-2])\/?([0-9]{2})$/, {
    message: 'Expiry must be in MM/YY format (e.g. 08/29)',
  })
  expiry!: string;

  @ApiProperty({
    example: '382',
    description: 'Card verification code (CVV/CVC, 3 or 4 digits)',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{3,4}$/, {
    message: 'CVV must be 3 or 4 digits',
  })
  cvv!: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether to set this card as the default settlement payment method',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
