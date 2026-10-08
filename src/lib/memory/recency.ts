const DAY_MS = 1000 * 60 * 60 * 24;
const DEFAULT_PER_YEAR_DECAY = 0.2;
const DEFAULT_FLOOR = 0.1;
const DEFAULT_NO_DATE_MULTIPLIER = 0.5;

export interface RecencyOptions {
  /** Override "now" — useful for deterministic tests and back-dated benchmarks. */
  now?: Date;
  /** Linear decay slope per year. Default 0.2 (1y → 0.8x, 4.5y → floor). */
  perYearDecay?: number;
  /** Lower bound on the multiplier so very old memories don't vanish. Default 0.1. */
  floor?: number;
  /** Multiplier returned when `updatedAt` is missing. Default 0.5 (neutral). */
  noDateMultiplier?: number;
}

/**
 * Compute the recency multiplier for a memory's last-updated timestamp.
 *
 * Future timestamps (clock skew, test fixtures) clamp to age=0 → 1.0.
 */
export function recencyMultiplier(
  updatedAt: Date | null | undefined,
  opts: RecencyOptions = {}
): number {
  const noDate = opts.noDateMultiplier ?? DEFAULT_NO_DATE_MULTIPLIER;
  if (!updatedAt) return noDate;

  const updatedMs = updatedAt.getTime();
  if (!Number.isFinite(updatedMs)) return noDate;

  const now = opts.now ?? new Date();
  const nowMs = now.getTime();
  if (!Number.isFinite(nowMs)) return noDate;
  const ageDays = Math.max(0, (nowMs - updatedMs) / DAY_MS);

  const perYearDecay = opts.perYearDecay ?? DEFAULT_PER_YEAR_DECAY;
  const floor = opts.floor ?? DEFAULT_FLOOR;
  const decay = perYearDecay * (ageDays / 365);

  return Math.max(floor, 1 - decay);
}
