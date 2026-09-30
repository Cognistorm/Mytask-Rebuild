// HTTP (+ realtime gateway, slice 08) entry point of the API (architecture §3).
import './platform/config/dotenv';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { ENV, type Env } from './platform/config/env';
import { PrismaService } from './platform/db/prisma.service';
import { startReadinessServer } from './platform/health/readiness';
import { RedisService } from './platform/redis/redis.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const env = app.get<Env>(ENV);
  configureApp(app, env);
  app.enableShutdownHooks();

  const prisma = app.get(PrismaService);
  const redis = app.get(RedisService);
  const readiness = startReadinessServer(env.READINESS_PORT, [
    { name: 'database', run: () => prisma.ping() },
    { name: 'redis', run: () => redis.ping() },
  ]);
  app.getHttpServer().on('close', () => readiness.close());

  await app.listen(env.PORT, '0.0.0.0');
}

void bootstrap();
