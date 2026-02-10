import { useMutation } from "@tanstack/react-query";
import { useSdkStore } from "@/stores/sdkStore";
import { useToast } from "@/components/ui/Toast";
import { queryClient } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import type { PoolKey } from "@zylith/sdk";

interface BurnInput {
  poolKey: PoolKey;
  positionCommitment: string;
  amount0Out: bigint;
  token0: string;
  amount1Out: bigint;
  token1: string;
  liquidity: bigint;
}

export function useBurn() {
  const client = useSdkStore((s) => s.client);
  const refreshBalances = useSdkStore((s) => s.refreshBalances);
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: BurnInput) => {
      if (!client) throw new Error("SDK not initialized");
      const result = await client.burn(input);
      await client.saveNotes();
      return result;
    },
    onSuccess: (data, variables) => {
      refreshBalances();
      queryClient.invalidateQueries({
        queryKey: queryKeys.poolState(variables.poolKey),
      });
      toast(`Liquidity removed: ${data.txHash.slice(0, 10)}...`, "success");
    },
    onError: (err) => {
      toast(`Remove liquidity failed: ${err.message}`, "error");
    },
  });
}
