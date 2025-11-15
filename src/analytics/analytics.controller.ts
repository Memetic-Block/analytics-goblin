import { Controller, Get, Query } from '@nestjs/common'
import { AnalyticsService } from './analytics.service'

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('top-searches')
  async getTopSearches(
    @Query('start') startDate: string,
    @Query('end') endDate: string,
    @Query('limit') limit?: string
  ) {
    return this.analyticsService.getTopSearches(
      startDate,
      endDate,
      limit ? parseInt(limit, 10) : 10
    )
  }

  @Get('zero-results')
  async getZeroResultQueries(
    @Query('start') startDate: string,
    @Query('end') endDate: string,
    @Query('limit') limit?: string
  ) {
    return this.analyticsService.getZeroResultQueries(
      startDate,
      endDate,
      limit ? parseInt(limit, 10) : 10
    )
  }

  @Get('popular-documents')
  async getPopularDocuments(
    @Query('start') startDate: string,
    @Query('end') endDate: string,
    @Query('limit') limit?: string
  ) {
    return this.analyticsService.getPopularDocuments(
      startDate,
      endDate,
      limit ? parseInt(limit, 10) : 10
    )
  }

  @Get('performance-trends')
  async getPerformanceTrends(
    @Query('start') startDate: string,
    @Query('end') endDate: string,
    @Query('interval') interval?: string
  ) {
    return this.analyticsService.getPerformanceTrends(
      startDate,
      endDate,
      interval || '1h'
    )
  }

  @Get('stats')
  async getSearchStats(
    @Query('start') startDate: string,
    @Query('end') endDate: string
  ) {
    return this.analyticsService.getSearchStats(startDate, endDate)
  }
}
