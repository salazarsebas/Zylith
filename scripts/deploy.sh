#!/usr/bin/env bash
# =============================================================================
# Zylith — Starknet Sepolia Deployment Script
# =============================================================================
# Prerequisites:
#   - starkli (https://github.com/xJonathanLEI/starkli)
#   - scarb 2.15.1 (main project) + scarb 2.14.0 (garaga verifiers via asdf)
#
# Required env vars:
#   STARKNET_RPC_URL   — Sepolia JSON-RPC endpoint
#   STARKNET_ACCOUNT   — Path to starkli account file
#   STARKNET_KEYSTORE  — Path to starkli keystore file
#
# Optional:
#   ADMIN_ADDRESS      — Admin address (defaults to account address)
#   PROTOCOL_FEE       — Protocol fee fraction 0-10 (defaults to 1 = 10%)
# =============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPTS_DIR="$ROOT_DIR/scripts"
OUTPUT_FILE="$SCRIPTS_DIR/deployed_addresses.json"

# ---- Validation ----
for var in STARKNET_RPC_URL STARKNET_ACCOUNT STARKNET_KEYSTORE; do
    if [[ -z "${!var:-}" ]]; then
        echo "ERROR: $var is not set" >&2
        exit 1
    fi
done

ADMIN_ADDRESS="${ADMIN_ADDRESS:-$(starkli account fetch --output-format json "$STARKNET_ACCOUNT" 2>/dev/null | jq -r '.address' || echo "")}"
if [[ -z "$ADMIN_ADDRESS" ]]; then
    echo "ERROR: Could not determine ADMIN_ADDRESS. Set it explicitly." >&2
    exit 1
fi

PROTOCOL_FEE="${PROTOCOL_FEE:-1}"

echo "========================================"
echo " Zylith Deployment — Starknet Sepolia"
echo "========================================"
echo "RPC:          $STARKNET_RPC_URL"
echo "Admin:        $ADMIN_ADDRESS"
echo "Protocol Fee: $PROTOCOL_FEE (${PROTOCOL_FEE}0%)"
echo ""

# ---- Step 1: Build Garaga Verifiers (scarb 2.14.0) ----
echo ">> Building Garaga verifiers..."
VERIFIER_NAMES=("membership_verifier" "swap_verifier" "mint_verifier" "burn_verifier")
for name in "${VERIFIER_NAMES[@]}"; do
    echo "   Building $name..."
    (cd "$ROOT_DIR/garaga_verifiers/$name" && scarb build 2>&1 | tail -1)
done

# ---- Step 2: Build Main Project (scarb 2.15.1) ----
echo ">> Building main project..."
(cd "$ROOT_DIR" && scarb build 2>&1 | tail -1)

# ---- Step 3: Declare & Deploy Garaga Verifiers ----
declare -A VERIFIER_ADDRESSES

for name in "${VERIFIER_NAMES[@]}"; do
    echo ""
    echo ">> Declaring $name..."
    SIERRA_FILE="$ROOT_DIR/garaga_verifiers/$name/target/dev/${name}_Groth16VerifierBN254.contract_class.json"
    CASM_FILE="$ROOT_DIR/garaga_verifiers/$name/target/dev/${name}_Groth16VerifierBN254.compiled_contract_class.json"

    if [[ ! -f "$SIERRA_FILE" ]]; then
        echo "ERROR: Sierra file not found: $SIERRA_FILE" >&2
        exit 1
    fi

    CLASS_HASH=$(starkli declare "$SIERRA_FILE" \
        --casm-file "$CASM_FILE" \
        --rpc "$STARKNET_RPC_URL" \
        --account "$STARKNET_ACCOUNT" \
        --keystore "$STARKNET_KEYSTORE" 2>&1 | grep -oE '0x[0-9a-fA-F]+' | head -1)
    echo "   Class hash: $CLASS_HASH"

    echo ">> Deploying $name..."
    ADDRESS=$(starkli deploy "$CLASS_HASH" \
        --rpc "$STARKNET_RPC_URL" \
        --account "$STARKNET_ACCOUNT" \
        --keystore "$STARKNET_KEYSTORE" 2>&1 | grep -oE '0x[0-9a-fA-F]+' | head -1)
    echo "   Address: $ADDRESS"

    VERIFIER_ADDRESSES[$name]="$ADDRESS"
