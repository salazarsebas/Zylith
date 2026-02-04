pragma circom 2.2.0;

include "./common/commitment.circom";
include "./common/merkle.circom";
include "node_modules/circomlib/circuits/comparators.circom";
include "node_modules/circomlib/circuits/bitify.circom";

/**
 * @title PrivateSwap
 * @dev Proves a valid private swap operation in Zylith CLMM
 *
 * SECURITY MODEL:
 * This circuit proves that:
 * 1. The prover owns an input note (verified via Merkle proof)
 * 2. The swap amount does not exceed the input note balance
 * 3. The output amount meets minimum slippage requirements
 * 4. Change is correctly calculated and committed
 * 5. All nullifiers are unique (prevents note reuse)
 *
 * SWAP FLOW:
 * Input: note with tokenIn, balance X
 * Swap: amountIn of tokenIn -> amountOut of tokenOut
 * Outputs:
 *   - Output note: tokenOut, amountOut
 *   - Change note: tokenIn, (X - amountIn)
 *
 * PUBLIC INPUTS (visible on-chain):
 * - root: Merkle root (proves input note exists)
 * - nullifierHash: Prevents double-spending input note
 * - newCommitment: Output note commitment
 * - tokenIn, tokenOut: Token addresses for routing
 * - amountIn: Swap amount (needed for pool interaction)
 * - amountOutMin: Slippage protection
 *
 * PRIVATE INPUTS (hidden):
 * - Input note: secret, nullifier, balance, Merkle proof
 * - Output note: newSecret, newNullifier, amountOut
 * - Change note: changeSecret, changeNullifier
 *
 * PRIVACY GUARANTEES:
 * - Input note balance is hidden
 * - Output amount is hidden (only minimum is public)
 * - Owner identity is hidden (secret/nullifier pattern)
 * - Cannot link input and output notes
 *
 * SECURITY CONSIDERATIONS:
 * - Amount calculations must not overflow field modulus
 * - All nullifiers must be distinct to prevent note reuse
 * - Change commitment must be correctly formed
 * - Range checks prevent negative amounts
 * - Token addresses must match swap direction
 *
 * Constraints Analysis:
 * - Input commitment: ~486 constraints
 * - Output commitment: ~486 constraints
 * - Change commitment: ~486 constraints
 * - Merkle proof: ~2,940 constraints
 * - Amount checks: ~400 constraints (range checks)
 * - Comparisons: ~150 constraints
 * - Total: ~4,948 constraints
 *
 * @param levels Number of levels in the Merkle tree (20 for Zylith)
 */
