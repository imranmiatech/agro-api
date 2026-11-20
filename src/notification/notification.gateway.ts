import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

interface SocketAuthPayload {
  sub?: string;
  email?: string;
  role?: string;
}

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake?.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) {
      return authToken.replace(/^Bearer\s+/i, '').trim();
    }

    const headerAuth = client.handshake?.headers?.authorization;
    if (typeof headerAuth === 'string' && headerAuth.startsWith('Bearer ')) {
      return headerAuth.slice(7).trim();
    }

    return null;
  }

  private async verifyClient(client: Socket): Promise<SocketAuthPayload | null> {
    const token = this.extractToken(client);
    if (!token) return null;

    try {
      const payload = await this.jwtService.verifyAsync<SocketAuthPayload>(token, {
        secret:
          process.env.JWT_SECRET || 'multi_vendor_jwt_super_secret_key_2026',
      });
      return payload?.sub ? payload : null;
    } catch {
      return null;
    }
  }

  async handleConnection(client: Socket) {
    const payload = await this.verifyClient(client);
    if (payload?.sub) {
      const room = this.getUserRoom(payload.sub);
      await client.join(room);
      this.logger.log(
        `Notification socket ${client.id} joined ${room} (${payload.role ?? 'UNKNOWN'})`,
      );
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Notification socket disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_notifications')
  async handleJoinNotifications(@ConnectedSocket() client: Socket) {
    const payload = await this.verifyClient(client);
    if (!payload?.sub) {
      return { event: 'notifications_error', message: 'Unauthorized' };
    }

    const room = this.getUserRoom(payload.sub);
    await client.join(room);
    return { event: 'joined_notifications', room };
  }

  private getUserRoom(userId: string): string {
    return `notif_user_${userId}`;
  }

  emitNewNotification(userId: string, notification: unknown) {
    if (!this.server) return;
    this.server
      .to(this.getUserRoom(userId))
      .emit('new_notification', notification);
  }

  emitNotificationDeleted(userId: string, id: string, unreadCount: number) {
    if (!this.server) return;
    this.server
      .to(this.getUserRoom(userId))
      .emit('notification_deleted', { id, unreadCount });
  }

  emitNotificationsCleared(userId: string) {
    if (!this.server) return;
    this.server
      .to(this.getUserRoom(userId))
      .emit('notifications_cleared', { unreadCount: 0 });
  }

  emitNotificationsRead(userId: string, unreadCount: number, id?: string) {
    if (!this.server) return;
    this.server
      .to(this.getUserRoom(userId))
      .emit('notifications_read', { id, unreadCount });
  }
}
