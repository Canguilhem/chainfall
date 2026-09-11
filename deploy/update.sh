#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
git pull
corepack enable
pnpm install --frozen-lockfile
pnpm run build
sudo systemctl restart chainfall
curl -sf http://127.0.0.1:8787/api/health | head -c 200
echo
