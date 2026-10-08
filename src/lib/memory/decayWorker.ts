import {
  archiveVaultMemoryOp,
  assertVaultScopeForSweep,
  type DecayCandidateRaw,
  getDecayCandidatesRawOp,
  hardDeleteDecayedOp,
  type VaultMemoryOperationsContext,
} from "../db/memoryVault/operations.js";
import { getLogger } from "../logger.js";
import {
  classifyDecay,
  type DecayInput,
  type DecayPolicy,
  type DecayVerdict,
  DEFAULT_DECAY_POLICY,
  lastActivityAt,
  SOURCE_PHOTO,
} from "./decay.js";

/** Counts from one sweep, for UI surfacing (e.g. "N memories archived"). */
export interface DecaySweepResult {
  /** Rows transitioned active → archived this sweep. */
  archived: number;
  /** Rows hard-deleted (archived past the window) this sweep. */
  deleted: number;
  /** Total candidate rows scanned (all non-hard-deleted rows). */
  scanned: number;
}

/**
 * PR5 seam — an on-device classifier that refines the rule-based verdict for
 * borderline rows (e.g. type `other`/null, or a `plan` without an event end).
 * Because it may read decrypted content, callers MUST gate providing it on
 * wallet-key availability. Left undefined here → pure rule-based sweep.
 *
 * Egress is bounded by the sweeper (NOT the classifier): each sweep caps how
 * many rows reach the classifier ({@link CreateDecaySweeperOptions.maxClassifierCallsPerSweep})
 * and a row whose (id, updated_at) was already classified is never re-sent on a
 * later sweep — so a stable borderline "keep" row egresses at most once.
 *
 * SECURITY (MEDIUM, residual) — enabling a classifier hands whoever answers the
 * portal (incl. a malicious / MITM'd endpoint) a lever over the affected rows:
 * a hostile verdict can only quarantine-adjacent OUTCOMES here, i.e. archive a
 * row (reversible — never a hard delete, which stays the deterministic
 * archived-past-window mechanic). Bounded, reversible trust tradeoff; gate the
 * classifier on trust in the portal.
 *
 * @param input      The same plaintext inputs the rule engine saw.
 * @param ruleVerdict The rule-based verdict, as a starting point / fallback.
 * @param now        The sweep's reference time (Unix ms). Injected so the
 *   classifier derives any age math from the same clock the rule engine used,
 *   never wall-clock `Date.now()` — keeping a fixed-`now` sweep deterministic.
 * @returns The (possibly refined) verdict.
 */
export interface DecayClassifier {
  classify(
    input: DecayInput,
    ruleVerdict: DecayVerdict,
    now: number
  ): Promise<DecayVerdict> | DecayVerdict;
}

/** A clock: a fixed timestamp (tests) or a getter (production intervals). */
export type NowSource = number | (() => number);

/** @public */
export interface CreateDecaySweeperOptions {
  /** Vault write context — the same one recall/retain use. */
  vaultCtx: VaultMemoryOperationsContext;
  /**
   * Reference "now". A number is fixed (deterministic tests); a function is
   * re-evaluated per sweep (long-lived interval usage). Default `Date.now`.
   */
  now?: NowSource;
  /** Partial policy overriding the per-type TTL defaults. Omit for defaults. */
  policy?: Partial<DecayPolicy>;
  /**
   * PR5 seam. When provided, borderline candidates' rule verdict is passed
   * through it. Gate on key availability (it may decrypt content). Default
   * undefined. Egress is bounded — see {@link maxClassifierCallsPerSweep}.
   */
  classifier?: DecayClassifier;
  /**
   * PR5 — hard ceiling on classifier invocations (and thus decrypted-content
   * portal egress) per sweep. Once hit, the remaining borderline rows fall back
   * to the rule verdict for that sweep (no call). Prevents a large vault from
   * firing hundreds of sequential content-bearing calls in one sweep. Default
   * {@link DEFAULT_MAX_CLASSIFIER_CALLS_PER_SWEEP} (20). Cache hits (a row
   * already classified at its current `updated_at`) do NOT count against this.
   */
  maxClassifierCallsPerSweep?: number;
  /** Fires once after each sweep with the transition counts (UI). */
  onSwept?: (result: DecaySweepResult) => void;
  /** Diagnostic — fires on an unexpected sweep-level error. */
  onError?: (error: Error) => void;
}

/** @public */
export interface DecaySweeper {
  /**
   * Scan the vault, classify every candidate, and apply archive/delete
   * transitions. Safe to call repeatedly (idempotent — a keep stays a keep, an
   * already-archived row won't re-archive). Returns the transition counts.
   * A no-op (returns zero counts) after {@link DecaySweeper.dispose}.
   */
  runSweep(): Promise<DecaySweepResult>;
  /** Stop accepting sweeps. An in-flight `runSweep()` resolves normally. */
  dispose(): void;
}

const EMPTY_RESULT: DecaySweepResult = { archived: 0, deleted: 0, scanned: 0 };

/**
 * Default per-sweep ceiling on decay-classifier invocations (see
 * {@link CreateDecaySweeperOptions.maxClassifierCallsPerSweep}). Kept small: the
 * classifier egresses DECRYPTED content, so a sweep must never fan out to
 * hundreds of sequential calls. 20 covers the borderline churn of a typical
 * sweep while capping worst-case egress; stable rows are also cached so this
 * ceiling is rarely reached after the first sweep.
 */
