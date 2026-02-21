use std::sync::Arc;

use axum::extract::State;
use axum::Json;

use crate::api::types::{WithdrawRequest, WithdrawResponse};
use crate::api::validation::{validate_address, validate_decimal, validate_secret};
use crate::error::AspError;
use crate::AppState;

pub async fn withdraw(
    State(state): State<Arc<AppState>>,
    Json(req): Json<WithdrawRequest>,
) -> Result<Json<WithdrawResponse>, AspError> {
    // Validate
    validate_secret(&req.secret, "secret")?;
    validate_secret(&req.nullifier, "nullifier")?;
    validate_decimal(&req.amount_low, "amount_low")?;
    validate_decimal(&req.amount_high, "amount_high")?;
    validate_address(&req.token, "token")?;
    validate_address(&req.recipient, "recipient")?;

    tracing::info!(leaf_index = req.leaf_index, "Processing withdrawal (membership proof)");

    // 1. Compute commitment to verify it exists at leaf_index
    let mut worker = state.worker.lock().await;
    let commitment_result = worker
        .compute_commitment(&req.secret, &req.nullifier, &req.amount_low, &req.amount_high, &req.token)
        .await?;

    // 2. Verify commitment exists in our tree
    let stored = state.db.get_commitment(req.leaf_index)?;
    match &stored {
        Some(row) if row.commitment == commitment_result.commitment => {}
        Some(row) => {
            return Err(AspError::InvalidInput(format!(
                "Commitment mismatch at leaf {}: expected {}, got {}",
                req.leaf_index, row.commitment, commitment_result.commitment
            )));
        }
        None => return Err(AspError::CommitmentNotFound(req.leaf_index)),
    }

    // 3. Check nullifier not already spent
    if state.db.is_nullifier_spent(&commitment_result.nullifier_hash)? {
        return Err(AspError::NullifierAlreadySpent(
            commitment_result.nullifier_hash.clone(),
        ));
    }

    // 4. Get Merkle proof
    let proof = worker.get_proof(req.leaf_index).await?;

    // 5. Build circuit inputs
    let inputs = serde_json::json!({
        "root": proof.root,
        "nullifierHash": commitment_result.nullifier_hash,
        "recipient": req.recipient,
        "amount_low": req.amount_low,
        "amount_high": req.amount_high,
        "token": req.token,
        "secret": req.secret,
        "nullifier": req.nullifier,
        "pathElements": proof.path_elements,
        "pathIndices": proof.path_indices,
    });

    // 6. Generate membership proof
    let proof_result = worker.generate_proof("membership", inputs).await?;
    drop(worker);

    // 7. Submit to pool.withdraw() (which internally calls coordinator.verify_membership)
    let tx_hash = if let Some(ref relayer) = state.relayer {
        let relayer = relayer.lock().await;
        relayer.verify_membership(&proof_result.calldata).await?
    } else {
        return Err(AspError::Internal("No relayer configured".into()));
    };

    // 8. Record nullifier as spent
    state.db.insert_nullifier(
        &commitment_result.nullifier_hash,
        "membership",
        Some(&tx_hash),
    )?;

    tracing::info!(
        tx_hash = %tx_hash,
        "Withdrawal confirmed"
    );

    Ok(Json(WithdrawResponse {
        status: "confirmed".to_string(),
        tx_hash,
        nullifier_hash: commitment_result.nullifier_hash,
    }))
}
