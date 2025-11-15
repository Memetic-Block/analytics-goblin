const { Queue } = require('bullmq');

const SAMPLE_QUERIES = [
  'kubernetes tutorial',
  'docker compose',
  'nestjs microservices',
  'redis caching',
  'opensearch aggregations',
  'typescript generics',
  'react hooks',
  'nodejs streams',
  'graphql federation',
  'postgresql optimization',
];

const SAMPLE_HOSTS = [
  'docs.example.com',
  'blog.example.com',
  'guides.example.com',
  'tutorials.example.com',
];

function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateEvent(index) {
  const query = randomElement(SAMPLE_QUERIES);
  const totalResults = randomInt(0, 10000);
  const hitsCount = totalResults > 0 ? Math.min(10, totalResults) : 0;
  
  const hits = [];
  for (let i = 0; i < hitsCount; i++) {
    const urlHost = randomElement(SAMPLE_HOSTS);
    hits.push({
      documentId: `doc-${randomInt(1000, 9999)}`,
      urlHost,
      urlPath: `/docs/${query.toLowerCase().replace(/\s+/g, '-')}`,
      score: parseFloat((Math.random() * 10).toFixed(2)),
    });
  }

  return {
    requestId: `generated-${Date.now()}-${index}`,
    query,
    offset: 0,
    executionTimeMs: randomInt(10, 150),
    totalResults,
    hitsCount,
    hits,
    timestamp: new Date(Date.now() - randomInt(0, 7 * 24 * 60 * 60 * 1000)).toISOString(), // Last 7 days
    userAgent: 'Test Data Generator',
  };
}

async function generateTestData() {
  const count = parseInt(process.argv[2] || '100', 10);
  
  console.log(`Generating ${count} test events...`);
  
  const queue = new Queue('search-metrics', {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    },
  });

  let published = 0;
  const startTime = Date.now();

  try {
    for (let i = 0; i < count; i++) {
      const event = generateEvent(i);
      await queue.add('search-metric', event);
      published++;

      if ((i + 1) % 10 === 0) {
        process.stdout.write(`\rProgress: ${i + 1}/${count}`);
      }

      // Small delay to avoid overwhelming the queue
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    console.log(`\n✓ Successfully published ${published} events`);
    console.log(`  Time taken: ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
    console.log(`  Rate: ${(published / ((Date.now() - startTime) / 1000)).toFixed(2)} events/sec`);
  } catch (error) {
    console.error(`\n✗ Failed after ${published} events:`, error.message);
    process.exit(1);
  } finally {
    await queue.close();
  }
}

if (require.main === module) {
  generateTestData().catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}
