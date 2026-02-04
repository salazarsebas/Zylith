pragma circom 2.2.0;

/**
 * @title Zylith Private Burn Circuit (Entry Point)
 * @dev Entry point for the PrivateBurn circuit for Garaga verifier generation
 *
 * This file separates PrivateBurn from liquidity.circom to enable:
 * - Independent trusted setup (Powers of Tau ceremony)
 * - Separate Garaga verifier generation
 * - Modular verification on Starknet
 *
 * PUBLIC INPUTS (6 signals):
 * - root: Merkle tree root
 * - positionNullifierHash: Nullifier hash for the LP position
 * - newCommitment0: Output note commitment for token0
 * - newCommitment1: Output note commitment for token1
 * - tickLower: Lower tick boundary (offset to unsigned)
 * - tickUpper: Upper tick boundary (offset to unsigned)
 *
 * CONSTRAINT COUNT: ~4,611
 */

include "./liquidity.circom";

// Main component with 20 levels for Zylith's state tree
// Public signals: root, positionNullifierHash, newCommitment0, newCommitment1, tickLower, tickUpper
component main {public [root, positionNullifierHash, newCommitment0, newCommitment1, tickLower, tickUpper]} = PrivateBurn(20);
