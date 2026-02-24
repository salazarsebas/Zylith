import { useQuery } from "@tanstack/react-query";
import { useSdkStore } from "@/stores/sdkStore";
import { SEPOLIA_ADDRESSES, FEE_TIERS } from "@zylith/sdk";
import { TESTNET_TOKENS } from "@/config/tokens";
import type { PoolKey } from "@zylith/sdk";

export interface PositionFeesData {
  commitment: string;
  tokensOwed0: bigint;
  tokensOwed1: bigint;
}

export interface AggregatedFees {
  positions: PositionFeesData[];
  totalTokensOwed0: bigint;
  totalTokensOwed1: bigint;
}

/**
 * Fetches uncollected fees for all shielded positions and aggregates totals.
 * Returns real-time data from on-chain position state.
 */
export function useAllPositionsFees() {
  const client = useSdkStore((s) => s.client);
  const positions = useSdkStore((s) => s.unspentPositions);

  // Build poolKey for the hardcoded STRK/ETH 0.3% pool
  const poolKey: PoolKey | null = (() => {
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

  // Use coordinator address as the on-chain owner of all shielded positions
  const coordinatorAddress = SEPOLIA_ADDRESSES.coordinator;

  return useQuery({
    queryKey: ["positions", "allFees", positions.map((p) => p.commitment)],
    queryFn: async (): Promise<AggregatedFees> => {
      if (!client || !poolKey) {
        throw new Error("Not ready");
      }

      // Fetch fees for all positions in parallel
      const feePromises = positions.map(async (position) => {
        try {
          const positionData = await client.getPosition(
            poolKey,
            coordinatorAddress,
            position.tickLower,
            position.tickUpper
          );

          return {
            commitment: position.commitment,
            tokensOwed0: positionData.tokensOwed0,
            tokensOwed1: positionData.tokensOwed1,
          };
        } catch (error) {
          console.error(
            `Failed to fetch fees for position ${position.commitment}:`,
            error
          );
          // Return zero fees on error to prevent breaking the entire query
          return {
            commitment: position.commitment,
            tokensOwed0: 0n,
            tokensOwed1: 0n,
          };
        }
      });

      const positionFees = await Promise.all(feePromises);

      // Aggregate totals
      const totals = positionFees.reduce(
        (acc, curr) => ({
          totalTokensOwed0: acc.totalTokensOwed0 + curr.tokensOwed0,
          totalTokensOwed1: acc.totalTokensOwed1 + curr.tokensOwed1,
        }),
        { totalTokensOwed0: 0n, totalTokensOwed1: 0n }
      );

      return {
        positions: positionFees,
        totalTokensOwed0: totals.totalTokensOwed0,
        totalTokensOwed1: totals.totalTokensOwed1,
      };
    },
    enabled: !!client && !!poolKey && positions.length > 0,
    refetchInterval: 12_000, // Match pool state refetch interval
    staleTime: 10_000,
  });
}
