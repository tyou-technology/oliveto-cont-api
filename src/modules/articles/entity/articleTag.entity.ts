import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ArticleTagEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  color: string | null;

  @ApiPropertyOptional()
  icon: string | null;
}
