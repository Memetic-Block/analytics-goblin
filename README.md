# Stats Goblin 📊

A NestJS-based metrics microservice that consumes search events from BullMQ queues and provides comprehensive analytics using OpenSearch.

## Features

- **BullMQ Consumer** - Reliable event processing from `search-metrics` queue with automatic retries
- **OpenSearch Storage** - Daily-rolled indices with configurable retention policies
- **Analytics API** - REST endpoints for querying aggregated metrics and trends
- **Health Monitoring** - Service health checks for Redis and OpenSearch
- **Graceful Degradation** - Continues processing even if individual components fail
- **Flexible Redis Support** - Standalone and Redis Sentinel configurations

## Architecture

```
Search API → Redis/BullMQ → Stats Goblin → OpenSearch
                                ↓
                         Analytics API
```

1. Search API publishes metrics events to `search-metrics` BullMQ queue
2. Stats Goblin consumes events and indexes them in OpenSearch
3. Analytics API provides aggregated metrics queries
4. OpenSearch stores raw events in daily indices with automatic rollover

## Prerequisites

- Node.js 18+ or 20+
- Redis (standalone or Sentinel cluster)
- OpenSearch 2.x

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key configuration:

```bash
# Redis
REDIS_MODE=standalone
REDIS_HOST=localhost
REDIS_PORT=6379

# OpenSearch
OPENSEARCH_HOST=http://localhost:9200
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=admin

# Application
PORT=3001
QUEUE_NAME=search-metrics
```

### 3. Start Infrastructure (Optional)

Use Docker Compose for local development:

```bash
docker-compose up -d
```

This starts:
- Redis on port 6379
- OpenSearch on port 9200
- OpenSearch Dashboards on port 5601

### 4. Run the Application

```bash
# Development mode with hot-reload
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## API Endpoints

### Health Checks

```bash
# Overall health
GET /health

# Redis health
GET /health/redis

# OpenSearch health
GET /health/opensearch
```

### Analytics Endpoints

All analytics endpoints require `start` and `end` query parameters (ISO 8601 format).

#### Top Searches

Get most frequent search queries with performance metrics:

```bash
GET /analytics/top-searches?start=2025-01-01T00:00:00Z&end=2025-01-31T23:59:59Z&limit=10
```

Response:
```json
[
  {
    "query": "nestjs tutorial",
    "count": 1250,
    "avgExecutionTimeMs": 42,
    "avgTotalResults": 8500
  }
]
```

#### Zero-Result Queries

Find searches that returned no results:

```bash
GET /analytics/zero-results?start=2025-01-01T00:00:00Z&end=2025-01-31T23:59:59Z&limit=10
```

Response:
```json
[
  {
    "query": "obscure technical term",
    "count": 15,
    "lastOccurrence": "2025-01-30T14:23:15Z"
  }
]
```

#### Popular Documents

Discover which documents appear most frequently in search results:

```bash
GET /analytics/popular-documents?start=2025-01-01T00:00:00Z&end=2025-01-31T23:59:59Z&limit=10
```

Response:
```json
[
  {
    "documentId": "doc-12345",
    "urlHost": "example.com",
    "urlPath": "/guides/getting-started",
    "appearances": 3500,
    "avgScore": 9.8
  }
]
```

#### Performance Trends

Analyze search performance over time:

```bash
GET /analytics/performance-trends?start=2025-01-01T00:00:00Z&end=2025-01-31T23:59:59Z&interval=1h
```

Intervals: `1m`, `5m`, `15m`, `30m`, `1h`, `6h`, `12h`, `1d`

Response:
```json
[
  {
    "interval": "2025-01-15T10:00:00Z",
    "avgExecutionTimeMs": 45,
    "totalSearches": 250,
    "p50ExecutionTimeMs": 38,
    "p95ExecutionTimeMs": 120,
    "p99ExecutionTimeMs": 250
  }
]
```

#### Search Statistics

Get overall search statistics:

```bash
GET /analytics/stats?start=2025-01-01T00:00:00Z&end=2025-01-31T23:59:59Z
```

Response:
```json
{
  "totalSearches": 125000,
  "uniqueQueries": 8500,
  "avgExecutionTimeMs": 48,
  "zeroResultRate": 0.12
}
```

## Event Schema

Stats Goblin expects events matching the following schema from the `search-metrics` queue:

```typescript
{
  requestId: string           // UUID for deduplication
  query: string              // Search query text
  offset: number            // Pagination offset
  executionTimeMs: number   // Search execution time
  totalResults: number      // Total matching documents
  hitsCount: number         // Number of results returned
  hits: [
    {
      documentId: string
      urlHost: string
      urlPath: string
      score: number
    }
  ]
  timestamp: string         // ISO 8601 timestamp
  userAgent?: string        // Client user agent
}
```

## Configuration

### Environment Variables

#### Redis Configuration

**Standalone Mode:**
```bash
REDIS_MODE=standalone
REDIS_HOST=localhost
REDIS_PORT=6379
```

**Sentinel Mode (Production):**
```bash
REDIS_MODE=sentinel
REDIS_MASTER_NAME=mymaster
REDIS_SENTINEL_1_HOST=sentinel1
REDIS_SENTINEL_1_PORT=26379
REDIS_SENTINEL_2_HOST=sentinel2
REDIS_SENTINEL_2_PORT=26379
REDIS_SENTINEL_3_HOST=sentinel3
REDIS_SENTINEL_3_PORT=26379
```

#### OpenSearch Configuration

```bash
OPENSEARCH_HOST=http://localhost:9200
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=admin

