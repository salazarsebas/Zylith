# Technical Debt & Implementation Gaps Analysis

> **Priority: CRITICAL**
> This analysis identifies 40+ issues across Cairo contracts, ASP server, SDK, frontend, and deployment. Items are prioritized by severity and blocking potential for production deployment.

## Critical Issues (Production Blockers)

### 1. Frontend: Not Bitcoin-First

**Severity**: HIGH | **Files**: `frontend/src/config/tokens.ts`

The frontend only configures ETH and STRK as testnet tokens. Zylith's tagline is "Shielded Liquidity for Bitcoin on Starknet" but there are zero Bitcoin tokens in the application.

**Current state**:
```typescript
TESTNET_TOKENS = [
  { symbol: "ETH", name: "Ether", address: "0x049d...", decimals: 18 },
  { symbol: "STRK", name: "Starknet Token", address: "0x04718...", decimals: 18 }
]
```

**Required state**: tBTC, WBTC, LBTC as primary tokens; ETH, STRK, USDC as secondary. See `03-bitcoin-tokens-starknet.md` for verified contract addresses.

### 2. ASP: Keystore Decryption Not Implemented

**Severity**: CRITICAL | **File**: `asp/src/relayer/starknet.rs:360-373`

Keystore decryption falls back to `ADMIN_PRIVATE_KEY` env var. Line 366: "Implement proper keystore decryption. For now, support a simple format..."

**Impact**: Cannot use encrypted keystores in production. Private key stored as plaintext environment variable is a security risk.

**Fix**: Implement starknet-rs keystore decryption algorithm.

### 3. ASP: Rate Limiting Not Applied

**Severity**: HIGH | **Files**: `asp/Cargo.toml`, `asp/src/api/middleware.rs`

`governor` crate is imported but rate limiting is never applied to routes. The middleware skeleton exists but the actual limiter is not wired.

**Impact**: No DDoS protection on API endpoints.

### 4. ASP: Worker Health Checks Missing

**Severity**: HIGH | **File**: `asp/src/prover/worker.rs:33-79`

Worker spawning has no timeout for "ready" signal and no recovery on crash. If the Bun worker hangs, the server hangs indefinitely.

**Fix**: Add ready signal timeout (e.g., 30s), worker restart logic, graceful degradation.

### 5. Poseidon Hash Mismatch (Known, Workaround in Place)

**Severity**: CRITICAL (architectural) | **Status**: Workaround active

BN128-field Poseidon (Circom) != Stark-field Poseidon (Cairo). Admin root submission via `submit_merkle_root()` is the current workaround. Long-term fix: STWO migration (see `02-circle-stark-stwo.md`).

## High Severity Issues

### 6. ASP: Proof Job Status Tracking

**Files**: `asp/src/db/schema.rs`, `asp/src/prover/*.rs`

Database has `proof_jobs` table but no handler code uses it. No implementation for persisting proof generation jobs, querying status, or retrying failed proofs.

### 7. Cairo: Unsafe `try_into().unwrap()` Patterns

**Files**: `src/clmm/swap.cairo`, `src/clmm/math/*.cairo`

Multiple instances of `try_into().unwrap()` that panic on overflow:
- Line 301: `liquidity_delta: i128 = amount.try_into().unwrap();`
- Line 390: `neg_delta: i128 = -(amount.try_into().unwrap());`
- Lines 1005-1056: Tick spacing conversions

**Fix**: Replace with proper error propagation or validated conversions.

### 8. ASP: Event Sync Error Recovery

**File**: `asp/src/sync/events.rs`

Event sync spawned as fire-and-forget with no error recovery. If sync dies, coordinator state drifts from on-chain state.

**Fix**: Add watchdog task, reconnection logic, alerting.

### 9. Missing Proof Expiration Validation

**Files**: `asp/src/db/schema.rs`, verifier contracts

No check for proof freshness. Stale proofs from old states could potentially be replayed.

**Fix**: Add timestamp or block-number validation to proof verification.

### 10. Hardcoded Chain ID in Relayer

**File**: `asp/src/relayer/starknet.rs:40-42`

Hardcoded Sepolia chain ID. No mainnet/testnet flexibility.

**Fix**: Move to configuration.

### 11. Configuration: Silent Defaults

**File**: `asp/src/config.rs`

Config loader uses many `.unwrap_or()` with defaults. Missing required env vars silently use defaults, causing subtle bugs (e.g., wrong RPC URL, wrong port).

**Fix**: Validate all critical env vars at startup, fail fast with clear error messages.

### 12. No CI/CD Pipeline

No `.github/` directory. No automated testing, linting, or deployment.

