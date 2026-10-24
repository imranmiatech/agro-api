import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateOrderMessageDto } from './dto/create-order-message.dto.js';

const AVATAR_COLORS = [
  '#062E35',
  '#0E4F5A',
  '#166534',
  '#0F766E',
  '#1E40AF',
  '#334155',
];

function getInitials(name: string): string {
  if (!name) return 'CU';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}

@Injectable()
export class OrderMessagesService {
  constructor(private readonly prisma: PrismaService) {}

  private gateway?: any;

  setGateway(gateway: any) {
    this.gateway = gateway;
  }

  /**
   * Helper to resolve order by ID or orderNumber
   */
  private async findOrder(idOrNumber: string) {
    const trimmed = idOrNumber?.trim();
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [{ id: trimmed }, { orderNumber: trimmed }],
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${idOrNumber} not found`);
    }
    return order;
  }

  /**
   * 1. Get all messages for a specific order
   */
  async getMessages(idOrNumber: string) {
    const order = await this.findOrder(idOrNumber);

    let messages: any[] = await this.prisma.orderMessage.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: 'asc' },
    });


    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      status: (order.status || 'pending').toLowerCase(),
      items: order.items,
      messages: messages.map((m: any) => ({
        id: m.id,
        sender: m.sender as 'customer' | 'vendor',
        senderName: m.senderName,
        text: m.text,
        attachment: m.attachment,
        timestamp: new Date(m.createdAt).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
        createdAt: m.createdAt,
        isRead: m.isRead,
      })),
    };
  }

  /**
   * 2. Send a new message regarding an order
   */
  async sendMessage(idOrNumber: string, dto: CreateOrderMessageDto) {
    const order = await this.findOrder(idOrNumber);
    const sender = dto.sender || 'customer';
    const senderName =
      dto.senderName || (sender === 'customer' ? order.customerName : 'KrishiKunjo Support');

    const created = await this.prisma.orderMessage.create({
      data: {
        orderId: order.id,
        sender,
        senderName,
        text: dto.text?.trim() || '',
        attachment: dto.attachment || undefined,
        isRead: false,
      },
    });

    const formattedMessage = {
      id: created.id,
      orderId: order.id,
      sender: created.sender,
      senderName: created.senderName,
      text: created.text,
      attachment: created.attachment,
      timestamp: new Date(created.createdAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }),
      createdAt: created.createdAt,
      isRead: created.isRead,
    };

    if (this.gateway) {
      this.gateway.broadcastNewMessage(order.id, formattedMessage, {
        orderNumber: order.orderNumber,
        customerName: order.customerName,
      });
    }

    return formattedMessage;
  }

  /**
   * 3. Get all customer conversations for the vendor support panel.
   * Only includes orders where customers have actually texted/messaged.
   */
  async getVendorConversations() {
    const orders: any[] = await this.prisma.order.findMany({
      where: {
        messages: {
          some: {
            sender: 'customer',
          },
        },
      },
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    const conversations = orders
      .filter((order: any) => order.messages && order.messages.length > 0)
      .map((order: any) => {
        const msgs: any[] = order.messages || [];
        const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
        const unreadCount = msgs.filter((m: any) => m.sender === 'customer' && !m.isRead).length;

        return {
          id: order.id,
          orderId: order.id,
          orderNumber: order.orderNumber,
          orderStatus: order.status,
          customerName: order.customerName,
          customerInitials: getInitials(order.customerName),
          avatarColor: getColor(order.customerName || order.id),
          customerPhone: order.customerPhone,
          customerEmail: order.customerEmail,
          customerLocation: `${order.deliveryAddress}, ${order.district}`,
          productImage: order.items?.[0]?.productImage || undefined,
          productName: order.items?.[0]?.productName || undefined,
          unreadCount,
          lastMessage: lastMsg?.text || `Order placed for ${order.items?.length || 0} agro item(s)`,
          lastMessageTime: lastMsg ? formatTimeAgo(lastMsg.createdAt) : formatTimeAgo(order.createdAt),
          isOnline: true,
          messages: msgs.map((m: any) => ({
            id: m.id,
            sender: m.sender as 'customer' | 'vendor',
            text: m.text,
            attachment: m.attachment
              ? {
                  name: (m.attachment as any).name || 'attachment',
                  url: (m.attachment as any).dataUrl || (m.attachment as any).url || '#',
                  type: (m.attachment as any).type || 'file',
                  size: (m.attachment as any).size || 'File',
                }
              : undefined,
            timestamp: new Date(m.createdAt).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            }),
            isRead: m.isRead,
          })),
        };
      });

    return conversations;
  }

  /**
   * 3b. Get all conversations for customer (all orders with stats and messages)
   */
  async getCustomerConversations() {
    const orders: any[] = await this.prisma.order.findMany({
      where: {
        messages: {
          some: {},
        },
      },
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return orders
      .filter((order: any) => order.messages && order.messages.length > 0)
      .map((order: any) => {
      const msgs: any[] = order.messages || [];
      const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
      const unreadCount = msgs.filter((m: any) => m.sender === 'vendor' && !m.isRead).length;
      const vendorName = order.items?.[0]?.productName
        ? `${order.items[0].productName} Hub`
        : 'KrishiKunjo Regional Hub';

      return {
        id: order.id,
        orderId: order.id,
        orderNumber: order.orderNumber,
        orderStatus: order.status,
        customerName: order.customerName,
        vendorName,
        avatarInitials: getInitials(vendorName),
        avatarColor: getColor(vendorName),
        productImage: order.items?.[0]?.productImage || undefined,
        productName: order.items?.[0]?.productName || undefined,
        totalMessages: msgs.length,
        unreadCount,
        lastMessage: lastMsg?.text || (lastMsg?.attachment ? '[Attachment]' : 'No messages yet'),
        lastMessageTime: lastMsg ? formatTimeAgo(lastMsg.createdAt) : formatTimeAgo(order.createdAt),
        isOnline: true,
        messages: msgs.map((m: any) => ({
          id: m.id,
          sender: m.sender as 'customer' | 'vendor',
          senderName: m.senderName,
          text: m.text,
          attachment: m.attachment,
          timestamp: new Date(m.createdAt).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          }),
          createdAt: m.createdAt,
          isRead: m.isRead,
        })),
      };
    });
  }

  /**
   * 4. Mark messages as read
   */
  async markAsRead(idOrNumber: string, readerRole: 'vendor' | 'customer' = 'vendor') {
    const order = await this.findOrder(idOrNumber);
    const oppositeSender = readerRole === 'vendor' ? 'customer' : 'vendor';

    await this.prisma.orderMessage.updateMany({
      where: {
        orderId: order.id,
        sender: oppositeSender,
        isRead: false,
      },
      data: { isRead: true },
    });

    if (this.gateway) {
      this.gateway.broadcastMessagesRead(order.id, readerRole);
    }

    return { success: true, orderId: order.id };
  }

  /**
   * 5. Delete messages / clear conversation for an order
   */
  async deleteMessages(idOrNumber: string) {
    const order = await this.findOrder(idOrNumber);
    await this.prisma.orderMessage.deleteMany({
      where: { orderId: order.id },
    });

    if (this.gateway) {
      this.gateway.broadcastConversationDeleted(order.id);
    }

    return { orderId: order.id, deleted: true };
  }

  /**
   * 6. Delete a single message by ID
   */
  async deleteSingleMessage(idOrNumber: string, messageId: string) {
    const order = await this.findOrder(idOrNumber);
    await this.prisma.orderMessage.deleteMany({
      where: {
        id: messageId,
        orderId: order.id,
      },
    });

    if (this.gateway) {
      this.gateway.broadcastMessageDeleted(order.id, messageId);
    }

    return { orderId: order.id, messageId, deleted: true };
  }
}
