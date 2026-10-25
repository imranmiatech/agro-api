import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CategoryService } from './category.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { ResponseMessage } from '../common/decorators/response-message.decorator.js';
import { imageFileFilter } from '../common/upload/multer.config.js';

@ApiTags('Categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new dynamic product category' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({ type: CreateCategoryDto })
  @ApiResponse({ status: 201, description: 'Category created successfully.' })
  @ResponseMessage('Category created successfully')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      fileFilter: imageFileFilter,
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async create(
    @Body() dto: CreateCategoryDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.categoryService.create(dto, file);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all categories with total dynamic product count' })
  @ApiQuery({
    name: 'includeCount',
    required: false,
    type: Boolean,
    description: 'Whether to include real-time product count per category',
  })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully.' })
  @ResponseMessage('Categories retrieved successfully')
  async findAll(@Query('includeCount') includeCount?: string) {
    const shouldCount = includeCount !== 'false';
    return this.categoryService.findAll(shouldCount);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get single category details by ID' })
  @ApiResponse({ status: 200, description: 'Category retrieved successfully.' })
  @ResponseMessage('Category retrieved successfully')
  async findOne(@Param('id') id: string) {
    return this.categoryService.findOne(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a category by ID' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully.' })
  @ResponseMessage('Category deleted successfully')
  async remove(@Param('id') id: string) {
    return this.categoryService.remove(id);
  }
}