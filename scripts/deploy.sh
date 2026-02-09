#!/usr/bin/env bash
# =============================================================================
# Zylith — Starknet Sepolia Deployment Script
# =============================================================================
# Prerequisites:
#   - starkli 0.4.x (https://github.com/xJonathanLEI/starkli)
#   - scarb 2.15.1 (main project) + scarb 2.14.0 (garaga verifiers via asdf)
#   - jq
#   - .env.local with STARKNET_RPC_URL, STARKNET_ACCOUNT, STARKNET_KEYSTORE,
#     STARKNET_KEYSTORE_PASSWORD
#
# Usage:
#   # Fund account first, then:
#   cd <project-root>
#   bash scripts/deploy.sh
#
# Optional env vars:
#   ADMIN_ADDRESS  — Admin address (defaults to account address from JSON)
#   PROTOCOL_FEE   — Protocol fee fraction 0-10 (defaults to 1 = 10%)
#   SKIP_BUILD     — Set to 1 to skip build step
# =============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPTS_DIR="$ROOT_DIR/scripts"
OUTPUT_FILE="$SCRIPTS_DIR/deployed_addresses.json"

# ---- Load .env.local ----
if [[ -f "$ROOT_DIR/.env.local" ]]; then
    set -a
    source "$ROOT_DIR/.env.local"
    set +a
fi

# ---- Validation ----
for var in STARKNET_RPC_URL STARKNET_ACCOUNT STARKNET_KEYSTORE STARKNET_KEYSTORE_PASSWORD; do
    if [[ -z "${!var:-}" ]]; then
        echo "ERROR: $var is not set. Check .env.local" >&2
        exit 1
    fi
done

