import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArticleStatus } from '@common/types/enums';
import { ArticleAuthorEntity } from './articleAuthor.entity';
import { ArticleTagEntity } from './articleTag.entity';

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

  @ApiProperty({ type: () => [ArticleTagEntity] })
  articleTags: { tag: ArticleTagEntity }[];

  @ApiPropertyOptional()
  seoTitle: string | null;

  @ApiPropertyOptional()
  seoDescription: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
