use num_bigint::BigUint;
use num_traits::Num;
use starknet::accounts::{Account, ConnectedAccount, ExecutionEncoding, SingleOwnerAccount};
use starknet::core::types::{BlockId, BlockTag, Call, Felt};
use starknet::providers::jsonrpc::HttpTransport;
use starknet::providers::JsonRpcClient;
use starknet::signers::{LocalWallet, SigningKey};

use crate::config::Config;
use crate::error::AspError;

pub struct StarknetRelayer {
    account: SingleOwnerAccount<JsonRpcClient<HttpTransport>, LocalWallet>,
    coordinator_address: Felt,
    pool_address: Felt,
}

impl StarknetRelayer {
    pub async fn new(config: &Config) -> Result<Self, AspError> {
        let provider = JsonRpcClient::new(HttpTransport::new(
            url::Url::parse(&config.rpc_url)
                .map_err(|e| AspError::Config(format!("Invalid RPC URL: {e}")))?,
        ));

        // Load keystore
        let keystore_content = std::fs::read_to_string(&config.keystore_path)
            .map_err(|e| AspError::Config(format!("Failed to read keystore: {e}")))?;
        let keystore: serde_json::Value = serde_json::from_str(&keystore_content)
            .map_err(|e| AspError::Config(format!("Invalid keystore JSON: {e}")))?;

        // Extract private key from keystore (starkli format)
        let private_key = decrypt_keystore(&keystore, &config.keystore_password)?;
        let signer = LocalWallet::from(SigningKey::from_secret_scalar(private_key));

        let admin_address = Felt::from_hex(&config.admin_address)
            .map_err(|e| AspError::Config(format!("Invalid admin address: {e}")))?;

        // Use Sepolia chain ID
        let chain_id = Felt::from_hex("0x534e5f5345504f4c4941")
            .map_err(|e| AspError::Config(format!("Invalid chain ID: {e}")))?;

        let mut account = SingleOwnerAccount::new(
            provider,
            signer,
            admin_address,
            chain_id,
            ExecutionEncoding::New,
        );
        account.set_block_id(BlockId::Tag(BlockTag::Latest));

        let coordinator_address = Felt::from_hex(&config.coordinator_address)
            .map_err(|e| AspError::Config(format!("Invalid coordinator address: {e}")))?;

        let pool_address = Felt::from_hex(&config.pool_address)
            .map_err(|e| AspError::Config(format!("Invalid pool address: {e}")))?;

        Ok(StarknetRelayer {
            account,
            coordinator_address,
            pool_address,
        })
    }

    /// Call coordinator.deposit(commitment: u256)
    pub async fn deposit(&self, commitment: &str) -> Result<String, AspError> {
        let (low, high) = u256_to_felts(commitment)?;

        let call = Call {
            to: self.coordinator_address,
            selector: starknet::core::utils::get_selector_from_name("deposit")
                .map_err(|e| AspError::Internal(format!("Selector error: {e}")))?,
            calldata: vec![low, high],
        };

        self.send_transaction(vec![call]).await
    }

    /// Call coordinator.submit_merkle_root(root: u256)
    pub async fn submit_merkle_root(&self, root: &str) -> Result<String, AspError> {
        let (low, high) = u256_to_felts(root)?;

        let call = Call {
            to: self.coordinator_address,
            selector: starknet::core::utils::get_selector_from_name("submit_merkle_root")
                .map_err(|e| AspError::Internal(format!("Selector error: {e}")))?,
            calldata: vec![low, high],
        };

        self.send_transaction(vec![call]).await
    }

    /// Call coordinator.verify_membership(full_proof_with_hints: Span<felt252>)
    pub async fn verify_membership(&self, calldata_hex: &[String]) -> Result<String, AspError> {
        let calldata = build_span_calldata(calldata_hex)?;

        let call = Call {
            to: self.coordinator_address,
            selector: starknet::core::utils::get_selector_from_name("verify_membership")
                .map_err(|e| AspError::Internal(format!("Selector error: {e}")))?,
            calldata,
        };

        self.send_transaction(vec![call]).await
    }

