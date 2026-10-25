import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { OverviewService } from './overview.service.js';
import { ResponseMessage } from '../common/decorators/response-message.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard.js';

@ApiTags('Overview')
@Controller()
export class OverviewController {
  constructor(private readonly overviewService: OverviewService) {}

  /**
   * 1. GET /admin/overview/platform-metrics or /platform-metrics
   */
  @Get([
    'admin/overview/platform-metrics',
    'platform-metrics',
    'overview/platform-metrics'
  ])
  @ResponseMessage('Platform overview metrics retrieved successfully')
  @ApiOperation({
    summary: 'Get 8 platform overview metric cards',
    description: 'Returns live counts for users, vendors, support tickets, and revenue with change trends.',
  })
  async getPlatformMetrics() {
    return this.overviewService.getPlatformMetrics();
  }

  /**
   * 2. GET /admin/overview/revenue-growth or /revenue-growth
   */
  @Get([
    'admin/overview/revenue-growth',
    'revenue-growth',
    'overview/revenue-growth'
  ])
  @ResponseMessage('Revenue and growth analytics retrieved successfully')
  @ApiOperation({
    summary: 'Get revenue & user growth analytics for charts',
    description: 'Returns MRR, ARR, Avg Plan, monthly revenue curve, and timeframe-based user growth data.',
  })
  @ApiQuery({ name: 'timeframe', required: false, enum: ['7D', '30D', '6M', '12M'] })
  async getRevenueAndGrowth(
    @Query('timeframe') timeframe?: '7D' | '30D' | '6M' | '12M',
  ) {
    return this.overviewService.getRevenueAndGrowth(timeframe || '30D');
  }

  /**
   * 3. GET /vendor/overview or /overview/vendor
   */
  @Get([
    'vendor/overview',
    'overview/vendor',
    'admin/overview/vendor'
  ])
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Vendor overview metrics and activity retrieved successfully')
  @ApiOperation({
    summary: 'Get Vendor Overview Dashboard (Metrics, Revenue Trend & Activity)',
    description:
      'Returns dynamic live overview data for the authenticated vendor: Products count, Total Sales in BDT, Total Orders, 7-Month Revenue Curve, and Recent Activity Feed.',
  })
  async getVendorOverview(@CurrentUser() user: AuthenticatedUser) {
    return this.overviewService.getVendorOverview(user);
  }
}
