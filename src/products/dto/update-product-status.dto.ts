import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { ProductStatus } from '../../generated/prisma/enums.js';

export class UpdateProductStatusDto {
  @ApiProperty({
    enum: ProductStatus,
    description: 'Updated product status: ACTIVE, SUSPENDED, or OUT_OF_STOCK',
    example: ProductStatus.ACTIVE,
  })
  @IsNotEmpty()
  @IsEnum(ProductStatus)
  status!: ProductStatus;
}
