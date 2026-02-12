# Bitcoin Tokens on Starknet, Xverse Wallet & ERC-20 Ecosystem

> **Relevance to Zylith: VERY HIGH**
> Zylith claims to be "Shielded Liquidity for Bitcoin on Starknet" but the frontend only has ETH/STRK. This research provides the concrete token addresses, wallet integrations, and bridge infrastructure needed to make Zylith truly Bitcoin-first.

## Executive Summary

Starknet has become a major BTCFi hub with $200M+ in bridged BTC across four tokens: WBTC ($43M TVL), tBTC ($12M), LBTC ($22M, yield-bearing), and SolvBTC ($122M). Xverse wallet provides full Starknet integration with the Sats Connect SDK, enabling Bitcoin-native users to access Starknet dApps directly. The Starknet Foundation has allocated 100M STRK tokens specifically for BTCFi incentives. Zylith's frontend must immediately update to support these Bitcoin tokens and integrate Xverse to fulfill its Bitcoin-first promise.

## Bitcoin-Backed Tokens on Starknet

### WBTC (Wrapped Bitcoin)

| Property | Value |
|----------|-------|
| **Status** | LIVE on Starknet Mainnet |
| **TVL on Starknet** | ~$43.3M |
| **Decimals** | 8 |
| **Security model** | Centralized custody (BitGo) |
| **Yield-bearing** | No |
| **Mainnet address** | `0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac` |
| **Sepolia address** | `0x00452bd5c0512a61df7c7be8cfea5e4f893cb40e126bdc40aee6054db955129e` |
| **Bridge** | StarkGate (canonical), Atomiq (atomic swaps) |

WBTC is the most liquid Bitcoin wrapper across all chains. Bridged via StarkGate from Ethereum. Atomiq enables direct BTC→WBTC atomic swaps using Bitcoin PoW verification on-chain.

### tBTC (Threshold BTC)

| Property | Value |
|----------|-------|
| **Status** | LIVE on Starknet Mainnet (launched June 11, 2025) |
| **TVL on Starknet** | ~$12.0M |
| **Decimals** | 18 |
| **Security model** | Trust-minimized MPC threshold |
| **Yield-bearing** | No |
| **Mainnet address** | `0x04daa17763b286d1e59b97c283c0b8c949994c361e426a28f743c67bdfe9a32` |
| **Bridge** | Threshold Network direct minting |

tBTC is the most decentralized Bitcoin wrapper — uses threshold cryptography with multiple independent MPC nodes. Direct minting on Starknet at sub-$0.01 cost. Aligns with Zylith's privacy-first ethos.

### LBTC (Lombard Staked BTC)

| Property | Value |
|----------|-------|
| **Status** | LIVE on Starknet Mainnet |
| **TVL on Starknet** | ~$22.4M |
| **Decimals** | 8 |
| **Security model** | Babylon staking protocol |
| **Yield-bearing** | Yes (BTC staking yield) |
| **Mainnet address** | `0x036834A40984312F7f7de8D31e3f6305B325389eAEeA5B1c0664b2fB936461a4` |
| **Bridge** | Lombard Protocol |

LBTC is the only yield-bearing Bitcoin asset on Starknet. Each LBTC is backed 1:1 by BTC staked on the Babylon protocol. Starknet Foundation allocated 100M STRK to bootstrap LBTC liquidity.

### SolvBTC

| Property | Value |
|----------|-------|
| **Status** | LIVE on Starknet Mainnet |
| **TVL on Starknet** | ~$122.4M (largest BTC TVL) |
| **Security model** | Protocol-backed 1:1 |
| **Bridge** | External OFT bridging (StarkGate bridge halted) |

### Comparison Matrix

| Token | TVL | Decentralization | Yield | Best For |
|-------|-----|-------------------|-------|----------|
| WBTC | $43.3M | Low (BitGo) | No | Highest liquidity, most integrations |
| tBTC | $12.0M | High (MPC) | No | Privacy-aligned, most trustless |
| LBTC | $22.4M | Medium (Babylon) | Yes | Yield-bearing LPs, staking |
| SolvBTC | $122.4M | Medium | No | Largest TVL, cross-chain |

**Total BTC on Starknet**: ~$200M+ (1,700+ BTC staked within 3 months of BTCFi Season).

