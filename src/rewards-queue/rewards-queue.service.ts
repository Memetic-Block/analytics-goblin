import { Injectable, Logger } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import { WalletValidator } from '../utils/wallet.validator'

export type RewardEventType = 'image-search' | 'audio-search' | 'video-search'

export interface RewardEventData {
  eventType: RewardEventType
  walletAddress: string
  metadata?: {
    timestamp?: string
  }
}

@Injectable()
export class RewardsQueueService {
  private readonly logger = new Logger(RewardsQueueService.name)

  // Mapping from UBI application field to BullMQ job name
  private readonly APPLICATION_TO_JOB_TYPE: Record<string, RewardEventType> = {
    'graphql-images': 'image-search',
    'graphql-video': 'video-search',
    'graphql-audio': 'audio-search'
  }

  constructor(
    @InjectQueue('rewards-events')
    private readonly rewardsQueue: Queue<RewardEventData>
  ) {}

  /**
   * Enqueues a reward event if the application is eligible and wallet is valid
   * @param walletAddress The wallet address from the analytics query
   * @param application The UBI application field value
   * @param timestamp The timestamp of the analytics event
   * @returns true if enqueued, false otherwise
   */
  async enqueueRewardEvent(
    walletAddress: string,
    application: string,
    timestamp: string
  ): Promise<boolean> {
    // Check if application maps to a reward event type
    const eventType = this.APPLICATION_TO_JOB_TYPE[application]
    if (!eventType) {
      // Not a search type we track for rewards
      return false
    }

    // Validate wallet address
    const validation = WalletValidator.validateAndNormalize(walletAddress)
    if (!validation.valid) {
      this.logger.debug(
        `Skipping reward event for invalid wallet: ${walletAddress} (${validation.error})`
      )
      return false
    }

    try {
      // Enqueue the job with the validated/normalized wallet address
      await this.rewardsQueue.add(
        eventType,
        {
          eventType,
          walletAddress: validation.normalized!,
          metadata: {
            timestamp
          }
        },
        {
          // Job-specific options can be added here if needed
          // These will override the default options from the module
        }
      )

      this.logger.debug(
        `Enqueued reward event: ${eventType} for wallet ${validation.type} (${validation.normalized})`
      )

      return true
    } catch (error) {
      const err = error as Error
      this.logger.error(
        `Failed to enqueue reward event: ${eventType} for wallet ${walletAddress}: ${err.message}`
      )
      return false
    }
  }

  /**
   * Check if an application is eligible for rewards
   */
  isEligibleApplication(application: string): boolean {
    return application in this.APPLICATION_TO_JOB_TYPE
  }
}
