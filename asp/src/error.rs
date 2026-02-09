use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde_json::json;

#[derive(thiserror::Error, Debug)]
pub enum AspError {
    // Configuration
    #[error("Configuration error: {0}")]
    Config(String),

    // API input validation
    #[error("Invalid input: {0}")]
    InvalidInput(String),

    #[error("Commitment not found at leaf index {0}")]
    CommitmentNotFound(u32),

    #[error("Nullifier already spent: {0}")]
    NullifierAlreadySpent(String),

    #[error("Merkle tree is full")]
    TreeFull,

    // Prover
    #[error("Proof generation failed: {0}")]
    ProverError(String),

    #[error("Worker not available: {0}")]
    WorkerUnavailable(String),

    // Starknet
    #[error("Transaction failed: {0}")]
    TransactionFailed(String),

    #[error("Transaction reverted: {0}")]
    TransactionReverted(String),

    #[error("RPC error: {0}")]
    RpcError(String),

    // Internal
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Internal error: {0}")]
    Internal(String),
}

impl IntoResponse for AspError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            AspError::Config(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg.clone()),
            AspError::InvalidInput(msg) => (StatusCode::BAD_REQUEST, msg.clone()),
            AspError::CommitmentNotFound(idx) => {
                (StatusCode::NOT_FOUND, format!("Commitment not found at leaf index {idx}"))
            }
            AspError::NullifierAlreadySpent(h) => {
                (StatusCode::CONFLICT, format!("Nullifier already spent: {h}"))
            }
            AspError::TreeFull => (StatusCode::SERVICE_UNAVAILABLE, "Merkle tree is full".into()),
            AspError::ProverError(msg) => (StatusCode::SERVICE_UNAVAILABLE, msg.clone()),
            AspError::WorkerUnavailable(msg) => (StatusCode::SERVICE_UNAVAILABLE, msg.clone()),
            AspError::TransactionFailed(msg) => (StatusCode::BAD_GATEWAY, msg.clone()),
            AspError::TransactionReverted(msg) => (StatusCode::BAD_GATEWAY, msg.clone()),
            AspError::RpcError(msg) => (StatusCode::BAD_GATEWAY, msg.clone()),
            AspError::Database(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
            AspError::Json(e) => (StatusCode::BAD_REQUEST, e.to_string()),
            AspError::Internal(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg.clone()),
        };

        let body = json!({
            "error": message,
            "status": status.as_u16(),
        });

        (status, axum::Json(body)).into_response()
    }
}
