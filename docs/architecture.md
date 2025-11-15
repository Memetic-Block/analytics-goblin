# Stats Goblin Architecture

## System Overview

```
┌─────────────────┐
│   Search API    │
│  (Producer)     │
└────────┬────────┘
         │ Publish metrics events
         ▼
┌─────────────────┐
│  Redis/BullMQ   │
│    (Queue)      │
└────────┬────────┘
         │ search-metrics queue
         ▼
┌─────────────────┐
│  Stats Goblin   │
│   (Consumer)    │
│                 │
│ ┌─────────────┐ │
│ │  Metrics    │ │──── Process events
│ │  Consumer   │ │     with retries
│ └──────┬──────┘ │
│        │        │
│        ▼        │
│ ┌─────────────┐ │
│ │ OpenSearch  │ │──── Index to
│ │  Indexer    │ │     daily indices
│ └──────┬──────┘ │
└────────┼────────┘
         │
         ▼
┌─────────────────┐
│   OpenSearch    │
│   (Storage)     │
│                 │
│ search-metrics- │
│   2025-11-14    │
│   2025-11-13    │
│      ...        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Stats Goblin   │
│ Analytics API   │
│                 │
│ GET /analytics/ │
│ - top-searches  │
│ - zero-results  │
│ - popular-docs  │
│ - trends        │
│ - stats         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Dashboard /   │
│   Clients       │
└─────────────────┘
```

## Component Breakdown

### 1. Search API (External)
- Publishes search metrics to BullMQ queue
- Fire-and-forget pattern (non-blocking)
- Includes query, results, timing, and hit details

### 2. Redis/BullMQ
- Message broker for event streaming
- Supports standalone and Sentinel modes
- Queue: `search-metrics`
- Job features:
  - Deduplication by hash
  - 3 retry attempts
  - Exponential backoff
  - Failed job retention (last 100)

### 3. Stats Goblin Consumer
- **Metrics Consumer**: BullMQ worker process
  - Processes jobs from `search-metrics` queue
  - Handles errors with automatic retries
  - Logs processing metrics
  
- **OpenSearch Indexer**: Indexing service
  - Creates daily-rolled indices
  - Applies index templates
  - Optimized mappings for search analytics
  - Graceful error handling

### 4. OpenSearch
- **Storage Layer**
  - Daily indices: `search-metrics-YYYY-MM-DD`
  - Configurable retention (default: 30 days)
  - Nested document support for hit arrays
  
- **Index Template**
  ```json
  {
    "mappings": {
      "properties": {
        "requestId": { "type": "keyword" },
        "query": { "type": "text", "fields": { "keyword": { "type": "keyword" } } },
        "executionTimeMs": { "type": "integer" },
        "totalResults": { "type": "integer" },
        "timestamp": { "type": "date" },
        "hits": {
          "type": "nested",
          "properties": {
            "documentId": { "type": "keyword" },
            "urlHost": { "type": "keyword" },
            "score": { "type": "float" }
          }
        }
      }
    }
  }
  ```

### 5. Analytics API
REST endpoints for querying aggregated metrics:

| Endpoint | Purpose | Aggregations Used |
|----------|---------|-------------------|
| `GET /analytics/top-searches` | Most frequent queries | Terms aggregation on `query.keyword` |
| `GET /analytics/zero-results` | Queries with no results | Filtered terms aggregation |
| `GET /analytics/popular-documents` | Most-returned documents | Nested aggregation on `hits` |
| `GET /analytics/performance-trends` | Time-series performance | Date histogram with percentiles |
| `GET /analytics/stats` | Overall statistics | Cardinality, averages, filters |

### 6. Health Monitoring
- `GET /health` - Overall system health
- `GET /health/redis` - Queue metrics and connectivity
- `GET /health/opensearch` - Cluster status and shards

## Data Flow

### Event Publishing (Search API)
```
User Search → Search API → OpenSearch Query → Results
                    ↓
              Async publish to BullMQ
                    ↓
              (Search continues)
```

### Event Processing (Stats Goblin)
```
BullMQ Queue → Consumer picks job
                    ↓
              Validate event schema
                    ↓
              Index to OpenSearch
                    ↓
              [Success] → Remove job
              [Failure] → Retry (max 3)
```

