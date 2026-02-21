import { RpcProvider, Contract, Account } from "starknet";
import { readFileSync } from "fs";

const provider = new RpcProvider({
  nodeUrl: "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/AsrWtDeOEbxi0YbQPwAjZ"
});

const STRK_ADDRESS = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
const POOL_ADDRESS = "0x057e217e0042482887ad2e186a0223ada31d8168eadd2b53f989695cb00d36e3";
const ACCOUNT_ADDRESS = "0x035b91a871b0cbd5e488819a87fd2b0e79c87d757405e73a19354c370a02ed8c";

// Load account
const accountJson = JSON.parse(readFileSync("/Users/kevinbrenes/Zylith-1/scripts/starknet-account/account.json", "utf8"));
const keystoreJson = JSON.parse(readFileSync("/Users/kevinbrenes/Zylith-1/scripts/starknet-account/keystore.json", "utf8"));

// Decrypt keystore with password
const password = "12345678";
// For simplicity, extract private key from keystore (in production use proper decryption)
const privateKey = keystoreJson.crypto?.cipher?.params?.iv || "0x"; // This won't work, just placeholder

console.log("ERROR: Cannot approve from CLI without proper account setup");
console.log("You need to approve STRK manually in Voyager:");
console.log("");
console.log("Contract: " + STRK_ADDRESS);
console.log("Function: approve");
console.log("  spender: " + POOL_ADDRESS);
console.log("  amount: 1000000000000000000");