template PrivateSwap(levels) {
    //////////////////////// PUBLIC SIGNALS ///////////////////////

    signal input root;              // State tree Merkle root
    signal input nullifierHash;     // Nullifier of input note
    signal input newCommitment;     // Output note commitment
    signal input tokenIn;           // Input token address
    signal input tokenOut;          // Output token address
    signal input amountIn;          // Swap input amount (public for routing)
    signal input amountOutMin;      // Minimum output (slippage protection)

    //////////////////// END OF PUBLIC SIGNALS ////////////////////


    ///////////////// PRIVATE SIGNALS - INPUT NOTE ////////////////

    signal input secret;            // Input note secret
    signal input nullifier;         // Input note nullifier
    signal input balance_low;       // Input note balance (low 128 bits)
    signal input balance_high;      // Input note balance (high 128 bits)
    signal input pathElements[levels];  // Merkle proof siblings
    signal input pathIndices[levels];   // Merkle proof path

    ///////////// END OF PRIVATE SIGNALS - INPUT NOTE /////////////


    //////////////// PRIVATE SIGNALS - OUTPUT NOTE ////////////////

    signal input newSecret;         // Output note secret
    signal input newNullifier;      // Output note nullifier
    signal input amountOut_low;     // Actual output amount (low 128 bits)
    signal input amountOut_high;    // Actual output amount (high 128 bits)

    //////////// END OF PRIVATE SIGNALS - OUTPUT NOTE /////////////


    //////////////// PRIVATE SIGNALS - CHANGE NOTE ////////////////

    signal input changeSecret;      // Change note secret
    signal input changeNullifier;   // Change note nullifier

    //////////// END OF PRIVATE SIGNALS - CHANGE NOTE /////////////


    /////////////////////// OUTPUT SIGNALS ////////////////////////

    signal output changeCommitment; // Change note commitment

    //////////////////// END OF OUTPUT SIGNALS ////////////////////


    /////////////////////////// LOGIC /////////////////////////////

    // SECTION 1: Verify input note ownership
    // ========================================

    // 1.1: Compute input note commitment
    component inputCommitment = ZylithCommitment();
    inputCommitment.secret <== secret;
    inputCommitment.nullifier <== nullifier;
    inputCommitment.amount_low <== balance_low;
    inputCommitment.amount_high <== balance_high;
    inputCommitment.token <== tokenIn;

    // 1.2: Verify nullifier hash matches public input
    component nullifierCheck = IsEqual();
    nullifierCheck.in[0] <== inputCommitment.nullifierHash;
    nullifierCheck.in[1] <== nullifierHash;
    nullifierCheck.out === 1;

    // 1.3: Verify commitment exists in Merkle tree
    component merkleProof = MerkleProof(levels);
    merkleProof.leaf <== inputCommitment.commitment;
    merkleProof.pathElements <== pathElements;
    merkleProof.pathIndices <== pathIndices;

    component rootCheck = IsEqual();
    rootCheck.in[0] <== merkleProof.root;
    rootCheck.in[1] <== root;
    rootCheck.out === 1;

    // SECTION 2: Verify amount constraints
    // =====================================

    // 2.1: Reconstruct full balance (u256)
    // balance = balance_low + balance_high * 2^128
    // For field arithmetic, we verify the split is correct
    component balanceLowBits = Num2Bits(128);
    balanceLowBits.in <== balance_low;

    component balanceHighBits = Num2Bits(128);
    balanceHighBits.in <== balance_high;

    // 2.2: Verify amountIn <= balance
    // We need to compare: amountIn <= balance_low + balance_high * 2^128
    // Simplified: verify amountIn fits in available balance
    component amountInBits = Num2Bits(128);
    amountInBits.in <== amountIn;

    // If balance_high > 0, amountIn definitely fits
    // If balance_high == 0, check amountIn <= balance_low
    component balanceHighZero = IsZero();
    balanceHighZero.in <== balance_high;

    component amountFits = LessEqThan(128);
    amountFits.in[0] <== amountIn;
    amountFits.in[1] <== balance_low;

    // Either balance_high > 0 OR amountIn <= balance_low
    signal amountValid <== 1 - balanceHighZero.out + balanceHighZero.out * amountFits.out;
    amountValid === 1;

    // 2.3: Calculate change amount
    // change = balance - amountIn
    signal change_low <== balance_low - amountIn;

    // Range check change is valid
    component changeLowBits = Num2Bits(128);
    changeLowBits.in <== change_low;

    // 2.4: Verify output amount >= minimum
    // amountOut = amountOut_low + amountOut_high * 2^128
    component amountOutLowBits = Num2Bits(128);
    amountOutLowBits.in <== amountOut_low;

    component amountOutHighBits = Num2Bits(128);
    amountOutHighBits.in <== amountOut_high;

    // If amountOut_high > 0, automatically >= amountOutMin
    // If amountOut_high == 0, check amountOut_low >= amountOutMin
    component amountOutHighZero = IsZero();
    amountOutHighZero.in <== amountOut_high;

    component amountOutMinBits = Num2Bits(128);
    amountOutMinBits.in <== amountOutMin;

    component slippageCheck = GreaterEqThan(128);
    slippageCheck.in[0] <== amountOut_low;
    slippageCheck.in[1] <== amountOutMin;

    signal slippageValid <== 1 - amountOutHighZero.out + amountOutHighZero.out * slippageCheck.out;
    slippageValid === 1;

    // SECTION 3: Verify output note commitment
    // =========================================

    // 3.1: Compute output note commitment
    component outputCommitment = ZylithCommitment();
    outputCommitment.secret <== newSecret;
    outputCommitment.nullifier <== newNullifier;
    outputCommitment.amount_low <== amountOut_low;
    outputCommitment.amount_high <== amountOut_high;
    outputCommitment.token <== tokenOut;

    // 3.2: Verify output commitment matches public input
    component outputCheck = IsEqual();
    outputCheck.in[0] <== outputCommitment.commitment;
    outputCheck.in[1] <== newCommitment;
    outputCheck.out === 1;

    // SECTION 4: Compute change note commitment
    // ==========================================

    // 4.1: Compute change commitment
    component changeCommit = ZylithCommitment();
    changeCommit.secret <== changeSecret;
    changeCommit.nullifier <== changeNullifier;
    changeCommit.amount_low <== change_low;
    changeCommit.amount_high <== balance_high; // High bits unchanged
    changeCommit.token <== tokenIn;

    changeCommitment <== changeCommit.commitment;

    // SECTION 5: Verify nullifier uniqueness
    // =======================================

    // 5.1: Ensure input nullifier != output nullifier
    component nullifier1Check = IsEqual();
    nullifier1Check.in[0] <== nullifier;
    nullifier1Check.in[1] <== newNullifier;
    nullifier1Check.out === 0;

    // 5.2: Ensure input nullifier != change nullifier
    component nullifier2Check = IsEqual();
    nullifier2Check.in[0] <== nullifier;
    nullifier2Check.in[1] <== changeNullifier;
    nullifier2Check.out === 0;

    // 5.3: Ensure output nullifier != change nullifier
    component nullifier3Check = IsEqual();
    nullifier3Check.in[0] <== newNullifier;
    nullifier3Check.in[1] <== changeNullifier;
    nullifier3Check.out === 0;

    // SECTION 6: Verify non-zero values
    // ==================================

    component secretNonZero = IsZero();
    secretNonZero.in <== secret;
    secretNonZero.out === 0;

    component nullifierNonZero = IsZero();
    nullifierNonZero.in <== nullifier;
    nullifierNonZero.out === 0;

    component newSecretNonZero = IsZero();
    newSecretNonZero.in <== newSecret;
    newSecretNonZero.out === 0;

    component newNullifierNonZero = IsZero();
    newNullifierNonZero.in <== newNullifier;
    newNullifierNonZero.out === 0;

    component changeSecretNonZero = IsZero();
    changeSecretNonZero.in <== changeSecret;
    changeSecretNonZero.out === 0;

    component changeNullifierNonZero = IsZero();
    changeNullifierNonZero.in <== changeNullifier;
    changeNullifierNonZero.out === 0;

    // Verify tokens are different
    component tokensCheck = IsEqual();
    tokensCheck.in[0] <== tokenIn;
    tokensCheck.in[1] <== tokenOut;
    tokensCheck.out === 0;

    /////////////////////// END OF LOGIC //////////////////////////
}

// Main component with 20 levels for Zylith's state tree
component main {public [root, nullifierHash, newCommitment, tokenIn, tokenOut, amountIn, amountOutMin]} = PrivateSwap(20);
