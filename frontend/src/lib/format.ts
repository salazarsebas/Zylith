/**
 * Format a bigint token amount to a display string.
 * e.g., formatTokenAmount(1500000000000000000n, 18) → "1.5"
 */
export function formatTokenAmount(
  amount: bigint,
  decimals: number,
  maxDecimals = 6
): string {
  if (amount === 0n) return "0";

  const divisor = 10n ** BigInt(decimals);
  const whole = amount / divisor;
  const remainder = amount % divisor;

  if (remainder === 0n) return whole.toLocaleString();

  const remainderStr = remainder.toString().padStart(decimals, "0");
  const trimmed = remainderStr.slice(0, maxDecimals).replace(/0+$/, "");

  if (!trimmed) return whole.toLocaleString();
  return `${whole.toLocaleString()}.${trimmed}`;
}

/**
 * Parse a display string back to a bigint amount.
 * e.g., parseTokenAmount("1.5", 18) → 1500000000000000000n
 */
export function parseTokenAmount(value: string, decimals: number): bigint {
  if (!value || value === "0") return 0n;

  const parts = value.split(".");
  const whole = parts[0] ?? "0";
  let fractional = parts[1] ?? "";

  if (fractional.length > decimals) {
    fractional = fractional.slice(0, decimals);
  } else {
    fractional = fractional.padEnd(decimals, "0");
  }

  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fractional);
}

/**
 * Truncate an address for display.
 * e.g., truncateAddress("0x049d3657...004dc7") → "0x049d...4dc7"
 */
export function truncateAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Format a transaction hash as a link-ready string.
 */
export function starkscanUrl(txHash: string): string {
  return `https://sepolia.starkscan.co/tx/${txHash}`;
}
