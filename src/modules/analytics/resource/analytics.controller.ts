import { Controller, Get, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Roles } from '@common/decorators/roles.decorator';
import { enrichEvent } from '@common/utils/enrich-event.util';
import { Role } from '@common/types/enums';
import { ANALYTICS_ACTIONS, ANALYTICS_ROUTES } from '@modules/analytics/constants/analytics.constants';
import { AnalyticsService } from '@modules/analytics/service/analytics.service';
import { AnalyticsDashboardEntity } from '@modules/analytics/entity/analytics-dashboard.entity';
import { DashboardStatsEntity } from '@modules/analytics/entity/dashboard-stats.entity';
import { LeadsAnalyticsEntity } from '@modules/analytics/entity/leads-analytics.entity';
import { ArticlesAnalyticsEntity } from '@modules/analytics/entity/articles-analytics.entity';

@ApiTags('analytics')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller(ANALYTICS_ROUTES.BASE)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @ApiOperation({ summary: 'Get full dashboard analytics in one call (Admin only)' })
  @ApiOkResponse({ type: AnalyticsDashboardEntity })
  @Get()
  async getDashboard(@Req() req?: Request) {
    const dashboard = await this.analyticsService.getDashboard();

    enrichEvent(req, { analytics: { action: ANALYTICS_ACTIONS.FETCH_DASHBOARD } });

    return {
      data: dashboard,
      _links: { self: { href: `/${ANALYTICS_ROUTES.BASE}`, method: 'GET' } },
    };
  }

  @ApiOperation({ summary: 'Get dashboard KPI stats (Admin only)' })
  @ApiOkResponse({ type: DashboardStatsEntity })
  @Get(ANALYTICS_ROUTES.STATS)
  async getStats(@Req() req?: Request) {
    const stats = await this.analyticsService.getStats();

    enrichEvent(req, { analytics: { action: ANALYTICS_ACTIONS.FETCH_STATS } });

    return {
      data: stats,
      _links: { self: { href: `/${ANALYTICS_ROUTES.BASE}/${ANALYTICS_ROUTES.STATS}`, method: 'GET' } },
    };
  }

  @ApiOperation({ summary: 'Get leads analytics breakdown (Admin only)' })
  @ApiOkResponse({ type: LeadsAnalyticsEntity })
  @Get(ANALYTICS_ROUTES.LEADS)
  async getLeadsAnalytics(@Req() req?: Request) {
    const analytics = await this.analyticsService.getLeadsAnalytics();

    enrichEvent(req, { analytics: { action: ANALYTICS_ACTIONS.FETCH_LEADS_ANALYTICS } });

    return {
      data: analytics,
      _links: { self: { href: `/${ANALYTICS_ROUTES.BASE}/${ANALYTICS_ROUTES.LEADS}`, method: 'GET' } },
    };
  }

  @ApiOperation({ summary: 'Get articles analytics breakdown (Admin only)' })
  @ApiOkResponse({ type: ArticlesAnalyticsEntity })
  @Get(ANALYTICS_ROUTES.ARTICLES)
  async getArticlesAnalytics(@Req() req?: Request) {
    const analytics = await this.analyticsService.getArticlesAnalytics();

    enrichEvent(req, { analytics: { action: ANALYTICS_ACTIONS.FETCH_ARTICLES_ANALYTICS } });

    return {
      data: analytics,
      _links: { self: { href: `/${ANALYTICS_ROUTES.BASE}/${ANALYTICS_ROUTES.ARTICLES}`, method: 'GET' } },
    };
  }
}
