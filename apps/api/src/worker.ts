// Worker entry point: timers (ADR-008 sweepers), email/push, upload scanning, BOG reconciliation.
// Same codebase and modules as the API, no public HTTP (architecture §3).
import './platform/config/dotenv';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { ENV, type Env } from './platform/config/env';
import { PrismaService } from './platform/db/prisma.service';
import { startReadinessServer } from './platform/health/readiness';
import { RedisService } from './platform/redis/redis.module';
import { VirusScanner } from './platform/scanner/scanner';
import { WorkerModule } from './worker.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule, { bufferLogs: true });
  const logger = app.get(Logger);
  app.useLogger(logger);
  app.enableShutdownHooks();
  const env = app.get<Env>(ENV);

  const prisma = app.get(PrismaService);
  const redis = app.get(RedisService);
  const scanner = app.get(VirusScanner);
  const readiness = startReadinessServer(env.WORKER_READINESS_PORT, env.READINESS_HOST, [
    { name: 'database', run: () => prisma.ping() },
    { name: 'redis', run: () => redis.ping() },
    // Uploads stay `scanning` while clamd is down (ADR-009 §6); readiness makes that visible.
    ...(scanner.enabled ? [{ name: 'clamav', run: () => scanner.ping() }] : []),
  ]);
  process.once('SIGTERM', () => readiness.close());
  process.once('SIGINT', () => readiness.close());

  logger.log('worker started (outbox, files-scan)');
}

void bootstrap();
