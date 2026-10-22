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
import { ContentService } from './content.service.js';
import { CreateArticleDto } from './dto/create-article.dto.js';
import { UpdateArticleDto } from './dto/update-article.dto.js';
import { QueryArticleDto } from './dto/query-article.dto.js';
import { UpdateArticleStatusDto } from './dto/update-article-status.dto.js';
import { ResponseMessage } from '../common/decorators/response-message.decorator.js';

@ApiTags('Content')
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  /**
   * 1. GET /content - List all articles with search, category/status filters & pagination
   */
  @Get()
  @ResponseMessage('Articles retrieved successfully')
  @ApiOperation({
    summary: 'Get all articles',
    description:
      'Fetches articles from the database with optional search, category, status filter, and pagination.',
  })
  @ApiResponse({
    status: 200,
    description: 'Articles retrieved successfully',
  })
  async findAll(@Query() query: QueryArticleDto) {
    return this.contentService.findAll(query);
  }

  /**
   * 2. GET /content/:id - Get single article by ID or slug
   */
  @Get(':id')
  @ResponseMessage('Article details retrieved successfully')
  @ApiOperation({
    summary: 'Get article by ID or slug',
    description: 'Fetches full article details including content body and metadata.',
  })
  @ApiParam({
    name: 'id',
    description: 'Article UUID or unique slug',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Article retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Article not found',
  })
  async findOne(@Param('id') id: string) {
    return this.contentService.findOne(id);
  }

  /**
   * 3. POST /content - Create a new article
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Article created successfully')
  @ApiOperation({
    summary: 'Create a new article',
    description: 'Creates a new blog/article in the database and generates a unique slug.',
  })
  @ApiResponse({
    status: 201,
    description: 'Article created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or missing required fields',
  })
  async create(@Body() createArticleDto: CreateArticleDto) {
    return this.contentService.create(createArticleDto);
  }

  /**
   * 4. PATCH /content/:id - Edit / update an existing article
   */
  @Patch(':id')
  @ResponseMessage('Article updated successfully')
  @ApiOperation({
    summary: 'Edit / update an existing article',
    description: 'Updates fields of an article in the database.',
  })
  @ApiParam({
    name: 'id',
    description: 'Article UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Article updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Article not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateArticleDto: UpdateArticleDto,
  ) {
    return this.contentService.update(id, updateArticleDto);
  }

  /**
   * 5. PATCH /content/:id/status - Update article status (Published / Draft)
   */
  @Patch(':id/status')
  @ResponseMessage('Article status updated successfully')
  @ApiOperation({
    summary: 'Update article publication status',
    description: 'Updates article status between Published and Draft.',
  })
  @ApiParam({
    name: 'id',
    description: 'Article UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Status updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Article not found',
  })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateArticleStatusDto,
  ) {
    return this.contentService.updateStatus(id, updateStatusDto);
  }

  /**
   * 6. DELETE /content/:id - Delete an article
   */
  @Delete(':id')
  @ResponseMessage('Article deleted successfully')
  @ApiOperation({
    summary: 'Delete article',
    description: 'Deletes an article permanently from the database.',
  })
  @ApiParam({
    name: 'id',
    description: 'Article UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Article deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Article not found',
  })
  async remove(@Param('id') id: string) {
    return this.contentService.remove(id);
  }
}
