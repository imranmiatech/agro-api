import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { OrderMessagesService } from './order-messages.service.js';
import { CreateOrderMessageDto } from './dto/create-order-message.dto.js';

@Controller()
export class OrderMessagesController {
  constructor(private readonly orderMessagesService: OrderMessagesService) {}

  /**
   * Get all messages for a specific order
   * GET /api/v1/orders/:orderId/messages
   */
  @Get('orders/:orderId/messages')
  async getOrderMessages(@Param('orderId') orderId: string) {
    const data = await this.orderMessagesService.getMessages(orderId);
    return {
      success: true,
      message: 'Order messages retrieved successfully',
      data,
    };
  }

  /**
   * Send a message regarding a specific order
   * POST /api/v1/orders/:orderId/messages
   */
  @Post('orders/:orderId/messages')
  async sendOrderMessage(
    @Param('orderId') orderId: string,
    @Body() dto: CreateOrderMessageDto,
  ) {
    const data = await this.orderMessagesService.sendMessage(orderId, dto);
    return {
      success: true,
      message: 'Message sent successfully',
      data,
    };
  }

  /**
   * Get all customer conversations for the vendor support center
   * GET /api/v1/vendor/support/conversations
   */
  /**
   * Get all customer conversations with live messages count
   * GET /api/v1/orders/conversations
   */
  @Get('orders-chat/conversations')
  async getOrderConversations() {
    const conversations = await this.orderMessagesService.getCustomerConversations();
    return {
      success: true,
      message: 'Order conversations retrieved successfully',
      data: conversations,
    };
  }

  @Get('customer/conversations')
  async getCustomerConversations() {
    const conversations = await this.orderMessagesService.getCustomerConversations();
    return {
      success: true,
      message: 'Customer conversations retrieved successfully',
      data: conversations,
    };
  }

  /**
   * Get all customer conversations for the vendor support center
   * GET /api/v1/vendor/support/conversations
   */
  @Get('vendor/support/conversations')
  async getVendorConversations() {
    const conversations = await this.orderMessagesService.getVendorConversations();
    return {
      success: true,
      message: 'Vendor conversations retrieved successfully',
      data: conversations,
    };
  }

  /**
   * Mark messages as read
   * PATCH /api/v1/orders/:orderId/messages/read
   */
  @Patch('orders/:orderId/messages/read')
  async markAsRead(
    @Param('orderId') orderId: string,
    @Query('role') role: 'vendor' | 'customer' = 'vendor',
  ) {
    const res = await this.orderMessagesService.markAsRead(orderId, role);
    return {
      success: true,
      data: res,
    };
  }

  /**
   * Delete messages / conversation for an order (Customer panel)
   * DELETE /api/v1/orders/:orderId/messages
   */
  @Delete('orders/:orderId/messages')
  async deleteOrderMessages(@Param('orderId') orderId: string) {
    const res = await this.orderMessagesService.deleteMessages(orderId);
    return {
      success: true,
      message: 'Conversation deleted successfully',
      data: res,
    };
  }

  /**
   * Delete customer conversation (Vendor panel)
   * DELETE /api/v1/vendor/support/conversations/:id
   */
  @Delete('vendor/support/conversations/:id')
  async deleteVendorConversation(@Param('id') id: string) {
    const res = await this.orderMessagesService.deleteMessages(id);
    return {
      success: true,
      message: 'Conversation deleted successfully',
      data: res,
    };
  }

  /**
   * Delete a single message
   * DELETE /api/v1/orders/:orderId/messages/:messageId
   */
  @Delete("orders/:orderId/messages/:messageId")
  async deleteSingleMessage(
    @Param("orderId") orderId: string,
    @Param("messageId") messageId: string,
  ) {
    const res = await this.orderMessagesService.deleteSingleMessage(orderId, messageId);
    return {
      success: true,
      message: "Message deleted successfully",
      data: res,
    };
  }
}
