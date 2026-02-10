import { useMutation } from "@tanstack/react-query";
import { useSdkStore } from "@/stores/sdkStore";
import { useToast } from "@/components/ui/Toast";
import { queryClient } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import type { PoolKey } from "@zylith/sdk";

interface SwapInput {
  poolKey: PoolKey;
  inputNoteCommitment: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  amountOutMin: bigint;
  expectedAmountOut: bigint;
  sqrtPriceLimit: bigint;
}

export function useSwap() {
  const client = useSdkStore((s) => s.client);
  const refreshBalances = useSdkStore((s) => s.refreshBalances);
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: SwapInput) => {
      if (!client) throw new Error("SDK not initialized");
      const result = await client.swap(input);
      await client.saveNotes();
      return result;
    },
    onSuccess: (data, variables) => {
      refreshBalances();
      queryClient.invalidateQueries({
        queryKey: queryKeys.poolState(variables.poolKey),
      });
      toast(`Swap confirmed: ${data.txHash.slice(0, 10)}...`, "success");
    },
    onError: (err) => {
      toast(`Swap failed: ${err.message}`, "error");
    },
  });
}
