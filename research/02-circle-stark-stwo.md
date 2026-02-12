# Circle STARK & STWO — Next-Generation Proving for Starknet

> **Relevance to Zylith: VERY HIGH**
> Migrating from Groth16/Garaga to STWO resolves Zylith's critical field mismatch problem, eliminates 4x 1.8MB verifier contracts, enables client-side proving, and removes the trusted setup requirement.

## Executive Summary

Circle STARK is a cryptographic breakthrough (March 2024) that enables STARK proofs over the Mersenne31 prime field (2^31 - 1), which offers ~127x faster arithmetic than the traditional Stark field. STWO ("STARK Two") is StarkWare's production implementation, deployed on Starknet mainnet since November 2025. It replaces the STONE prover with 100x overall efficiency improvement, 940x faster Poseidon hashing, and sub-3-minute block proving.

For Zylith, STWO represents the most impactful architectural upgrade: rewriting Circom circuits in Cairo and proving with STWO would eliminate the BN128/Stark Poseidon mismatch, remove 7.2MB of Garaga verifier contracts, enable browser-based proof generation, and make the protocol quantum-resistant — all without a trusted setup.

## Technical Deep Dive

### The Circle STARK Innovation

**The problem**: Traditional STARKs need fields whose multiplicative group has large power-of-two subgroups (for FFTs). The Mersenne31 prime (2^31 - 1) has blazing-fast arithmetic but its multiplicative group lacks this structure.

**The solution**: Instead of the multiplicative group, work with points on the circle `x^2 + y^2 = 1` over M31. This circle group has size `p + 1 = 2^31` — a perfect power-of-two.

```
Group operation: (x1,y1) + (x2,y2) = (x1*x2 - y1*y2, x1*y2 + x2*y1)
Doubling:        2*(x,y) = (2x^2 - 1, 2xy)
FRI folding map: x → 2x^2 - 1
```

**Key differences from traditional STARKs**:
- Polynomials defined "modulo the circle" (x^2 + y^2 - 1 = 0)
- Quotienting requires proving evaluations at two points simultaneously
- Vanishing polynomials recursively defined: Z1(x,y) = y, Z2(x,y) = x, Z_{n+1} = 2*Z_n^2 - 1
- Security via extension fields: quadratic (~2^62), quartic (~2^124)

Per Vitalik Buterin: the complexity is "encapsulated, not systemic" — concentrated in three areas rather than permeating the system.

### STWO vs STONE Comparison

| Aspect | STONE (Previous) | STWO (Current) |
|--------|------------------|-----------------|
| Field | Stark field (~2^251) | Mersenne31 (2^31 - 1) |
| Multiplication cost | ~38 CPU cycles | ~0.3 CPU cycles (vectorized) |
| STARK protocol | Traditional FRI | Circle FRI |
| Poseidon throughput | 530 hashes/sec | 600,000+ hashes/sec |
| Block proving time | ~24 minutes | Under 3 minutes |
| Client-side proving | Impractical | Feasible (phones/laptops) |
| Architecture | Closed/limited | Open-source Rust, multi-backend |

### Performance Benchmarks

- **940x faster** Poseidon hashing vs STONE
- **100x overall efficiency** improvement
- **28x faster** than competing ZK VMs (Risc0, SP1)
- **50% lower proving costs** for developers
- **500,000+** Poseidon hashes/second on quad-core Intel i7
- **600,000+** on M3 Pro
- **~20ms** recursive verification
- **2M+ proofs** generated across 5,000+ consumer devices (Cairo M alpha)

## Impact on Zylith

### Problem 1: Field Mismatch (CRITICAL — Resolved by STWO)

**Current state**: Zylith's Circom circuits use BN128-field Poseidon (BN254 scalar field), while Cairo uses Stark-field Poseidon. These are different fields — hash outputs never match. The workaround is admin root submission via `submit_merkle_root()`.

**With STWO**: Rewriting circuits in Cairo means all Poseidon hashing uses the same field. The Merkle tree can be computed in Cairo, proven with STWO, and verified natively. No admin root submission needed. The `_assert_known_root()` function works correctly for the first time.

### Problem 2: Garaga Contract Size (Resolved)

**Current state**: 4 Garaga verifier contracts at 1.8MB each = 7.2MB total. BN254 pairing math is inherently expensive.

**With STWO**: Replace with queries to the shared Integrity verifier (by Herodotus) or future STWO on-chain verifier. STARK verification is native to Starknet — no pairing operations needed.

### Problem 3: Trusted Setup (Eliminated)

**Current state**: Groth16 requires Powers of Tau ceremony + circuit-specific phase 2 for each of 4 circuits. If any circuit changes, a new ceremony is needed.

**With STWO**: STARK transparency — no trusted setup, no ceremony, no trust assumptions. Circuit updates require only re-proving.

### Problem 4: Client-Side Proving (Enabled)

**Current state**: Proofs generated server-side (ASP) or require heavy computation. Users must trust the ASP with their secret values.

**With STWO**: Client-side proving on phones and browsers via `stwo-cairo-ts`. Users generate proofs locally — secret values never leave the device. Paradex is already using this in production for privacy-preserving trading.

### Problem 5: Gas Costs (Reduced)

**Current state**: Garaga Groth16 verification costs ~(181 + 6 x N_PUBLIC_INPUTS) kgas. Zylith's circuits have 2-8 public inputs.

