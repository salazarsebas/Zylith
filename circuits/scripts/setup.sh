#!/bin/bash
# Zylith Trusted Setup Script
# Generates proving and verification keys for all circuits using Powers of Tau

set -e

CIRCUITS_DIR="$(dirname "$0")/.."
BUILD_DIR="$CIRCUITS_DIR/build"

# Powers of Tau file (supports up to 2^20 constraints)
PTAU_FILE="$BUILD_DIR/powersOfTau28_hez_final_20.ptau"
PTAU_URL="https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_20.ptau"

echo "==================================================="
echo "  Zylith Trusted Setup"
echo "==================================================="
echo ""

# Download Powers of Tau if not present
if [ ! -f "$PTAU_FILE" ]; then
  echo "[0/4] Downloading Powers of Tau file..."
  echo "      This is a one-time download (~540MB)"
  curl -L -o "$PTAU_FILE" "$PTAU_URL"
  echo "      Done."
  echo ""
fi

# Array of circuits to process
CIRCUITS=("membership" "swap" "mint" "burn")

for i in "${!CIRCUITS[@]}"; do
  circuit="${CIRCUITS[$i]}"
  idx=$((i + 1))

  echo "[$idx/4] Processing $circuit circuit..."

  CIRCUIT_DIR="$BUILD_DIR/$circuit"
  R1CS_FILE="$CIRCUIT_DIR/$circuit.r1cs"
  ZKEY_FILE="$CIRCUIT_DIR/${circuit}_0000.zkey"
  VK_FILE="$CIRCUIT_DIR/verification_key.json"
  SOL_FILE="$CIRCUIT_DIR/verifier.sol"

  # Check if R1CS exists
  if [ ! -f "$R1CS_FILE" ]; then
    echo "      ERROR: R1CS file not found: $R1CS_FILE"
    echo "      Run compile_circuits.sh first."
    exit 1
  fi

  # Phase 2: Generate circuit-specific zkey
  echo "      Generating zkey..."
  snarkjs groth16 setup \
    "$R1CS_FILE" \
    "$PTAU_FILE" \
    "$ZKEY_FILE"

  # Export verification key
  echo "      Exporting verification key..."
  snarkjs zkey export verificationkey \
    "$ZKEY_FILE" \
    "$VK_FILE"

  # Generate Solidity verifier (for reference/testing)
  echo "      Generating Solidity verifier (reference)..."
  snarkjs zkey export solidityverifier \
    "$ZKEY_FILE" \
    "$SOL_FILE"

  echo "      Done. Files:"
  echo "        - $ZKEY_FILE"
  echo "        - $VK_FILE"
  echo ""
done

echo "==================================================="
echo "  Trusted setup complete!"
echo "==================================================="
echo ""
echo "Generated verification keys can be found at:"
for circuit in "${CIRCUITS[@]}"; do
  echo "  - $BUILD_DIR/$circuit/verification_key.json"
done
echo ""
echo "Next step: Run generate_verifiers.sh to create Garaga Cairo verifiers"
