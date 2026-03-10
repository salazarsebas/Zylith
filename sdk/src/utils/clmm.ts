/**
 * CLMM math utilities — TypeScript port of the Cairo liquidity math.
 * Used to calculate token amounts from liquidity and price ranges.
 */

// Q128.128 fixed-point ONE = 2^128
const ONE = 2n ** 128n;


function getSqrtPriceAtTick(tick: number): bigint {
  // Port of get_sqrt_price_at_tick from tick_math.cairo
  // Uses the bit-decomposition method identical to the Cairo implementation
  const absTick = Math.abs(tick);

  let ratio: bigint =
    (absTick & 0x1) !== 0
      ? 0xfffcb933bd6fad37aa2d162d1a594001n
      : 0x100000000000000000000000000000000n;

  if ((absTick & 0x2) !== 0) ratio = (ratio * 0xfff97272373d413259a46990580e213an) >> 128n;
  if ((absTick & 0x4) !== 0) ratio = (ratio * 0xfff2e50f5f656932ef12357cf3c7fdccn) >> 128n;
  if ((absTick & 0x8) !== 0) ratio = (ratio * 0xffe5caca7e10e4e61c3624eaa0941cd0n) >> 128n;
  if ((absTick & 0x10) !== 0) ratio = (ratio * 0xffcb9843d60f6159c9db58835c926644n) >> 128n;
  if ((absTick & 0x20) !== 0) ratio = (ratio * 0xff973b41fa98c081472e6896dfb254c0n) >> 128n;
  if ((absTick & 0x40) !== 0) ratio = (ratio * 0xff2ea16466c96a3843ec78b326b52861n) >> 128n;
  if ((absTick & 0x80) !== 0) ratio = (ratio * 0xfe5dee046a99a2a811c461f1969c3053n) >> 128n;
  if ((absTick & 0x100) !== 0) ratio = (ratio * 0xfcbe86c7900a88aedcffc83b479aa3a4n) >> 128n;
  if ((absTick & 0x200) !== 0) ratio = (ratio * 0xf987a7253ac413176f2b074cf7815e54n) >> 128n;
  if ((absTick & 0x400) !== 0) ratio = (ratio * 0xf3392b0822b70005940c7a398e4b70f3n) >> 128n;
  if ((absTick & 0x800) !== 0) ratio = (ratio * 0xe7159475a2c29b7443b29c7fa6e889d9n) >> 128n;
  if ((absTick & 0x1000) !== 0) ratio = (ratio * 0xd097f3bdfd2022b8845ad8f792aa5825n) >> 128n;
  if ((absTick & 0x2000) !== 0) ratio = (ratio * 0xa9f746462d870fdf8a65dc1f90e061e5n) >> 128n;
  if ((absTick & 0x4000) !== 0) ratio = (ratio * 0x70d869a156d2a1b890bb3df62baf32f7n) >> 128n;
  if ((absTick & 0x8000) !== 0) ratio = (ratio * 0x31be135f97d08fd981231505542fcfa6n) >> 128n;
  if ((absTick & 0x10000) !== 0) ratio = (ratio * 0x9aa508b5b7a84e1c677de54f3e99bc9n) >> 128n;
  if ((absTick & 0x20000) !== 0) ratio = (ratio * 0x5d6af8dedb81196699c329225ee604n) >> 128n;
  if ((absTick & 0x40000) !== 0) ratio = (ratio * 0x2216e584f5fa1ea926041bedfe98n) >> 128n;
  if ((absTick & 0x80000) !== 0) ratio = (ratio * 0x48a170391f7dc42444e8fa2n) >> 128n;

  if (tick > 0) {
    ratio = (2n ** 256n - 1n) / ratio;
  }

  // ratio is already in Q128.128 format — return it directly
  return ratio;
}

/**
 * Calculate amount0 from liquidity and price range.
 * amount0 = liquidity * (sqrt_upper - sqrt_lower) / (sqrt_lower * sqrt_upper) * ONE
 */
function getAmount0Delta(
  sqrtPriceA: bigint,
  sqrtPriceB: bigint,
  liquidity: bigint,
): bigint {
  const [sqrtLower, sqrtUpper] =
    sqrtPriceA < sqrtPriceB ? [sqrtPriceA, sqrtPriceB] : [sqrtPriceB, sqrtPriceA];

  if (sqrtUpper === 0n || sqrtLower === 0n) return 0n;

  const numerator = liquidity * ONE * (sqrtUpper - sqrtLower);
  return numerator / sqrtUpper / sqrtLower;
}

/**
 * Calculate amount1 from liquidity and price range.
 * amount1 = liquidity * (sqrt_upper - sqrt_lower) / ONE
 */
