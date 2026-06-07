/**
 * Converts a token amount to base units (smallest denomination).
 * Example: toBaseUnit(1.5, 8) => 150000000
 *
 * @param amount - The human-readable token amount.
 * @param decimals - The number of decimals the token uses.
 * @returns The amount in base units (as integer).
 */
export function toBaseUnit(amount: number, decimals: number): number {
  return Math.floor(amount * 10 ** decimals);
}

/**
 * Converts a base unit amount to a human-readable value.
 * Example: toDisplayUnit(150000000, 8) => 1.5
 *
 * @param baseAmount - The amount in base units (integer).
 * @param decimals - The number of decimals the token uses.
 * @returns The human-readable token amount.
 */
export function toDisplayUnit(baseAmount: number, decimals: number): number {
  return baseAmount / 10 ** decimals;
}
