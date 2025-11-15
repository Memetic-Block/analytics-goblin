import { Controller, Get } from '@nestjs/common'
import { HealthService } from './health.service'

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async check() {
    return this.healthService.checkHealth()
  }

  @Get('redis')
  async checkRedis() {
    return this.healthService.checkRedis()
  }

  @Get('opensearch')
  async checkOpenSearch() {
    return this.healthService.checkOpenSearch()
  }
}
