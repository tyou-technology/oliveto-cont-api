import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeadOrigin, LeadStatus } from '@common/types/enums';

export class LeadEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  phone: string | null;

  @ApiPropertyOptional()
  company: string | null;

  @ApiPropertyOptional()
  service: string | null;

  @ApiPropertyOptional()
  message: string | null;

  @ApiProperty({ enum: LeadOrigin })
  origin: LeadOrigin;

  @ApiProperty({ enum: LeadStatus })
  status: LeadStatus;

  @ApiProperty()
  isRead: boolean;

  @ApiPropertyOptional()
  notes: string | null;

  @ApiPropertyOptional()
  contactedAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
