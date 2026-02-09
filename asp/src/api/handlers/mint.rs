use std::sync::Arc;

use axum::extract::State;
use axum::Json;

use crate::api::types::{MintRequest, MintResponse};
use crate::error::AspError;
use crate::AppState;

const TICK_OFFSET: i32 = 887272;

pub async fn shielded_mint(
    State(state): State<Arc<AppState>>,
    Json(req): Json<MintRequest>,
) -> Result<Json<MintResponse>, AspError> {
    tracing::info!(
        tick_lower = req.position.tick_lower,
        tick_upper = req.position.tick_upper,
        "Processing shielded mint"
    );

    let mut worker = state.worker.lock().await;

    // 1. Compute input note commitments
    let input0 = worker
        .compute_commitment(
            &req.input_note_0.secret,
            &req.input_note_0.nullifier,
            &req.input_note_0.balance_low,
            &req.input_note_0.balance_high,
            &req.input_note_0.token,
        )
        .await?;

    let input1 = worker
        .compute_commitment(
            &req.input_note_1.secret,
            &req.input_note_1.nullifier,
            &req.input_note_1.balance_low,
            &req.input_note_1.balance_high,
            &req.input_note_1.token,
        )
        .await?;

    // 2. Verify both commitments exist
    for (note, result) in [
        (&req.input_note_0, &input0),
        (&req.input_note_1, &input1),
    ] {
        let stored = state.db.get_commitment(note.leaf_index)?;
        match &stored {
            Some(row) if row.commitment == result.commitment => {}
            Some(_) => {
                return Err(AspError::InvalidInput(format!(
                    "Commitment mismatch at leaf {}",
                    note.leaf_index
                )))
            }
            None => return Err(AspError::CommitmentNotFound(note.leaf_index)),
        }
        if state.db.is_nullifier_spent(&result.nullifier_hash)? {
            return Err(AspError::NullifierAlreadySpent(result.nullifier_hash.clone()));
        }
    }

    // 3. Get Merkle proofs for both input notes
    let proof0 = worker.get_proof(req.input_note_0.leaf_index).await?;
    let proof1 = worker.get_proof(req.input_note_1.leaf_index).await?;

    // 4. Convert signed ticks to unsigned (+ TICK_OFFSET)
    let tick_lower_unsigned = (req.position.tick_lower + TICK_OFFSET) as u32;
    let tick_upper_unsigned = (req.position.tick_upper + TICK_OFFSET) as u32;

    // 5. Build mint circuit inputs
    let inputs = serde_json::json!({
        "root": proof0.root,
        "nullifierHash0": input0.nullifier_hash,
        "nullifierHash1": input1.nullifier_hash,
        "tickLower": tick_lower_unsigned.to_string(),
        "tickUpper": tick_upper_unsigned.to_string(),
        // Private - input note 0
        "secret0": req.input_note_0.secret,
        "nullifier0": req.input_note_0.nullifier,
        "balance0_low": req.input_note_0.balance_low,
        "balance0_high": req.input_note_0.balance_high,
        "token0": req.input_note_0.token,
        "pathElements0": proof0.path_elements,
        "pathIndices0": proof0.path_indices,
        // Private - input note 1
        "secret1": req.input_note_1.secret,
        "nullifier1": req.input_note_1.nullifier,
        "balance1_low": req.input_note_1.balance_low,
        "balance1_high": req.input_note_1.balance_high,
        "token1": req.input_note_1.token,
        "pathElements1": proof1.path_elements,
        "pathIndices1": proof1.path_indices,
        // Private - position
        "positionSecret": req.position.secret,
        "positionNullifier": req.position.nullifier,
        "liquidity": req.position.liquidity,
        "amount0_low": req.amounts.amount0_low,
        "amount0_high": req.amounts.amount0_high,
        "amount1_low": req.amounts.amount1_low,
        "amount1_high": req.amounts.amount1_high,
        // Private - change notes
        "changeSecret0": req.change_note_0.secret,
        "changeNullifier0": req.change_note_0.nullifier,
        "changeSecret1": req.change_note_1.secret,
        "changeNullifier1": req.change_note_1.nullifier,
    });

    // 6. Generate mint proof
    let proof_result = worker.generate_proof("mint", inputs).await?;
    drop(worker);

    // 7. Submit to pool.shielded_mint
    let relayer = state.relayer.lock().await;
    let tx_hash = relayer
        .shielded_mint(&req.pool_key, &proof_result.calldata, req.liquidity)
        .await?;
    drop(relayer);

    // 8. Record nullifiers as spent
    state.db.insert_nullifier(&input0.nullifier_hash, "mint", Some(&tx_hash))?;
    state.db.insert_nullifier(&input1.nullifier_hash, "mint", Some(&tx_hash))?;

    tracing::info!(tx_hash = %tx_hash, "Shielded mint confirmed");

    Ok(Json(MintResponse {
        status: "confirmed".to_string(),
        tx_hash,
        position_commitment: "pending_sync".to_string(),
        change_commitment_0: "pending_sync".to_string(),
        change_commitment_1: "pending_sync".to_string(),
    }))
}
