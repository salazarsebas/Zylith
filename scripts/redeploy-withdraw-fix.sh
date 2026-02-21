#!/bin/bash
set -e  # Exit on error

echo "=================================================="
echo "🔧 Zylith Withdrawal Security Fix - Complete Redeploy"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "Scarb.toml" ]; then
    print_error "Must run from project root (where Scarb.toml is)"
    exit 1
fi

# =============================================================================
# STEP 1: Regenerate Membership Circuit
# =============================================================================
print_step "Step 1/7: Regenerating membership circuit..."

cd circuits

# Compile the updated membership circuit
print_step "Compiling membership.circom..."
circom membership.circom --r1cs --wasm --sym --output build/

if [ $? -ne 0 ]; then
    print_error "Circuit compilation failed"
    exit 1
fi
print_success "Circuit compiled successfully"

# Check if we have a verification key
if [ ! -f "build/membership_verification_key.json" ]; then
    print_warning "No verification key found. You need to run trusted setup:"
    echo ""
    echo "  cd circuits/build"
    echo "  snarkjs groth16 setup membership.r1cs pot28_final.ptau membership_0000.zkey"
    echo "  snarkjs zkey contribute membership_0000.zkey membership_0001.zkey --name='First contribution' -v"
    echo "  snarkjs zkey export verificationkey membership_0001.zkey membership_verification_key.json"
    echo ""
    print_error "Exiting. Please complete trusted setup first."
    cd ..
    exit 1
fi

print_success "Membership circuit ready"
cd ..

# =============================================================================
# STEP 2: Generate Garaga Verifier
# =============================================================================
print_step "Step 2/7: Generating Cairo verifier with Garaga..."

# Check if garaga is installed
if ! command -v garaga &> /dev/null; then
    print_error "Garaga not found. Install with: pip install garaga"
    exit 1
fi

# Generate the Cairo verifier
garaga gen \
    --system groth16 \
    --circuit membership \
    --vk circuits/build/membership_verification_key.json \
    --output garaga_verifiers/membership_groth16_verifier.cairo

if [ $? -ne 0 ]; then
    print_error "Garaga verifier generation failed"
    exit 1
fi
print_success "Garaga verifier generated at garaga_verifiers/membership_groth16_verifier.cairo"

# =============================================================================
# STEP 3: Build Cairo Contracts
# =============================================================================
print_step "Step 3/7: Building Cairo contracts..."

scarb build

if [ $? -ne 0 ]; then
    print_error "Cairo build failed"
    exit 1
fi
print_success "Cairo contracts built successfully"

# =============================================================================
# STEP 4: Deploy to Starknet
# =============================================================================
print_step "Step 4/7: Deploying contracts to Starknet..."

# Load environment variables
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check required env vars
if [ -z "$STARKNET_ACCOUNT" ]; then
    print_error "STARKNET_ACCOUNT not set in .env"
    exit 1
fi

if [ -z "$STARKNET_RPC" ]; then
    print_error "STARKNET_RPC not set in .env"
    exit 1
fi

print_step "Deploying Membership Verifier (Garaga)..."
MEMBERSHIP_VERIFIER_CLASS_HASH=$(starkli class-hash target/dev/zylith_MembershipVerifier.contract_class.json)
print_success "Membership Verifier Class Hash: $MEMBERSHIP_VERIFIER_CLASS_HASH"

# Declare the class
starkli declare \
    target/dev/zylith_MembershipVerifier.contract_class.json \
    --account $STARKNET_ACCOUNT \
    --rpc $STARKNET_RPC

# Deploy membership verifier
MEMBERSHIP_VERIFIER_ADDRESS=$(starkli deploy \
    $MEMBERSHIP_VERIFIER_CLASS_HASH \
    --account $STARKNET_ACCOUNT \
    --rpc $STARKNET_RPC)

print_success "Membership Verifier deployed at: $MEMBERSHIP_VERIFIER_ADDRESS"

# Check if we need to update Coordinator or deploy new one
if [ -z "$COORDINATOR_ADDRESS" ]; then
    print_step "No existing Coordinator found. Deploying new Coordinator..."

    # You'll need to provide the other verifier addresses
    print_warning "You need to provide addresses for swap, mint, and burn verifiers"
    echo "Using placeholders - update these in the deploy command:"
    SWAP_VERIFIER=${SWAP_VERIFIER_ADDRESS:-"0x0"}
    MINT_VERIFIER=${MINT_VERIFIER_ADDRESS:-"0x0"}
    BURN_VERIFIER=${BURN_VERIFIER_ADDRESS:-"0x0"}

    COORDINATOR_CLASS_HASH=$(starkli class-hash target/dev/zylith_VerifierCoordinator.contract_class.json)

    starkli declare \
        target/dev/zylith_VerifierCoordinator.contract_class.json \
        --account $STARKNET_ACCOUNT \
        --rpc $STARKNET_RPC

    COORDINATOR_ADDRESS=$(starkli deploy \
        $COORDINATOR_CLASS_HASH \
        $STARKNET_ACCOUNT \
        $MEMBERSHIP_VERIFIER_ADDRESS \
        $SWAP_VERIFIER \
        $MINT_VERIFIER \
        $BURN_VERIFIER \
        --account $STARKNET_ACCOUNT \
        --rpc $STARKNET_RPC)

    print_success "Coordinator deployed at: $COORDINATOR_ADDRESS"
