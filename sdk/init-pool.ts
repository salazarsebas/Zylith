import { RpcProvider, Account, Contract, cairo } from "starknet";
import { POOL_ABI } from "./src/starknet/abis/pool.js";

const provider = new RpcProvider({
  nodeUrl: "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/AsrWtDeOEbxi0YbQPwAjZ"
});

// Admin account
const ADMIN_ADDRESS = "0x035b91a871b0cbd5e488819a87fd2b0e79c87d757405e73a19354c370a02ed8c";
const ADMIN_PRIVATE_KEY = "0x077dbde8956e872b0040e80d90b56eba3d4ace9b1527acfafd61d32fef714ed8";
const POOL_ADDRESS = "0x0379619ca85d2612f5a11f2b2429328f911b2c57112f66898e08ab867654f3d2";

// Tokens (ordered: token_0 < token_1 by address value)
// STRK: 0x0471... < ETH: 0x049d... → STRK=token_0, ETH=token_1
const STRK = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
const ETH  = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";

const account = new Account(provider, ADMIN_ADDRESS, ADMIN_PRIVATE_KEY);
const pool = new Contract(POOL_ABI as any, POOL_ADDRESS, account);

// sqrt price Q128.128 for price = 0.001 (1 STRK = 0.001 ETH)
// sqrtPrice = sqrt(0.001) * 2^128 = 10760673270633031395736942053825708032
const sqrtPrice = cairo.uint256(10760673270633031395736942053825708032n);

const poolKey = {
  token_0: STRK,
  token_1: ETH,
  fee_tier: { fee: 3000, tick_spacing: 60 }
};

console.log("Initializing pool...");
console.log("Pool key:", poolKey);
console.log("sqrt_price:", sqrtPrice);

try {
  const result = await pool.invoke("initialize", [poolKey, sqrtPrice]);
  console.log("Tx hash:", result.transaction_hash);
  console.log("Waiting for confirmation...");
  await provider.waitForTransaction(result.transaction_hash);
  console.log("Pool initialized!");
} catch (e: any) {
  console.error("Error:", e.message);
}
