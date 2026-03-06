import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TagEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description: string | null;

  @ApiPropertyOptional()
  color: string | null;

  @ApiPropertyOptional()
  icon: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
