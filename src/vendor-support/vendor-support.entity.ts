export type TicketCategory =
  | 'Payout & Finance'
  | 'Product Approval'
  | 'Delivery & Logistics'
  | 'Account & Verification'
  | 'Technical Issue'
  | 'General Inquiry';

export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type TicketStatus = 'Open' | 'Resolved';

export interface TicketMessage {
  id: string;
  author: string;
  authorRole: 'Vendor' | 'Admin';
  authorInitials?: string;
  time: string;
  text?: string;
  attachmentName?: string;
  attachmentUrl?: string;
  attachmentType?: 'image' | 'file';
  createdAt: string;
}

export interface VendorSupportTicket {
  id: string;
  vendorId?: string;
  vendorName: string;
  storeName: string;
  email: string;
  phone?: string;
  category: TicketCategory;
  priority: TicketPriority;
  subject: string;
  fullMessage: string;
  status: TicketStatus;
  submittedTime: string;
  updatedTime: string;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}
