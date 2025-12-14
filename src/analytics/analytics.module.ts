import { Module } from '@nestjs/common'
import { AnalyticsController } from './analytics.controller'
import { AnalyticsService } from './analytics.service'
import { OpenSearchModule } from '../opensearch/opensearch.module'
import { RewardsQueueModule } from '../rewards-queue/rewards-queue.module'

@Module({
  imports: [OpenSearchModule, RewardsQueueModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService]
})
export class AnalyticsModule {}
