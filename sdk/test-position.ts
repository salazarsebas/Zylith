import { RpcProvider, Contract } from "starknet";
import { POOL_ABI } from "./src/starknet/abis/pool.js";

const provider = new RpcProvider({
  nodeUrl: "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/AsrWtDeOEbxi0YbQPwAjZ"
});

const pool = new Contract(POOL_ABI, "0x057e217e0042482887ad2e186a0223ada31d8168eadd2b53f989695cb00d36e3", provider);

const result = await pool.get_position(
  {
    token_0: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
    token_1: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
    fee_tier: { fee: 3000, tick_spacing: 60 },
    extension: 0
  },
  "0x035b91a871b0cbd5e488819a87fd2b0e79c87d757405e73a19354c370a02ed8c",
  { sign: true, mag: 120 },
  { sign: false, mag: 120 }
);

console.log("Liquidity:", result.liquidity.toString());
console.log("\nUsa este número exacto en el burn:");
console.log(result.liquidity.toString());
