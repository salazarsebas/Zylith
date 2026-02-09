use std::sync::Arc;

use axum::extract::State;
use axum::Json;

use crate::api::types::{BurnRequest, BurnResponse};
use crate::error::AspError;
use crate::AppState;

const TICK_OFFSET: i32 = 887272;

pub async fn shielded_burn(
    State(state): State<Arc<AppState>>,
    Json(req): Json<BurnRequest>,
) -> Result<Json<BurnResponse>, AspError> {
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

    // 4. Build burn circuit inputs
    let inputs = serde_json::json!({
        "root": proof.root,
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

    // 5. Generate burn proof
    let proof_result = worker.generate_proof("burn", inputs).await?;
    drop(worker);

    // 6. Submit to pool.shielded_burn
    let relayer = state.relayer.lock().await;
    let tx_hash = relayer
        .shielded_burn(&req.pool_key, &proof_result.calldata, req.liquidity)
        .await?;
    drop(relayer);

    tracing::info!(tx_hash = %tx_hash, "Shielded burn confirmed");

    Ok(Json(BurnResponse {
        status: "confirmed".to_string(),
        tx_hash,
        new_commitment_0: output0.commitment,
        new_commitment_1: output1.commitment,
    }))
}
