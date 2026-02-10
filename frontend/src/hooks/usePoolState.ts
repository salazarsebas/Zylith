import { useQuery } from "@tanstack/react-query";
import { useSdkStore } from "@/stores/sdkStore";
import { queryKeys } from "@/lib/queryKeys";
import type { PoolKey } from "@zylith/sdk";

export function usePoolState(poolKey: PoolKey | null) {
  const client = useSdkStore((s) => s.client);

  return useQuery({
    queryKey: poolKey ? queryKeys.poolState(poolKey) : ["pool", "none"],
    queryFn: async () => {
      if (!client || !poolKey) throw new Error("Not ready");
      return client.getPoolState(poolKey);
    },
    enabled: !!client && !!poolKey,
    refetchInterval: 12_000,
  });
}
