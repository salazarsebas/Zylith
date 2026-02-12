# AI Agents in DeFi — Integration Opportunities for Zylith

> **Relevance to Zylith: HIGH**
> AI agents can automate ASP operations, optimize concentrated liquidity positions, and — combined with ZKML — create verifiable, privacy-preserving autonomous liquidity management. This is a unique intersection that no other protocol currently offers.

## Executive Summary

DeFAI (Decentralized Finance + AI) is a rapidly growing sector with 550+ projects and $4.34B market cap. For Zylith, the highest-impact integration is AI-powered ASP operations (no smart contract changes needed), followed by DRL-based tick optimization for concentrated liquidity, and ultimately ZKML for verifiable privacy-preserving strategies. Starknet's ecosystem offers native tooling (Giza/LuminAIR, Snak, AgentSTARK) and up to $1M in grants for AI projects.

## AI Agent Frameworks for DeFi

### Starknet-Native Frameworks

| Framework | Focus | Maturity | Zylith Fit |
|-----------|-------|----------|------------|
| **Giza (LuminAIR)** | Verifiable ML on-chain via STARK proofs | Production (Base), Dev (Starknet) | HIGH — verifiable LP optimization |
| **Snak (KasarLabs)** | Starknet agent toolkit + MCP | Production | HIGH — ASP intelligence |
| **AgentSTARK** | Giza ML + Starknet AA | Early | MEDIUM — autonomous operations |
| **Daydreams** | Generative agents (gaming-focused) | Production | LOW — not DeFi-specific |

### General DeFi Frameworks

| Framework | Focus | Key Feature |
|-----------|-------|-------------|
| **Brian AI** | Natural language Web3 | Intent recognition, Brian-8B LLM |
| **Theoriq** | Agent swarms for liquidity | Multi-agent coordination, Uniswap V4 hooks |
| **Virtuals Protocol** | Tokenized AI agents | Agent Commerce Protocol (ACP) |
| **Eliza (ai16z)** | Multi-agent framework | Open-source, multi-chain |

## CLMM-Specific AI Use Cases

### Automated Liquidity Management (ALM)

The core problem: CLMM positions earn fees only when price stays within the selected tick range. Active management is mandatory, not optional.

**AI-driven solutions**:

1. **Dynamic Range Optimization**: AI scans volatility, TWAP deviations, and trading volumes to adjust `tickLower`/`tickUpper`
2. **Automated Rebalancing**: Triggers reposition when price deviates beyond sigma thresholds
3. **Delta-Neutral Hedging**: Heuristics limit impermanent loss drawdowns
4. **DRL (Deep Reinforcement Learning)**: PPO algorithm treats LP management as a Markov Decision Process, balancing fee maximization against gas costs and hedging expenses

**Academic backing**: Research (arxiv:2309.10129, arxiv:2501.07508) demonstrates PPO can dynamically adjust Uniswap V3 tick ranges with superior returns vs static positions.

### Existing ALM Protocols

| Protocol | Approach | APY Range |
|----------|----------|-----------|
| Re7 ALMM (Ekubo) | Automated concentrated LP | ~20% |
| Arrakis | Low-risk stablecoin pairs | 5-15% |
| Gamma | Wide range with incentives | 10-30% |
| Amplified Finance | TWAP-adaptive ACLM | Variable |
| OroSwap | Conversational AI for LP | Variable |

## ZKML: Zero-Knowledge Machine Learning

### What It Is

ZKML allows proving that an ML model executed correctly without revealing the model's inputs, weights, or intermediate computations. The prover generates a ZK proof that the output was correctly computed by the claimed model.

### Current State (2025-2026)

| Tool | Approach | Performance | Status |
|------|----------|-------------|--------|
| **Giza LuminAIR** | STARK-based (S-two, M31 field) | 11 core primitives | Development |
| **EZKL** | ONNX → Halo2 circuits | 65x faster than RISC Zero | Production |
| **zkPyTorch** | VGG-16 in 2.2 seconds | Small-medium models | Research |
| **ZKTorch** | GPT-J (6B) in 20 minutes | Large models | Research |

### Limitation

ZKML is still 10,000x+ overhead vs native computation. Practical only for small models with infrequent decisions (hourly rebalancing, not per-block). But for Zylith's use case — proving a rebalancing decision is correct — this is sufficient.

## Starknet AI Ecosystem

### Giza — Most Relevant for Zylith

**Components**:
- **Orion**: ONNX Runtime in Cairo — train in PyTorch/scikit-learn, convert to ONNX, transpile to verifiable Cairo
- **LuminAIR**: Custom AIR framework bridging Luminal (Rust ML) with STWO's STARK prover. Transforms ML graphs into polynomial equations verifiable by STARK proofs
- **ARMA**: Non-custodial yield optimizer (launched on Base, Jan 2025)

**LuminAIR technical details**:
- Lazy execution via directed acyclic graphs
- Uses M31 prime field optimized for SIMD
- Phase 1: 11 core primitives (Add, Mul, Sin, Sqrt, etc.)
- Phase 3 (planned): Cairo smart contract verifier + GPU acceleration

### Snak (KasarLabs) — ASP Integration Tool

- NPM package and NestJS server with web UI
- Supports Anthropic, OpenAI, Google Gemini, Ollama
- MCP (Model Context Protocol) integration
- Token swap via AVNU SDK v4
- Perfect for adding intelligence to ASP operations

### Starknet Foundation Grants

