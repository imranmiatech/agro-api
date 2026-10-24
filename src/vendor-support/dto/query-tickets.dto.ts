import { IsOptional, IsString } from 'class-validator';

export class QueryTicketsDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  vendorId?: string;
}