### Analytics Query
```
Client Request → Analytics Controller
                       ↓
                Analytics Service
                       ↓
                Build OpenSearch aggregation
                       ↓
                Execute query
                       ↓
                Transform results
                       ↓
                Return JSON response
```

## Configuration Management

### NestJS Config Modules

```
src/config/
  ├── redis.config.ts      - Redis/BullMQ connection
  ├── opensearch.config.ts - OpenSearch client config
  └── app.config.ts        - Application settings
```

All configs use environment variables with validation:
- Type-safe configuration objects
- Registered globally with `ConfigModule`
- Injected via dependency injection

## Scalability Patterns

### Horizontal Scaling
Run multiple Stats Goblin instances:
```bash
# Instance 1
PORT=3001 npm run start:prod

# Instance 2  
PORT=3002 npm run start:prod

# Instance N
PORT=300N npm run start:prod
```

All instances consume from same BullMQ queue:
- Jobs distributed automatically
- No duplicate processing (job locking)
- Linear scaling with worker count

### Vertical Scaling
- Increase BullMQ concurrency per worker
- Add more CPU/RAM to OpenSearch nodes
- Optimize index shard allocation

## Resilience & Reliability

### Graceful Degradation
- Search API continues if metrics queue fails
- Consumer retries on OpenSearch errors
- Health checks detect partial failures

### Error Handling
```
BullMQ Job Error
      ↓
Retry #1 (after 1s)
      ↓
Retry #2 (after 2s)
      ↓
Retry #3 (after 4s)
      ↓
Move to failed queue
      ↓
Alert/Manual review
```

### Data Durability
- BullMQ: Redis persistence (AOF/RDB)
- OpenSearch: Replica shards
- Daily index rollover for retention

## Security Considerations

### Current Implementation
- No authentication on analytics endpoints
- CORS configured via environment variable
- OpenSearch basic auth support

### Planned Enhancements (see future-improvements.md)
- JWT-based API authentication
- Role-based access control
- PII detection and scrubbing
- Audit logging

## Performance Optimization

### Query Optimization
- Index templates with optimized mappings
- Keyword fields for exact-match aggregations
- Nested objects for hit arrays
- Date histogram with fixed intervals

### Future Optimizations
- Pre-computed rollups (hourly/daily)
- Redis caching layer for hot queries
- Query result pagination
- OpenSearch query cache enablement

## Monitoring Metrics

### Operational Metrics
- Queue depth (waiting jobs)
- Processing rate (jobs/minute)
- Error rate (failed jobs %)
- OpenSearch indexing latency

### Business Metrics
- Search volume trends
- Zero-result rate
- Average search latency
- Popular content identification

## Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | NestJS | 11.x |
| Language | TypeScript | 5.7 |
| Queue | BullMQ | 5.x |
| Cache/Queue Broker | Redis | 7.x |
| Search Engine | OpenSearch | 2.x |
| Runtime | Node.js | 18+ or 20+ |

## Directory Structure

```
stats-goblin/
├── src/
│   ├── analytics/          # Analytics API endpoints
│   │   ├── analytics.controller.ts
│   │   ├── analytics.service.ts
│   │   ├── analytics.module.ts
│   │   └── interfaces/
│   ├── config/             # Configuration modules
│   │   ├── redis.config.ts
│   │   ├── opensearch.config.ts
│   │   └── app.config.ts
│   ├── health/             # Health check endpoints
│   │   ├── health.controller.ts
│   │   ├── health.service.ts
│   │   └── health.module.ts
│   ├── metrics/            # Event consumer
│   │   ├── metrics.consumer.ts
│   │   ├── metrics.module.ts
│   │   └── interfaces/
│   ├── opensearch/         # OpenSearch service
│   │   ├── opensearch.service.ts
│   │   └── opensearch.module.ts
│   ├── app.module.ts       # Root module
│   └── main.ts             # Application entry
├── docs/                   # Documentation
│   ├── architecture.md
│   ├── api-examples.md
│   └── future-improvements.md
├── docker-compose.yml      # Local development stack
├── .env.example           # Environment template
└── README.md              # Project overview
```
