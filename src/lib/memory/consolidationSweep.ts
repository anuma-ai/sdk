/**
 * Consolidation sweeper (Fix C) — a bounded BACKGROUND sweep that HEALS an
 * already-polluted vault. Reactive per-write consolidation (retain →
 * consolidateMemory) only sees ONE new fact against the current vault, so it
 * can never reach:
 *   - duplicates written BEFORE the fix landed (legacy pollution), or
 *   - a value change the model retired only ONE stale copy of (a single-supersede
 *     miss) — the other paraphrases keep coexisting.
 * This sweep re-clusters the whole vault by cosine and re-runs the SAME decide
 * model over each near-duplicate cluster, so those misses collapse over repeated
 * passes (e.g. "Prefers light mode." + "Prefers light mode for their interface."
 * finally merge to one).
 *
 * Modeled on {@link ./decayWorker}'s `createDecaySweeper`: created once, driven
 * by the caller on a low-frequency interval, disposable, bounded per sweep, with
 * an already-processed cache so a STABLE cluster is not re-sent to the portal
 * every sweep (mirrors the decay classifier's egress discipline).
 *
 * A sweep does three bounded things:
 *   a. Embedding backfill — embed up to N rows with no vector (a row without a
 *      vector is invisible to cosine clustering). Bounded.
 *   b. Junk purge — soft-delete (tombstone) content-free rows that slipped in
 *      before the shared junk gate (Fix A). Bounded; a stable clean row is not
 *      re-decrypted until its content changes.
 *   c. Dedup — cluster active rows by cosine ≥ `consolidateThreshold`, and for
 *      each multi-row cluster decrypt JUST that cluster, ask `consolidateMemory`
 *      which stale rows the survivor replaces, then retire them via
 *      `supersedeVaultMemoryOp` (kept as history → reversible) and update the
 *      survivor to the merged content.
 *
 * SAFETY. The top risk is retiring a CORRECT memory via same-subject confusion
 * (two different people with a similar attribute). Mitigations, in order:
 *   - `supersede` keeps the retired row as history — every action is reversible.
 *   - A conservative default cluster floor (0.55) plus the decide model's own
 *     "SAME SUBJECT REQUIRED" rule gate what clusters at all.
 *   - `dryRun` computes + logs what WOULD change and applies nothing (ship the
 *     first rollout with it on).
 *   - Every write op re-checks inside its own transaction, so a live
 *     re-observation racing the sweep wins; the survivor content rewrite is
 *     additionally skipped if the survivor was re-observed since the scan.
 * Telemetry is count-only — memory CONTENT is never logged (SDK rule; no
 * `console.*`).
 */

import {
  type ConsolidationScanRaw,
  deleteVaultMemoryOp,
  getConsolidationScanRawOp,
  getUnembeddedVaultMemoryIdsOp,
  getVaultMemoriesByIdsOp,
  getVaultMemoryOp,
  supersedeVaultMemoryOp,
  updateVaultMemoryOp,
} from "../db/memoryVault/operations.js";
import type { StoredVaultMemory } from "../db/memoryVault/types.js";
import { getLogger } from "../logger.js";
import { cosineSimilarity } from "../memoryEngine/vector.js";
import { eagerEmbedContent } from "../memoryVault/searchTool.js";
import { consolidateMemory } from "./consolidate.js";
import { isJunkMemoryContent } from "./junkGate.js";
import type {
  ConsolidationSweeper,
  ConsolidationSweepResult,
  CreateConsolidationSweeperOptions,
} from "./types.js";

/** Default cosine floor to cluster near-duplicates — matches retain's
 * `DEFAULT_CONSOLIDATE_THRESHOLD`. Deliberately conservative. */
export const DEFAULT_CONSOLIDATION_SWEEP_THRESHOLD = 0.55;
/** Default cap on un-embedded rows backfilled per sweep. */
export const DEFAULT_MAX_BACKFILL_PER_SWEEP = 50;
/** Default cap on rows decrypted + junk-checked per sweep. */
export const DEFAULT_MAX_JUNK_CHECKS_PER_SWEEP = 50;
/** Default cap on clusters consolidated (portal calls) per sweep. */
export const DEFAULT_MAX_CLUSTERS_PER_SWEEP = 20;

/** A scan row that carries a parsed vector — the unit of clustering. */
interface ClusterRow {
  uniqueId: string;
  vec: number[];
  updatedAt: number;
  proofCount: number;
}