**With STWO**: Native Poseidon-based STARK verification is fundamentally cheaper. 50% proving cost reduction already live on Starknet.

## Migration Path

### Current Architecture
```
Circom circuits → snarkjs (Groth16 proof) → Garaga calldata → 4 Garaga verifiers (Cairo)
  → Coordinator (Cairo) → Pool (Cairo)
```

### Target Architecture (STWO)
```
Cairo circuits → STWO prover (client-side or server-side) → Integrity/STWO verifier (shared)
  → Coordinator (Cairo) → Pool (Cairo)
```

### Eliminated Dependencies
- Circom compiler
- snarkjs / rapidsnark
- circomlibjs
- Garaga CLI
- 4 separate Garaga verifier Scarb projects (scarb 2.14.0 toolchain)
- Powers of Tau ceremony files (1.2GB)
- BN254 field arithmetic workarounds (`u256` instead of `felt252`)

### Migration Steps

1. **Rewrite circuits in Cairo**: Port membership, swap, mint, burn logic from Circom to Cairo programs
2. **Prove with STWO**: Use `scarb prove` / `scarb verify` or STWO API directly
3. **On-chain verification**: Submit STARK proofs to Integrity verifier (fact registry pattern)
4. **Update coordinator**: Replace Garaga dispatch with Integrity fact queries
5. **Update SDK**: Replace snarkjs/circomlibjs with stwo-cairo-ts for client-side proving
6. **Remove old infrastructure**: Delete garaga_verifiers/, circuits/ build artifacts, snarkjs dependencies

### Current Status of STWO

| Component | Status |
|-----------|--------|
| STWO prover on mainnet | Live (every block proven) |
| `scarb prove` / `scarb verify` | Integrated in Cairo toolchain |
| stwo-cairo-ts (browser) | Available (clealabs) |
| Client-side proving SDK | In development |
| STWO on-chain verifier | Expected late 2025 / 2026 |
| Integrity verifier | Available (Herodotus) |
| Cairo M (client zkVM) | Alpha (2M+ proofs tested) |

### Blocker

The STWO on-chain verifier for application-level proof verification is the key dependency. The Integrity verifier by Herodotus is available but may need adaptation for Zylith's specific proof structure. Target timeline: Phase 3 (4-8 months).

## Comparison Table

| Dimension | Current (Groth16/Garaga) | Future (STWO/Cairo) |
|-----------|--------------------------|---------------------|
| Circuit language | Circom | Cairo |
| Prover | snarkjs/rapidsnark | STWO |
| Proof system | Groth16 (BN254) | Circle STARK (M31) |
| Verifier contracts | 4 x 1.8MB Garaga | Shared Integrity verifier |
| Field mismatch | BN128 != Stark Poseidon | Eliminated |
| Proof size | ~200 bytes | Kilobytes (fine on Starknet) |
| Client-side proving | Not feasible | Native capability |
| Trusted setup | Required | None |
| Quantum resistance | Vulnerable (BN254) | Resistant (hash-based) |
| Gas cost | ~181-229 kgas (pairing) | Lower (native Poseidon) |

## Recommendation for Zylith

| Timeframe | Action |
|-----------|--------|
| **Now** | Keep Groth16/Garaga for current deployment (functional) |
| **Phase 1** | Monitor STWO on-chain verifier status |
| **Phase 3 (4-8 months)** | Begin Cairo circuit rewrites; prototype with Integrity verifier |
| **Phase 3 (continued)** | Implement client-side proving via stwo-cairo-ts |
| **Phase 3 (final)** | Full migration; deprecate Garaga/Circom stack |

**Bottom line**: STWO migration is Zylith's single most impactful architectural upgrade. It resolves the critical Poseidon field mismatch, eliminates 7.2MB of verifier contracts, enables trustless client-side proving, removes the trusted setup, and aligns Zylith with Starknet's proving infrastructure roadmap.

## Sources

- [Why I'm Excited by Circle STARK and Stwo — StarkWare](https://starkware.co/integrity-matters-blog/why-im-excited-by-circle-stark-and-stwo/)
- [Circle STARKs — Vitalik Buterin](https://vitalik.eth.limo/general/2024/07/23/circlestarks.html)
- [S-two Is Live on Starknet Mainnet](https://www.starknet.io/blog/s-two-is-live-on-starknet-mainnet-the-fastest-prover-for-a-more-private-future/)
- [StarkWare Sets New Proving Record](https://starkware.co/blog/starkware-new-proving-record/)
- [Introducing S-two — StarkWare](https://starkware.co/blog/s-two-prover/)
- [Paradex Integrates S-two](https://starkware.co/blog/paradex-s-two-the-fastest-prover-meets-the-fastest-appchain/)
- [Integrity: Cairo STARK Proof Verifier — Herodotus](https://github.com/HerodotusDev/integrity)
- [stwo-cairo — GitHub](https://github.com/starkware-libs/stwo-cairo)
- [stwo-cairo-ts — GitHub](https://github.com/clealabs/stwo-cairo-ts)
- [stwo-gnark-verifier — Herodotus](https://github.com/HerodotusDev/stwo-gnark-verifier)
- [Scarb Prove and Verify](https://docs.swmansion.com/scarb/docs/extensions/prove-and-verify.html)
- [Cairo M: Client-Side Proving](https://www.hozk.io/articles/cairo-m-a-shift-to-client-side-proving)
