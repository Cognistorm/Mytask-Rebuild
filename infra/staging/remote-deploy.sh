#!/bin/bash
# Runs ON the staging server as root, started by scripts/deploy-staging.sh (infra/staging/README.md):
# /opt/mytask-staging/release.tgz -> install + build -> migrate + seed -> swap folders -> restart -> health check.
# The droplet (2 GB, 1 vCPU) cannot comfortably hold the running apps and the Next.js builds at once, so staging is
# down during the build (about 6-10 minutes). A failed build or migration restarts the previous release.
set -euo pipefail
B=/opt/mytask-staging
A=$B/app
N=$B/app.new
COMMIT=${1:-unknown}
BRANCH=${2:-unknown}
as_mytask() { sudo -u mytask bash -c "set -a; . $B/.env; set +a; export HOME=$B; $1"; }

echo "deploy: $BRANCH @ $COMMIT"
rm -rf "$N"
mkdir -p "$N"
tar xzf $B/release.tgz -C "$N"
echo "$COMMIT ($BRANCH, $(date -u +%FT%TZ))" > "$N/DEPLOYED_COMMIT"
ln -sf $B/.env "$N/.env"
chown -R mytask:mytask "$N"
swapon /swapfile-build 2>/dev/null || true

SERVICES='mytask-api mytask-worker mytask-web mytask-admin'
systemctl stop $SERVICES
restore() {
  echo "deploy: FAILED - restarting the previous release ($(cat $A/DEPLOYED_COMMIT 2>/dev/null))"
  systemctl start $SERVICES
  exit 1
}
trap restore ERR

systemctl reset-failed mytask-build 2>/dev/null || true
# Memory cap: the build swaps instead of pushing the other apps on this droplet out of RAM.
# ADMIN_BASE_PATH: the staff panel is served under /admin on this host (apps/admin/next.config.ts).
systemd-run --wait --pipe --quiet --unit=mytask-build --nice=10 \
  -p User=mytask -p MemoryMax=1200M -p MemoryHigh=1000M -p WorkingDirectory="$N" \
  -E HOME=$B -E NODE_OPTIONS=--max-old-space-size=1536 -E NEXT_TELEMETRY_DISABLED=1 -E CI=1 \
  -E ADMIN_BASE_PATH=/admin \
  bash -c 'set -eo pipefail
    pnpm install --frozen-lockfile --filter @mytask/api... --filter @mytask/web... --filter @mytask/admin... 2>&1 | tail -3
    pnpm exec turbo run build --filter=@mytask/api --filter=@mytask/web --filter=@mytask/admin --concurrency=1 --output-logs=errors-only'

for app in web admin; do
  W=$N/apps/$app
  cp -r $W/.next/static $W/.next/standalone/apps/$app/.next/static
  cp -r $W/public $W/.next/standalone/apps/$app/public
  chown -R mytask:mytask $W/.next/standalone
done

cd "$N/apps/api"
as_mytask "pnpm exec prisma migrate deploy 2>&1 | tail -2"
# db:seed refuses NODE_ENV=production (guard for real data). This staging DB only ever holds test data; the seed is
# idempotent (permission catalogue, roles, catalogue only while empty; the Super-admin exists already).
as_mytask "NODE_ENV=development pnpm db:seed 2>&1 | tail -3"
as_mytask "node ../../infra/staging/create-buckets.cjs"

rm -rf $B/app.prev
[ -d "$A" ] && mv "$A" $B/app.prev
mv "$N" "$A"
trap - ERR

systemctl start $SERVICES
for i in $(seq 1 30); do
  api=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3300/api/v1/health || true)
  web=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3310/ || true)
  admin=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3320/admin/login || true)
  [ "$api" = 200 ] && [ "$web" = 200 ] && [ "$admin" = 200 ] && break
  sleep 2
done
echo "deploy: api $api, web $web, admin $admin - $(cat $A/DEPLOYED_COMMIT)"
free -h | sed -n 2p
[ "$api" = 200 ] && [ "$web" = 200 ] && [ "$admin" = 200 ]