**Fix**: Create GitHub Actions workflows for:
- Cairo `scarb test` + `scarb build`
- ASP `cargo test` + `cargo clippy`
- SDK `bun test`
- Frontend `bun build`

## Medium Severity Issues

### 13. Exact Output Swap Not Implemented

**File**: `src/pool/contract.cairo:497`

Comment: "Only support exact input for now (positive amount_specified)". Exact output swaps are not implemented.

### 14. Missing E2E Integration Tests

11 integration tests exist but don't cover:
- Full shielded swap → coordinator → pool state update flow
- Deposit → proof generation → verify lifecycle
- Nullifier double-spend prevention across coordinator and pool
- Event sync from on-chain → ASP state consistency

### 15. ASP: Database Migration Versioning

**File**: `asp/src/db/schema.rs:19-61`

Migrations run at startup with no versioning. Cannot roll back or verify schema state.

**Fix**: Add versioned migrations (e.g., `migration_001_init.sql`).

### 16. ASP: Magic Numbers

**File**: `asp/src/relayer/starknet.rs:296`

Hardcoded `max_retries = 60, delay = 2 seconds`. Should be configurable.

### 17. Missing Health Check Endpoint

ASP server has no `/health` endpoint for monitoring.

**Fix**: Add endpoint returning database + worker + sync status.

### 18. No Gas Benchmarks

No profiling of:
- Groth16 verification gas costs per circuit
- Pool operation gas costs
- Coordinator operation gas costs

### 19. Missing Monitoring/Metrics

No observability infrastructure:
- No Prometheus metrics
- No structured logging (beyond basic request logging)
- No alerting for anomalies

### 20. No Docker Setup

No Dockerfile for ASP server. Manual deployment only.

### 21. SDK Documentation Gaps

No JSDoc comments, no usage examples, no integration guides in `@zylith/sdk`.

### 22. Wallet: No Xverse Integration

Frontend only supports Argent + Braavos. No Bitcoin-native wallet (Xverse) support.

### 23. Frontend: No Bitcoin-Denominated Display

Amounts displayed in raw decimal format. No sats formatting option for BTC tokens.

## Low Severity Issues

### 24. Incomplete Error Messages in Cairo

Some Cairo error cases use numeric felt252 codes without descriptive text.

### 25. Commented Code Cleanup

Minimal but some garaga verifier files have auto-generated boilerplate.

### 26. Unused Imports

Some test files import types not directly referenced (implicitly used by extract functions).

### 27. Worker Path Configuration

**File**: `asp/src/config.rs`

Defaults to `./asp/worker/index.ts` which may not exist relative to runtime location.

### 28. SDK Circuit Artifact Copy

**File**: `sdk/package.json:23`

`copy-artifacts` script uses `2>/dev/null || echo ...` (best-effort). Should be mandatory.

## Security-Specific Issues

### 29. Access Control Audit Needed

Some functions that should be admin-only lack explicit access control checks. Need systematic audit of all sensitive functions across pool and coordinator contracts.

### 30. No Compliance Mechanism

Zero compliance features. No viewing keys, no auditor keys, no selective disclosure. This is the same regulatory risk that led to Tornado Cash sanctions. (See `01-tongo-cash.md` for Tongo's compliance model.)

### 31. No Transaction Ordering Guarantees

ASP can't guarantee deposits are processed in order if multiple requests arrive simultaneously. Could create inconsistent Merkle trees.

### 32. No Proof Result Deduplication

If a proof is generated twice, both results are accepted. Waste of computation.

## Summary Table

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Frontend | 1 (Bitcoin-first) | 1 (Xverse) | 2 | — |
| ASP Server | 1 (keystore) | 4 (rate limit, worker, sync, jobs) | 5 | 2 |
| Cairo Contracts | 1 (field mismatch) | 1 (unwrap) | 2 | 2 |
| Security | — | 2 (proof expiry, compliance) | 2 | — |
| Infrastructure | — | 1 (CI/CD) | 4 (Docker, metrics, health, gas) | — |
| SDK/Docs | — | — | 2 | 1 |
| **Total** | **3** | **9** | **17** | **5** |

## Recommended Fix Order

1. Frontend Bitcoin tokens (immediate — brand credibility)
2. ASP keystore decryption (blocks production)
3. CI/CD pipeline (enables safe iteration)
4. ASP rate limiting (security)
5. Worker health checks (reliability)
6. Configuration validation (fail fast)
7. Health check endpoint (monitoring)
8. Cairo unwrap patterns (safety)
9. Xverse wallet integration (Bitcoin users)
10. Proof job tracking (feature completeness)
