import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateConsultationDto,
  AddConsultationMessageDto,
  UpdateConsultationStatusDto,
  RateConsultationDto,
} from './dto/create-consultation.dto.js';
import { Role } from '../generated/prisma/enums.js';
import { MailService } from '../mail/mail.service.js';

@Injectable()
export class ConsultationsService {
  private readonly logger = new Logger(ConsultationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  private gateway?: any;


  setGateway(gw: any) {
    this.gateway = gw;
  }

  notifyNewMessage(ticketId: string, message: any, ticket: any) {
    if (this.gateway?.server) {
      this.gateway.server.to(`ticket_${ticketId}`).emit('new_message', {
        ticketId,
        message,
        ticket,
      });
      this.gateway.server.emit('ticket_updated', ticket);
    }
  }

  notifyStatusChanged(ticketId: string, status: string, ticket: any) {
    if (this.gateway?.server) {
      this.gateway.server.to(`ticket_${ticketId}`).emit('status_changed', {
        ticketId,
        status,
        ticket,
      });
      this.gateway.server.emit('ticket_updated', ticket);
    }
  }

  notifyTicketCreatedOrUpdated(ticket: any) {
    if (this.gateway?.server) {
      this.gateway.server.emit('ticket_updated', ticket);
    }
  }

  private mapTicketToResponse(ticket: any) {
    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      category: ticket.category,
      crop: ticket.crop || '',
      priority: ticket.priority as 'Normal' | 'High' | 'Urgent',
      status: ticket.status as 'Waiting for Reply' | 'Open' | 'Resolved',
      createdAt: ticket.createdAt instanceof Date ? ticket.createdAt.toISOString() : ticket.createdAt,
      updatedAt: ticket.updatedAt instanceof Date ? ticket.updatedAt.toISOString() : ticket.updatedAt,
      assignedExpert: ticket.assignedExpertName
        ? {
            name: ticket.assignedExpertName,
            role: ticket.assignedExpertRole || 'Agricultural Specialist',
            avatar: ticket.assignedExpertAvatar || '',
            rating: ticket.assignedExpertRating || 4.9,
            specialization: ticket.assignedExpertSpecialization || '',
          }
        : undefined,
      messages: (ticket.messages || []).map((m: any) => ({
        id: m.id,
        sender: m.sender as 'user' | 'expert',
        senderName: m.senderName,
        senderRole: m.senderRole || '',
        senderAvatar: m.senderAvatar || '',
        text: m.text,
        timestamp: m.createdAt instanceof Date 
          ? m.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
          : new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        attachments: m.attachments || [],
      })),
      rating: ticket.ratingStars
        ? {
            stars: ticket.ratingStars,
            comment: ticket.ratingComment || '',
            ratedAt: ticket.ratedAt instanceof Date ? ticket.ratedAt.toISOString() : ticket.ratedAt,
          }
        : undefined,
    };
  }

