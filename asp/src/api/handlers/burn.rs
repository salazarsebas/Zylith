use std::sync::Arc;

use axum::extract::State;
use axum::Json;

use crate::api::types::{BurnRequest, BurnResponse};
use crate::api::validation::{
    validate_address, validate_decimal, validate_secret, validate_tick_range,
};
use crate::error::AspError;
use crate::AppState;

const TICK_OFFSET: i32 = 887272;

fn validate_burn_request(req: &BurnRequest) -> Result<(), AspError> {
    // Position note
    validate_secret(&req.position_note.secret, "position_note.secret")?;
    validate_secret(&req.position_note.nullifier, "position_note.nullifier")?;
    validate_decimal(&req.position_note.liquidity, "position_note.liquidity")?;
    validate_tick_range(req.position_note.tick_lower, req.position_note.tick_upper)?;

    // Output notes
    for (prefix, note) in [
        ("output_note_0", &req.output_note_0),
        ("output_note_1", &req.output_note_1),
    ] {
        validate_secret(&note.secret, &format!("{prefix}.secret"))?;
        validate_secret(&note.nullifier, &format!("{prefix}.nullifier"))?;
        validate_decimal(&note.amount_low, &format!("{prefix}.amount_low"))?;
        validate_decimal(&note.amount_high, &format!("{prefix}.amount_high"))?;
        validate_address(&note.token, &format!("{prefix}.token"))?;
    }

    // Pool key
    validate_address(&req.pool_key.token_0, "pool_key.token_0")?;
    validate_address(&req.pool_key.token_1, "pool_key.token_1")?;

    if req.liquidity == 0 {
        return Err(AspError::InvalidInput("liquidity must be > 0".into()));
    }

    Ok(())
}

pub async fn shielded_burn(
    State(state): State<Arc<AppState>>,
    Json(req): Json<BurnRequest>,
) -> Result<Json<BurnResponse>, AspError> {
    validate_burn_request(&req)?;

    tracing::info!(
        leaf_index = req.position_note.leaf_index,
        "Processing shielded burn"
    );

    let mut worker = state.worker.lock().await;

    // 1. Convert signed ticks to unsigned
    let tick_lower_unsigned = (req.position_note.tick_lower + TICK_OFFSET) as u32;
    let tick_upper_unsigned = (req.position_note.tick_upper + TICK_OFFSET) as u32;

    // 2. Get Merkle proof for position
    let proof = worker.get_proof(req.position_note.leaf_index).await?;

    // 3. Compute output note commitments (for public inputs)
    let output0 = worker
        .compute_commitment(
            &req.output_note_0.secret,
            &req.output_note_0.nullifier,
            &req.output_note_0.amount_low,
            &req.output_note_0.amount_high,
            &req.output_note_0.token,
        )
        .await?;

    let output1 = worker
        .compute_commitment(
            &req.output_note_1.secret,
            &req.output_note_1.nullifier,
            &req.output_note_1.amount_low,
            &req.output_note_1.amount_high,
            &req.output_note_1.token,
        )
        .await?;

    // 4. Compute position commitment and nullifier hash
    let position = worker
        .compute_position_commitment(
            &req.position_note.secret,
            &req.position_note.nullifier,
            tick_lower_unsigned as i32,
            tick_upper_unsigned as i32,
            &req.position_note.liquidity,
        )
        .await?;

    // 5. Build burn circuit inputs
    let inputs = serde_json::json!({
        "root": proof.root,
        "positionNullifierHash": position.nullifier_hash,
        "newCommitment0": output0.commitment,
        "newCommitment1": output1.commitment,
        "tickLower": tick_lower_unsigned.to_string(),
        "tickUpper": tick_upper_unsigned.to_string(),
        // Private - position
        "positionSecret": req.position_note.secret,
        "positionNullifier": req.position_note.nullifier,
        "liquidity": req.position_note.liquidity,
        "pathElements": proof.path_elements,
        "pathIndices": proof.path_indices,
        // Private - output note 0
        "newSecret0": req.output_note_0.secret,
        "newNullifier0": req.output_note_0.nullifier,
        "amount0_low": req.output_note_0.amount_low,
        "amount0_high": req.output_note_0.amount_high,
        "token0": req.output_note_0.token,
        // Private - output note 1
        "newSecret1": req.output_note_1.secret,
        "newNullifier1": req.output_note_1.nullifier,
        "amount1_low": req.output_note_1.amount_low,
        "amount1_high": req.output_note_1.amount_high,
        "token1": req.output_note_1.token,
    });

    // 6. Generate burn proof
    let proof_result = worker.generate_proof("burn", inputs).await?;
    drop(worker);

    // 7. Submit to pool.shielded_burn
    let tx_hash = if let Some(ref relayer) = state.relayer {
        let relayer = relayer.lock().await;
        relayer
            .shielded_burn(&req.pool_key, &proof_result.calldata, req.liquidity)
            .await?
    } else {
        return Err(AspError::Internal("No relayer configured".into()));
    };

    // 8. Record position nullifier as spent
    state
        .db
        .insert_nullifier(&position.nullifier_hash, "burn", Some(&tx_hash))?;

    // 9. Insert output commitments into Merkle tree
    let mut worker = state.worker.lock().await;
    let mut last_root = String::new();

    // Insert output commitment 0 if non-zero
    if !output0.commitment.is_empty() && output0.commitment != "0" {
        let leaf_index = state.db.get_leaf_count()?;
        state
            .db
            .insert_commitment(leaf_index as u32, &output0.commitment, Some(&tx_hash))?;
        last_root = worker.insert_leaf(&output0.commitment).await?;
        tracing::debug!(leaf_index = leaf_index, "Inserted output_commitment_0");
    }

    // Insert output commitment 1 if non-zero
    if !output1.commitment.is_empty() && output1.commitment != "0" {
        let leaf_index = state.db.get_leaf_count()?;
        state
            .db
            .insert_commitment(leaf_index as u32, &output1.commitment, Some(&tx_hash))?;
        last_root = worker.insert_leaf(&output1.commitment).await?;
        tracing::debug!(leaf_index = leaf_index, "Inserted output_commitment_1");
    }

    drop(worker);

    // 10. Store the final root in DB (if we inserted anything)
    if !last_root.is_empty() {
        let new_count = state.db.get_leaf_count()?;
        state.db.insert_root(&last_root, new_count as u32, Some(&tx_hash))?;

        // 11. Submit the new Merkle root to Coordinator on-chain
        if let Some(ref relayer) = state.relayer {
            let relayer = relayer.lock().await;
            let root_tx = relayer.submit_merkle_root(&last_root).await?;
            tracing::info!(tx_hash = %root_tx, "Merkle root submitted on-chain after burn");
        } else {
            tracing::warn!("No relayer configured — root stored locally only");
        }
    }

    tracing::info!(tx_hash = %tx_hash, "Shielded burn confirmed");

    Ok(Json(BurnResponse {
        status: "confirmed".to_string(),
        tx_hash,
        new_commitment_0: output0.commitment.clone(),
        new_commitment_1: output1.commitment.clone(),
    }))
}
