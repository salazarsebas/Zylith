use std::sync::Arc;

use axum::extract::State;
use axum::Json;
use serde::{Deserialize, Serialize};

use crate::error::AspError;
use crate::AppState;

#[derive(Deserialize)]
pub struct SyncCommitmentsRequest {
    pub commitments: Vec<String>, // List of commitment hashes (decimal strings)
}

#[derive(Serialize)]
pub struct CommitmentWithIndex {
    pub commitment: String,
    pub leaf_index: Option<u32>,
}

#[derive(Serialize)]
pub struct SyncCommitmentsResponse {
    pub commitments: Vec<CommitmentWithIndex>,
}

/// Endpoint: POST /sync-commitments
/// Given a list of commitments, return their leaf indexes if they exist in the tree.
pub async fn sync_commitments(
    State(state): State<Arc<AppState>>,
    Json(req): Json<SyncCommitmentsRequest>,
) -> Result<Json<SyncCommitmentsResponse>, AspError> {
    let mut results = Vec::new();

    for commitment in req.commitments {
        // Search for this commitment in the database
        let leaf_index = state
            .db
            .find_commitment_leaf_index(&commitment)?;

        results.push(CommitmentWithIndex {
            commitment,
            leaf_index,
        });
    }

    Ok(Json(SyncCommitmentsResponse {
        commitments: results,
    }))
}
