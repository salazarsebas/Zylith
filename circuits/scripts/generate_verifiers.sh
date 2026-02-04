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
  OUTPUT_FILE="$GARAGA_OUT/${circuit}_groth16_verifier.cairo"

  # Check if verification key exists
  if [ ! -f "$VK_FILE" ]; then
    echo "      ERROR: Verification key not found: $VK_FILE"
    echo "      Run setup.sh first."
    exit 1
  fi

  # Generate Garaga verifier
  garaga gen \
    --system groth16 \
    --vk "$VK_FILE" \
    --output "$OUTPUT_FILE" \
    --curve bn254

  echo "      Done. Output: $OUTPUT_FILE"
  echo ""
done

echo "==================================================="
echo "  Garaga verifier generation complete!"
echo "==================================================="
echo ""
echo "Generated Cairo verifiers:"
for circuit in "${CIRCUITS[@]}"; do
  echo "  - $GARAGA_OUT/${circuit}_groth16_verifier.cairo"
done
echo ""
echo "Next steps:"
echo "  1. Review generated verifiers in $GARAGA_OUT/"
echo "  2. Extract verification key constants"
echo "  3. Integrate with src/verifier/ contracts"
echo ""
echo "Integration guide:"
echo "  - Copy constants from generated verifiers to src/verifier/*_verifier.cairo"
echo "  - Use Garaga's verify functions in your contracts"
echo "  - Update src/lib.cairo to export verifier modules"
