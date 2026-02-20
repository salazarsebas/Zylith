import { RpcProvider, Contract } from "starknet";
import { POOL_ABI } from "./src/starknet/abis/pool.js";

const provider = new RpcProvider({
  nodeUrl: "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/AsrWtDeOEbxi0YbQPwAjZ"
});

const pool = new Contract(POOL_ABI, "0x057e217e0042482887ad2e186a0223ada31d8168eadd2b53f989695cb00d36e3", provider);

const poolKey = {
  token_0: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
  token_1: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
  fee_tier: { fee: 3000, tick_spacing: 60 },
  extension: 0
};

console.log("Checking tick_lower (-120):");
try {
  const tickLower = await pool.get_tick_info(poolKey, { sign: true, mag: 120 });
  console.log("  liquidity_gross:", tickLower.liquidity_gross.toString());
  console.log("  liquidity_net:", tickLower.liquidity_net.toString());
  console.log("  initialized:", tickLower.initialized);
} catch (e) {
  console.log("  Error:", e.message);
}

console.log("\nChecking tick_upper (120):");
try {
  const tickUpper = await pool.get_tick_info(poolKey, { sign: false, mag: 120 });
  console.log("  liquidity_gross:", tickUpper.liquidity_gross.toString());
  console.log("  liquidity_net:", tickUpper.liquidity_net.toString());
  console.log("  initialized:", tickUpper.initialized);
} catch (e) {
  console.log("  Error:", e.message);
}