export const DEFAULT_MAX_CLASSIFIER_CALLS_PER_SWEEP = 20;

function resolveNow(now?: NowSource): number {
  if (typeof now === "function") return now();
  if (typeof now === "number") return now;
  return Date.now();
}

function toDecayInput(c: DecayCandidateRaw): DecayInput {
  return {
    id: c.uniqueId,
    factType: c.factType,
    eventTimeEnd: c.eventTimeEnd,
    eventTimeKind: c.eventTimeKind,
    updatedAt: c.updatedAt,
    lastObservedAt: c.lastObservedAt,
    archivedAt: c.archivedAt,
    source: c.source,
    trustTier: c.trustTier,
  };
}

function isBorderline(input: DecayInput): boolean {
  if (input.source === "manual" || input.source === SOURCE_PHOTO) return false;
  if (input.trustTier === "quarantined") return false;
  if (input.archivedAt !== null) return false;
  if (input.factType === null || input.factType === "other") return true;
  if (
    (input.factType === "plan" || input.factType === "ongoing_context") &&
    input.eventTimeEnd === null
  ) {
    return true;
  }
  return false;
}

/**
 * Create a decay sweeper. See module docstring for the zero-knowledge contract.
 */
export function createDecaySweeper(options: CreateDecaySweeperOptions): DecaySweeper {
  const { vaultCtx, policy, classifier, onSwept, onError } = options;
  assertVaultScopeForSweep(vaultCtx);
  const hardDeleteWindowMs = policy?.hardDeleteWindowMs ?? DEFAULT_DECAY_POLICY.hardDeleteWindowMs;
  const maxClassifierCalls =
    options.maxClassifierCallsPerSweep ?? DEFAULT_MAX_CLASSIFIER_CALLS_PER_SWEEP;
  const classifierCache = new Map<string, { activityAt: number; verdict: DecayVerdict }>();
  let disposed = false;

  interface SweepState {
    classifierCalls: number;
    ceilingLogged: boolean;
  }

  async function verdictFor(
    input: DecayInput,
    now: number,
    sweep: SweepState
  ): Promise<DecayVerdict> {
    const ruleVerdict = classifyDecay(input, now, policy);
    if (ruleVerdict !== "keep") return ruleVerdict;

    if (!classifier || !isBorderline(input)) return ruleVerdict;

    if (input.id) {
      const cached = classifierCache.get(input.id);
      if (cached && cached.activityAt === lastActivityAt(input)) return cached.verdict;
    }

    if (sweep.classifierCalls >= maxClassifierCalls) {
      if (!sweep.ceilingLogged) {
        sweep.ceilingLogged = true;
        getLogger().warn(
          `[memory/decay] classifier per-sweep ceiling (${maxClassifierCalls}) reached; ` +
            "remaining borderline rows use the rule verdict this sweep"
        );
      }
      return ruleVerdict;
    }

    sweep.classifierCalls++;
    try {
      const verdict = await classifier.classify(input, ruleVerdict, now);
      if (input.id) classifierCache.set(input.id, { activityAt: lastActivityAt(input), verdict });
      return verdict;
    } catch (err) {
      getLogger().warn(
        `[memory/decay] classifier failed; falling back to rule verdict: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      return ruleVerdict;
    }
  }

  async function runSweep(): Promise<DecaySweepResult> {
    if (disposed) return { ...EMPTY_RESULT };
    const now = resolveNow(options.now);

    let candidates: DecayCandidateRaw[];
    try {
      candidates = await getDecayCandidatesRawOp(vaultCtx);
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
      return { ...EMPTY_RESULT };
    }

    if (classifierCache.size > 0) {
      const liveIds = new Set(candidates.map((c) => c.uniqueId));
      for (const id of classifierCache.keys()) {
        if (!liveIds.has(id)) classifierCache.delete(id);
      }
    }

    const sweep: SweepState = { classifierCalls: 0, ceilingLogged: false };
    const toArchive: DecayCandidateRaw[] = [];
    const toDelete: DecayCandidateRaw[] = [];
    for (const c of candidates) {
      const verdict = await verdictFor(toDecayInput(c), now, sweep);
      if (verdict === "archive") toArchive.push(c);
      else if (verdict === "delete") toDelete.push(c);
    }

    let archived = 0;
    let deleted = 0;
    try {
      for (const c of toArchive) {
        const ok = await archiveVaultMemoryOp(vaultCtx, c.uniqueId, {
          now,
          expectedUpdatedAt: c.updatedAt,
          expectedLastObservedAt: c.lastObservedAt ?? null,
        });
        if (ok) archived++;
      }
      for (const c of toDelete) {
        const ok = await hardDeleteDecayedOp(vaultCtx, c.uniqueId, { hardDeleteWindowMs, now });
        if (ok) deleted++;
      }
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }

    const result: DecaySweepResult = { archived, deleted, scanned: candidates.length };
    onSwept?.(result);
    return result;
  }

  return {
    runSweep,
    dispose: () => {
      disposed = true;
    },
  };
}
