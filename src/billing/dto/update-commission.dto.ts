import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Max, Min } from 'class-validator';

export class UpdateCommissionDto {
  @ApiProperty({
    example: 5.0,
    description: 'Admin platform commission percentage per product sale (0 to 100)',
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionPercentage: number;
}
