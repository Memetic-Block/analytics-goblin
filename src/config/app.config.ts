import { registerAs } from '@nestjs/config'

export interface AppConfig {
  port: number
  corsAllowedOrigin: string
  queueName: string
}

export default registerAs(
  'app',
  (): AppConfig => ({
    port: parseInt(process.env.PORT || '3001', 10),
    corsAllowedOrigin: process.env.CORS_ALLOWED_ORIGIN || '*',
    queueName: process.env.QUEUE_NAME || 'search-metrics'
  })
)
