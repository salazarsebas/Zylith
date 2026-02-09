use std::sync::Arc;

use axum::extract::{Path, State};
use axum::Json;

use crate::api::types::{TreeProofResponse, TreeRootResponse};
use crate::error::AspError;
use crate::AppState;

pub async fn get_root(
    State(state): State<Arc<AppState>>,
) -> Result<Json<TreeRootResponse>, AspError> {
    let leaf_count = state.db.get_leaf_count()?;
    let root = state.db.get_latest_root()?;

    Ok(Json(TreeRootResponse {
        root: root.unwrap_or_else(|| "0".to_string()),
        leaf_count,
    }))
}

pub async fn get_path(
    State(state): State<Arc<AppState>>,
    Path(leaf_index): Path<u32>,
) -> Result<Json<TreeProofResponse>, AspError> {
    // Verify leaf exists
    let commitment = state
        .db
        .get_commitment(leaf_index)?
        .ok_or(AspError::CommitmentNotFound(leaf_index))?;

    // Get Merkle proof from worker
    let mut worker = state.worker.lock().await;
    let proof = worker.get_proof(leaf_index).await?;
    drop(worker);

    Ok(Json(TreeProofResponse {
        leaf_index,
        commitment: commitment.commitment,
        path_elements: proof.path_elements,
        path_indices: proof.path_indices,
        root: proof.root,
    }))
}
