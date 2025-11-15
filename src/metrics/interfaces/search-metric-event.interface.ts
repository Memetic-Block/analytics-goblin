export interface SearchHit {
  documentId: string
  urlHost: string
  urlPath: string
  score: number
}

export interface SearchMetricEvent {
  requestId: string
  query: string
  offset: number
  executionTimeMs: number
  totalResults: number
  hitsCount: number
  hits: SearchHit[]
  timestamp: string
  userAgent?: string
}
