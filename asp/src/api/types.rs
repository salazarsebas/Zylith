use serde::{Deserialize, Serialize};

use crate::relayer::PoolKeyParams;

// --- Deposit ---

#[derive(Debug, Deserialize)]
pub struct DepositRequest {
    pub commitment: String,
}

#[derive(Debug, Serialize)]
pub struct DepositResponse {
    pub status: String,
    pub leaf_index: u32,
    pub tx_hash: String,
    pub root: String,
    pub root_tx_hash: String,
}

// --- Withdraw (membership) ---

#[derive(Debug, Deserialize)]
pub struct WithdrawRequest {
    pub secret: String,
    pub nullifier: String,
    pub amount_low: String,
    pub amount_high: String,
    pub token: String,
    pub leaf_index: u32,
}

#[derive(Debug, Serialize)]
pub struct WithdrawResponse {
    pub status: String,
    pub tx_hash: String,
    pub nullifier_hash: String,
}

// --- Swap ---

#[derive(Debug, Deserialize)]
pub struct SwapRequest {
    pub pool_key: PoolKeyParams,
    pub input_note: NoteInput,
    pub swap_params: SwapParams,
    pub output_note: NoteSecrets,
    pub change_note: NoteSecrets,
    pub sqrt_price_limit: String,
}

#[derive(Debug, Deserialize)]
pub struct SwapParams {
    pub token_in: String,
    pub token_out: String,
    pub amount_in: String,
    pub amount_out_min: String,
    pub amount_out_low: String,
    pub amount_out_high: String,
}

#[derive(Debug, Serialize)]
pub struct SwapResponse {
    pub status: String,
    pub tx_hash: String,
    pub new_commitment: String,
    pub change_commitment: String,
}

// --- Mint ---

#[derive(Debug, Deserialize)]
pub struct MintRequest {
    pub pool_key: PoolKeyParams,
    pub input_note_0: NoteInput,
    pub input_note_1: NoteInput,
    pub position: PositionInput,
    pub amounts: MintAmounts,
    pub change_note_0: NoteSecrets,
    pub change_note_1: NoteSecrets,
    pub liquidity: u128,
}

#[derive(Debug, Deserialize)]
pub struct PositionInput {
    pub secret: String,
    pub nullifier: String,
    pub liquidity: String,
    pub tick_lower: i32,
    pub tick_upper: i32,
}

#[derive(Debug, Deserialize)]
pub struct MintAmounts {
    pub amount0_low: String,
    pub amount0_high: String,
    pub amount1_low: String,
    pub amount1_high: String,
}

#[derive(Debug, Serialize)]
pub struct MintResponse {
    pub status: String,
    pub tx_hash: String,
    pub position_commitment: String,
    pub change_commitment_0: String,
    pub change_commitment_1: String,
}

// --- Burn ---

#[derive(Debug, Deserialize)]
pub struct BurnRequest {
    pub pool_key: PoolKeyParams,
    pub position_note: PositionNoteInput,
    pub output_note_0: OutputNoteInput,
    pub output_note_1: OutputNoteInput,
    pub liquidity: u128,
}

#[derive(Debug, Deserialize)]
pub struct PositionNoteInput {
    pub secret: String,
    pub nullifier: String,
    pub liquidity: String,
    pub tick_lower: i32,
    pub tick_upper: i32,
    pub leaf_index: u32,
}

#[derive(Debug, Deserialize)]
pub struct OutputNoteInput {
    pub secret: String,
    pub nullifier: String,
    pub amount_low: String,
    pub amount_high: String,
    pub token: String,
}

#[derive(Debug, Serialize)]
pub struct BurnResponse {
    pub status: String,
    pub tx_hash: String,
    pub new_commitment_0: String,
    pub new_commitment_1: String,
}

// --- Shared types ---

#[derive(Debug, Deserialize)]
pub struct NoteInput {
    pub secret: String,
    pub nullifier: String,
    pub balance_low: String,
    pub balance_high: String,
    pub token: String,
    pub leaf_index: u32,
}

#[derive(Debug, Deserialize)]
pub struct NoteSecrets {
    pub secret: String,
    pub nullifier: String,
}

// --- Tree ---

#[derive(Debug, Serialize)]
pub struct TreeRootResponse {
    pub root: String,
    pub leaf_count: u32,
}

#[derive(Debug, Serialize)]
pub struct TreeProofResponse {
    pub leaf_index: u32,
    pub commitment: String,
    pub path_elements: Vec<String>,
    pub path_indices: Vec<u32>,
    pub root: String,
}

// --- Nullifier ---

#[derive(Debug, Serialize)]
pub struct NullifierResponse {
    pub nullifier_hash: String,
    pub spent: bool,
    pub circuit_type: Option<String>,
    pub tx_hash: Option<String>,
}

// --- Status ---

#[derive(Debug, Serialize)]
pub struct StatusResponse {
    pub healthy: bool,
    pub version: String,
    pub tree: TreeStatus,
    pub contracts: ContractAddresses,
}

#[derive(Debug, Serialize)]
pub struct TreeStatus {
    pub leaf_count: u32,
    pub root: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ContractAddresses {
    pub coordinator: String,
    pub pool: String,
}
