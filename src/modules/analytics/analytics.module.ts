import { Module } from '@nestjs/common';
import { PrismaModule } from '@modules/prisma/prisma.module';
import { AnalyticsController } from '@modules/analytics/resource/analytics.controller';
import { AnalyticsService } from '@modules/analytics/service/analytics.service';
import { AnalyticsRepository } from '@modules/analytics/repository/analytics.repository';

@Module({
  imports: [PrismaModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsRepository],
})
export class AnalyticsModule {}
