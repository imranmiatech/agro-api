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
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ExpertsService } from './experts.service.js';
import { CreateExpertDto } from './dto/create-expert.dto.js';
import { UpdateExpertDto } from './dto/update-expert.dto.js';
import { QueryExpertDto } from './dto/query-expert.dto.js';
import { UpdateExpertStatusDto } from './dto/update-expert-status.dto.js';
import { ExpertMetricsDto, ExpertResponseDto } from './dto/expert-response.dto.js';
import { ResponseMessage } from '../common/decorators/response-message.decorator.js';

@ApiTags('Experts')
@Controller('experts')
export class ExpertsController {
  constructor(private readonly expertsService: ExpertsService) {}

  /**
   * 1. GET /experts/metrics - Overview metrics for expert management
   */
  @Get('metrics')
  @ResponseMessage('Expert metrics retrieved successfully')
  @ApiOperation({
    summary: 'Get expert system metrics',
    description: 'Returns total experts count, live support availability, total tickets, and average rating.',
  })
  @ApiResponse({
    status: 200,
    description: 'Expert metrics retrieved successfully',
    type: ExpertMetricsDto,
  })
  async getMetrics() {
    return this.expertsService.getMetrics();
  }

  /**
   * 2. GET /experts - List experts with search, specialization & status filters
   */
  @Get()
  @ResponseMessage('Experts retrieved successfully')
  @ApiOperation({
    summary: 'Get all agricultural experts',
    description: 'Fetches certified experts from the database with search, specialization filter, and status filter.',
  })
  @ApiResponse({
    status: 200,
    description: 'Experts retrieved successfully',
    type: [ExpertResponseDto],
  })
  async findAll(@Query() query: QueryExpertDto) {
    return this.expertsService.findAll(query);
  }

  /**
   * 3. GET /experts/:id - Get single expert by ID
   */
  @Get(':id')
  @ResponseMessage('Expert details retrieved successfully')
  @ApiOperation({
    summary: 'Get expert details by ID',
    description: 'Retrieves single agricultural expert profile and credentials.',
  })
  @ApiParam({
    name: 'id',
    description: 'Expert User UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Expert details retrieved successfully',
    type: ExpertResponseDto,
  })
  async findOne(@Param('id') id: string) {
    return this.expertsService.findOne(id);
  }

  /**
   * 4. POST /experts - Create new expert with login credentials
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Expert account created successfully')
  @ApiOperation({
    summary: 'Create certified expert account',
    description: 'Creates a new expert user in the database with role EXPERT and hashed login password.',
  })
  @ApiResponse({
    status: 201,
    description: 'Expert created successfully',
    type: ExpertResponseDto,
  })
  async create(@Body() dto: CreateExpertDto) {
    return this.expertsService.create(dto);
  }

  /**
   * 5. PATCH /experts/:id - Update expert profile
   */
  @Patch(':id')
  @ResponseMessage('Expert profile updated successfully')
  @ApiOperation({
    summary: 'Update expert profile',
    description: 'Updates expert contact details, specialization, designation, rating, bio, etc.',
  })
  @ApiParam({
    name: 'id',
    description: 'Expert User UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Expert profile updated successfully',
    type: ExpertResponseDto,
  })
  async update(@Param('id') id: string, @Body() dto: UpdateExpertDto) {
    return this.expertsService.update(id, dto);
  }

  /**
   * 6. PATCH /experts/:id/status - Toggle or update expert status
   */
  @Patch(':id/status')
  @ResponseMessage('Expert status updated successfully')
  @ApiOperation({
    summary: 'Update expert status (ACTIVE, INACTIVE, SUSPENDED)',
    description: 'Changes status of the expert account.',
  })
  @ApiParam({
    name: 'id',
    description: 'Expert User UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Expert status updated successfully',
    type: ExpertResponseDto,
  })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateExpertStatusDto,
  ) {
    return this.expertsService.updateStatus(id, dto);
  }

  /**
   * 7. DELETE /experts/:id - Remove expert
   */
  @Delete(':id')
  @ResponseMessage('Expert removed successfully')
  @ApiOperation({
    summary: 'Delete expert account',
    description: 'Permanently removes the expert and their profile from the database.',
  })
  @ApiParam({
    name: 'id',
    description: 'Expert User UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Expert removed successfully',
  })
  async remove(@Param('id') id: string) {
    return this.expertsService.remove(id);
  }
}
