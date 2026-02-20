import { RpcProvider, Contract } from "starknet";
import { POOL_ABI } from "./src/starknet/abis/pool.js";

const provider = new RpcProvider({
  nodeUrl: "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/AsrWtDeOEbxi0YbQPwAjZ"
});

const pool = new Contract(POOL_ABI, "0x057e217e0042482887ad2e186a0223ada31d8168eadd2b53f989695cb00d36e3", provider);

const result = await pool.get_pool_state({
  token_0: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
  token_1: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
  fee_tier: { fee: 3000, tick_spacing: 60 },
  extension: 0
});

console.log("Pool sqrt_price:", result.sqrt_price.toString());
console.log("Pool tick:", result.tick);
console.log("Pool liquidity:", result.liquidity.toString());

const MIN_SQRT_PRICE = 4295128739n;
const currentPrice = BigInt(result.sqrt_price);

// Para zero_for_one = true, necesitamos: MIN_SQRT_PRICE < limit < currentPrice
const validLimit = currentPrice - 1000000000000000n; // Un poco menos que el precio actual

console.log("\nPara swap STRK → ETH (zero_for_one = true):");
console.log("  sqrt_price_limit debe estar entre", MIN_SQRT_PRICE, "y", currentPrice);
console.log("  Usa:", validLimit.toString());
