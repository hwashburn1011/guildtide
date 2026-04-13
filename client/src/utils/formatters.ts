/**
 * Formatting utilities for display values throughout the game UI.
 */

/**
 * Format a large number into a human-readable abbreviated string.
 * 1000 -> "1K", 1500 -> "1.5K", 1000000 -> "1M", etc.
 */
export function formatNumber(n: number): string {
  if (n < 0) return `-${formatNumber(-n)}`;
  if (n < 1000) return String(Math.floor(n));
  if (n < 1_000_000) {
    const k = n / 1000;
    return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`;
  }
  if (n < 1_000_000_000) {
    const m = n / 1_000_000;
    return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`;
  }
  const b = n / 1_000_000_000;
  return b % 1 === 0 ? `${b}B` : `${b.toFixed(1)}B`;
}

/**
 * Format seconds into a human-readable time string.
 * 135 -> "2m 15s", 7200 -> "2h", 7335 -> "2h 2m"
 */
export function formatTime(seconds: number): string {
  if (seconds < 0) return '0s';
  const s = Math.floor(seconds);
  if (s < 60) return `${s}s`;

  const m = Math.floor(s / 60);
  const remainS = s % 60;

  if (m < 60) {
    return remainS > 0 ? `${m}m ${remainS}s` : `${m}m`;
  }

  const h = Math.floor(m / 60);
  const remainM = m % 60;

  if (h < 24) {
    return remainM > 0 ? `${h}h ${remainM}m` : `${h}h`;
  }

  const d = Math.floor(h / 24);
  const remainH = h % 24;
  return remainH > 0 ? `${d}d ${remainH}h` : `${d}d`;
}

/**
 * Format a number as a signed percentage string.
 * 15 -> "+15%", -5 -> "-5%", 0 -> "0%"
 */
export function formatPercent(n: number): string {
  const rounded = Math.round(n);
  if (rounded > 0) return `+${rounded}%`;
  return `${rounded}%`;
}

/**
 * Format a resource amount with its type label.
 * ("Gold", 150) -> "150 Gold"
 */
export function formatResource(type: string, amount: number): string {
  return `${formatNumber(amount)} ${type}`;
}
