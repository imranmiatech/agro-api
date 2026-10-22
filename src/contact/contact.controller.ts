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
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ContactService } from './contact.service.js';
import { CreateContactDto } from './dto/create-contact.dto.js';
import { QueryContactDto } from './dto/query-contact.dto.js';
import { UpdateContactStatusDto } from './dto/update-contact-status.dto.js';
import { ContactMetricsDto, ContactResponseDto } from './dto/contact-response.dto.js';
import { ResponseMessage } from '../common/decorators/response-message.decorator.js';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  /**
   * 1. Public contact form submission
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Your message has been sent successfully. Please check your email for confirmation.')
  @ApiOperation({
    summary: 'Submit contact inquiry (Public)',
    description: 'Public endpoint for website contact form. Stores inquiry in the database and automatically dispatches a confirmation email to the user.',
  })
  @ApiResponse({
    status: 201,
    description: 'Contact inquiry submitted successfully',
    type: ContactResponseDto,
  })
  async create(@Body() dto: CreateContactDto) {
    return this.contactService.create(dto);
  }

  /**
   * 2. Overview metrics for Admin Contact Inquiries
   */
  @Get('metrics')
  @ResponseMessage('Contact metrics retrieved successfully')
  @ApiOperation({
    summary: 'Get contact inquiry metrics',
    description: 'Returns total, pending, in-progress, and resolved inquiry counts directly from database.',
  })
  @ApiResponse({
    status: 200,
    description: 'Contact metrics retrieved successfully',
    type: ContactMetricsDto,
  })
  async getMetrics() {
    return this.contactService.getMetrics();
  }

  /**
   * 3. List contact inquiries for Admin
   */
  @Get()
  @ResponseMessage('Contact inquiries retrieved successfully')
  @ApiOperation({
    summary: 'List contact inquiries',
    description: 'Returns paginated contact inquiries with optional search and status filter.',
  })
  @ApiResponse({
    status: 200,
    description: 'Contact inquiries retrieved successfully',
  })
  async findAll(@Query() query: QueryContactDto) {
    return this.contactService.findAll(query);
  }

  /**
   * 4. Get single contact inquiry by ID
   */
  @Get(':id')
  @ResponseMessage('Contact inquiry details retrieved successfully')
  @ApiOperation({
    summary: 'Get single contact inquiry details',
    description: 'Retrieves full details of a specific contact inquiry.',
  })
  @ApiParam({
    name: 'id',
    description: 'Contact inquiry UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Contact inquiry retrieved successfully',
    type: ContactResponseDto,
  })
  async findOne(@Param('id') id: string) {
    return this.contactService.findOne(id);
  }

  /**
   * 5. Update inquiry status and reply notes (Triggers resolution email to user)
   */
  @Patch(':id/status')
  @ResponseMessage('Inquiry status updated successfully')
  @ApiOperation({
    summary: 'Update inquiry status & resolution note',
    description: 'Updates inquiry status (PENDING, IN_PROGRESS, RESOLVED, SPAM). Dispatches an email notification to the user upon resolution.',
  })
  @ApiParam({
    name: 'id',
    description: 'Contact inquiry UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Status updated successfully',
    type: ContactResponseDto,
  })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateContactStatusDto,
  ) {
    return this.contactService.updateStatus(id, dto);
  }

  /**
   * 6. Delete inquiry
   */
  @Delete(':id')
  @ResponseMessage('Contact inquiry removed successfully')
  @ApiOperation({
    summary: 'Delete contact inquiry',
    description: 'Permanently removes inquiry from the database.',
  })
  @ApiParam({
    name: 'id',
    description: 'Contact inquiry UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Contact inquiry deleted successfully',
  })
  async remove(@Param('id') id: string) {
    return this.contactService.remove(id);
  }
}
