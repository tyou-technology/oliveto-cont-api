export const ANALYTICS_ROUTES = {
  BASE: 'analytics',
  STATS: 'stats',
  LEADS: 'leads',
  ARTICLES: 'articles',
} as const;

export const ANALYTICS_ACTIONS = {
  FETCH_STATS: 'fetch_stats',
  FETCH_LEADS_ANALYTICS: 'fetch_leads_analytics',
  FETCH_ARTICLES_ANALYTICS: 'fetch_articles_analytics',
} as const;

export const ANALYTICS_DEFAULTS = {
  TOP_ARTICLES_LIMIT: 5,
  TRENDING_TAGS_LIMIT: 10,
  MONTHLY_TREND_MONTHS: 12,
} as const;
