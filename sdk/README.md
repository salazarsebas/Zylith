# @zylith/sdk

TypeScript client SDK for interacting with the Zylith shielded CLMM on Starknet.

## Features

- **Two proving modes**: Server-side (ASP) or client-side (snarkjs)
- **Full UTXO note management** with encrypted local storage
- **BN128 Poseidon** commitment and nullifier computation
- **Merkle tree** construction and proof generation
- **Typed ASP client** covering all 9 REST endpoints
- **Starknet contract readers** for pool state and coordinator queries
- **Circuit input builders** for membership, swap, mint, and burn proofs

## Installation

```bash
bun add @zylith/sdk
# or
npm install @zylith/sdk
```

## Quick Start

```typescript
import { ZylithClient } from "@zylith/sdk";

const client = new ZylithClient({
  starknetRpcUrl: "https://starknet-sepolia.g.alchemy.com/...",
  contracts: {
    pool: "0x...",
    coordinator: "0x...",
  },
  mode: "asp",
  aspUrl: "http://localhost:3000",
  password: "encryption-password-for-notes",
});

await client.init();

// Deposit into the shielded pool
const result = await client.deposit({
  token: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
  amount: 1000000000000000000n,
});

// Check shielded balance
const balance = client.getBalance("0x049d...");

// Execute a shielded swap
const swap = await client.swap({
  poolKey: { token_0: "0x...", token_1: "0x...", fee: 3000, tick_spacing: 60 },
  tokenIn: "0x...",
  amountIn: 500000000000000000n,
  amountOutMin: 490000000000000000n,
});
```

## Modules

| Module | Description |
|--------|-------------|
| `ZylithClient` | Main entry point — wraps all operations, queries, and note management |
| `AspClient` | HTTP client for the ASP REST API |
| `NoteManager` | Encrypted UTXO note storage (AES-256-GCM) |
| `ClientProver` | Local Groth16 proof generation via snarkjs |
| `PoolReader` | Read pool state, positions, and ticks from Starknet |
| `CoordinatorReader` | Read Merkle root, nullifiers, and pause state from Starknet |
| `MerkleTree` | BN128 Poseidon Merkle tree (height 20, LeanIMT) |

## Exports

```typescript
// Client
import { ZylithClient, AspClient } from "@zylith/sdk";

// Crypto (advanced)
import { initPoseidon, hash, computeCommitment, MerkleTree } from "@zylith/sdk";

// Starknet readers
import { PoolReader, CoordinatorReader, SEPOLIA_ADDRESSES } from "@zylith/sdk";

// Constants
import { TREE_HEIGHT, TICK_OFFSET, FEE_TIERS, BN254_SCALAR_FIELD } from "@zylith/sdk";

// Utilities
import { hexToDecimal, u256Split, generateRandomSecret } from "@zylith/sdk";
```

## Testing

```bash
bun test        # run once
bun test:watch  # watch mode
```

Tests cover crypto primitives, ASP client, operations, storage, and utility functions.

## Requirements

- Node.js 18+ or Bun
- For client-side proving: circuit artifacts in `artifacts/` (run `bun run copy-artifacts`)

## License

MIT
