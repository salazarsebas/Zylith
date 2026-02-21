/** ERC20 approval helpers for seamless token operations */
import { Contract, RpcProvider, Account, Call } from "starknet";

const ERC20_ABI = [
  {
    name: "allowance",
    type: "function",
    inputs: [
      { name: "owner", type: "core::starknet::contract_address::ContractAddress" },
      { name: "spender", type: "core::starknet::contract_address::ContractAddress" },
    ],
    outputs: [{ type: "core::integer::u256" }],
    state_mutability: "view",
  },
  {
    name: "approve",
    type: "function",
    inputs: [
      { name: "spender", type: "core::starknet::contract_address::ContractAddress" },
      { name: "amount", type: "core::integer::u256" },
    ],
    outputs: [{ type: "core::bool" }],
    state_mutability: "external",
  },
] as const;

export interface ApprovalCheck {
  tokenAddress: string;
  spenderAddress: string;
  amountNeeded: bigint;
}

export interface ApprovalResult {
  needsApproval: boolean;
  approvalCall?: Call;
}

/**
 * Check if a token approval is needed for a given spender
 */
export async function checkApproval(
  provider: RpcProvider,
  ownerAddress: string,
  check: ApprovalCheck
): Promise<ApprovalResult> {
  const token = new Contract({
    abi: ERC20_ABI,
    address: check.tokenAddress,
    providerOrAccount: provider,
  });

  try {
    const allowance = await token.allowance(ownerAddress, check.spenderAddress);
    const currentAllowance = BigInt(allowance.toString());

    if (currentAllowance >= check.amountNeeded) {
      return { needsApproval: false };
    }

    // Need approval - create the call
    return {
      needsApproval: true,
      approvalCall: {
        contractAddress: check.tokenAddress,
        entrypoint: "approve",
        calldata: [
          check.spenderAddress,
          (2n ** 256n - 1n).toString(), // Approve max uint256 for convenience
          "0", // high part of u256
        ],
      },
    };
  } catch (error) {
    console.error("Error checking allowance:", error);
    // On error, assume approval is needed to be safe
    return {
      needsApproval: true,
      approvalCall: {
        contractAddress: check.tokenAddress,
        entrypoint: "approve",
        calldata: [
          check.spenderAddress,
          (2n ** 256n - 1n).toString(),
          "0",
        ],
      },
    };
  }
}

/**
 * Check multiple token approvals and return necessary approval calls
 */
export async function checkMultipleApprovals(
  provider: RpcProvider,
  ownerAddress: string,
  checks: ApprovalCheck[]
): Promise<Call[]> {
  const results = await Promise.all(
    checks.map((check) => checkApproval(provider, ownerAddress, check))
  );

  return results
    .filter((result) => result.needsApproval && result.approvalCall)
    .map((result) => result.approvalCall!);
}

/**
 * Build a multicall with automatic approvals prepended
 *
 * This is the key function that eliminates approval friction.
 * Usage:
 *
 * ```typescript
 * const calls = await buildMulticallWithApprovals(
 *   provider,
 *   userAddress,
 *   [
 *     { tokenAddress: STRK, spenderAddress: POOL, amountNeeded: 1000n },
 *     { tokenAddress: ETH, spenderAddress: POOL, amountNeeded: 1000n },
 *   ],
 *   [
 *     { contractAddress: POOL, entrypoint: "mint", calldata: [...] }
 *   ]
 * );
 *
 * await account.execute(calls); // Single transaction!
 * ```
 */
export async function buildMulticallWithApprovals(
  provider: RpcProvider,
  ownerAddress: string,
  approvalChecks: ApprovalCheck[],
  operationCalls: Call[]
): Promise<Call[]> {
  const approvalCalls = await checkMultipleApprovals(
    provider,
    ownerAddress,
    approvalChecks
  );

  // Approvals first, then operations
  return [...approvalCalls, ...operationCalls];
}
