/** Pool contract reader using starknet.js */
import { Contract, RpcProvider } from "starknet";
import { POOL_ABI } from "./abis/pool.js";
import type { PoolKey, PoolState, Position } from "../types/index.js";

export class PoolReader {
  private contract: Contract;

  constructor(provider: RpcProvider, poolAddress: string) {
    this.contract = new Contract(POOL_ABI, poolAddress, provider);
  }

  async getPoolState(poolKey: PoolKey): Promise<PoolState> {
    const result = await this.contract.get_pool_state({
      token_0: poolKey.token0,
      token_1: poolKey.token1,
      fee_tier: { fee: poolKey.fee, tick_spacing: poolKey.tickSpacing },
    });
    return {
      sqrtPrice: BigInt(result.sqrt_price),
      tick: Number(result.tick),
      liquidity: BigInt(result.liquidity),
      feeGrowthGlobal0: BigInt(result.fee_growth_global_0),
      feeGrowthGlobal1: BigInt(result.fee_growth_global_1),
      protocolFees0: BigInt(result.protocol_fees_0),
      protocolFees1: BigInt(result.protocol_fees_1),
    };
  }

  async getPosition(
    poolKey: PoolKey,
    owner: string,
    tickLower: number,
    tickUpper: number,
  ): Promise<Position> {
    const result = await this.contract.get_position(
      {
        token_0: poolKey.token0,
        token_1: poolKey.token1,
        fee_tier: { fee: poolKey.fee, tick_spacing: poolKey.tickSpacing },
      },
      owner,
      tickLower,
      tickUpper,
    );
    return {
      liquidity: BigInt(result.liquidity),
      feeGrowthInside0Last: BigInt(result.fee_growth_inside_0_last),
      feeGrowthInside1Last: BigInt(result.fee_growth_inside_1_last),
      tokensOwed0: BigInt(result.tokens_owed_0),
      tokensOwed1: BigInt(result.tokens_owed_1),
    };
  }
}
