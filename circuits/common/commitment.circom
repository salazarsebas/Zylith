pragma circom 2.2.0;

include "../node_modules/circomlib/circuits/poseidon.circom";

/**
 * @title ZylithCommitment
 * @dev Generates Zylith-specific commitment hashes compatible with Cairo implementation
 *
 * CRITICAL COMPATIBILITY NOTE:
 * This circuit MUST produce identical outputs to the Cairo implementation in
 * src/privacy/commitment.cairo. The hash structure is:
 *
 *   innerHash = Poseidon(secret, nullifier)
 *   commitment = Poseidon(innerHash, amount_low, amount_high, token)
 *   nullifierHash = Poseidon(nullifier)
 *
 * Security Model:
 * - The commitment binds together all components: owner identity (via secret/nullifier),
 *   amount, and token type
 * - The nullifier hash allows spending without revealing the nullifier itself
 * - The inner hash construction provides additional security through nested hashing
 *
 * Privacy Guarantees:
 * - Given a commitment, cannot determine: secret, nullifier, amount, or token
 * - Given a nullifier hash, cannot determine the nullifier
 * - Only the owner who knows (secret, nullifier) can spend the note
 *
 * Constraints Analysis:
 * - 3 Poseidon hash operations
 * - Poseidon(2) ≈ 143 constraints
 * - Poseidon(1) ≈ 85 constraints
 * - Poseidon(4) ≈ 258 constraints
 * - Total: ~486 constraints
 */
template ZylithCommitment() {
    //////////////////////// INPUT SIGNALS ////////////////////////

    signal input secret;        // Random value known only to note owner (felt252)
    signal input nullifier;     // Unique value for double-spend prevention (felt252)
    signal input amount_low;    // Low 128 bits of amount (u128 as felt252)
    signal input amount_high;   // High 128 bits of amount (u128 as felt252)
    signal input token;         // Token contract address (felt252)

    ///////////////////// END OF INPUT SIGNALS ////////////////////


    /////////////////////// OUTPUT SIGNALS ////////////////////////

    signal output commitment;       // Full commitment hash
    signal output nullifierHash;    // Hash of nullifier for spending
    signal output innerHash;        // Intermediate hash (useful for debugging)

    //////////////////// END OF OUTPUT SIGNALS ////////////////////


    /////////////////////////// LOGIC /////////////////////////////

    // 1. Compute inner hash: Poseidon(secret, nullifier)
    // This binds the owner's identity to the note
    component innerHasher = Poseidon(2);
    innerHasher.inputs[0] <== secret;
    innerHasher.inputs[1] <== nullifier;
    innerHash <== innerHasher.out;

    // 2. Compute nullifier hash: Poseidon(nullifier)
    // This is revealed during spending to prevent double-spends
    // We hash the nullifier so the actual nullifier remains secret
    component nullifierHasher = Poseidon(1);
    nullifierHasher.inputs[0] <== nullifier;
    nullifierHash <== nullifierHasher.out;

    // 3. Compute full commitment: Poseidon(innerHash, amount_low, amount_high, token)
    // This binds the amount and token type to the commitment
    // We split amount into low/high to handle u256 values
    component commitmentHasher = Poseidon(4);
    commitmentHasher.inputs[0] <== innerHash;
    commitmentHasher.inputs[1] <== amount_low;
    commitmentHasher.inputs[2] <== amount_high;
    commitmentHasher.inputs[3] <== token;
    commitment <== commitmentHasher.out;

    /////////////////////// END OF LOGIC //////////////////////////
}

/**
 * @title ZylithPositionCommitment
 * @dev Generates commitment hashes for liquidity positions
 *
 * Position commitments bind together:
 * - Owner identity (secret, nullifier)
 * - Tick range (tickLower, tickUpper)
 * - Liquidity amount
 *
 * The tick values are offset by +887272 to convert from signed to unsigned range,
 * as ticks in Uniswap v3 style pools range from -887272 to 887272.
 *
 * Constraints Analysis:
 * - 2 Poseidon hash operations
 * - Poseidon(1) ≈ 85 constraints
 * - Poseidon(5) ≈ 314 constraints
 * - Total: ~399 constraints
 */
template ZylithPositionCommitment() {
    //////////////////////// INPUT SIGNALS ////////////////////////

    signal input secret;        // Random value known only to position owner
    signal input nullifier;     // Unique value for double-spend prevention
    signal input tickLower;     // Lower tick of the position (offset by +887272)
    signal input tickUpper;     // Upper tick of the position (offset by +887272)
    signal input liquidity;     // Amount of liquidity in the position

    ///////////////////// END OF INPUT SIGNALS ////////////////////


    /////////////////////// OUTPUT SIGNALS ////////////////////////

    signal output commitment;       // Position commitment hash
    signal output nullifierHash;    // Hash of nullifier for burning

    //////////////////// END OF OUTPUT SIGNALS ////////////////////


    /////////////////////////// LOGIC /////////////////////////////

    // 1. Compute nullifier hash
    component nullifierHasher = Poseidon(1);
    nullifierHasher.inputs[0] <== nullifier;
    nullifierHash <== nullifierHasher.out;

    // 2. Compute position commitment
    // Note: tickLower and tickUpper should already be offset to positive range
    component commitmentHasher = Poseidon(5);
    commitmentHasher.inputs[0] <== secret;
    commitmentHasher.inputs[1] <== nullifier;
    commitmentHasher.inputs[2] <== tickLower;
    commitmentHasher.inputs[3] <== tickUpper;
    commitmentHasher.inputs[4] <== liquidity;
    commitment <== commitmentHasher.out;

    /////////////////////// END OF LOGIC //////////////////////////
}
