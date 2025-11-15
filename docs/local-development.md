# Local Development Guide

Quick setup guide for running Stats Goblin locally.

## Prerequisites

- Node.js 18+ or 20+
- Docker and Docker Compose (for infrastructure)
- Git

## Initial Setup

### 1. Clone and Install

```bash
cd stats-goblin
npm install
```

### 2. Start Infrastructure

```bash
# Start Redis and OpenSearch
docker-compose up -d

# Check services are running
docker-compose ps

# View logs
docker-compose logs -f
```

This starts:
- **Redis** on `localhost:6379`
- **OpenSearch** on `localhost:9200`
- **OpenSearch Dashboards** on `localhost:5601`

### 3. Configure Environment

```bash
cp .env.example .env
```

Default `.env` for local development:
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
CORS_ALLOWED_ORIGIN=*
QUEUE_NAME=search-metrics

# Metrics
METRICS_INDEX_PREFIX=search-metrics
METRICS_RETENTION_DAYS=30
```

### 4. Run the Application

```bash
# Development mode with hot-reload
npm run start:dev

# The application will start on http://localhost:3001
```

You should see:
```
[Nest] INFO [NestApplication] Nest application successfully started
[Nest] INFO [OpenSearchService] Connected to OpenSearch cluster: docker-cluster
Stats Goblin Mode ON @ port 3001
```

## Verify Setup

### Check Health

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-14T10:00:00.000Z",
  "services": {
    "redis": {
      "status": "up",
      "details": {
        "waiting": 0,
        "active": 0,
        "completed": 0,
        "failed": 0
      }
    },
    "opensearch": {
      "status": "up",
      "details": {
        "clusterName": "docker-cluster",
        "clusterStatus": "green",
        "numberOfNodes": 1,
        "activeShards": 0
      }
    }
  }
}
```

### Check OpenSearch Directly

```bash
# Cluster health
curl http://localhost:9200/_cluster/health

# List indices
curl http://localhost:9200/_cat/indices?v
```

### Check Redis

```bash
# Connect to Redis CLI in Docker
docker exec -it $(docker ps -q -f name=redis) redis-cli

# Check queue
redis> KEYS *
redis> LLEN bull:search-metrics:wait
redis> exit
```

## Testing the Pipeline

### 1. Publish a Test Event

Create a test script `scripts/publish-test-event.js`:

```javascript
const { Queue } = require('bullmq');

async function publishTestEvent() {
  const queue = new Queue('search-metrics', {
    connection: {
      host: 'localhost',
      port: 6379,
    },
  });

  const event = {
    requestId: `test-${Date.now()}`,
    query: 'nestjs microservices',
    offset: 0,
    executionTimeMs: 42,
    totalResults: 150,
    hitsCount: 10,
    hits: [
      {
        documentId: 'doc-123',
        urlHost: 'docs.example.com',
        urlPath: '/guides/microservices',
        score: 9.5,
      },
      {
        documentId: 'doc-456',
        urlHost: 'docs.example.com',
        urlPath: '/tutorials/nestjs',
        score: 8.2,
      },
    ],
    timestamp: new Date().toISOString(),
    userAgent: 'Mozilla/5.0 Test Client',
  };

  await queue.add('search-metric', event);
  console.log('Test event published:', event.requestId);

  await queue.close();
}

publishTestEvent().catch(console.error);
```

Run it:
```bash
node scripts/publish-test-event.js
```

### 2. Verify Event Processing

Check the application logs - you should see:
```
[Nest] LOG [MetricsConsumer] Processing metric event: ...
[Nest] LOG [MetricsConsumer] Successfully indexed metric ...
```

### 3. Query the Data

```bash
# Check if index was created
curl http://localhost:9200/_cat/indices?v | grep search-metrics

# Query the event
TODAY=$(date -u +%Y-%m-%d)
curl "http://localhost:9200/search-metrics-${TODAY}/_search?pretty"

# Query via Analytics API
START=$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)
END=$(date -u +%Y-%m-%dT%H:%M:%SZ)

curl "http://localhost:3001/analytics/top-searches?start=${START}&end=${END}"
```

## Development Workflow

### Hot Reload

