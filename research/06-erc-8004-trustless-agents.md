# ERC-8004: Trustless Agents — ASP & Relayer Infrastructure

> **Relevance to Zylith: MEDIUM-HIGH**
> ERC-8004 enables Zylith's ASP to be discoverable, reputable, and verifiable. It creates a trustless relayer marketplace and positions Zylith in the AI agent economy narrative.

## Executive Summary

ERC-8004 (Trustless Agents) is an Ethereum standard establishing trust infrastructure for autonomous AI agents. It provides three on-chain registries: Identity (ERC-721 NFTs), Reputation (feedback signals), and Validation (independent verification). A full Cairo implementation is already deployed on Starknet mainnet and Sepolia. For Zylith, the most relevant use cases are: registering the ASP as a discoverable agent, creating a trustless relayer marketplace, and logging ZK proof verifications as validation records.

## Technical Overview

### Three Registries

**1. Identity Registry** (ERC-721)
- Each agent gets an NFT-based identity with `agentId`
- `agentURI` resolves to capabilities, endpoints, payment info
- Global identifier: `{namespace}:{chainId}:{identityRegistry}:{agentId}`
- Supports domain verification via `.well-known/agent-registration.json`

**2. Reputation Registry**
- Feedback signals: `value` (int128), categorization tags, optional off-chain URI
- Supports revocation, agent responses, aggregation summaries
- Example tags: `starred`, `uptime`, `successRate`, `reachable`

**3. Validation Registry**
- Independent validator checks: stake-secured re-execution, zkML verifiers, TEE oracles
- 0-100 scoring scale, multiple responses per request
- Perfect for logging ZK proof verification results

### Starknet Implementation

**Repository**: [Akashneelesh/erc8004-cairo](https://github.com/Akashneelesh/erc8004-cairo)

**Mainnet Contracts**:
- IdentityRegistry: `0x33653298d42aca87f9c004c834c6830a08e8f1c0bd694faaa1412ec8fe77595`
- ReputationRegistry: `0x698849defe3997eccd3dc5e096c01ae8f4fbc2e49e8d67efcb0b0642447944`
- ValidationRegistry: `0x3c2aae404b64ddf09f7ef07dfb4f723c9053443d35038263acf7d5d77efcd83`

**Technical details**: Uses SNIP-6 for signature verification (Starknet's ERC-1271), Poseidon hashing, 87 unit tests + 43 E2E tests, CC0 licensed.

### Status

- **EIP Status**: Draft (but deployed on mainnet since Jan 29, 2026)
- **Authors**: Marco De Rossi (MetaMask), Davide Crapis (Ethereum Foundation), Jordan Ellis (Google), Erik Reppel (Coinbase)
- **Adoption**: 10,000+ agents on testnet, active Genesis Month on mainnet
- **Ecosystem**: Related projects — starknet-agentic, Daydreams (ERC-8004 compliant)

## Relevance to Zylith

### Use Case 1: ASP as Registered Agent (HIGH relevance)

Register Zylith's ASP in the Identity Registry:
- Capabilities: Merkle tree maintenance, root submission, proof relay, shielded operations
- Service endpoints: REST API (deposit, withdraw, swap, mint, burn)
- Payment info: Fee structure for proof generation

**Benefit**: Users and other agents can discover the ASP, verify its capabilities, and track its uptime/reliability through reputation scores.

### Use Case 2: Trustless Relayer Discovery (HIGH relevance)

Zylith's shielded operations need relayers to submit transactions without linking user addresses. ERC-8004 enables:
- Marketplace of competing relayers with reputation scores
- Automatic selection of most reliable/cheapest relayer
- Performance tracking: latency, success rate, fee fairness

### Use Case 3: Proof Verification Logging (MEDIUM relevance)

Log Groth16 proof verifications in the Validation Registry:
- Each verified shielded operation creates a validation record
- Validators can re-verify proofs independently
- Creates on-chain audit trail without compromising privacy

### Use Case 4: AI Liquidity Agents (MEDIUM — future)

Future autonomous agents managing concentrated liquidity:
- Discover Zylith pools via Identity Registry
- Evaluate protocol reliability via reputation scores
- Execute shielded operations through trusted relayers
- Prove correct execution via Validation Registry (ZKML)

### Honest Assessment

- **High relevance**: ASP registration, relayer marketplace — directly addresses trust needs
- **Medium relevance**: AI agent integration — requires ecosystem maturity
- **Low relevance**: Core CLMM mechanics — ERC-8004 doesn't improve pool math or ZK proofs

## Recommendation for Zylith

| Timeframe | Action |
|-----------|--------|
| **Phase 5** | Register ASP as ERC-8004 agent on Starknet mainnet |
| **Phase 5** | Implement reputation-based relayer selection |
| **Phase 5** | Log proof verifications in Validation Registry |
| **Phase 6** | Enable third-party AI agents for LP management |

**Bottom line**: ERC-8004 is strategically sound for Zylith's infrastructure layer (ASP, relayers) and positions the protocol at the intersection of privacy DeFi and autonomous agent economies. The Cairo implementation is already deployed — integration effort is moderate.

## Sources

- [ERC-8004 Official Specification](https://eips.ethereum.org/EIPS/eip-8004)
- [erc8004-cairo — GitHub](https://github.com/Akashneelesh/erc8004-cairo)
- [Ethereum Magicians Discussion](https://ethereum-magicians.org/t/erc-8004-trustless-agents/25098)
- [CoinDesk: ERC-8004 Mainnet Launch](https://www.coindesk.com/markets/2026/01/28/ethereum-s-erc-8004-aims-to-put-identity-and-trust-behind-ai-agents)
- [Starknet AI Portal](https://www.starknet.io/verifiable-ai-agents/)
- [starknet-agentic — GitHub](https://github.com/keep-starknet-strange/starknet-agentic)
- [Awesome ERC-8004](https://github.com/sudeepb02/awesome-erc8004)
