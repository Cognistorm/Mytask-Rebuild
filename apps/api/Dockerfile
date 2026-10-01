# syntax=docker/dockerfile:1
# API + worker image (same image, different command). Build context: repository root.
#   docker build -f apps/api/Dockerfile -t mytask-api .
# Targets: `runtime` (default; `node dist/main.js` or `node dist/worker.js`), `migrate` (prisma migrate deploy).

FROM node:24-alpine AS base
RUN npm install -g pnpm@12.8.1
WORKDIR /repo

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile --filter "@mytask/api..."
RUN pnpm --filter @mytask/api build \
 && pnpm --filter @mytask/api deploy --prod /out

# Database migrations run as a deploy step, never from a URL (ADR-013 §4).
FROM build AS migrate
WORKDIR /repo/apps/api
USER node
CMD ["./node_modules/.bin/prisma", "migrate", "deploy"]

FROM node:24-alpine AS runtime
ENV NODE_ENV=production \
    OPENAPI_SPEC_PATH=/app/openapi.yaml
WORKDIR /app
COPY --from=build --chown=node:node /out/package.json ./package.json
COPY --from=build --chown=node:node /out/node_modules ./node_modules
COPY --from=build --chown=node:node /out/dist ./dist
COPY --from=build --chown=node:node /repo/docs/04-api/openapi.yaml ./openapi.yaml
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s \
  CMD wget -qO- http://127.0.0.1:3000/api/v1/health || exit 1
CMD ["node", "dist/main.js"]
