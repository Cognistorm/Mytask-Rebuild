# Local-only fake BOG (docker compose service `bog-mock`). Build context: repository root.
FROM node:24-alpine
WORKDIR /app
COPY tools/bog-mock/src ./src
USER node
EXPOSE 4100
HEALTHCHECK --interval=10s --timeout=3s CMD wget -qO- http://127.0.0.1:4100/health || exit 1
CMD ["node", "src/server.ts"]
