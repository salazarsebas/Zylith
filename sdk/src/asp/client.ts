/**
 * HTTP client for the ASP (Anonymous Service Provider) REST API.
 * Wraps all 9 endpoints with typed request/response handling.
 */
import type {
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
} from "./types.js";

export class AspClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string, timeout: number = 60000) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.timeout = timeout;
  }

  // ========================================================================
  // Deposit & Withdrawal
  // ========================================================================

  async deposit(req: DepositRequest): Promise<DepositResponse> {
    return this.post("/deposit", req);
  }

  async withdraw(req: WithdrawRequest): Promise<WithdrawResponse> {
    return this.post("/withdraw", req);
  }

  // ========================================================================
  // Shielded Operations
  // ========================================================================

  async swap(req: SwapRequest): Promise<SwapResponse> {
    return this.post("/swap", req);
  }

  async mint(req: MintRequest): Promise<MintResponse> {
    return this.post("/mint", req);
  }

  async burn(req: BurnRequest): Promise<BurnResponse> {
    return this.post("/burn", req);
  }

  // ========================================================================
  // Tree Queries
  // ========================================================================

  async getTreeRoot(): Promise<TreeRootResponse> {
    return this.get("/tree/root");
  }

  async getTreePath(leafIndex: number): Promise<TreeProofResponse> {
    return this.get(`/tree/path/${leafIndex}`);
  }

  // ========================================================================
  // Nullifier Queries
  // ========================================================================

  async getNullifier(hash: string): Promise<NullifierResponse> {
    return this.get(`/nullifier/${hash}`);
  }

  // ========================================================================
  // Status
  // ========================================================================

  async getStatus(): Promise<StatusResponse> {
    return this.get("/status");
  }

  // ========================================================================
  // Sync
  // ========================================================================

  async syncCommitments(
    commitments: string[],
  ): Promise<{ commitment: string; leaf_index: number | null }[]> {
    const response = await this.post<{
      commitments: { commitment: string; leaf_index: number | null }[];
    }>("/sync-commitments", { commitments });
    return response.commitments;
  }

  // ========================================================================
  // Internal
  // ========================================================================

  private async get<T>(path: string): Promise<T> {
    return this.request("GET", path);
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    return this.request("POST", path, body);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(
          `ASP ${method} ${path} failed (${response.status}): ${errorText}`,
        );
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
