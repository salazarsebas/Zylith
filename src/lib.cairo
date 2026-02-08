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
pub mod pool;
pub mod privacy;
pub mod types;
pub mod verifier;

#[cfg(test)]
pub mod tests;

// Re-export fee tier
pub use clmm::fees::FeeTier;

// Re-export CLMM types
pub use clmm::pool::{PoolKey, PoolState, TickInfo};
pub use clmm::positions::{Position, PositionKey};
pub use clmm::swap::{SwapResult, SwapState};
pub use interfaces::coordinator::IVerifierCoordinator;

// Re-export interfaces
pub use interfaces::erc20::IERC20;
pub use interfaces::pool::IZylithPool;
pub use interfaces::verifier::IGroth16VerifierBN254;

// Re-export verifier types
pub use verifier::{BurnPublicInputs, MembershipPublicInputs, MintPublicInputs, SwapPublicInputs};
