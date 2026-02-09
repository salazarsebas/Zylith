use std::path::PathBuf;
use std::sync::Arc;

use axum_test::TestServer;
use serde_json::json;
use tokio::sync::Mutex;

use zylith_asp::api::routes::create_test_router;
use zylith_asp::config::Config;
use zylith_asp::db::Database;
use zylith_asp::error::AspError;
use zylith_asp::prover::Worker;
use zylith_asp::relayer::{PoolKeyParams, Relayer};
use zylith_asp::AppState;

// ---------------------------------------------------------------------------
// MockRelayer — returns configurable tx hashes, no real Starknet calls
// ---------------------------------------------------------------------------

struct MockRelayer;

#[async_trait::async_trait]
impl Relayer for MockRelayer {
    async fn deposit(&self, _commitment: &str) -> Result<String, AspError> {
        Ok("0xmock_deposit_tx".into())
    }

    async fn submit_merkle_root(&self, _root: &str) -> Result<String, AspError> {
        Ok("0xmock_root_tx".into())
    }

    async fn verify_membership(&self, _calldata: &[String]) -> Result<String, AspError> {
        Ok("0xmock_membership_tx".into())
    }

    async fn shielded_swap(
        &self,
        _pool_key: &PoolKeyParams,
        _calldata: &[String],
        _sqrt_price_limit: &str,
    ) -> Result<String, AspError> {
        Ok("0xmock_swap_tx".into())
    }

    async fn shielded_mint(
        &self,
        _pool_key: &PoolKeyParams,
        _calldata: &[String],
        _liquidity: u128,
    ) -> Result<String, AspError> {
        Ok("0xmock_mint_tx".into())
    }

