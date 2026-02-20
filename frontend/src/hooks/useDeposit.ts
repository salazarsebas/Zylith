import { useMutation } from "@tanstack/react-query";
import { useSdkStore } from "@/stores/sdkStore";
import { useStarknetWallet } from "@/providers/StarknetProvider";
import { useToast } from "@/components/ui/Toast";
import { queryClient } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { generateRandomSecret, SEPOLIA_ADDRESSES } from "@zylith/sdk";
import type { Call } from "starknet";

interface DepositInput {
  amount: bigint;
  token: string;
}

export function useDeposit() {
  const client = useSdkStore((s) => s.client);
  const refreshBalances = useSdkStore((s) => s.refreshBalances);
  const { execute } = useStarknetWallet();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ amount, token }: DepositInput) => {
      if (!client) throw new Error("SDK not initialized");
      if (!execute) throw new Error("Wallet not connected");

      const poolAddress = SEPOLIA_ADDRESSES.pool;

      // Step 1: User approves + transfers tokens to pool via wallet
      const calls: Call[] = [
        {
          contractAddress: token,
          entrypoint: "approve",
          calldata: [
            poolAddress,
            amount.toString(),
            "0", // u256 high
          ],
        },
        {
          contractAddress: token,
          entrypoint: "transfer",
          calldata: [
            poolAddress,
            amount.toString(),
            "0", // u256 high
          ],
        },
      ];

      const txHash = await execute(calls);
      console.log("Token transfer tx:", txHash);

      // Step 2: Register commitment with ASP (on-chain via relayer)
      const result = await client.deposit({
        secret: generateRandomSecret(),
        nullifier: generateRandomSecret(),
        amount,
        token,
      });

      // Save encrypted notes locally
      await client.saveNotes();
      return { ...result, userTxHash: txHash };
    },
    onSuccess: (data) => {
      refreshBalances();
      queryClient.invalidateQueries({ queryKey: queryKeys.treeRoot() });
      toast(`Deposit confirmed (leaf ${data.leafIndex})`, "success");
    },
    onError: (err) => {
      toast(`Deposit failed: ${err.message}`, "error");
    },
  });
}