The app runs in watch mode with `npm run start:dev`. Changes to TypeScript files will trigger automatic recompilation and restart.

### Debugging

#### VS Code Launch Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug NestJS",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "start:debug"],
      "console": "integratedTerminal",
      "restart": true,
      "protocol": "inspector",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

Run with F5 or from Debug panel.

#### Manual Debug

```bash
npm run start:debug
```

Then attach debugger to `localhost:9229`.

### Testing

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

### Linting and Formatting

```bash
# Run linter
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix

# Format code
npm run format
```

## Common Tasks

### Clear All Data

```bash
# Clear Redis queue
docker exec -it $(docker ps -q -f name=redis) redis-cli FLUSHALL

# Delete OpenSearch indices
curl -X DELETE "http://localhost:9200/search-metrics-*"
```

### View OpenSearch Dashboards

1. Open http://localhost:5601
2. Go to "Dev Tools" → "Console"
3. Run queries:

```json
GET /search-metrics-*/_search
{
  "size": 10,
  "sort": [
    {
      "timestamp": "desc"
    }
  ]
}
```

### Generate Test Data

Create `scripts/generate-test-data.js`:

```javascript
const { Queue } = require('bullmq');

const queries = [
  'kubernetes tutorial',
  'docker compose',
  'nestjs microservices',
  'redis caching',
  'opensearch aggregations',
];

async function generateTestData(count = 100) {
  const queue = new Queue('search-metrics', {
    connection: { host: 'localhost', port: 6379 },
  });

  for (let i = 0; i < count; i++) {
    const query = queries[Math.floor(Math.random() * queries.length)];
    const event = {
      requestId: `test-${Date.now()}-${i}`,
      query,
      offset: 0,
      executionTimeMs: Math.floor(Math.random() * 100) + 10,
      totalResults: Math.floor(Math.random() * 10000),
      hitsCount: 10,
      hits: [],
      timestamp: new Date().toISOString(),
    };

    await queue.add('search-metric', event);
    console.log(`Published ${i + 1}/${count}`);
    
    // Small delay to avoid overwhelming the queue
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  await queue.close();
  console.log(`Generated ${count} test events`);
}

generateTestData(100).catch(console.error);
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3001
lsof -i :3001

# Kill it
kill -9 <PID>

# Or use different port
PORT=3002 npm run start:dev
```

### OpenSearch Connection Refused

```bash
# Check if OpenSearch is running
docker ps | grep opensearch

# View OpenSearch logs
docker logs $(docker ps -q -f name=opensearch)

# Restart OpenSearch
docker-compose restart opensearch
```

### Redis Connection Errors

```bash
# Check Redis status
docker ps | grep redis

# Test connection
docker exec -it $(docker ps -q -f name=redis) redis-cli ping

# Should return: PONG
```

### Build Errors

```bash
# Clean build artifacts
rm -rf dist/

# Clean node_modules and reinstall
rm -rf node_modules/
npm install

# Rebuild
npm run build
```

### TypeScript Errors

```bash
# Check TypeScript configuration
npx tsc --noEmit

# View detailed errors
npm run build -- --verbose
```

## Production Build

```bash
# Build for production
npm run build

# Run production build
npm run start:prod
```

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | HTTP server port |
| `REDIS_MODE` | `standalone` | Redis mode: `standalone` or `sentinel` |
| `REDIS_HOST` | `localhost` | Redis host (standalone mode) |
| `REDIS_PORT` | `6379` | Redis port (standalone mode) |
| `OPENSEARCH_HOST` | `http://localhost:9200` | OpenSearch endpoint |
| `OPENSEARCH_USERNAME` | - | OpenSearch username |
| `OPENSEARCH_PASSWORD` | - | OpenSearch password |
| `QUEUE_NAME` | `search-metrics` | BullMQ queue name |
| `METRICS_INDEX_PREFIX` | `search-metrics` | OpenSearch index prefix |
| `METRICS_RETENTION_DAYS` | `30` | Data retention period |
| `CORS_ALLOWED_ORIGIN` | `*` | CORS allowed origins |

## Next Steps

- Read [API Examples](./api-examples.md) for query examples
- Review [Architecture](./architecture.md) for system design
- Check [Future Improvements](./future-improvements.md) for roadmap
