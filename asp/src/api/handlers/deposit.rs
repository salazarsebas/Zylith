use std::sync::Arc;

use axum::extract::State;
use axum::Json;

use crate::api::types::{DepositRequest, DepositResponse};
use crate::error::AspError;
use crate::AppState;

pub async fn deposit(
    State(state): State<Arc<AppState>>,
    Json(req): Json<DepositRequest>,
) -> Result<Json<DepositResponse>, AspError> {
    // Validate commitment format
    if req.commitment.is_empty() {
        return Err(AspError::InvalidInput("commitment is required".into()));
    }

    tracing::info!(commitment = %req.commitment, "Processing deposit");

    // 1. Submit deposit to coordinator on-chain
    let relayer = state.relayer.lock().await;
    let deposit_tx = relayer.deposit(&req.commitment).await?;
    drop(relayer);

    // 2. Insert leaf into local Merkle tree via worker
    let mut worker = state.worker.lock().await;
    let root = worker.insert_leaf(&commitment_to_decimal(&req.commitment)?).await?;
    drop(worker);

    // 3. Get current leaf count
    let leaf_index = state.db.get_leaf_count()?;

    // 4. Store commitment in DB (leaf_index is 0-based, count is next index)
    let db_leaf_index = if leaf_index > 0 { leaf_index - 1 } else { 0 };
    state.db.insert_commitment(
        db_leaf_index,
        &commitment_to_decimal(&req.commitment)?,
        Some(&deposit_tx),
    )?;

    // 5. Submit new Merkle root to coordinator
    let relayer = state.relayer.lock().await;
    let root_tx = relayer.submit_merkle_root(&root).await?;
    drop(relayer);

    // 6. Store root in DB
    state.db.insert_root(&root, leaf_index, Some(&root_tx))?;

    tracing::info!(
        leaf_index = db_leaf_index,
        root = %root,
        deposit_tx = %deposit_tx,
        root_tx = %root_tx,
        "Deposit confirmed"
    );

    Ok(Json(DepositResponse {
        status: "confirmed".to_string(),
        leaf_index: db_leaf_index,
        tx_hash: deposit_tx,
        root: decimal_to_hex(&root),
        root_tx_hash: root_tx,
    }))
}

/// Convert a hex commitment (0x...) to decimal string for the Node.js worker.
fn commitment_to_decimal(hex: &str) -> Result<String, AspError> {
    use num_bigint::BigUint;
    use num_traits::Num;

    let stripped = hex.strip_prefix("0x").or_else(|| hex.strip_prefix("0X")).unwrap_or(hex);
    let big = BigUint::from_str_radix(stripped, 16)
        .map_err(|e| AspError::InvalidInput(format!("Invalid hex commitment: {e}")))?;
    Ok(big.to_str_radix(10))
}

/// Convert a decimal string to hex (0x...) for API responses.
fn decimal_to_hex(dec: &str) -> String {
    use num_bigint::BigUint;
    use num_traits::Num;

    match BigUint::from_str_radix(dec, 10) {
        Ok(big) => format!("0x{}", big.to_str_radix(16)),
        Err(_) => dec.to_string(),
    }
}
