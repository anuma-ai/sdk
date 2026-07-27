/**
 * Corpus gate for the W5 graph recall lane's QUERY-SIDE extractor.
 *
 * The lane is embedding-free end to end: `extractQueryEntities` emits candidate
 * canonical names, `getMemoriesByEntityNamesOp` resolves them to memory ids, and
 * `buildGraphLaneRanking` orders those ids by shared-entity count. Nothing in
 * that chain needs a vector, so the whole lane can be scored offline against the
 * committed `llm-entities.json` entity links — no `PORTAL_API_KEY`, no network,
 * sub-second, and therefore in the default `vitest run` suite rather than the
 * CI-only eval. `benchmark.test.ts` measures FUSED retrieval and needs real
 * embeddings; this measures the lane in isolation and can run on every change.
 *
 * What this file is for: D4.7's whole problem was a lane that silently produced
 * nothing on a phrasing nobody evaluated. A metric that only moves when someone
 * remembers to run an eval is how that happened. So the numbers below are
 * committed to `entity-lane-baseline.json` and asserted as a ratchet.
 *
 * FOUR casing variants, not one. The extractor's failure modes are casing
 * failure modes, and each variant exercises a different one — see
 * {@link VARIANT_FN}. A lift number measured only on "everything cased" and
 * "everything lowercased" is not evidence the lane works, which is exactly how
 * a question-initial query ("Are there any designers in san francisco") could
 * kill the lane while every eval stayed green.
 *
 * What this file does NOT establish: it scores the LANE against gold entity
 * links. It does not run fused end-to-end recall, so it says nothing about
 * whether the lane's rank contributions survive RRF fusion at any budget. Read
 * a lift here as "the lane found more of the right memories", never as "recall
 * improved".
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { extractQueryEntities } from "../../../../src/lib/memory/queryEntities.js";
import { BENCHMARK_QUERIES, VAULT_MEMORIES } from "./dataset.js";

// Resolve beside THIS module rather than off process.cwd() — same reason
// embeddingCache.ts does: a cwd-relative read only works when the suite is
// launched from the repo root, and a silent ENOENT here would turn the gate off
// instead of failing it.
const HERE = dirname(fileURLToPath(import.meta.url));
const LLM_ENTITIES_PATH = join(HERE, "llm-entities.json");
const BASELINE_PATH = join(HERE, "entity-lane-baseline.json");

/** Regenerate rather than assert. Mirrors `benchmark.test.ts --save-baseline`. */
const UPDATE_BASELINE = !!process.env.UPDATE_ENTITY_LANE_BASELINE;

const llm: Record<string, string[]> = JSON.parse(readFileSync(LLM_ENTITIES_PATH, "utf8"));

/**
 * canonical entity name -> memory ids linked to it. This is the stored graph:
 * the same shape `getMemoriesByEntityNamesOp` reads out of `memory_entity`,
 * built from the committed LLM-extracted entities so the harness needs no DB.
 */
const entityToMemories = new Map<string, Set<string>>();
for (const memory of VAULT_MEMORIES) {
  for (const raw of llm[memory.content] ?? []) {
    const name = raw.trim().toLowerCase();
    if (!name) continue;
    let bucket = entityToMemories.get(name);
    if (!bucket) {
      bucket = new Set();
      entityToMemories.set(name, bucket);
    }
    bucket.add(memory.id);
  }
}

const POSITIVE = BENCHMARK_QUERIES.filter((q) => q.category !== "hard_negatives");
const HARD_NEGATIVE = BENCHMARK_QUERIES.filter((q) => q.category === "hard_negatives");

/** Gold ids that have ANY entity link at all — the ceiling a lexical extractor
 *  could reach if it guessed every stored name correctly. */
const ORACLE_REACHABLE = (() => {
  const linked = new Set<string>();
  for (const ids of entityToMemories.values()) for (const id of ids) linked.add(id);
  let n = 0;
  for (const query of POSITIVE) for (const id of query.expectedIds) if (linked.has(id)) n++;
  return n;
})();

/**
 * Replicates `buildGraphLaneRanking` (recall.ts) exactly: resolve candidates in
 * emission order into a memoryId -> matched-names map, then sort by shared-name
 * count descending with a stable sort so ties keep first-touch order.
 *
 * Deliberately NOT `rankByEntityOverlap` (searchTool.ts). That helper ties on
 * the caller's item order rather than on first-touch order and applies a tanh
 * shaping the lane never sees, so scoring through it would measure a ranking
 * production does not run.
 */
