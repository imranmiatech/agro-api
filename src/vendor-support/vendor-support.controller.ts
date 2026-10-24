import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { VendorSupportService } from './vendor-support.service.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { CreateTicketMessageDto } from './dto/create-ticket-message.dto.js';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto.js';
import { QueryTicketsDto } from './dto/query-tickets.dto.js';

@ApiTags('Vendor Support')
@Controller('vendor-support')
export class VendorSupportController {
  constructor(private readonly vendorSupportService: VendorSupportService) {}

  @Get('tickets')
  @ApiOperation({ summary: 'List all vendor support tickets with optional filters' })
  async getTickets(@Query() query: QueryTicketsDto) {
    const tickets = await this.vendorSupportService.findAll(query);
    return {
      success: true,
      message: 'Tickets retrieved successfully',
      data: tickets,
    };
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Get details and conversation of a ticket' })
  async getTicketById(@Param('id') id: string) {
    const ticket = await this.vendorSupportService.findOne(id);
    return {
      success: true,
      message: 'Ticket details retrieved successfully',
      data: ticket,
    };
  }

  @Post('tickets')
  @ApiOperation({ summary: 'Create a new ticket to admin' })
  async createTicket(@Body() dto: CreateTicketDto) {
    const ticket = await this.vendorSupportService.createTicket(dto);
    return {
      success: true,
      message: 'Ticket created successfully',
      data: ticket,
    };
  }

  @Post('tickets/:id/messages')
  @ApiOperation({ summary: 'Send a reply/message in ticket conversation' })
  async addMessage(
    @Param('id') id: string,
    @Body() dto: CreateTicketMessageDto,
  ) {
    const ticket = await this.vendorSupportService.addMessage(id, dto);
    return {
      success: true,
      message: 'Message added successfully',
      data: ticket,
    };
  }

  @Patch('tickets/:id/status')
  @ApiOperation({ summary: 'Update ticket status (Open, In Review, Resolved)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    const ticket = await this.vendorSupportService.updateStatus(id, dto);
    return {
      success: true,
      message: 'Ticket status updated successfully',
      data: ticket,
    };
  }

  @Delete('tickets/:id')
  @ApiOperation({ summary: 'Delete a ticket' })
  async deleteTicket(@Param('id') id: string) {
    const result = await this.vendorSupportService.deleteTicket(id);
    return {
      success: true,
      message: 'Ticket deleted successfully',
      data: result,
    };
  }
}