    /// Call pool.shielded_swap(pool_key, full_proof_with_hints, sqrt_price_limit)
    pub async fn shielded_swap(
        &self,
        pool_key: &PoolKeyParams,
        proof_calldata_hex: &[String],
        sqrt_price_limit: &str,
    ) -> Result<String, AspError> {
        let mut calldata = Vec::new();

        // PoolKey: token_0, token_1, fee, tick_spacing (4 felts)
        calldata.push(
            Felt::from_hex(&pool_key.token_0)
                .map_err(|e| AspError::InvalidInput(format!("Invalid token_0: {e}")))?,
        );
        calldata.push(
            Felt::from_hex(&pool_key.token_1)
                .map_err(|e| AspError::InvalidInput(format!("Invalid token_1: {e}")))?,
        );
        calldata.push(Felt::from(pool_key.fee));
        calldata.push(Felt::from(pool_key.tick_spacing));

        // Span<felt252>: length + elements
        let span = build_span_calldata(proof_calldata_hex)?;
        calldata.extend(span);

        // sqrt_price_limit: u256
        let (low, high) = u256_to_felts(sqrt_price_limit)?;
        calldata.push(low);
        calldata.push(high);

        let call = Call {
            to: self.pool_address,
            selector: starknet::core::utils::get_selector_from_name("shielded_swap")
                .map_err(|e| AspError::Internal(format!("Selector error: {e}")))?,
            calldata,
        };

        self.send_transaction(vec![call]).await
    }

    /// Call pool.shielded_mint(pool_key, full_proof_with_hints, liquidity)
    pub async fn shielded_mint(
        &self,
        pool_key: &PoolKeyParams,
        proof_calldata_hex: &[String],
        liquidity: u128,
    ) -> Result<String, AspError> {
        let mut calldata = Vec::new();

        calldata.push(
            Felt::from_hex(&pool_key.token_0)
                .map_err(|e| AspError::InvalidInput(format!("Invalid token_0: {e}")))?,
        );
        calldata.push(
            Felt::from_hex(&pool_key.token_1)
                .map_err(|e| AspError::InvalidInput(format!("Invalid token_1: {e}")))?,
        );
        calldata.push(Felt::from(pool_key.fee));
        calldata.push(Felt::from(pool_key.tick_spacing));

        let span = build_span_calldata(proof_calldata_hex)?;
        calldata.extend(span);

        calldata.push(Felt::from(liquidity));

        let call = Call {
            to: self.pool_address,
            selector: starknet::core::utils::get_selector_from_name("shielded_mint")
                .map_err(|e| AspError::Internal(format!("Selector error: {e}")))?,
            calldata,
        };

        self.send_transaction(vec![call]).await
    }

    /// Call pool.shielded_burn(pool_key, full_proof_with_hints, liquidity)
    pub async fn shielded_burn(
        &self,
        pool_key: &PoolKeyParams,
        proof_calldata_hex: &[String],
        liquidity: u128,
    ) -> Result<String, AspError> {
        let mut calldata = Vec::new();

        calldata.push(
            Felt::from_hex(&pool_key.token_0)
                .map_err(|e| AspError::InvalidInput(format!("Invalid token_0: {e}")))?,
        );
        calldata.push(
            Felt::from_hex(&pool_key.token_1)
                .map_err(|e| AspError::InvalidInput(format!("Invalid token_1: {e}")))?,
        );
        calldata.push(Felt::from(pool_key.fee));
        calldata.push(Felt::from(pool_key.tick_spacing));

        let span = build_span_calldata(proof_calldata_hex)?;
        calldata.extend(span);

        calldata.push(Felt::from(liquidity));

        let call = Call {
            to: self.pool_address,
            selector: starknet::core::utils::get_selector_from_name("shielded_burn")
                .map_err(|e| AspError::Internal(format!("Selector error: {e}")))?,
            calldata,
        };

        self.send_transaction(vec![call]).await
    }

    async fn send_transaction(&self, calls: Vec<Call>) -> Result<String, AspError> {
        let execution = self.account.execute_v3(calls);

        let result = execution
            .send()
            .await
            .map_err(|e| AspError::TransactionFailed(format!("{e}")))?;

        let tx_hash = format!("{:#x}", result.transaction_hash);
        tracing::info!(tx_hash = %tx_hash, "Transaction sent, waiting for confirmation...");

        // Wait for transaction receipt
        watch_tx(self.account.provider(), result.transaction_hash).await?;

        tracing::info!(tx_hash = %tx_hash, "Transaction confirmed");
        Ok(tx_hash)
    }

