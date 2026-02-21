import { RpcProvider, Contract, Account } from "starknet";
import { POOL_ABI } from "./src/starknet/abis/pool.js";

const provider = new RpcProvider({ nodeUrl: "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/AsrWtDeOEbxi0YbQPwAjZ" });
const account = new Account({
  provider,
  address: "0x035b91a871b0cbd5e488819a87fd2b0e79c87d757405e73a19354c370a02ed8c",
  signer: "0x077dbde8956e872b0040e80d90b56eba3d4ace9b1527acfafd61d32fef714ed8",
});

const POOL = "0x0499a1be042eefdcc30de5b44d93edba865c1d24d2144a7ccd03af4aa1b02782";
const ETH = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";
const STRK = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

const pool = new Contract({ abi: POOL_ABI, address: POOL, providerOrAccount: account });

const poolKey = { token_0: ETH, token_1: STRK, fee_tier: { fee: 3000, tick_spacing: 60 } };
const tickLower = { sign: true, mag: 69120 };
const tickUpper = { sign: false, mag: 100020 };

console.log("Adding seed liquidity...");
const tx = await pool.mint(poolKey, tickLower, tickUpper, 10000000n, account.address);
console.log("Waiting for tx:", tx.transaction_hash);
await provider.waitForTransaction(tx.transaction_hash);
console.log("Done! tx:", tx.transaction_hash);
