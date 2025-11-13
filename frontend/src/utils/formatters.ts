export function formatGtk(amount: bigint | number, decimals = 18): string {
  const value = typeof amount === "bigint" ? amount : BigInt(Math.trunc(amount));
  const divisor = 10n ** BigInt(decimals);
  const integer = value / divisor;
  const fraction = value % divisor;
  if (fraction === 0n) return integer.toString();
  const fractionStr = fraction.toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${integer.toString()}.${fractionStr}`;
}

export function shortAddress(address?: string, chars = 4): string {
  if (!address) return "--";
  return `${address.slice(0, 2 + chars)}…${address.slice(-chars)}`;
}

export function formatScore(value: number): string {
  return value.toLocaleString("en-US");
}

