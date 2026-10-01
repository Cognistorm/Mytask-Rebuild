// Local stand-in for the BOG Payments API (ADR-004): never real money, never real credentials.
// Phase 3 skeleton: `GET /health`. Slice 05 (payments) adds the order, hosted-page and callback flows.
import { createServer } from 'node:http';

const port = Number(process.env.BOG_MOCK_PORT ?? 4100);

const server = createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'bog-mock' }));
    return;
  }
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not implemented in the Phase 3 bog-mock skeleton' }));
});

server.listen(port, () => console.log(`bog-mock listening on :${port}`));
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => server.close());
