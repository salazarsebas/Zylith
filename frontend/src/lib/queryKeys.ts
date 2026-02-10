import type { PoolKey } from "@zylith/sdk";

function poolKeyId(poolKey: PoolKey): string {
  return `${poolKey.token0}-${poolKey.token1}-${poolKey.fee}-${poolKey.tickSpacing}`;
}

export const queryKeys = {
  poolState: (poolKey: PoolKey) =>
    ["pool", "state", poolKeyId(poolKey)] as const,
  position: (poolKey: PoolKey, owner: string, tickLower: number, tickUpper: number) =>
    ["pool", "position", poolKeyId(poolKey), owner, tickLower, tickUpper] as const,
  aspStatus: () => ["asp", "status"] as const,
  treeRoot: () => ["tree", "root"] as const,
  nullifier: (hash: string) => ["nullifier", hash] as const,
  isPaused: () => ["coordinator", "paused"] as const,
  merkleRoot: () => ["coordinator", "root"] as const,
} as const;