else
    print_step "Updating existing Coordinator with new Membership Verifier address..."
    print_warning "You need to call update_membership_verifier() on Coordinator manually"
    echo "Coordinator address: $COORDINATOR_ADDRESS"
    echo "New verifier address: $MEMBERSHIP_VERIFIER_ADDRESS"
fi

# Deploy new Pool contract with withdraw() function
print_step "Deploying new Pool contract..."

POOL_CLASS_HASH=$(starkli class-hash target/dev/zylith_ZylithPool.contract_class.json)

starkli declare \
    target/dev/zylith_ZylithPool.contract_class.json \
    --account $STARKNET_ACCOUNT \
    --rpc $STARKNET_RPC

POOL_ADDRESS=$(starkli deploy \
    $POOL_CLASS_HASH \
    $COORDINATOR_ADDRESS \
    --account $STARKNET_ACCOUNT \
    --rpc $STARKNET_RPC)

print_success "Pool deployed at: $POOL_ADDRESS"

# =============================================================================
# STEP 5: Update ASP Configuration
# =============================================================================
print_step "Step 5/7: Updating ASP configuration..."

cd asp

# Update .env file
if [ -f ".env" ]; then
    # Backup existing .env
    cp .env .env.backup
    print_success "Backed up existing .env to .env.backup"
fi

# Update or add the new addresses
echo "MEMBERSHIP_VERIFIER_ADDRESS=$MEMBERSHIP_VERIFIER_ADDRESS" >> .env
echo "COORDINATOR_ADDRESS=$COORDINATOR_ADDRESS" >> .env
echo "POOL_ADDRESS=$POOL_ADDRESS" >> .env

print_success "Updated ASP .env with new contract addresses"

# Rebuild ASP
print_step "Rebuilding ASP server..."
cargo build --release

if [ $? -ne 0 ]; then
    print_error "ASP build failed"
    cd ..
    exit 1
fi
print_success "ASP server rebuilt"

cd ..

# =============================================================================
# STEP 6: Rebuild SDK
# =============================================================================
print_step "Step 6/7: Rebuilding SDK..."

cd sdk

# Update SDK config if needed
if [ -f "src/config.ts" ]; then
    print_warning "Remember to update contract addresses in src/config.ts"
fi

bun run build

if [ $? -ne 0 ]; then
    print_error "SDK build failed"
    cd ..
    exit 1
fi
print_success "SDK rebuilt"

cd ..

# =============================================================================
# STEP 7: Rebuild Frontend
# =============================================================================
print_step "Step 7/7: Rebuilding frontend..."

cd frontend

npm run build

if [ $? -ne 0 ]; then
    print_error "Frontend build failed"
    cd ..
    exit 1
fi
print_success "Frontend rebuilt"

cd ..

# =============================================================================
# Summary
# =============================================================================
echo ""
echo "=================================================="
echo -e "${GREEN}✓ Deployment Complete!${NC}"
echo "=================================================="
echo ""
echo "📋 Deployed Contracts:"
echo "   • Membership Verifier: $MEMBERSHIP_VERIFIER_ADDRESS"
echo "   • Coordinator:         $COORDINATOR_ADDRESS"
echo "   • Pool:                $POOL_ADDRESS"
echo ""
echo "📝 Next Steps:"
echo ""
echo "1. Update frontend/src/config/contracts.ts with new addresses:"
echo "   export const POOL_ADDRESS = '$POOL_ADDRESS'"
echo "   export const COORDINATOR_ADDRESS = '$COORDINATOR_ADDRESS'"
echo ""
echo "2. Restart ASP server:"
echo "   cd asp && cargo run --release"
echo ""
echo "3. Restart frontend dev server:"
echo "   cd frontend && npm run dev"
echo ""
echo "4. Test withdrawal with your wallet to confirm tokens go to correct recipient"
echo ""
print_warning "IMPORTANT: The old Pool contract is now obsolete. Update all references!"
echo ""
