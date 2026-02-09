use std::sync::Arc;

use axum::extract::State;
use axum::Json;

use crate::api::types::{ContractAddresses, StatusResponse, TreeStatus};
use crate::error::AspError;
use crate::AppState;

pub async fn get_status(
    State(state): State<Arc<AppState>>,
) -> Result<Json<StatusResponse>, AspError> {
    let leaf_count = state.db.get_leaf_count()?;
    let root = state.db.get_latest_root()?;

    Ok(Json(StatusResponse {
        healthy: true,
        version: env!("CARGO_PKG_VERSION").to_string(),
        tree: TreeStatus { leaf_count, root },
        contracts: ContractAddresses {
            coordinator: state.config.coordinator_address.clone(),
            pool: state.config.pool_address.clone(),
        },
    }))
}