# Optional TLS
OPENSEARCH_USE_TLS=false
OPENSEARCH_SSL_VERIFY=true
```

#### Application Configuration

```bash
PORT=3001
CORS_ALLOWED_ORIGIN=*
QUEUE_NAME=search-metrics
METRICS_INDEX_PREFIX=search-metrics
METRICS_RETENTION_DAYS=30
```

### Index Management

Indices are created with the pattern: `search-metrics-YYYY-MM-DD`

The service automatically:
- Creates daily indices
- Applies index templates with optimized mappings
- Supports nested document structures for hit arrays

To manually manage retention, query OpenSearch directly or implement ILM policies.

## Development

```bash
# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov

# Lint code
npm run lint

# Format code
npm run format
```

## Production Deployment

### Recommended Setup

1. **Redis Sentinel** - Use Redis Sentinel cluster for high availability
2. **OpenSearch Cluster** - Multi-node cluster with replicas
3. **Horizontal Scaling** - Run multiple Stats Goblin instances as BullMQ workers
4. **Monitoring** - Monitor queue depth, processing lag, and error rates
5. **Alerts** - See `docs/future-improvements.md` for alerting strategies

### Performance Tuning

- **Worker Concurrency**: Configure BullMQ concurrency based on CPU/memory
- **Batch Indexing**: Consider bulk indexing for high-throughput scenarios
- **Index Shards**: Adjust shard count based on data volume
- **Query Caching**: Enable OpenSearch query cache for analytics endpoints

## Monitoring

### Key Metrics to Track

- **Queue Depth**: Check `/health/redis` for waiting jobs
- **Processing Rate**: Jobs processed per minute
- **Error Rate**: Failed jobs in queue
- **OpenSearch Health**: Cluster status and shard allocation
- **API Latency**: Response times for analytics endpoints

### Health Check Integration

Integrate health endpoints with:
- Kubernetes liveness/readiness probes
- Load balancer health checks
- Monitoring systems (Datadog, New Relic, etc.)

## Troubleshooting

### Queue Not Processing

1. Check Redis connectivity: `GET /health/redis`
2. Verify queue name matches producer configuration
3. Check worker logs for errors
4. Verify BullMQ connection settings

### OpenSearch Indexing Failures

1. Check OpenSearch health: `GET /health/opensearch`
2. Verify credentials and permissions
3. Check disk space on OpenSearch nodes
4. Review index template mapping conflicts

### Analytics Queries Slow

1. Add more replica shards for read capacity
2. Implement pre-aggregation (see future improvements)
3. Reduce query time range
4. Enable OpenSearch query cache

## Future Improvements

See [`docs/future-improvements.md`](./docs/future-improvements.md) for planned enhancements:

- Prometheus metrics exporter
- AlertManager integration
- Advanced ML-based analytics
- Real-time streaming dashboards
- Multi-tenancy support

## Tests

### Spec Tests
```bash
$ npm run test
```

### e2e tests
```bash
$ npm run test:e2e
```

### Test Coverage
```bash
# test coverage
$ npm run test:cov
```

## License

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0) - see the [LICENSE](LICENSE) file for details.
