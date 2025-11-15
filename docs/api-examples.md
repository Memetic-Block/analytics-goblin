# Stats Goblin - API Examples

Complete examples for interacting with the Stats Goblin analytics API.

## Base URL

```
http://localhost:3001
```

## Authentication

Currently no authentication required. See `docs/future-improvements.md` for planned security enhancements.

## Health Check Examples

### Overall System Health

```bash
curl http://localhost:3001/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-14T10:30:00.000Z",
  "services": {
    "redis": {
      "status": "up",
      "details": {
        "waiting": 0,
        "active": 2,
        "completed": 15234,
        "failed": 3
      }
    },
    "opensearch": {
      "status": "up",
      "details": {
        "clusterName": "docker-cluster",
        "clusterStatus": "green",
        "numberOfNodes": 1,
        "activeShards": 5
      }
    }
  }
}
```

### Check Individual Services

```bash
# Redis only
curl http://localhost:3001/health/redis

# OpenSearch only
curl http://localhost:3001/health/opensearch
```

## Analytics Examples

All analytics endpoints accept date ranges in ISO 8601 format.

### Example: Last 7 Days

```bash
START_DATE=$(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%SZ)
END_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Top searches from last 7 days
curl "http://localhost:3001/analytics/top-searches?start=${START_DATE}&end=${END_DATE}&limit=20"
```

### Top Searches

```bash
curl "http://localhost:3001/analytics/top-searches?start=2025-11-01T00:00:00Z&end=2025-11-14T23:59:59Z&limit=10"
```

Response:
```json
[
  {
    "query": "kubernetes deployment",
    "count": 1523,
    "avgExecutionTimeMs": 45,
    "avgTotalResults": 12340
  },
  {
    "query": "docker compose tutorial",
    "count": 987,
    "avgExecutionTimeMs": 38,
    "avgTotalResults": 8920
  }
]
```

### Zero Result Queries

Identify searches that returned no results (content gaps):

```bash
curl "http://localhost:3001/analytics/zero-results?start=2025-11-01T00:00:00Z&end=2025-11-14T23:59:59Z&limit=10"
```

Response:
```json
[
  {
    "query": "obscure framework v5",
    "count": 23,
    "lastOccurrence": "2025-11-14T08:15:32.000Z"
  },
  {
    "query": "legacy api documentation",
    "count": 18,
    "lastOccurrence": "2025-11-13T15:42:10.000Z"
  }
]
```

### Popular Documents

Find which documents appear most frequently in search results:

```bash
curl "http://localhost:3001/analytics/popular-documents?start=2025-11-01T00:00:00Z&end=2025-11-14T23:59:59Z&limit=10"
```

Response:
```json
[
  {
    "documentId": "doc-12345",
    "urlHost": "docs.example.com",
    "urlPath": "/getting-started/quickstart",
    "appearances": 4532,
    "avgScore": 9.2
  },
  {
    "documentId": "doc-67890",
    "urlHost": "docs.example.com",
    "urlPath": "/guides/deployment",
    "appearances": 3421,
    "avgScore": 8.7
  }
]
```

### Performance Trends

Analyze search performance over time with different intervals:

```bash
# Hourly trends
curl "http://localhost:3001/analytics/performance-trends?start=2025-11-14T00:00:00Z&end=2025-11-14T23:59:59Z&interval=1h"

# Daily trends
curl "http://localhost:3001/analytics/performance-trends?start=2025-11-01T00:00:00Z&end=2025-11-14T23:59:59Z&interval=1d"
```

Response (hourly):
```json
[
  {
    "interval": "2025-11-14T10:00:00.000Z",
    "avgExecutionTimeMs": 42,
    "totalSearches": 523,
    "p50ExecutionTimeMs": 35,
    "p95ExecutionTimeMs": 89,
    "p99ExecutionTimeMs": 152
  },
  {
    "interval": "2025-11-14T11:00:00.000Z",
    "avgExecutionTimeMs": 48,
    "totalSearches": 612,
    "p50ExecutionTimeMs": 38,
    "p95ExecutionTimeMs": 95,
    "p99ExecutionTimeMs": 178
  }
]
```

Valid intervals: `1m`, `5m`, `15m`, `30m`, `1h`, `6h`, `12h`, `1d`

### Search Statistics Summary

Get aggregated stats for a time period:

```bash
curl "http://localhost:3001/analytics/stats?start=2025-11-01T00:00:00Z&end=2025-11-14T23:59:59Z"
```

Response:
```json
{
  "totalSearches": 125340,
  "uniqueQueries": 8234,
  "avgExecutionTimeMs": 43,
  "zeroResultRate": 0.087
}
```

## Advanced Query Examples

### Last 24 Hours Performance

