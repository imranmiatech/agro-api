import { ApiProperty } from '@nestjs/swagger';

export class AttentionRequiredActionDto {
  @ApiProperty({ example: 'Review requests', description: 'Action button text' })
  label!: string;

  @ApiProperty({ example: 'requests', description: 'Target tab to switch to in the admin UI' })
  targetTab!: string;

  @ApiProperty({ example: '/admin/partners?tab=requests', description: 'Target navigation link' })
  link!: string;
}

export class PartnershipRequestPreviewDto {
  @ApiProperty({ example: 'REQ-202', description: 'Request identifier' })
  id!: string;

  @ApiProperty({ example: 'Green Valley Organic Seeds', description: 'Business or farm name' })
  businessName!: string;

  @ApiProperty({ example: 'Dhaka', description: 'Location / Division of the business' })
  location!: string;

  @ApiProperty({ example: 'Liam O’Sullivan', description: 'Owner or contact person name' })
  ownerName!: string;

  @ApiProperty({ example: 'liam@greenvalley.com', description: 'Contact email' })
  email!: string;

  @ApiProperty({ example: '+880 1712 345678', description: 'Contact phone' })
  phone!: string;

  @ApiProperty({ example: 'PENDING', description: 'Current moderation status' })
  status!: string;

  @ApiProperty({ example: '2026-07-06T10:00:00.000Z', description: 'Submission timestamp' })
  submittedDate!: string;
}

export class PartnerAttentionRequiredResponseDto {
  @ApiProperty({ example: 'Attention Required', description: 'Banner title' })
  title!: string;

  @ApiProperty({ example: true, description: 'True when there are pending actions needing admin attention' })
  hasAttentionRequired!: boolean;

  @ApiProperty({ example: 6, description: 'Number of pending partnership applications awaiting admin review' })
  pendingRequestsCount!: number;

  @ApiProperty({
    example: '6 new partnership requests awaiting review',
    description: 'Formatted message text for the alert banner',
  })
  message!: string;

  @ApiProperty({ example: 'warning', description: 'Banner alert styling type' })
  alertType!: string;

  @ApiProperty({ example: 'high', description: 'Urgency severity level' })
  severity!: string;

  @ApiProperty({
    type: AttentionRequiredActionDto,
    description: 'Call-to-action payload for the banner link/button',
  })
  action!: AttentionRequiredActionDto;

  @ApiProperty({
    type: [PartnershipRequestPreviewDto],
    description: 'List of recent pending partnership requests awaiting moderation',
  })
  recentRequests!: PartnershipRequestPreviewDto[];
}
