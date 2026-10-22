import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { SoilTestsService } from './soil-tests.service.js';
import { ResponseMessage } from '../common/decorators/response-message.decorator.js';

@ApiTags('Soil Tests')
@Controller('soil-tests')
export class SoilTestsController {
  constructor(private readonly soilTestsService: SoilTestsService) {}

  @Get()
  @ResponseMessage('Soil test requests retrieved successfully')
  @ApiOperation({
    summary: 'Get all soil test requests',
  })
  async findAll() {
    return this.soilTestsService.findAll();
  }

  @Get(':id')
  @ResponseMessage('Soil test request retrieved successfully')
  @ApiOperation({
    summary: 'Get soil test request by ID',
  })
  @ApiParam({ name: 'id', description: 'Soil test ID' })
  async findOne(@Param('id') id: string) {
    return this.soilTestsService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Soil test booked successfully')
  @ApiOperation({
    summary: 'Submit new soil test request',
  })
  async create(@Body() dto: any) {
    return this.soilTestsService.create(dto);
  }

  @Patch(':id/status')
  @ResponseMessage('Soil test status updated')
  @ApiOperation({
    summary: 'Update soil test status (Pending Pickup, Sample Collected, Lab Testing, Completed)',
  })
  @ApiParam({ name: 'id', description: 'Soil test ID' })
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.soilTestsService.updateStatus(id, status);
  }

  @Post(':id/publish-report')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Lab report published successfully')
  @ApiOperation({
    summary: 'Publish lab report with parameters, fertilizer plan, and recommendations',
  })
  @ApiParam({ name: 'id', description: 'Soil test ID' })
  async publishReport(@Param('id') id: string, @Body() reportData: any) {
    return this.soilTestsService.publishReport(id, reportData);
  }
}
