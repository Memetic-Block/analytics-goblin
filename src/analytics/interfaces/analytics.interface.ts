export interface TopSearchResult {
  query: string
  count: number
  avgExecutionTimeMs: number
  avgTotalResults: number
}

export interface ZeroResultQuery {
  query: string
  count: number
  lastOccurrence: string
}

export interface PopularDocument {
  documentId: string
  urlHost: string
  urlPath: string
  appearances: number
  avgScore: number
}

export interface PerformanceTrend {
  interval: string
  avgExecutionTimeMs: number
  totalSearches: number
  p50ExecutionTimeMs: number
  p95ExecutionTimeMs: number
  p99ExecutionTimeMs: number
}

export interface SearchStatsResponse {
  totalSearches: number
  uniqueQueries: number
  avgExecutionTimeMs: number
  zeroResultRate: number
}
