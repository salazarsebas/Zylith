use std::sync::Arc;

use axum::extract::State;
use axum::Json;

use crate::api::types::{DepositRequest, DepositResponse};
use crate::api::validation::validate_hex_u256;
use crate::error::AspError;
use crate::AppState;

pub async fn deposit(
    State(state): State<Arc<AppState>>,
    Json(req): Json<DepositRequest>,
) -> Result<Json<DepositResponse>, AspError> {
    validate_hex_u256(&req.commitment, "commitment")?;

    tracing::info!("Processing deposit");

    let commitment_decimal = hex_to_decimal(&req.commitment)?;

    // 1. Get next leaf index BEFORE insert (= current count)
    let leaf_index = state.db.get_leaf_count()?;

    // 2. Submit deposit to coordinator on-chain
    let relayer = state.relayer.lock().await;
    let deposit_tx = relayer.deposit(&req.commitment).await?;
    drop(relayer);

    // 3. Insert leaf into local Merkle tree via worker
    let mut worker = state.worker.lock().await;
    let root = worker.insert_leaf(&commitment_decimal).await?;
    drop(worker);

    // 4. Store commitment in DB
    state
        .db
        .insert_commitment(leaf_index, &commitment_decimal, Some(&deposit_tx))?;

    // 5. Submit new Merkle root to coordinator
    let relayer = state.relayer.lock().await;
    let root_tx = relayer.submit_merkle_root(&root).await?;
    drop(relayer);

    // 6. Store root in DB
    let new_count = leaf_index + 1;
    state.db.insert_root(&root, new_count, Some(&root_tx))?;

    tracing::info!(
        leaf_index = leaf_index,
        deposit_tx = %deposit_tx,
        root_tx = %root_tx,
        "Deposit confirmed"
    );

    Ok(Json(DepositResponse {
        status: "confirmed".to_string(),
        leaf_index,
        tx_hash: deposit_tx,
        root: decimal_to_hex(&root),
        root_tx_hash: root_tx,
    }))
}

/// Convert a hex string (0x...) to decimal string for the worker.
pub fn hex_to_decimal(hex: &str) -> Result<String, AspError> {
    use num_bigint::BigUint;
    use num_traits::Num;

    let stripped = hex
        .strip_prefix("0x")
        .or_else(|| hex.strip_prefix("0X"))
        .unwrap_or(hex);
    let big = BigUint::from_str_radix(stripped, 16)
        .map_err(|e| AspError::InvalidInput(format!("Invalid hex value: {e}")))?;
    Ok(big.to_str_radix(10))
}

/// Convert a decimal string to hex (0x...) for API responses.
pub fn decimal_to_hex(dec: &str) -> String {
    use num_bigint::BigUint;
    use num_traits::Num;

    match BigUint::from_str_radix(dec, 10) {
        Ok(big) => format!("0x{}", big.to_str_radix(16)),
        Err(_) => dec.to_string(),
    }
}
