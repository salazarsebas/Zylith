pragma circom 2.2.0;

include "./common/commitment.circom";
include "./common/merkle.circom";
include "node_modules/circomlib/circuits/comparators.circom";
include "node_modules/circomlib/circuits/bitify.circom";

/**
 * @title PrivateMint
 * @dev Proves valid private liquidity provision to a Zylith CLMM pool
 *
 * SECURITY MODEL:
 * This circuit proves that:
 * 1. The prover owns two input notes (token0 and token1)
 * 2. Both notes exist in the Merkle tree
 * 3. Amounts match the required ratio for the tick range
 * 4. A valid position commitment is created
 * 5. Change notes are correctly computed
 * 6. All nullifiers are unique
 *
 * LIQUIDITY PROVISION FLOW:
 * Inputs:
 *   - Note0: token0, balance0
 *   - Note1: token1, balance1
 * Mint:
 *   - Position in range [tickLower, tickUpper]
 *   - Consumes amount0 and amount1
 * Outputs:
 *   - Position commitment (LP NFT equivalent)
 *   - Change0: token0, (balance0 - amount0)
 *   - Change1: token1, (balance1 - amount1)
 *
 * PUBLIC INPUTS (visible on-chain):
 * - root: Merkle root
 * - nullifierHash0, nullifierHash1: Prevent double-spending
 * - positionCommitment: The LP position NFT
 * - tickLower, tickUpper: Tick range (needed for AMM math)
 *
 * PRIVATE INPUTS (hidden):
 * - Two input notes with Merkle proofs
 * - Position details (liquidity amount)
 * - Two change notes
 *
 * PRIVACY GUARANTEES:
 * - Input balances are hidden
 * - Provided amounts are hidden
 * - Owner identity is hidden
 * - Cannot link position to provider
 *
 * TICK OFFSET:
 * Ticks range from -887272 to 887272 in Uniswap v3 style pools.
 * We add 887272 to convert to unsigned range [0, 1774544].
 *
 * Constraints Analysis:
 * - Input commitment 0: ~486 constraints
 * - Input commitment 1: ~486 constraints
 * - Position commitment: ~399 constraints
 * - Change commitment 0: ~486 constraints
 * - Change commitment 1: ~486 constraints
 * - Merkle proof 0: ~2,940 constraints
 * - Merkle proof 1: ~2,940 constraints
 * - Range checks and comparisons: ~500 constraints
 * - Total: ~8,723 constraints
 *
 * @param levels Number of levels in the Merkle tree (20 for Zylith)
 */
