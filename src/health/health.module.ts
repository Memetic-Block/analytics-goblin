import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { HealthController } from './health.controller'
import { HealthService } from './health.service'
import { OpenSearchModule } from '../opensearch/opensearch.module'

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'search-metrics'
    }),
    OpenSearchModule
  ],
  controllers: [HealthController],
  providers: [HealthService]
})
export class HealthModule {}
