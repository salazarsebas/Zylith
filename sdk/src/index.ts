// Main client
export { ZylithClient } from "./client.js";
export type { ZylithClientConfig } from "./client.js";

// Types
export type {
  PoolKey,
  PoolState,
  Position,
  CircuitType,
  ProvingMode,
} from "./types/index.js";

export type { Note, PositionNote } from "./storage/types.js";

// Constants
export type { Tick } from "./types/constants.js";
export {
  TREE_HEIGHT,
  MAX_LEAVES,
  TICK_OFFSET,
  MIN_TICK,
  MAX_TICK,
  PUBLIC_INPUT_COUNTS,
  FEE_TIERS,
  BN254_SCALAR_FIELD,
  signedToOffsetTick,
  offsetToSignedTick,
  toTick,
  fromTick,
} from "./types/constants.js";

// Utilities
export {
  hexToDecimal,
  decimalToHex,
  u256Split,
  u256Combine,
  generateRandomSecret,
} from "./utils/conversions.js";

export { getAmountsForBurn } from "./utils/clmm.js";

export {
  validateTick,
  validateTickRange,
  validateTokenOrder,
  validateAmount,
  validateFieldElement,
} from "./utils/validators.js";

// Crypto (advanced usage)
export { initPoseidon, hash } from "./crypto/poseidon.js";
export { computeCommitment, computePositionCommitment } from "./crypto/commitment.js";
export { MerkleTree, getSingleLeafProof } from "./crypto/merkle.js";
export type { MerkleProof, MerkleTreeState } from "./crypto/merkle.js";
export { encrypt, decrypt } from "./crypto/encryption.js";
export type { EncryptedData } from "./crypto/encryption.js";

// ASP client (direct usage)
export { AspClient } from "./asp/client.js";
export type {
  DepositRequest,
  DepositResponse,
  WithdrawRequest,
  WithdrawResponse,
  SwapRequest,
  SwapResponse,
  MintRequest,
  MintResponse,
  BurnRequest,
  BurnResponse,
  TreeRootResponse,
  TreeProofResponse,
  NullifierResponse,
  StatusResponse,
  PoolKeyParams,
} from "./asp/types.js";

// Starknet readers
export { PoolReader } from "./starknet/pool.js";
export { CoordinatorReader } from "./starknet/coordinator.js";
export { SEPOLIA_ADDRESSES, POOL_ABI, COORDINATOR_ABI } from "./starknet/contracts.js";
export type { ContractAddresses } from "./starknet/contracts.js";

// Approval helpers
export {
  checkApproval,
  checkMultipleApprovals,
  buildMulticallWithApprovals,
} from "./starknet/approvals.js";
export type { ApprovalCheck, ApprovalResult } from "./starknet/approvals.js";

// Note manager
export { NoteManager } from "./storage/note-manager.js";

// Client-side prover (advanced usage)
export { ClientProver } from "./prover/prover.js";
export type { ProofResult } from "./prover/prover.js";
export { generateMembershipInputs } from "./prover/inputs/membership.js";
export { generateSwapInputs } from "./prover/inputs/swap.js";
export { generateMintInputs } from "./prover/inputs/mint.js";
export { generateBurnInputs } from "./prover/inputs/burn.js";

// Operation types
export type { DepositParams, DepositResult } from "./operations/deposit.js";
export type { WithdrawParams, WithdrawResult } from "./operations/withdraw.js";
export type { SwapParams, SwapResult } from "./operations/swap.js";
export type { MintParams, MintResult } from "./operations/mint.js";
export type { BurnParams, BurnResult } from "./operations/burn.js";
