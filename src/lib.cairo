pub mod clmm;
pub mod interfaces;
pub mod privacy;
/// Zylith - Shielded AMM for Bitcoin on Starknet
/// CLMM (Concentrated Liquidity Market Maker) implementation
/// Inspired by Ekubo Protocol and Uniswap v3

pub mod types;
pub use clmm::fees::FeeTier;

// Re-export commonly used types
pub use clmm::pool::{PoolKey, PoolState, TickInfo};
pub use clmm::positions::{Position, PositionKey};
pub use clmm::swap::{SwapResult, SwapState};
pub use interfaces::erc20::IERC20;

// Re-export interfaces
pub use interfaces::pool::IZylithPool;
