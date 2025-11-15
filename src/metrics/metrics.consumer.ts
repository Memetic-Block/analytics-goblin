import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import { Job } from 'bullmq'
import { SearchMetricEvent } from './interfaces/search-metric-event.interface'
import { OpenSearchService } from '../opensearch/opensearch.service'

@Processor('search-metrics')
export class MetricsConsumer extends WorkerHost {
  private readonly logger = new Logger(MetricsConsumer.name)

  constructor(private readonly openSearchService: OpenSearchService) {
    super()
  }

  async process(job: Job<SearchMetricEvent>): Promise<void> {
    this.logger.log(
      `Processing metric event: ${job.id} - Query: "${job.data.query}"`
    )

    try {
      await this.openSearchService.indexMetric(job.data)

      this.logger.log(
        `Successfully indexed metric ${job.data.requestId} - ` +
          `Query: "${job.data.query}", Results: ${job.data.totalResults}, Time: ${job.data.executionTimeMs}ms`
      )
    } catch (error) {
      this.logger.error(
        `Failed to process metric ${job.data.requestId}: ${error.message}`,
        error.stack
      )
      throw error // Let BullMQ handle retries
    }
  }
}
