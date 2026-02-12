# DeFi Yield Strategies — Competitive Analysis & Zylith Opportunities

> **Relevance to Zylith: HIGH**
> Zylith must offer competitive yields (10-25% target) to attract BTC liquidity. This research maps the yield landscape and identifies concrete strategies combining concentrated liquidity, privacy premium, and Starknet incentives.

## Executive Summary

The DeFi yield landscape ranges from 0.01% (Aave WBTC supply) to 55%+ (actively managed CLMM positions). Starknet's BTCFi Season offers 100M STRK in incentives specifically targeting BTC liquidity. Zylith's unique advantage — privacy for concentrated liquidity positions — eliminates MEV extraction (1-5% per trade), protects LP strategies from copycats, and attracts institutional capital that requires confidentiality. Target APY: 10-25% combining base CLMM fees, STRK rewards, and privacy premium.

## Protocol Analysis

### Blend Protocol (Stellar) — Backstop Innovation

**Architecture**: Permissionless, isolated lending pools on Stellar's Soroban. Key innovation is the **backstop module** — first-loss capital that absorbs bad debt before lenders.

- **Average APY**: ~5.7%
- **Backstop mechanics**: 80/20 BLND:USDC LP tokens as first-loss capital
- **Emission split**: 70% to backstop stakers, 30% to lenders/borrowers
- **Self-regulating**: backstop-to-TVL ratio correlates automatically with pool safety

**Lesson for Zylith**: Implement a ZYL token backstop where stakers earn highest yields (15-30%) by providing first-loss capital for shielded pools. This creates alignment between protocol safety and yield.

### Ekubo Protocol (Starknet AMM) — The Benchmark

**Architecture**: Singleton contract, ultra-concentrated liquidity (1/100th basis point tick precision), "Till pattern" for batched settlements.

- **Volume/TVL**: Up to 30x daily (each $1 of liquidity generates $30 in volume)
- **LP APR**: Up to 5% base + STRK rewards
- **Re7 ALMM** (vault on Ekubo): ~20% APR target, $15M+ TVL
- **Market share**: 60% of Starknet AMM TVL
- **Withdrawal fee**: LPs pay swap fee tier on exit → discourages mercenary liquidity → fees fund EKUBO buybacks

**Lesson for Zylith**: Ekubo is the capital efficiency benchmark. Zylith must match this while offering privacy as the differentiator. The withdrawal fee model is worth studying.

### Nostra (Starknet Lending)

- STRK-USDC pool: ~37.7% APY
- STRK-ETH pool: ~26.9% APY
- ETH-USDC pool: ~22.8% APY
- Primarily driven by STRK rewards + points system

### Vesu (Starknet Lending)

- WBTC lending: 2-3% base + STRK incentives
- USDC supply: exceeding 11% APY
- BTC-collateralized USDC borrowing: **0-1% effective rate** after STRK rewards
- Over $160M TVL combined with Extended

### Pendle (Yield Tokenization) — Biggest Opportunity

**Architecture**: Splits yield-bearing assets into Principal Tokens (PT) and Yield Tokens (YT).

- PT: Redeemable for principal at maturity → fixed yield (e.g., 8%)
- YT: Captures all yield until maturity → variable yield speculation
- sPENDLE staking: 80% protocol revenue to buybacks
- TVL: $800M+ on major pools

**Why critical for Zylith**: No protocol on Starknet offers yield tokenization. Shielded PT/YT tokens would create:
- Private fixed-yield BTC products (institutional grade)
- A private yield curve for BTC on Starknet
- Composability with lending protocols

### Hyperliquid — Protocol Vault Model

- HLP vault: 1-14% APY typical, up to 17% in stable periods
- Revenue from market making + liquidations
- 97% revenue → HYPE buybacks
- $373M TVL, $121.8M lifetime PnL

**Lesson for Zylith**: A shielded vault where depositors earn from market making with privacy-protected positions. The vault strategy is invisible to the market, preventing front-running.

### Ethena — Delta-Neutral Strategy

- sUSDe: 4.7-10% APY (peaked ~29%)
- Mechanism: Long staked ETH/BTC + short perps = delta-neutral
- Dual yield: staking rewards + funding rates
- $46.5M reserve fund for negative funding periods
- Market cap: $4.7B+

**Lesson for Zylith**: Shielded delta-neutral BTC yield product. Users deposit BTC, protocol provides CLMM liquidity + hedges via perps on Extended, distributes yield privately.

### Aave — BTC Yield Baseline

- WBTC supply APR: **0.01%** (42.2K WBTC supplied, only 2.93% utilization)
- This shows BTC holders are massively underserved by lending protocols
- Opportunity: CLMM fees + STRK rewards >> lending yields

## Yield Ranges by Strategy

| Strategy | Base APY | With Incentives | Risk Level |
|----------|----------|-----------------|------------|
| BTC Lending (Aave) | 0.01-0.3% | 1-3% | Very Low |
| BTC Lending (Vesu + STRK) | 2-3% | 5-8% | Low |
| Stablecoin Pairs CLMM | 1-5% | 5-15% | Low-Medium |
| ETH-Stablecoin CLMM | 3-12% | 10-30% | Medium |
| BTC-Stablecoin CLMM | 2-8% | 8-25% | Medium |
| LST Correlated Pairs | 3-7% | 10-20% | Low-Medium |
| Actively Managed CLMM | 5-55% | 15-100%+ | High |
| Re7 Vault on Ekubo | ~15-20% | ~20% | Medium |
| Ethena sUSDe | 5-10% | — | Medium |
| Extended Vault | ~14% | — | Medium |

## How Privacy Improves Yield

1. **MEV Protection**: Shielded positions cannot be front-run or sandwiched. Estimated savings: 1-5% per trade. Every basis point saved goes directly to LPs.

