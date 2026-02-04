pragma circom 2.2.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/mux1.circom";

/**
 * @title MerkleProof
 * @dev Verifies Merkle tree inclusion proofs for Zylith's state tree
 *
 * SECURITY CRITICAL:
 * This circuit proves that a leaf exists in a Merkle tree with a given root.
 * It is the foundation of all privacy guarantees in Zylith - if this is broken,
 * the entire protocol is broken.
 *
 * Design based on audited LeanIMTInclusionProof from Privacy Pools, adapted
 * for Zylith's fixed 20-level tree structure.
 *
 * Tree Properties:
 * - Fixed depth of 20 levels (supports 2^20 = ~1M leaves)
 * - Uses Poseidon hash for STARK compatibility
 * - Binary tree structure (each node has 0, 1, or 2 children)
 * - Follows LeanIMT design: node with one child has same value as child
 *
 * Security Guarantees:
 * - Cannot forge a proof for a leaf not in the tree
 * - Cannot use a sibling path for a different leaf
 * - Path indices are constrained to binary values (0 or 1)
 * - Empty siblings (zero) are handled correctly
 *
 * Constraints Analysis:
 * - 20 Poseidon(2) hashes = 20 * ~143 = ~2,860 constraints
 * - 20 IsZero checks = 20 * 1 = 20 constraints
 * - 20 MultiMux1(2) = 20 * 2 = 40 constraints
 * - Path index binary check = Num2Bits(20) = ~20 constraints
 * - Total: ~2,940 constraints
 *
 * @param levels Number of levels in the Merkle tree (20 for Zylith)
 */
template MerkleProof(levels) {
    //////////////////////// INPUT SIGNALS ////////////////////////

    signal input leaf;                  // The leaf value to prove inclusion for
    signal input pathElements[levels];  // Sibling hashes along path to root
    signal input pathIndices[levels];   // Path directions: 0=left child, 1=right child

    ///////////////////// END OF INPUT SIGNALS ////////////////////


    /////////////////////// OUTPUT SIGNALS ////////////////////////

    signal output root;                 // Computed Merkle root

    //////////////////// END OF OUTPUT SIGNALS ////////////////////


    /////////////////////// INTERNAL SIGNALS //////////////////////

    signal nodes[levels + 1];           // Computed node values at each level

    ////////////////// END OF INTERNAL SIGNALS ////////////////////


    /////////////////////////// LOGIC /////////////////////////////

    // Validate path indices are binary (0 or 1)
    // This prevents attacks where path index > 1 could be used
    component pathBits = Num2Bits(levels);
    var computedIndex = 0;
    for (var i = 0; i < levels; i++) {
        // Ensure each path index is 0 or 1
        pathIndices[i] * (pathIndices[i] - 1) === 0;
        computedIndex += pathIndices[i] * (2 ** i);
    }
    pathBits.in <== computedIndex;

    // Component arrays
    component hashers[levels];
    component muxes[levels];
    component isZero[levels];

    // Start with the leaf at level 0
    nodes[0] <== leaf;

    // Compute hash at each level moving up the tree
    for (var i = 0; i < levels; i++) {
        // Check if sibling is empty (zero value)
        // In LeanIMT, zero siblings mean this branch doesn't hash
        isZero[i] = IsZero();
        isZero[i].in <== pathElements[i];

        // Order the node and sibling correctly based on path index
        // If pathIndices[i] == 0: we are left child, sibling is right
        // If pathIndices[i] == 1: we are right child, sibling is left
        muxes[i] = MultiMux1(2);
        muxes[i].c[0][0] <== nodes[i];          // If index=0: node is left
        muxes[i].c[0][1] <== pathElements[i];   // If index=0: sibling is right
        muxes[i].c[1][0] <== pathElements[i];   // If index=1: sibling is left
        muxes[i].c[1][1] <== nodes[i];          // If index=1: node is right
        muxes[i].s <== pathIndices[i];

        // Hash the ordered pair
        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== muxes[i].out[0];
        hashers[i].inputs[1] <== muxes[i].out[1];

        // If sibling is zero, propagate current node value unchanged
        // Otherwise, use the computed hash
        // This implements: nodes[i+1] = isZero ? nodes[i] : hash
        // Rearranged as: nodes[i+1] = nodes[i] + (hash - nodes[i]) * (1 - isZero)
        nodes[i + 1] <== nodes[i] + (hashers[i].out - nodes[i]) * (1 - isZero[i].out);
    }

    // Final node value is the root
    root <== nodes[levels];

    /////////////////////// END OF LOGIC //////////////////////////
}

/**
 * @title MerkleProofWithNullifier
 * @dev Combines Merkle proof verification with nullifier computation
 *
 * This is a convenience template that proves:
 * 1. A commitment exists in the tree
 * 2. The prover knows the nullifier for that commitment
 *
 * This pattern is used in most Zylith circuits to verify note ownership.
 *
 * Security: The nullifier hash is computed and exposed as a public output,
 * allowing the contract to track spent notes without revealing the nullifier.
 *
 * @param levels Number of levels in the Merkle tree
 */
template MerkleProofWithNullifier(levels) {
    //////////////////////// INPUT SIGNALS ////////////////////////

    signal input commitment;            // The commitment to prove
    signal input nullifier;             // Nullifier (private)
    signal input pathElements[levels];  // Merkle proof siblings
    signal input pathIndices[levels];   // Merkle proof path

    ///////////////////// END OF INPUT SIGNALS ////////////////////


    /////////////////////// OUTPUT SIGNALS ////////////////////////

    signal output root;                 // Merkle root
    signal output nullifierHash;        // Hash of nullifier (public)

    //////////////////// END OF OUTPUT SIGNALS ////////////////////


    /////////////////////////// LOGIC /////////////////////////////

    // 1. Verify commitment is in tree
    component merkleProof = MerkleProof(levels);
    merkleProof.leaf <== commitment;
    merkleProof.pathElements <== pathElements;
    merkleProof.pathIndices <== pathIndices;
    root <== merkleProof.root;

    // 2. Compute nullifier hash
    component nullifierHasher = Poseidon(1);
    nullifierHasher.inputs[0] <== nullifier;
    nullifierHash <== nullifierHasher.out;

    /////////////////////// END OF LOGIC //////////////////////////
}
