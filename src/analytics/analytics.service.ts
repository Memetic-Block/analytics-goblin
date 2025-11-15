import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { OpenSearchService } from '../opensearch/opensearch.service'
import {
  TopSearchResult,
  ZeroResultQuery,
  PopularDocument,
  PerformanceTrend,
  SearchStatsResponse
} from './interfaces/analytics.interface'

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name)
  private readonly indexPrefix: string

  constructor(
    private readonly openSearchService: OpenSearchService,
    private readonly configService: ConfigService
  ) {
    this.indexPrefix =
      this.configService.get('opensearch.metricsIndexPrefix') ||
      'search-metrics'
  }

  async getTopSearches(
    startDate: string,
    endDate: string,
    limit: number = 10
  ): Promise<TopSearchResult[]> {
    const result = await this.openSearchService.search({
      index: `${this.indexPrefix}-*`,
      body: {
        size: 0,
        query: {
          range: {
            timestamp: {
              gte: startDate,
              lte: endDate
            }
          }
        },
        aggs: {
          top_queries: {
            terms: {
              field: 'query.keyword',
              size: limit
            },
            aggs: {
              avg_execution_time: {
                avg: {
                  field: 'executionTimeMs'
                }
              },
              avg_total_results: {
                avg: {
                  field: 'totalResults'
                }
              }
            }
          }
        }
      }
    })

    return (result.body.aggregations as any).top_queries.buckets.map(
      (bucket: any) => ({
        query: bucket.key,
        count: bucket.doc_count,
        avgExecutionTimeMs: Math.round(bucket.avg_execution_time.value),
        avgTotalResults: Math.round(bucket.avg_total_results.value)
      })
    )
  }

  async getZeroResultQueries(
    startDate: string,
    endDate: string,
    limit: number = 10
  ): Promise<ZeroResultQuery[]> {
    const result = await this.openSearchService.search({
      index: `${this.indexPrefix}-*`,
      body: {
        size: 0,
        query: {
          bool: {
            must: [
              {
                range: {
                  timestamp: {
                    gte: startDate,
                    lte: endDate
                  }
                }
              },
              {
                term: {
                  totalResults: 0
                }
              }
            ]
          }
        },
        aggs: {
          zero_result_queries: {
            terms: {
              field: 'query.keyword',
              size: limit
            },
            aggs: {
              last_occurrence: {
                max: {
                  field: 'timestamp'
                }
              }
            }
          }
        }
      }
    })

    return (result.body.aggregations as any).zero_result_queries.buckets.map(
      (bucket: any) => ({
        query: bucket.key,
        count: bucket.doc_count,
        lastOccurrence: bucket.last_occurrence.value_as_string
      })
    )
  }

  async getPopularDocuments(
    startDate: string,
    endDate: string,
    limit: number = 10
  ): Promise<PopularDocument[]> {
    const result = await this.openSearchService.search({
      index: `${this.indexPrefix}-*`,
      body: {
        size: 0,
        query: {
          range: {
            timestamp: {
              gte: startDate,
              lte: endDate
            }
          }
        },
        aggs: {
          popular_docs: {
            nested: {
              path: 'hits'
            },
            aggs: {
              by_document: {
                terms: {
                  field: 'hits.documentId',
                  size: limit
                },
                aggs: {
                  avg_score: {
                    avg: {
                      field: 'hits.score'
                    }
                  },
                  url_host: {
                    terms: {
                      field: 'hits.urlHost',
                      size: 1
                    }
                  },
                  url_path: {
                    terms: {
                      field: 'hits.urlPath.keyword',
                      size: 1
                    }
                  }
                }
              }
            }
          }
        }
      }
    })

    return (
      result.body.aggregations as any
    ).popular_docs.by_document.buckets.map((bucket: any) => ({
      documentId: bucket.key,
      urlHost: bucket.url_host.buckets[0]?.key || '',
      urlPath: bucket.url_path.buckets[0]?.key || '',
      appearances: bucket.doc_count,
      avgScore: bucket.avg_score.value
    }))
  }

  async getPerformanceTrends(
    startDate: string,
    endDate: string,
    interval: string = '1h'
  ): Promise<PerformanceTrend[]> {
    const result = await this.openSearchService.search({
      index: `${this.indexPrefix}-*`,
      body: {
        size: 0,
        query: {
          range: {
            timestamp: {
              gte: startDate,
              lte: endDate
            }
          }
        },
        aggs: {
          trends: {
            date_histogram: {
              field: 'timestamp',
              fixed_interval: interval
            },
            aggs: {
              avg_execution_time: {
                avg: {
                  field: 'executionTimeMs'
                }
              },
              percentiles_execution_time: {
                percentiles: {
                  field: 'executionTimeMs',
                  percents: [50, 95, 99]
                }
              }
            }
          }
        }
      }
    })

    return (result.body.aggregations as any).trends.buckets.map(
      (bucket: any) => ({
        interval: bucket.key_as_string,
        avgExecutionTimeMs: Math.round(bucket.avg_execution_time.value),
        totalSearches: bucket.doc_count,
        p50ExecutionTimeMs: Math.round(
          bucket.percentiles_execution_time.values['50.0']
        ),
        p95ExecutionTimeMs: Math.round(
          bucket.percentiles_execution_time.values['95.0']
        ),
        p99ExecutionTimeMs: Math.round(
          bucket.percentiles_execution_time.values['99.0']
        )
      })
    )
  }

  async getSearchStats(
    startDate: string,
    endDate: string
  ): Promise<SearchStatsResponse> {
    const result = await this.openSearchService.search({
      index: `${this.indexPrefix}-*`,
      body: {
        size: 0,
        query: {
          range: {
            timestamp: {
              gte: startDate,
              lte: endDate
            }
          }
        },
        aggs: {
          unique_queries: {
            cardinality: {
              field: 'query.keyword'
            }
          },
          avg_execution_time: {
            avg: {
              field: 'executionTimeMs'
            }
          },
          zero_results: {
            filter: {
              term: {
                totalResults: 0
              }
            }
          }
        }
      }
    })

    const totalSearches =
      typeof result.body.hits.total === 'number'
        ? result.body.hits.total
        : result.body.hits.total?.value || 0
    const zeroResults = (result.body.aggregations as any).zero_results.doc_count

    return {
      totalSearches,
      uniqueQueries: (result.body.aggregations as any).unique_queries.value,
      avgExecutionTimeMs: Math.round(
        (result.body.aggregations as any).avg_execution_time.value
      ),
      zeroResultRate: totalSearches > 0 ? zeroResults / totalSearches : 0
    }
  }
}
