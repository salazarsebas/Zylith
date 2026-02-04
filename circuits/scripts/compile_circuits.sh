#!/bin/bash
# Zylith Circuit Compilation Script
# Compiles all Circom circuits for Groth16 proof generation

set -e

CIRCUITS_DIR="$(dirname "$0")/.."
BUILD_DIR="$CIRCUITS_DIR/build"

echo "==================================================="
echo "  Zylith Circuit Compilation"
echo "==================================================="
echo ""

# Create build directories
mkdir -p "$BUILD_DIR"/{membership,swap,mint,burn}

# Compile Membership circuit
echo "[1/4] Compiling Membership circuit..."
circom "$CIRCUITS_DIR/membership.circom" \
  --r1cs --wasm --sym \
  -l "$CIRCUITS_DIR/node_modules" \
  -o "$BUILD_DIR/membership"
echo "      Done. Output: $BUILD_DIR/membership/"

# Compile Swap circuit
echo "[2/4] Compiling Swap circuit..."
circom "$CIRCUITS_DIR/swap.circom" \
  --r1cs --wasm --sym \
  -l "$CIRCUITS_DIR/node_modules" \
  -o "$BUILD_DIR/swap"
echo "      Done. Output: $BUILD_DIR/swap/"

# Compile Mint circuit
echo "[3/4] Compiling Mint circuit..."
circom "$CIRCUITS_DIR/mint.circom" \
  --r1cs --wasm --sym \
  -l "$CIRCUITS_DIR/node_modules" \
  -o "$BUILD_DIR/mint"
echo "      Done. Output: $BUILD_DIR/mint/"

# Compile Burn circuit
echo "[4/4] Compiling Burn circuit..."
circom "$CIRCUITS_DIR/burn.circom" \
  --r1cs --wasm --sym \
  -l "$CIRCUITS_DIR/node_modules" \
  -o "$BUILD_DIR/burn"
echo "      Done. Output: $BUILD_DIR/burn/"

echo ""
echo "==================================================="
echo "  All circuits compiled successfully!"
echo "==================================================="
echo ""
echo "Next steps:"
echo "  1. Run setup.sh to generate proving/verification keys"
echo "  2. Run generate_verifiers.sh to create Garaga verifiers"
