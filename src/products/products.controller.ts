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
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { JwtService } from '@nestjs/jwt';
import { ProductsService } from './products.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { UpdateProductStatusDto } from './dto/update-product-status.dto.js';
import { QueryProductDto } from './dto/query-product.dto.js';
import { ProductMetricsResponseDto } from './dto/product-metrics.dto.js';
import { Role } from '../generated/prisma/enums.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard.js';
import { ResponseMessage } from '../common/decorators/response-message.decorator.js';
import { imageFileFilter } from '../common/upload/multer.config.js';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly jwtService: JwtService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('images', 4, {
      storage: memoryStorage(),
      fileFilter: imageFileFilter,
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per image
    }),
  )
  @ApiConsumes('multipart/form-data', 'application/json')
  @ResponseMessage('Product created successfully')
  @ApiOperation({
    summary: 'Create Agriculture Product (Admin or Vendor)',
    description:
      'Creates a new product with details (name, category, price, stock, highlights, badges, specifications). Supports up to 4 multipart images uploaded directly to Cloudinary or JSON image URLs.',
  })
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data or more than 4 images' })
  @ApiResponse({ status: 403, description: 'Only approved vendors and admins can create products' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProductDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.productsService.createProduct(user, dto, files);
  }

  @Get()
  @ResponseMessage('Products retrieved successfully')
  @ApiOperation({
    summary: 'List Products (Public, Admin, or Vendor with Filters & Pagination)',
    description:
      'Searches and filters products. When authenticated as Admin, lists all platform products; when authenticated as Vendor, lists only their own products; for public/customers, lists store catalog products.',
  })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  async findAll(@Query() query: QueryProductDto, @Req() req: Request) {
    const user = await this.extractOptionalUser(req);
    return this.productsService.findAllProducts(query, user);
  }

  @Get('metrics')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Product metrics retrieved successfully')
  @ApiOperation({
    summary: 'Get Product Metrics (Admin: Total products; Vendor: Own products)',
    description:
      'Calculates total products, active & in stock, out of stock, suspended, and growth trend matching the UI dashboard cards. Admin gets platform-wide metrics (with optional vendorId filter); Vendor gets only their own product metrics.',
  })
  @ApiQuery({
    name: 'vendorId',
    required: false,
    description: 'Optional vendor ID (Admin only) to filter metrics for a specific vendor',
  })
  @ApiResponse({
    status: 200,
    description: 'Product metrics retrieved successfully',
    type: ProductMetricsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden for customers or unauthenticated users' })
  async getMetrics(
    @CurrentUser() user: AuthenticatedUser,
    @Query('vendorId') vendorId?: string,
  ) {
    if (user.role === Role.ADMIN) {
      return this.productsService.getAdminProductMetrics(user, vendorId);
    }
    return this.productsService.getVendorProductMetrics(user);
  }

  private async extractOptionalUser(req: Request): Promise<AuthenticatedUser | null> {
    const authHeader = req.headers.authorization;
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    const token = authHeader.split(' ')[1];
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'multi_vendor_jwt_super_secret_key_2026',
      });
      return {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      } as AuthenticatedUser;
    } catch {
      return null;
    }
  }

  @Get('latest')
  @ResponseMessage('Latest collection products retrieved successfully')
  @ApiOperation({
    summary: 'Get Latest Collection Products (Public)',
    description:
      'Retrieves latest active products added by vendors / platform for the customer homepage.',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 6 })
  async getLatestProducts(@Query('limit') limit?: number) {
    return this.productsService.findLatestProducts(limit);
  }

  @Get('vendors/search')
  @ResponseMessage('Vendors list retrieved successfully')
  @ApiOperation({
    summary: 'Search Vendors for Admin Product Creation Autocomplete',
    description:
      'Retrieves approved vendors matching search query for the Admin product creation dropdown.',
  })
  @ApiQuery({ name: 'q', required: false, type: String })
  async searchVendors(@Query('q') query?: string) {
    return this.productsService.searchVendorsForAdmin(query);
  }

  @Get(':id')
  @ResponseMessage('Product retrieved successfully')
  @ApiOperation({
    summary: 'Get Product by ID or Slug (Public)',
    description: 'Retrieves complete product details including store/vendor info.',
  })
  @ApiResponse({ status: 200, description: 'Product details retrieved' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(@Param('id') id: string) {
    return this.productsService.findOneProduct(id);
  }

  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('images', 4, {
      storage: memoryStorage(),
      fileFilter: imageFileFilter,
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data', 'application/json')
  @ResponseMessage('Product updated successfully')
  @ApiOperation({
    summary: 'Update Product (Admin or Owning Vendor)',
    description: 'Updates product information and optionally uploads additional Cloudinary images.',
  })
  @ApiBody({ type: UpdateProductDto })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({ status: 403, description: 'Permission denied to edit this product' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProductDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.productsService.updateProduct(id, user, dto, files);
  }

  @Patch(':id/status')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Product status updated successfully')
  @ApiOperation({
    summary: 'Update Product Status (Admin or Owning Vendor)',
    description: 'Changes product status between ACTIVE, SUSPENDED, and OUT_OF_STOCK.',
  })
  @ApiBody({ type: UpdateProductStatusDto })
  @ApiResponse({ status: 200, description: 'Product status updated successfully' })
  @ApiResponse({ status: 403, description: 'Permission denied' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProductStatusDto,
  ) {
    return this.productsService.updateProductStatus(id, user, dto);
  }

  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Product deleted successfully')
  @ApiOperation({
    summary: 'Delete Product (Admin or Owning Vendor)',
    description: 'Permanently removes a product from the database.',
  })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  @ApiResponse({ status: 403, description: 'Permission denied' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.deleteProduct(id, user);
  }
}
