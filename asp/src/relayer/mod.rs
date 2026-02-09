mod starknet;

pub use self::starknet::PoolKeyParams;
pub use self::starknet::StarknetRelayer;

use crate::error::AspError;

/// Trait abstracting Starknet transaction submission.
/// Implemented by `StarknetRelayer` for production and `MockRelayer` for tests.
#[async_trait::async_trait]
pub trait Relayer: Send + Sync {
    async fn deposit(&self, commitment: &str) -> Result<String, AspError>;
    async fn submit_merkle_root(&self, root: &str) -> Result<String, AspError>;
    async fn verify_membership(&self, calldata: &[String]) -> Result<String, AspError>;
    async fn shielded_swap(
        &self,
        pool_key: &PoolKeyParams,
        calldata: &[String],
        sqrt_price_limit: &str,
    ) -> Result<String, AspError>;
    async fn shielded_mint(
        &self,
        pool_key: &PoolKeyParams,
        calldata: &[String],
        liquidity: u128,
    ) -> Result<String, AspError>;
    async fn shielded_burn(
        &self,
        pool_key: &PoolKeyParams,
        calldata: &[String],
        liquidity: u128,
    ) -> Result<String, AspError>;
}
