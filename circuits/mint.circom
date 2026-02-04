pragma circom 2.2.0;

/**
 * @title Zylith Private Mint Circuit (Entry Point)
 * @dev Entry point for the PrivateMint circuit for Garaga verifier generation
 *
 * This file separates PrivateMint from liquidity.circom to enable:
 * - Independent trusted setup (Powers of Tau ceremony)
 * - Separate Garaga verifier generation
 * - Modular verification on Starknet
 *
 * PUBLIC INPUTS (6 signals):
 * - root: Merkle tree root
 * - nullifierHash0: Nullifier hash for token0 input note
 * - nullifierHash1: Nullifier hash for token1 input note
 * - positionCommitment: LP position commitment
 * - tickLower: Lower tick boundary (offset to unsigned)
 * - tickUpper: Upper tick boundary (offset to unsigned)
 *
 * PUBLIC OUTPUTS (2 signals):
 * - changeCommitment0: Change note commitment for token0
 * - changeCommitment1: Change note commitment for token1
 *
 * CONSTRAINT COUNT: ~8,723
 */

include "./liquidity.circom";

// Main component with 20 levels for Zylith's state tree
// Public signals: root, nullifierHash0, nullifierHash1, positionCommitment, tickLower, tickUpper
component main {public [root, nullifierHash0, nullifierHash1, positionCommitment, tickLower, tickUpper]} = PrivateMint(20);
