#!/bin/bash
# One-time setup of MyTask staging on the shared 1 GB droplet (infra/staging/README.md). Idempotent; run as root:
#   ssh mytask-staging 'bash -s' < infra/staging/server-setup.sh
# PostgreSQL 16 + pgvector, Redis, SeaweedFS (S3), Mailpit, the env file with fresh secrets and the infra units.
# Everything lives in /opt/mytask-staging, runs as user `mytask`, binds to loopback only.
set -euo pipefail
B=/opt/mytask-staging
cd /tmp

# --- packages, user, folders ---
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq postgresql postgresql-16-pgvector redis-server apache2-utils >/dev/null
command -v pnpm >/dev/null || npm install -g pnpm@12.8.1 --silent
id mytask >/dev/null 2>&1 || useradd --system --create-home --home-dir $B --shell /usr/sbin/nologin mytask
mkdir -p $B/app $B/data/s3 $B/data/mail $B/bin
# Swap used by the Next.js build (re-enabled by remote-deploy.sh; not in fstab).
if [ ! -f /swapfile-build ]; then fallocate -l 2G /swapfile-build; chmod 600 /swapfile-build; mkswap -q /swapfile-build; fi

# --- PostgreSQL + Redis, tuned for 1 GB RAM, loopback only ---
cat > /etc/postgresql/16/main/conf.d/mytask-lowmem.conf <<'EOF'
listen_addresses = 'localhost'
max_connections = 30
shared_buffers = 64MB
work_mem = 2MB
maintenance_work_mem = 32MB
effective_cache_size = 256MB
EOF
systemctl restart postgresql
sed -i "s/^# *maxmemory .*/maxmemory 64mb/; s/^# *maxmemory-policy .*/maxmemory-policy noeviction/; s/^appendonly no/appendonly yes/" /etc/redis/redis.conf
systemctl restart redis-server
if [ ! -f /root/.mytask-pgpw ]; then
  openssl rand -hex 16 > /root/.mytask-pgpw; chmod 600 /root/.mytask-pgpw
  sudo -u postgres psql -qc "CREATE ROLE mytask LOGIN PASSWORD '$(cat /root/.mytask-pgpw)';"
  sudo -u postgres createdb -O mytask mytask
fi
# The migrations create these too, but `vector` needs a superuser.
for e in btree_gist citext pg_trgm vector; do sudo -u postgres psql -q -d mytask -c "CREATE EXTENSION IF NOT EXISTS $e;"; done

# --- binaries (same versions as scripts/local/tools.mjs) ---
if [ ! -x $B/bin/weed ]; then
  curl -fsSL -o weed.tgz https://github.com/seaweedfs/seaweedfs/releases/download/4.48/linux_amd64.tar.gz
  tar xzf weed.tgz -C $B/bin weed && rm weed.tgz
fi
if [ ! -x $B/bin/mailpit ]; then
  curl -fsSL -o mailpit.tgz https://github.com/axllent/mailpit/releases/download/v1.31.3/mailpit-linux-amd64.tar.gz
  tar xzf mailpit.tgz -C $B/bin mailpit && rm mailpit.tgz
fi

# --- env file (secrets generated here, never leave the server) ---
ENVF=$B/.env
if [ ! -f $ENVF ]; then
  PGPW=$(cat /root/.mytask-pgpw)
  S3KEY=staging$(openssl rand -hex 6); S3SECRET=$(openssl rand -hex 20)
  JWT=$(node -e "const {generateKeyPairSync}=require('crypto');const k=generateKeyPairSync('ed25519',{publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});const b=s=>Buffer.from(s).toString('base64');console.log(b(k.privateKey)+' '+b(k.publicKey))")
  cat > $ENVF <<EOF
# MyTask STAGING (mytask.1kk.ge) — generated on the server, never copied anywhere.
NODE_ENV=production
LOG_LEVEL=info
APP_URL=https://mytask.1kk.ge
ADMIN_URL=https://mytask.1kk.ge/admin
# Staff panel under /admin on the same host (Owner 2026-10-06); read by the admin build (next.config basePath).
ADMIN_BASE_PATH=/admin
HOST=127.0.0.1
PORT=3300
READINESS_PORT=3301
WORKER_READINESS_PORT=3302
READINESS_HOST=127.0.0.1
DATABASE_URL=postgresql://mytask:${PGPW}@127.0.0.1:5432/mytask
REDIS_URL=redis://127.0.0.1:6379
TRUSTED_PROXY_IPS=127.0.0.1
INTERNAL_SERVICE_TOKEN=$(openssl rand -hex 32)
JWT_PRIVATE_KEY=${JWT% *}
JWT_PUBLIC_KEY=${JWT#* }
SETTINGS_ENCRYPTION_KEY=$(openssl rand -base64 32)
SMTP_URL=smtp://127.0.0.1:1025
MAIL_TRANSPORT=smtp
MAIL_FROM_ADDRESS=no-reply@mytask.1kk.ge
MAIL_FROM_NAME="MyTask.ge (staging)"
S3_ENDPOINT=http://127.0.0.1:8333
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=${S3KEY}
S3_SECRET_ACCESS_KEY=${S3SECRET}
S3_BUCKET_PUBLIC=public-media
S3_BUCKET_PRIVATE=private
S3_BUCKET_KYC=kyc
PUBLIC_MEDIA_BASE_URL=https://mytask.1kk.ge/media
SCAN_PROVIDER=none
API_INTERNAL_URL=http://127.0.0.1:3300/api/v1
NEXT_TELEMETRY_DISABLED=1
EOF
  chown mytask:mytask $ENVF; chmod 600 $ENVF
fi
set -a; . $ENVF; set +a

# --- SeaweedFS S3 identities (same policy as scripts/local.mjs: anonymous read of public-media only) ---
cat > $B/s3.json <<EOF
{"identities":[{"name":"staging","credentials":[{"accessKey":"${S3_ACCESS_KEY_ID}","secretKey":"${S3_SECRET_ACCESS_KEY}"}],"actions":["Admin","Read","List","Tagging","Write"]},{"name":"anonymous","actions":["Read:public-media"]}]}
EOF
chown -R mytask:mytask $B; chmod 600 $B/s3.json

# --- systemd units ---
cat > /etc/systemd/system/mytask-s3.service <<EOF
[Unit]
Description=MyTask staging object storage (SeaweedFS S3, 127.0.0.1:8333)
After=network.target
[Service]
User=mytask
ExecStart=$B/bin/weed server -ip=127.0.0.1 -ip.bind=127.0.0.1 -dir=$B/data/s3 -s3 -s3.port=8333 -s3.config=$B/s3.json -filer.disableHttp -master.volumeSizeLimitMB=128 -master.telemetry=false -volume.max=0 -volume.port=8334
Restart=always
MemoryMax=200M
[Install]
WantedBy=multi-user.target
EOF
cat > /etc/systemd/system/mytask-mail.service <<EOF
[Unit]
Description=MyTask staging test inbox (Mailpit, SMTP 127.0.0.1:1025, UI 127.0.0.1:8025/__mail)
After=network.target
[Service]
User=mytask
ExecStart=$B/bin/mailpit --smtp 127.0.0.1:1025 --listen 127.0.0.1:8025 --webroot /__mail/ --database $B/data/mail/mailpit.db
Restart=always
MemoryMax=100M
[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now mytask-s3 mytask-mail
sleep 8
systemctl is-active mytask-s3 mytask-mail
ss -tlnp | grep -E ':(8333|8334|9333|8888|1025|8025)\b' | awk '{print $4}'
