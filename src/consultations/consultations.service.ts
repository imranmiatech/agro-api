import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateConsultationDto,
  AddConsultationMessageDto,
  UpdateConsultationStatusDto,
  RateConsultationDto,
} from './dto/create-consultation.dto.js';
import { Role } from '../generated/prisma/enums.js';

@Injectable()
export class ConsultationsService implements OnModuleInit {
  private readonly logger = new Logger(ConsultationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const count = await this.prisma.consultationTicket.count();
    if (count === 0) {
      this.logger.log('Seeding initial consultation tickets in database...');
      const expert = await this.prisma.user.findFirst({
        where: { role: Role.EXPERT },
        include: { expertProfile: true },
      });

      const expertName = expert?.name || 'Dr. Farhana Akter';
      const expertRole = expert?.expertProfile?.designation || 'Senior Plant Pathologist';
      const expertSpecialization =
        expert?.expertProfile?.specialization ||
        'Rice Disease Management & Integrated Pest Control';

      // Seed Ticket 1: Rice Tungro Virus
      await this.prisma.consultationTicket.create({
        data: {
          ticketNumber: 'TK-2041',
          subject: 'Yellow mosaic patches on Boro paddy leaves in Comilla region',
          category: 'Crop Disease',
          crop: 'Boro Paddy (BRRI dhan29)',
          priority: 'High',
          status: 'Waiting for Reply',
          farmerName: 'Kamal Harvey',
          assignedExpertId: expert?.id || null,
          assignedExpertName: expertName,
          assignedExpertRole: expertRole,
          assignedExpertSpecialization: expertSpecialization,
          assignedExpertRating: 4.9,
          messages: {
            create: [
              {
                sender: 'user',
                senderName: 'Kamal Harvey',
                text: 'Hello doctor, my 35-day-old Boro seedlings are developing irregular pale-yellow mosaic mottling on young leaf tips. Stems look somewhat stunted. I took two field photos. Could you prescribe treatment?',
                attachments: [
                  'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=800&q=80',
                ],
              },
              {
                sender: 'expert',
                senderName: expertName,
                senderRole: expertRole,
                text: 'Greetings Kamal. Based on the chlorotic leaf streaks and vein clearing in your photo, this is early Rice Tungro Virus (RTV) transmitted by Green Leafhoppers (GLH). Stop any additional urea top-dressing immediately as high nitrogen promotes leafhopper multiplication.',
              },
              {
                sender: 'user',
                senderName: 'Kamal Harvey',
                text: 'Understood. What insecticide and dosage should I spray immediately to protect the remaining 2 acres?',
              },
            ],
          },
        },
      });

      // Seed Ticket 2: Potato Late Blight
      await this.prisma.consultationTicket.create({
        data: {
          ticketNumber: 'TK-2035',
          subject: 'Potato late blight prevention schedule before cold wave',
          category: 'Pest & Blight',
          crop: 'Potato (Diamant)',
          priority: 'Urgent',
          status: 'Open',
          farmerName: 'Rahim Uddin',
          assignedExpertId: expert?.id || null,
          assignedExpertName: 'Prof. Md. Rafiqul Islam',
          assignedExpertRole: 'Agronomy Specialist',
          assignedExpertSpecialization: 'Tuber Crops & Horticultural Pathology',
          assignedExpertRating: 5.0,
          messages: {
            create: [
              {
                sender: 'user',
                senderName: 'Rahim Uddin',
                text: 'Due to heavy fog and cold weather in Bogura, my potato plants are showing dark water-soaked lesions on the tips of leaflets. Is Mancozeb 75% enough or should I use systemic fungicides?',
              },
              {
                sender: 'expert',
                senderName: 'Prof. Md. Rafiqul Islam',
                senderRole: 'Agronomy Specialist',
                text: 'Greetings! Once active water-soaked lesions appear, preventive contact fungicides like Mancozeb alone will not cure the infected tissue. Apply systemic combination: Metalaxyl 8% + Mancozeb 64% (e.g. Ridomil Gold) at 2g per liter of clean water.',
              },
            ],
          },
        },
      });

      this.logger.log('Initial consultation tickets seeded successfully.');
    }
  }

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
    // Generate unique sequential or random ticket number
    const count = await this.prisma.consultationTicket.count();
    const ticketNumber = `TK-${(2040 + count + 1).toString()}`;

    // Look for an active expert in DB to assign
    const expert = await this.prisma.user.findFirst({
      where: { role: Role.EXPERT },
      include: { expertProfile: true },
    });

    const ticket = await this.prisma.consultationTicket.create({
      data: {
        ticketNumber,
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

    // Update ticket status
    let nextStatus = existing.status;
    if (dto.sender === 'user') {
      nextStatus = 'Waiting for Reply';
    } else if (dto.sender === 'expert') {
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

    const mapped = this.mapTicketToResponse(updated);
    this.notifyStatusChanged(ticketId, dto.status, mapped);
    return mapped;
  }

  /**
   * 6. Rate resolved consultation
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
}
