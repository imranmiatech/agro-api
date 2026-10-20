import { ApiProperty } from '@nestjs/swagger';

export class MetricCardDto {
  @ApiProperty({ example: 'total-users' })
  id!: string;

  @ApiProperty({ example: '1,372' })
  value!: string;

  @ApiProperty({ example: 'Total Users' })
  label!: string;

  @ApiProperty({ example: '+1.85%' })
  change!: string;

  @ApiProperty({ example: true })
  isPositive!: boolean;

  @ApiProperty({ example: '#14B8A6' })
  waveColor!: string;
}

export class UserMetricsDataDto {
  @ApiProperty({ example: 1372 })
  totalUsers!: number;

  @ApiProperty({ example: 394 })
  activeToday!: number;

  @ApiProperty({ example: 47 })
  newThisWeek!: number;

  @ApiProperty({ example: 178 })
  newThisMonth!: number;

  @ApiProperty({ example: 16 })
  suspendedUsers!: number;

  @ApiProperty({
    type: [MetricCardDto],
    description: 'Direct cards payload for the Admin UserMetricsGrid component',
  })
  cards!: MetricCardDto[];

  @ApiProperty({
    example: { customer: 1100, vendor: 250, admin: 22 },
    description: 'Breakdown of user counts by system role',
  })
  byRole!: {
    customer: number;
    vendor: number;
    admin: number;
  };

  @ApiProperty({
    example: { active: 1320, inactive: 36, suspended: 16 },
    description: 'Breakdown of user counts by account status',
  })
  byStatus!: {
    active: number;
    inactive: number;
    suspended: number;
  };

  @ApiProperty({
    example: { verified: 1280, unverified: 92 },
    description: 'Breakdown by email verification status',
  })
  byVerification!: {
    verified: number;
    unverified: number;
  };
}
