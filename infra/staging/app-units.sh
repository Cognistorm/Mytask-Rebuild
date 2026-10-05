#!/bin/bash
# systemd units for the MyTask staging app processes (API, worker, web). Loopback only, user mytask.
set -euo pipefail
B=/opt/mytask-staging
A=$B/app

unit() { # name description workdir exec memmax [extra-env]
cat > /etc/systemd/system/$1.service <<EOF
[Unit]
Description=$2
After=network.target postgresql.service redis-server.service mytask-s3.service mytask-mail.service
[Service]
User=mytask
WorkingDirectory=$3
EnvironmentFile=$B/.env
Environment=NODE_ENV=production $6
ExecStart=$4
Restart=always
RestartSec=5
MemoryHigh=$5
NoNewPrivileges=true
[Install]
WantedBy=multi-user.target
EOF
}
NODE=$(command -v node)
unit mytask-api    "MyTask staging API (127.0.0.1:3300)"    $A/apps/api "$NODE --max-old-space-size=256 dist/main.js"   300M ""
unit mytask-worker "MyTask staging worker"                  $A/apps/api "$NODE --max-old-space-size=200 dist/worker.js" 250M ""
# PORT/HOSTNAME on the command line: EnvironmentFile (PORT=3300 for the API) would override Environment=.
# HOSTNAME=localhost, not 127.0.0.1: the proxy rewrites to http://localhost:<port>/ka and Next treats a different
# host as an external rewrite, which loops (BUG-01).
unit mytask-web    "MyTask staging web (localhost:3310)"    $A/apps/web/.next/standalone "/usr/bin/env PORT=3310 HOSTNAME=localhost $NODE --max-old-space-size=256 apps/web/server.js" 300M ""
systemctl daemon-reload
