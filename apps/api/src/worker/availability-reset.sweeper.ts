// Worker: the daily `availability-reset` job (spec 02 AC-23, BR-013, ADR-008 §5; legacy
// `Console/Commands/UnavailableSellers.php`, now for every user, Q-013). Clears "unavailable until" once the
// date is reached. Readers already treat a passed date as no notice, so the job only tidies the row; it runs
// at worker start and then every hour, so a worker that was down at midnight catches up within the hour.
// One UPDATE over the partial index `user_profiles_unavailable_until_ix`; running twice is harmless.
import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { PrismaService } from '../platform/db/prisma.service';

const EVERY_MS = 60 * 60 * 1000;

@Injectable()
export class AvailabilityResetSweeper implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger('AvailabilityResetSweeper');
  private timer: NodeJS.Timeout | undefined;
  lastRunAt: Date | undefined;

  constructor(private readonly prisma: PrismaService) {}

  onApplicationBootstrap(): void {
    void this.tick();
    this.timer = setInterval(() => void this.tick(), EVERY_MS);
  }

  onApplicationShutdown(): void {
    clearInterval(this.timer);
  }

  /** One pass; public for tests. Returns the number of notices removed. */
  async tick(now = new Date()): Promise<number> {
    try {
      const { count } = await this.prisma.userProfile.updateMany({
        where: { unavailableUntil: { lte: now } },
        data: { unavailableUntil: null, unavailableMessage: null },
      });
      this.lastRunAt = new Date();
      if (count) this.logger.log({ count }, 'availability notices ended');
      return count;
    } catch (err) {
      // Database hiccup: the next pass retries; the worker must not crash.
      this.logger.error({ err }, 'availability-reset pass failed');
      return 0;
    }
  }
}
