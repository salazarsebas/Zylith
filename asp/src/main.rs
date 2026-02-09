mod api;
mod config;
mod db;
mod error;
mod prover;
mod relayer;
mod sync;

use std::sync::Arc;
use tokio::sync::Mutex;
use tracing_subscriber::EnvFilter;

use crate::config::Config;
use crate::db::Database;
use crate::prover::Worker;
use crate::relayer::StarknetRelayer;

pub struct AppState {
    pub config: Config,
    pub db: Database,
    pub worker: Mutex<Worker>,
    pub relayer: Mutex<StarknetRelayer>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")),
        )
        .init();

    tracing::info!("Starting Zylith ASP server...");

    // Load configuration
    let config = Config::load()?;
    tracing::info!(
        coordinator = %config.coordinator_address,
        pool = %config.pool_address,
        "Configuration loaded"
    );

    // Initialize database
    let db = Database::new(&config.database_path)?;
    db.run_migrations()?;
    tracing::info!(path = %config.database_path, "Database initialized");

    // Spawn Node.js worker
    let mut worker = Worker::spawn(&config.worker_path).await?;
    tracing::info!("Node.js worker spawned");

    // Rebuild tree from existing commitments
    let commitments = db.get_all_commitments()?;
    if !commitments.is_empty() {
        let leaves: Vec<String> = commitments.iter().map(|c| c.commitment.clone()).collect();
        let root = worker.build_tree(&leaves).await?;
        tracing::info!(leaf_count = leaves.len(), root = %root, "Merkle tree rebuilt");
    }

    // Initialize Starknet relayer
    let relayer = StarknetRelayer::new(&config).await?;
    tracing::info!("Starknet relayer initialized");

    // Build shared state
    let state = Arc::new(AppState {
        config: config.clone(),
        db,
        worker: Mutex::new(worker),
        relayer: Mutex::new(relayer),
    });

    // Build router
    let app = api::routes::create_router(state.clone());

    // Start server
    let addr = format!("{}:{}", config.host, config.port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    tracing::info!(addr = %addr, "Server listening");

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    tracing::info!("Server shut down gracefully");
    Ok(())
}

async fn shutdown_signal() {
    tokio::signal::ctrl_c()
        .await
        .expect("Failed to install CTRL+C handler");
    tracing::info!("Shutdown signal received");
}
