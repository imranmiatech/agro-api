import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { NotificationType, Role, UserStatus } from '../generated/prisma/enums.js';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard.js';
import { QueryNotificationDto } from './dto/query-notification.dto.js';
import { NotificationGateway } from './notification.gateway.js';

export interface CreateNotificationPayload {
  type?: NotificationType;
  title: string;
  message: string;
  link?: string;
  referenceId?: string;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationGateway,
  ) {}

  /**
   * 1. Get role-based notifications for the authenticated user
   */
  async getMyNotifications(
    user: AuthenticatedUser,
    query: QueryNotificationDto,
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const userRole = user.role as Role;
    const baseScope: Prisma.NotificationWhereInput = {
      userId: user.id,
      role: userRole,
    };

    const where: Prisma.NotificationWhereInput = {
      ...baseScope,
    };

    if (query.isRead === 'true') {
      where.isRead = true;
    } else if (query.isRead === 'false') {
      where.isRead = false;
    }

    if (query.type) {
      where.type = query.type;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: {
          ...baseScope,
          isRead: false,
        },
      }),
    ]);

    return {
      notifications,
      unreadCount,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      role: userRole,
    };
  }

  /**
   * 2. Mark a single notification as read (strictly scoped to user & role)
   */
  async markAsRead(user: AuthenticatedUser, id: string) {
    const userRole = user.role as Role;

    const existing = await this.prisma.notification.findFirst({
      where: {
        id,
        userId: user.id,
        role: userRole,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Notification with ID "${id}" not found`);
    }

    const updated = existing.isRead
      ? existing
      : await this.prisma.notification.update({
          where: { id: existing.id },
          data: { isRead: true },
        });

    const unreadCount = await this.prisma.notification.count({
      where: {
        userId: user.id,
        role: userRole,
        isRead: false,
      },
    });

    this.gateway.emitNotificationsRead(user.id, unreadCount, updated.id);

    return {
      notification: updated,
      unreadCount,
    };
  }

  /**
   * 3. Mark all notifications as read for the authenticated user & role
   */
  async markAllAsRead(user: AuthenticatedUser) {
    const userRole = user.role as Role;

    const result = await this.prisma.notification.updateMany({
      where: {
        userId: user.id,
        role: userRole,
        isRead: false,
      },
      data: { isRead: true },
    });

    this.gateway.emitNotificationsRead(user.id, 0);

    return {
      updatedCount: result.count,
      unreadCount: 0,
    };
  }

  /**
   * 4. Delete a single notification strictly owned by the authenticated user & role
   */
  async deleteOne(user: AuthenticatedUser, id: string) {
    const userRole = user.role as Role;

    const result = await this.prisma.notification.deleteMany({
      where: {
        id,
        userId: user.id,
        role: userRole,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException(`Notification with ID "${id}" not found`);
    }

    const unreadCount = await this.prisma.notification.count({
      where: {
        userId: user.id,
        role: userRole,
        isRead: false,
      },
    });

    this.gateway.emitNotificationDeleted(user.id, id, unreadCount);

    return {
      deletedId: id,
      unreadCount,
    };
  }

  /**
   * 5. Delete ALL notifications belonging to the authenticated user & role
   */
  async deleteAll(user: AuthenticatedUser) {
    const userRole = user.role as Role;

    const result = await this.prisma.notification.deleteMany({
      where: {
        userId: user.id,
        role: userRole,
      },
    });

    this.gateway.emitNotificationsCleared(user.id);

    return {
      deletedCount: result.count,
      unreadCount: 0,
    };
  }

  /**
   * Internal Helper: Create a notification for a single user
   */
  async createForUser(
    userId: string,
    role: Role,
    payload: CreateNotificationPayload,
  ) {
    try {
      const created = await this.prisma.notification.create({
        data: {
          userId,
          role,
          type: payload.type ?? NotificationType.SYSTEM,
          title: payload.title,
          message: payload.message,
          link: payload.link ?? null,
          referenceId: payload.referenceId ?? null,
          metadata: payload.metadata,
        },
      });

      this.gateway.emitNewNotification(userId, created);
      return created;
    } catch (err) {
      this.logger.warn(
        `Failed to create notification for user ${userId}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  /**
   * Internal Helper: Fan out a role-based notification to all active users of a given role
   */
  async notifyRole(role: Role, payload: CreateNotificationPayload) {
    try {
      const recipients = await this.prisma.user.findMany({
        where: {
          role,
          status: UserStatus.ACTIVE,
        },
        select: { id: true },
      });

      if (recipients.length === 0) return [];

      const createdList = await Promise.all(
        recipients.map((recipient) =>
          this.prisma.notification.create({
            data: {
              userId: recipient.id,
              role,
              type: payload.type ?? NotificationType.SYSTEM,
              title: payload.title,
              message: payload.message,
              link: payload.link ?? null,
              referenceId: payload.referenceId ?? null,
              metadata: payload.metadata,
            },
          }),
        ),
      );

      for (const notif of createdList) {
        this.gateway.emitNewNotification(notif.userId, notif);
      }

      return createdList;
    } catch (err) {
      this.logger.warn(
        `Failed to fan out notification for role ${role}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return [];
    }
  }

  /**
   * Internal Helper: Notify a vendor by their VendorProfile ID or User ID
   */
  async notifyVendor(
    vendorIdOrUserId: string,
    payload: CreateNotificationPayload,
  ) {
    try {
      const vendorProfile = await this.prisma.vendorProfile.findFirst({
        where: {
          OR: [{ id: vendorIdOrUserId }, { userId: vendorIdOrUserId }],
        },
        select: { userId: true },
      });

      if (!vendorProfile?.userId) return null;

      return this.createForUser(vendorProfile.userId, Role.VENDOR, payload);
    } catch (err) {
      this.logger.warn(
        `Failed to notify vendor ${vendorIdOrUserId}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }
}
