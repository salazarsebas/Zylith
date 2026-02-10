import { useMutation } from "@tanstack/react-query";
import { useSdkStore } from "@/stores/sdkStore";
import { useToast } from "@/components/ui/Toast";
import { queryClient } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { generateRandomSecret } from "@zylith/sdk";

interface DepositInput {
  amount: bigint;
  token: string;
}

export function useDeposit() {
  const client = useSdkStore((s) => s.client);
  const refreshBalances = useSdkStore((s) => s.refreshBalances);
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ amount, token }: DepositInput) => {
      if (!client) throw new Error("SDK not initialized");
      const result = await client.deposit({
        secret: generateRandomSecret(),
        nullifier: generateRandomSecret(),
        amount,
        token,
      });
      await client.saveNotes();
      return result;
    },
    onSuccess: (data) => {
      refreshBalances();
      queryClient.invalidateQueries({ queryKey: queryKeys.treeRoot() });
      toast(`Deposit confirmed: ${data.txHash.slice(0, 10)}...`, "success");
    },
    onError: (err) => {
      toast(`Deposit failed: ${err.message}`, "error");
    },
  });
}
