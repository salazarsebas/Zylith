/**
 * ASP (Anonymous Service Provider) request/response types.
 * Field names match the Rust API serialization (snake_case).
 * Source: asp/src/api/types.rs
 */

// ============================================================================
// Shared Input Types
// ============================================================================

export interface PoolKeyParams {
  token_0: string;
  token_1: string;
  fee: number;
  tick_spacing: number;
}

export interface NoteInput {
  secret: string;
  nullifier: string;
  balance_low: string;
  balance_high: string;
  token: string;
  leaf_index: number;
}

export interface NoteSecrets {
  secret: string;
  nullifier: string;
}

export interface OutputNoteInput {
  secret: string;
  nullifier: string;
  amount_low: string;
  amount_high: string;
  token: string;
}

// ============================================================================
// Deposit
// ============================================================================

export interface DepositRequest {
  commitment: string;
}

export interface DepositResponse {
  status: string;
  leaf_index: number;
  calldata: string[]; // Calldata for user to submit via wallet
  root: string;
}

// ============================================================================
// Withdraw (Membership)
// ============================================================================

export interface WithdrawRequest {
  secret: string;
  nullifier: string;
  amount_low: string;
  amount_high: string;
  token: string;
  recipient: string;
  leaf_index: number;
}

export interface WithdrawResponse {
  status: string;
  tx_hash: string;
  nullifier_hash: string;
}

// ============================================================================
// Swap
// ============================================================================

export interface SwapParams {
  token_in: string;
  token_out: string;
  amount_in: string;
  amount_out_min: string;
  amount_out_low: string;
  amount_out_high: string;
}

export interface SwapRequest {
  pool_key: PoolKeyParams;
  input_note: NoteInput;
  swap_params: SwapParams;
  output_note: NoteSecrets;
  change_note: NoteSecrets;
  sqrt_price_limit: string;
}

export interface SwapResponse {
  status: string;
  tx_hash: string;
  new_commitment: string;
  change_commitment: string;
}

// ============================================================================
// Mint
// ============================================================================

export interface PositionInput {
  secret: string;
  nullifier: string;
  liquidity: string;
  tick_lower: number;
  tick_upper: number;
}

export interface MintAmounts {
  amount0_low: string;
  amount0_high: string;
  amount1_low: string;
  amount1_high: string;
}

export interface MintRequest {
  pool_key: PoolKeyParams;
  input_note_0: NoteInput;
  input_note_1: NoteInput;
  position: PositionInput;
  amounts: MintAmounts;
  change_note_0: NoteSecrets;
  change_note_1: NoteSecrets;
  liquidity: number;
}

export interface MintResponse {
  status: string;
  tx_hash: string;
  position_commitment: string;
  change_commitment_0: string;
  change_commitment_1: string;
}

// ============================================================================
// Burn
// ============================================================================

export interface PositionNoteInput {
  secret: string;
  nullifier: string;
  liquidity: string;
  tick_lower: number;
  tick_upper: number;
  leaf_index: number;
}

export interface BurnRequest {
  pool_key: PoolKeyParams;
  position_note: PositionNoteInput;
  output_note_0: OutputNoteInput;
  output_note_1: OutputNoteInput;
  liquidity: number;
}

export interface BurnResponse {
  status: string;
  tx_hash: string;
  new_commitment_0: string;
  new_commitment_1: string;
}

// ============================================================================
// Tree Queries
// ============================================================================

export interface TreeRootResponse {
  root: string;
  leaf_count: number;
}

export interface TreeProofResponse {
  leaf_index: number;
  commitment: string;
  path_elements: string[];
  path_indices: number[];
  root: string;
}

// ============================================================================
// Nullifier Queries
// ============================================================================

export interface NullifierResponse {
  nullifier_hash: string;
  spent: boolean;
  circuit_type: string | null;
  tx_hash: string | null;
}

// ============================================================================
// Status
// ============================================================================

export interface StatusResponse {
  healthy: boolean;
  version: string;
  tree: {
    leaf_count: number;
    root: string | null;
  };
  sync: {
    last_synced_block: number | null;
  };
  contracts: {
    coordinator: string;
    pool: string;
  };
}
