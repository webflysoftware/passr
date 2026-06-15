#!/usr/bin/env bash
# Bootstrap or repair passr.net on the Hostinger VPS.
# Usage: ./scripts/bootstrap-server.sh [host]
#
# Requires SSH access as root. Uses ~/.ssh/id_ed25519_hostinger_new by default.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${1:-187.124.74.217}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519_hostinger_new}"
SSH_USER="${SSH_USER:-root}"
PASSR_API_PORT="${PASSR_API_PORT:-3011}"

if [[ ! -f "$SSH_KEY" ]]; then
  echo "SSH key not found: $SSH_KEY" >&2
  exit 1
fi

SSH=(ssh -i "$SSH_KEY" -o BatchMode=yes "${SSH_USER}@${HOST}")
RSYNC=(rsync -avzr -e "ssh -i $SSH_KEY -o BatchMode=yes")

echo "==> Building static site"
(cd "$ROOT" && npm run build)

echo "==> Syncing static site to ${HOST}:/var/www/passr.net/"
"${RSYNC[@]}" \
  --delete \
  --exclude '.git/' \
  --exclude '.github/' \
  --exclude 'node_modules/' \
  --exclude 'server/' \
  --exclude 'scripts/' \
  --exclude 'nginx/' \
  --exclude 'package.json' \
  --exclude '.gitignore' \
  --exclude '.DS_Store' \
  "$ROOT/" "${SSH_USER}@${HOST}:/var/www/passr.net/"

echo "==> Syncing API to ${HOST}:/opt/passr-api/"
"${RSYNC[@]}" \
  --delete \
  --exclude 'node_modules/' \
  --exclude '.env' \
  "$ROOT/server/" "${SSH_USER}@${HOST}:/opt/passr-api/"

echo "==> Installing nginx config and starting passr-api"
"${SSH[@]}" "PASSR_API_PORT=${PASSR_API_PORT} bash -s" <<'REMOTE'
set -euo pipefail
PASSR_API_PORT="${PASSR_API_PORT:-3011}"

if [[ ! -f /opt/passr-api/.env ]]; then
  JWT_SECRET="$(openssl rand -base64 48 | tr -d '\n')"
  cat > /opt/passr-api/.env <<EOF
NODE_ENV=production
PORT=${PASSR_API_PORT}
HOST=127.0.0.1
MONGODB_URI=mongodb://127.0.0.1:27017/passr
JWT_SECRET=${JWT_SECRET}
PASSR_SUPER_ADMIN_EMAILS=nick@webfly.io
PASSR_SUPER_ADMIN_DOMAINS=passr.net,webfly.io
AUTO_VERIFY_EMAIL=false
EOF
  echo "Created /opt/passr-api/.env (set PASSR_SUPER_ADMIN_EMAILS if needed)"
fi

cd /opt/passr-api
npm ci --omit=dev
pm2 startOrReload /opt/passr-api/ecosystem.config.cjs --env production
pm2 save
for i in 1 2 3 4 5; do
  curl -sf "http://127.0.0.1:${PASSR_API_PORT}/health" && break
  sleep 1
done
REMOTE

echo "==> Uploading nginx config"
scp -i "$SSH_KEY" -o BatchMode=yes "$ROOT/nginx/passr.net.conf" "${SSH_USER}@${HOST}:/etc/nginx/sites-available/passr.net"

"${SSH[@]}" "nginx -t && systemctl reload nginx"

echo "==> Done. Verify:"
echo "    curl -s https://passr.net/ | head"
echo "    curl -s https://passr.net/api/v1/passr/subscribe -X POST -H 'Content-Type: application/json' -d '{\"email\":\"test@example.com\"}'"
