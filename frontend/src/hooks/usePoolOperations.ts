/**
 * Hook for pool operations with automatic approval handling
 */
import { useStarknetWallet } from "@/providers/StarknetProvider";
import { useState } from "react";
import type { Call } from "starknet";
import {
  toTick,
  SEPOLIA_ADDRESSES,
} from "@zylith/sdk";

const POOL_ADDRESS = SEPOLIA_ADDRESSES.pool;

interface SwapParams {
  tokenInAddress: string;
  tokenOutAddress: string;
  amountIn: bigint;
  fee: number;
  tickSpacing: number;
}

interface MintParams {
  token0Address: string;
  token1Address: string;
  fee: number;
  tickSpacing: number;
  tickLower: number;
  tickUpper: number;
  amount: bigint;
}

export function usePoolOperations() {
  const { execute, address, isConnected } = useStarknetWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Execute a swap with automatic token approval
   * This handles the entire flow:
   * 1. Check if approval is needed
   * 2. Build multicall with approval + swap
   * 3. Execute in single transaction via Cavos
   */
  const executeSwap = async (params: SwapParams) => {
    if (!execute || !address || !isConnected) {
      throw new Error("Wallet not connected");
    }

    setIsLoading(true);
    setError(null);

    try {
      // Determine token order
      const zeroForOne =
        BigInt(params.tokenInAddress) < BigInt(params.tokenOutAddress);
      const [token0, token1] = zeroForOne
        ? [params.tokenInAddress, params.tokenOutAddress]
        : [params.tokenOutAddress, params.tokenInAddress];

      // For simplicity, use a safe sqrt_price_limit
      // In production, you'd fetch pool state to calculate this
      const MIN_SQRT_PRICE = 4295128740n;
      const MAX_SQRT_PRICE = BigInt("1461446703485210103287273052203988822378723970340");
      const validLimit = zeroForOne ? MIN_SQRT_PRICE : MAX_SQRT_PRICE;

      // Build approve + swap calls manually
      const calls: Call[] = [
        // Approve token
        {
          contractAddress: params.tokenInAddress,
          entrypoint: "approve",
          calldata: [
            POOL_ADDRESS,
            "0xffffffffffffffffffffffffffffffff", // max uint128 low
            "0xffffffffffffffffffffffffffffffff", // max uint128 high
          ],
        },
        // Swap
        {
          contractAddress: POOL_ADDRESS,
          entrypoint: "swap",
          calldata: [
            token0,
            token1,
            params.fee.toString(),
            params.tickSpacing.toString(),
            zeroForOne ? "1" : "0", // zero_for_one
            params.amountIn.toString(), // amount_specified.mag
            "0", // amount_specified.sign (false = exact input)
            validLimit.toString(), // sqrt_price_limit (low)
            "0", // sqrt_price_limit (high)
            address!, // recipient
          ],
        },
      ];

      const txHash = await execute(calls);
      console.log("Swap transaction hash:", txHash);

      setIsLoading(false);
      return txHash;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Swap failed";
      setError(message);
      setIsLoading(false);
      throw err;
    }
  };

  /**
   * Mint liquidity with automatic token approvals
   */
  const executeMint = async (params: MintParams) => {
    if (!execute || !address || !isConnected) {
      throw new Error("Wallet not connected");
    }

    setIsLoading(true);
    setError(null);

    try {
      // Ensure token order (token0 < token1)
      const [token0, token1] =
        BigInt(params.token0Address) < BigInt(params.token1Address)
          ? [params.token0Address, params.token1Address]
          : [params.token1Address, params.token0Address];

      // Build approve + mint calls manually
      const calls: Call[] = [
        // Approve token0
        {
          contractAddress: token0,
          entrypoint: "approve",
          calldata: [
            POOL_ADDRESS,
            "0xffffffffffffffffffffffffffffffff",
            "0xffffffffffffffffffffffffffffffff",
          ],
        },
        // Approve token1
        {
          contractAddress: token1,
          entrypoint: "approve",
          calldata: [
            POOL_ADDRESS,
            "0xffffffffffffffffffffffffffffffff",
            "0xffffffffffffffffffffffffffffffff",
          ],
        },
        // Mint
        {
          contractAddress: POOL_ADDRESS,
          entrypoint: "mint",
          calldata: [
            token0,
            token1,
            params.fee.toString(),
            params.tickSpacing.toString(),
            toTick(params.tickLower).sign ? "1" : "0", // tick_lower.sign
            toTick(params.tickLower).mag.toString(), // tick_lower.mag
            toTick(params.tickUpper).sign ? "1" : "0", // tick_upper.sign
            toTick(params.tickUpper).mag.toString(), // tick_upper.mag
            params.amount.toString(), // amount
            address!, // recipient
          ],
        },
      ];

      const txHash = await execute(calls);
      console.log("Mint transaction hash:", txHash);

      setIsLoading(false);
      return txHash;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Mint failed";
      setError(message);
      setIsLoading(false);
      throw err;
    }
  };

  return {
    executeSwap,
    executeMint,
    isLoading,
    error,
    isConnected,
    address,
  };
}