done

# ---- Step 4: Declare & Deploy VerifierCoordinator ----
echo ""
echo ">> Declaring VerifierCoordinator..."
COORD_SIERRA="$ROOT_DIR/target/dev/zylith_VerifierCoordinator.contract_class.json"
COORD_CASM="$ROOT_DIR/target/dev/zylith_VerifierCoordinator.compiled_contract_class.json"

COORD_CLASS=$(starkli declare "$COORD_SIERRA" \
    --casm-file "$COORD_CASM" \
    --rpc "$STARKNET_RPC_URL" \
    --account "$STARKNET_ACCOUNT" \
    --keystore "$STARKNET_KEYSTORE" 2>&1 | grep -oE '0x[0-9a-fA-F]+' | head -1)
echo "   Class hash: $COORD_CLASS"

echo ">> Deploying VerifierCoordinator..."
COORDINATOR_ADDRESS=$(starkli deploy "$COORD_CLASS" \
    "$ADMIN_ADDRESS" \
    "${VERIFIER_ADDRESSES[membership_verifier]}" \
    "${VERIFIER_ADDRESSES[swap_verifier]}" \
    "${VERIFIER_ADDRESSES[mint_verifier]}" \
    "${VERIFIER_ADDRESSES[burn_verifier]}" \
    --rpc "$STARKNET_RPC_URL" \
    --account "$STARKNET_ACCOUNT" \
    --keystore "$STARKNET_KEYSTORE" 2>&1 | grep -oE '0x[0-9a-fA-F]+' | head -1)
echo "   Address: $COORDINATOR_ADDRESS"

# ---- Step 5: Declare & Deploy ZylithPool ----
echo ""
echo ">> Declaring ZylithPool..."
POOL_SIERRA="$ROOT_DIR/target/dev/zylith_ZylithPool.contract_class.json"
POOL_CASM="$ROOT_DIR/target/dev/zylith_ZylithPool.compiled_contract_class.json"

POOL_CLASS=$(starkli declare "$POOL_SIERRA" \
    --casm-file "$POOL_CASM" \
    --rpc "$STARKNET_RPC_URL" \
    --account "$STARKNET_ACCOUNT" \
    --keystore "$STARKNET_KEYSTORE" 2>&1 | grep -oE '0x[0-9a-fA-F]+' | head -1)
echo "   Class hash: $POOL_CLASS"

echo ">> Deploying ZylithPool..."
POOL_ADDRESS=$(starkli deploy "$POOL_CLASS" \
    "$ADMIN_ADDRESS" \
    "$COORDINATOR_ADDRESS" \
    "$PROTOCOL_FEE" \
    --rpc "$STARKNET_RPC_URL" \
    --account "$STARKNET_ACCOUNT" \
    --keystore "$STARKNET_KEYSTORE" 2>&1 | grep -oE '0x[0-9a-fA-F]+' | head -1)
echo "   Address: $POOL_ADDRESS"

# ---- Step 6: Write output ----
cat > "$OUTPUT_FILE" <<ENDJSON
{
  "network": "starknet-sepolia",
  "admin": "$ADMIN_ADDRESS",
  "protocol_fee": $PROTOCOL_FEE,
  "verifiers": {
    "membership": "${VERIFIER_ADDRESSES[membership_verifier]}",
    "swap": "${VERIFIER_ADDRESSES[swap_verifier]}",
    "mint": "${VERIFIER_ADDRESSES[mint_verifier]}",
    "burn": "${VERIFIER_ADDRESSES[burn_verifier]}"
  },
  "coordinator": "$COORDINATOR_ADDRESS",
  "pool": "$POOL_ADDRESS"
}
ENDJSON

echo ""
echo "========================================"
echo " Deployment Complete!"
echo "========================================"
echo " Coordinator: $COORDINATOR_ADDRESS"
echo " Pool:        $POOL_ADDRESS"
echo " Output:      $OUTPUT_FILE"
echo "========================================"