/** The decide model's result shape, without re-exporting the internal type. */
type ConsolidationDecision = Awaited<ReturnType<typeof consolidateMemory>>;

function emptyResult(dryRun: boolean): ConsolidationSweepResult {
  return {
    scanned: 0,
    clustersFound: 0,
    superseded: 0,
    junkDeleted: 0,
    embeddedBackfilled: 0,
    clustersDropped: 0,
    dryRun,
  };
}

/** Parse a JSON-stringified embedding to a numeric vector; null on any
 * malformed / non-numeric payload so a bad row is simply skipped from
 * clustering rather than crashing the sweep. */
function parseVector(embedding: string | null): number[] | null {
  if (!embedding) return null;
  try {
    const parsed = JSON.parse(embedding) as unknown;
    if (Array.isArray(parsed) && parsed.every((n) => typeof n === "number")) {
      return parsed;
    }
  } catch {
    // fall through
  }
  return null;
}

/** Greedy single-linkage-ish clustering: each row seeds a cluster and absorbs
 * every not-yet-used row within `threshold` cosine of the seed. O(n²) within a
 * group — fine for a background sweep over per-(scope,folder,model) groups. */
function greedyCluster(rows: ClusterRow[], threshold: number): ClusterRow[][] {
  const clusters: ClusterRow[][] = [];
  const used = new Array<boolean>(rows.length).fill(false);
  for (let i = 0; i < rows.length; i++) {
    if (used[i]) continue;
    used[i] = true;
    const cluster: ClusterRow[] = [rows[i]];
    for (let j = i + 1; j < rows.length; j++) {
      if (used[j]) continue;
      if (cosineSimilarity(rows[i].vec, rows[j].vec) >= threshold) {
        used[j] = true;
        cluster.push(rows[j]);
      }
    }
    clusters.push(cluster);
  }
  return clusters;
}

/** Version-aware cluster signature — a stable cluster (same members, same
 * `updated_at`s) is not re-sent to the portal; any re-observation or membership
 * change re-keys it. */
function clusterSignature(cluster: ClusterRow[]): string {
  return cluster
    .map((c) => `${c.uniqueId}:${c.updatedAt}`)
    .sort()
    .join("|");
}

/** The survivor is the RICHEST row: most-reinforced (proof_count), then longest
 * content, then newest. Picking the richest means the decide model almost always
 * either merges the shorter paraphrases into it or judges them equal — it is the
 * row least likely to lose information when the others are retired. */
function pickSurvivor(rows: StoredVaultMemory[]): StoredVaultMemory {
  return [...rows].sort((a, b) => {
    const byProof = (b.proofCount ?? 0) - (a.proofCount ?? 0);
    if (byProof !== 0) return byProof;
    const byLen = b.content.length - a.content.length;
    if (byLen !== 0) return byLen;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  })[0];
}

/** The stale ids a decision retires. `supersede` lists them explicitly;
 * `update`/`noop` name a single same-facet row (the survivor is the richest, so
 * retiring the target it fully-captures/merges-into loses nothing); `create`
 * means the survivor is distinct → retire nothing. Never includes the survivor.
 *
 * REUSE NOTE: `consolidateMemory` was designed for the WRITE path, where its
 * decision compares ONE new fact against existing rows — so its `targetId(s)`
 * name the EXISTING rows the incoming fact replaces/duplicates. The sweep reuses
 * that same model over a cluster by treating the picked SURVIVOR as the "new
 * fact" and the other cluster rows as the "existing" candidates; the ids the
 * decision returns are therefore exactly the non-survivor rows to retire. This
 * mapping is why a `noop` (the survivor already exists as `targetId`) still
 * yields a retire target here rather than "do nothing". */
function staleIdsFromDecision(decision: ConsolidationDecision, survivorId: string): string[] {
  let raw: string[];
  if (decision.action === "supersede") {
    raw = decision.targetIds?.length
      ? decision.targetIds
      : decision.targetId
        ? [decision.targetId]
        : [];
  } else if (decision.action === "update" || decision.action === "noop") {
    raw = decision.targetId ? [decision.targetId] : [];
  } else {
    raw = [];
  }
  return [...new Set(raw)].filter((id) => id !== survivorId);
}