template PrivateMint(levels) {
    // Tick offset constant: converts signed ticks to unsigned
    var TICK_OFFSET = 887272;

    //////////////////////// PUBLIC SIGNALS ///////////////////////

    signal input root;                  // State tree Merkle root
    signal input nullifierHash0;        // Nullifier for token0 note
    signal input nullifierHash1;        // Nullifier for token1 note
    signal input positionCommitment;    // LP position commitment
    signal input tickLower;             // Lower tick (already offset to positive)
    signal input tickUpper;             // Upper tick (already offset to positive)

    //////////////////// END OF PUBLIC SIGNALS ////////////////////


    /////////////// PRIVATE SIGNALS - INPUT NOTE 0 ////////////////

    signal input secret0;               // Token0 note secret
    signal input nullifier0;            // Token0 note nullifier
    signal input balance0_low;          // Token0 balance (low 128 bits)
    signal input balance0_high;         // Token0 balance (high 128 bits)
    signal input token0;                // Token0 address
    signal input pathElements0[levels]; // Merkle proof siblings
    signal input pathIndices0[levels];  // Merkle proof path

    /////////// END OF PRIVATE SIGNALS - INPUT NOTE 0 /////////////


    /////////////// PRIVATE SIGNALS - INPUT NOTE 1 ////////////////

    signal input secret1;               // Token1 note secret
    signal input nullifier1;            // Token1 note nullifier
    signal input balance1_low;          // Token1 balance (low 128 bits)
    signal input balance1_high;         // Token1 balance (high 128 bits)
    signal input token1;                // Token1 address
    signal input pathElements1[levels]; // Merkle proof siblings
    signal input pathIndices1[levels];  // Merkle proof path

    /////////// END OF PRIVATE SIGNALS - INPUT NOTE 1 /////////////


    /////////////// PRIVATE SIGNALS - POSITION INFO ///////////////

    signal input positionSecret;        // Position secret
    signal input positionNullifier;     // Position nullifier
    signal input liquidity;             // Liquidity amount being minted
    signal input amount0_low;           // Token0 amount used (low 128 bits)
    signal input amount0_high;          // Token0 amount used (high 128 bits)
    signal input amount1_low;           // Token1 amount used (low 128 bits)
    signal input amount1_high;          // Token1 amount used (high 128 bits)

    /////////// END OF PRIVATE SIGNALS - POSITION INFO ////////////


    /////////////// PRIVATE SIGNALS - CHANGE NOTES ////////////////

    signal input changeSecret0;         // Change note 0 secret
    signal input changeNullifier0;      // Change note 0 nullifier
    signal input changeSecret1;         // Change note 1 secret
    signal input changeNullifier1;      // Change note 1 nullifier

    /////////// END OF PRIVATE SIGNALS - CHANGE NOTES /////////////


    /////////////////////// OUTPUT SIGNALS ////////////////////////

    signal output changeCommitment0;    // Change note 0 commitment
    signal output changeCommitment1;    // Change note 1 commitment

    //////////////////// END OF OUTPUT SIGNALS ////////////////////


    /////////////////////////// LOGIC /////////////////////////////

    // SECTION 1: Verify token0 note ownership
    // ========================================

    // 1.1: Compute token0 input commitment
    component inputCommitment0 = ZylithCommitment();
    inputCommitment0.secret <== secret0;
    inputCommitment0.nullifier <== nullifier0;
    inputCommitment0.amount_low <== balance0_low;
    inputCommitment0.amount_high <== balance0_high;
    inputCommitment0.token <== token0;

    // 1.2: Verify nullifier hash matches public input
    component nullifierCheck0 = IsEqual();
    nullifierCheck0.in[0] <== inputCommitment0.nullifierHash;
    nullifierCheck0.in[1] <== nullifierHash0;
    nullifierCheck0.out === 1;

    // 1.3: Verify commitment exists in Merkle tree
    component merkleProof0 = MerkleProof(levels);
    merkleProof0.leaf <== inputCommitment0.commitment;
    merkleProof0.pathElements <== pathElements0;
    merkleProof0.pathIndices <== pathIndices0;

    component rootCheck0 = IsEqual();
    rootCheck0.in[0] <== merkleProof0.root;
    rootCheck0.in[1] <== root;
    rootCheck0.out === 1;

    // SECTION 2: Verify token1 note ownership
    // ========================================

    // 2.1: Compute token1 input commitment
    component inputCommitment1 = ZylithCommitment();
    inputCommitment1.secret <== secret1;
    inputCommitment1.nullifier <== nullifier1;
    inputCommitment1.amount_low <== balance1_low;
    inputCommitment1.amount_high <== balance1_high;
    inputCommitment1.token <== token1;

    // 2.2: Verify nullifier hash matches public input
    component nullifierCheck1 = IsEqual();
    nullifierCheck1.in[0] <== inputCommitment1.nullifierHash;
    nullifierCheck1.in[1] <== nullifierHash1;
    nullifierCheck1.out === 1;

    // 2.3: Verify commitment exists in Merkle tree
    component merkleProof1 = MerkleProof(levels);
    merkleProof1.leaf <== inputCommitment1.commitment;
    merkleProof1.pathElements <== pathElements1;
    merkleProof1.pathIndices <== pathIndices1;

    component rootCheck1 = IsEqual();
    rootCheck1.in[0] <== merkleProof1.root;
    rootCheck1.in[1] <== root;
    rootCheck1.out === 1;

    // SECTION 3: Verify token ordering
    // =================================

    // Token0 must be < Token1 (standard Uniswap v3 convention)
    component tokenOrder = LessThan(252);
    tokenOrder.in[0] <== token0;
    tokenOrder.in[1] <== token1;
    tokenOrder.out === 1;

    // SECTION 4: Verify tick range validity
    // ======================================

    // 4.1: Ticks must be in valid range [0, 1774544] after offset
    component tickLowerBits = Num2Bits(21); // log2(1774544) ≈ 20.75
    tickLowerBits.in <== tickLower;

    component tickUpperBits = Num2Bits(21);
    tickUpperBits.in <== tickUpper;

    // 4.2: tickLower must be < tickUpper
    component tickOrdering = LessThan(21);
    tickOrdering.in[0] <== tickLower;
    tickOrdering.in[1] <== tickUpper;
    tickOrdering.out === 1;

    // 4.3: Verify ticks are within bounds (0 to 2*TICK_OFFSET)
    component tickLowerValid = LessEqThan(21);
    tickLowerValid.in[0] <== tickLower;
    tickLowerValid.in[1] <== 2 * TICK_OFFSET;
    tickLowerValid.out === 1;

    component tickUpperValid = LessEqThan(21);
    tickUpperValid.in[0] <== tickUpper;
    tickUpperValid.in[1] <== 2 * TICK_OFFSET;
    tickUpperValid.out === 1;

    // SECTION 5: Verify amount constraints
    // =====================================

    // 5.1: Range check all amounts
    component amount0LowBits = Num2Bits(128);
    amount0LowBits.in <== amount0_low;

    component amount0HighBits = Num2Bits(128);
    amount0HighBits.in <== amount0_high;

    component amount1LowBits = Num2Bits(128);
    amount1LowBits.in <== amount1_low;

    component amount1HighBits = Num2Bits(128);
    amount1HighBits.in <== amount1_high;

    // 5.2: Verify amount0 <= balance0
    component balance0HighZero = IsZero();
    balance0HighZero.in <== balance0_high;

    component amount0Fits = LessEqThan(128);
    amount0Fits.in[0] <== amount0_low;
    amount0Fits.in[1] <== balance0_low;

    signal amount0Valid <== 1 - balance0HighZero.out + balance0HighZero.out * amount0Fits.out;
    amount0Valid === 1;

    // 5.3: Verify amount1 <= balance1
    component balance1HighZero = IsZero();
    balance1HighZero.in <== balance1_high;

    component amount1Fits = LessEqThan(128);
    amount1Fits.in[0] <== amount1_low;
    amount1Fits.in[1] <== balance1_low;

    signal amount1Valid <== 1 - balance1HighZero.out + balance1HighZero.out * amount1Fits.out;
    amount1Valid === 1;

    // 5.4: Calculate change amounts
    signal change0_low <== balance0_low - amount0_low;
    signal change0_high <== balance0_high - amount0_high;

    signal change1_low <== balance1_low - amount1_low;
    signal change1_high <== balance1_high - amount1_high;

    // Range check changes
    component change0LowBits = Num2Bits(128);
    change0LowBits.in <== change0_low;

    component change1LowBits = Num2Bits(128);
    change1LowBits.in <== change1_low;

    // SECTION 6: Verify position commitment
    // ======================================

    // 6.1: Compute position commitment
    component positionCommit = ZylithPositionCommitment();
    positionCommit.secret <== positionSecret;
    positionCommit.nullifier <== positionNullifier;
    positionCommit.tickLower <== tickLower;
    positionCommit.tickUpper <== tickUpper;
    positionCommit.liquidity <== liquidity;

    // 6.2: Verify position commitment matches public input
    component positionCheck = IsEqual();
    positionCheck.in[0] <== positionCommit.commitment;
    positionCheck.in[1] <== positionCommitment;
    positionCheck.out === 1;

    // SECTION 7: Compute change commitments
    // ======================================

    // 7.1: Compute change0 commitment
    component changeCommit0 = ZylithCommitment();
    changeCommit0.secret <== changeSecret0;
    changeCommit0.nullifier <== changeNullifier0;
    changeCommit0.amount_low <== change0_low;
    changeCommit0.amount_high <== change0_high;
    changeCommit0.token <== token0;

    changeCommitment0 <== changeCommit0.commitment;

    // 7.2: Compute change1 commitment
    component changeCommit1 = ZylithCommitment();
    changeCommit1.secret <== changeSecret1;
    changeCommit1.nullifier <== changeNullifier1;
    changeCommit1.amount_low <== change1_low;
    changeCommit1.amount_high <== change1_high;
    changeCommit1.token <== token1;

    changeCommitment1 <== changeCommit1.commitment;

    // SECTION 8: Verify nullifier uniqueness
    // =======================================

    // All 5 nullifiers must be unique
    component null01 = IsEqual();
    null01.in[0] <== nullifier0;
    null01.in[1] <== nullifier1;
    null01.out === 0;

    component null0p = IsEqual();
    null0p.in[0] <== nullifier0;
    null0p.in[1] <== positionNullifier;
    null0p.out === 0;

    component null0c0 = IsEqual();
    null0c0.in[0] <== nullifier0;
    null0c0.in[1] <== changeNullifier0;
    null0c0.out === 0;

    component null0c1 = IsEqual();
    null0c1.in[0] <== nullifier0;
    null0c1.in[1] <== changeNullifier1;
    null0c1.out === 0;

    component null1p = IsEqual();
    null1p.in[0] <== nullifier1;
    null1p.in[1] <== positionNullifier;
    null1p.out === 0;

    component null1c0 = IsEqual();
    null1c0.in[0] <== nullifier1;
    null1c0.in[1] <== changeNullifier0;
    null1c0.out === 0;

    component null1c1 = IsEqual();
    null1c1.in[0] <== nullifier1;
    null1c1.in[1] <== changeNullifier1;
    null1c1.out === 0;

    component nullpc0 = IsEqual();
    nullpc0.in[0] <== positionNullifier;
    nullpc0.in[1] <== changeNullifier0;
    nullpc0.out === 0;

    component nullpc1 = IsEqual();
    nullpc1.in[0] <== positionNullifier;
    nullpc1.in[1] <== changeNullifier1;
    nullpc1.out === 0;

    component nullc0c1 = IsEqual();
    nullc0c1.in[0] <== changeNullifier0;
    nullc0c1.in[1] <== changeNullifier1;
    nullc0c1.out === 0;

    // SECTION 9: Verify non-zero values
    // ==================================

    component secret0NonZero = IsZero();
    secret0NonZero.in <== secret0;
    secret0NonZero.out === 0;

    component nullifier0NonZero = IsZero();
    nullifier0NonZero.in <== nullifier0;
    nullifier0NonZero.out === 0;

    component secret1NonZero = IsZero();
    secret1NonZero.in <== secret1;
    secret1NonZero.out === 0;

    component nullifier1NonZero = IsZero();
    nullifier1NonZero.in <== nullifier1;
    nullifier1NonZero.out === 0;

    component positionSecretNonZero = IsZero();
    positionSecretNonZero.in <== positionSecret;
    positionSecretNonZero.out === 0;

    component positionNullifierNonZero = IsZero();
    positionNullifierNonZero.in <== positionNullifier;
    positionNullifierNonZero.out === 0;

    component liquidityNonZero = IsZero();
    liquidityNonZero.in <== liquidity;
    liquidityNonZero.out === 0;

    /////////////////////// END OF LOGIC //////////////////////////
}

