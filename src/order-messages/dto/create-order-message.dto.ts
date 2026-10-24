import { IsOptional, IsString } from 'class-validator';

export class CreateOrderMessageDto {
  @IsString()
  @IsOptional()
  sender?: 'customer' | 'vendor';

  @IsString()
  @IsOptional()
  senderName?: string;

  @IsString()
  text: string;

  @IsOptional()
  attachment?: {
    name: string;
    type: 'image' | 'file';
    dataUrl: string;
    size?: string;
  };
}