/**
 * Create a consolidation sweeper. See the module docstring for the healing
 * contract + safety model.
 */
export function createConsolidationSweeper(
  options: CreateConsolidationSweeperOptions
): ConsolidationSweeper {
  const {
    vaultCtx,
    embeddingOptions,
    vaultCache,
    consolidateOptions,
    onSwept,
    onError,
    // Default SAFE: the first rollout is log-only. A caller must explicitly pass
    // `dryRun: false` to APPLY supersedes / junk deletes / backfills. This gate
    // also drives destructive soft-deletes (junk purge) + supersedes, so
    // defaulting to apply would let a fresh integration mutate the vault before
    // anyone has watched a dry-run's counts.
    dryRun = true,
  } = options;
  const threshold = options.consolidateThreshold ?? DEFAULT_CONSOLIDATION_SWEEP_THRESHOLD;
  const maxBackfill = options.maxBackfillPerSweep ?? DEFAULT_MAX_BACKFILL_PER_SWEEP;
  const maxJunkChecks = options.maxJunkChecksPerSweep ?? DEFAULT_MAX_JUNK_CHECKS_PER_SWEEP;
  const maxClusters = options.maxClustersPerSweep ?? DEFAULT_MAX_CLUSTERS_PER_SWEEP;

  // Cross-sweep memo of cluster signatures already sent to the decide model, so
  // a STABLE cluster is not re-egressed each sweep. Pruned to the live set every
  // sweep so it can't grow unbounded.
  const alreadyProcessed = new Set<string>();
  // Cross-sweep memo of (id, updated_at) rows already junk-checked and found
  // clean — so a stable clean row is not re-decrypted every sweep.
  const junkChecked = new Set<string>();
  let disposed = false;

  function reportError(err: unknown): void {
    onError?.(err instanceof Error ? err : new Error(String(err)));
  }

  const cacheKey = (id: string, updatedAt: number): string => `${id} ${updatedAt}`;

  // (a) Embedding backfill — embed up to `maxBackfill` un-embedded rows. Junk
  // encountered here is tombstoned instead of embedded (it's already decrypted).
  async function runBackfill(
    result: ConsolidationSweepResult,
    handled: Set<string>,
    deleted: Set<string>
  ): Promise<void> {
    let ids: string[];
    try {
      ids = await getUnembeddedVaultMemoryIdsOp(vaultCtx);
    } catch (err) {
      reportError(err);
      return;
    }
    const batch = ids.slice(0, maxBackfill);
    if (batch.length === 0) return;
    let rows: StoredVaultMemory[];
    try {
      rows = await getVaultMemoriesByIdsOp(vaultCtx, batch);
    } catch (err) {
      reportError(err);
      return;
    }
    for (const row of rows) {
      handled.add(row.uniqueId);
      if (isJunkMemoryContent(row.content)) {
        if (dryRun) result.junkDeleted++;
        else if (await deleteVaultMemoryOp(vaultCtx, row.uniqueId)) {
          result.junkDeleted++;
          deleted.add(row.uniqueId);
        }
        continue;
      }
      if (dryRun) {
        result.embeddedBackfilled++;
        continue;
      }
      try {
        await eagerEmbedContent(row.content, embeddingOptions, vaultCache, vaultCtx, row.uniqueId);
        result.embeddedBackfilled++;
      } catch (err) {
        reportError(err);
      }
    }
  }

  // (b) Junk purge — decrypt a bounded batch of not-yet-checked active rows and
  // tombstone the content-free ones. Rows already decrypted in backfill are
  // skipped (`handled`); clean rows are memoized so they aren't re-decrypted.
  async function runJunkPurge(
    scan: ConsolidationScanRaw[],
    result: ConsolidationSweepResult,
    handled: Set<string>,
    deleted: Set<string>
  ): Promise<void> {
    const liveKeys = new Set(scan.map((r) => cacheKey(r.uniqueId, r.updatedAt)));
    for (const k of junkChecked) if (!liveKeys.has(k)) junkChecked.delete(k);

    const candidates = scan
      .filter(
        (r) => !handled.has(r.uniqueId) && !junkChecked.has(cacheKey(r.uniqueId, r.updatedAt))
      )
      .slice(0, maxJunkChecks);
    if (candidates.length === 0) return;

    let rows: StoredVaultMemory[];
    try {
      rows = await getVaultMemoriesByIdsOp(
        vaultCtx,
        candidates.map((c) => c.uniqueId)
      );
    } catch (err) {
      reportError(err);
      return;
    }
    const byId = new Map(rows.map((r) => [r.uniqueId, r]));
    for (const cand of candidates) {
      const row = byId.get(cand.uniqueId);
      if (!row) continue; // vanished between scan and decrypt
      if (isJunkMemoryContent(row.content)) {
        if (dryRun) result.junkDeleted++;
        else if (await deleteVaultMemoryOp(vaultCtx, cand.uniqueId)) {
          result.junkDeleted++;
          deleted.add(cand.uniqueId);
        }
      } else {
        junkChecked.add(cacheKey(cand.uniqueId, cand.updatedAt));
      }
    }
  }

  // Update the survivor to the merged content + re-embed. Skipped when the
  // survivor was re-observed since the scan (a fresher write is in flight and
  // must win); retiring the stale duplicates still proceeds — it is independently
  // safe (supersede re-validates both rows inside its write).
  async function applySurvivorMerge(
    survivor: StoredVaultMemory,
    mergedContent: string | undefined,
    scanUpdatedAt: number | undefined
  ): Promise<void> {
    if (!mergedContent || mergedContent === survivor.content) return;
    if (scanUpdatedAt !== undefined) {
      const current = await getVaultMemoryOp(vaultCtx, survivor.uniqueId);
      if (!current || current.updatedAt.getTime() !== scanUpdatedAt) return;
    }
    const updated = await updateVaultMemoryOp(vaultCtx, survivor.uniqueId, {
      content: mergedContent,
    });
    if (!updated) return;
    try {
      await eagerEmbedContent(
        mergedContent,
        embeddingOptions,
        vaultCache,
        vaultCtx,
        survivor.uniqueId
      );
    } catch (err) {
      reportError(err);
    }
  }

  // Consolidate ONE multi-row cluster: decrypt it, pick the survivor, ask the
  // decide model which stale rows it replaces, then retire them + merge.
  async function consolidateCluster(
    cluster: ClusterRow[],
    result: ConsolidationSweepResult
  ): Promise<void> {
    const rows = await getVaultMemoriesByIdsOp(
      vaultCtx,
      cluster.map((c) => c.uniqueId)
    );
    const live = rows.filter((r) => !isJunkMemoryContent(r.content));
    if (live.length < 2) return; // nothing (still) duplicating

    const vecById = new Map(cluster.map((c) => [c.uniqueId, c.vec]));
    const scanUpdatedById = new Map(cluster.map((c) => [c.uniqueId, c.updatedAt]));
    // Scan-time proof counts, so a row reinforced between the scan and the write
    // is NOT retired. `proof_count` is the discriminator rather than `updatedAt`
    // because retain()'s merge on an active row pins `updated_at`
    // (`preserveUpdatedAt`) and only moves proof/last-observed — see the guard
    // note on `supersedeVaultMemoryOp`.
    const scanProofById = new Map(cluster.map((c) => [c.uniqueId, c.proofCount]));
    const survivor = pickSurvivor(live);
    const survivorVec = vecById.get(survivor.uniqueId);
    const candidates = live
      .filter((r) => r.uniqueId !== survivor.uniqueId)
      .map((r) => ({
        id: r.uniqueId,
        content: r.content,
        similarity: survivorVec ? cosineSimilarity(survivorVec, vecById.get(r.uniqueId) ?? []) : 0,
      }));
    if (candidates.length === 0) return;

    // consolidateOptions is guaranteed present here (runDedup returns early
    // without it); assert for the type.
    const decision = await consolidateMemory(survivor.content, candidates, consolidateOptions!);
    const staleIds = staleIdsFromDecision(decision, survivor.uniqueId);
    if (staleIds.length === 0) return; // model judged the survivor distinct

    const mergedContent =
      (decision.action === "supersede" || decision.action === "update") && decision.content
        ? decision.content
        : undefined;

    if (dryRun) {
      result.superseded += staleIds.length;
      return;
    }

    await applySurvivorMerge(survivor, mergedContent, scanUpdatedById.get(survivor.uniqueId));
    for (const staleId of staleIds) {
      if (
        await supersedeVaultMemoryOp(vaultCtx, staleId, survivor.uniqueId, {
          expectedProofCount: scanProofById.get(staleId) ?? null,
        })
      ) {
        result.superseded++;
      }
    }
  }

  // (c) Dedup — group by (scope, folder, embedding model), cluster each group by
  // cosine, then consolidate the multi-row clusters (bounded, cache-gated).
  async function runDedup(
    scan: ConsolidationScanRaw[],
    result: ConsolidationSweepResult,
    deleted: Set<string>
  ): Promise<void> {
    if (!consolidateOptions) return; // no decide model → no plaintext egress, skip

    const groups = new Map<string, ClusterRow[]>();
    for (const r of scan) {
      if (deleted.has(r.uniqueId)) continue;
      const vec = parseVector(r.embedding);
      if (!vec) continue; // un-embedded rows can't cluster (backfill handles them)
      // Only compare rows in the same scope/folder AND the same embedding space —
      // cosine across different models is meaningless.
      const key = `${r.scope} ${r.folderId ?? ""} ${r.embeddingModel ?? ""}`;
      const arr = groups.get(key);
      const row: ClusterRow = {
        uniqueId: r.uniqueId,
        vec,
        updatedAt: r.updatedAt,
        proofCount: r.proofCount ?? 0,
      };
      if (arr) arr.push(row);
      else groups.set(key, [row]);
    }

    const multi: ClusterRow[][] = [];
    for (const rows of groups.values()) {
      for (const c of greedyCluster(rows, threshold)) if (c.length > 1) multi.push(c);
    }
    result.clustersFound = multi.length;

    // Prune the processed-cache to this sweep's live signatures (stale entries
    // for collapsed/changed clusters are dead weight).
    const liveSigs = new Set(multi.map(clusterSignature));
    for (const sig of alreadyProcessed) if (!liveSigs.has(sig)) alreadyProcessed.delete(sig);

    // Drop already-processed (stable) clusters BEFORE the per-sweep cap, not
    // after. Capping first let a standing backlog of already-processed clusters
    // consume every sweep's slots, so fresh duplicate clusters were deferred
    // forever and never healed. Filtering first spends the cap only on clusters
    // that still need a decide-model call; `clustersDropped` is the post-filter
    // remainder so the deferred count stays honest.
    const pending = multi
      .map((cluster) => ({ cluster, sig: clusterSignature(cluster) }))
      .filter(({ sig }) => !alreadyProcessed.has(sig));

    let toProcess = pending;
    if (pending.length > maxClusters) {
      result.clustersDropped = pending.length - maxClusters;
      getLogger().warn(
        `[memory/consolidation] cluster cap (${maxClusters}) reached; ` +
          `${result.clustersDropped} cluster(s) deferred to a later sweep`
      );
      toProcess = pending.slice(0, maxClusters);
    }

    for (const { cluster, sig } of toProcess) {
      try {
        await consolidateCluster(cluster, result);
        // Memoize ONLY on a clean APPLY run. Two exclusions:
        //  - a THROWN consolidate (transient portal blip) must not be memoized,
        //    or a one-off outage would permanently skip a real duplicate;
        //  - `dryRun` must not memoize either. A dry run counts what it WOULD
        //    supersede and applies nothing, so caching the signature makes the
        //    NEXT dry run report `superseded: 0` for the same still-unfixed
        //    clusters — which breaks the "watch the dry-run counts, then flip to
        //    apply" rollout this sweeper defaults to.
        if (!dryRun) alreadyProcessed.add(sig);
      } catch (err) {
        reportError(err);
      }
    }
  }

  async function sweep(): Promise<ConsolidationSweepResult> {
    const result = emptyResult(dryRun);
    if (disposed) return result;

    const handled = new Set<string>();
    const deleted = new Set<string>();

    // (a) backfill first so freshly-decrypted junk is caught and (over sweeps)
    // newly-embedded rows become clusterable.
    await runBackfill(result, handled, deleted);

    // Scan AFTER backfill so backfill-tombstoned rows are already excluded.
    let scan: ConsolidationScanRaw[];
    try {
      scan = await getConsolidationScanRawOp(vaultCtx);
    } catch (err) {
      reportError(err);
      onSwept?.(result);
      return result;
    }
    result.scanned = scan.length;

    await runJunkPurge(scan, result, handled, deleted);
    await runDedup(scan, result, deleted);

    onSwept?.(result);
    return result;
  }

  return {
    sweep,
    dispose: () => {
      disposed = true;
    },
  };
}
