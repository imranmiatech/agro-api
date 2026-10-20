import { ApiProperty } from '@nestjs/swagger';

export class ProductMetricCardDto {
  @ApiProperty({ example: 'total-products', description: 'Unique card identifier' })
  id!: string;

  @ApiProperty({ example: 'Total Products', description: 'Card title' })
  title!: string;

  @ApiProperty({ example: 'Total Products', description: 'Display label' })
  label!: string;

  @ApiProperty({ example: 24, description: 'Numeric count value' })
  value!: number;

  @ApiProperty({ example: '24', description: 'Formatted string representation' })
  formattedValue!: string;

  @ApiProperty({ example: '+12%', required: false, description: 'Percentage change indicator' })
  change?: string;

  @ApiProperty({
    example: '+12% from last month',
    required: false,
    description: 'Human readable change text',
  })
  changeText?: string;

  @ApiProperty({
    example: '+12% from last month',
    required: false,
    description: 'Subtitle or caption displayed on the card',
  })
  subtitle?: string;

  @ApiProperty({
    example: true,
    required: false,
    description: 'Whether the change trend is positive/favorable',
  })
  isPositive?: boolean;

  @ApiProperty({
    example: 'package',
    required: false,
    description: 'Icon identifier matching UI card design',
  })
  icon?: string;
}

export class ProductMetricsResponseDto {
  @ApiProperty({ example: 24, description: 'Total number of products' })
  totalProducts!: number;

  @ApiProperty({
    example: 20,
    description: 'Products that are active and currently in stock (stock > 0)',
  })
  activeInStock!: number;

  @ApiProperty({
    example: 3,
    description: 'Products that are out of stock (stock = 0 or status OUT_OF_STOCK)',
  })
  outOfStock!: number;

  @ApiProperty({
    example: 1,
    description: 'Products suspended or held by moderation',
  })
  suspended!: number;

  @ApiProperty({
    type: [ProductMetricCardDto],
    description: 'Formatted metric cards ready for direct rendering in UI cards grid',
  })
  cards!: ProductMetricCardDto[];

  @ApiProperty({
    example: { active: 20, outOfStock: 3, suspended: 1 },
    description: 'Breakdown of products by status enum',
  })
  byStatus!: {
    active: number;
    outOfStock: number;
    suspended: number;
  };

  @ApiProperty({
    example: { inStock: 20, lowStock: 2, outOfStock: 3 },
    description: 'Breakdown of products by inventory stock levels',
  })
  byStock!: {
    inStock: number;
    lowStock: number;
    outOfStock: number;
  };

  @ApiProperty({
    example: {
      percentage: 12.0,
      changeText: '+12% from last month',
      isPositive: true,
      thisMonth: 8,
      lastMonth: 7,
    },
    description: 'Growth and trend compared to the previous 30 days',
  })
  growth!: {
    percentage: number;
    changeText: string;
    isPositive: boolean;
    thisMonth: number;
    lastMonth: number;
  };
}
