// Native Windows builds of the local infrastructure (ADR-020: no Docker on the Owner's computer). Same
// versions as docker-compose.yml, downloaded once into .local/tools (git-ignored) and checked against a
// pinned SHA-256 before anything is unpacked. No installer, no admin rights, no Windows service.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const root = resolve(import.meta.dirname, '..', '..');
export const localDir = join(root, '.local');

const TOOLS = {
  redis: {
    version: '7.4.11',
    url: 'https://github.com/redis-windows/redis-windows/releases/download/7.4.11/Redis-7.4.11-Windows-x64-msys2.zip',
    sha256: 'ec629971d76756dd040204297f1a92f43848e7a5f4862d39426beeafcca2a2a9',
    exe: 'Redis-7.4.11-Windows-x64-msys2/redis-server.exe',
  },
  seaweedfs: {
    version: '4.48',
    url: 'https://github.com/seaweedfs/seaweedfs/releases/download/4.48/windows_amd64.zip',
    sha256: 'fe90c04c0620ad1a1c756f86cd5e1443773f56a446688077a4bb5ec04c3cc874',
    exe: 'weed.exe',
  },
  mailpit: {
    version: '1.31.3',
    url: 'https://github.com/axllent/mailpit/releases/download/v1.31.3/mailpit-windows-amd64.zip',
    sha256: '863e9502d4e0f14a78c0f91c5091797b1c7b7b7e3fc7e5eab62e5770ce44b76e',
    exe: 'mailpit.exe',
  },
};

/** Path of the tool's executable; downloads, verifies and unpacks it on first use. */
export async function ensureTool(name) {
  if (process.platform !== 'win32') {
    throw new Error(
      `pnpm local downloads Windows builds only. On macOS/Linux install ${name} with your package manager.`,
    );
  }
  const t = TOOLS[name];
  const dir = join(localDir, 'tools', `${name}-${t.version}`);
  const exe = join(dir, t.exe);
  if (existsSync(exe)) return exe;

  console.log(`local: downloading ${name} ${t.version} (once)…`);
  const res = await fetch(t.url);
  if (!res.ok) throw new Error(`${name}: download failed (${res.status} ${t.url})`);
  const zip = Buffer.from(await res.arrayBuffer());
  const sha = createHash('sha256').update(zip).digest('hex');
  if (sha !== t.sha256) throw new Error(`${name}: SHA-256 mismatch (got ${sha}); not unpacked`);

  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const zipPath = join(dir, 'download.zip');
  writeFileSync(zipPath, zip);
  // Windows 10+ ships bsdtar, which unpacks zip files.
  const tar = spawnSync(join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe'), [
    '-xf',
    zipPath,
    '-C',
    dir,
  ]);
  rmSync(zipPath);
  if (tar.status !== 0 || !existsSync(exe)) {
    rmSync(dir, { recursive: true, force: true });
    throw new Error(`${name}: could not unpack (${tar.stderr?.toString() ?? 'tar failed'})`);
  }
  return exe;
}