```bash
curl "http://localhost:3001/analytics/performance-trends?start=$(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%SZ)&end=$(date -u +%Y-%m-%dT%H:%M:%SZ)&interval=1h"
```

### This Month's Top Searches

```bash
MONTH_START="2025-11-01T00:00:00Z"
MONTH_END="2025-11-30T23:59:59Z"

curl "http://localhost:3001/analytics/top-searches?start=${MONTH_START}&end=${MONTH_END}&limit=50"
```

### Week-over-Week Comparison

```bash
# This week
THIS_WEEK_START=$(date -u -d 'last monday' +%Y-%m-%dT00:00:00Z)
THIS_WEEK_END=$(date -u +%Y-%m-%dT23:59:59Z)

curl "http://localhost:3001/analytics/stats?start=${THIS_WEEK_START}&end=${THIS_WEEK_END}"

# Last week
LAST_WEEK_START=$(date -u -d 'last monday - 7 days' +%Y-%m-%dT00:00:00Z)
LAST_WEEK_END=$(date -u -d 'last sunday' +%Y-%m-%dT23:59:59Z)

curl "http://localhost:3001/analytics/stats?start=${LAST_WEEK_START}&end=${LAST_WEEK_END}"
```

## Integration Examples

### Shell Script

```bash
#!/bin/bash

# Daily report script
YESTERDAY=$(date -u -d '1 day ago' +%Y-%m-%dT00:00:00Z)
TODAY=$(date -u +%Y-%m-%dT00:00:00Z)

echo "=== Daily Search Report ==="
echo ""
echo "Top 10 Searches:"
curl -s "http://localhost:3001/analytics/top-searches?start=${YESTERDAY}&end=${TODAY}&limit=10" | jq '.'

echo ""
echo "Zero Result Queries:"
curl -s "http://localhost:3001/analytics/zero-results?start=${YESTERDAY}&end=${TODAY}&limit=5" | jq '.'

echo ""
echo "Overall Stats:"
curl -s "http://localhost:3001/analytics/stats?start=${YESTERDAY}&end=${TODAY}" | jq '.'
```

### Python Client

```python
import requests
from datetime import datetime, timedelta

BASE_URL = "http://localhost:3001"

def get_top_searches(days=7, limit=10):
    end = datetime.utcnow()
    start = end - timedelta(days=days)
    
    params = {
        'start': start.isoformat() + 'Z',
        'end': end.isoformat() + 'Z',
        'limit': limit
    }
    
    response = requests.get(f"{BASE_URL}/analytics/top-searches", params=params)
    return response.json()

def check_health():
    response = requests.get(f"{BASE_URL}/health")
    health = response.json()
    return health['status'] == 'healthy'

# Usage
if check_health():
    top_searches = get_top_searches(days=7, limit=20)
    for search in top_searches:
        print(f"{search['query']}: {search['count']} searches")
```

### JavaScript/Node.js Client

```javascript
const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function getSearchStats(startDate, endDate) {
  const { data } = await axios.get(`${BASE_URL}/analytics/stats`, {
    params: {
      start: startDate.toISOString(),
      end: endDate.toISOString()
    }
  });
  return data;
}

async function getPerformanceTrends(hours = 24) {
  const end = new Date();
  const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
  
  const { data } = await axios.get(`${BASE_URL}/analytics/performance-trends`, {
    params: {
      start: start.toISOString(),
      end: end.toISOString(),
      interval: '1h'
    }
  });
  return data;
}

// Usage
(async () => {
  const stats = await getSearchStats(
    new Date('2025-11-01'),
    new Date('2025-11-14')
  );
  console.log('Search Stats:', stats);
  
  const trends = await getPerformanceTrends(24);
  console.log('24h Performance:', trends);
})();
```

## Error Handling

### Invalid Date Range

```bash
curl "http://localhost:3001/analytics/stats?start=invalid&end=also-invalid"
```

The API will return appropriate HTTP error codes:
- `400 Bad Request` - Invalid date format or missing required parameters
- `500 Internal Server Error` - OpenSearch or system errors

### Service Degradation

If OpenSearch is down, analytics endpoints will fail, but the health endpoint will still respond:

```json
{
  "status": "degraded",
  "timestamp": "2025-11-14T10:30:00.000Z",
  "services": {
    "redis": {
      "status": "up"
    },
    "opensearch": {
      "status": "down",
      "message": "Connection refused"
    }
  }
}
```

## Rate Limiting

Currently no rate limiting is implemented. See `docs/future-improvements.md` for planned API authentication and rate limiting features.

## CORS Configuration

CORS is configured via the `CORS_ALLOWED_ORIGIN` environment variable. By default, it allows all origins (`*`).

For production, set specific origins:

```bash
CORS_ALLOWED_ORIGIN=https://dashboard.example.com
```
