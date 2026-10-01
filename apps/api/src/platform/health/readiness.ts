// Internal readiness endpoint (architecture §7.11, ADR-015 §6): a separate plain HTTP server on
// READINESS_PORT, not part of the contract and never routed by Caddy. Answers 200 when every check
// passes, 503 otherwise, with the names of the failing checks only (no connection strings).
import { createServer, type Server } from 'node:http';

export type ReadinessCheck = { name: string; run: () => Promise<unknown> };

export async function runChecks(checks: ReadinessCheck[], timeoutMs = 2000) {
  const results = await Promise.all(
    checks.map(async (c) => {
      try {
        await Promise.race([
          c.run(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
        ]);
        return [c.name, 'ok'] as const;
      } catch {
        return [c.name, 'fail'] as const;
      }
    }),
  );
  const checksOut = Object.fromEntries(results);
  return { ready: results.every(([, r]) => r === 'ok'), checks: checksOut };
}

export function startReadinessServer(port: number, host: string, checks: ReadinessCheck[]): Server {
  const server = createServer((req, res) => {
    if (req.method !== 'GET' || req.url !== '/ready') {
      res.writeHead(404).end();
      return;
    }
    void runChecks(checks).then(({ ready, checks: out }) => {
      res.writeHead(ready ? 200 : 503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: ready ? 'ready' : 'not_ready', checks: out }));
    });
  });
  server.listen(port, host);
  return server;
}