function rankLane(candidates: readonly string[]): string[] {
  const byMemory = new Map<string, Set<string>>();
  for (const name of new Set(candidates)) {
    const ids = entityToMemories.get(name);
    if (!ids) continue;
    for (const id of ids) {
      let bucket = byMemory.get(id);
      if (!bucket) {
        bucket = new Set();
        byMemory.set(id, bucket);
      }
      bucket.add(name);
    }
  }
  return [...byMemory.entries()].sort((a, b) => b[1].size - a[1].size).map(([id]) => id);
}

type Variant = "as-written" | "lower" | "sentence" | "upper";

const VARIANTS: readonly Variant[] = ["as-written", "lower", "sentence", "upper"];

const VARIANT_FN: Record<Variant, (q: string) => string> = {
  /**
   * Mixed casing as the corpus authored it. Exercises the PARTIAL-CASING hole:
   * a capitalized proper noun satisfies the strict pass, and a gated extractor
   * then never runs the lexical pass — losing every lowercase entity after it.
   */
  "as-written": (q) => q,
  /** Dictation / autocaps off. No strict hits anywhere in the sentence. */
  lower: (q) => q.toLowerCase(),
  /**
   * The shape neither arm of the design bakeoff contained: a leading
   * capitalized FUNCTION word over an otherwise-lowercase body ("Are there any
   * designers in san francisco"). It is simultaneously the People-Nearby
   * phrasing this lane exists for and the exact shape a strict-pass gate
   * mistakes for a successful extraction, so a whole class of lane death is
   * invisible without it.
   */
  sentence: (q) => {
    const lower = q.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  },
  /**
   * Shouting / caps lock. Every token satisfies the strict regex, so the strict
   * pass fills the candidate budget and the ordering contract — not stopwording
   * — decides what survives. Untested territory; baselined so a regression here
   * is visible rather than theoretical.
   */
  upper: (q) => q.toUpperCase(),
};

interface LaneMetrics {
  /** POSITIVE queries where the lane returned at least one memory. */
  activation: number;
  /** Σ|expectedIds ∩ ranked| / Σ|expectedIds| over POSITIVE. */
  expectedRecall: number;
  /** Mean over POSITIVE of 1/(rank of first gold id + 1); 0 when none ranked. */
  mrr: number;
  /** Σ 1/(60 + rank + 1) over every gold id present — the literal quantity
   *  `rrfFuse` consumes from this lane, so it is what fusion actually sees. */
  rrfSum: number;
  /** Extractor output width — the IN-clause the lane issues. */
  meanCandidates: number;
  maxCandidates: number;
  /** Lane fan-out into RRF. */
  meanReturned: number;
  maxReturned: number;
  /** goldReturned / totalReturned across POSITIVE. */
  lanePrecision: number;
  /**
   * Gold memories an oracle with perfect knowledge of the stored links could
   * reach, minus the ones this extractor reaches. The residual that is NOT a
   * lexical-matching problem — it is the semantic gap ("my sister" never
   * reaches "sara"). Reported, never asserted: asserting it would freeze a
   * question that is deliberately open.
   */
  semanticHeadroom: number;
  /** query text -> reciprocal rank, so a change cannot trade one query for
   *  another and report the mean as a wash. */
  perQueryRR: Record<string, number>;
}

interface HardNegativeMetrics {
  activation: number;
  meanMemories: number;
  maxMemories: number;
}

interface TierBaseline {
  variants: Record<Variant, LaneMetrics>;
  hardNegatives: HardNegativeMetrics;
  /**
   * |metric(v) - metric("lower")| per variant, ratcheted independently.
   *
   * A single worst-case number across all four would let the `upper` variant's
   * large spread mask the `as-written` spread collapsing to zero — which is the
   * one number that proves a casing-sensitive gate is gone. Per-variant means
   * each shape has to hold its own ground.
   */
  casingSpread: Record<Variant, { mrr: number; activation: number }>;
}

type Extractor = (query: string) => string[];

const TIERS: Record<string, Extractor> = {
  heuristic: (query) => extractQueryEntities(query),
};

