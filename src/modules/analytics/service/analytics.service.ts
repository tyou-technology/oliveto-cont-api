import { Injectable } from '@nestjs/common';
import { LeadStatus, LeadOrigin, ArticleStatus } from '@common/types/enums';
import { ANALYTICS_DEFAULTS } from '@modules/analytics/constants/analytics.constants';
import { AnalyticsRepository } from '@modules/analytics/repository/analytics.repository';
import {
  ArticleStatusBreakdown,
  ArticleStatusGroup,
  ArticlesAnalytics,
  DashboardStats,
  LeadOriginBreakdown,
  LeadOriginGroup,
  LeadStatusBreakdown,
  LeadStatusGroup,
  LeadsAnalytics,
  MonthlyLeadCount,
  TagWithArticleViews,
  TrendingTag,
} from '@modules/analytics/types/analytics.types';

@Injectable()
export class AnalyticsService {
  constructor(private readonly analyticsRepository: AnalyticsRepository) {}

  async getStats(): Promise<DashboardStats> {
    const [publishedArticles, totalViews, totalLeads, unreadLeads] = await Promise.all([
      this.analyticsRepository.countPublishedArticles(),
      this.analyticsRepository.sumArticleViews(),
      this.analyticsRepository.countAllLeads(),
      this.analyticsRepository.countUnreadLeads(),
    ]);

    return { publishedArticles, totalViews, totalLeads, unreadLeads };
  }

  async getLeadsAnalytics(): Promise<LeadsAnalytics> {
    const cutoff = this.buildMonthsCutoff(ANALYTICS_DEFAULTS.MONTHLY_TREND_MONTHS);

    const [byStatusGroups, byOriginGroups, totalLeads, createdDates] = await Promise.all([
      this.analyticsRepository.groupLeadsByStatus(),
      this.analyticsRepository.groupLeadsByOrigin(),
      this.analyticsRepository.countAllLeads(),
      this.analyticsRepository.findLeadCreatedAtSince(cutoff),
    ]);

    return {
      byStatus: this.buildLeadStatusBreakdown(byStatusGroups),
      byOrigin: this.buildLeadOriginBreakdown(byOriginGroups),
      conversionRate: this.calculateConversionRate(byStatusGroups, totalLeads),
      monthlyTrend: this.aggregateByMonth(createdDates),
    };
  }

  async getArticlesAnalytics(): Promise<ArticlesAnalytics> {
    const [byStatusGroups, tagsWithViews, topArticles] = await Promise.all([
      this.analyticsRepository.groupArticlesByStatus(),
      this.analyticsRepository.findTagsWithPublishedArticleViews(),
      this.analyticsRepository.findTopPublishedArticles(),
    ]);

    return {
      byStatus: this.buildArticleStatusBreakdown(byStatusGroups),
      trendingTags: this.buildTrendingTags(tagsWithViews),
      topArticles,
    };
  }

  private buildMonthsCutoff(months: number): Date {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    return cutoff;
  }

  private aggregateByMonth(dates: Date[]): MonthlyLeadCount[] {
    const monthMap = new Map<string, number>();

    dates.forEach((date) => {
      const month = date.toISOString().slice(0, 7);
      monthMap.set(month, (monthMap.get(month) ?? 0) + 1);
    });

    return Array.from(monthMap.entries()).map(([month, count]) => ({ month, count }));
  }

  private calculateConversionRate(groups: LeadStatusGroup[], total: number): number {
    if (total === 0) return 0;
    const qualified = groups.find((g) => g.status === LeadStatus.QUALIFIED)?._count._all ?? 0;
    const converted = groups.find((g) => g.status === LeadStatus.CONVERTED)?._count._all ?? 0;
    return Math.round(((qualified + converted) / total) * 100);
  }

  private buildTrendingTags(tags: TagWithArticleViews[]): TrendingTag[] {
    return tags
      .map((tag) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        icon: tag.icon,
        articleCount: tag.articleTags.length,
        totalViews: tag.articleTags.reduce((sum, at) => sum + at.article.visitsCount, 0),
      }))
      .filter((tag) => tag.articleCount > 0)
      .sort((a, b) => b.totalViews - a.totalViews)
      .slice(0, ANALYTICS_DEFAULTS.TRENDING_TAGS_LIMIT);
  }

  private buildLeadStatusBreakdown(groups: LeadStatusGroup[]): LeadStatusBreakdown {
    const get = (s: LeadStatus) => groups.find((g) => g.status === s)?._count._all ?? 0;
    return {
      new: get(LeadStatus.NEW),
      contacted: get(LeadStatus.CONTACTED),
      qualified: get(LeadStatus.QUALIFIED),
      converted: get(LeadStatus.CONVERTED),
      lost: get(LeadStatus.LOST),
    };
  }

  private buildLeadOriginBreakdown(groups: LeadOriginGroup[]): LeadOriginBreakdown {
    const get = (o: LeadOrigin) => groups.find((g) => g.origin === o)?._count._all ?? 0;
    return {
      contactForm: get(LeadOrigin.CONTACT_FORM),
      newsletter: get(LeadOrigin.NEWSLETTER),
      referral: get(LeadOrigin.REFERRAL),
      socialMedia: get(LeadOrigin.SOCIAL_MEDIA),
      googleAds: get(LeadOrigin.GOOGLE_ADS),
      organicSearch: get(LeadOrigin.ORGANIC_SEARCH),
    };
  }

  private buildArticleStatusBreakdown(groups: ArticleStatusGroup[]): ArticleStatusBreakdown {
    const get = (s: ArticleStatus) => groups.find((g) => g.status === s)?._count._all ?? 0;
    return {
      draft: get(ArticleStatus.DRAFT),
      published: get(ArticleStatus.PUBLISHED),
      archived: get(ArticleStatus.ARCHIVED),
    };
  }
}
