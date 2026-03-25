import { ArticleStatus, LeadOrigin, LeadStatus } from '@common/types/enums';

// ── Repository → Service boundary types ──────────────────────────────────────

export interface LeadStatusGroup {
  status: LeadStatus;
  _count: { _all: number };
}

export interface LeadOriginGroup {
  origin: LeadOrigin;
  _count: { _all: number };
}

export interface ArticleStatusGroup {
  status: ArticleStatus;
  _count: { _all: number };
}

export interface TagWithArticleViews {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  articleTags: { article: { visitsCount: number } }[];
}

// ── Service response types ────────────────────────────────────────────────────

export interface DashboardStats {
  publishedArticles: number;
  totalViews: number;
  totalLeads: number;
  unreadLeads: number;
}

export interface LeadStatusBreakdown {
  new: number;
  contacted: number;
  qualified: number;
  converted: number;
  lost: number;
}

export interface LeadOriginBreakdown {
  contactForm: number;
  newsletter: number;
  referral: number;
  socialMedia: number;
  googleAds: number;
  organicSearch: number;
}

export interface MonthlyLeadCount {
  month: string;
  count: number;
}

export interface LeadsAnalytics {
  byStatus: LeadStatusBreakdown;
  byOrigin: LeadOriginBreakdown;
  conversionRate: number;
  monthlyTrend: MonthlyLeadCount[];
}

export interface ArticleStatusBreakdown {
  draft: number;
  published: number;
  archived: number;
}

export interface TrendingTag {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  articleCount: number;
  totalViews: number;
}

export interface TopArticle {
  id: string;
  title: string;
  slug: string;
  visitsCount: number;
  readingTime: number;
  publishedAt: Date | null;
}

export interface ArticlesAnalytics {
  byStatus: ArticleStatusBreakdown;
  trendingTags: TrendingTag[];
  topArticles: TopArticle[];
}

export interface AnalyticsDashboard {
  stats: DashboardStats;
  leads: LeadsAnalytics;
  articles: ArticlesAnalytics;
}