function measure(variant: Variant, extract: Extractor): LaneMetrics {
  const transform = VARIANT_FN[variant];
  let activation = 0;
  let goldFound = 0;
  let goldTotal = 0;
  let mrrSum = 0;
  let rrfSum = 0;
  let candidateTotal = 0;
  let maxCandidates = 0;
  let returnedTotal = 0;
  let maxReturned = 0;
  let goldReturned = 0;
  const perQueryRR: Record<string, number> = {};

  for (const query of POSITIVE) {
    const candidates = extract(transform(query.query));
    candidateTotal += candidates.length;
    maxCandidates = Math.max(maxCandidates, candidates.length);

    const ranked = rankLane(candidates);
    returnedTotal += ranked.length;
    maxReturned = Math.max(maxReturned, ranked.length);
    if (ranked.length > 0) activation++;

    const expected = new Set(query.expectedIds);
    goldTotal += expected.size;
    for (const id of ranked) if (expected.has(id)) goldReturned++;
    for (const id of expected) {
      const rank = ranked.indexOf(id);
      if (rank < 0) continue;
      goldFound++;
      rrfSum += 1 / (60 + rank + 1);
    }
    const firstGold = ranked.findIndex((id) => expected.has(id));
    const rr = firstGold >= 0 ? 1 / (firstGold + 1) : 0;
    mrrSum += rr;
    perQueryRR[query.query] = rr;
  }

  return {
    activation,
    expectedRecall: goldFound / goldTotal,
    mrr: mrrSum / POSITIVE.length,
    rrfSum,
    meanCandidates: candidateTotal / POSITIVE.length,
    maxCandidates,
    meanReturned: returnedTotal / POSITIVE.length,
    maxReturned,
    lanePrecision: returnedTotal > 0 ? goldReturned / returnedTotal : 0,
    semanticHeadroom: ORACLE_REACHABLE - goldFound,
    perQueryRR,
  };
}

function measureHardNegatives(extract: Extractor): HardNegativeMetrics {
  let activation = 0;
  let total = 0;
  let max = 0;
  for (const query of HARD_NEGATIVE) {
    const ranked = rankLane(extract(query.query));
    if (ranked.length > 0) activation++;
    total += ranked.length;
    max = Math.max(max, ranked.length);
  }
  return {
    activation,
    meanMemories: total / HARD_NEGATIVE.length,
    maxMemories: max,
  };
}

/**
 * Median µs/query over 5 passes across all 100 queries. `bench-recall-latency.ts`
 * times the whole recall call and cannot resolve a sub-millisecond extraction
 * stage, so this is the only guard against the extractor itself becoming the
 * cost — which matters because the input clamp and the candidate cap are the two
 * things standing between a pasted document and an unbounded token scan.
 */
function measureMicros(extract: Extractor): number {
  const samples: number[] = [];
  for (let pass = 0; pass < 5; pass++) {
    const start = performance.now();
    for (const query of BENCHMARK_QUERIES) extract(query.query);
    samples.push(((performance.now() - start) * 1000) / BENCHMARK_QUERIES.length);
  }
  samples.sort((a, b) => a - b);
  return samples[2];
}

function measureTier(extract: Extractor): TierBaseline {
  const variants = Object.fromEntries(VARIANTS.map((v) => [v, measure(v, extract)])) as Record<
    Variant,
    LaneMetrics
  >;
  const lower = variants.lower;
  return {
    variants,
    hardNegatives: measureHardNegatives(extract),
    casingSpread: Object.fromEntries(
      VARIANTS.map((v) => [
        v,
        {
          mrr: Math.abs(variants[v].mrr - lower.mrr),
          activation: Math.abs(variants[v].activation - lower.activation),
        },
      ])
    ) as TierBaseline["casingSpread"],
  };
}

const measured: Record<string, TierBaseline> = Object.fromEntries(
  Object.entries(TIERS).map(([name, extract]) => [name, measureTier(extract)])
);

interface Baseline {
  note: string;
  tiers: Record<string, TierBaseline>;
}

if (UPDATE_BASELINE) {
  const next: Baseline = {
    note:
      "Committed floor/ceiling for the W5 entity lane. Regenerate with " +
      "UPDATE_ENTITY_LANE_BASELINE=1 npx vitest run test/memory/src/vault/entityLane.test.ts. " +
      "Every moved number needs an explanation in the PR — some of these are " +
      "deliberate trades and the diff is the only place that distinction is visible.",
    tiers: measured,
  };
  writeFileSync(BASELINE_PATH, `${JSON.stringify(next, null, 2)}\n`);
}

const baseline: Baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));

/**
 * Absolute ceiling on candidates emitted for one query, independent of the
 * baseline. A cost gate that only ratchets against whatever the last
 * regeneration happened to produce is not a cost gate.
 */
const MAX_CANDIDATES_CEILING = 16;
/** Absolute ceiling on memories the lane may inject on a hard negative. */
const MAX_HARD_NEGATIVE_MEMORIES = 8;
/**
 * Absolute casing-invariance bound, independent of the baseline. The extractor
 * is case-blind by construction now, so the honest bound is zero and these are
 * slack for a future tokenizer that is merely case-INSENSITIVE. Kept as hard
 * numbers so regenerating the baseline cannot quietly reintroduce a casing gap.
 */
const MAX_CASING_SPREAD_MRR = 0.01;
const MAX_CASING_SPREAD_ACTIVATION = 1;
/** Absolute ceiling on extraction cost. Worst measured at the 4096-char clamp
 *  is ~107µs, so this is generous by design — it catches an accidental O(n²),
 *  not a few percent of drift on a noisy CI box. */
const MAX_MICROS_PER_QUERY = 250;

