#!/usr/bin/env bash
# Generate asp/.env and frontend/.env from root .env.local
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found. Copy .env.example to .env.local and fill in values."
  exit 1
fi

# Source the env file (skip comments and blank lines)
while IFS= read -r line || [[ -n "$line" ]]; do
  [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
  export "$line"
done < "$ENV_FILE"

# --- ASP .env ---
cat > "$ROOT_DIR/asp/.env" <<EOF
ASP_HOST=${ASP_HOST:-127.0.0.1}
ASP_PORT=${ASP_PORT:-3001}
STARKNET_RPC_URL=${STARKNET_RPC_URL}
ADMIN_ADDRESS=${ADMIN_ADDRESS}
ADMIN_PRIVATE_KEY=${ADMIN_PRIVATE_KEY}
KEYSTORE_PATH=${KEYSTORE_PATH:-../scripts/starknet-account/keystore.json}
KEYSTORE_PASSWORD=${KEYSTORE_PASSWORD:-}
COORDINATOR_ADDRESS=${COORDINATOR_ADDRESS:-}
POOL_ADDRESS=${POOL_ADDRESS:-}
EOF

echo "Generated asp/.env"

# --- Frontend .env ---
cat > "$ROOT_DIR/frontend/.env" <<EOF
VITE_STARKNET_RPC_URL=${VITE_STARKNET_RPC_URL:-${STARKNET_RPC_URL}}
VITE_ASP_URL=${VITE_ASP_URL:-http://localhost:3001}
VITE_CHAIN_ID=${VITE_CHAIN_ID:-SN_SEPOLIA}
VITE_CAVOS_APP_ID=${VITE_CAVOS_APP_ID:-}
VITE_STARKNET_NETWORK=${VITE_STARKNET_NETWORK:-sepolia}
EOF

echo "Generated frontend/.env"