    async fn shielded_burn(
        &self,
        _pool_key: &PoolKeyParams,
        _calldata: &[String],
        _liquidity: u128,
    ) -> Result<String, AspError> {
        Ok("0xmock_burn_tx".into())
    }
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

fn worker_path() -> String {
    let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path.push("worker/worker.mjs");
    path.to_string_lossy().to_string()
}

fn test_config() -> Config {
    Config {
        host: "127.0.0.1".into(),
        port: 0,
        rpc_url: "http://localhost:1234".into(),
        admin_address: "0x1234".into(),
        keystore_path: "/dev/null".into(),
        keystore_password: "test".into(),
        coordinator_address: "0xcoordinator".into(),
        pool_address: "0xpool".into(),
        database_path: ":memory:".into(),
        worker_path: worker_path(),
        sync_poll_interval_secs: 9999,
    }
}

async fn create_test_state() -> Arc<AppState> {
    let config = test_config();

    let db = Database::new(":memory:").unwrap();
    db.run_migrations().unwrap();

    let worker = Worker::spawn(&config.worker_path)
        .await
        .expect("Failed to spawn worker — is bun installed and worker/node_modules present?");

    Arc::new(AppState {
        config,
        db,
        worker: Mutex::new(worker),
        relayer: Mutex::new(Box::new(MockRelayer) as Box<dyn Relayer>),
    })
}

async fn create_test_server() -> TestServer {
    let state = create_test_state().await;
    let app = create_test_router(state);
    TestServer::new(app).unwrap()
}

// ---------------------------------------------------------------------------
// Deposit tests
// ---------------------------------------------------------------------------

#[tokio::test]
async fn test_deposit_success() {
    let server = create_test_server().await;

    let resp = server
        .post("/deposit")
        .json(&json!({"commitment": "0x1234"}))
        .await;

    resp.assert_status_ok();
    let body: serde_json::Value = resp.json();
    assert_eq!(body["status"], "confirmed");
    assert_eq!(body["leaf_index"], 0);
    assert_eq!(body["tx_hash"], "0xmock_deposit_tx");
    assert_eq!(body["root_tx_hash"], "0xmock_root_tx");
    // root should be a hex string (non-empty)
    assert!(body["root"].as_str().unwrap().starts_with("0x"));
}

#[tokio::test]
async fn test_deposit_invalid_hex() {
    let server = create_test_server().await;

    let resp = server
        .post("/deposit")
        .json(&json!({"commitment": "not_hex"}))
        .await;

    resp.assert_status_bad_request();
}

#[tokio::test]
async fn test_deposit_empty_commitment() {
    let server = create_test_server().await;

    let resp = server
        .post("/deposit")
        .json(&json!({"commitment": ""}))
        .await;

    resp.assert_status_bad_request();
}

#[tokio::test]
async fn test_deposit_two_sequential() {
    let state = create_test_state().await;
    let server = TestServer::new(create_test_router(state.clone())).unwrap();

    let resp1 = server
        .post("/deposit")
        .json(&json!({"commitment": "0xaaaa"}))
        .await;
    resp1.assert_status_ok();
    let body1: serde_json::Value = resp1.json();
    assert_eq!(body1["leaf_index"], 0);
    let root1 = body1["root"].as_str().unwrap().to_string();

    let resp2 = server
        .post("/deposit")
        .json(&json!({"commitment": "0xbbbb"}))
        .await;
    resp2.assert_status_ok();
    let body2: serde_json::Value = resp2.json();
    assert_eq!(body2["leaf_index"], 1);
    let root2 = body2["root"].as_str().unwrap().to_string();

    // Root should change after second deposit
    assert_ne!(root1, root2);
}

// ---------------------------------------------------------------------------
// Tree tests
// ---------------------------------------------------------------------------

#[tokio::test]
async fn test_tree_root_empty() {
    let server = create_test_server().await;

    let resp = server.get("/tree/root").await;
    resp.assert_status_ok();
    let body: serde_json::Value = resp.json();
    assert_eq!(body["leaf_count"], 0);
    assert_eq!(body["root"], "0");
}

#[tokio::test]
async fn test_tree_root_after_deposit() {
    let state = create_test_state().await;
    let server = TestServer::new(create_test_router(state.clone())).unwrap();

    // Deposit first
    server
        .post("/deposit")
        .json(&json!({"commitment": "0x1234"}))
        .await
        .assert_status_ok();

    let resp = server.get("/tree/root").await;
    resp.assert_status_ok();
    let body: serde_json::Value = resp.json();
    assert_eq!(body["leaf_count"], 1);
    // Root should be a real value (stored from deposit)
    assert_ne!(body["root"], "0");
}

#[tokio::test]
async fn test_tree_path_success() {
    let state = create_test_state().await;
    let server = TestServer::new(create_test_router(state.clone())).unwrap();

    // Deposit first
    server
        .post("/deposit")
        .json(&json!({"commitment": "0x5678"}))
        .await
        .assert_status_ok();

    let resp = server.get("/tree/path/0").await;
    resp.assert_status_ok();
    let body: serde_json::Value = resp.json();
    assert_eq!(body["leaf_index"], 0);
    // LeanIMT with height 20 gives 20 path elements
    let path_elements = body["path_elements"].as_array().unwrap();
    assert_eq!(path_elements.len(), 20);
    let path_indices = body["path_indices"].as_array().unwrap();
    assert_eq!(path_indices.len(), 20);
}

#[tokio::test]
async fn test_tree_path_not_found() {
    let server = create_test_server().await;

    let resp = server.get("/tree/path/99").await;
    resp.assert_status_not_found();
}

// ---------------------------------------------------------------------------
// Nullifier tests
// ---------------------------------------------------------------------------

#[tokio::test]
async fn test_nullifier_not_spent() {
    let server = create_test_server().await;

    let resp = server.get("/nullifier/12345").await;
    resp.assert_status_ok();
    let body: serde_json::Value = resp.json();
    assert_eq!(body["spent"], false);
    assert!(body["circuit_type"].is_null());
}

#[tokio::test]
async fn test_nullifier_spent() {
    let state = create_test_state().await;

    // Insert nullifier directly into DB
    state
        .db
        .insert_nullifier("12345", "membership", Some("0xabc"))
        .unwrap();

    let server = TestServer::new(create_test_router(state)).unwrap();

    let resp = server.get("/nullifier/12345").await;
    resp.assert_status_ok();
    let body: serde_json::Value = resp.json();
    assert_eq!(body["spent"], true);
    assert_eq!(body["circuit_type"], "membership");
    assert_eq!(body["tx_hash"], "0xabc");
}

// ---------------------------------------------------------------------------
// Status tests
// ---------------------------------------------------------------------------

#[tokio::test]
async fn test_status_healthy() {
    let server = create_test_server().await;

    let resp = server.get("/status").await;
    resp.assert_status_ok();
    let body: serde_json::Value = resp.json();
    assert_eq!(body["healthy"], true);
    assert!(body["version"].as_str().unwrap().len() > 0);
    assert_eq!(body["contracts"]["coordinator"], "0xcoordinator");
    assert_eq!(body["contracts"]["pool"], "0xpool");
}

#[tokio::test]
async fn test_status_tree_info() {
    let state = create_test_state().await;
    let server = TestServer::new(create_test_router(state.clone())).unwrap();

    // Deposit to get a non-empty tree
    server
        .post("/deposit")
        .json(&json!({"commitment": "0xdead"}))
        .await
        .assert_status_ok();

    let resp = server.get("/status").await;
    resp.assert_status_ok();
    let body: serde_json::Value = resp.json();
    assert_eq!(body["tree"]["leaf_count"], 1);
    assert!(body["tree"]["root"].as_str().is_some());
}
