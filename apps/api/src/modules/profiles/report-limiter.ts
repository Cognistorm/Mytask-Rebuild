// SEC-23 (CONVENTIONS §14): 10 reports per user and hour, shared by createUserReport, createGigReport,
// createProjectReport and createProposalReport. The later report operations use this same limiter.
import { Injectable } from '@nestjs/common';
import { RedisService } from '../../platform/redis/redis.module';
import { hitHourly } from './hourly-limit';

export const REPORTS_PER_HOUR = 10;

@Injectable()
export class ReportLimiter {
  constructor(private readonly redis: RedisService) {}

  /** Counts one report attempt; over the limit → 429 RATE_LIMITED with Retry-After. */
  hit(userId: string): Promise<void> {
    return hitHourly(this.redis, 'reports', userId, REPORTS_PER_HOUR);
  }
}
