import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { ConfigService } from '@nestjs/config'
import { MetricsConsumer } from './metrics.consumer'
import { OpenSearchModule } from '../opensearch/opensearch.module'

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const redisConfig = configService.get('redis')

        if (redisConfig.mode === 'sentinel') {
          return {
            connection: {
              sentinels: redisConfig.sentinels,
              name: redisConfig.masterName
            }
          }
        }

        return {
          connection: {
            host: redisConfig.host,
            port: redisConfig.port
          }
        }
      },
      inject: [ConfigService]
    }),
    BullModule.registerQueue({
      name: 'search-metrics'
    }),
    OpenSearchModule
  ],
  providers: [MetricsConsumer]
})
export class MetricsModule {}