# Resolve relative paths to absolute
if [[ ! "$STARKNET_ACCOUNT" = /* ]]; then
    export STARKNET_ACCOUNT="$ROOT_DIR/$STARKNET_ACCOUNT"
fi
if [[ ! "$STARKNET_KEYSTORE" = /* ]]; then
    export STARKNET_KEYSTORE="$ROOT_DIR/$STARKNET_KEYSTORE"
fi

# ---- Validate admin address ----
if [[ -z "${ADMIN_ADDRESS:-}" ]]; then
    echo "ERROR: ADMIN_ADDRESS is not set. Add it to .env.local" >&2
    exit 1
fi

PROTOCOL_FEE="${PROTOCOL_FEE:-1}"

echo "========================================"
echo " Zylith Deployment — Starknet Sepolia"
echo "========================================"
echo "RPC:          ${STARKNET_RPC_URL%/*}/***"
echo "Account:      $STARKNET_ACCOUNT"
echo "Admin:        $ADMIN_ADDRESS"
echo "Protocol Fee: $PROTOCOL_FEE (${PROTOCOL_FEE}0%)"
echo ""

# ---- Common starkli flags ----
RPC_FLAGS=(--rpc "$STARKNET_RPC_URL" --account "$STARKNET_ACCOUNT" --keystore "$STARKNET_KEYSTORE")

# ---- Helper: declare a contract, return class hash ----
declare_contract() {
    local sierra_file="$1"
    local name="$2"

    echo "   Declaring $name..." >&2
    local output
    output=$(starkli declare "$sierra_file" "${RPC_FLAGS[@]}" 2>&1) || true

    # Check if already declared
    if echo "$output" | grep -q "StarknetErrorCode.CLASS_ALREADY_DECLARED\|already declared\|AlreadyDeclared"; then
        local hash
        hash=$(echo "$output" | grep -oE '0x[0-9a-fA-F]{50,}' | head -1)
        if [[ -n "$hash" ]]; then
            echo "   Already declared: $hash" >&2
            echo "$hash"
            return
        fi
    fi

    # Handle CASM hash mismatch — retry with the expected hash
    if echo "$output" | grep -q "Mismatch compiled class hash"; then
        local expected_hash
        expected_hash=$(echo "$output" | grep -o 'Expected: 0x[0-9a-fA-F]*' | head -1 | cut -d' ' -f2)
        if [[ -n "$expected_hash" ]]; then
            echo "   CASM mismatch — retrying with expected hash..." >&2
            output=$(starkli declare "$sierra_file" --casm-hash "$expected_hash" "${RPC_FLAGS[@]}" 2>&1) || true
        fi
    fi

    local hash
    hash=$(echo "$output" | grep -oE '0x[0-9a-fA-F]+' | tail -1)
    if [[ -z "$hash" ]]; then
        echo "ERROR: Failed to declare $name:" >&2
        echo "$output" >&2
        exit 1
    fi
    echo "   Class hash: $hash" >&2
    echo "$hash"
}

# ---- Step 0: Deploy account if not yet deployed ----
echo ">> Checking account status..."
ACCOUNT_STATUS=$(starkli account fetch "$ADMIN_ADDRESS" --rpc "$STARKNET_RPC_URL" 2>&1) || true

if echo "$ACCOUNT_STATUS" | grep -q "not found on network\|ContractNotFound\|is not deployed"; then
    echo ">> Account not deployed. Deploying OZ account..."
    starkli account deploy "$STARKNET_ACCOUNT" \
        --rpc "$STARKNET_RPC_URL" \
        --keystore "$STARKNET_KEYSTORE" 2>&1
    echo "   Account deployed!"
    # Wait for deployment to be confirmed
    echo "   Waiting 10s for confirmation..."
    sleep 10
else
    echo "   Account already deployed."
fi

# ---- Step 1: Build (unless SKIP_BUILD=1) ----
if [[ "${SKIP_BUILD:-0}" != "1" ]]; then
    echo ""
    echo ">> Building Garaga verifiers (scarb 2.14.0)..."
    VERIFIER_NAMES=("membership_verifier" "swap_verifier" "mint_verifier" "burn_verifier")
    for name in "${VERIFIER_NAMES[@]}"; do
        echo "   Building $name..."
        (cd "$ROOT_DIR/garaga_verifiers/$name" && scarb build 2>&1 | tail -1)
    done

    echo ">> Building main project (scarb 2.15.1, release profile)..."
    (cd "$ROOT_DIR" && SCARB_PROFILE=release scarb build 2>&1 | tail -1)
else
    echo ">> Skipping build (SKIP_BUILD=1)"
fi

# ---- Step 2: Declare & Deploy Garaga Verifiers ----
echo ""
VERIFIER_NAMES=("membership_verifier" "swap_verifier" "mint_verifier" "burn_verifier")

declare_and_deploy_verifier() {
    local name="$1"
    local sierra_file="$ROOT_DIR/garaga_verifiers/$name/target/dev/${name}_Groth16VerifierBN254.contract_class.json"

    if [[ ! -f "$sierra_file" ]]; then
        echo "ERROR: Sierra file not found: $sierra_file" >&2
        echo "       Run 'scarb build' in garaga_verifiers/$name first." >&2
        exit 1
    fi

    local class_hash
    class_hash=$(declare_contract "$sierra_file" "$name" | tail -1)

    echo ">> Deploying $name..." >&2
    local deploy_output
    deploy_output=$(starkli deploy "$class_hash" "${RPC_FLAGS[@]}" 2>&1)
    local address
    address=$(echo "$deploy_output" | grep -oE '0x[0-9a-fA-F]{50,}' | tail -1)

    if [[ -z "$address" ]]; then
        echo "ERROR: Failed to deploy $name:" >&2
        echo "$deploy_output" >&2
        exit 1
    fi

    echo "   Address: $address" >&2
    echo "$address"
}

echo ">> Declaring & deploying membership_verifier..."
ADDR_MEMBERSHIP=$(declare_and_deploy_verifier "membership_verifier")
echo ">> Declaring & deploying swap_verifier..."
ADDR_SWAP=$(declare_and_deploy_verifier "swap_verifier")
echo ">> Declaring & deploying mint_verifier..."
ADDR_MINT=$(declare_and_deploy_verifier "mint_verifier")
echo ">> Declaring & deploying burn_verifier..."
ADDR_BURN=$(declare_and_deploy_verifier "burn_verifier")

# ---- Step 3: Declare & Deploy VerifierCoordinator ----
echo ""
COORD_SIERRA="$ROOT_DIR/target/release/zylith_VerifierCoordinator.contract_class.json"
COORD_CLASS=$(declare_contract "$COORD_SIERRA" "VerifierCoordinator" | tail -1)

echo ">> Deploying VerifierCoordinator..."
COORDINATOR_ADDRESS=$(starkli deploy "$COORD_CLASS" \
    "$ADMIN_ADDRESS" \
    "$ADDR_MEMBERSHIP" \
    "$ADDR_SWAP" \
    "$ADDR_MINT" \
    "$ADDR_BURN" \
    "${RPC_FLAGS[@]}" 2>&1 | grep -oE '0x[0-9a-fA-F]{50,}' | tail -1)
echo "   Address: $COORDINATOR_ADDRESS"

# ---- Step 4: Declare & Deploy ZylithPool ----
echo ""
POOL_SIERRA="$ROOT_DIR/target/release/zylith_ZylithPool.contract_class.json"
POOL_CLASS=$(declare_contract "$POOL_SIERRA" "ZylithPool" | tail -1)

echo ">> Deploying ZylithPool..."
POOL_ADDRESS=$(starkli deploy "$POOL_CLASS" \
    "$ADMIN_ADDRESS" \
    "$COORDINATOR_ADDRESS" \
    "$PROTOCOL_FEE" \
    "${RPC_FLAGS[@]}" 2>&1 | grep -oE '0x[0-9a-fA-F]{50,}' | tail -1)
echo "   Address: $POOL_ADDRESS"

# ---- Step 5: Write output ----
cat > "$OUTPUT_FILE" <<ENDJSON
{
  "network": "starknet-sepolia",
  "admin": "$ADMIN_ADDRESS",
  "protocol_fee": $PROTOCOL_FEE,
  "verifiers": {
    "membership": "$ADDR_MEMBERSHIP",
    "swap": "$ADDR_SWAP",
    "mint": "$ADDR_MINT",
    "burn": "$ADDR_BURN"
  },
  "coordinator": "$COORDINATOR_ADDRESS",
  "pool": "$POOL_ADDRESS"
}
ENDJSON

echo ""
echo "========================================"
echo " Deployment Complete!"
echo "========================================"
echo " Verifiers:"
echo "   membership_verifier: $ADDR_MEMBERSHIP"
echo "   swap_verifier:       $ADDR_SWAP"
echo "   mint_verifier:       $ADDR_MINT"
echo "   burn_verifier:       $ADDR_BURN"
echo " Coordinator: $COORDINATOR_ADDRESS"
echo " Pool:        $POOL_ADDRESS"
echo " Output:      $OUTPUT_FILE"
echo "========================================"
