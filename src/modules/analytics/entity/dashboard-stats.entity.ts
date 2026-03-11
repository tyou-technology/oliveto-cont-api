import { ApiProperty } from '@nestjs/swagger';

export class DashboardStatsEntity {
  @ApiProperty({ description: 'Total number of published articles' })
  publishedArticles: number;

  @ApiProperty({ description: 'Sum of visitsCount across all articles' })
  totalViews: number;

  @ApiProperty({ description: 'Total number of leads ever submitted' })
  totalLeads: number;

  @ApiProperty({ description: 'Number of leads not yet read by any admin' })
  unreadLeads: number;
}
