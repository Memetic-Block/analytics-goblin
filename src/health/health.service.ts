import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Queue } from 'bullmq'
import { InjectQueue } from '@nestjs/bullmq'
import { OpenSearchService } from '../opensearch/opensearch.service'

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  services: {
    redis: ServiceStatus
    opensearch: ServiceStatus
  }
}

export interface ServiceStatus {
  status: 'up' | 'down'
  message?: string
  details?: any
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name)

  constructor(
    @InjectQueue('search-metrics') private readonly queue: Queue,
    private readonly openSearchService: OpenSearchService,
    private readonly configService: ConfigService
  ) {}

  async checkHealth(): Promise<HealthStatus> {
    const [redis, opensearch] = await Promise.all([
      this.checkRedis(),
      this.checkOpenSearch()
    ])

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'

    if (redis.status === 'down' && opensearch.status === 'down') {
      overallStatus = 'unhealthy'
    } else if (redis.status === 'down' || opensearch.status === 'down') {
      overallStatus = 'degraded'
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: {
        redis,
        opensearch
      }
    }
  }

  async checkRedis(): Promise<ServiceStatus> {
    try {
      const client = await this.queue.client
      await client.ping()

      // Get queue metrics
      const [waiting, active, completed, failed] = await Promise.all([
        this.queue.getWaitingCount(),
        this.queue.getActiveCount(),
        this.queue.getCompletedCount(),
        this.queue.getFailedCount()
      ])

      return {
        status: 'up',
        details: {
          waiting,
          active,
          completed,
          failed
        }
      }
    } catch (error) {
      this.logger.error(`Redis health check failed: ${error.message}`)
      return {
        status: 'down',
        message: error.message
      }
    }
  }

  async checkOpenSearch(): Promise<ServiceStatus> {
    try {
      const client = this.openSearchService.getClient()
      const health = await client.cluster.health()

      return {
        status: 'up',
        details: {
          clusterName: health.body.cluster_name,
          clusterStatus: health.body.status,
          numberOfNodes: health.body.number_of_nodes,
          activeShards: health.body.active_shards
        }
      }
    } catch (error) {
      this.logger.error(`OpenSearch health check failed: ${error.message}`)
      return {
        status: 'down',
        message: error.message
      }
    }
  }
}
