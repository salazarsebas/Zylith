use std::sync::Arc;

use axum::extract::{Path, State};
use axum::Json;

use crate::api::types::NullifierResponse;
use crate::error::AspError;
use crate::AppState;

pub async fn get_nullifier(
    State(state): State<Arc<AppState>>,
    Path(hash): Path<String>,
) -> Result<Json<NullifierResponse>, AspError> {
    let nullifier = state.db.get_nullifier(&hash)?;

    match nullifier {
        Some(row) => Ok(Json(NullifierResponse {
            nullifier_hash: row.nullifier_hash,
            spent: true,
            circuit_type: Some(row.circuit_type),
            tx_hash: row.tx_hash,
        })),
        None => Ok(Json(NullifierResponse {
            nullifier_hash: hash,
            spent: false,
            circuit_type: None,
            tx_hash: None,
        })),
    }
}
