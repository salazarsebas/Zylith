use serde::Deserialize;
use std::path::PathBuf;

use crate::error::AspError;

#[derive(Clone, Debug)]
pub struct Config {
    // Server
    pub host: String,
    pub port: u16,

    // Starknet RPC
    pub rpc_url: String,

    // Admin account
    pub admin_address: String,
    pub keystore_path: String,
    pub keystore_password: String,

    // Contract addresses
    pub coordinator_address: String,
    pub pool_address: String,

    // Database
    pub database_path: String,

    // Worker
    pub worker_path: String,
}

#[derive(Deserialize)]
struct DeployedAddresses {
    coordinator: String,
    pool: String,
}

impl Config {
    pub fn load() -> Result<Self, AspError> {
        // Load .env file (optional, won't fail if missing)
        dotenvy::dotenv().ok();

        let host = std::env::var("ASP_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
        let port: u16 = std::env::var("ASP_PORT")
            .unwrap_or_else(|_| "3000".to_string())
            .parse()
            .map_err(|_| AspError::Config("ASP_PORT must be a valid port number".into()))?;

        let rpc_url = std::env::var("STARKNET_RPC_URL")
            .map_err(|_| AspError::Config("STARKNET_RPC_URL is required".into()))?;

        let admin_address = std::env::var("ADMIN_ADDRESS")
            .map_err(|_| AspError::Config("ADMIN_ADDRESS is required".into()))?;

        let keystore_path = std::env::var("KEYSTORE_PATH")
            .map_err(|_| AspError::Config("KEYSTORE_PATH is required".into()))?;

        let keystore_password = std::env::var("KEYSTORE_PASSWORD")
            .map_err(|_| AspError::Config("KEYSTORE_PASSWORD is required".into()))?;

        // Try to load deployed addresses from file
        let addresses_path = std::env::var("DEPLOYED_ADDRESSES_PATH").unwrap_or_else(|_| {
            // Default: look relative to project root
            let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
            path.push("../scripts/deployed_addresses.json");
            path.to_string_lossy().to_string()
        });

        let (coordinator_address, pool_address) =
            if let Ok(content) = std::fs::read_to_string(&addresses_path) {
                let addrs: DeployedAddresses = serde_json::from_str(&content)
                    .map_err(|e| AspError::Config(format!("Invalid deployed_addresses.json: {e}")))?;
                (addrs.coordinator, addrs.pool)
            } else {
                // Fall back to env vars
                let coordinator = std::env::var("COORDINATOR_ADDRESS")
                    .map_err(|_| AspError::Config("COORDINATOR_ADDRESS is required".into()))?;
                let pool = std::env::var("POOL_ADDRESS")
                    .map_err(|_| AspError::Config("POOL_ADDRESS is required".into()))?;
                (coordinator, pool)
            };

        let database_path = std::env::var("DATABASE_PATH")
            .unwrap_or_else(|_| "zylith_asp.db".to_string());

        let worker_path = std::env::var("WORKER_PATH").unwrap_or_else(|_| {
            let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
            path.push("worker/worker.mjs");
            path.to_string_lossy().to_string()
        });

        Ok(Config {
            host,
            port,
            rpc_url,
            admin_address,
            keystore_path,
            keystore_password,
            coordinator_address,
            pool_address,
            database_path,
            worker_path,
        })
    }
}
