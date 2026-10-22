import { ApiProperty } from '@nestjs/swagger';

export class DivisionBreakdownItemDto {
  @ApiProperty({ example: 'Dhaka', description: 'Name of the division in Bangladesh' })
  name!: string;

  @ApiProperty({ example: 9, description: 'Number of partners operating in this division' })
  count!: number;

  @ApiProperty({ example: 24.32, description: 'Percentage of total partners in this division' })
  percentage!: number;

  @ApiProperty({
    example: '#059669',
    description: 'Hex color used for the Donut Chart ring segment and division indicator',
  })
  color!: string;

  @ApiProperty({
    example: 100,
    description: 'Relative progress bar width percentage (count / maxDivisionCount * 100)',
  })
  percentWidth!: number;
}

export class PartnerDivisionsResponseDto {
  @ApiProperty({ example: 'Partners by Division', description: 'Card section header' })
  title!: string;

  @ApiProperty({ example: 37, description: 'Total partner count displayed in the center of the Donut Chart' })
  totalPartners!: number;

  @ApiProperty({
    type: [DivisionBreakdownItemDto],
    description: 'Breakdown of partner counts and chart styling across all 8 divisions of Bangladesh',
  })
  divisions!: DivisionBreakdownItemDto[];

  @ApiProperty({
    example: {
      Dhaka: 9,
      Chattogram: 7,
      Rajshahi: 5,
      Khulna: 4,
      Barishal: 3,
      Sylhet: 4,
      Rangpur: 3,
      Mymensingh: 2,
    },
    description: 'Key-value map of division names to partner counts',
  })
  countsByDivision!: Record<string, number>;
}