function getAmount1Delta(
  sqrtPriceA: bigint,
  sqrtPriceB: bigint,
  liquidity: bigint,
): bigint {
  const [sqrtLower, sqrtUpper] =
    sqrtPriceA < sqrtPriceB ? [sqrtPriceA, sqrtPriceB] : [sqrtPriceB, sqrtPriceA];

  return (liquidity * (sqrtUpper - sqrtLower)) / ONE;
}

/**
 * Estimate swap output amount using constant-product approximation.
 * Uses sqrtPrice to compute the effective price and applies the fee.
 * This is an approximation — actual output may differ slightly due to tick crossings.
 *
 * WARNING: This returns a RAW estimate without slippage buffer.
 * For note commitments, use `estimateSwapOutputSafe()` which applies a conservative
 * slippage buffer to ensure the committed amount <= actual on-chain output.
 *
 * @param sqrtPrice   Current pool sqrt price (Q128.128)
 * @param amountIn    Exact input amount
 * @param zeroForOne  true = token0 in, token1 out
 * @param feePips     Fee in pips (e.g. 3000 = 0.3%)
 * @returns Estimated output amount
 */
export function estimateSwapOutput(
  sqrtPrice: bigint,
  amountIn: bigint,
  zeroForOne: boolean,
  feePips: number,
): bigint {
  if (amountIn === 0n || sqrtPrice === 0n) return 0n;

  const FEE_DENOM = 1_000_000n;
  const amountInAfterFee = (amountIn * (FEE_DENOM - BigInt(feePips))) / FEE_DENOM;

  if (zeroForOne) {
    // token0 in → token1 out: amountOut ≈ amountIn * price = amountIn * sqrtPrice^2 / ONE^2
    return (amountInAfterFee * sqrtPrice * sqrtPrice) / ONE / ONE;
  } else {
    // token1 in → token0 out: amountOut ≈ amountIn / price = amountIn * ONE^2 / sqrtPrice^2
    return (amountInAfterFee * ONE * ONE) / (sqrtPrice * sqrtPrice);
  }
}

/**
 * Estimate swap output with a conservative slippage buffer applied.
 * The committed amount in the ZK note should be <= actual on-chain output.
 * If the estimate is too high, the note would have more value than was actually
 * received — making value unrecoverable. By applying a buffer, we ensure:
 * - committed amount <= actual output (excess stays in pool, minor loss)
 * - amountOutMin = committed amount → tx reverts if actual < committed (no loss)
 *
 * @param sqrtPrice    Current pool sqrt price (Q128.128)
 * @param amountIn     Exact input amount
 * @param zeroForOne   true = token0 in, token1 out
 * @param feePips      Fee in pips (e.g. 3000 = 0.3%)
 * @param slippageBps  Slippage buffer in basis points (default 100 = 1%)
 * @returns Estimated output amount reduced by slippage buffer
 */
export function estimateSwapOutputSafe(
  sqrtPrice: bigint,
  amountIn: bigint,
  zeroForOne: boolean,
  feePips: number,
  slippageBps: number = 100,
): bigint {
  const raw = estimateSwapOutput(sqrtPrice, amountIn, zeroForOne, feePips);
  if (raw === 0n) return 0n;
  const slippageDenom = 10_000n;
  return (raw * (slippageDenom - BigInt(slippageBps))) / slippageDenom;
}

/**
 * Calculate the token amounts returned when burning liquidity from a position.
 * Mirrors the Cairo `get_amounts_for_liquidity` logic with negative delta.
 *
 * @param sqrtPrice   Current pool sqrt price (Q128.128)
 * @param tickLower   Lower tick of the position (signed)
 * @param tickUpper   Upper tick of the position (signed)
 * @param liquidity   Liquidity to remove
 * @returns { amount0, amount1 } — amounts returned to the position owner
 */
export function getAmountsForBurn(
  sqrtPrice: bigint,
  tickLower: number,
  tickUpper: number,
  liquidity: bigint,
): { amount0: bigint; amount1: bigint } {
  const sqrtLower = getSqrtPriceAtTick(tickLower);
  const sqrtUpper = getSqrtPriceAtTick(tickUpper);

  let amount0 = 0n;
  let amount1 = 0n;

  if (sqrtPrice <= sqrtLower) {
    // Current price is below the range — all token0
    amount0 = getAmount0Delta(sqrtLower, sqrtUpper, liquidity);
  } else if (sqrtPrice < sqrtUpper) {
    // Current price is inside the range — both tokens
    amount0 = getAmount0Delta(sqrtPrice, sqrtUpper, liquidity);
    amount1 = getAmount1Delta(sqrtLower, sqrtPrice, liquidity);
  } else {
    // Current price is above the range — all token1
    amount1 = getAmount1Delta(sqrtLower, sqrtUpper, liquidity);
  }

  return { amount0, amount1 };
}
