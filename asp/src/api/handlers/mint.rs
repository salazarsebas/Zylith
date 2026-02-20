use std::sync::Arc;

use axum::extract::State;
use axum::Json;

use crate::api::types::{MintRequest, MintResponse};
use crate::api::validation::{
    validate_address, validate_decimal, validate_secret, validate_tick_range,
};
use crate::error::AspError;
use crate::AppState;

const TICK_OFFSET: i32 = 887272;

fn validate_mint_request(req: &MintRequest) -> Result<(), AspError> {
    for (prefix, note) in [
        ("input_note_0", &req.input_note_0),
        ("input_note_1", &req.input_note_1),
    ] {
        validate_secret(&note.secret, &format!("{prefix}.secret"))?;
        validate_secret(&note.nullifier, &format!("{prefix}.nullifier"))?;
        validate_decimal(&note.balance_low, &format!("{prefix}.balance_low"))?;
        validate_decimal(&note.balance_high, &format!("{prefix}.balance_high"))?;
        validate_address(&note.token, &format!("{prefix}.token"))?;
    }

    validate_secret(&req.position.secret, "position.secret")?;
    validate_secret(&req.position.nullifier, "position.nullifier")?;
    validate_decimal(&req.position.liquidity, "position.liquidity")?;
    validate_tick_range(req.position.tick_lower, req.position.tick_upper)?;

    validate_decimal(&req.amounts.amount0_low, "amounts.amount0_low")?;
    validate_decimal(&req.amounts.amount0_high, "amounts.amount0_high")?;
    validate_decimal(&req.amounts.amount1_low, "amounts.amount1_low")?;
    validate_decimal(&req.amounts.amount1_high, "amounts.amount1_high")?;

    validate_secret(&req.change_note_0.secret, "change_note_0.secret")?;
    validate_secret(&req.change_note_0.nullifier, "change_note_0.nullifier")?;
    validate_secret(&req.change_note_1.secret, "change_note_1.secret")?;
    validate_secret(&req.change_note_1.nullifier, "change_note_1.nullifier")?;

    validate_address(&req.pool_key.token_0, "pool_key.token_0")?;
    validate_address(&req.pool_key.token_1, "pool_key.token_1")?;

    if req.liquidity == 0 {
        return Err(AspError::InvalidInput("liquidity must be > 0".into()));
    }

    Ok(())
}

pub async fn shielded_mint(
    State(state): State<Arc<AppState>>,
    Json(req): Json<MintRequest>,
) -> Result<Json<MintResponse>, AspError> {
    validate_mint_request(&req)?;

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
            return Err(AspError::NullifierAlreadySpent(
                result.nullifier_hash.clone(),
            ));
        }
    }

    // 3. Get Merkle proofs for both input notes
    let proof0 = worker.get_proof(req.input_note_0.leaf_index).await?;
    let proof1 = worker.get_proof(req.input_note_1.leaf_index).await?;

    // 4. Convert signed ticks to unsigned (+ TICK_OFFSET)
    let tick_lower_unsigned = (req.position.tick_lower + TICK_OFFSET) as u32;
    let tick_upper_unsigned = (req.position.tick_upper + TICK_OFFSET) as u32;

    // 5. Compute position commitment (must use unsigned ticks)
    let position = worker
        .compute_position_commitment(
            &req.position.secret,
            &req.position.nullifier,
            tick_lower_unsigned as i32,
            tick_upper_unsigned as i32,
            &req.position.liquidity,
        )
        .await?;

    // 6. Build mint circuit inputs
    let inputs = serde_json::json!({
        "root": proof0.root,
        "nullifierHash0": input0.nullifier_hash,
        "nullifierHash1": input1.nullifier_hash,
        "positionCommitment": position.commitment,
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

    // 7. Generate mint proof
    let proof_result = worker.generate_proof("mint", inputs).await?;
    drop(worker);

    // 8. Submit to pool.shielded_mint
    let tx_hash = if let Some(ref relayer) = state.relayer {
        let relayer = relayer.lock().await;
        relayer
            .shielded_mint(&req.pool_key, &proof_result.calldata, req.liquidity)
            .await?
    } else {
        return Err(AspError::Internal("No relayer configured".into()));
    };

    // 9. Record nullifiers as spent
    state
        .db
        .insert_nullifier(&input0.nullifier_hash, "mint", Some(&tx_hash))?;
    state
        .db
        .insert_nullifier(&input1.nullifier_hash, "mint", Some(&tx_hash))?;

    // Extract circuit output signals:
    // Mint public signal order: [changeCommitment0, changeCommitment1, root, nH0, nH1, positionCommitment, tickLower, tickUpper]
    let ps = &proof_result.public_signals;
    let change_commitment_0 = ps.first().cloned().unwrap_or_default();
    let change_commitment_1 = ps.get(1).cloned().unwrap_or_default();
    let position_commitment = position.commitment;

    // 10. Insert change commitments and position commitment into Merkle tree
    let mut worker = state.worker.lock().await;
    let mut last_root = String::new();

    // Insert change commitment 0 if non-zero
    if !change_commitment_0.is_empty() && change_commitment_0 != "0" {
        let leaf_index = state.db.get_leaf_count()?;
        state
            .db
            .insert_commitment(leaf_index as u32, &change_commitment_0, Some(&tx_hash))?;
        last_root = worker.insert_leaf(&change_commitment_0).await?;
        tracing::debug!(leaf_index = leaf_index, "Inserted change_commitment_0");
    }

    // Insert change commitment 1 if non-zero
    if !change_commitment_1.is_empty() && change_commitment_1 != "0" {
        let leaf_index = state.db.get_leaf_count()?;
        state
            .db
            .insert_commitment(leaf_index as u32, &change_commitment_1, Some(&tx_hash))?;
        last_root = worker.insert_leaf(&change_commitment_1).await?;
        tracing::debug!(leaf_index = leaf_index, "Inserted change_commitment_1");
    }

    // Insert position commitment into tree (always present)
    let leaf_index = state.db.get_leaf_count()?;
    state
        .db
        .insert_commitment(leaf_index as u32, &position_commitment, Some(&tx_hash))?;
    last_root = worker.insert_leaf(&position_commitment).await?;
    tracing::debug!(leaf_index = leaf_index, "Inserted position_commitment");

    drop(worker);

    // 11. Store the final root in DB
    let new_count = state.db.get_leaf_count()?;
    state.db.insert_root(&last_root, new_count as u32, Some(&tx_hash))?;

    // 12. Submit the new Merkle root to Coordinator on-chain
    if let Some(ref relayer) = state.relayer {
        let relayer = relayer.lock().await;
        let root_tx = relayer.submit_merkle_root(&last_root).await?;
        tracing::info!(tx_hash = %root_tx, "Merkle root submitted on-chain after mint");
    } else {
        tracing::warn!("No relayer configured — root stored locally only");
    }

    tracing::info!(tx_hash = %tx_hash, "Shielded mint confirmed");

    Ok(Json(MintResponse {
        status: "confirmed".to_string(),
        tx_hash,
        position_commitment,
        change_commitment_0,
        change_commitment_1,
    }))
}
