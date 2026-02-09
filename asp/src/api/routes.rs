use std::sync::Arc;

use axum::routing::{get, post};
use axum::Router;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;

use crate::AppState;

use super::handlers;

pub fn create_router(state: Arc<AppState>) -> Router {
    Router::new()
        // Deposit & withdrawal
        .route("/deposit", post(handlers::deposit::deposit))
        .route("/withdraw", post(handlers::withdraw::withdraw))
        // Shielded operations
        .route("/swap", post(handlers::swap::shielded_swap))
        .route("/mint", post(handlers::mint::shielded_mint))
        .route("/burn", post(handlers::burn::shielded_burn))
        // Tree queries
        .route("/tree/root", get(handlers::tree::get_root))
        .route("/tree/path/{leaf_index}", get(handlers::tree::get_path))
        // Nullifier queries
        .route(
            "/nullifier/{hash}",
            get(handlers::nullifier::get_nullifier),
        )
        // Status
        .route("/status", get(handlers::status::get_status))
        // Middleware
        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::permissive())
        .with_state(state)
}