## Bridges to Starknet

| Bridge | Type | Bitcoin Support | Notable Feature |
|--------|------|----------------|-----------------|
| **StarkGate** | Canonical (official) | WBTC, ETH, USDC, 150+ tokens | Ethereum↔Starknet, also Solana + BTC paths |
| **Atomiq** | Atomic swap | Direct BTC↔WBTC | PoW verification on-chain, zero slippage |
| **Threshold** | Direct mint | tBTC | MPC signer network, sub-$0.01 cost |
| **Lombard** | Protocol | LBTC | Via Babylon staking |
| **LayerSwap** | Cross-chain + CEX | BTC | Direct Bitcoin routes |
| **Orbiter Finance** | Cross-chain | Various | Fast bridging |
| **Garden Finance** | Direct conversion | BTC | Bitcoin to Starknet |
| **Alpen Glock** | Trustless (FUTURE) | Native BTC | Q2/Q3 2026, 430-550x vs BitVM2 |

### Alpen Glock Bridge (Future — Critical)

The most trust-minimized bridge being developed between Bitcoin and Starknet:
- Uses "Glock" cryptographic verifier (next-gen BitVM technology)
- BTC locked on Bitcoin, can only be unlocked if proven burned on Starknet
- 430-550x efficiency vs BitVM2
- Eliminates need for wrapped assets or multisig setups
- Funded by Starknet Foundation grant to Alpen Labs
- **Timeline**: Q2/Q3 2026

## Xverse Wallet Integration

### What is Xverse?

Xverse is the leading Bitcoin-focused wallet (browser extension + mobile) supporting Bitcoin L1, Ordinals, Runes, BRC-20, Stacks, Spark, and Starknet. It is purpose-built for BitcoinFi.

### Starknet Features in Xverse

- Switch to Starknet network within the same wallet
- Bridge BTC to WBTC on Starknet directly in-app
- Swap BTC ↔ STRK directly
- Access Starknet dApps (Ekubo, Vesu, Avnu, Extended)
- Gasless transactions (fees sponsored on eligible txs)
- Manage Starknet assets alongside Bitcoin assets

### Sats Connect SDK Integration

**Package**: `sats-connect` (npm, ~2M downloads)

```typescript
import Wallet from 'sats-connect';

// Request Starknet account from Xverse
const response = await Wallet.request('wallet_getAccount', {
  addresses: ['starknet']
});

// Response:
// {
//   walletType: "software" | "ledger",
//   id: string,
//   addresses: [{
//     address: string,
//     publicKey: string,
//     purpose: "starknet",
//     addressType: "starknet"
//   }]
// }
```

### Integration Plan for Zylith Frontend

Zylith currently uses `@starknet-react/core` with Argent + Braavos connectors. To add Xverse:

1. Install: `npm install sats-connect`
2. Add Xverse as a wallet option in `ConnectButton.tsx`
3. Bridge the Sats Connect account to starknet.js `Account` interface
4. Maintain dual-connector approach: starknet-react (Argent/Braavos) + Sats Connect (Xverse)

**Key files to modify**:
- `frontend/src/providers/StarknetProvider.tsx` — Add Xverse provider
- `frontend/src/components/features/wallet/ConnectButton.tsx` — Add Xverse button
- `frontend/src/stores/walletStore.ts` — Unify wallet state

### Alternative Wallets

| Wallet | Bitcoin Support | Starknet Support | SDK |
|--------|----------------|------------------|-----|
| **Xverse** | Native | Full | sats-connect |
| **Braavos** | Via Atomiq | Native | starknet-react |
| **Ready (Argent X)** | No | Native | starknet-react |
| **MetaMask Snap** | No | Via Snap | wallet_invokeSnap |

## ERC-20 Token Standard on Starknet (SNIP-2)

Starknet uses **SNIP-2** as its token standard (equivalent to EIP-20):
- Functions: `total_supply`, `balance_of`, `transfer`, `transfer_from`, `approve`, `allowance`
- Events: `Transfer`, `Approval`
- Implementation: OpenZeppelin Contracts for Cairo (`ERC20Component`)
- Related: SNIP-5 (interface detection), SNIP-6 (account interface)

## Complete Token Address Reference

### Starknet Mainnet

