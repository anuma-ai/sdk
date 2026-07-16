/**
 * Decay sweeper (PR2) — orchestration glue that runs the temporal-decay
 * lifecycle over the vault. Mirrors the shape of {@link ./autoExtractWorker}'s
 * `createAutoExtractor`: created once, driven by the caller (a client hook on a
 * low-frequency interval / app-foreground), disposable.
 *
 * A sweep is zero-knowledge by construction:
 *   1. {@link getDecayCandidatesRawOp} selects plaintext columns via
 *      `unsafeFetchRaw` — no `content`, no decrypt, no Model per row.
 *   2. {@link classifyDecay} is a pure function over those plaintext fields.
 *   3. Only the (usually small) transition set is materialized as Models to
 *      archive ({@link archiveVaultMemoryOp}) or hard-delete
 *      ({@link hardDeleteDecayedOp}, which re-checks archived + past-window
 *      inside the write so a concurrent restore wins).
 *
 * The optional {@link DecayClassifier} is a PR5 seam for an on-device model that
 * refines borderline verdicts by reading decrypted content — it is NOT
 * implemented here. Default is `undefined` → pure rule-based, which is what
 * keeps the default path zero-knowledge.
 */

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

/** Map a raw candidate to the pure classifier's input shape. Threads the row
 * id so an optional content-reading classifier (PR5) can fetch + decrypt it;
 * the rule engine ignores it. */
function toDecayInput(c: DecayCandidateRaw): DecayInput {
  return {
    id: c.uniqueId,
    factType: c.factType,
    eventTimeEnd: c.eventTimeEnd,
    eventTimeKind: c.eventTimeKind,
    updatedAt: c.updatedAt,
    archivedAt: c.archivedAt,
    source: c.source,
  };
}

/**
 * Whether a row is a BORDERLINE decay case worth an optional classifier's
 * (more expensive, content-reading) opinion. Only these rows consult the
 * classifier — clear keeps/deletes (durable types, manual saves, plans with a
 * concrete event end, already-archived rows) are decided by the rule engine
 * alone, so the classifier is never invoked for them.
 *
 * Borderline = the rule engine has the weakest signal:
 *  - `factType` is `other` or null (the medium/age-only bucket — no type-driven
 *    TTL, so staleness is a pure guess from `updated_at`), OR
 *  - a `plan`/`ongoing_context` with NO `event_time_end` (can't be
 *    event-driven; falls back to the age rule).
 * An already-archived row is never borderline — its fate is the deterministic
 * hard-delete window, which no content read should override.
 *
 * A `source === "manual"` row is NEVER borderline either: the rule engine
 * protects manual saves from auto-archive ({@link classifyDecay} short-circuits
 * `manual` → `keep`), so it must never be handed to the classifier — otherwise a
 * classifier verdict of `archive` would route a user-curated fact onto the
 * hard-delete clock, silently breaking the "manual is never auto-archived"
 * guarantee via the classifier path. Manual rows are excluded here so they
 * never reach (nor egress content to) the classifier at all.
 */
function isBorderline(input: DecayInput): boolean {
  if (input.source === "manual") return false;
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
  // Fail fast: never let an unscoped multi-tenant context reach a sweep.
  assertVaultScopeForSweep(vaultCtx);
  // Effective hard-delete window — passed to the guarded delete op so its
  // in-write re-check uses the same threshold the classifier decided on.
  const hardDeleteWindowMs = policy?.hardDeleteWindowMs ?? DEFAULT_DECAY_POLICY.hardDeleteWindowMs;
  const maxClassifierCalls =
    options.maxClassifierCallsPerSweep ?? DEFAULT_MAX_CLASSIFIER_CALLS_PER_SWEEP;
  // Cross-sweep memo of classifier verdicts, keyed by row id → (updated_at,
  // verdict). A stable borderline row (unchanged `updated_at`) reuses its cached
  // verdict on later sweeps and is NEVER re-sent to the portal; a re-observed
  // row (bumped `updated_at`) misses the cache and is re-classified. Pruned each
  // sweep to the live candidate set so it can't grow unbounded.
  const classifierCache = new Map<string, { updatedAt: number; verdict: DecayVerdict }>();
  let disposed = false;

  /** Per-sweep mutable egress budget, threaded into {@link verdictFor}. */
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
    // Rule ESCALATION always wins — and is never frozen by the classifier cache.
    // The rule verdict is recomputed every sweep against the current `now`, so a
    // row the time-based rule now wants to archive/delete (e.g. it just crossed
    // its TTL, or an archived row passed the hard-delete window) transitions
    // regardless of any stale cached "keep". The classifier (and its cache) may
    // therefore only REFINE a row whose CURRENT rule verdict is still `keep`;
    // it can never resurrect one the rule has already aged out. (Without this a
    // borderline row cached `keep` at day 10 would stay cached and never archive
    // once the rule crossed its TTL at day 200 — the cache would suppress the
    // escalation.)
    if (ruleVerdict !== "keep") return ruleVerdict;

    // PR5 — only borderline rows (whose rule verdict is `keep`) consult the
    // classifier; clear keeps are cheap-decided by the rule engine alone, so the
    // (more expensive, content-reading) classifier is never invoked for them.
    if (!classifier || !isBorderline(input)) return ruleVerdict;

    // Stable-row reuse: a row already classified at its current `updated_at`
    // reuses that verdict WITHOUT any portal call — so a stable borderline
    // "keep" row is never re-egressed on a later sweep. Safe against staleness:
    // the rule-escalation gate above already ran this sweep, so a cache hit here
    // can only return a refinement of a row the rule STILL keeps.
    if (input.id) {
      const cached = classifierCache.get(input.id);
      if (cached && cached.updatedAt === input.updatedAt) return cached.verdict;
    }

    // Per-sweep egress ceiling: beyond it, fall back to the rule verdict (no
    // call) for the rest of this sweep. Log once so the cap is observable.
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

    // Refine via the on-device model, falling back to the rule verdict on any
    // error (a flaky classifier must never worsen the sweep). Count the call
    // (an attempt egresses content) and memo the result for stable-row reuse.
    sweep.classifierCalls++;
    try {
      const verdict = await classifier.classify(input, ruleVerdict, now);
      if (input.id) classifierCache.set(input.id, { updatedAt: input.updatedAt, verdict });
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

    // Prune the classifier memo to the live candidate set so it can't grow
    // unbounded as rows are deleted (a deleted row's stale entry is dead weight).
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
      // Materialize Models only for the transition set (dodges whole-vault
      // RecordCache pinning). Archive passes the scan-time `updatedAt` as an
      // optimistic-concurrency guard so a retain() merge that refreshed the row
      // between scan and write wins (the fact stays active).
      for (const c of toArchive) {
        const ok = await archiveVaultMemoryOp(vaultCtx, c.uniqueId, {
          now,
          expectedUpdatedAt: c.updatedAt,
        });
        if (ok) archived++;
      }
      for (const c of toDelete) {
        // Guarded delete: re-checks archived + past-window INSIDE the write, so a
        // restore that landed between the scan and here wins (no wrongful loss).
        const ok = await hardDeleteDecayedOp(vaultCtx, c.uniqueId, { hardDeleteWindowMs, now });
        if (ok) deleted++;
      }
    } catch (err) {
      // Partial progress is fine (each op is independently committed); report
      // and return what we managed so counts stay honest.
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
