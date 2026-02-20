#!/usr/bin/env bash
# =============================================================================
# Zylith — Starknet Account Setup
# =============================================================================
# Creates a new starkli account for Sepolia deployment.
# Run this once, then fund the account with STRK before deploying.
#
# Usage:
#   bash scripts/setup-account.sh
# =============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ACCOUNT_DIR="$ROOT_DIR/scripts/starknet-account"
KEYSTORE_FILE="$ACCOUNT_DIR/keystore.json"
ACCOUNT_FILE="$ACCOUNT_DIR/account.json"

mkdir -p "$ACCOUNT_DIR"

# Step 1: Create keystore (will prompt for password)
if [[ -f "$KEYSTORE_FILE" ]]; then
    echo "Keystore already exists: $KEYSTORE_FILE"
else
    echo ">> Creating keystore (you'll be prompted for a password)..."
    starkli signer keystore new "$KEYSTORE_FILE"
    echo ""
fi

# Step 2: Initialize OZ account
if [[ -f "$ACCOUNT_FILE" ]]; then
    echo "Account file already exists: $ACCOUNT_FILE"
else
    echo ">> Initializing OpenZeppelin account..."
    starkli account oz init --keystore "$KEYSTORE_FILE" "$ACCOUNT_FILE"
    echo ""
fi

# Step 3: Extract address and show instructions
echo "========================================"
echo " Account Setup Complete!"
echo "========================================"

DEPLOY_ADDRESS=$(python3 -c "
import json
with open('$ACCOUNT_FILE') as f:
    data = json.load(f)
    print(data.get('deployment', {}).get('address', 'UNKNOWN'))
" 2>/dev/null || echo "Check $ACCOUNT_FILE for address")

echo ""
echo "Account address: $DEPLOY_ADDRESS"
echo ""
echo "Next steps:"
echo "  1. Get a free Alchemy RPC key at https://www.alchemy.com"
echo "     Create app -> Starknet Sepolia -> Copy API key"
echo ""
echo "  2. Fund your account with Sepolia STRK:"
echo "     https://starknet-faucet.vercel.app"
echo "     Paste: $DEPLOY_ADDRESS"
echo ""
echo "  3. Update .env.local with your values:"
echo "     STARKNET_RPC_URL=https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/<YOUR_KEY>"
echo "     STARKNET_KEYSTORE_PASSWORD=<your password from step 1>"
echo "     ADMIN_ADDRESS=$DEPLOY_ADDRESS"
echo ""
echo "  4. Deploy:"
echo "     SKIP_BUILD=1 bash scripts/deploy.sh"
echo ""
