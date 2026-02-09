use std::sync::Arc;

use axum::extract::State;
use axum::Json;

use crate::api::types::{SwapRequest, SwapResponse};
use crate::error::AspError;
use crate::AppState;

pub async fn shielded_swap(
    State(state): State<Arc<AppState>>,
    Json(req): Json<SwapRequest>,
) -> Result<Json<SwapResponse>, AspError> {
    tracing::info!(
        leaf_index = req.input_note.leaf_index,
        amount_in = %req.swap_params.amount_in,
        "Processing shielded swap"
    );

    let mut worker = state.worker.lock().await;

    // 1. Compute input note commitment
    let input_result = worker
        .compute_commitment(
            &req.input_note.secret,
            &req.input_note.nullifier,
            &req.input_note.balance_low,
            &req.input_note.balance_high,
            &req.input_note.token,
        )
        .await?;

    // 2. Verify commitment exists
    let stored = state.db.get_commitment(req.input_note.leaf_index)?;
    match &stored {
        Some(row) if row.commitment == input_result.commitment => {}
        Some(_) => return Err(AspError::InvalidInput("Commitment mismatch".into())),
        None => return Err(AspError::CommitmentNotFound(req.input_note.leaf_index)),
    }

    // 3. Check nullifier not spent
    if state.db.is_nullifier_spent(&input_result.nullifier_hash)? {
        return Err(AspError::NullifierAlreadySpent(input_result.nullifier_hash));
    }

    // 4. Get Merkle proof
    let proof = worker.get_proof(req.input_note.leaf_index).await?;

    // 5. Compute output commitment (for newCommitment public input)
    let output_commitment = worker
        .compute_commitment(
            &req.output_note.secret,
            &req.output_note.nullifier,
            &req.swap_params.amount_out_low,
            &req.swap_params.amount_out_high,
            &req.swap_params.token_out,
        )
        .await?;

    // 6. Build swap circuit inputs
    let inputs = serde_json::json!({
        "root": proof.root,
        "nullifierHash": input_result.nullifier_hash,
        "newCommitment": output_commitment.commitment,
        "tokenIn": req.swap_params.token_in,
        "tokenOut": req.swap_params.token_out,
        "amountIn": req.swap_params.amount_in,
        "amountOutMin": req.swap_params.amount_out_min,
        // Private inputs
        "secret": req.input_note.secret,
        "nullifier": req.input_note.nullifier,
        "balance_low": req.input_note.balance_low,
        "balance_high": req.input_note.balance_high,
        "pathElements": proof.path_elements,
        "pathIndices": proof.path_indices,
        "newSecret": req.output_note.secret,
        "newNullifier": req.output_note.nullifier,
        "amountOut_low": req.swap_params.amount_out_low,
        "amountOut_high": req.swap_params.amount_out_high,
        "changeSecret": req.change_note.secret,
        "changeNullifier": req.change_note.nullifier,
    });

    // 7. Generate swap proof
    let proof_result = worker.generate_proof("swap", inputs).await?;
    drop(worker);

    // 8. Submit to pool.shielded_swap
    let relayer = state.relayer.lock().await;
    let tx_hash = relayer
        .shielded_swap(&req.pool_key, &proof_result.calldata, &req.sqrt_price_limit)
        .await?;
    drop(relayer);

    // 9. Record nullifier as spent
    state.db.insert_nullifier(
        &input_result.nullifier_hash,
        "swap",
        Some(&tx_hash),
    )?;

    tracing::info!(tx_hash = %tx_hash, "Shielded swap confirmed");

    Ok(Json(SwapResponse {
        status: "confirmed".to_string(),
        tx_hash,
        new_commitment: output_commitment.commitment,
        change_commitment: "pending_sync".to_string(), // Will be populated via event sync
    }))
}
