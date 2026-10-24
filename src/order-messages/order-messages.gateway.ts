import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { OrderMessagesService } from './order-messages.service.js';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class OrderMessagesGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OrderMessagesGateway.name);

  constructor(private readonly orderMessagesService: OrderMessagesService) {}

  afterInit() {
    this.orderMessagesService.setGateway(this);
    this.logger.log('Socket.io Order Messages Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to order-messages socket: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from order-messages socket: ${client.id}`);
  }

  /**
   * Client joins a specific order conversation room
   */
  @SubscribeMessage('join_order')
  handleJoinOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    if (data?.orderId) {
      const room = `order_${data.orderId}`;
      client.join(room);
      this.logger.log(`Client ${client.id} joined room ${room}`);
      return { event: 'joined_order', room };
    }
  }

  /**
   * Client leaves an order conversation room
   */
  @SubscribeMessage('leave_order')
  handleLeaveOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    if (data?.orderId) {
      const room = `order_${data.orderId}`;
      client.leave(room);
      this.logger.log(`Client ${client.id} left room ${room}`);
      return { event: 'left_order', room };
    }
  }

  /**
   * Vendor joins the general vendor support room to get real-time conversation updates
   */
  @SubscribeMessage('join_vendor_support')
  handleJoinVendorSupport(@ConnectedSocket() client: Socket) {
    const room = 'vendor_support';
    client.join(room);
    this.logger.log(`Client ${client.id} joined room ${room}`);
    return { event: 'joined_vendor_support', room };
  }

  /**
   * Send a message directly via socket
   */
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      orderId: string;
      sender?: 'customer' | 'vendor';
      senderName?: string;
      text: string;
      attachment?: any;
    },
  ) {
    if (!data?.orderId) return { error: 'orderId is required' };
    const saved = await this.orderMessagesService.sendMessage(data.orderId, {
      sender: data.sender || 'customer',
      senderName: data.senderName,
      text: data.text,
      attachment: data.attachment,
    });
    return { event: 'message_sent', data: saved };
  }

  /**
   * Broadcast a newly created message to the order room and vendor support room
   */
  broadcastNewMessage(orderId: string, message: any, orderSummary?: any) {
    const room = `order_${orderId}`;
    if (this.server) {
      // 1. Emit to everyone in the order chat room (customer & vendor inside this order)
      this.server.to(room).emit('new_message', {
        orderId,
        message,
      });

      // 2. Also emit to the vendor support general room so the vendor sidebar updates in real-time
      this.server.to('vendor_support').emit('vendor_new_message', {
        orderId,
        message,
        orderSummary,
      });
      this.logger.log(`Broadcasted new message for order ${orderId} to ${room} and vendor_support`);
    }
  }

  /**
   * Broadcast that messages were read
   */
  broadcastMessagesRead(orderId: string, role: string) {
    const room = `order_${orderId}`;
    if (this.server) {
      this.server.to(room).emit('messages_read', { orderId, role });
      this.server.to('vendor_support').emit('vendor_messages_read', { orderId, role });
    }
  }

  /**
   * Broadcast that a conversation was deleted from sidebar
   */
  broadcastConversationDeleted(orderId: string) {
    const room = `order_${orderId}`;
    if (this.server) {
      this.server.to(room).emit('conversation_deleted', { orderId });
      this.server.to('vendor_support').emit('conversation_deleted', { orderId });
      this.logger.log(`Broadcasted conversation_deleted for order ${orderId}`);
    }
  }

  /**
   * Broadcast that a single message was deleted
   */
  broadcastMessageDeleted(orderId: string, messageId: string) {
    const room = "order_" + orderId;
    if (this.server) {
      this.server.to(room).emit("message_deleted", { orderId, messageId });
      this.server.to("vendor_support").emit("message_deleted", { orderId, messageId });
      this.logger.log("Broadcasted message_deleted for " + messageId + " in order " + orderId);
    }
  }
}
