import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import fs from 'fs';
import path from 'path';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { CreateTicketMessageDto } from './dto/create-ticket-message.dto.js';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto.js';
import { QueryTicketsDto } from './dto/query-tickets.dto.js';
import {
  VendorSupportTicket,
  TicketMessage,
  TicketStatus,
} from './vendor-support.entity.js';

@Injectable()
export class VendorSupportService {
  private readonly logger = new Logger(VendorSupportService.name);
  private readonly storageFilePath = path.join(process.cwd(), 'uploads', 'vendor_support_tickets.json');
  private gateway?: any;

  constructor() {
    this.ensureStorage();
  }

  setGateway(gateway: any) {
    this.gateway = gateway;
  }

  private ensureStorage(): void {
    try {
      const dir = path.dirname(this.storageFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (!fs.existsSync(this.storageFilePath)) {
        fs.writeFileSync(this.storageFilePath, JSON.stringify([], null, 2), 'utf8');
      }
    } catch (e) {
      this.logger.error('Failed to initialize ticket storage file:', e);
    }
  }

  private readTickets(): VendorSupportTicket[] {
    try {
      if (!fs.existsSync(this.storageFilePath)) {
        return [];
      }
      const data = fs.readFileSync(this.storageFilePath, 'utf8');
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      this.logger.error('Error reading tickets file:', e);
      return [];
    }
  }

  private writeTickets(tickets: VendorSupportTicket[]): void {
    try {
      fs.writeFileSync(this.storageFilePath, JSON.stringify(tickets, null, 2), 'utf8');
    } catch (e) {
      this.logger.error('Error writing tickets file:', e);
    }
  }

  /**
   * Get all tickets with optional filtering
   */
  async findAll(query?: QueryTicketsDto): Promise<VendorSupportTicket[]> {
    let tickets = this.readTickets();

    if (query?.status && query.status !== 'All') {
      tickets = tickets.filter((t) => t.status.toLowerCase() === query.status?.toLowerCase());
    }

    if (query?.category && query.category !== 'All') {
      tickets = tickets.filter((t) => t.category.toLowerCase() === query.category?.toLowerCase());
    }

    if (query?.vendorId) {
      tickets = tickets.filter((t) => t.vendorId === query.vendorId);
    }

    if (query?.search) {
      const term = query.search.toLowerCase().trim();
      tickets = tickets.filter(
        (t) =>
          t.id.toLowerCase().includes(term) ||
          t.vendorName.toLowerCase().includes(term) ||
          t.storeName.toLowerCase().includes(term) ||
          t.subject.toLowerCase().includes(term) ||
          t.fullMessage.toLowerCase().includes(term) ||
          t.category.toLowerCase().includes(term),
      );
    }

    return tickets;
  }

  /**
   * Get single ticket by ID
   */
  async findOne(id: string): Promise<VendorSupportTicket> {
    const tickets = this.readTickets();
    const ticket = tickets.find((t) => t.id === id);
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }
    return ticket;
  }

  /**
   * Create new support ticket from vendor
   */
  async createTicket(dto: CreateTicketDto): Promise<VendorSupportTicket> {
    const tickets = this.readTickets();
    const nextNum = 1000 + tickets.length + 1;
    const ticketId = `TKT-${nextNum}`;
    const nowStr = 'Just now';
    const nowIso = new Date().toISOString();

    const initials = dto.vendorName
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'VN';

    const firstMsg: TicketMessage = {
      id: `msg-${Date.now()}`,
      author: `${dto.vendorName} (${dto.storeName || 'Vendor'})`,
      authorRole: 'Vendor',
      authorInitials: initials,
      time: nowStr,
      text: dto.message,
      attachmentName: dto.attachmentName,
      attachmentUrl: dto.attachmentUrl,
      attachmentType: dto.attachmentType,
      createdAt: nowIso,
    };

    const newTicket: VendorSupportTicket = {
      id: ticketId,
      vendorId: dto.vendorId,
      vendorName: dto.vendorName,
      storeName: dto.storeName,
      email: dto.email,
      phone: dto.phone,
      category: dto.category as any,
      priority: dto.priority as any,
      subject: dto.subject,
      fullMessage: dto.message,
      status: 'Open',
      submittedTime: nowStr,
      updatedTime: nowStr,
      createdAt: nowIso,
      updatedAt: nowIso,
      messages: [firstMsg],
    };

    const updatedList = [newTicket, ...tickets];
    this.writeTickets(updatedList);

    if (this.gateway) {
      this.gateway.broadcastNewTicket(newTicket);
    }

    return newTicket;
  }

