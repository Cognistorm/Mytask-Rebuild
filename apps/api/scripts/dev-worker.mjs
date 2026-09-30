// `pnpm dev` helper: waits for a FRESH watch build of the API (nest deletes dist/ when it starts), then
// runs the worker with node --watch (restarts when the compiled files change).
import { spawn } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';

const entry = 'dist/worker.js';
const startedAt = Date.now();
const fresh = () => existsSync(entry) && statSync(entry).mtimeMs > startedAt;
while (!fresh()) await new Promise((r) => setTimeout(r, 500));
await new Promise((r) => setTimeout(r, 2000)); // let the first compile finish writing every file
const child = spawn(process.execPath, ['--enable-source-maps', '--watch', entry], {
  stdio: 'inherit',
});
child.on('exit', (code) => process.exit(code ?? 0));
