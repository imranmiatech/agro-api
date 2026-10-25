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
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConsultationsService } from './consultations.service.js';
import {
  CreateConsultationDto,
  AddConsultationMessageDto,
  UpdateConsultationStatusDto,
  RateConsultationDto,
} from './dto/create-consultation.dto.js';
import { ResponseMessage } from '../common/decorators/response-message.decorator.js';

@ApiTags('Consultations')
@Controller('consultations')
export class ConsultationsController {
  constructor(private readonly consultationsService: ConsultationsService) {}

  /**
   * 1. GET /consultations - Get all consultation tickets
   */
  @Get()
  @ResponseMessage('Consultations retrieved successfully')
  @ApiOperation({
    summary: 'Get all consultation tickets',
    description: 'Returns consultation tickets and conversations from the database.',
  })
  async findAll() {
    return this.consultationsService.findAll();
  }

  /**
   * GET /consultations/stats - Get consultation ticket statistics
   */
  @Get('stats')
  @ResponseMessage('Consultation statistics retrieved successfully')
  @ApiOperation({
    summary: 'Get consultation ticket statistics and total count',
    description: 'Returns count of total tickets, waiting tickets, and resolved tickets.',
  })
  async getStats() {
    return this.consultationsService.getStats();
  }

  /**
   * 2. GET /consultations/:id - Get single consultation ticket by ID
   */
  @Get(':id')
  @ResponseMessage('Consultation details retrieved successfully')
  @ApiOperation({
    summary: 'Get consultation ticket by ID',
    description: 'Returns full conversation history of a specific consultation ticket.',
  })
  @ApiParam({ name: 'id', description: 'Consultation Ticket UUID' })
  async findOne(@Param('id') id: string) {
    return this.consultationsService.findOne(id);
  }

  /**
   * 3. POST /consultations - Create a new consultation ticket
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Consultation ticket created successfully')
  @ApiOperation({
    summary: 'Create new consultation ticket',
    description: 'Farmer opens a new support inquiry with an expert.',
  })
  async create(@Body() dto: CreateConsultationDto) {
    return this.consultationsService.create(dto);
  }

  /**
   * 4. POST /consultations/:id/messages - Post message to conversation
   */
  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Message sent successfully')
  @ApiOperation({
    summary: 'Send message in consultation conversation',
    description: 'Farmer or Expert adds a new reply to the ticket.',
  })
  @ApiParam({ name: 'id', description: 'Consultation Ticket UUID' })
  async addMessage(
    @Param('id') id: string,
    @Body() dto: AddConsultationMessageDto,
  ) {
    return this.consultationsService.addMessage(id, dto);
  }

  /**
   * 5. PATCH /consultations/:id/status - Update ticket status
   */
  @Patch(':id/status')
  @ResponseMessage('Consultation status updated successfully')
  @ApiOperation({
    summary: 'Update consultation ticket status',
    description: 'Change status to Waiting for Reply, Open, or Resolved.',
  })
  @ApiParam({ name: 'id', description: 'Consultation Ticket UUID' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateConsultationStatusDto,
  ) {
    return this.consultationsService.updateStatus(id, dto);
  }

  /**
   * 6. PATCH /consultations/:id/seen - Mark ticket as seen by expert
   */
  @Patch(':id/seen')
  @ResponseMessage('Consultation marked as seen successfully')
  @ApiOperation({
    summary: 'Mark consultation ticket as seen',
    description: 'When expert opens ticket, status changes from Waiting for Reply to Open. Does not toggle repeatedly.',
  })
  @ApiParam({ name: 'id', description: 'Consultation Ticket UUID' })
  async markAsSeen(@Param('id') id: string) {
    return this.consultationsService.markAsSeen(id);
  }

  /**
   * 7. DELETE /consultations/:id - Delete consultation ticket
   */
  @Delete(':id')
  @ResponseMessage('Consultation ticket deleted successfully')
  @ApiOperation({
    summary: 'Delete consultation ticket',
    description: 'Expert or user deletes a consultation ticket and all its messages.',
  })
  @ApiParam({ name: 'id', description: 'Consultation Ticket UUID' })
  async delete(@Param('id') id: string) {
    return this.consultationsService.delete(id);
  }

  /**
   * 8. POST /consultations/:id/rate - Rate a resolved consultation
   */
  @Post(':id/rate')
  @ResponseMessage('Consultation rated successfully')
  @ApiOperation({
    summary: 'Rate consultation advice',
    description: 'Farmer leaves 1-5 star review and comment for expert.',
  })
  @ApiParam({ name: 'id', description: 'Consultation Ticket UUID' })
  async rate(
    @Param('id') id: string,
    @Body() dto: RateConsultationDto,
  ) {
    return this.consultationsService.rate(id, dto);
  }
}

