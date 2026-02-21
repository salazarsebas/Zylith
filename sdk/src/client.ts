/**
 * ZylithClient — Main entry point for the Zylith SDK.
 *
 * Supports two proving modes:
 * - "asp": Server-side proving via ASP REST API (recommended)
 * - "client-side": Local proving with snarkjs (requires circuit artifacts)
 */
import { RpcProvider } from "starknet";
import { AspClient } from "./asp/client.js";
import { NoteManager } from "./storage/note-manager.js";
import { PoolReader } from "./starknet/pool.js";
import { CoordinatorReader } from "./starknet/coordinator.js";
import { ClientProver } from "./prover/prover.js";
import { initPoseidon, isInitialized } from "./crypto/poseidon.js";
import { deposit, type DepositParams, type DepositResult } from "./operations/deposit.js";
import { withdraw, type WithdrawParams, type WithdrawResult } from "./operations/withdraw.js";
import { swap, type SwapParams, type SwapResult } from "./operations/swap.js";
import { mint, type MintParams, type MintResult } from "./operations/mint.js";
import { burn, type BurnParams, type BurnResult } from "./operations/burn.js";
import type { ContractAddresses } from "./starknet/contracts.js";
import type { PoolKey, PoolState, Position, ProvingMode } from "./types/index.js";

export interface ZylithClientConfig {
  starknetRpcUrl: string;
  contracts: ContractAddresses;
  mode: ProvingMode;
  aspUrl?: string;
  password: string;
}

export class ZylithClient {
  private config: ZylithClientConfig;
  private provider: RpcProvider;
  private asp?: AspClient;
  private prover?: ClientProver;
  private noteManager: NoteManager;
  private poolReader: PoolReader;
  private coordinatorReader: CoordinatorReader;
  private initialized = false;

  constructor(config: ZylithClientConfig) {
    this.config = config;

    if (config.mode === "asp" && !config.aspUrl) {
      throw new Error("aspUrl is required when mode is 'asp'");
    }

    this.provider = new RpcProvider({ nodeUrl: config.starknetRpcUrl });
    this.poolReader = new PoolReader(this.provider, config.contracts.pool);
    this.coordinatorReader = new CoordinatorReader(
      this.provider,
      config.contracts.coordinator,
    );

    if (config.mode === "asp" && config.aspUrl) {
      this.asp = new AspClient(config.aspUrl);
    } else {
      this.prover = new ClientProver();
    }

    this.noteManager = new NoteManager(config.password);
  }

  /** Initialize Poseidon hash and load encrypted notes. Must call before operations. */
  async init(): Promise<void> {
    if (this.initialized) return;
    if (!isInitialized()) await initPoseidon();
    this.noteManager = await NoteManager.load(this.config.password);

    // Auto-sync leaf indexes for notes that are missing one
    if (this.asp) {
      const missing = [
        ...this.noteManager.getAllNotes().filter((n) => !n.spent && n.leafIndex === undefined),
        ...this.noteManager.getAllPositions().filter((p) => !p.spent && p.leafIndex === undefined),
      ];
      if (missing.length > 0) {
        try {
          const syncData = await this.asp.syncCommitments(missing.map((n) => n.commitment));
          this.noteManager.updateLeafIndexes(syncData);
          await this.noteManager.save();
        } catch {
          // Non-fatal
        }
      }
    }

    this.initialized = true;
  }

  private assertInit(): void {
    if (!this.initialized)
      throw new Error("Client not initialized. Call init() first.");
  }

  private assertAsp(): AspClient {
    if (!this.asp) throw new Error("ASP mode required for this operation");
    return this.asp;
  }

  // ========================================================================
  // Operations (require ASP mode)
  // ========================================================================

  async deposit(params: DepositParams): Promise<DepositResult> {
    this.assertInit();
    return deposit(params, this.assertAsp(), this.noteManager);
  }

  async withdraw(params: WithdrawParams): Promise<WithdrawResult> {
    this.assertInit();
    return withdraw(params, this.assertAsp(), this.noteManager);
  }

  async swap(params: SwapParams): Promise<SwapResult> {
    this.assertInit();
    return swap(params, this.assertAsp(), this.noteManager);
  }

  async mint(params: MintParams): Promise<MintResult> {
    this.assertInit();
    return mint(params, this.assertAsp(), this.noteManager);
  }

  async burn(params: BurnParams): Promise<BurnResult> {
    this.assertInit();
    return burn(params, this.assertAsp(), this.noteManager);
  }

  // ========================================================================
  // Queries (direct Starknet reads)
  // ========================================================================

  async getPoolState(poolKey: PoolKey): Promise<PoolState> {
    return this.poolReader.getPoolState(poolKey);
  }

  async getPosition(
    poolKey: PoolKey,
    owner: string,
    tickLower: number,
    tickUpper: number,
  ): Promise<Position> {
    return this.poolReader.getPosition(poolKey, owner, tickLower, tickUpper);
  }

  async isNullifierSpent(nullifierHash: string): Promise<boolean> {
    return this.coordinatorReader.isNullifierSpent(nullifierHash);
  }

  async getMerkleRoot(): Promise<bigint> {
    return this.coordinatorReader.getMerkleRoot();
  }

  async getNextLeafIndex(): Promise<number> {
    return this.coordinatorReader.getNextLeafIndex();
  }

  async isPaused(): Promise<boolean> {
    return this.coordinatorReader.isPaused();
  }

  // ========================================================================
  // Local State
  // ========================================================================

  /** Get total shielded balance for a token */
  getBalance(token: string): bigint {
    this.assertInit();
    return this.noteManager.getBalance(token);
  }

  /** Get the note manager for advanced operations */
  getNoteManager(): NoteManager {
    this.assertInit();
    return this.noteManager;
  }

  /** Save encrypted notes to storage */
  async saveNotes(): Promise<void> {
    this.assertInit();
    await this.noteManager.save();
  }

  // ========================================================================
  // Low-level access
  // ========================================================================

  getProvider(): RpcProvider {
    return this.provider;
  }

  getPoolReader(): PoolReader {
    return this.poolReader;
  }

  getCoordinatorReader(): CoordinatorReader {
    return this.coordinatorReader;
  }

  getAspClient(): AspClient | undefined {
    return this.asp;
  }

  getProver(): ClientProver | undefined {
    return this.prover;
  }
}
