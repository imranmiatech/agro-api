import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTicketMessageDto {
  @IsNotEmpty()
  @IsString()
  author: string;

  @IsNotEmpty()
  @IsString()
  authorRole: 'Vendor' | 'Admin';

  @IsOptional()
  @IsString()
  authorInitials?: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  attachmentName?: string;

  @IsOptional()
  @IsString()
  attachmentUrl?: string;

  @IsOptional()
  @IsString()
  attachmentType?: 'image' | 'file';
}
