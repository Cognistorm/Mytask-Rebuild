// `pnpm db:seed` — anonymized demo data for local development (ADR-015 §1). Never real user data.
// Phase 3 has no tables yet. Slice 01 adds: a Super-admin, test users (one with a legacy `$2y$` bcrypt
// hash to prove ADR-002), then later slices add categories and settings defaults.
async function main(): Promise<void> {
  console.log('db:seed — nothing to seed yet (tables arrive with slice 01).');
}

void main();
