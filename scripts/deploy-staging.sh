#!/usr/bin/env bash
# `bash scripts/deploy-staging.sh` — deploys the COMMITTED HEAD of the current branch to https://mytask.1kk.ge
# (infra/staging/README.md). Needs the SSH alias `mytask-staging` (or STAGING_SSH=<alias>). No GitHub push involved.
set -euo pipefail
HOST=${STAGING_SSH:-mytask-staging}
cd "$(git rev-parse --show-toplevel)"
commit=$(git rev-parse --short HEAD)
branch=$(git rev-parse --abbrev-ref HEAD)
if [ -n "$(git status --porcelain)" ]; then
  echo "deploy-staging: uncommitted changes are NOT deployed (only $commit)."
fi
echo "deploy-staging: uploading $branch @ $commit"
git archive --format=tar.gz HEAD -- . ':!legacy' ':!docs/01-discovery' |
  ssh -o BatchMode=yes "$HOST" 'cat > /opt/mytask-staging/release.tgz'
# The server script comes from the release itself, so a changed script takes effect in the same deploy.
ssh -o BatchMode=yes "$HOST" \
  "tar xzf /opt/mytask-staging/release.tgz -O infra/staging/remote-deploy.sh | bash -s -- $commit $branch"
