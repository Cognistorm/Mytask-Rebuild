// Downloads the free DB-IP "IP to City Lite" database (CC BY 4.0, no key; ADR-012 §2) into
// `<repo>/.local/geoip/dbip-city-lite.mmdb` (git-ignored) for local country/city lookups of gig visits.
// Usage: `pnpm --filter @mytask/api geoip:download`, then set GEOIP_CITY_DB_PATH in `.env` to the printed path.
// The download contains no visitor data; visitor IPs are only ever looked up in this local file.
// The weekly update on servers is a Phase 6 job (devops).
import { createWriteStream } from 'node:fs';
import { mkdir, rename } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { createGunzip } from 'node:zlib';

const target = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../.local/geoip/dbip-city-lite.mmdb',
);

/** This month's file, or last month's while the new one is not published yet. */
function months(now = new Date()) {
  const ym = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  const previous = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return [ym(now), ym(previous)];
}

await mkdir(dirname(target), { recursive: true });
let done = false;
for (const month of months()) {
  const url = `https://download.db-ip.com/free/dbip-city-lite-${month}.mmdb.gz`;
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    console.log(`${url}: HTTP ${res.status}, trying the month before`);
    continue;
  }
  const partial = `${target}.part`;
  await pipeline(Readable.fromWeb(res.body), createGunzip(), createWriteStream(partial));
  await rename(partial, target);
  console.log(`Saved DB-IP City Lite ${month} to ${target}`);
  done = true;
  break;
}
if (!done) {
  console.error('No DB-IP City Lite file could be downloaded.');
  process.exit(1);
}
console.log(`\nAdd to .env:\nGEOIP_CITY_DB_PATH=${target.replace(/\\/g, '/')}`);
console.log(
  'Credit required on the analytics screens (CC BY 4.0): "IP Geolocation by DB-IP" → https://db-ip.com',
);
