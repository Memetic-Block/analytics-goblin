import { registerAs } from '@nestjs/config'

export interface RedisConfig {
  mode: 'standalone' | 'sentinel'
  host?: string
  port?: number
  masterName?: string
  sentinels?: Array<{ host: string; port: number }>
}

export default registerAs('redis', (): RedisConfig => {
  const mode = process.env.REDIS_MODE || 'standalone'

  if (mode === 'sentinel') {
    const sentinels: Array<{ host: string; port: number }> = []

    // Support up to 3 sentinel nodes
    for (let i = 1; i <= 3; i++) {
      const host = process.env[`REDIS_SENTINEL_${i}_HOST`]
      const port = process.env[`REDIS_SENTINEL_${i}_PORT`]

      if (host && port) {
        sentinels.push({
          host,
          port: parseInt(port, 10)
        })
      }
    }

    if (sentinels.length === 0) {
      throw new Error('REDIS_MODE is sentinel but no sentinel hosts configured')
    }

    return {
      mode: 'sentinel',
      masterName: process.env.REDIS_MASTER_NAME || 'mymaster',
      sentinels
    }
  }

  // Standalone mode
  return {
    mode: 'standalone',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10)
  }
})