  /**
   * 1. List all consultations from the database
   */
  async findAll() {
    const tickets = await this.prisma.consultationTicket.findMany({
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return tickets.map((t) => this.mapTicketToResponse(t));
  }

  /**
   * 2. Find single consultation ticket by ID
   */
  async findOne(id: string) {
    const ticket = await this.prisma.consultationTicket.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Consultation ticket with ID "${id}" was not found`);
    }

    return this.mapTicketToResponse(ticket);
  }

  /**
   * 3. Create a new consultation ticket with initial farmer inquiry message
   */
  async create(dto: CreateConsultationDto) {
    // Generate unique sequential ticket number without collisions
    const tickets = await this.prisma.consultationTicket.findMany({
      select: { ticketNumber: true },
    });
    let maxNum = 2040;
    for (const t of tickets) {
      const match = t.ticketNumber?.match(/\d+/);
      if (match) {
        const val = parseInt(match[0], 10);
        if (!isNaN(val) && val > maxNum) {
          maxNum = val;
        }
      }
    }
    let nextNum = maxNum + 1;
    let ticketNumber = `TK-${nextNum}`;
    while (await this.prisma.consultationTicket.findUnique({ where: { ticketNumber }, select: { id: true } })) {
      nextNum++;
      ticketNumber = `TK-${nextNum}`;
    }

    // Look for an active expert in DB to assign
    const expert = await this.prisma.user.findFirst({
      where: { role: Role.EXPERT },
      include: { expertProfile: true },
    });

    const ticket = await this.prisma.consultationTicket.create({
      data: {
        ticketNumber,
        userId: dto.userId?.trim() || null,
        subject: dto.subject.trim(),
        category: dto.category.trim(),
        crop: dto.crop?.trim() || null,
        priority: dto.priority || 'Normal',
        status: 'Waiting for Reply',
        farmerName: dto.farmerName?.trim() || 'Valued Farmer',
        farmerEmail: dto.farmerEmail?.trim() || null,
        farmerPhone: dto.farmerPhone?.trim() || null,
        assignedExpertId: expert?.id || null,
        assignedExpertName: expert?.name || 'Dr. Tariqul Islam',
        assignedExpertRole: expert?.expertProfile?.designation || 'Senior Plant Pathologist',
        assignedExpertAvatar: expert?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        assignedExpertRating: expert?.expertProfile?.rating || 4.9,
        assignedExpertSpecialization: expert?.expertProfile?.specialization || 'Crop Protection',
        messages: {
          create: {
            sender: 'user',
            senderName: dto.farmerName?.trim() || 'Valued Farmer',
            text: dto.description.trim(),
            attachments: dto.attachments || [],
          },
        },
      },
      include: {
        messages: true,
      },
    });

    const mapped = this.mapTicketToResponse(ticket);
    this.notifyTicketCreatedOrUpdated(mapped);
    return mapped;
  }

  /**
   * 4. Add message to an existing consultation ticket
   */
  async addMessage(ticketId: string, dto: AddConsultationMessageDto) {
    const existing = await this.prisma.consultationTicket.findUnique({
      where: { id: ticketId },
    });

    if (!existing) {
      throw new NotFoundException(`Consultation ticket with ID "${ticketId}" was not found`);
    }

    if (existing.status === 'Resolved') {
      throw new BadRequestException(
        'This consultation ticket is marked as Resolved. No further messages can be sent. Please create a new consultation ticket.',
      );
    }

    const message = await this.prisma.consultationMessage.create({
      data: {
        ticketId,
        sender: dto.sender,
        senderName: dto.senderName.trim(),
        senderRole: dto.senderRole?.trim() || null,
        senderAvatar: dto.senderAvatar?.trim() || null,
        text: dto.text.trim(),
        attachments: dto.attachments || [],
      },
    });

    // Update ticket status:
    // - Initial status is 'Waiting for Reply'
    // - When expert answers / replies -> status becomes 'Open' (or 'Resolved' if markResolved)
    // - Once status is 'Open', it STAYS 'Open'. User replies will NOT flip it back to 'Waiting for Reply'!
    let nextStatus = existing.status;
    if (dto.sender === 'expert') {
      nextStatus = dto.markResolved ? 'Resolved' : 'Open';
    }

    const updatedTicket = await this.prisma.consultationTicket.update({
      where: { id: ticketId },
      data: {
        status: nextStatus,
        updatedAt: new Date(),
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    // If ticket was marked Resolved, send Thank You email to user
    if (nextStatus === 'Resolved' && existing.status !== 'Resolved') {
      this.sendResolvedEmailSafe(existing, dto.text);
    }

    const result = {
      message: {
        id: message.id,
        sender: message.sender,
        senderName: message.senderName,
        senderRole: message.senderRole || '',
        senderAvatar: message.senderAvatar || '',
        text: message.text,
        timestamp: message.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        attachments: message.attachments || [],
      },
      ticket: this.mapTicketToResponse(updatedTicket),
    };

    // Broadcast in real-time to ticket room and dashboard clients
    this.notifyNewMessage(ticketId, result.message, result.ticket);

    return result;
  }

  /**
   * 5. Update ticket status
   */
  async updateStatus(ticketId: string, dto: UpdateConsultationStatusDto) {
    const existing = await this.prisma.consultationTicket.findUnique({
      where: { id: ticketId },
    });

    if (!existing) {
      throw new NotFoundException(`Consultation ticket with ID "${ticketId}" was not found`);
    }

    const updated = await this.prisma.consultationTicket.update({
      where: { id: ticketId },
      data: {
        status: dto.status,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    // If status became Resolved, send Thank You email to user
    if (dto.status === 'Resolved' && existing.status !== 'Resolved') {
      this.sendResolvedEmailSafe(existing, null);
    }

    const mapped = this.mapTicketToResponse(updated);
    this.notifyStatusChanged(ticketId, dto.status, mapped);
    return mapped;
  }

  /**
   * 6. Mark ticket as seen by expert:
   * When expert opens a ticket with 'Waiting for Reply', it transitions to 'Open'.
   * If already 'Open' or 'Resolved', it remains untouched to prevent redundant status toggles.
   */
  async markAsSeen(ticketId: string) {
    try {
      const existing = await this.prisma.consultationTicket.findUnique({
        where: { id: ticketId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!existing) {
        return null;
      }

      if (existing.status === 'Waiting for Reply') {
        const updated = await this.prisma.consultationTicket.update({
          where: { id: ticketId },
          data: {
            status: 'Open',
          },
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
            },
          },
        });

        const mapped = this.mapTicketToResponse(updated);
        this.notifyStatusChanged(ticketId, 'Open', mapped);
        return mapped;
      }

      return this.mapTicketToResponse(existing);
    } catch (err: any) {
      if (err?.code === 'P2025') {
        this.logger.warn(`Consultation ticket ${ticketId} was already removed or does not exist`);
        return null;
      }
      throw err;
    }
  }

  /**
   * 7. Delete consultation ticket (used by expert desk or farmer history)
   */
  async delete(ticketId: string) {
    try {
      const existing = await this.prisma.consultationTicket.findUnique({
        where: { id: ticketId },
      });

      if (!existing) {
        return {
          success: true,
          message: `Consultation ticket already deleted or not found`,
        };
      }

      await this.prisma.consultationTicket.delete({
        where: { id: ticketId },
      });

      if (this.gateway?.server) {
        this.gateway.server.emit('ticket_deleted', { ticketId });
      }

      return {
        success: true,
        message: `Consultation ticket #${existing.ticketNumber} deleted successfully`,
      };
    } catch (err: any) {
      if (err?.code === 'P2025') {
        return {
          success: true,
          message: `Consultation ticket already removed`,
        };
      }
      throw err;
    }
  }

