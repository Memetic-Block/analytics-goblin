import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name)
  private client: Redis

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const mode = this.configService.get('redis.mode', 'standalone')

    try {
      if (mode === 'sentinel') {
        const sentinels = this.configService.get('redis.sentinels', [])
        const masterName = this.configService.get(
          'redis.masterName',
          'mymaster'
        )

        this.client = new Redis({
          sentinels,
          name: masterName,
          retryStrategy: (times) => {
            // Stop retrying during initialization
            if (times > 3) {
              this.logger.error('Redis connection failed after 3 attempts')
              return null
            }
            const delay = Math.min(times * 50, 2000)
            return delay
          },
          maxRetriesPerRequest: 1,
          enableReadyCheck: true,
          lazyConnect: false
        })

        this.logger.log(`Connecting to Redis Sentinel: ${masterName}`)
      } else {
        const host = this.configService.get('redis.host', 'localhost')
        const port = this.configService.get('redis.port', 6379)

        this.client = new Redis({
          host,
          port,
          retryStrategy: (times) => {
            // Stop retrying during initialization
            if (times > 3) {
              this.logger.error('Redis connection failed after 3 attempts')
              return null
            }
            const delay = Math.min(times * 50, 2000)
            return delay
          },
          maxRetriesPerRequest: 1,
          enableReadyCheck: true,
          lazyConnect: false
        })

        this.logger.log(`Connecting to Redis: ${host}:${port}`)
      }

      this.client.on('error', (err) => {
        this.logger.error('Redis error:', err)
      })

      // Verify Redis is responsive before continuing startup
      const pingResult = await this.client.ping()
      if (pingResult !== 'PONG') {
        throw new Error('Redis ping failed')
      }
      this.logger.log('Redis health check passed')
    } catch (error) {
      this.logger.error('Failed to connect to Redis:', error)
      // Disconnect client to stop retry attempts
      if (this.client) {
        this.client.disconnect()
      }
      throw new Error(`Redis initialization failed: ${error.message}`)
    }
  }

  async onModuleDestroy() {
    await this.client.quit()
    this.logger.log('Redis connection closed')
  }

  getClient(): Redis {
    return this.client
  }

  /**
   * Check if Redis is healthy and responsive
   */
  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.client.ping()
      return result === 'PONG'
    } catch (error) {
      this.logger.error('Redis health check failed:', error)
      return false
    }
  }

  /**
   * Store session ID with TTL (default 24 hours)
   */
  async storeSession(
    sessionId: string,
    ttlSeconds: number = 86400
  ): Promise<void> {
    this.logger.debug(
      `Storing session: ${sessionId} with TTL ${ttlSeconds}s`
    )
    await this.client.setex(`session:${sessionId}`, ttlSeconds, '1')
    this.logger.debug(`Session stored successfully: ${sessionId}`)
  }

  /**
   * Check if session ID is valid
   */
  async isValidSession(sessionId: string): Promise<boolean> {
    this.logger.debug(`Checking if session exists: ${sessionId}`)
    const exists = await this.client.exists(`session:${sessionId}`)
    const isValid = exists === 1
    this.logger.debug(
      `Session ${sessionId} validation result: ${isValid ? 'VALID' : 'INVALID'} (exists=${exists})`
    )
    return isValid
  }

  /**
   * Extend session TTL (refresh on activity)
   */
  async refreshSession(
    sessionId: string,
    ttlSeconds: number = 86400
  ): Promise<void> {
    this.logger.debug(
      `Refreshing session: ${sessionId} with TTL ${ttlSeconds}s`
    )
    const result = await this.client.expire(`session:${sessionId}`, ttlSeconds)
    this.logger.debug(
      `Session refresh result for ${sessionId}: ${result === 1 ? 'SUCCESS' : 'FAILED (key not found)'}`
    )
  }

  /**
   * Invalidate/delete session
   */
  async deleteSession(sessionId: string): Promise<void> {
    this.logger.debug(`Deleting session: ${sessionId}`)
    const result = await this.client.del(`session:${sessionId}`)
    this.logger.debug(
      `Session deletion result for ${sessionId}: ${result === 1 ? 'DELETED' : 'NOT FOUND'}`
    )
  }

  /**
   * Store wallet address associated with session (optional)
   */
  async storeWalletForSession(
    sessionId: string,
    walletAddress: string,
    ttlSeconds: number = 86400
  ): Promise<void> {
    this.logger.debug(
      `Storing wallet for session: ${sessionId}, wallet: ${walletAddress}, TTL: ${ttlSeconds}s`
    )
    await this.client.setex(
      `session:wallet:${sessionId}`,
      ttlSeconds,
      walletAddress
    )
    this.logger.debug(`Wallet stored successfully for session: ${sessionId}`)
  }

  /**
   * Get wallet address for session (returns null if not set)
   */
  async getWalletForSession(sessionId: string): Promise<string | null> {
    this.logger.debug(`Getting wallet for session: ${sessionId}`)
    const wallet = await this.client.get(`session:wallet:${sessionId}`)
    this.logger.debug(
      `Wallet lookup result for session ${sessionId}: ${wallet ? wallet : 'NOT FOUND'}`
    )
    return wallet
  }

  /**
   * Delete wallet association for session
   */
  async deleteWalletForSession(sessionId: string): Promise<void> {
    this.logger.debug(`Deleting wallet association for session: ${sessionId}`)
    const result = await this.client.del(`session:wallet:${sessionId}`)
    this.logger.debug(
      `Wallet deletion result for session ${sessionId}: ${result === 1 ? 'DELETED' : 'NOT FOUND'}`
    )
  }
}
