/// Zylith - Shielded AMM for Bitcoin on Starknet
/// CLMM (Concentrated Liquidity Market Maker) implementation
/// Inspired by Ekubo Protocol and Uniswap v3
///
/// ## Modules
///
/// - `clmm`: Concentrated Liquidity Market Maker engine
/// - `privacy`: Privacy layer (commitments, nullifiers, Merkle tree)
/// - `verifier`: Groth16 proof verification with Garaga
/// - `interfaces`: Contract interfaces
/// - `types`: Common types (i256, etc.)

pub mod clmm;
pub mod interfaces;
pub mod privacy;
pub mod verifier;
pub mod types;

// Re-export fee tier
pub use clmm::fees::FeeTier;

// Re-export CLMM types
pub use clmm::pool::{PoolKey, PoolState, TickInfo};
pub use clmm::positions::{Position, PositionKey};
pub use clmm::swap::{SwapResult, SwapState};

// Re-export interfaces
pub use interfaces::erc20::IERC20;
pub use interfaces::pool::IZylithPool;
pub use interfaces::verifier::IVerifier;
pub use interfaces::coordinator::IVerifierCoordinator;

// Re-export verifier types
pub use verifier::{
    G1Point, G2Point, Groth16Proof, VerificationResult,
    MembershipPublicInputs, SwapPublicInputs, MintPublicInputs, BurnPublicInputs,
};
