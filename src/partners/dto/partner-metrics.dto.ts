import { ApiProperty } from '@nestjs/swagger';

export class MetricTrendDto {
  @ApiProperty({ example: '+7.1%', description: 'Formatted percentage change string' })
  change!: string;

  @ApiProperty({ example: 7.1, description: 'Numeric percentage value' })
  percentage!: number;

  @ApiProperty({ example: true, description: 'Whether the trend direction is positive/growing' })
  isPositive!: boolean;

  @ApiProperty({ example: 'vs last month', description: 'Comparison timeframe' })
  timeframe!: string;
}

export class PartnerMetricCardDto {
  @ApiProperty({ example: 'total-partners', description: 'Unique card identifier' })
  id!: string;

  @ApiProperty({ example: 'Total Partners', description: 'Card title' })
  title!: string;

  @ApiProperty({ example: 'Total Partners', description: 'Display label' })
  label!: string;

  @ApiProperty({ example: 37, description: 'Numeric count value' })
  value!: number;

  @ApiProperty({ example: '37', description: 'Formatted display value string' })
  formattedValue!: string;

  @ApiProperty({ example: '+7.1%', description: 'Formatted percentage change indicator' })
  change!: string;

  @ApiProperty({ example: 7.1, description: 'Numeric percentage change value' })
  changePercentage!: number;

  @ApiProperty({ example: true, description: 'Whether trend is positive' })
  isPositive!: boolean;

  @ApiProperty({ example: '#16A34A', description: 'Hex color for bottom status indicator bar' })
  accentColor!: string;

  @ApiProperty({ example: 'trending-up', description: 'Icon identifier matching UI card' })
  icon!: string;
}

export class PartnerMetricsResponseDto {
  @ApiProperty({ example: 4, description: 'Total partner applications / businesses registered' })
  totalPartners!: number;

  @ApiProperty({ example: 1, description: 'Total approved partner businesses' })
  approvedPartners!: number;

  @ApiProperty({ example: 0, description: 'Number of active products / offers', required: false })
  activeOffers?: number;

  @ApiProperty({ type: MetricTrendDto, description: 'Growth trend for total partners' })
  partnersTrend!: MetricTrendDto;

  @ApiProperty({ type: MetricTrendDto, description: 'Growth trend for approved partners' })
  approvedTrend!: MetricTrendDto;

  @ApiProperty({ type: MetricTrendDto, description: 'Growth trend for offers (backward compatibility)', required: false })
  offersTrend?: MetricTrendDto;

  @ApiProperty({
    type: [PartnerMetricCardDto],
    description: 'Formatted metric cards array ready for direct UI rendering',
  })
  cards!: PartnerMetricCardDto[];
}
