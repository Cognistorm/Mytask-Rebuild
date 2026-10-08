// Worker: retries the file moves of staff gig removals and restores (ROADMAP 4.3.24, Q-185 (b), `gig-media.ts`).
// adminRemoveGig moves the files right after its commit; when that fails (storage down, worker restart) the
// files of the removed gig would stay public. This pass finds every gig whose ready files sit in the wrong bucket
// and moves them again under the gig row lock (SKIP LOCKED: a restore in progress is left for the next pass).
// Runs at worker start and then every 5 minutes; running twice is harmless.
import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { GigMedia } from '../modules/gigs/gig-media';

const EVERY_MS = 5 * 60 * 1000;
const BATCH = 50;

@Injectable()
export class GigMediaSweeper implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger('GigMediaSweeper');
  private timer: NodeJS.Timeout | undefined;
  private running = false;
  lastRunAt: Date | undefined;

  constructor(private readonly media: GigMedia) {}

  onApplicationBootstrap(): void {
    void this.tick();
    this.timer = setInterval(() => void this.tick(), EVERY_MS);
  }

  onApplicationShutdown(): void {
    clearInterval(this.timer);
  }

  /** One pass; public for tests. Returns the number of files moved. */
  async tick(): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    let moved = 0;
    try {
      for (const gigId of await this.media.misplaced(BATCH)) {
        try {
          moved += await this.media.sync(gigId, { skipLocked: true });
        } catch (err) {
          // One gig's storage error must not stop the others; the next pass retries it.
          this.logger.error({ err, gigId }, 'gig files not moved');
        }
      }
      this.lastRunAt = new Date();
      return moved;
    } catch (err) {
      this.logger.error({ err }, 'gig-media pass failed');
      return moved;
    } finally {
      this.running = false;
    }
  }
}
