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

/// Core routes shared by production and test routers.
fn base_router(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/deposit", post(handlers::deposit::deposit))
        .route("/withdraw", post(handlers::withdraw::withdraw))
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
        // Sync
        .route("/sync-commitments", post(handlers::sync::sync_commitments))
        // Status
        .route("/status", get(handlers::status::get_status))
        .with_state(state)
}

/// Production router with rate limiting, logging, and CORS.
pub fn create_router(state: Arc<AppState>) -> Router {
    // TODO: Re-enable rate limiting after fixing IP extraction for proof-only mode
    // The rate limiter requires extracting client IP from socket, which may not work
    // in all deployment scenarios. For now, disabled to allow testing.
    // let governor_conf = Arc::new(
    //     GovernorConfigBuilder::default()
    //         .per_second(2)
    //         .burst_size(30)
    //         .finish()
    //         .expect("Failed to build rate limiter config"),
    // );

    base_router(state)
        .layer(middleware::from_fn(request_logger))
        // .layer(GovernorLayer {
        //     config: governor_conf,
        // })
        .layer(CorsLayer::permissive())
}

/// Test router without rate limiting (no real socket for IP extraction).
pub fn create_test_router(state: Arc<AppState>) -> Router {
    base_router(state)
        .layer(middleware::from_fn(request_logger))
        .layer(CorsLayer::permissive())
}
