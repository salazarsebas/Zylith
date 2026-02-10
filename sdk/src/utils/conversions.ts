/** Convert hex string (0x...) to decimal string */
export function hexToDecimal(hex: string): string {
  const stripped = hex.replace(/^0x/i, "");
  return BigInt("0x" + stripped).toString(10);
}

/** Convert decimal string to hex string (0x...) */
export function decimalToHex(decimal: string): string {
  return "0x" + BigInt(decimal).toString(16);
}

/** Split a u256 into (low_128, high_128) for Starknet serialization */
export function u256Split(value: bigint): { low: bigint; high: bigint } {
  const mask128 = (1n << 128n) - 1n;
  return {
    low: value & mask128,
    high: value >> 128n,
  };
}

/** Combine (low_128, high_128) into a u256 */
export function u256Combine(low: bigint, high: bigint): bigint {
  return low + (high << 128n);
}

/**
 * Generate a cryptographically random secret (32 bytes as decimal string).
 * Used for note secrets and nullifiers.
 */
export function generateRandomSecret(): string {
  const bytes = new Uint8Array(31); // 31 bytes to stay within BN254 field
  crypto.getRandomValues(bytes);
  let value = 0n;
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8n) + BigInt(bytes[i]);
  }
  return value.toString(10);
}
