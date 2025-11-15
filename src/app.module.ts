import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { MetricsModule } from './metrics/metrics.module'
import { AnalyticsModule } from './analytics/analytics.module'
import { HealthModule } from './health/health.module'
import { OpenSearchModule } from './opensearch/opensearch.module'
import redisConfig from './config/redis.config'
import openSearchConfig from './config/opensearch.config'
import appConfig from './config/app.config'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [redisConfig, openSearchConfig, appConfig]
    }),
    MetricsModule,
    AnalyticsModule,
    HealthModule,
    OpenSearchModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
