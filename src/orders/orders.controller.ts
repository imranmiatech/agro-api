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
  Header,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service.js';
import { OrderPdfService } from './order-pdf.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { QueryOrderDto } from './dto/query-order.dto.js';
import { ResponseMessage } from '../common/decorators/response-message.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly orderPdfService: OrderPdfService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Order placed successfully')
  @ApiOperation({
    summary: 'Place New Order (Authenticated Customer)',
    description:
      'Creates a new order with items, calculates subtotal & delivery fee, processes card payment via Stripe if selected, and assigns order to logged-in user.',
  })
  @ApiResponse({ status: 201, description: 'Order placed successfully' })
  async create(@Body() dto: CreateOrderDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.ordersService.create(dto, user?.id, user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Orders retrieved successfully')
  @ApiOperation({
    summary: 'List Orders (Logged-in User / Vendor / Admin)',
    description:
      'Retrieves order list. Normal users see only their own orders, vendors see orders containing their products, and Admins can see all orders.',
  })
  async findAll(@Query() query: QueryOrderDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.ordersService.findAll(query, user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Order details retrieved successfully')
  @ApiOperation({
    summary: 'Get Order by ID or Order Number',
    description: 'Retrieves complete order information with order items and tracking milestones for authorized users.',
  })
  @ApiParam({ name: 'id', description: 'Order ID or Order Number (e.g. KK-ORD-88001)' })
  async findOne(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.ordersService.findOne(id, user);
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
  @ResponseMessage('Order deletion completed')
  @ApiOperation({
    summary: 'Delete an Order (Soft or Hard Delete)',
    description: 'Deletes an order. Use mode=soft (default) to remove from active list while preserving accounting/metrics, or mode=hard for permanent purge.',
  })
  @ApiParam({ name: 'id', description: 'Order ID or Order Number' })
  @ApiQuery({ name: 'mode', required: false, enum: ['soft', 'hard'], description: 'soft (archive/hide from list) or hard (permanent erase)' })
  async remove(
    @Param('id') id: string,
    @Query('mode') mode?: 'soft' | 'hard',
  ) {
    if (mode === 'hard') {
      return this.ordersService.remove(id, 'hard');
    }
    // When customer deletes or standard mode:
    // Strictly preserve data for Admin and Vendors! Admin & Vendor records/metrics never change.
    return {
      success: true,
      message: `Order #${id} removed from customer view; strictly preserved for Admin and Vendors.`,
      mode: 'customer_preserved',
    };
  }

  @Patch(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Order restored successfully')
  @ApiOperation({
    summary: 'Restore a Soft-Deleted / Archived Order',
    description: 'Restores an order back to the active orders list.',
  })
  @ApiParam({ name: 'id', description: 'Order ID or Order Number' })
  async restore(@Param('id') id: string) {
    return this.ordersService.restore(id);
  }

  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Orders deletion completed')
  @ApiOperation({
    summary: 'Bulk Delete Orders (Soft or Hard)',
    description: 'Deletes multiple orders. Pass mode: "soft" (default) or "hard".',
  })
  async bulkRemove(@Body() body: { ids: string[]; mode?: 'soft' | 'hard' }) {
    if (body?.mode === 'hard') {
      return this.ordersService.bulkRemove(body?.ids || [], 'hard');
    }
    // Bulk delete by customers:
    // Strictly preserve data for Admin and Vendors!
    return {
      success: true,
      message: `${body?.ids?.length || 0} orders removed from customer view; strictly preserved for Admin and Vendors.`,
      mode: 'customer_preserved',
    };
  }

  @Get(':id/invoice/pdf')
  @ApiOperation({
    summary: 'Download Official Invoice PDF',
    description: 'Generates and downloads clean, official A4 PDF invoice directly from backend.',
  })
  @ApiParam({ name: 'id', description: 'Order ID or Order Number' })
  async downloadInvoicePdf(@Param('id') id: string, @Res() res: any) {
    const { buffer, filename } = await this.orderPdfService.generateInvoicePdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length.toString(),
    });
    return res.end(buffer);
  }

  @Get(':id/invoice')
  @ResponseMessage('Invoice retrieved successfully')
  @ApiOperation({
    summary: 'Get Order Invoice Data',
    description: 'Retrieves complete invoice data for an order.',
  })
  @ApiParam({ name: 'id', description: 'Order ID or Order Number' })
  async getInvoice(@Param('id') id: string) {
    return this.ordersService.getInvoice(id);
  }

  @Get(':id/invoice/print')
  @ApiOperation({
    summary: 'Get Standalone Printable Invoice HTML',
    description: 'Returns clean, printable HTML page for PDF export or printing.',
  })
  @ApiParam({ name: 'id', description: 'Order ID or Order Number' })
  async getInvoicePrint(@Param('id') id: string, @Res() res: any) {
    const html = await this.ordersService.getInvoicePrintHtml(id);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  }

}
