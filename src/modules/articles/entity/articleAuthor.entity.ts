import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ArticleAuthorEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  avatarUrl: string | null;
}
