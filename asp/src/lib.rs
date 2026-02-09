pub mod api;
pub mod config;
pub mod db;
pub mod error;
pub mod prover;
pub mod relayer;
pub mod sync;

use tokio::sync::Mutex;

use crate::config::Config;
use crate::db::Database;
use crate::prover::Worker;
use crate::relayer::Relayer;

pub struct AppState {
    pub config: Config,
    pub db: Database,
    pub worker: Mutex<Worker>,
    pub relayer: Mutex<Box<dyn Relayer>>,
}
