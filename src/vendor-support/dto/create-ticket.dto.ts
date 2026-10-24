import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTicketDto {
  @IsOptional()
  @IsString()
  vendorId?: string;

  @IsNotEmpty()
  @IsString()
  vendorName: string;

  @IsNotEmpty()
  @IsString()
  storeName: string;

  @IsNotEmpty()
  @IsString()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsNotEmpty()
  @IsString()
  category: string;

  @IsNotEmpty()
  @IsString()
  priority: string;

  @IsNotEmpty()
  @IsString()
  subject: string;

  @IsNotEmpty()
  @IsString()
  message: string;

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
