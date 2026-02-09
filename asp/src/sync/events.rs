use std::sync::Arc;
use std::time::Duration;

use num_bigint::BigUint;
use starknet::core::types::{BlockId, EmittedEvent, EventFilter, Felt};
use starknet::providers::jsonrpc::HttpTransport;
use starknet::providers::{JsonRpcClient, Provider};

use crate::error::AspError;
use crate::AppState;

/// Event selectors (sn_keccak of event name)
fn commitment_added_selector() -> Felt {
    starknet::core::utils::get_selector_from_name("CommitmentAdded").unwrap()
}

fn nullifier_spent_selector() -> Felt {
    starknet::core::utils::get_selector_from_name("NullifierSpent").unwrap()
}

/// Reconstruct a u256 from two consecutive felt252 values (low, high) as decimal string.
fn felts_to_decimal(low: &Felt, high: &Felt) -> String {
    let low_bytes = low.to_bytes_be();
    let high_bytes = high.to_bytes_be();
    let low_big = BigUint::from_bytes_be(&low_bytes);
    let high_big = BigUint::from_bytes_be(&high_bytes);
    let value: BigUint = (high_big << 128) | low_big;
    value.to_str_radix(10)
}

/// Parse a felt252 as a u32.
fn felt_to_u32(felt: &Felt) -> u32 {
    let bytes = felt.to_bytes_be();
    u32::from_be_bytes([bytes[28], bytes[29], bytes[30], bytes[31]])
}

/// Parsed CommitmentAdded event.
#[derive(Debug)]
struct CommitmentAddedEvent {
    commitment_decimal: String,
    leaf_index: u32,
}

/// Parsed NullifierSpent event.
#[derive(Debug)]
struct NullifierSpentEvent {
    nullifier_hash_decimal: String,
}

/// Parse a CommitmentAdded event from raw data.
/// Data layout: [commitment_low, commitment_high, leaf_index, new_root_low, new_root_high]
fn parse_commitment_added(event: &EmittedEvent) -> Option<CommitmentAddedEvent> {
    if event.data.len() < 5 {
        tracing::warn!(
            data_len = event.data.len(),
            "CommitmentAdded event has unexpected data length"
        );
        return None;
    }
    let commitment_decimal = felts_to_decimal(&event.data[0], &event.data[1]);
    let leaf_index = felt_to_u32(&event.data[2]);

    Some(CommitmentAddedEvent {
        commitment_decimal,
        leaf_index,
    })
}

/// Parse a NullifierSpent event from raw data.
/// Data layout: [nullifier_hash_low, nullifier_hash_high]
fn parse_nullifier_spent(event: &EmittedEvent) -> Option<NullifierSpentEvent> {
    if event.data.len() < 2 {
        tracing::warn!(
            data_len = event.data.len(),
            "NullifierSpent event has unexpected data length"
        );
        return None;
    }
    let nullifier_hash_decimal = felts_to_decimal(&event.data[0], &event.data[1]);

    Some(NullifierSpentEvent {
        nullifier_hash_decimal,
    })
}

/// Create a standalone provider for event polling (no account needed).
pub fn create_provider(rpc_url: &str) -> Result<JsonRpcClient<HttpTransport>, AspError> {
    let url =
        url::Url::parse(rpc_url).map_err(|e| AspError::Config(format!("Invalid RPC URL: {e}")))?;
    Ok(JsonRpcClient::new(HttpTransport::new(url)))
}

/// Fetch and process events from a block range.
/// Returns the number of new commitments and nullifiers processed.
async fn poll_events(
    provider: &JsonRpcClient<HttpTransport>,
    coordinator_address: Felt,
    from_block: u64,
    to_block: u64,
    state: &Arc<AppState>,
) -> Result<(usize, usize), AspError> {
    let commitment_selector = commitment_added_selector();
    let nullifier_selector = nullifier_spent_selector();

    // Collect all new leaves and nullifiers first, then batch-process
    let mut new_leaves: Vec<(u32, String)> = Vec::new();
    let mut new_nullifiers: Vec<String> = Vec::new();
    let mut continuation_token: Option<String> = None;

    loop {
        let filter = EventFilter {
            from_block: Some(BlockId::Number(from_block)),
            to_block: Some(BlockId::Number(to_block)),
            address: Some(coordinator_address),
            keys: None,
        };

        let events_page = provider
            .get_events(filter, continuation_token.clone(), 100)
            .await
            .map_err(|e| AspError::RpcError(format!("get_events failed: {e}")))?;

        for event in &events_page.events {
            if event.keys.is_empty() {
                continue;
            }
            let selector = &event.keys[0];

            if selector == &commitment_selector {
                if let Some(parsed) = parse_commitment_added(event) {
                    if state.db.get_commitment(parsed.leaf_index)?.is_none() {
                        new_leaves.push((parsed.leaf_index, parsed.commitment_decimal));
                    }
                }
            } else if selector == &nullifier_selector {
                if let Some(parsed) = parse_nullifier_spent(event) {
                    if !state.db.is_nullifier_spent(&parsed.nullifier_hash_decimal)? {
                        new_nullifiers.push(parsed.nullifier_hash_decimal);
                    }
                }
            }
        }

        match events_page.continuation_token {
            Some(token) => continuation_token = Some(token),
            None => break,
        }
    }

    // Batch insert new commitments into DB and worker tree (single lock)
    if !new_leaves.is_empty() {
        let mut worker = state.worker.lock().await;
        for (leaf_index, commitment) in &new_leaves {
            state
                .db
                .insert_commitment(*leaf_index, commitment, None)?;
            worker.insert_leaf(commitment).await?;
            tracing::debug!(leaf_index = leaf_index, "Synced CommitmentAdded");
        }
        drop(worker);
    }

    // Batch insert nullifiers
    for nullifier in &new_nullifiers {
        state.db.insert_nullifier(nullifier, "synced", None)?;
        tracing::debug!(nullifier = %nullifier, "Synced NullifierSpent");
    }

    Ok((new_leaves.len(), new_nullifiers.len()))
}

