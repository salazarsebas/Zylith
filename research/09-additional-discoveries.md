# Additional Discoveries — Tools & Infrastructure for Zylith

> **Relevance: MEDIUM**
> These tools were discovered during research on the primary topics. Each addresses a specific gap in Zylith's current architecture.

## 1. StarknetKit — Social Login Alternative to Cavos

**What**: A toolkit providing social login capabilities that plug directly into `@starknet-react/core`.

**Why it matters**: Unlike Cavos (deprecated/unstable), StarknetKit works with Zylith's existing provider architecture. No parallel wallet system needed.

**Features**:
- Social login (Google, Apple, email) through multiple wallet providers
- AVNU Paymaster integration for gasless transactions
- Broader community adoption than Cavos
- Compatible with existing starknet-react hooks

**Recommendation**: Use StarknetKit for social login when targeting non-crypto-native users (Phase 2+). Lower priority than Xverse (which targets Bitcoin-native users).

**Source**: [starknetkit.com](https://www.starknetkit.com/)

## 2. Privacy Pools (0xBow) — Compliance Inspiration

**What**: Privacy Pools on Starknet (by 0xBow + Fat Solutions) implement a compliance-compatible privacy system using Association Set Providers (ASPs).

**Why it matters**: Fat Solutions (builders of Tongo Cash) also maintain Privacy Pools' SDK and Relayer for Starknet. This validates the ASP compliance pattern.

**Key concept**: ASPs maintain "good" and "bad" inclusion/exclusion sets. Users prove their deposit is in the "good" set without revealing which deposit is theirs. This satisfies regulators while preserving privacy.

**Relevance to Zylith**: Zylith's ASP could adopt a similar compliance layer — allowing users to prove they're not using sanctioned funds while maintaining transaction privacy.

**Source**: [starknet.privacypools.com](https://starknet.privacypools.com/), [StarkWare — Blockchain Privacy](https://starkware.co/blog/blockchain-privacy/)

## 3. AVNU Paymaster — Gasless Transactions

**What**: Open-source, audited, permissionless paymaster on Starknet that sponsors gas fees for users.

**Why it matters**: Eliminates the #1 onboarding friction — new users don't need ETH/STRK to transact. Critical for Bitcoin-native users coming through Xverse who may not have STRK for gas.

**Integration**:
- Already used by Cavos, StarknetKit, and many Starknet dApps
- Open-source: [github.com/avnu-labs/paymaster](https://github.com/avnu-labs/paymaster)
- Can sponsor specific transaction types (e.g., first N transactions, or transactions for BTC pools)

**Recommendation**: Integrate AVNU Paymaster for gasless shielded operations (Phase 2). This removes friction for BTC holders who don't want to acquire STRK.

**Source**: [Starknet Blog: Paymaster with AVNU](https://www.starknet.io/blog/paymaster-with-avnu-video/)

## 4. Alpen Glock Bridge — Trustless BTC ↔ Starknet

**What**: Next-generation trustless bridge between Bitcoin and Starknet using cryptographic verifier technology (430-550x more efficient than BitVM2).

**Why it matters**: Current BTC bridges (StarkGate for WBTC, Threshold for tBTC) have trust assumptions (custodians, MPC networks). Alpen Glock eliminates these — BTC locked on Bitcoin can only be unlocked if proven burned on Starknet.

**Timeline**: Q2/Q3 2026

**Funded by**: Starknet Foundation grant to Alpen Labs

**Relevance to Zylith**: When Alpen Glock launches, Zylith could offer truly trustless BTC concentrated liquidity — no wrapped tokens, no custodians.

**Source**: [Starknet + Alpen Glock](https://www.starknet.io/blog/starknet-alpen-bitcoin-glock/)

## 5. Re7 Labs ALMM — Automated LP Benchmark

**What**: Yield aggregator on Ekubo providing automated concentrated liquidity management. $15M+ TVL, targeting ~20% APR.

**Why it matters**: Validates demand for automated CLMM management on Starknet. Zylith's shielded equivalent would add privacy protection to this model.

**Key insight**: Re7's strategies are fully visible on-chain — anyone can see positions and copy them. Zylith's shielded vault would prevent strategy copying, providing a durable competitive advantage.

**Source**: [Re7 Yield Aggregator on Starknet](https://www.starknet.io/blog/introducing-the-re7-yield-aggregator-on-starknet/)

## 6. Atomiq — Direct BTC Atomic Swaps

**What**: Enables direct atomic swaps from native BTC to WBTC on Starknet using Bitcoin PoW verification in a smart contract vault.

**Why it matters**: Zero slippage, minimal counterparty risk. Integrated in Braavos wallet.

**Relevance to Zylith**: Could enable direct BTC → shielded WBTC deposits in a single flow.

**Source**: [Atomiq wBTC on Starknet](https://www.starknet.io/blog/atomiq-wbtc-on-starknet/)

## 7. Native USDC (Circle CCTP V2)

**What**: Circle has deployed native USDC on Starknet with Cross-Chain Transfer Protocol V2 support.

**Why it matters**: Native USDC (`0x033068F6539f8e6e6b131e6B2B814e6c34A5224bC66947c47DaB9dFeE93b35fb`) is preferred over bridged USDC for:
- Better security (issued directly by Circle)
- Cross-chain transfers via CCTP
- Starknet Foundation backing

**Relevance to Zylith**: Use native USDC as the primary stablecoin for BTC/USDC shielded pools.

**Source**: [Circle: Native USDC on Starknet](https://www.circle.com/blog/now-available-native-usdc-cctp-on-starknet)

## 8. Integrity Verifier (Herodotus)

**What**: Cairo STARK proof verifier deployed on Starknet. Verifies STARK proofs through a fact registry pattern.

**Why it matters**: When Zylith migrates from Groth16/Garaga to STWO (Phase 3), the Integrity verifier provides the on-chain verification infrastructure. Instead of deploying 4 custom verifier contracts, Zylith submits proofs to the shared Integrity verifier.

**Source**: [Integrity — GitHub](https://github.com/HerodotusDev/integrity)

## 9. Extended — Perpetual Swaps on Starknet

**What**: Perpetual swap exchange on Starknet with 50+ pairs and ~14% APR vault yield.

**Why it matters**: For Zylith's delta-neutral strategy (Phase 5-6), Extended provides the short perps leg needed to hedge concentrated liquidity positions.

## 10. Mist.cash — Another Privacy Protocol on Starknet

**What**: Privacy protocol on Starknet mentioned in StarkWare's privacy blog alongside Tongo Cash and Privacy Pools.

**Why it matters**: Shows the growing privacy ecosystem on Starknet. Zylith isn't alone — but its CLMM focus is unique among privacy protocols.

## Summary

| Tool | Category | Priority | Phase |
|------|----------|----------|-------|
| AVNU Paymaster | UX (gasless) | HIGH | 2 |
| Native USDC | Token | HIGH | 1 |
| StarknetKit | UX (social login) | MEDIUM | 2+ |
| Privacy Pools compliance model | Compliance | MEDIUM | 2 |
| Atomiq | BTC onboarding | MEDIUM | 2 |
| Integrity Verifier | STWO migration | HIGH | 3 |
| Re7 ALMM | Vault reference | LOW (reference only) | 5 |
| Extended | Hedging | MEDIUM | 5-6 |
| Alpen Glock | Trustless BTC | HIGH (when available) | 6 |
| Mist.cash | Ecosystem awareness | LOW | — |
