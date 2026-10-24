import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateTicketStatusDto {
  @IsNotEmpty()
  @IsString()
  status: 'Open' | 'Resolved';
}
