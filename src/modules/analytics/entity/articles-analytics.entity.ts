import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ArticleStatusBreakdownEntity {
  @ApiProperty() draft: number;
  @ApiProperty() published: number;
  @ApiProperty() archived: number;
}

export class TrendingTagEntity {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() color: string | null;
  @ApiPropertyOptional() icon: string | null;
  @ApiProperty({ description: 'Number of published articles with this tag' }) articleCount: number;
  @ApiProperty({ description: 'Sum of visitsCount for all published articles with this tag' })
  totalViews: number;
}

export class TopArticleEntity {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty() slug: string;
  @ApiProperty() visitsCount: number;
  @ApiProperty() readingTime: number;
  @ApiPropertyOptional() publishedAt: Date | null;
}

export class ArticlesAnalyticsEntity {
  @ApiProperty({ type: () => ArticleStatusBreakdownEntity })
  byStatus: ArticleStatusBreakdownEntity;

  @ApiProperty({ type: () => [TrendingTagEntity], description: `Top tags by total article views` })
  trendingTags: TrendingTagEntity[];

  @ApiProperty({ type: () => [TopArticleEntity], description: 'Most viewed published articles' })
  topArticles: TopArticleEntity[];
}