2. **Strategy Concealment**: Professional LPs hide tick ranges, preventing copycats from diluting returns. On Ekubo, all positions are visible — on Zylith, they're encrypted.

3. **Institutional Attraction**: Privacy is the #1 requirement for institutional capital. Dark pools handle ~40% of US equity volume. Shielded CLMM = crypto dark pool for BTC.

4. **Better Execution**: No front-running of large position changes → better entry/exit prices for rebalancing.

5. **Reduced Information Leakage**: Competitors cannot see position sizes, ranges, or rebalancing patterns.

## Concrete Strategies for Zylith

### Strategy 1: Shielded BTC-Stablecoin CLMM (Phase 2)

- **Pools**: WBTC/USDC, tBTC/USDC, LBTC/USDC
- **Target APY**: 10-25% (5-8% base fees + 5-12% STRK rewards + privacy premium)
- **Eligibility**: BTCFi Season (100M STRK, active through March 2026+)
- **Differentiator**: Only privacy-preserving BTC pools on Starknet

### Strategy 2: Shielded Yield Vault (Phase 5)

- **Model**: Re7 ALMM-style automated management, but shielded
- **Target APY**: 15-25%
- **Value**: Auto-rebalancing invisible to market, no strategy copying

### Strategy 3: Pendle-Style Yield Tokenization (Phase 5)

- **Products**: PT-zBTC (fixed yield ~8%), YT-zBTC (variable fee income)
- **Value**: First yield tokenization on Starknet, with privacy
- **Market**: Risk-averse BTC holders want predictable returns

### Strategy 4: Delta-Neutral Shielded BTC Yield (Phase 5-6)

- **Model**: Ethena-inspired — CLMM liquidity + short perps hedging
- **Target APY**: 8-15% (sustainable, non-dilutive)
- **Value**: Addresses #1 LP concern (impermanent loss)

### Strategy 5: ZYL Token with Backstop Economics (Phase 5)

- **Model**: Blend-inspired backstop + Curve ve-tokenomics
- **Emission split**: 70% backstop stakers, 30% LPs
- **Utility**: First-loss capital staking, vote-directed emissions, fee buybacks
- **Bribe market**: Third-party protocols pay veZYL holders for liquidity direction

## Incentive Mechanisms Reference

| Mechanism | Used By | Sustainability | Zylith Fit |
|-----------|---------|----------------|------------|
| Liquidity mining | Early DeFi | Low | Short-term bootstrap only |
| ve-Tokenomics | Curve, Solidly | High | Long-term alignment |
| Revenue sharing | Ekubo, Ethena | High | Core model |
| Backstop staking | Blend | High | Risk management |
| Points/bribes | Nostra, Royco | Medium | Bootstrap phase |
| STRK rewards | DeFi Spring, BTCFi | Medium (external) | Phase 1-2 |

## Starknet DeFi Context

- **Total TVL**: ~$321M (Nov 2025), $840M+ (Jan 2026)
- **BTC TVS**: $201.1M (2,000%+ YTD growth)
- **BTCFi Season**: 100M STRK, minimum 6 months (Sep 2025 - Mar 2026+)
- **BTC staked**: 1,700+ BTC ($160M+) — exceeds STRK staked value
- **Stablecoin TVL**: $147M all-time high

## Recommendation for Zylith

| Priority | Strategy | Target APY | Timeline |
|----------|----------|------------|----------|
| **P0** | Apply to BTCFi Season for STRK allocation | — | Immediate |
| **P1** | Launch shielded BTC-stablecoin pools | 10-25% | Phase 2 |
| **P2** | Protocol fee optimization | +1-2% | Phase 2 |
| **P3** | Shielded yield vault | 15-25% | Phase 5 |
| **P4** | Yield tokenization (PT/YT) | 6-12% fixed | Phase 5 |
| **P5** | ZYL token + backstop | 15-30% stakers | Phase 5 |
| **P6** | Delta-neutral BTC yield | 8-15% | Phase 5-6 |

**Bottom line**: Zylith should target 10-25% APY for shielded BTC LP positions. The moat is privacy — MEV elimination, strategy concealment, and institutional-grade confidentiality. BTCFi Season provides the initial incentive flywheel; long-term sustainability comes from real fee revenue and tokenomics.

## Sources

- [Blend Capital Documentation](https://docs.blend.capital/)
- [Ekubo: The AMM Endgame](https://www.starknet.io/blog/ekubo-the-amm-endgame/)
- [Re7 Yield Aggregator on Starknet](https://www.starknet.io/blog/introducing-the-re7-yield-aggregator-on-starknet/)
- [Pendle Yield Tokenization](https://docs.pendle.finance/pendle-v2/Developers/Contracts/YieldTokenization)
- [Ethena Protocol](https://ethena.fi/)
- [Aave V3 WBTC](https://aavescan.com/ethereum-v3/wbtc)
- [Uniswap V3 Concentrated Liquidity](https://docs.uniswap.org/concepts/protocol/concentrated-liquidity)
- [Hyperliquid Deep Dive](https://nftevening.com/hyperliquid-deep-dive-2/)
- [Starknet BTCFi Season — 100M STRK](https://www.starknet.io/blog/starknet-foundation-introduces-btcfi-season/)
- [Starknet Bitcoin Yield Guide](https://www.starknet.io/blog/bitcoin-yield/)
- [Starknet 2025 Year in Review](https://www.starknet.io/blog/starknet-2025-year-in-review/)
- [Starknet DeFi Spring 2.0](https://www.starknet.io/blog/defi-spring-program-2-0/)
- [Vesu Documentation](https://docs.vesu.xyz/explore/vesu-basics)