| Token | Symbol | Decimals | Address |
|-------|--------|----------|---------|
| Ether | ETH | 18 | `0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7` |
| Starknet Token | STRK | 18 | `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d` |
| USDC (Native) | USDC | 6 | `0x033068F6539f8e6e6b131e6B2B814e6c34A5224bC66947c47DaB9dFeE93b35fb` |
| USDC (Bridged) | USDC.e | 6 | `0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8` |
| Tether USD | USDT | 6 | `0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8` |
| DAI | DAI | 18 | `0x05574eb6b8789a91466f902c380d978e472db68170ff82a5b650b95a58ddf4ad` |
| Wrapped BTC | WBTC | 8 | `0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac` |
| Lombard BTC | LBTC | 8 | `0x036834A40984312F7f7de8D31e3f6305B325389eAEeA5B1c0664b2fB936461a4` |
| Threshold BTC | tBTC | 18 | `0x04daa17763b286d1e59b97c283c0b8c949994c361e426a28f743c67bdfe9a32` |

### Starknet Sepolia Testnet

| Token | Symbol | Address |
|-------|--------|---------|
| ETH | ETH | `0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7` |
| STRK | STRK | `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d` |
| USDC | USDC | `0x0512feAc6339Ff7889822cb5aA2a86C848e9D392bB0E3E237C008674feeD8343` |
| USDT | USDT | `0x02ab8758891e84b968ff11361789070c6b1af2df618d6d2f4a78b0757573c6eb` |
| WBTC | WBTC | `0x00452bd5c0512a61df7c7be8cfea5e4f893cb40e126bdc40aee6054db955129e` |

**Note**: ETH and STRK use the same addresses on mainnet and Sepolia.

## Recommendation for Zylith

### Immediate (Phase 0)

1. **Update `frontend/src/config/tokens.ts`**: Replace ETH/STRK-only list with:
   - WBTC, tBTC, LBTC (Bitcoin tokens — primary)
   - ETH, STRK (infrastructure tokens)
   - USDC (stablecoin for pairs)
2. **Add Xverse wallet**: Integrate `sats-connect` alongside existing starknet-react connectors
3. **Add testnet WBTC**: Available on Sepolia for development

### Short-term (Phase 1-2)

4. **Mainnet token addresses**: Use the verified addresses above
5. **Bitcoin-denominated displays**: Add sats formatting option for BTC amounts
6. **Bridge integration**: Link to StarkGate / Atomiq for BTC onboarding
7. **Default pool pairs**: WBTC/USDC, tBTC/USDC, LBTC/USDC

### Long-term (Phase 6)

8. **Alpen Glock bridge**: Integrate trustless BTC↔Starknet when available (2026)
9. **Native USDC (CCTP V2)**: Use Circle's native USDC for cross-chain transfers

## Sources

- [Starknet x Bitcoin: BTCFi](https://www.starknet.io/blog/starknet-x-bitcoin-the-next-step-btcfi-on-starknet/)
- [Starknet Bitcoin Yield Guide](https://www.starknet.io/blog/bitcoin-yield/)
- [tBTC Launches on Starknet](https://blog.threshold.network/tbtc-launches-on-starknet/)
- [Lombard Brings Bitcoin to Starknet](https://www.starknet.io/blog/lombard-brings-bitcoin-to-starknet-through-lbtc-integration/)
- [Atomiq wBTC on Starknet](https://www.starknet.io/blog/atomiq-wbtc-on-starknet/)
- [Starknet + Alpen Glock](https://www.starknet.io/blog/starknet-alpen-bitcoin-glock/)
- [Xverse Starknet Wallet](https://www.xverse.app/starknet-wallet)
- [Sats Connect Docs](https://docs.xverse.app/sats-connect)
- [BitcoinFi on Starknet via Xverse](https://www.xverse.app/blog/bitcoinfi-on-starknet)
- [StarkGate Bridge](https://starkgate.starknet.io/)
- [starknet-io/starknet-addresses](https://github.com/starknet-io/starknet-addresses)
- [Circle Native USDC on Starknet](https://www.circle.com/blog/now-available-native-usdc-cctp-on-starknet)
- [SNIP-2 Token Standard](https://github.com/starknet-io/SNIPs/blob/main/SNIPS/snip-2.md)
