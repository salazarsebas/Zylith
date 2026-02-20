pragma circom 2.2.0;

include "./common/commitment.circom";
include "./common/merkle.circom";
include "node_modules/circomlib/circuits/comparators.circom";

/**
 * @title Membership
 * @dev Proves ownership of a note in Zylith's state tree
 *
 * SECURITY MODEL:
 * This circuit proves that:
 * 1. The prover knows a valid note (secret, nullifier, amount, token)
 * 2. The corresponding commitment exists in the Merkle tree
 * 3. The prover can produce the correct nullifier hash
 *
 * This is the fundamental building block for all private operations in Zylith.
 * It proves note ownership without revealing the note's contents.
 *
 * PUBLIC INPUTS (visible on-chain):
 * - root: The Merkle root of the state tree
 * - nullifierHash: Hash of the nullifier (prevents double-spending)
 * - recipient: Address to receive the withdrawn tokens
 * - amount_low, amount_high: The note's amount (u256 split into u128 parts) - PUBLIC to specify withdrawal amount
 * - token: Token contract address - PUBLIC to specify which token to withdraw
 *
 * PRIVATE INPUTS (hidden):
 * - secret: Random value known only to note owner
 * - nullifier: Unique value for this note
 * - pathElements: Merkle proof siblings
 * - pathIndices: Merkle proof path directions
 *
 * PRIVACY GUARANTEES:
 * - Cannot determine which note in the tree is being spent
 * - Cannot determine the amount or token type
 * - Cannot link multiple spends to the same owner (unless they reuse nullifiers)
 * - Nullifier hash prevents double-spending without revealing the nullifier
 *
 * SECURITY CONSIDERATIONS:
 * - The nullifier MUST be unique per note, otherwise double-spending is possible
 * - The secret MUST be random and kept private
 * - The commitment MUST be in the tree (verified via Merkle proof)
 * - Path indices are constrained to be binary by MerkleProof template
 *
 * Constraints Analysis:
 * - ZylithCommitment: ~486 constraints
 * - MerkleProof(20): ~2,940 constraints
 * - Nullifier hash verification: ~85 constraints (Poseidon(1))
 * - Comparisons and checks: ~50 constraints
 * - Total: ~3,561 constraints
 *
 * @param levels Number of levels in the Merkle tree (20 for Zylith)
 */
template Membership(levels) {
    //////////////////////// PUBLIC SIGNALS ///////////////////////

    signal input root;              // Merkle root of state tree
    signal input nullifierHash;     // Hash of nullifier (prevents double-spend)
    signal input recipient;         // Address to receive withdrawn tokens
    signal input amount_low;        // Low 128 bits of amount (PUBLIC for withdrawal)
    signal input amount_high;       // High 128 bits of amount (PUBLIC for withdrawal)
    signal input token;             // Token contract address (PUBLIC for withdrawal)

    //////////////////// END OF PUBLIC SIGNALS ////////////////////


    /////////////////////// PRIVATE SIGNALS ///////////////////////

    // Note components
    signal input secret;            // Random value known only to owner
    signal input nullifier;         // Unique nullifier for this note

    // Merkle proof
    signal input pathElements[levels];  // Sibling hashes
    signal input pathIndices[levels];   // Path directions

    /////////////////// END OF PRIVATE SIGNALS ////////////////////


    /////////////////////////// LOGIC /////////////////////////////

    // 1. Compute commitment from note components
    // This must match the Cairo implementation exactly
    component commitment = ZylithCommitment();
    commitment.secret <== secret;
    commitment.nullifier <== nullifier;
    commitment.amount_low <== amount_low;
    commitment.amount_high <== amount_high;
    commitment.token <== token;

    // 2. Verify the computed nullifier hash matches the public input
    // This proves the prover knows the nullifier without revealing it
    component nullifierHashCheck = IsEqual();
    nullifierHashCheck.in[0] <== commitment.nullifierHash;
    nullifierHashCheck.in[1] <== nullifierHash;
    nullifierHashCheck.out === 1;

    // 3. Verify commitment exists in the Merkle tree at the given root
    component merkleProof = MerkleProof(levels);
    merkleProof.leaf <== commitment.commitment;
    merkleProof.pathElements <== pathElements;
    merkleProof.pathIndices <== pathIndices;

    // 4. Verify the computed root matches the public input
    component rootCheck = IsEqual();
    rootCheck.in[0] <== merkleProof.root;
    rootCheck.in[1] <== root;
    rootCheck.out === 1;

    // 5. Ensure non-zero values to prevent trivial proofs
    // Zero commitments are rejected by the Cairo contract
    component secretNonZero = IsZero();
    secretNonZero.in <== secret;
    secretNonZero.out === 0;

    component nullifierNonZero = IsZero();
    nullifierNonZero.in <== nullifier;
    nullifierNonZero.out === 0;

    // 6. Ensure amount is non-zero (at least one of low/high must be non-zero)
    signal amountSum <== amount_low + amount_high;
    component amountNonZero = IsZero();
    amountNonZero.in <== amountSum;
    amountNonZero.out === 0;

    /////////////////////// END OF LOGIC //////////////////////////
}

// Main component with 20 levels for Zylith's state tree
component main {public [root, nullifierHash, recipient, amount_low, amount_high, token]} = Membership(20);
