// Regression test for ROADMAP 4.2.0g: after a database error inside a Prisma transaction (an interactive
// `$transaction` or a nested create, which Prisma runs as one), the next query must get the right answer. Local tests
// and `pnpm local` run on PGlite behind `pglite-socket`, which once answered the next query wrongly ("No 'X' record
// was found for a nested create", `count` → null), and could interleave two connections' statements. Since 4.2.0g the
// local server is our own `scripts/pglite-wire-server.mjs`. CI runs the same test on real PostgreSQL.
import type { NestExpressApplication } from '@nestjs/platform-express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/platform/db/prisma.service';
import { createTestApp } from './app';

let app: NestExpressApplication;
let prisma: PrismaService;
const tag = Date.now().toString(36);
let seq = 0;
const slug = (s: string) => `tx-${s}-${tag}-${(seq += 1)}`;

const category = (s: string, nested = true) =>
  prisma.gigCategory.create({
    data: {
      depth: 1,
      slug: s,
      ...(nested && { translations: { create: [{ locale: 'ka' as const, name: 'ტრანზაქცია' }] } }),
    },
  });

beforeAll(async () => {
  app = await createTestApp();
  prisma = app.get(PrismaService);
});
afterAll(async () => {
  await app?.close();
});

describe('queries after an error inside a transaction (ROADMAP 4.2.0g)', () => {
  it('interactive $transaction: the next count is right', async () => {
    const s = slug('interactive');
    await category(s);
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.gigCategory.count();
        await tx.gigCategory.create({ data: { depth: 1, slug: s } });
      }),
    ).rejects.toThrow();
    for (let i = 0; i < 3; i += 1) {
      expect(await prisma.gigCategory.count({ where: { slug: s } })).toBe(1);
    }
  });

  it('nested create: the next nested create and count are right', async () => {
    const s = slug('nested');
    await category(s);
    await expect(category(s)).rejects.toThrow();
    const ok = await category(slug('nested-ok'));
    expect(ok.slug).toMatch(/^tx-nested-ok-/);
    expect(await prisma.gigCategoryTranslation.count({ where: { categoryId: ok.id } })).toBe(1);
  });

  it('several failures in a row, then parallel queries on other connections', async () => {
    const s = slug('repeat');
    await category(s);
    for (let i = 0; i < 3; i += 1) {
      await expect(category(s)).rejects.toThrow();
      await expect(
        prisma.$transaction(async (tx) => tx.gigCategory.create({ data: { depth: 1, slug: s } })),
      ).rejects.toThrow();
    }
    const [failed, counts] = await Promise.all([
      category(s).then(
        () => 'created',
        () => 'refused',
      ),
      Promise.all(
        Array.from({ length: 8 }, () => prisma.gigCategory.count({ where: { slug: s } })),
      ),
    ]);
    expect(failed).toBe('refused');
    expect(counts).toEqual(Array(8).fill(1));
    const made = await Promise.all([1, 2, 3].map(() => category(slug('parallel'))));
    expect(made.every((c) => c.depth === 1)).toBe(true);
  });

  it('parallel parameterised queries on many connections each get their own answer', async () => {
    const values = Array.from({ length: 40 }, (_, i) => i);
    const rows = await Promise.all(
      values.map((v) => prisma.$queryRaw<{ v: number }[]>`SELECT ${v}::int AS "v"`),
    );
    expect(rows.map((r) => r[0]?.v)).toEqual(values);
  });
});
