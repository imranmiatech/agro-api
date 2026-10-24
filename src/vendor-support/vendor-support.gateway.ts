import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { VendorSupportService } from './vendor-support.service.js';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class VendorSupportGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(VendorSupportGateway.name);

  constructor(private readonly vendorSupportService: VendorSupportService) {}

  afterInit() {
    this.vendorSupportService.setGateway(this);
    this.logger.log('Socket.io Vendor Support Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to vendor-support socket: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from vendor-support socket: ${client.id}`);
  }

  /**
   * Client joins a specific ticket room (for live chat inside a ticket)
   */
  @SubscribeMessage('join_ticket')
  handleJoinTicket(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string },
  ) {
    if (data?.ticketId) {
      const room = `ticket_${data.ticketId}`;
      client.join(room);
      this.logger.log(`Client ${client.id} joined ${room}`);
      return { event: 'joined_ticket', room };
    }
  }

  /**
   * Client leaves a specific ticket room
   */
  @SubscribeMessage('leave_ticket')
  handleLeaveTicket(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string },
  ) {
    if (data?.ticketId) {
      const room = `ticket_${data.ticketId}`;
      client.leave(room);
      this.logger.log(`Client ${client.id} left ${room}`);
      return { event: 'left_ticket', room };
    }
  }

  /**
   * Admin joins admin support room for notifications
   */
  @SubscribeMessage('join_admin_support')
  handleJoinAdminSupport(@ConnectedSocket() client: Socket) {
    const room = 'admin_support';
    client.join(room);
    this.logger.log(`Client ${client.id} joined ${room}`);
    return { event: 'joined_admin_support', room };
  }

  /**
   * Vendor joins vendor support room
   */
  @SubscribeMessage('join_vendor_support')
  handleJoinVendorSupport(
    @ConnectedSocket() client: Socket,
    @MessageBody() data?: { vendorId?: string },
  ) {
    const generalRoom = 'vendor_support';
    client.join(generalRoom);
    if (data?.vendorId) {
      client.join(`vendor_${data.vendorId}`);
    }
    this.logger.log(`Client ${client.id} joined vendor support room`);
    return { event: 'joined_vendor_support' };
  }

  /**
   * Send a ticket message directly via socket
   */
  @SubscribeMessage('send_ticket_message')
  async handleSendTicketMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      ticketId: string;
      author: string;
      authorRole: 'Vendor' | 'Admin';
      authorInitials?: string;
      text?: string;
      attachmentName?: string;
      attachmentUrl?: string;
      attachmentType?: 'image' | 'file';
    },
  ) {
    if (!data?.ticketId || (!data?.text && !data?.attachmentName && !data?.attachmentUrl)) {
      return { error: 'ticketId and message or attachment are required' };
    }
    const updated = await this.vendorSupportService.addMessage(data.ticketId, {
      author: data.author,
      authorRole: data.authorRole,
      authorInitials: data.authorInitials,
      text: data.text || '',
      attachmentName: data.attachmentName,
      attachmentUrl: data.attachmentUrl,
      attachmentType: data.attachmentType,
    });
    return { event: 'message_sent', data: updated };
  }

  /**
   * Broadcast new message to ticket room, admin room, and vendor room without duplicate emits
   */
  broadcastNewMessage(ticketId: string, message: any, ticket: any) {
    const room = `ticket_${ticketId}`;
    if (this.server) {
      let emitter = this.server.to(room).to('admin_support').to('vendor_support');
      if (ticket.vendorId) {
        emitter = emitter.to(`vendor_${ticket.vendorId}`);
      }
      emitter.emit('ticket_new_message', { ticketId, message, ticket });
      this.logger.log(`Broadcasted new message for ticket ${ticketId}`);
    }
  }

  /**
   * Broadcast newly created ticket
   */
  broadcastNewTicket(ticket: any) {
    if (this.server) {
      this.server.to('admin_support').to('vendor_support').emit('ticket_created', { ticket });
      this.logger.log(`Broadcasted new ticket ${ticket.id}`);
    }
  }

  /**
   * Broadcast ticket status change
   */
  broadcastStatusChange(ticketId: string, status: string, ticket: any) {
    const room = `ticket_${ticketId}`;
    if (this.server) {
      let emitter = this.server.to(room).to('admin_support').to('vendor_support');
      if (ticket.vendorId) {
        emitter = emitter.to(`vendor_${ticket.vendorId}`);
      }
      emitter.emit('ticket_status_changed', { ticketId, status, ticket });
      this.logger.log(`Broadcasted status change for ticket ${ticketId} -> ${status}`);
    }
  }

  /**
   * Broadcast ticket deletion
   */
  broadcastTicketDeleted(ticketId: string) {
    if (this.server) {
      this.server.to(`ticket_${ticketId}`).to('admin_support').to('vendor_support').emit('ticket_deleted', { ticketId });
      this.logger.log(`Broadcasted deletion of ticket ${ticketId}`);
    }
  }
}
