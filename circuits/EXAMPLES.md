# Zylith Circuits - Usage Examples

This document provides concrete examples of how to use Zylith's circuits for private operations.

## Table of Contents

1. [Setup](#setup)
2. [Membership Proof](#membership-proof)
3. [Private Swap](#private-swap)
4. [Private Mint](#private-mint)
5. [Private Burn](#private-burn)

## Setup

### Installation

```bash
cd circuits/
npm install
```

### Compile Circuits

```bash
# Compile all circuits
npm run compile:all

# Or compile individually
npm run compile:membership
npm run compile:swap
npm run compile:liquidity
```

### Trusted Setup (for production)

```bash
# Download powers of tau
wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_20.ptau

# Generate zkey for each circuit
snarkjs groth16 setup build/membership.r1cs powersOfTau28_hez_final_20.ptau build/membership_0000.zkey

# Contribute to the ceremony
snarkjs zkey contribute build/membership_0000.zkey build/membership_final.zkey --name="First contribution" -v

# Export verification key
snarkjs zkey export verificationkey build/membership_final.zkey build/membership_vkey.json
```

## Membership Proof

Proves ownership of a note in the Merkle tree.

### Example: Prove Note Ownership

```javascript
const snarkjs = require("snarkjs");
const { buildPoseidon } = require("circomlibjs");

async function proveMembership() {
    // Initialize Poseidon hash
    const poseidon = await buildPoseidon();
    const F = poseidon.F;

    // Note details (private)
    const secret = F.e("12345678901234567890");
    const nullifier = F.e("98765432109876543210");
    const amount_low = F.e("1000000"); // 1M tokens (low 128 bits)
    const amount_high = F.e("0");      // High 128 bits
    const token = F.e("0x123456789abcdef"); // Token address

    // Compute commitment (must match Cairo)
    const innerHash = poseidon([secret, nullifier]);
    const commitment = poseidon([innerHash, amount_low, amount_high, token]);
    const nullifierHash = poseidon([nullifier]);

    // Merkle proof (example with 20 levels)
    // In real usage, get this from the Merkle tree
    const pathElements = Array(20).fill(F.e("0"));
    const pathIndices = Array(20).fill(0);

    // Assume commitment is at leaf index 0
    // Compute root
    let currentHash = commitment;
    for (let i = 0; i < 20; i++) {
        if (pathIndices[i] === 0) {
            // We are left child
            currentHash = poseidon([currentHash, pathElements[i]]);
        } else {
            // We are right child
            currentHash = poseidon([pathElements[i], currentHash]);
        }
    }
    const root = currentHash;

    // Circuit input
    const input = {
        // Public inputs
        root: F.toString(root),
        nullifierHash: F.toString(nullifierHash),

        // Private inputs
        secret: F.toString(secret),
        nullifier: F.toString(nullifier),
        amount_low: F.toString(amount_low),
        amount_high: F.toString(amount_high),
        token: F.toString(token),
        pathElements: pathElements.map(x => F.toString(x)),
        pathIndices: pathIndices
    };

    // Generate proof
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        "build/membership.wasm",
        "build/membership_final.zkey"
    );

    console.log("Proof generated!");
    console.log("Public signals:", publicSignals);
    console.log("Proof:", JSON.stringify(proof, null, 2));

    // Verify proof
    const vKey = JSON.parse(fs.readFileSync("build/membership_vkey.json"));
    const verified = await snarkjs.groth16.verify(vKey, publicSignals, proof);

    console.log("Verification result:", verified);

    return { proof, publicSignals, verified };
}

proveMembership().catch(console.error);
```

### Expected Output

```
Proof generated!
Public signals: [
  '12345...', // root
  '67890...'  // nullifierHash
]
Verification result: true
```

## Private Swap

Proves a valid private swap operation.

### Example: Swap 100 TokenA for TokenB

```javascript
async function provePrivateSwap() {
    const poseidon = await buildPoseidon();
    const F = poseidon.F;

    // Input note (private)
    const secret = F.e("11111111111111111111");
    const nullifier = F.e("22222222222222222222");
    const balance_low = F.e("1000000");  // 1M tokens
    const balance_high = F.e("0");
    const tokenIn = F.e("0xAAA");

    // Swap parameters (public)
    const amountIn = F.e("100000");      // Swap 100k tokens
    const tokenOut = F.e("0xBBB");
    const amountOutMin = F.e("95000");   // Minimum 95k out (5% slippage)

    // Actual swap result (private)
    const amountOut_low = F.e("98000");  // Actually got 98k
    const amountOut_high = F.e("0");

    // Output note (private)
    const newSecret = F.e("33333333333333333333");
    const newNullifier = F.e("44444444444444444444");

    // Change note (private)
    const changeSecret = F.e("55555555555555555555");
    const changeNullifier = F.e("66666666666666666666");
    const change_low = F.e(balance_low - amountIn); // 900k remaining

    // Compute commitments
    const innerHash = poseidon([secret, nullifier]);
    const inputCommitment = poseidon([innerHash, balance_low, balance_high, tokenIn]);
    const nullifierHash = poseidon([nullifier]);

    const newInnerHash = poseidon([newSecret, newNullifier]);
    const newCommitment = poseidon([newInnerHash, amountOut_low, amountOut_high, tokenOut]);

    const changeInnerHash = poseidon([changeSecret, changeNullifier]);
    const changeCommitment = poseidon([changeInnerHash, change_low, balance_high, tokenIn]);

    // Merkle proof for input note
    const pathElements = Array(20).fill(F.e("0"));
    const pathIndices = Array(20).fill(0);

    let root = inputCommitment;
    for (let i = 0; i < 20; i++) {
        root = poseidon([root, pathElements[i]]);
    }

    // Circuit input
    const input = {
        // Public
        root: F.toString(root),
        nullifierHash: F.toString(nullifierHash),
        newCommitment: F.toString(newCommitment),
        tokenIn: F.toString(tokenIn),
        tokenOut: F.toString(tokenOut),
        amountIn: F.toString(amountIn),
        amountOutMin: F.toString(amountOutMin),

        // Private - input note
        secret: F.toString(secret),
        nullifier: F.toString(nullifier),
        balance_low: F.toString(balance_low),
        balance_high: F.toString(balance_high),
        pathElements: pathElements.map(x => F.toString(x)),
        pathIndices: pathIndices,

        // Private - output note
        newSecret: F.toString(newSecret),
        newNullifier: F.toString(newNullifier),
        amountOut_low: F.toString(amountOut_low),
        amountOut_high: F.toString(amountOut_high),

        // Private - change note
        changeSecret: F.toString(changeSecret),
        changeNullifier: F.toString(changeNullifier)
    };

    // Generate proof
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        "build/swap.wasm",
        "build/swap_final.zkey"
    );

    console.log("Swap proof generated!");
    console.log("Change commitment:", publicSignals[publicSignals.length - 1]);

    return { proof, publicSignals };
}
```

## Private Mint

Proves valid liquidity provision.

### Example: Provide Liquidity to Pool

```javascript
async function provePrivateMint() {
    const poseidon = await buildPoseidon();
    const F = poseidon.F;

    // Tick offset constant
    const TICK_OFFSET = 887272;

    // Input notes
    const secret0 = F.e("11111111111111111111");
    const nullifier0 = F.e("22222222222222222222");
    const balance0_low = F.e("1000000");
    const balance0_high = F.e("0");
    const token0 = F.e("0xAAA");

    const secret1 = F.e("33333333333333333333");
    const nullifier1 = F.e("44444444444444444444");
    const balance1_low = F.e("2000000");
    const balance1_high = F.e("0");
    const token1 = F.e("0xBBB");

    // Position parameters (public)
    const tickLower = F.e(-1000 + TICK_OFFSET); // -1000 offset to positive
    const tickUpper = F.e(1000 + TICK_OFFSET);   // 1000 offset to positive

    // Amounts to provide (private)
    const amount0_low = F.e("500000");  // 500k token0
    const amount0_high = F.e("0");
    const amount1_low = F.e("1000000"); // 1M token1
    const amount1_high = F.e("0");

    // Position (private)
    const positionSecret = F.e("55555555555555555555");
    const positionNullifier = F.e("66666666666666666666");
    const liquidity = F.e("707106781186547524"); // sqrt(500k * 1M) ≈ 707k

    // Change notes
    const changeSecret0 = F.e("77777777777777777777");
    const changeNullifier0 = F.e("88888888888888888888");
    const change0_low = F.e(balance0_low - amount0_low); // 500k remaining

    const changeSecret1 = F.e("99999999999999999999");
    const changeNullifier1 = F.e("10101010101010101010");
    const change1_low = F.e(balance1_low - amount1_low); // 1M remaining

    // Compute commitments
    const innerHash0 = poseidon([secret0, nullifier0]);
    const commitment0 = poseidon([innerHash0, balance0_low, balance0_high, token0]);
    const nullifierHash0 = poseidon([nullifier0]);

    const innerHash1 = poseidon([secret1, nullifier1]);
    const commitment1 = poseidon([innerHash1, balance1_low, balance1_high, token1]);
    const nullifierHash1 = poseidon([nullifier1]);

    const positionCommitment = poseidon([
        positionSecret,
        positionNullifier,
        tickLower,
        tickUpper,
        liquidity
    ]);

    // Merkle proofs (simplified - same root for both)
    const pathElements0 = Array(20).fill(F.e("0"));
    const pathIndices0 = Array(20).fill(0);
    const pathElements1 = Array(20).fill(F.e("0"));
    const pathIndices1 = Array(20).fill(0);

    let root = commitment0;
    for (let i = 0; i < 20; i++) {
        root = poseidon([root, pathElements0[i]]);
    }

    // Circuit input
    const input = {
        // Public
        root: F.toString(root),
        nullifierHash0: F.toString(nullifierHash0),
        nullifierHash1: F.toString(nullifierHash1),
        positionCommitment: F.toString(positionCommitment),
        tickLower: F.toString(tickLower),
        tickUpper: F.toString(tickUpper),

        // Private - input note 0
        secret0: F.toString(secret0),
        nullifier0: F.toString(nullifier0),
        balance0_low: F.toString(balance0_low),
        balance0_high: F.toString(balance0_high),
        token0: F.toString(token0),
        pathElements0: pathElements0.map(x => F.toString(x)),
        pathIndices0: pathIndices0,

        // Private - input note 1
        secret1: F.toString(secret1),
        nullifier1: F.toString(nullifier1),
        balance1_low: F.toString(balance1_low),
        balance1_high: F.toString(balance1_high),
        token1: F.toString(token1),
        pathElements1: pathElements1.map(x => F.toString(x)),
        pathIndices1: pathIndices1,

        // Private - position
        positionSecret: F.toString(positionSecret),
        positionNullifier: F.toString(positionNullifier),
        liquidity: F.toString(liquidity),
        amount0_low: F.toString(amount0_low),
        amount0_high: F.toString(amount0_high),
        amount1_low: F.toString(amount1_low),
        amount1_high: F.toString(amount1_high),

        // Private - change notes
        changeSecret0: F.toString(changeSecret0),
        changeNullifier0: F.toString(changeNullifier0),
        changeSecret1: F.toString(changeSecret1),
        changeNullifier1: F.toString(changeNullifier1)
    };

    // Generate proof
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        "build/liquidity.wasm",
        "build/liquidity_final.zkey"
    );

    console.log("Liquidity mint proof generated!");
    console.log("Change commitment 0:", publicSignals[publicSignals.length - 2]);
    console.log("Change commitment 1:", publicSignals[publicSignals.length - 1]);

    return { proof, publicSignals };
}
```

## Private Burn

Proves valid liquidity removal.

### Example: Remove Liquidity from Position

```javascript
async function provePrivateBurn() {
    const poseidon = await buildPoseidon();
    const F = poseidon.F;

    const TICK_OFFSET = 887272;

    // Position (private)
    const positionSecret = F.e("11111111111111111111");
    const positionNullifier = F.e("22222222222222222222");
    const liquidity = F.e("707106781186547524");
    const tickLower = F.e(-1000 + TICK_OFFSET);
    const tickUpper = F.e(1000 + TICK_OFFSET);

    // Amounts to receive (private)
    const amount0_low = F.e("500000");
    const amount0_high = F.e("0");
    const token0 = F.e("0xAAA");

    const amount1_low = F.e("1000000");
    const amount1_high = F.e("0");
    const token1 = F.e("0xBBB");

    // Output notes (private)
    const newSecret0 = F.e("33333333333333333333");
    const newNullifier0 = F.e("44444444444444444444");

    const newSecret1 = F.e("55555555555555555555");
    const newNullifier1 = F.e("66666666666666666666");

    // Compute commitments
    const positionCommitment = poseidon([
        positionSecret,
        positionNullifier,
        tickLower,
        tickUpper,
        liquidity
    ]);
    const positionNullifierHash = poseidon([positionNullifier]);

    const newInnerHash0 = poseidon([newSecret0, newNullifier0]);
    const newCommitment0 = poseidon([newInnerHash0, amount0_low, amount0_high, token0]);

    const newInnerHash1 = poseidon([newSecret1, newNullifier1]);
    const newCommitment1 = poseidon([newInnerHash1, amount1_low, amount1_high, token1]);

    // Merkle proof
    const pathElements = Array(20).fill(F.e("0"));
    const pathIndices = Array(20).fill(0);

    let root = positionCommitment;
    for (let i = 0; i < 20; i++) {
        root = poseidon([root, pathElements[i]]);
    }

    // Circuit input
    const input = {
        // Public
        root: F.toString(root),
        positionNullifierHash: F.toString(positionNullifierHash),
        newCommitment0: F.toString(newCommitment0),
        newCommitment1: F.toString(newCommitment1),
        tickLower: F.toString(tickLower),
        tickUpper: F.toString(tickUpper),

        // Private - position
        positionSecret: F.toString(positionSecret),
        positionNullifier: F.toString(positionNullifier),
        liquidity: F.toString(liquidity),
        pathElements: pathElements.map(x => F.toString(x)),
        pathIndices: pathIndices,

        // Private - output notes
        newSecret0: F.toString(newSecret0),
        newNullifier0: F.toString(newNullifier0),
        amount0_low: F.toString(amount0_low),
        amount0_high: F.toString(amount0_high),
        token0: F.toString(token0),

        newSecret1: F.toString(newSecret1),
        newNullifier1: F.toString(newNullifier1),
        amount1_low: F.toString(amount1_low),
        amount1_high: F.toString(amount1_high),
        token1: F.toString(token1)
    };

    // Generate proof
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        "build/liquidity.wasm",
        "build/liquidity_final.zkey"
    );

    console.log("Liquidity burn proof generated!");

    return { proof, publicSignals };
}
```

## Integration with Cairo

### Converting Proofs for Starknet

After generating a proof, convert it to Cairo-compatible format:

```javascript
function formatProofForCairo(proof, publicSignals) {
    // Groth16 proof has 3 components: A, B, C
    // Each is a point on the elliptic curve

    return {
        a: {
            x: proof.pi_a[0],
            y: proof.pi_a[1]
        },
        b: {
            x: [proof.pi_b[0][0], proof.pi_b[0][1]],
            y: [proof.pi_b[1][0], proof.pi_b[1][1]]
        },
        c: {
            x: proof.pi_c[0],
            y: proof.pi_c[1]
        },
        publicSignals: publicSignals
    };
}
```

### Cairo Contract Call

```cairo
// Submit proof to Zylith contract
let proof = Groth16Proof {
    a: G1Point { x: a_x, y: a_y },
    b: G2Point { x: [b_x0, b_x1], y: [b_y0, b_y1] },
    c: G1Point { x: c_x, y: c_y }
};

let public_inputs = array![root, nullifier_hash];

// Verify and execute
zylith_contract.execute_private_swap(proof, public_inputs, new_commitment);
```

## Testing

### Run All Examples

```bash
node examples/membership.js
node examples/swap.js
node examples/mint.js
node examples/burn.js
```

### Test Vectors

Create test vectors for edge cases:

```javascript
// Test with maximum u128 value
const MAX_U128 = F.e("340282366920938463463374607431768211455");

// Test with zero change
const change_low = F.e("0");

// Test with maximum tree depth
const pathElements = Array(20).fill(F.e("1234567890"));
```

## Troubleshooting

### Issue: "Constraint doesn't match"

**Solution**: Check that input values satisfy circuit constraints:
- Amounts fit in 128 bits
- Nullifiers are unique
- Merkle proof is valid

### Issue: "Signal not found"

**Solution**: Ensure all required signals are provided in the input object.

### Issue: Proof generation is slow

**Solution**:
- Use trusted setup with appropriate powers of tau
- Run on machine with sufficient RAM (16GB+ recommended)
- Consider circuit optimization

## Additional Resources

- [Circom Tutorial](https://docs.circom.io/getting-started/installation/)
- [snarkjs Documentation](https://github.com/iden3/snarkjs)
- [Zylith Documentation](https://docs.zylith.io)
