// Event synchronization - polls Starknet for CommitmentAdded and NullifierSpent events.
// Will be implemented in Milestone 3+ when background sync is needed.

/// Placeholder for the event sync background task.
/// In M1, tree state is managed directly by deposit handler.
pub async fn _start_event_sync() {
    // TODO: Implement continuous event polling from coordinator contract
    // - Poll every ~5 seconds
    // - Process CommitmentAdded events: insert into local tree + DB
    // - Process NullifierSpent events: mark in DB
    // - After new commitments, compute new root and submit_merkle_root if changed
    tracing::info!("Event sync not yet implemented (Milestone 3)");
}
