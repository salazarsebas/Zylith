# Tongo Cash — Confidential Payments on Starknet

> **Relevance to Zylith: HIGH**
> Tongo solves the complementary half of DeFi privacy — amount confidentiality — while Zylith solves address unlinkability. Together they could provide comprehensive privacy.

## Executive Summary

Tongo Cash is a confidential payments platform for ERC-20 tokens on Starknet, built by Fat Solutions. Unlike Zylith's Tornado Cash-style commitment/nullifier model that breaks the link between sender and recipient, Tongo uses ElGamal encryption over the Stark curve to hide transfer amounts while keeping addresses visible. It requires no trusted setup, no external infrastructure, and achieves sub-second client-side proving with ~120,000 Cairo steps per verified transfer at ~$0.00005 cost.

**Key insight**: Tongo and Zylith solve different halves of the privacy problem. Tongo hides *how much*; Zylith hides *who*. A combined approach could provide complete DeFi privacy on Starknet.

## Technical Architecture

### Cryptographic Foundation

Tongo is based on the **Zether protocol** (eprint.iacr.org/2019/191) and **PGC** (eprint.iacr.org/2019/319), adapted for Starknet:

1. **ElGamal Encryption over the Stark Curve**: Balances are stored as ciphertexts on-chain. ElGamal is additively homomorphic when messages are encoded in the exponent, enabling the smart contract to update encrypted balances without decryption.

2. **Sigma Protocols (Fiat-Shamir)**: Each transfer includes non-interactive ZK proofs verifying:
   - Transfer amount is non-negative (range proof)
   - Sender has sufficient balance
   - Encrypted arithmetic is correct

3. **Custom proof schemes**: POE/POE2/POEN (proof of exponent), SameEncryption protocol, bit proofs for range validation.

### User Flow

```
1. Fund    → Deposit ERC-20 tokens → Receive encrypted balance (ElGamal ciphertext)
2. Transfer → Send encrypted amount → Contract homomorphically updates both balances
3. Withdraw → Convert encrypted balance → Receive standard ERC-20 tokens
```

### Performance Characteristics

| Metric | Value |
|--------|-------|
| On-chain verification | ~120,000 Cairo steps |
| Client-side proving | < 1 second |
| Transfer cost | ~$0.00005 |
| Trusted setup | None (Sigma protocols) |
| External infrastructure | None |

## Comparison: Tongo vs Zylith Privacy Models

| Feature | Zylith (Tornado Cash Pattern) | Tongo Cash |
|---------|-------------------------------|------------|
| **What is hidden** | Link between sender/recipient | Transfer amounts and balances |
| **What is visible** | Deposit/withdrawal amounts | Sender and recipient addresses |
| **ZK proof system** | Groth16 SNARKs (BN254) | Sigma protocols (Stark curve) |
| **Trusted setup** | Required (Powers of Tau) | None |
| **On-chain data** | Merkle tree + nullifiers | ElGamal ciphertexts |
| **Composability** | Poor (funds locked in pool) | Good (homomorphic operations) |
| **Compliance** | Difficult (no selective disclosure) | Built-in (auditor keys) |
| **Infrastructure** | Needs ASP/relayer | Self-contained |
| **Field** | BN254 (causes mismatch with Stark) | Stark curve (native) |
| **Verification cost** | ~181-229 kgas (Garaga pairing) | ~120K Cairo steps (native) |

## Compliance Model (Critical Differentiator)

Tongo's compliance framework is cryptographically integrated, not bolted on:

1. **Auditor Keys (Global)**: A designated auditor holds a decryption key that can decrypt all transfer amounts. Built into the ElGamal scheme — ciphertexts are encrypted under both recipient's and auditor's keys.

2. **Selective Disclosure (Per-User)**: Users generate viewing keys for specific third parties (tax accountant, regulator, lender) without exposing data to everyone.

3. **No Vendor Lock-in**: Purely cryptographic — no hardware dependencies (unlike TEE/FHE solutions).

**Contrast with Zylith**: Zylith currently has zero compliance mechanism. The Tornado Cash anonymity set makes retroactive compliance difficult. This is a significant regulatory risk.

## Relevance to Zylith

### What Zylith Can Learn

1. **Compliance-first design**: Add optional viewing keys and auditor capabilities to shielded operations via the ASP layer. Without compliance, Zylith faces the same regulatory risk that led to Tornado Cash sanctions.

2. **No trusted setup**: Tongo's Sigma protocols over the Stark curve eliminate the Groth16 ceremony burden. This aligns with the STWO migration path (see `02-circle-stark-stwo.md`).

3. **Native field operations**: Tongo uses the Stark curve natively, avoiding the BN254/Stark field mismatch that plagues Zylith's current architecture (Poseidon hash mismatch, `u256` workarounds for BN254 outputs).

4. **Homomorphic composability**: Encrypted balances can be manipulated without decryption — theoretically enabling encrypted CLMM computations (liquidity tracking, fee calculation, swap amounts).

### Integration Possibilities

| Option | Complexity | Impact | Timeline |
|--------|------------|--------|----------|
| Study compliance model, add auditor keys to ASP | Low | High | Phase 2 |
| Accept Tongo-wrapped tokens as pool assets | Medium | Medium | Phase 5 |
| Hybrid architecture (Tongo amounts + Zylith addresses) | Very High | Very High | Phase 6 |
| Replace Groth16 with Sigma protocols for amount-only privacy | High | High | Phase 3+ |

### Challenges

- Tongo's repository appears private (limited code inspection)
- SDK still under active development
- Fundamental architectural differences: encryption-based vs commitment-based — combining is non-trivial
- Fat Solutions is a small team focused on their own products

## Recommendation for Zylith

| Timeframe | Action |
|-----------|--------|
| **Immediate** | Study Tongo's compliance model (auditor keys, selective disclosure) |
| **Short-term (Phase 2)** | Add compliance capabilities to ASP: optional viewing keys, selective disclosure for shielded positions |
| **Medium-term (Phase 3)** | Evaluate Sigma protocols over Stark curve as replacement for some Groth16 operations |
| **Long-term (Phase 6)** | Explore hybrid architecture combining Tongo's amount confidentiality with Zylith's address privacy |

**Bottom line**: Tongo is the most architecturally significant discovery for Zylith's future. Its compliance-first approach addresses Zylith's biggest regulatory blind spot, and its Stark-native cryptography shows the path beyond Groth16/Garaga.

## Sources

- [Tongo Cash Official Website](https://www.tongo.cash/)
- [Tongo Documentation](https://docs.tongo.cash/)
- [Tongo Sigma Protocol Specifications](https://docs.tongo.cash/she/sigma.html)
- [Fat Solutions](https://fatsolutions.xyz/)
- [StarkWare — Blockchain Privacy](https://starkware.co/blog/blockchain-privacy/)
- [Starknet 2025 Year in Review](https://www.starknet.io/blog/starknet-2025-year-in-review/)
- [Zether Paper (eprint.iacr.org/2019/191)](https://eprint.iacr.org/2019/191.pdf)
- [PGC Paper (eprint.iacr.org/2019/319)](https://eprint.iacr.org/2019/319)
- [Circle Confidential ERC-20 Framework](https://www.circle.com/blog/confidential-erc-20-framework-for-compliant-on-chain-privacy)
