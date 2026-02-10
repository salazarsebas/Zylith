import { useMutation } from "@tanstack/react-query";
import { useSdkStore } from "@/stores/sdkStore";
import { useToast } from "@/components/ui/Toast";
import { queryClient } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import type { PoolKey } from "@zylith/sdk";

interface MintInput {
  poolKey: PoolKey;
  inputNote0Commitment: string;
  inputNote1Commitment: string;
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
  amount0: bigint;
  amount1: bigint;
}

export function useMint() {
  const client = useSdkStore((s) => s.client);
  const refreshBalances = useSdkStore((s) => s.refreshBalances);
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: MintInput) => {
      if (!client) throw new Error("SDK not initialized");
      const result = await client.mint(input);
      await client.saveNotes();
      return result;
    },
    onSuccess: (data, variables) => {
      refreshBalances();
      queryClient.invalidateQueries({
        queryKey: queryKeys.poolState(variables.poolKey),
      });
      toast(`Liquidity added: ${data.txHash.slice(0, 10)}...`, "success");
    },
    onError: (err) => {
      toast(`Add liquidity failed: ${err.message}`, "error");
    },
  });
}
