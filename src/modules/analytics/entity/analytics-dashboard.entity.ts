import { ApiProperty } from '@nestjs/swagger';
import { DashboardStatsEntity } from './dashboard-stats.entity';
import { LeadsAnalyticsEntity } from './leads-analytics.entity';
import { ArticlesAnalyticsEntity } from './articles-analytics.entity';

export class AnalyticsDashboardEntity {
  @ApiProperty({ type: () => DashboardStatsEntity })
  stats: DashboardStatsEntity;

  @ApiProperty({ type: () => LeadsAnalyticsEntity })
  leads: LeadsAnalyticsEntity;

  @ApiProperty({ type: () => ArticlesAnalyticsEntity })
  articles: ArticlesAnalyticsEntity;
}