- **Seed Grants**: Up to $25,000 STRK for MVPs
- **Growth Grants**: Up to $1,000,000 for working products
- AI agents explicitly listed as priority area
- Rolling applications

## Concrete Implementation Plan for Zylith

### Phase 4a: AI-Powered ASP (No Smart Contract Changes)

**Timeline**: 6-8 months post-MVP
**Impact**: HIGH | **Complexity**: LOW

```
User deposits → ASP Agent (enhanced Bun worker)
  ├─ Gas-aware root submission timing
  ├─ Batch commitment processing for cost efficiency
  ├─ Anomaly detection (duplicate nullifiers, patterns)
  └─ Smart relayer trait extraction
```

**Why it works**: The ASP is already an off-chain service. Adding AI intelligence requires zero smart contract changes. Directly improves the `deposit()` → `submit_merkle_root()` flow.

**Tool**: Snak (KasarLabs) for Starknet interaction.

### Phase 4b: Conversational Shielded LP Management

**Timeline**: 8-10 months post-MVP
**Impact**: HIGH | **Complexity**: MEDIUM

```
User (natural language) → AI Agent
  ├─ Analyze pool state (tick, liquidity, fees)
  ├─ Recommend optimal tickLower/tickUpper
  ├─ Generate ZK proofs for shielded_mint/burn
  └─ Execute rebalancing via coordinator
```

**Key constraint**: Agent needs user's secret values (nullifier, randomness) for proofs. Options:
1. User provides secrets per session (less autonomous, more secure)
2. Agent runs in TEE with sealed secrets
3. User-side proof gen, agent provides only parameters (recommended)

**Tool**: Brian AI for intent recognition, custom DRL model for tick optimization.

### Phase 4c: Verifiable AI Strategy (ZKML)

**Timeline**: 10-14 months post-MVP
**Impact**: VERY HIGH | **Complexity**: HIGH

```
Market Data → ML Model (trained off-chain)
  ├─ ONNX export → Giza Orion / LuminAIR → Cairo
  ├─ Model runs with STARK proof of correctness
  ├─ Verifiable rebalancing decisions
  └─ Agent executes via Account Abstraction
```

**Unique value**: Combining verifiable ML (STARK proofs of correct model execution) with Groth16/STWO privacy proofs (hidden position details) = **doubly-verified, privacy-preserving autonomous liquidity management**.

### Grant Strategy

| Phase | Grant Type | Amount | Pitch |
|-------|-----------|--------|-------|
| 4a | Seed Grant | $25K STRK | AI-powered ASP for privacy DeFi |
| 4b | Growth Grant | Up to $1M STRK | Conversational shielded LP + ZKML |
| 4c | Giza Partnership | Collaboration | LuminAIR integration for verifiable CLMM |

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| MEV on agent transactions | Execute via shielded operations only |
| Wallet/key compromise | Session keys (AA), spending limits, contract whitelists |
| Oracle manipulation | Multi-source validation, TWAP checks |
| Black box decisions | ZKML proofs of correct execution |
| Herd behavior | Diverse strategies, rate limiting, circuit breakers |
| Agent as privacy leak | On-chain actions must go through ZK proofs |
| Pattern analysis | Randomized execution timing, batch operations |

## Recommendation Summary

| Priority | Use Case | Impact | Unique? |
|----------|----------|--------|---------|
| **P0** | AI-Powered ASP operations | HIGH | Medium |
| **P1** | DRL tick range optimization | HIGH | Medium |
| **P1** | Conversational LP management | HIGH | High |
| **P2** | Verifiable AI (ZKML) + privacy proofs | VERY HIGH | Very High |
| **P3** | ERC-8004 Agent marketplace | HIGH | Very High |

**Bottom line**: The intersection of privacy (ZK proofs) + verifiable AI (STARK-proven ML) + concentrated liquidity management is Zylith's strongest differentiator. No other protocol combines all three. The path is incremental: ASP intelligence → conversational LP → ZKML, each layer building on the previous.

## Sources

- [Starknet AI Portal](https://www.starknet.io/verifiable-ai-agents/)
- [Giza x S-two LuminAIR](https://starkware.co/blog/giza-x-s-two-powering-verifiable-ml-with-luminair/)
- [Snak — KasarLabs GitHub](https://github.com/KasarLabs/snak)
- [AgentSTARK GitHub](https://github.com/keep-starknet-strange/agentstark)
- [Daydreams GitHub](https://github.com/daydreamsai/daydreams)
- [Brian AI](https://www.brianknows.org/)
- [Starknet Grants](https://www.starknet.io/grants/)
- [Adaptive Liquidity Provision with DRL](https://arxiv.org/abs/2309.10129)
- [Efficient Liquidity Provisioning with DRL](https://arxiv.org/abs/2501.07508)
- [Gauntlet Uniswap ALM Analysis](https://www.gauntlet.xyz/resources/uniswap-alm-analysis)
- [The Definitive Guide to ZKML 2025](https://blog.icme.io/the-definitive-guide-to-zkml-2025/)
- [Amplified Finance ACLM](https://docs.amplified.fi/super-vault-architecture/ai-strategy-framework/automated-concentrated-liquidity-management-aclm)
- [OroSwap AI Agent](https://medium.com/@oroswap/ai-agent-based-liquidity-management-the-future-of-capital-efficiency-11a7db73471b)
- [Agentic AI in Finance — Chainlink](https://blog.chain.link/agentic-ai-in-finance/)
- [ProofGate](https://www.proofgate.xyz)
