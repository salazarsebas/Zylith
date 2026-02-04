pragma circom 2.2.0;

include "../node_modules/circomlib/circuits/poseidon.circom";

/**
 * @title Poseidon Hash Wrapper
 * @dev Re-exports circomlib's Poseidon hash function for clean imports
 * @notice Poseidon is a STARK-friendly hash function optimized for ZK circuits
 *
 * Security Properties:
 * - Collision resistant
 * - Pre-image resistant
 * - Second pre-image resistant
 * - Designed specifically for arithmetic circuits
 * - Significantly fewer constraints than traditional hash functions
 *
 * Usage:
 *   component hasher = Poseidon(N);
 *   hasher.inputs[0] <== input0;
 *   hasher.inputs[1] <== input1;
 *   ...
 *   hasher.inputs[N-1] <== inputN;
 *   output <== hasher.out;
 */

// The Poseidon template is directly available from circomlib
// This file exists to provide a single import point and documentation
