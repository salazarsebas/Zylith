/**
 * Seed the new pool: initialize + approve + add public liquidity
 * Run: cd sdk && bun run seed-pool.ts
 */
import { RpcProvider, Account, Contract, cairo, CallData, Signer } from "starknet";
import { POOL_ABI } from "./src/starknet/abis/pool.js";

const provider = new RpcProvider({
  nodeUrl: "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/AsrWtDeOEbxi0YbQPwAjZ",
});

const ADMIN_ADDRESS = "0x035b91a871b0cbd5e488819a87fd2b0e79c87d757405e73a19354c370a02ed8c";
const ADMIN_PRIVATE_KEY = "0x077dbde8956e872b0040e80d90b56eba3d4ace9b1527acfafd61d32fef714ed8";
const POOL_ADDRESS = "0x070b2753903daa003d01e874bbb2ac1d27461e0a51bb6bc9801fb0937f3c94ed";

const STRK = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
const ETH = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";

// @ts-ignore - starknet.js v9 object constructor
const account = new Account({ provider, address: ADMIN_ADDRESS, signer: new Signer(ADMIN_PRIVATE_KEY) });

const poolKey = {
  token_0: STRK,
  token_1: ETH,
  fee_tier: { fee: 3000, tick_spacing: 60 },
};

// sqrt price Q128.128 for price ≈ 0.001 (1 STRK ≈ 0.001 ETH)
const SQRT_PRICE = 10760673270633031395736942053825708032n;

const TICK_LOWER = { sign: true, mag: 69600 };  // -69600 (covers tick -69082)
const TICK_UPPER = { sign: false, mag: 600 };   // +600

const ERC20_ABI = [
  { type: "function", name: "balanceOf", inputs: [{ name: "account", type: "core::starknet::contract_address::ContractAddress" }], outputs: [{ type: "core::integer::u256" }], state_mutability: "view" },
] as const;

async function main() {
  // @ts-ignore - v9 object constructor
  const strkContract = new Contract({ abi: ERC20_ABI as any, address: STRK, provider });
  // @ts-ignore
  const ethContract = new Contract({ abi: ERC20_ABI as any, address: ETH, provider });

  const strkBal = await strkContract.balanceOf(ADMIN_ADDRESS);
  const ethBal = await ethContract.balanceOf(ADMIN_ADDRESS);
  console.log("STRK balance:", Number(strkBal) / 1e18);
  console.log("ETH balance:", Number(ethBal) / 1e18);

  // Step 1: Initialize pool (using account.execute for v9 compatibility)
  console.log("\n--- Step 1: Initialize Pool ---");
  try {
    const initCalldata = CallData.compile([poolKey, cairo.uint256(SQRT_PRICE)]);
    const initResult = await account.execute([
      { contractAddress: POOL_ADDRESS, entrypoint: "initialize", calldata: initCalldata },
    ]);
    console.log("Init tx:", initResult.transaction_hash);
    await provider.waitForTransaction(initResult.transaction_hash);
    console.log("Pool initialized!");
  } catch (e: any) {
    const msg = e.message || String(e);
    if (msg.includes("POOL_ALREADY_INIT") || msg.includes("already")) {
      console.log("Pool already initialized, skipping.");
    } else {
      console.error("Init error:", msg.slice(0, 300));
    }
  }

  // Step 2: Approve tokens
  console.log("\n--- Step 2: Approve Tokens ---");
  const approveAmount = cairo.uint256(100n * 10n ** 18n);
  const approveTx = await account.execute([
    { contractAddress: STRK, entrypoint: "approve", calldata: CallData.compile([POOL_ADDRESS, approveAmount]) },
    { contractAddress: ETH, entrypoint: "approve", calldata: CallData.compile([POOL_ADDRESS, approveAmount]) },
  ]);
  console.log("Approve tx:", approveTx.transaction_hash);
  await provider.waitForTransaction(approveTx.transaction_hash);
  console.log("Tokens approved!");

  // Step 3: Add liquidity (using account.execute for v9 compatibility)
  console.log("\n--- Step 3: Add Liquidity ---");
  const liquidity = 1000000000000000n; // 10^15
  try {
    const mintCalldata = CallData.compile([poolKey, TICK_LOWER, TICK_UPPER, liquidity, ADMIN_ADDRESS]);
    const mintResult = await account.execute([
      { contractAddress: POOL_ADDRESS, entrypoint: "mint", calldata: mintCalldata },
    ]);
    console.log("Mint tx:", mintResult.transaction_hash);
    await provider.waitForTransaction(mintResult.transaction_hash);
    console.log("Liquidity added!");
  } catch (e: any) {
    console.error("Mint error:", (e.message || String(e)).slice(0, 400));
  }

  // Step 4: Check pool state
  console.log("\n--- Step 4: Pool State ---");
  // @ts-ignore
  const poolR = new Contract({ abi: POOL_ABI as any, address: POOL_ADDRESS, provider });
  const state = await poolR.get_pool_state(poolKey);
  console.log("sqrtPrice:", state.sqrt_price.toString());
  console.log("tick:", JSON.stringify(state.tick));
  console.log("liquidity:", state.liquidity.toString());

  console.log("\nDone! Pool is seeded.");
}

main().catch(console.error);