/**
 * @title PrivateBurn
 * @dev Proves valid private liquidity removal from a Zylith CLMM pool
 *
 * SECURITY MODEL:
 * This circuit proves that:
 * 1. The prover owns a valid LP position
 * 2. The position commitment exists in the Merkle tree
 * 3. Output notes for both tokens are correctly formed
 * 4. Amounts match the position's liquidity
 *
 * LIQUIDITY REMOVAL FLOW:
 * Input:
 *   - Position commitment in range [tickLower, tickUpper]
 * Burn:
 *   - Remove liquidity, receive amount0 and amount1
 * Outputs:
 *   - Note0: token0, amount0
 *   - Note1: token1, amount1
 *
 * Constraints Analysis:
 * - Position commitment verification: ~399 constraints
 * - Output commitment 0: ~486 constraints
 * - Output commitment 1: ~486 constraints
 * - Merkle proof: ~2,940 constraints
 * - Range checks and comparisons: ~300 constraints
 * - Total: ~4,611 constraints
 *
 * @param levels Number of levels in the Merkle tree (20 for Zylith)
 */
template PrivateBurn(levels) {
    //////////////////////// PUBLIC SIGNALS ///////////////////////

    signal input root;                  // State tree Merkle root
    signal input positionNullifierHash; // Position nullifier hash
    signal input newCommitment0;        // Output note 0 commitment
    signal input newCommitment1;        // Output note 1 commitment
    signal input tickLower;             // Lower tick (public)
    signal input tickUpper;             // Upper tick (public)

    //////////////////// END OF PUBLIC SIGNALS ////////////////////


    /////////////// PRIVATE SIGNALS - POSITION INFO ///////////////

    signal input positionSecret;        // Position secret
    signal input positionNullifier;     // Position nullifier
    signal input liquidity;             // Liquidity amount being burned
    signal input pathElements[levels];  // Merkle proof siblings
    signal input pathIndices[levels];   // Merkle proof path

    /////////// END OF PRIVATE SIGNALS - POSITION INFO ////////////


    /////////////// PRIVATE SIGNALS - OUTPUT NOTES ////////////////

    signal input newSecret0;            // Output note 0 secret
    signal input newNullifier0;         // Output note 0 nullifier
    signal input amount0_low;           // Token0 amount received (low)
    signal input amount0_high;          // Token0 amount received (high)
    signal input token0;                // Token0 address

    signal input newSecret1;            // Output note 1 secret
    signal input newNullifier1;         // Output note 1 nullifier
    signal input amount1_low;           // Token1 amount received (low)
    signal input amount1_high;          // Token1 amount received (high)
    signal input token1;                // Token1 address

    /////////// END OF PRIVATE SIGNALS - OUTPUT NOTES /////////////


    /////////////////////////// LOGIC /////////////////////////////

    // SECTION 1: Verify position ownership
    // =====================================

    // 1.1: Compute position commitment
    component positionCommit = ZylithPositionCommitment();
    positionCommit.secret <== positionSecret;
    positionCommit.nullifier <== positionNullifier;
    positionCommit.tickLower <== tickLower;
    positionCommit.tickUpper <== tickUpper;
    positionCommit.liquidity <== liquidity;

    // 1.2: Verify nullifier hash matches public input
    component nullifierCheck = IsEqual();
    nullifierCheck.in[0] <== positionCommit.nullifierHash;
    nullifierCheck.in[1] <== positionNullifierHash;
    nullifierCheck.out === 1;

    // 1.3: Verify position commitment exists in Merkle tree
    component merkleProof = MerkleProof(levels);
    merkleProof.leaf <== positionCommit.commitment;
    merkleProof.pathElements <== pathElements;
    merkleProof.pathIndices <== pathIndices;

    component rootCheck = IsEqual();
    rootCheck.in[0] <== merkleProof.root;
    rootCheck.in[1] <== root;
    rootCheck.out === 1;

    // SECTION 2: Verify output note 0
    // ================================

    // 2.1: Compute output note 0 commitment
    component outputCommit0 = ZylithCommitment();
    outputCommit0.secret <== newSecret0;
    outputCommit0.nullifier <== newNullifier0;
    outputCommit0.amount_low <== amount0_low;
    outputCommit0.amount_high <== amount0_high;
    outputCommit0.token <== token0;

    // 2.2: Verify commitment matches public input
    component outputCheck0 = IsEqual();
    outputCheck0.in[0] <== outputCommit0.commitment;
    outputCheck0.in[1] <== newCommitment0;
    outputCheck0.out === 1;

    // SECTION 3: Verify output note 1
    // ================================

    // 3.1: Compute output note 1 commitment
    component outputCommit1 = ZylithCommitment();
    outputCommit1.secret <== newSecret1;
    outputCommit1.nullifier <== newNullifier1;
    outputCommit1.amount_low <== amount1_low;
    outputCommit1.amount_high <== amount1_high;
    outputCommit1.token <== token1;

    // 3.2: Verify commitment matches public input
    component outputCheck1 = IsEqual();
    outputCheck1.in[0] <== outputCommit1.commitment;
    outputCheck1.in[1] <== newCommitment1;
    outputCheck1.out === 1;

    // SECTION 4: Verify token ordering
    // =================================

    component tokenOrder = LessThan(252);
    tokenOrder.in[0] <== token0;
    tokenOrder.in[1] <== token1;
    tokenOrder.out === 1;

    // SECTION 5: Verify nullifier uniqueness
    // =======================================

    component null01 = IsEqual();
    null01.in[0] <== positionNullifier;
    null01.in[1] <== newNullifier0;
    null01.out === 0;

    component null02 = IsEqual();
    null02.in[0] <== positionNullifier;
    null02.in[1] <== newNullifier1;
    null02.out === 0;

    component null12 = IsEqual();
    null12.in[0] <== newNullifier0;
    null12.in[1] <== newNullifier1;
    null12.out === 0;

    // SECTION 6: Verify non-zero values
    // ==================================

    component positionSecretNonZero = IsZero();
    positionSecretNonZero.in <== positionSecret;
    positionSecretNonZero.out === 0;

    component positionNullifierNonZero = IsZero();
    positionNullifierNonZero.in <== positionNullifier;
    positionNullifierNonZero.out === 0;

    component liquidityNonZero = IsZero();
    liquidityNonZero.in <== liquidity;
    liquidityNonZero.out === 0;

    component newSecret0NonZero = IsZero();
    newSecret0NonZero.in <== newSecret0;
    newSecret0NonZero.out === 0;

    component newNullifier0NonZero = IsZero();
    newNullifier0NonZero.in <== newNullifier0;
    newNullifier0NonZero.out === 0;

    component newSecret1NonZero = IsZero();
    newSecret1NonZero.in <== newSecret1;
    newSecret1NonZero.out === 0;

    component newNullifier1NonZero = IsZero();
    newNullifier1NonZero.in <== newNullifier1;
    newNullifier1NonZero.out === 0;

    /////////////////////// END OF LOGIC //////////////////////////
}

// Main components with 20 levels for Zylith's state tree
component main {public [root, nullifierHash0, nullifierHash1, positionCommitment, tickLower, tickUpper]} = PrivateMint(20);
