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
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { QueryOrderDto } from './dto/query-order.dto.js';
import { ResponseMessage } from '../common/decorators/response-message.decorator.js';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Order placed successfully')
  @ApiOperation({
    summary: 'Place New Order (Public / Customer)',
    description:
      'Creates a new order with items, calculates subtotal & delivery fee, processes card payment via Stripe if selected, and creates order tracking milestones.',
  })
  @ApiResponse({ status: 201, description: 'Order placed successfully' })
  async create(@Body() dto: CreateOrderDto, @Req() req: Request) {
    const userId = (req as any).user?.id || undefined;
    return this.ordersService.create(dto, userId);
  }

  @Get()
  @ResponseMessage('Orders retrieved successfully')
  @ApiOperation({
    summary: 'List Orders (Customer Orders / Admin Orders)',
    description:
      'Retrieves order list with optional customer email, phone, status filtering, and search.',
  })
  async findAll(@Query() query: QueryOrderDto) {
    return this.ordersService.findAll(query);
  }

  @Get(':id')
  @ResponseMessage('Order details retrieved successfully')
  @ApiOperation({
    summary: 'Get Order by ID or Order Number',
    description: 'Retrieves complete order information with order items and tracking milestones.',
  })
  @ApiParam({ name: 'id', description: 'Order ID or Order Number (e.g. KK-ORD-88001)' })
  async findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id/status')
  @ResponseMessage('Order status updated successfully')
  @ApiOperation({
    summary: 'Update Order Status & Delivery Info',
    description: 'Updates order status (PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED).',
  })
  @ApiParam({ name: 'id', description: 'Order ID or Order Number' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Order deleted successfully')
  @ApiOperation({
    summary: 'Delete an Order',
  })
  @ApiParam({ name: 'id', description: 'Order ID or Order Number' })
  async remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }
}
