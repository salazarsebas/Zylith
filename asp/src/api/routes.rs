use std::sync::Arc;

use axum::middleware;
use axum::routing::{get, post};
use axum::Router;
use tower_governor::governor::GovernorConfigBuilder;
use tower_governor::GovernorLayer;
use tower_http::cors::CorsLayer;

use crate::AppState;

use super::handlers;
use super::middleware::request_logger;

pub fn create_router(state: Arc<AppState>) -> Router {
    // Rate limiter: 2 req/sec sustained, 30 burst per IP
    let governor_conf = Arc::new(
        GovernorConfigBuilder::default()
            .per_second(2)
            .burst_size(30)
            .finish()
            .expect("Failed to build rate limiter config"),
    );

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
        // Middleware (applied bottom-to-top)
        .layer(middleware::from_fn(request_logger))
        .layer(GovernorLayer {
            config: governor_conf,
        })
        .layer(CorsLayer::permissive())
        .with_state(state)
}
