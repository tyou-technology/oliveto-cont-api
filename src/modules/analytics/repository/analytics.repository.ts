import { Injectable } from '@nestjs/common';
import { ArticleStatus } from '@common/types/enums';
import { PrismaService } from '@modules/prisma/prisma.service';
import { ANALYTICS_DEFAULTS } from '@modules/analytics/constants/analytics.constants';
import {
  ArticleStatusGroup,
  LeadOriginGroup,
  LeadStatusGroup,
  TagWithArticleViews,
  TopArticle,
} from '@modules/analytics/types/analytics.types';

@Injectable()
export class AnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async countPublishedArticles(): Promise<number> {
    return this.prisma.article.count({ where: { status: ArticleStatus.PUBLISHED } });
  }

  async sumArticleViews(): Promise<number> {
    const result = await this.prisma.article.aggregate({ _sum: { visitsCount: true } });
    return result._sum.visitsCount ?? 0;
  }

  async countAllLeads(): Promise<number> {
    return this.prisma.lead.count();
  }

  async countUnreadLeads(): Promise<number> {
    return this.prisma.lead.count({ where: { isRead: false } });
  }

  async groupLeadsByStatus(): Promise<LeadStatusGroup[]> {
    const rows = await this.prisma.lead.groupBy({ by: ['status'], _count: { _all: true } });
    return rows as unknown as LeadStatusGroup[];
  }

  async groupLeadsByOrigin(): Promise<LeadOriginGroup[]> {
    const rows = await this.prisma.lead.groupBy({ by: ['origin'], _count: { _all: true } });
    return rows as unknown as LeadOriginGroup[];
  }

  async findLeadCreatedAtSince(cutoff: Date): Promise<Date[]> {
    const rows = await this.prisma.lead.findMany({
      where: { createdAt: { gte: cutoff } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => r.createdAt);
  }

  async groupArticlesByStatus(): Promise<ArticleStatusGroup[]> {
    const rows = await this.prisma.article.groupBy({ by: ['status'], _count: { _all: true } });
    return rows as unknown as ArticleStatusGroup[];
  }

  async findTagsWithPublishedArticleViews(): Promise<TagWithArticleViews[]> {
    return this.prisma.tag.findMany({
      include: {
        articleTags: {
          where: { article: { status: ArticleStatus.PUBLISHED } },
          include: { article: { select: { visitsCount: true } } },
        },
      },
    });
  }

  async findTopPublishedArticles(): Promise<TopArticle[]> {
    const rows = await this.prisma.article.findMany({
      where: { status: ArticleStatus.PUBLISHED },
      orderBy: { visitsCount: 'desc' },
      take: ANALYTICS_DEFAULTS.TOP_ARTICLES_LIMIT,
      select: { id: true, title: true, slug: true, visitsCount: true, readingTime: true, publishedAt: true },
    });
    return rows as TopArticle[];
  }
}
