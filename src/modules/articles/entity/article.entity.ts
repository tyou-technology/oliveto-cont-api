import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArticleStatus } from '@common/types/enums';

export class ArticleAuthorEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  avatarUrl: string | null;
}

export class ArticleEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  briefing: string | null;

  @ApiProperty()
  content: string;

  @ApiProperty()
  readingTime: number;

  @ApiProperty()
  visitsCount: number;

  @ApiPropertyOptional()
  coverUrl: string | null;

  @ApiProperty({ enum: ArticleStatus })
  status: ArticleStatus;

  @ApiPropertyOptional()
  publishedAt: Date | null;

  @ApiProperty()
  authorId: string;

  @ApiProperty({ type: () => ArticleAuthorEntity })
  author: ArticleAuthorEntity;

  @ApiProperty({ type: [Object] })
  articleTags: unknown[];

  @ApiPropertyOptional()
  seoTitle: string | null;

  @ApiPropertyOptional()
  seoDescription: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
