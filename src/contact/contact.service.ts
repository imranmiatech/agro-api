import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { ContactStatus } from '../generated/prisma/enums.js';
import { CreateContactDto } from './dto/create-contact.dto.js';
import { QueryContactDto } from './dto/query-contact.dto.js';
import { UpdateContactStatusDto } from './dto/update-contact-status.dto.js';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  /**
   * 1. Create a new contact inquiry (Submitted from public contact page)
   * Stores inquiry in database and sends confirmation email to user.
   */
  async create(dto: CreateContactDto) {
    const inquiry = await this.prisma.contactInquiry.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.toLowerCase().trim(),
        phone: dto.phone?.trim() || null,
        subject: dto.subject?.trim() || 'General Inquiry',
        message: dto.message.trim(),
        status: ContactStatus.PENDING,
      },
    });

    // Send asynchronous Thank You confirmation email to the user
    this.mailService
      .sendContactThankYouEmail(
        inquiry.email,
        inquiry.name,
        inquiry.subject || 'General Inquiry',
        inquiry.message,
      )
      .catch((err: any) => {
        this.logger.error(`Failed to send thank-you email: ${err?.message || err}`);
      });

    return inquiry;
  }

  /**
   * 2. Find all contact inquiries with search, status filtering, and pagination
   */
  async findAll(query: QueryContactDto) {
    const { search, status, page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status && status.toUpperCase() !== 'ALL') {
      where.status = status.toUpperCase() as ContactStatus;
    }

    if (search && search.trim()) {
      const s = search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s, mode: 'insensitive' } },
        { subject: { contains: s, mode: 'insensitive' } },
        { message: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [inquiries, total] = await Promise.all([
      this.prisma.contactInquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.contactInquiry.count({ where }),
    ]);

    return {
      data: inquiries,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * 3. Find single contact inquiry by ID
   */
  async findOne(id: string) {
    const inquiry = await this.prisma.contactInquiry.findUnique({
      where: { id },
    });

    if (!inquiry) {
      throw new NotFoundException(`Contact inquiry with ID "${id}" was not found`);
    }

    return inquiry;
  }

  /**
   * 4. Update inquiry status and optional reply message
   * When status is marked RESOLVED or replyMessage is provided, triggers resolution email to user.
   */
  async updateStatus(id: string, dto: UpdateContactStatusDto) {
    const existing = await this.prisma.contactInquiry.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Contact inquiry with ID "${id}" was not found`);
    }

    const isNowResolved = dto.status === ContactStatus.RESOLVED;

    const updated = await this.prisma.contactInquiry.update({
      where: { id },
      data: {
        status: dto.status,
        replyMessage: dto.replyMessage ? dto.replyMessage.trim() : existing.replyMessage,
        resolvedAt: isNowResolved ? new Date() : (dto.status === ContactStatus.PENDING ? null : existing.resolvedAt),
      },
    });

    // If marked as resolved or reply was submitted, dispatch email notification to user
    if (isNowResolved || dto.replyMessage) {
      this.mailService
        .sendContactResolutionEmail(
          updated.email,
          updated.name,
          updated.subject || 'Support Inquiry',
          dto.replyMessage || updated.replyMessage || undefined,
        )
        .catch((err: any) => {
          this.logger.error(`Failed to send resolution email: ${err?.message || err}`);
        });
    }

    return updated;
  }

  /**
   * 5. Delete an inquiry from database
   */
  async remove(id: string) {
    const existing = await this.prisma.contactInquiry.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Contact inquiry with ID "${id}" was not found`);
    }

    await this.prisma.contactInquiry.delete({
      where: { id },
    });

    return {
      message: `Inquiry from "${existing.name}" removed successfully`,
    };
  }

  /**
   * 6. Live overview metrics computed directly from database
   */
  async getMetrics() {
    const [totalInquiries, pendingCount, inProgressCount, resolvedCount] =
      await Promise.all([
        this.prisma.contactInquiry.count(),
        this.prisma.contactInquiry.count({ where: { status: ContactStatus.PENDING } }),
        this.prisma.contactInquiry.count({ where: { status: ContactStatus.IN_PROGRESS } }),
        this.prisma.contactInquiry.count({ where: { status: ContactStatus.RESOLVED } }),
      ]);

    return {
      totalInquiries,
      pendingCount,
      inProgressCount,
      resolvedCount,
    };
  }
}