const EPS = 1e-9;

describe.each(Object.keys(TIERS))("entity lane — %s tier", (tier) => {
  const now = measured[tier];
  const was = baseline.tiers[tier];

  it("has a committed baseline", () => {
    expect(was, `no baseline for tier "${tier}" — regenerate it`).toBeDefined();
  });

  describe.each(VARIANTS)("%s casing", (variant) => {
    const metrics = now.variants[variant];
    const before = was?.variants?.[variant];

    it("activates on at least as many queries as the baseline", () => {
      expect(metrics.activation).toBeGreaterThanOrEqual(before.activation);
    });

    it("reaches at least the baseline expected-id recall", () => {
      expect(metrics.expectedRecall).toBeGreaterThanOrEqual(before.expectedRecall - EPS);
    });

    it("reaches at least the baseline MRR", () => {
      expect(metrics.mrr).toBeGreaterThanOrEqual(before.mrr - EPS);
    });

    it("contributes at least the baseline RRF mass to fusion", () => {
      expect(metrics.rrfSum).toBeGreaterThanOrEqual(before.rrfSum - EPS);
    });

    it("does not regress ANY individual query's reciprocal rank", () => {
      // The mean can stay flat while a change trades one query for another.
      // This is deterministic arithmetic over a frozen corpus, so it is checked
      // exactly — a "tolerance" here would just hide the trade.
      const regressed = POSITIVE.map((q) => q.query)
        .filter((q) => metrics.perQueryRR[q] < (before.perQueryRR[q] ?? 0))
        .map((q) => `${q}: ${before.perQueryRR[q]} -> ${metrics.perQueryRR[q]}`);
      expect(regressed).toEqual([]);
    });

    it("stays within the candidate cost gate", () => {
      // The MEAN gets 25% of slack because it moves with tokenizer changes that
      // are not width changes. The MAX is ratcheted exactly: it is the width of
      // the widest `IN`-clause the lane will issue, and this corpus contains
      // queries long enough to reach the cap, so a raised cap shows up here.
      expect(metrics.meanCandidates).toBeLessThanOrEqual(before.meanCandidates * 1.25 + EPS);
      expect(metrics.maxCandidates).toBeLessThanOrEqual(before.maxCandidates);
      expect(metrics.maxCandidates).toBeLessThanOrEqual(MAX_CANDIDATES_CEILING);
    });

    it("does not drift further from the all-lowercase arm than the baseline", () => {
      // The incumbent scores WORSE on correctly-capitalized text than on
      // lowercased text, which is absurd on its face and is the tell that a
      // casing-sensitive gate is suppressing a pass. Ratcheting the spread is
      // how that stops being a curiosity and starts being a gate.
      expect(now.casingSpread[variant].mrr).toBeLessThanOrEqual(
        was.casingSpread[variant].mrr + EPS
      );
      expect(now.casingSpread[variant].activation).toBeLessThanOrEqual(
        was.casingSpread[variant].activation
      );
      expect(now.casingSpread[variant].mrr).toBeLessThanOrEqual(MAX_CASING_SPREAD_MRR);
      expect(now.casingSpread[variant].activation).toBeLessThanOrEqual(
        MAX_CASING_SPREAD_ACTIVATION
      );
    });
  });

  it("keeps the hard-negative lane inside its committed ceiling", () => {
    // Hard negatives are the sharpest form of the precision cost: queries where
    // the lane SHOULD stay quiet. Moving these is allowed — it is a deliberate
    // trade for activation — but only by regenerating the baseline and saying so.
    expect(now.hardNegatives.activation).toBeLessThanOrEqual(was.hardNegatives.activation);
    expect(now.hardNegatives.meanMemories).toBeLessThanOrEqual(
      was.hardNegatives.meanMemories + 0.05
    );
    expect(now.hardNegatives.maxMemories).toBeLessThanOrEqual(MAX_HARD_NEGATIVE_MEMORIES);
  });

  it("extracts well inside the per-query time budget", () => {
    expect(measureMicros(TIERS[tier])).toBeLessThan(MAX_MICROS_PER_QUERY);
  });

  it("reports the semantic headroom left on the table", () => {
    // Deliberately unasserted. This is the residual an extractor cannot close by
    // lexical means at all, so it is the number that would justify (or refute) a
    // future semantic extractor — and freezing it with an assertion would decide
    // that question by accident.
    const rows = VARIANTS.map(
      (v) => `${v}: ${now.variants[v].semanticHeadroom} of ${ORACLE_REACHABLE} linkable gold ids`
    ).join("\n    ");
    console.error(`[entity-lane:${tier}] semanticHeadroom\n    ${rows}`);
    expect(now.variants.lower.semanticHeadroom).toBeGreaterThanOrEqual(0);
  });
});
