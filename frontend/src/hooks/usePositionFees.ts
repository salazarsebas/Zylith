import { useQuery } from "@tanstack/react-query";
import { useSdkStore } from "@/stores/sdkStore";
import { queryKeys } from "@/lib/queryKeys";
import { SEPOLIA_ADDRESSES, FEE_TIERS } from "@zylith/sdk";
import { TESTNET_TOKENS } from "@/config/tokens";
import type { PoolKey, PositionNote } from "@zylith/sdk";

/**
 * Fetches uncollected fees for a specific shielded position.
 * Returns real-time data from on-chain position state.
 */
export function usePositionFees(position: PositionNote | null) {
  const client = useSdkStore((s) => s.client);

  // Build poolKey for the hardcoded STRK/ETH 0.3% pool
  const poolKey: PoolKey | null = (() => {
    if (!position) return null;

    const token0 = TESTNET_TOKENS[0];
    const token1 = TESTNET_TOKENS[1];
    if (!token0 || !token1) return null;

    const [t0, t1] =
      BigInt(token0.address) < BigInt(token1.address)
        ? [token0.address, token1.address]
        : [token1.address, token0.address];

    return {
      token0: t0,
      token1: t1,
      fee: FEE_TIERS.MEDIUM.fee,
      tickSpacing: FEE_TIERS.MEDIUM.tickSpacing,
    };
  })();

  // The on-chain owner of shielded positions is the ASP relayer (get_caller_address() in shielded_mint)
  const ownerAddress = SEPOLIA_ADDRESSES.relayer;

  return useQuery({
    queryKey: position && poolKey
      ? queryKeys.position(poolKey, ownerAddress, position.tickLower, position.tickUpper)
      : ["position", "none"],
    queryFn: async () => {
      if (!client || !poolKey || !position) {
        throw new Error("Not ready");
      }

      const positionData = await client.getPosition(
        poolKey,
        ownerAddress,
        position.tickLower,
        position.tickUpper
      );

      return {
        tokensOwed0: positionData.tokensOwed0,
        tokensOwed1: positionData.tokensOwed1,
        liquidity: positionData.liquidity,
        feeGrowthInside0Last: positionData.feeGrowthInside0Last,
        feeGrowthInside1Last: positionData.feeGrowthInside1Last,
      };
    },
    enabled: !!client && !!poolKey && !!position,
    refetchInterval: 12_000, // Match pool state refetch interval
    staleTime: 10_000,
  });
}
