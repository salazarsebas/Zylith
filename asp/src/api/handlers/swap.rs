use std::sync::Arc;

use axum::extract::State;
use axum::Json;

use crate::api::types::{SwapRequest, SwapResponse};
use crate::api::validation::{
    validate_address, validate_decimal, validate_hex_u256, validate_secret,
};
use crate::error::AspError;
use crate::AppState;

fn validate_swap_request(req: &SwapRequest) -> Result<(), AspError> {
    // Input note
    validate_secret(&req.input_note.secret, "input_note.secret")?;
    validate_secret(&req.input_note.nullifier, "input_note.nullifier")?;
    validate_decimal(&req.input_note.balance_low, "input_note.balance_low")?;
    validate_decimal(&req.input_note.balance_high, "input_note.balance_high")?;
    validate_address(&req.input_note.token, "input_note.token")?;

    // Swap params
    validate_address(&req.swap_params.token_in, "swap_params.token_in")?;
    validate_address(&req.swap_params.token_out, "swap_params.token_out")?;
    validate_decimal(&req.swap_params.amount_in, "swap_params.amount_in")?;
    validate_decimal(&req.swap_params.amount_out_min, "swap_params.amount_out_min")?;
    validate_decimal(&req.swap_params.amount_out_low, "swap_params.amount_out_low")?;
    validate_decimal(&req.swap_params.amount_out_high, "swap_params.amount_out_high")?;

    // Output + change notes
    validate_secret(&req.output_note.secret, "output_note.secret")?;
    validate_secret(&req.output_note.nullifier, "output_note.nullifier")?;
    validate_secret(&req.change_note.secret, "change_note.secret")?;
    validate_secret(&req.change_note.nullifier, "change_note.nullifier")?;

    // Pool key
    validate_address(&req.pool_key.token_0, "pool_key.token_0")?;
    validate_address(&req.pool_key.token_1, "pool_key.token_1")?;

    // Price limit
    validate_hex_u256(&req.sqrt_price_limit, "sqrt_price_limit")?;

    Ok(())
}

pub async fn shielded_swap(
    State(state): State<Arc<AppState>>,
    Json(req): Json<SwapRequest>,
) -> Result<Json<SwapResponse>, AspError> {
    validate_swap_request(&req)?;

    tracing::info!(
        leaf_index = req.input_note.leaf_index,
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
    let tx_hash = if let Some(ref relayer) = state.relayer {
        let relayer = relayer.lock().await;
        relayer
            .shielded_swap(&req.pool_key, &proof_result.calldata, &req.sqrt_price_limit)
            .await?
    } else {
        return Err(AspError::Internal("No relayer configured".into()));
    };

    // 9. Record nullifier as spent
    state
        .db
        .insert_nullifier(&input_result.nullifier_hash, "swap", Some(&tx_hash))?;

    // The changeCommitment is a circuit output computed inside the proof.
    // It's the first public signal from the swap circuit (Circom outputs come first).
    let change_commitment = proof_result
        .public_signals
        .first()
        .cloned()
        .unwrap_or_default();

    // 10. Insert output and change commitments into Merkle tree
    let mut worker = state.worker.lock().await;
    let mut last_root = String::new();

    // Insert output commitment (always present)
    let leaf_index = state.db.get_leaf_count()?;
    state
        .db
        .insert_commitment(leaf_index as u32, &output_commitment.commitment, Some(&tx_hash))?;
    last_root = worker.insert_leaf(&output_commitment.commitment).await?;
    tracing::debug!(leaf_index = leaf_index, "Inserted output_commitment");

    // Insert change commitment if non-zero
    if !change_commitment.is_empty() && change_commitment != "0" {
        let leaf_index = state.db.get_leaf_count()?;
        state
            .db
            .insert_commitment(leaf_index as u32, &change_commitment, Some(&tx_hash))?;
        last_root = worker.insert_leaf(&change_commitment).await?;
        tracing::debug!(leaf_index = leaf_index, "Inserted change_commitment");
    }

    drop(worker);

    // 11. Store the final root in DB
    let new_count = state.db.get_leaf_count()?;
    state.db.insert_root(&last_root, new_count as u32, Some(&tx_hash))?;

    // 12. Submit the new Merkle root to Coordinator on-chain
    if let Some(ref relayer) = state.relayer {
        let relayer = relayer.lock().await;
        let root_tx = relayer.submit_merkle_root(&last_root).await?;
        tracing::info!(tx_hash = %root_tx, "Merkle root submitted on-chain after swap");
    } else {
        tracing::warn!("No relayer configured — root stored locally only");
    }

    tracing::info!(tx_hash = %tx_hash, "Shielded swap confirmed");

    Ok(Json(SwapResponse {
        status: "confirmed".to_string(),
        tx_hash,
        new_commitment: output_commitment.commitment.clone(),
        change_commitment: change_commitment.clone(),
    }))
}
