import { ApiProperty } from '@nestjs/swagger';

export class LeadStatusBreakdownEntity {
  @ApiProperty() new: number;
  @ApiProperty() contacted: number;
  @ApiProperty() qualified: number;
  @ApiProperty() converted: number;
  @ApiProperty() lost: number;
}

export class LeadOriginBreakdownEntity {
  @ApiProperty() contactForm: number;
  @ApiProperty() newsletter: number;
  @ApiProperty() referral: number;
  @ApiProperty() socialMedia: number;
  @ApiProperty() googleAds: number;
  @ApiProperty() organicSearch: number;
}

export class MonthlyLeadCountEntity {
  @ApiProperty({ example: '2025-03', description: 'Month in YYYY-MM format' })
  month: string;

  @ApiProperty() count: number;
}

export class LeadsAnalyticsEntity {
  @ApiProperty({ type: () => LeadStatusBreakdownEntity })
  byStatus: LeadStatusBreakdownEntity;

  @ApiProperty({ type: () => LeadOriginBreakdownEntity })
  byOrigin: LeadOriginBreakdownEntity;

  @ApiProperty({ description: 'Percentage of leads that reached QUALIFIED or CONVERTED' })
  conversionRate: number;

  @ApiProperty({ type: () => [MonthlyLeadCountEntity], description: 'Leads created per month for the last 12 months' })
  monthlyTrend: MonthlyLeadCountEntity[];
}
