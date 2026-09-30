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
import { WorkerModule } from './worker.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule, { bufferLogs: true });
  const logger = app.get(Logger);
  app.useLogger(logger);
  app.enableShutdownHooks();
  const env = app.get<Env>(ENV);

  const prisma = app.get(PrismaService);
  const redis = app.get(RedisService);
  const readiness = startReadinessServer(env.WORKER_READINESS_PORT, [
    { name: 'database', run: () => prisma.ping() },
    { name: 'redis', run: () => redis.ping() },
  ]);
  process.once('SIGTERM', () => readiness.close());
  process.once('SIGINT', () => readiness.close());

  logger.log('worker started (no jobs registered yet — added per slice, ADR-008)');
}

void bootstrap();
