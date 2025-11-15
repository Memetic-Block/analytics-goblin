import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Client } from '@opensearch-project/opensearch'
import { SearchMetricEvent } from '../metrics/interfaces/search-metric-event.interface'

@Injectable()
export class OpenSearchService implements OnModuleInit {
  private readonly logger = new Logger(OpenSearchService.name)
  private client: Client
  private readonly indexPrefix: string
  private readonly retentionDays: number

  constructor(private configService: ConfigService) {
    const config = this.configService.get('opensearch')
    this.indexPrefix = config.metricsIndexPrefix
    this.retentionDays = config.retentionDays

    const clientConfig: any = {
      node: config.node
    }

    if (config.username && config.password) {
      clientConfig.auth = {
        username: config.username,
        password: config.password
      }
    }

    if (config.ssl) {
      clientConfig.ssl = config.ssl
    }

    this.client = new Client(clientConfig)
  }

  async onModuleInit() {
    try {
      const health = await this.client.cluster.health()
      this.logger.log(
        `Connected to OpenSearch cluster: ${health.body.cluster_name}`
      )
      await this.createIndexTemplate()
    } catch (error) {
      this.logger.error('Failed to connect to OpenSearch', error)
    }
  }

  private async createIndexTemplate() {
    const templateName = `${this.indexPrefix}-template`

    try {
      await this.client.indices.putIndexTemplate({
        name: templateName,
        body: {
          index_patterns: [`${this.indexPrefix}-*`],
          template: {
            settings: {
              number_of_shards: 1,
              number_of_replicas: 1,
              'index.lifecycle.name': `${this.indexPrefix}-policy`,
              'index.lifecycle.rollover_alias': this.indexPrefix
            },
            mappings: {
              properties: {
                requestId: { type: 'keyword' },
                query: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword' } }
                },
                offset: { type: 'integer' },
                executionTimeMs: { type: 'integer' },
                totalResults: { type: 'integer' },
                hitsCount: { type: 'integer' },
                timestamp: { type: 'date' },
                userAgent: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword' } }
                },
                hits: {
                  type: 'nested',
                  properties: {
                    documentId: { type: 'keyword' },
                    urlHost: { type: 'keyword' },
                    urlPath: {
                      type: 'text',
                      fields: { keyword: { type: 'keyword' } }
                    },
                    score: { type: 'float' }
                  }
                }
              }
            }
          }
        }
      })

      this.logger.log(`Index template ${templateName} created successfully`)
    } catch (error) {
      this.logger.warn(`Failed to create index template: ${error.message}`)
    }
  }

  private getIndexName(date: Date = new Date()): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${this.indexPrefix}-${year}-${month}-${day}`
  }

  async indexMetric(event: SearchMetricEvent): Promise<void> {
    const indexName = this.getIndexName(new Date(event.timestamp))

    try {
      await this.client.index({
        index: indexName,
        body: event,
        id: event.requestId
      })

      this.logger.debug(`Indexed metric: ${event.requestId}`)
    } catch (error) {
      this.logger.error(
        `Failed to index metric ${event.requestId}: ${error.message}`
      )
      throw error
    }
  }

  async search(params: any) {
    return this.client.search(params)
  }

  getClient(): Client {
    return this.client
  }
}
