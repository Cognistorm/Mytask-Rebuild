// `pnpm db:seed` — local/dev bootstrap (ADR-015 §1). Idempotent: safe to run again.
//  1. Permission catalogue mirror (ADR-010) and the system role Super-admin (every permission, spec 16).
//  2. The first Super-admin staff account, only when no staff exists yet. Its password is generated and
//     printed ONCE in this console (never stored in a file). Email: SEED_ADMIN_EMAIL or the first S-100 address.
//  3. The catalogue (ROADMAP 4.2.2b), only while it is empty: the live site's public gig category tree and
//     project categories (seed-catalog.ts / seed-catalog.json). Staff edits are kept.
// Never run against production data (CLAUDE.md rule 7).
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { hash, Algorithm } from '@node-rs/argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { DEFAULT_ROLES, PERMISSIONS, SUPER_ADMIN_ROLE } from '../src/modules/staff/permissions';
import { seedCatalog } from './seed-catalog';

if (!process.env.DATABASE_URL && existsSync('../../.env')) process.loadEnvFile('../../.env');
if (process.env.NODE_ENV === 'production') {
  console.error('db:seed refuses to run with NODE_ENV=production');
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main(): Promise<void> {
  for (const code of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code },
      create: { code, area: code.split('.')[0]! },
      update: {},
    });
  }
  const role = await prisma.role.upsert({
    where: { code: SUPER_ADMIN_ROLE },
    create: { code: SUPER_ADMIN_ROLE, name: 'Super-admin', isSystem: true },
    update: { isSystem: true },
  });
  for (const code of PERMISSIONS) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionCode: { roleId: role.id, permissionCode: code } },
      create: { roleId: role.id, permissionCode: code },
      update: {},
    });
  }

  // Default roles (spec 16 AC-11, P-114): created once, never overwritten (roles are editable data).
  for (const r of DEFAULT_ROLES) {
    if (await prisma.role.findUnique({ where: { code: r.code } })) continue;
    await prisma.role.create({
      data: {
        code: r.code,
        name: r.name,
        permissions: { create: r.permissions.map((permissionCode) => ({ permissionCode })) },
      },
    });
  }

  const categories = await seedCatalog(prisma);
  console.log(
    categories === null
      ? 'db:seed — catalogue already present (not changed).'
      : `db:seed — catalogue: ${categories} gig categories and the project categories loaded.`,
  );

  if ((await prisma.staff.count()) > 0) {
    console.log(
      'db:seed — permissions and Super-admin role in place; staff already exist (no new account).',
    );
    return;
  }
  const email = process.env.SEED_ADMIN_EMAIL ?? 'ir.gvazava@gmail.com';
  const password = `Mt-${randomBytes(9).toString('base64url')}9A`;
  const staff = await prisma.staff.create({
    data: {
      username: 'owner',
      fullName: 'Owner',
      email,
      passwordHash: await hash(password, { algorithm: Algorithm.Argon2id }),
      passwordAlgo: 'argon2id',
      roles: { create: { roleId: role.id } },
    },
  });
  console.log('\n================ FIRST SUPER-ADMIN (shown once) ================');
  console.log(`  login:    ${staff.username}   (or ${email})`);
  console.log(`  password: ${password}`);
  console.log('  Change it after the first login. It is not stored anywhere else.');
  console.log('=================================================================\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
