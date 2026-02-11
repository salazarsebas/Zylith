# Zylith ASP (Anonymous Service Provider)

Backend server that manages the off-chain Merkle tree, generates Groth16 proofs, and relays shielded transactions to Starknet on behalf of users.

## Architecture

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│  SDK / User  │──────▶│   ASP Server │──────▶│   Starknet   │
│   (HTTP)     │       │   (Axum)     │       │  (Sequencer) │
└──────────────┘       └──────┬───────┘       └──────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
              ┌─────▼─────┐     ┌───────▼──────┐
              │  SQLite DB │     │  Bun Worker  │
              │ (rusqlite) │     │  (snarkjs +  │
              └────────────┘     │   garaga)    │
                                 └──────────────┘
```

| Module | Description |
|--------|-------------|
| `api/` | Axum handlers, routing, validation, rate limiting |
| `db/` | SQLite schema and queries (commitments, nullifiers, roots, jobs) |
| `prover/` | Spawns a long-lived Bun worker for Merkle tree ops and proof generation |
| `relayer/` | `Relayer` trait + `StarknetRelayer` for on-chain transaction submission |
| `sync/` | Background event polling to track on-chain state |
| `worker/` | Node.js/Bun process (NDJSON over stdin/stdout) using circomlibjs + snarkjs + garaga |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/deposit` | Register a commitment in the Merkle tree |
| `POST` | `/withdraw` | Generate membership proof and verify on-chain |
| `POST` | `/swap` | Execute a shielded swap with Groth16 proof |
| `POST` | `/mint` | Provide shielded liquidity with Groth16 proof |
| `POST` | `/burn` | Remove shielded liquidity with Groth16 proof |
| `GET` | `/tree/root` | Get current Merkle root and leaf count |
| `GET` | `/tree/path/{leaf_index}` | Get Merkle inclusion proof for a leaf |
| `GET` | `/nullifier/{hash}` | Check if a nullifier has been spent |
| `GET` | `/status` | Health check, tree state, sync status |

## Prerequisites

- **Rust** 1.75+
- **Bun** (or Node.js 18+) for the proof worker
- **garaga** CLI in `$PATH` (for Groth16 calldata generation)
- Compiled circuit artifacts in `../circuits/build/`

## Setup

```bash
# Install worker dependencies
cd worker && bun install && cd ..

# Copy and configure environment
cp .env.example .env
# Edit .env with your RPC URL, admin keys, and contract addresses

# Build
cargo build --release

# Run
cargo run --release
```

## Configuration

Environment variables (loaded from `.env`):

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `STARKNET_RPC_URL` | Yes | - | Starknet JSON-RPC endpoint |
| `ADMIN_ADDRESS` | Yes | - | Admin account address for relaying txs |
| `KEYSTORE_PATH` | Yes | - | Path to Starknet keystore file |
| `KEYSTORE_PASSWORD` | Yes | - | Keystore decryption password |
| `ASP_HOST` | No | `127.0.0.1` | Server bind address |
| `ASP_PORT` | No | `3000` | Server port |
| `DATABASE_PATH` | No | `zylith_asp.db` | SQLite database file path |
| `SYNC_POLL_INTERVAL_SECS` | No | `5` | On-chain event polling interval |

Contract addresses are auto-loaded from `../scripts/deployed_addresses.json`. Override with `COORDINATOR_ADDRESS` and `POOL_ADDRESS` env vars if needed.

## Testing

```bash
cargo test
```

Integration tests use a `MockRelayer` and in-memory SQLite — no Starknet connection required.

## License

MIT
