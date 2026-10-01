// Copies the shared web assets into a Next.js app's public/ folder (git-ignored there):
//   fonts/woff2/*  -> <public>/fonts/   (served at /fonts/, as packages/tokens/dist/fonts.css expects)
//   logo/*.png     -> <public>/brand/
// Usage (from an app folder): node ../../packages/assets/copy-web-assets.mjs public
import { cpSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const assets = dirname(fileURLToPath(import.meta.url));
const target = resolve(process.cwd(), process.argv[2] ?? 'public');

for (const [from, to] of [
  ['fonts/woff2', 'fonts'],
  ['logo', 'brand'],
]) {
  mkdirSync(join(target, to), { recursive: true });
  cpSync(join(assets, from), join(target, to), { recursive: true });
}
console.log(`assets copied to ${target}/{fonts,brand}`);
