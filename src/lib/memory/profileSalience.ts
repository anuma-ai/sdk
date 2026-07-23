/**
 * Profile salience — profile-worthiness scoring for vault facts (#706).
 *
 * Distinct from query-time relevance (`recall` fusion). Answers: "is this
 * fact worth putting on a shareable profile?" using durable type, proof
 * density, and C2 observation trend. Pure + deterministic — no LLM, no DB.
 *
 * Used by:
 * - `synthesizeProfile` facet recall (default factTypeWeights)
 * - Publish-review UIs via {@link rankProfileCandidates} (nearby / client)
 *
 * Persisted `importance` is deferred until publish flow proves the need.
 */

import type { FactType } from "./autoExtract.js";
import {
  classifyObservationTrend,
  type ObservationTrend,
  type ObservationTrendInput,
} from "./observationTrend.js";

/** Proof-count curve weight inside {@link scoreProfileSalience}. */
export const DEFAULT_PROFILE_PROOF_ALPHA = 0.2;

/**
 * Per-FactType multipliers for profile synthesis / salience.
 * Durable identity-class types (never age-archive in decay) rank higher;
 * ephemeral plan/ongoing_context rank lower. Untyped / `other` stay neutral.
 */
export const DEFAULT_PROFILE_FACT_TYPE_WEIGHTS: Partial<Record<FactType, number>> = {
  identity: 1.5,
  preference: 1.5,
  relationship: 1.5,
  constraint: 1.5,
  other: 1.0,
  plan: 0.6,
  ongoing_context: 0.6,
};

/** C2 trend multipliers for profile-worthiness. */
export const DEFAULT_PROFILE_TREND_MULTIPLIERS: Record<ObservationTrend, number> = {
  strengthening: 1.25,
  new: 1.1,
  stable: 1.0,
  weakening: 0.75,
  stale: 0.5,
};

export interface ProfileSalienceInput extends ObservationTrendInput {
  /** Vault memory id — required for {@link rankProfileCandidates}. */
  id: string;
  /** Extractor FactType; null/undefined → neutral weight (1.0). */
  factType?: string | null;
}

export interface RankedProfileCandidate {
  id: string;
  score: number;
  trend: ObservationTrend;
  factType?: string | null;
  proofCount: number;
}

export interface ScoreProfileSalienceOptions {
  /** Override type weights (merged over {@link DEFAULT_PROFILE_FACT_TYPE_WEIGHTS}). */
  factTypeWeights?: Partial<Record<FactType, number>>;
  /** Override trend multipliers. */
  trendMultipliers?: Partial<Record<ObservationTrend, number>>;
  /** Proof-count α. Default: {@link DEFAULT_PROFILE_PROOF_ALPHA}. */
  proofCountAlpha?: number;
}

function typeWeight(
  factType: string | null | undefined,
  weights: Partial<Record<FactType, number>>
): number {
  if (!factType) return 1;
  const w = weights[factType as FactType];
  if (w !== undefined && Number.isFinite(w) && w > 0) return w;
  return 1;
}

/**
 * Score a vault fact for profile-worthiness.
 *
 * `typeWeight * (1 + α·log(1+proofCount) − α·log(2)) * trendMultiplier`
 *
 * The proof term mirrors vault fusion's log curve (neutral at proofCount=1).
 * Pass `now` for deterministic evals.
 */
export function scoreProfileSalience(
  input: ProfileSalienceInput,
  now: number = Date.now(),
  options: ScoreProfileSalienceOptions = {}
): number {
  const alpha = options.proofCountAlpha ?? DEFAULT_PROFILE_PROOF_ALPHA;
  const typeWeights = { ...DEFAULT_PROFILE_FACT_TYPE_WEIGHTS, ...options.factTypeWeights };
  const trendMults = { ...DEFAULT_PROFILE_TREND_MULTIPLIERS, ...options.trendMultipliers };

  const proofs = Math.max(1, input.proofCount ?? 1);
  const proofBoost = 1 + alpha * Math.log(1 + proofs) - alpha * Math.log(2);
  const trend = classifyObservationTrend(input, now);
  const tw = typeWeight(input.factType, typeWeights);
  const tm = trendMults[trend] ?? 1;

  const score = tw * proofBoost * tm;
  return Number.isFinite(score) ? score : 0;
}

/**
 * Rank vault facts by profile-worthiness (descending score).
 * Ties broken by higher proofCount, then id ascending for stability.
 */
export function rankProfileCandidates(
  inputs: readonly ProfileSalienceInput[],
  now: number = Date.now(),
  options: ScoreProfileSalienceOptions = {}
): RankedProfileCandidate[] {
  const ranked = inputs.map((input) => {
    const proofs = Math.max(1, input.proofCount ?? 1);
    return {
      id: input.id,
      score: scoreProfileSalience(input, now, options),
      trend: classifyObservationTrend(input, now),
      factType: input.factType ?? null,
      proofCount: proofs,
    };
  });
  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.proofCount !== a.proofCount) return b.proofCount - a.proofCount;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  return ranked;
}
