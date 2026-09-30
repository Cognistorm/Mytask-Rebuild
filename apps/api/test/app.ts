import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { ENV, type Env } from '../src/platform/config/env';

/** Boots the real HTTP pipeline (same configureApp as main.ts) with response validation on. */
export async function createTestApp(): Promise<NestExpressApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ bufferLogs: true });
  configureApp(app, app.get<Env>(ENV));
  await app.init();
  return app;
}
