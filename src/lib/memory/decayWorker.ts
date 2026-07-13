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
 *      ({@link deleteVaultMemoryOp}).
 *
 * The optional {@link DecayClassifier} is a PR5 seam for an on-device model that
 * refines borderline verdicts by reading decrypted content — it is NOT
 * implemented here. Default is `undefined` → pure rule-based, which is what
 * keeps the default path zero-knowledge.
 */

import {
  archiveVaultMemoryOp,
  type DecayCandidateRaw,
  deleteVaultMemoryOp,
  getDecayCandidatesRawOp,
  type VaultMemoryOperationsContext,
} from "../db/memoryVault/operations.js";
import { getLogger } from "../logger.js";
import { classifyDecay, type DecayInput, type DecayPolicy, type DecayVerdict } from "./decay.js";

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
 * @param input      The same plaintext inputs the rule engine saw.
 * @param ruleVerdict The rule-based verdict, as a starting point / fallback.
 * @returns The (possibly refined) verdict.
 */
export interface DecayClassifier {
  classify(input: DecayInput, ruleVerdict: DecayVerdict): Promise<DecayVerdict> | DecayVerdict;
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
   * PR5 seam. When provided, each candidate's rule verdict is passed through
   * it. Gate on key availability (it may decrypt content). Default undefined.
   */
  classifier?: DecayClassifier;
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

function resolveNow(now?: NowSource): number {
  if (typeof now === "function") return now();
  if (typeof now === "number") return now;
  return Date.now();
}

/** Map a raw candidate to the pure classifier's input shape. */
function toDecayInput(c: DecayCandidateRaw): DecayInput {
  return {
    factType: c.factType,
    eventTimeEnd: c.eventTimeEnd,
    eventTimeKind: c.eventTimeKind,
    updatedAt: c.updatedAt,
    archivedAt: c.archivedAt,
    source: c.source,
  };
}

/**
 * Create a decay sweeper. See module docstring for the zero-knowledge contract.
 */
export function createDecaySweeper(options: CreateDecaySweeperOptions): DecaySweeper {
  const { vaultCtx, policy, classifier, onSwept, onError } = options;
  let disposed = false;

  async function verdictFor(input: DecayInput, now: number): Promise<DecayVerdict> {
    const ruleVerdict = classifyDecay(input, now, policy);
    if (!classifier) return ruleVerdict;
    // PR5 seam — refine via the on-device model, falling back to the rule
    // verdict on any error (a flaky classifier must never worsen the sweep).
    try {
      return await classifier.classify(input, ruleVerdict);
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

    const toArchive: DecayCandidateRaw[] = [];
    const toDelete: DecayCandidateRaw[] = [];
    for (const c of candidates) {
      const verdict = await verdictFor(toDecayInput(c), now);
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
        const ok = await deleteVaultMemoryOp(vaultCtx, c.uniqueId);
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