    pub fn coordinator_address(&self) -> &Felt {
        &self.coordinator_address
    }

    pub fn pool_address(&self) -> &Felt {
        &self.pool_address
    }

    pub fn provider(&self) -> &JsonRpcClient<HttpTransport> {
        self.account.provider()
    }
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct PoolKeyParams {
    pub token_0: String,
    pub token_1: String,
    pub fee: u64,
    pub tick_spacing: u64,
}

/// Convert a u256 (decimal or hex string) to two Felt values (low_128, high_128).
pub fn u256_to_felts(value: &str) -> Result<(Felt, Felt), AspError> {
    let big = if value.starts_with("0x") || value.starts_with("0X") {
        BigUint::from_str_radix(&value[2..], 16)
    } else {
        BigUint::from_str_radix(value, 10)
    }
    .map_err(|e| AspError::InvalidInput(format!("Invalid u256 value '{value}': {e}")))?;

    let mask = (BigUint::from(1u64) << 128) - BigUint::from(1u64);
    let low = &big & &mask;
    let high: BigUint = &big >> 128;

    let low_hex = format!("0x{}", low.to_str_radix(16));
    let high_hex = format!("0x{}", high.to_str_radix(16));

    let low_felt = Felt::from_hex(&low_hex)
        .map_err(|e| AspError::Internal(format!("u256 low conversion failed: {e}")))?;
    let high_felt = Felt::from_hex(&high_hex)
        .map_err(|e| AspError::Internal(format!("u256 high conversion failed: {e}")))?;

    Ok((low_felt, high_felt))
}

/// Build Span<felt252> calldata: [length, elem0, elem1, ...]
fn build_span_calldata(hex_values: &[String]) -> Result<Vec<Felt>, AspError> {
    let mut calldata = Vec::with_capacity(hex_values.len() + 1);
    calldata.push(Felt::from(hex_values.len()));

    for hex_val in hex_values {
        let felt = Felt::from_hex(hex_val)
            .map_err(|e| AspError::InvalidInput(format!("Invalid calldata hex '{hex_val}': {e}")))?;
        calldata.push(felt);
    }

    Ok(calldata)
}

/// Wait for transaction confirmation by polling.
async fn watch_tx(
    provider: &JsonRpcClient<HttpTransport>,
    tx_hash: Felt,
) -> Result<(), AspError> {
    use starknet::providers::Provider;

    let max_retries = 60;
    let delay = std::time::Duration::from_secs(2);

    for _ in 0..max_retries {
        match provider.get_transaction_receipt(tx_hash).await {
            Ok(receipt) => {
                use starknet::core::types::TransactionExecutionStatus;
                match receipt.receipt.execution_result().status() {
                    TransactionExecutionStatus::Succeeded => return Ok(()),
                    TransactionExecutionStatus::Reverted => {
                        return Err(AspError::TransactionReverted(format!(
                            "Transaction {:#x} reverted: {}",
                            tx_hash,
                            receipt
                                .receipt
                                .execution_result()
                                .revert_reason()
                                .unwrap_or("unknown reason")
                        )));
                    }
                }
            }
            Err(_) => {
                // Transaction not yet included, wait and retry
                tokio::time::sleep(delay).await;
            }
        }
    }

    Err(AspError::TransactionFailed(format!(
        "Transaction {:#x} not confirmed after {}s",
        tx_hash,
        max_retries * 2
    )))
}

/// Decrypt a starkli-format keystore to get the private key.
/// starkli stores keys as encrypted JSON keystores.
fn decrypt_keystore(
    _keystore: &serde_json::Value,
    _password: &str,
) -> Result<Felt, AspError> {
    // TODO: Implement proper keystore decryption.
    // For now, support a simple format where the private key is in env var directly.
    // In production, use starknet-rs keystore decryption.
    let pk = std::env::var("ADMIN_PRIVATE_KEY")
        .map_err(|_| AspError::Config("ADMIN_PRIVATE_KEY env var required (keystore decryption not yet implemented)".into()))?;
    Felt::from_hex(&pk)
        .map_err(|e| AspError::Config(format!("Invalid private key: {e}")))
}
