import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
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

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Soil test request deleted successfully')
  @ApiOperation({
    summary: 'Delete a soil test request',
  })
  @ApiParam({ name: 'id', description: 'Soil test ID or Request Number' })
  async remove(@Param('id') id: string) {
    return this.soilTestsService.remove(id);
  }

  @Get(':id/sample-slip-pdf')
  @ApiOperation({
    summary: 'Generate and download official Soil Sample Courier Dispatch Slip PDF',
  })
  @ApiParam({ name: 'id', description: 'Soil test ID or Request Number' })
  async downloadSampleSlipPdf(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { buffer, request } =
      await this.soilTestsService.generateSampleSlipPdf(id);
    const sanitizedName = request.farmerName.replace(/\s+/g, '_');
    const filename = `SoilSampleSlip_${request.id}_${sanitizedName}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length.toString(),
    });
    return res.end(buffer);
  }

  @Get(':id/report-pdf')
  @ApiOperation({
    summary: 'Generate and download official Soil Diagnostic Lab Report PDF',
  })
  @ApiParam({ name: 'id', description: 'Soil test ID or Request Number' })
  async downloadReportPdf(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { buffer, request } =
      await this.soilTestsService.generateReportPdf(id);
    const filename = `KrishiKunjo_Soil_Test_Report_${request.id}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length.toString(),
    });
    return res.end(buffer);
  }
}