  /**
   * 8. Rate resolved consultation
   */
  async rate(ticketId: string, dto: RateConsultationDto) {
    const existing = await this.prisma.consultationTicket.findUnique({
      where: { id: ticketId },
    });

    if (!existing) {
      throw new NotFoundException(`Consultation ticket with ID "${ticketId}" was not found`);
    }

    const updated = await this.prisma.consultationTicket.update({
      where: { id: ticketId },
      data: {
        ratingStars: dto.stars,
        ratingComment: dto.comment ? dto.comment.trim() : null,
        ratedAt: new Date(),
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    const mapped = this.mapTicketToResponse(updated);
    this.notifyTicketCreatedOrUpdated(mapped);
    return mapped;
  }

  /**
   * Internal helper to safely send Thank You / Resolution email to user
   */
  private async sendResolvedEmailSafe(ticket: any, adviceText?: string | null) {
    try {
      let email = ticket.farmerEmail;
      if (!email && ticket.userId) {
        const user = await this.prisma.user.findUnique({
          where: { id: ticket.userId },
          select: { email: true },
        });
        email = user?.email;
      }

      if (!email) {
        this.logger.warn(`Cannot send resolved email for ticket #${ticket.ticketNumber}: no recipient email available`);
        return;
      }

      await this.mailService.sendConsultationResolvedEmail(
        email,
        ticket.farmerName || 'Valued Farmer',
        ticket.ticketNumber,
        ticket.subject,
        ticket.assignedExpertName || 'Agricultural Specialist',
        ticket.crop || undefined,
        adviceText || undefined,
      );
    } catch (err) {
      this.logger.error(`Error sending consultation resolution email for ticket #${ticket.ticketNumber}:`, err);
    }
  }
}
