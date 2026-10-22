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
import { ConsultationsService } from './consultations.service.js';
import {
  AddConsultationMessageDto,
  UpdateConsultationStatusDto,
} from './dto/create-consultation.dto.js';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class ConsultationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ConsultationsGateway.name);

  constructor(private readonly consultationsService: ConsultationsService) {}

  afterInit() {
    this.consultationsService.setGateway(this);
    this.logger.log('Socket.io Consultations Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to consultation socket: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from consultation socket: ${client.id}`);
  }

  /**
   * Client joins a specific ticket room for real-time messaging
   */
  @SubscribeMessage('join_ticket')
  handleJoinTicket(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string },
  ) {
    if (data?.ticketId) {
      const room = `ticket_${data.ticketId}`;
      client.join(room);
      this.logger.log(`Client ${client.id} joined room ${room}`);
      return { event: 'joined_ticket', room };
    }
  }

  /**
   * Client leaves a ticket room
   */
  @SubscribeMessage('leave_ticket')
  handleLeaveTicket(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string },
  ) {
    if (data?.ticketId) {
      const room = `ticket_${data.ticketId}`;
      client.leave(room);
      this.logger.log(`Client ${client.id} left room ${room}`);
      return { event: 'left_ticket', room };
    }
  }

  /**
   * Real-time message dispatch between Farmer and Agri Expert
   */
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      ticketId: string;
      sender: 'user' | 'expert';
      senderName: string;
      senderRole?: string;
      senderAvatar?: string;
      text: string;
      attachments?: string[];
      markResolved?: boolean;
    },
  ) {
    try {
      if (!data?.ticketId || !data?.text) {
        return { error: 'ticketId and text are required' };
      }

      const result = await this.consultationsService.addMessage(data.ticketId, {
        sender: data.sender || 'user',
        senderName: data.senderName || 'Anonymous',
        senderRole: data.senderRole,
        senderAvatar: data.senderAvatar,
        text: data.text,
        attachments: data.attachments || [],
        markResolved: data.markResolved,
      });

      return { success: true, message: result.message };
    } catch (err: any) {
      this.logger.error(`Error in send_message: ${err?.message || err}`);
      return { error: err?.message || 'Failed to send message' };
    }
  }

  /**
   * Real-time typing indicator
   */
  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      ticketId: string;
      sender: 'user' | 'expert';
      senderName: string;
      isTyping: boolean;
    },
  ) {
    if (data?.ticketId) {
      const room = `ticket_${data.ticketId}`;
      client.to(room).emit('user_typing', data);
    }
  }

  /**
   * Real-time ticket status update (e.g. Expert marks ticket as Resolved)
   */
  @SubscribeMessage('update_status')
  async handleUpdateStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      ticketId: string;
      status: 'Waiting for Reply' | 'Open' | 'Resolved';
    },
  ) {
    try {
      if (!data?.ticketId || !data?.status) return;

      const updated = await this.consultationsService.updateStatus(data.ticketId, {
        status: data.status,
      });

      return { success: true, ticket: updated };
    } catch (err: any) {
      this.logger.error(`Error in update_status: ${err?.message || err}`);
      return { error: err?.message };
    }
  }
}
