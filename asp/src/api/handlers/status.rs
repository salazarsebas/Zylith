use std::sync::Arc;

use axum::extract::State;
use axum::Json;

use crate::api::types::{ContractAddresses, StatusResponse, SyncStatus, TreeStatus};
use crate::error::AspError;
use crate::AppState;

pub async fn get_status(
    State(state): State<Arc<AppState>>,
) -> Result<Json<StatusResponse>, AspError> {
    let db_healthy = state.db.is_healthy();

    let leaf_count = state.db.get_leaf_count().unwrap_or(0);
    let root = state.db.get_latest_root().unwrap_or(None);

    let last_synced_block = state
        .db
        .get_sync_state("last_block")
        .unwrap_or(None)
        .and_then(|s| s.parse::<u64>().ok());

    // Check worker health via ping
    let worker_healthy = {
        let mut worker = state.worker.lock().await;
        worker.ping().await.unwrap_or(false)
    };

    let healthy = db_healthy && worker_healthy;

    Ok(Json(StatusResponse {
        healthy,
        version: env!("CARGO_PKG_VERSION").to_string(),
        tree: TreeStatus { leaf_count, root },
        sync: SyncStatus {
            last_synced_block,
        },
        contracts: ContractAddresses {
            coordinator: state.config.coordinator_address.clone(),
            pool: state.config.pool_address.clone(),
        },
    }))
}
