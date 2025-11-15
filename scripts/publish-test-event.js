const { Queue } = require('bullmq');

async function publishTestEvent() {
  const queue = new Queue('search-metrics', {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
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
  console.log('✓ Test event published successfully');
  console.log('  Request ID:', event.requestId);
  console.log('  Query:', event.query);

  await queue.close();
}

publishTestEvent().catch((error) => {
  console.error('✗ Failed to publish test event:', error.message);
  process.exit(1);
});
