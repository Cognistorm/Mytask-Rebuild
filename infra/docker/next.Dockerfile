# syntax=docker/dockerfile:1
# Next.js apps (web, admin) as standalone servers (ADR-001, ADR-013 §2). Build context: repository root.
#   docker build -f infra/docker/next.Dockerfile --build-arg APP=web --build-arg PORT=3100 -t mytask-web .
#   docker build -f infra/docker/next.Dockerfile --build-arg APP=admin --build-arg PORT=3200 -t mytask-admin .
ARG APP=web

FROM node:24-alpine AS base
RUN npm install -g pnpm@12.8.1
WORKDIR /repo

FROM base AS build
ARG APP
COPY . .
RUN pnpm install --frozen-lockfile --filter "@mytask/${APP}..."
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter "@mytask/${APP}" build

FROM node:24-alpine AS runtime
ARG APP
ARG PORT=3100
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=${PORT} \
    APP=${APP}
WORKDIR /app
# Only build output + public/ are served (ADR-013 §2); no source, no .env.
COPY --from=build --chown=node:node /repo/apps/${APP}/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/${APP}/.next/static ./apps/${APP}/.next/static
COPY --from=build --chown=node:node /repo/apps/${APP}/public ./apps/${APP}/public
USER node
EXPOSE ${PORT}
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s \
  CMD wget -qO- "http://127.0.0.1:${PORT}/" >/dev/null || exit 1
CMD ["sh", "-c", "exec node apps/${APP}/server.js"]
