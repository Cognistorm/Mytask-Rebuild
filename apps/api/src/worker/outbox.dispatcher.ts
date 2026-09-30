// Worker: delivers outbox events (data-model §3.O). Picks rows with FOR UPDATE SKIP LOCKED so several
// workers never send the same email twice; retries failures up to MAX_ATTEMPTS. After a successful send the
// one-time secrets in the payload (2FA codes, link tokens) are scrubbed from the database row.
import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { ENV, type Env } from '../platform/config/env';
import { PrismaService } from '../platform/db/prisma.service';
import type { EmailPayload } from '../platform/outbox/outbox.service';
import { renderEmail } from '../platform/mail/templates';

const POLL_MS = 2_000;
const BATCH = 20;
const MAX_ATTEMPTS = 10;
const SECRET_PARAMS = ['code', 'token'];

@Injectable()
export class OutboxDispatcher implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger('OutboxDispatcher');
  private timer: NodeJS.Timeout | undefined;
  private running = false;
  private transport: Transporter | undefined;
  lastRunAt: Date | undefined;

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
  ) {}

  onApplicationBootstrap(): void {
    if (this.env.MAIL_TRANSPORT === 'smtp' && this.env.SMTP_URL) {
      this.transport = nodemailer.createTransport(this.env.SMTP_URL);
    }
    this.timer = setInterval(() => void this.tick(), POLL_MS);
  }

  onApplicationShutdown(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** One pass; public for tests. Returns the number of events delivered. */
  async tick(): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    try {
      return await this.prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<
          { id: bigint; event_type: string; payload: EmailPayload }[]
        >`
          SELECT id, event_type, payload FROM outbox_events
          WHERE dispatched_at IS NULL AND attempts < ${MAX_ATTEMPTS}
          ORDER BY id LIMIT ${BATCH} FOR UPDATE SKIP LOCKED`;
        let sent = 0;
        for (const row of rows) {
          try {
            await this.deliver(row.event_type, row.payload);
            const scrubbed = { ...row.payload, params: this.scrub(row.payload.params) };
            await tx.outboxEvent.update({
              where: { id: row.id },
              data: { dispatchedAt: new Date(), payload: scrubbed as never },
            });
            sent++;
          } catch (err) {
            this.logger.warn({ err, event: row.event_type, id: String(row.id) }, 'delivery failed');
            await tx.outboxEvent.update({
              where: { id: row.id },
              data: { attempts: { increment: 1 } },
            });
          }
        }
        this.lastRunAt = new Date();
        return sent;
      });
    } finally {
      this.running = false;
    }
  }

  private scrub(params: Record<string, string | number> = {}) {
    return Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, SECRET_PARAMS.includes(k) ? '[sent]' : v]),
    );
  }

  private async deliver(event: string, payload: EmailPayload): Promise<void> {
    const recipients: { email: string; username: string; locale: 'ka' | 'en' }[] = [];
    if (payload.userId) {
      const user = await this.prisma.user.findUnique({ where: { id: payload.userId } });
      if (!user || user.deletedAt) return; // nothing to send to
      recipients.push({ email: user.email, username: user.username, locale: user.locale });
    }
    for (const email of payload.to ?? []) {
      recipients.push({ email, username: '', locale: payload.locale ?? 'ka' });
    }
    for (const r of recipients) {
      const mail = renderEmail({
        event,
        locale: r.locale,
        username: r.username,
        email: r.email,
        appUrl: this.env.APP_URL,
        adminUrl: this.env.ADMIN_URL,
        params: payload.params ?? {},
      });
      if (this.env.MAIL_TRANSPORT === 'log' || !this.transport) {
        // Local preview without Mailpit: print the email (env.ts refuses `log` in production).
        this.logger.log(`[email ${event}] to=${r.email} subject="${mail.subject}"\n${mail.text}`);
        continue;
      }
      await this.transport.sendMail({
        from: { name: this.env.MAIL_FROM_NAME, address: this.env.MAIL_FROM_ADDRESS },
        to: r.email,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      });
    }
  }
}
