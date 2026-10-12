const DAY_MS = 1000 * 60 * 60 * 24;
/** Recent window — observations inside this count as "active". */
export const TREND_RECENT_WINDOW_DAYS = 30;
/** Beyond this since last observation → stale. */
export const TREND_STALE_WINDOW_DAYS = 90;

/**
 * How a fact's evidence has been evolving.
 *
 * - `new` — first seen inside the recent window, few proofs yet.
 * - `strengthening` — established fact re-observed recently (rising density).
 * - `stable` — known for a while, still observed inside the stale window.
 * - `weakening` — quiet for ≥30 and <90 days after having been observed.
 * - `stale` — no observation in ≥90 days.
 */
export type ObservationTrend = "new" | "strengthening" | "stable" | "weakening" | "stale";

export interface ObservationTrendInput {
  createdAt: Date | number;
  /**
   * C3 re-observation watermark (Unix ms). When null/undefined, the fact
   * has never been merged-into since the column landed — treat `createdAt`
   * as last-seen.
   */
  lastObservedAt?: number | null;
  /** Times this fact has been retained/merged. Defaults to 1. */
  proofCount?: number | null;
}

function toMs(value: Date | number): number {
  return value instanceof Date ? value.getTime() : value;
}

/**
 * Classify a vault fact's observation trend from its evidence timestamps.
 *
 * Pure + deterministic. Pass `now` for back-dated eval harnesses.
 */
export function classifyObservationTrend(
  input: ObservationTrendInput,
  now: number = Date.now()
): ObservationTrend {
  const createdMs = toMs(input.createdAt);
  if (!Number.isFinite(createdMs) || !Number.isFinite(now)) return "stable";

  const lastMsRaw = input.lastObservedAt;
  const lastMs =
    lastMsRaw !== null && lastMsRaw !== undefined && Number.isFinite(lastMsRaw)
      ? Math.max(createdMs, lastMsRaw)
      : createdMs;
  const proofs = Math.max(1, input.proofCount ?? 1);

  const ageDays = Math.max(0, (now - createdMs) / DAY_MS);
  const daysSinceLast = Math.max(0, (now - lastMs) / DAY_MS);

  if (daysSinceLast >= TREND_STALE_WINDOW_DAYS) return "stale";
  if (daysSinceLast >= TREND_RECENT_WINDOW_DAYS) return "weakening";

  if (ageDays <= TREND_RECENT_WINDOW_DAYS && proofs <= 2) return "new";

  if (proofs >= 3) return "strengthening";
  if (proofs >= 2 && ageDays > TREND_RECENT_WINDOW_DAYS) return "strengthening";

  return "stable";
}

/**
 * Summarize trend counts over a set of facts — handy for profile synthesis
 * ("N interests strengthening") without another LLM pass.
 */
export function summarizeObservationTrends(
  inputs: readonly ObservationTrendInput[],
  now: number = Date.now()
): Record<ObservationTrend, number> {
  const counts: Record<ObservationTrend, number> = {
    new: 0,
    strengthening: 0,
    stable: 0,
    weakening: 0,
    stale: 0,
  };
  for (const input of inputs) {
    counts[classifyObservationTrend(input, now)]++;
  }
  return counts;
}
