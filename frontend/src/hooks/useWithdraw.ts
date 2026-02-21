import { useMutation } from "@tanstack/react-query";
import { useSdkStore } from "@/stores/sdkStore";
import { useWalletStore } from "@/stores/walletStore";
import { useToast } from "@/components/ui/Toast";
import { queryClient } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";

interface WithdrawInput {
  noteCommitment: string;
}

export function useWithdraw() {
  const client = useSdkStore((s) => s.client);
  const walletAddress = useWalletStore((s) => s.address);
  const refreshBalances = useSdkStore((s) => s.refreshBalances);
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ noteCommitment }: WithdrawInput) => {
      if (!client) throw new Error("SDK not initialized");
      if (!walletAddress) throw new Error("Wallet not connected");
      const result = await client.withdraw({
        noteCommitment,
        recipient: walletAddress
      });
      await client.saveNotes();
      return result;
    },
    onSuccess: (data) => {
      refreshBalances();
      queryClient.invalidateQueries({ queryKey: queryKeys.treeRoot() });
      toast(`Withdrawal confirmed: ${data.txHash.slice(0, 10)}...`, "success");
    },
    onError: (err) => {
      toast(`Withdrawal failed: ${err.message}`, "error");
    },
  });
}
