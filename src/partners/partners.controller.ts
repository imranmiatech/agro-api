import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PartnersService } from './partners.service.js';
import { PartnerMetricsResponseDto } from './dto/partner-metrics.dto.js';
import { PartnerDivisionsResponseDto } from './dto/partner-divisions.dto.js';
import { PartnerAttentionRequiredResponseDto } from './dto/partner-attention-required.dto.js';
import { QueryPartnerRequestsDto } from './dto/query-partner-requests.dto.js';
import { UpdatePartnerStatusDto } from './dto/update-partner-status.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ResponseMessage } from '../common/decorators/response-message.decorator.js';

@ApiTags('Partners')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('partners')
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  /**
   * 1. Overview Top Metric Cards (Total Partners & Approved partners)
   */
  @Get('metrics')
  @ResponseMessage('Partner overview metrics retrieved successfully')
  @ApiOperation({
    summary: '1. Get Overview Metrics (Total Partners & Approved Partners)',
    description:
      'Provides top metric cards from the database: Total Partners and Approved partners with dynamic growth trend percentages.',
  })
  @ApiResponse({
    status: 200,
    description: 'Metrics retrieved successfully',
    type: PartnerMetricsResponseDto,
  })
  async getMetrics(): Promise<PartnerMetricsResponseDto> {
    return this.partnersService.getPartnerMetrics();
  }

  /**
   * 2. Overview Partners by Division
   */
  @Get('by-division')
  @ResponseMessage('Partners by division retrieved successfully')
  @ApiOperation({
    summary: '2. Get Partners by Division (Donut Chart & Distribution)',
    description:
      'Provides live distribution of partners across Bangladesh divisions with counts, percentages, progress bar widths, and chart colors.',
  })
  @ApiResponse({
    status: 200,
    description: 'Division breakdown retrieved successfully',
    type: PartnerDivisionsResponseDto,
  })
  async getByDivision(): Promise<PartnerDivisionsResponseDto> {
    return this.partnersService.getPartnersByDivision();
  }

  /**
   * 3. Overview Attention Required Banner
   */
  @Get('attention-required')
  @ResponseMessage('Attention required alert retrieved successfully')
  @ApiOperation({
    summary: '3. Get Attention Required Alert (Pending Partnership Requests)',
    description:
      'Provides the Attention Required banner data with the live count of pending partnership applications awaiting admin review.',
  })
  @ApiResponse({
    status: 200,
    description: 'Attention required alert retrieved successfully',
    type: PartnerAttentionRequiredResponseDto,
  })
  async getAttentionRequired(): Promise<PartnerAttentionRequiredResponseDto> {
    return this.partnersService.getAttentionRequired();
  }

  /**
   * 4. List Partnership Requests with Pagination & Filtering
   */
  @Get('requests')
  @ResponseMessage('Partnership requests retrieved successfully')
  @ApiOperation({
    summary: '4. List Partnership Requests (Table with Pagination & Location/Status Filter)',
    description:
      'Retrieves paginated partnership applications for the admin Partnership Requests table. Supports search by business or owner name, filtering by division/location, and filtering by status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Partnership requests retrieved successfully',
  })
  async getRequests(@Query() query: QueryPartnerRequestsDto) {
    return this.partnersService.getPartnershipRequests(query);
  }

  /**
   * 5. Update Partnership Request Status
   */
  @Patch('requests/:id/status')
  @ResponseMessage('Partnership request status updated successfully')
  @ApiOperation({
    summary: '5. Update Partnership Request Status (PENDING, APPROVED, REJECTED, SUSPENDED)',
    description:
      'Updates the moderation status of a partner application from the admin review modal. Automatically activates vendor privileges when approved.',
  })
  @ApiParam({
    name: 'id',
    description: 'Partnership request / vendor profile ID',
    example: 'd36fc9a1-eb4d-48f1-947c-847bfca9073f',
  })
  @ApiResponse({
    status: 200,
    description: 'Status updated successfully',
  })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePartnerStatusDto,
  ) {
    return this.partnersService.updatePartnerStatus(id, dto);
  }
}
