import { RpcProvider, Account, Contract, cairo } from "../node_modules/.bun/starknet@9.2.1+9e930878b0ba546c/node_modules/starknet/dist/index.mjs";

const provider = new RpcProvider({
  nodeUrl: "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/AsrWtDeOEbxi0YbQPwAjZ"
});

const ADMIN_ADDRESS = "0x035b91a871b0cbd5e488819a87fd2b0e79c87d757405e73a19354c370a02ed8c";
const ADMIN_PRIVATE_KEY = "0x077dbde8956e872b0040e80d90b56eba3d4ace9b1527acfafd61d32fef714ed8";
const POOL_ADDRESS = "0x0379619ca85d2612f5a11f2b2429328f911b2c57112f66898e08ab867654f3d2";

const STRK = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
const ETH  = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";

console.log("provider:", provider.constructor.name);

const account = new Account(provider, ADMIN_ADDRESS, ADMIN_PRIVATE_KEY);
console.log("account address:", account.address);
