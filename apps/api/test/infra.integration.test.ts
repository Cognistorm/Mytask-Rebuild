// Real PostgreSQL + Redis (docker compose locally, service containers in CI). Enabled by RUN_INTEGRATION=1.
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { ConfigModule } from '../src/platform/config/config.module';
import { DbModule } from '../src/platform/db/db.module';
import { PrismaService } from '../src/platform/db/prisma.service';
import { RedisModule, RedisService } from '../src/platform/redis/redis.module';

describe('infrastructure (integration)', () => {
  it('reaches PostgreSQL with the data-model extensions installed', async () => {
    const ref = await Test.createTestingModule({ imports: [ConfigModule, DbModule] }).compile();
    const prisma = ref.get(PrismaService);
    await prisma.ping();
    const rows = await prisma.$queryRaw<{ extname: string }[]>`
      SELECT extname FROM pg_extension WHERE extname IN ('pg_trgm','btree_gist','citext','vector')`;
    expect(rows.map((r) => r.extname).sort()).toEqual([
      'btree_gist',
      'citext',
      'pg_trgm',
      'vector',
    ]);
    await ref.close();
  });

  it('reaches Redis', async () => {
    const ref = await Test.createTestingModule({ imports: [ConfigModule, RedisModule] }).compile();
    expect(await ref.get(RedisService).ping()).toBe('PONG');
    await ref.close();
  });
});
