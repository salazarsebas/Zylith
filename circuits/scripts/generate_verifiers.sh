#!/bin/bash
# Zylith Garaga Verifier Generation Script
# Generates Cairo verifier contracts from verification keys using Garaga CLI

set -e

CIRCUITS_DIR="$(dirname "$0")/.."
BUILD_DIR="$CIRCUITS_DIR/build"
PROJECT_ROOT="$CIRCUITS_DIR/.."
GARAGA_OUT="$PROJECT_ROOT/garaga_verifiers"

echo "==================================================="
echo "  Zylith Garaga Verifier Generation"
echo "==================================================="
echo ""

# Check if garaga is installed
if ! command -v garaga &> /dev/null; then
  echo "ERROR: Garaga CLI not found."
  echo ""
  echo "Install Garaga with:"
  echo "  pip install garaga"
  echo ""
  exit 1
fi

# Create output directory
mkdir -p "$GARAGA_OUT"

# Array of circuits to process
CIRCUITS=("membership" "swap" "mint" "burn")

for i in "${!CIRCUITS[@]}"; do
  circuit="${CIRCUITS[$i]}"
  idx=$((i + 1))

  echo "[$idx/4] Generating Garaga verifier for $circuit..."

  VK_FILE="$BUILD_DIR/$circuit/verification_key.json"

  # Check if verification key exists
  if [ ! -f "$VK_FILE" ]; then
    echo "      ERROR: Verification key not found: $VK_FILE"
    echo "      Run setup.sh first."
    exit 1
  fi

  # Generate Garaga verifier (creates a full Scarb project)
  cd "$GARAGA_OUT"
  garaga gen \
    --system groth16 \
    --vk "$VK_FILE" \
    --project-name "${circuit}_verifier"
  cd "$PROJECT_ROOT"

  echo "      Done. Output: $GARAGA_OUT/${circuit}_verifier/"
  echo ""
done

echo "==================================================="
echo "  Garaga verifier generation complete!"
echo "==================================================="
echo ""
echo "Generated Scarb projects:"
for circuit in "${CIRCUITS[@]}"; do
  echo "  - $GARAGA_OUT/${circuit}_verifier/"
done
echo ""
echo "Next steps:"
echo "  1. Build each verifier: cd garaga_verifiers/<name> && scarb build"
echo "  2. Deploy verifier contracts to Starknet"
echo "  3. Pass verifier addresses to VerifierCoordinator constructor"
echo ""