  /**
   * Add message/reply to ticket
   */
  async addMessage(id: string, dto: CreateTicketMessageDto): Promise<VendorSupportTicket> {
    const tickets = this.readTickets();
    const index = tickets.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    const ticket = tickets[index];
    const nowIso = new Date().toISOString();

    // Deduplication safeguard: ignore rapid identical submissions (within 3s)
    const lastMsg = ticket.messages[ticket.messages.length - 1];
    if (
      lastMsg &&
      lastMsg.authorRole === dto.authorRole &&
      (lastMsg.text || '') === (dto.text || '') &&
      (lastMsg.attachmentName || '') === (dto.attachmentName || '') &&
      Math.abs(Date.now() - new Date(lastMsg.createdAt).getTime()) < 3000
    ) {
      this.logger.warn(`Ignored duplicate message on ticket ${id}`);
      return ticket;
    }

    const newMsg: TicketMessage = {
      id: `msg-${Date.now()}`,
      author: dto.author,
      authorRole: dto.authorRole,
      authorInitials:
        dto.authorInitials ||
        dto.author
          .split(' ')
          .map((p) => p[0])
          .slice(0, 2)
          .join('')
          .toUpperCase() ||
        (dto.authorRole === 'Admin' ? 'AD' : 'VN'),
      time: 'Just now',
      text: dto.text || '',
      attachmentName: dto.attachmentName,
      attachmentUrl: dto.attachmentUrl,
      attachmentType: dto.attachmentType,
      createdAt: nowIso,
    };

    // User requirement: When admin resolves ticket, vendor can no longer send messages
    if (ticket.status === 'Resolved' && dto.authorRole === 'Vendor') {
      throw new BadRequestException('This ticket has been marked as resolved by Admin. Vendor cannot send further messages.');
    }

    // Status stays Open while conversation is active
    let nextStatus: TicketStatus = ticket.status;
    if (ticket.status !== 'Resolved') {
      nextStatus = 'Open';
    }

    const updatedTicket: VendorSupportTicket = {
      ...ticket,
      status: nextStatus,
      updatedTime: 'Just now',
      updatedAt: nowIso,
      messages: [...ticket.messages, newMsg],
    };

    tickets[index] = updatedTicket;
    this.writeTickets(tickets);

    if (this.gateway) {
      this.gateway.broadcastNewMessage(id, newMsg, updatedTicket);
    }

    return updatedTicket;
  }

  /**
   * Update ticket status (Only Admin can change status between Open and Resolved)
   */
  async updateStatus(id: string, dto: UpdateTicketStatusDto): Promise<VendorSupportTicket> {
    if (dto.status !== 'Open' && dto.status !== 'Resolved') {
      throw new BadRequestException('Status must be either Open or Resolved');
    }
    const tickets = this.readTickets();
    const index = tickets.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    const updatedTicket: VendorSupportTicket = {
      ...tickets[index],
      status: dto.status,
      updatedTime: 'Just now',
      updatedAt: new Date().toISOString(),
    };

    tickets[index] = updatedTicket;
    this.writeTickets(tickets);

    if (this.gateway) {
      this.gateway.broadcastStatusChange(id, dto.status, updatedTicket);
    }

    return updatedTicket;
  }

  /**
   * Delete ticket
   */
  async deleteTicket(id: string): Promise<{ success: boolean; id: string }> {
    const tickets = this.readTickets();
    const filtered = tickets.filter((t) => t.id !== id);
    if (filtered.length === tickets.length) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    this.writeTickets(filtered);

    if (this.gateway) {
      this.gateway.broadcastTicketDeleted(id);
    }

    return { success: true, id };
  }
}
