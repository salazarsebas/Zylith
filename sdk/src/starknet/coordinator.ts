/** Coordinator contract reader using starknet.js */
import { Contract, RpcProvider } from "starknet";
import { COORDINATOR_ABI } from "./abis/coordinator.js";

export class CoordinatorReader {
  private contract: Contract;

  constructor(provider: RpcProvider, coordinatorAddress: string) {
    this.contract = new Contract({
      abi: COORDINATOR_ABI,
      address: coordinatorAddress,
      providerOrAccount: provider,
    });
  }

  async isNullifierSpent(nullifierHash: string): Promise<boolean> {
    const result = await this.contract.is_nullifier_spent(
      BigInt(nullifierHash),
    );
    return Boolean(result);
  }

  async getMerkleRoot(): Promise<bigint> {
    const result = await this.contract.get_merkle_root();
    return BigInt(result);
  }

  async isKnownRoot(root: string): Promise<boolean> {
    const result = await this.contract.is_known_root(BigInt(root));
    return Boolean(result);
  }

  async getNextLeafIndex(): Promise<number> {
    const result = await this.contract.get_next_leaf_index();
    return Number(result);
  }

  async isPaused(): Promise<boolean> {
    const result = await this.contract.is_paused();
    return Boolean(result);
  }

  async getAdmin(): Promise<string> {
    const result = await this.contract.get_admin();
    return "0x" + BigInt(result).toString(16);
  }
}
