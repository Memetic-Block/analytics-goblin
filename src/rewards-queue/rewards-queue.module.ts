import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { RewardsQueueService } from './rewards-queue.service'

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'rewards-events',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000 // Start with 2s, then 4s, then 8s
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 500 // Keep last 500 failed jobs for debugging
      }
    })
  ],
  providers: [RewardsQueueService],
  exports: [RewardsQueueService]
})
export class RewardsQueueModule {}