/// Submit the current Merkle root on-chain if it differs from the last submitted root.
async fn submit_root_if_changed(state: &Arc<AppState>) -> Result<(), AspError> {
    let leaf_count = state.db.get_leaf_count()?;
    if leaf_count == 0 {
        return Ok(());
    }

    // Get current root directly from worker (no rebuild needed)
    let mut worker = state.worker.lock().await;
    let current_root = worker.get_root().await?;
    drop(worker);

    // Compare with last submitted root
    let last_root = state.db.get_latest_root()?;
    if last_root.as_deref() == Some(current_root.as_str()) {
        return Ok(());
    }

    tracing::info!(
        new_root = %current_root,
        leaf_count = leaf_count,
        "Submitting new Merkle root"
    );

    let relayer = state.relayer.lock().await;
    let tx_hash = relayer.submit_merkle_root(&current_root).await?;
    drop(relayer);

    state
        .db
        .insert_root(&current_root, leaf_count, Some(&tx_hash))?;

    tracing::info!(tx_hash = %tx_hash, "Merkle root submitted");
    Ok(())
}

/// Background task: continuously polls Starknet events and syncs local state.
pub async fn start_event_sync(state: Arc<AppState>, poll_interval_secs: u64) {
    let provider = match create_provider(&state.config.rpc_url) {
        Ok(p) => p,
        Err(e) => {
            tracing::error!(error = %e, "Failed to create provider for event sync");
            return;
        }
    };

    let coordinator_address = match Felt::from_hex(&state.config.coordinator_address) {
        Ok(addr) => addr,
        Err(e) => {
            tracing::error!(error = %e, "Invalid coordinator address for event sync");
            return;
        }
    };

    let interval = Duration::from_secs(poll_interval_secs);

    tracing::info!(
        interval_secs = poll_interval_secs,
        coordinator = %state.config.coordinator_address,
        "Event sync started"
    );

    loop {
        if let Err(e) = sync_once(&provider, coordinator_address, &state).await {
            tracing::warn!(error = %e, "Event sync cycle failed, will retry");
        }
        tokio::time::sleep(interval).await;
    }
}

/// Run a single sync cycle: fetch latest block, poll events, submit root if needed.
async fn sync_once(
    provider: &JsonRpcClient<HttpTransport>,
    coordinator_address: Felt,
    state: &Arc<AppState>,
) -> Result<(), AspError> {
    let latest_block = provider
        .block_number()
        .await
        .map_err(|e| AspError::RpcError(format!("block_number failed: {e}")))?;

    let last_synced = state
        .db
        .get_sync_state("last_block")?
        .and_then(|s| s.parse::<u64>().ok())
        .unwrap_or(0);

    if latest_block <= last_synced {
        return Ok(());
    }

    let from_block = last_synced + 1;
    let (new_commitments, new_nullifiers) =
        poll_events(provider, coordinator_address, from_block, latest_block, state).await?;

    if new_commitments > 0 || new_nullifiers > 0 {
        tracing::info!(
            new_commitments,
            new_nullifiers,
            from_block,
            to_block = latest_block,
            "Events synced"
        );
    }

    // Submit root on-chain if tree changed from external commitments
    if new_commitments > 0 {
        if let Err(e) = submit_root_if_changed(state).await {
            tracing::warn!(error = %e, "Failed to submit updated root");
        }
    }

    state
        .db
        .set_sync_state("last_block", &latest_block.to_string())?;

    Ok(())
}
