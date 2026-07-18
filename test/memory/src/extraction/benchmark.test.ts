#!/usr/bin/env node
/**
 * Extraction-quality benchmark.
 *
 * Drives the real `extractFacts` over a labeled corpus and measures what gets
 * *remembered* (independent of retrieval):
 *
 *   - recall    : durable gold facts that a candidate matched (cases w/ expected)
 *   - precision : extracted candidates that matched some gold fact (rest = junk)
 *   - junk rate : candidates produced on "negative" turns that should yield none
 *   - clean rate: fraction of negative cases that correctly produced 0 candidates
 *
 * Matching is embedding cosine ≥ --match-threshold (default 0.62) between an
 * extracted candidate's content and a gold fact — apples-to-apples since both
 * are third-person/present-tense.
 *
 * Run:
 *   pnpm eval:extraction
 *   pnpm eval:extraction --verbose          # per-case extracted vs gold
 *   pnpm eval:extraction --json
 *   pnpm eval:extraction --match-threshold 0.6
 *   pnpm eval:extraction --model openai/gpt-5-mini   # A/B a different extractor
 *   pnpm eval:extraction --repeat 3 --save-baseline  # write the golden baseline
 *   pnpm eval:extraction --repeat 3 --baseline test/memory/src/extraction/baseline.json
 *                                                    # gate: exit 1 on a regression
 */

import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

import { extractFacts } from "../../../../src/lib/memory/autoExtract.js";
import { normalizeEntityName } from "../../../../src/lib/db/entities/types.js";
import { generateEmbeddings } from "../../../../src/lib/memoryEngine/embeddings.js";
import type { EmbeddingOptions } from "../../../../src/lib/memoryEngine/types.js";
import { buildBaseline, compareToBaseline, isValidBaseline } from "./baseline.js";
import { EXTRACTION_CASES, type ExtractionCase, type ExtractionCategory } from "./dataset.js";

/**
 * Token-set match SCORE between a gold entity name and an extracted one —
 * normalized (lower/trim) then split on non-alphanumerics (Unicode-aware, so
 * non-ASCII names like "São Paulo" don't tokenize to nothing). A valid match
 * requires one side's tokens to be a subset of the other's — which blocks the
 * substring false-positives plain `includes` gives ("Go" ⊄ "Google") and the
 * spurious partial overlaps a bare intersection would ("Boston Marathon" vs
 * "Boston Children's Hospital" share only "boston" → not a subset → 0).
 *
 * Returns a Jaccard-style score in (0,1] for a valid match, else 0. Exact
 * token-set equality scores 1; a subset like "Austin" ⊆ "Austin, Texas" scores
 * <1. Callers pick the HIGHEST-scoring extracted entity so an exact match wins
 * over a looser one and a gold entity isn't mis-paired to the first candidate.
 */
function entityMatchScore(gold: string, extracted: string): number {
  const toks = (s: string): Set<string> =>
    new Set(
      normalizeEntityName(s)
        .split(/[^\p{L}\p{N}]+/u)
        .filter((t) => t.length > 0)
    );
  const g = toks(gold);
  const e = toks(extracted);
  if (g.size === 0 || e.size === 0) return 0;
  const [small, big] = g.size <= e.size ? [g, e] : [e, g];
  for (const t of small) if (!big.has(t)) return 0;
  return small.size / big.size; // subset ⇒ |intersection| = small.size
}

/** Bucket label for the kind an extracted entity was given (or its absence). */
const NO_KIND = "(no-kind)";
const MISSED = "(missed)";

const { values: args } = parseArgs({
  options: {
    json: { type: "boolean", default: false },
    verbose: { type: "boolean", default: false },
    "match-threshold": { type: "string" },
    model: { type: "string" },
    concurrency: { type: "string" },
    repeat: { type: "string" },
    // Regression gate. `--save-baseline` writes the current run(s) as the golden
    // baseline (to `--baseline <path>` if given, else the default path).
    // `--baseline <path>` alone compares the current run(s) against that file and
    // exits non-zero on a regression. Pair `--save-baseline` with `--repeat 3+`
    // so the stored tolerance reflects real run-to-run noise.
    baseline: { type: "string", short: "b" },
    "save-baseline": { type: "boolean", default: false },
  },
});

// Parse a numeric CLI arg, falling back when it's absent or non-numeric — a
// bad --concurrency would otherwise yield NaN, mapLimit would spawn zero
// workers, and the run would silently aggregate over undefined results.
function numArg(
  raw: string | undefined,
  fallback: number,
  parse: (s: string) => number = parseFloat,
  min = 1
): number {
  if (raw === undefined) return fallback;
  const n = parse(raw);
  return Number.isFinite(n) && n >= min ? n : fallback;
}

const MATCH_THRESHOLD = numArg(args["match-threshold"], 0.62, parseFloat, 0);
const CONCURRENCY = numArg(args.concurrency, 4, (s) => parseInt(s, 10));
// Extraction is non-deterministic (the model isn't pinned to temperature 0),
// and the negative corpus is small, so a single run's clean-rate can swing on
// one flipped case. `--repeat N` runs the suite N times and reports the spread
// (mean / min / max) so a reported delta can be told apart from run-to-run
// noise. Defaults to 1 (the cheap single run).
const REPEAT = numArg(args.repeat, 1, (s) => parseInt(s, 10));

const API_KEY = process.env.PORTAL_API_KEY;
const BASE_URL = process.env.ANUMA_API_URL || "https://portal.anuma-dev.ai";
if (!API_KEY) {
  console.error("Error: PORTAL_API_KEY is required (add it to your .env).");
  process.exit(1);
}
const embeddingOptions: EmbeddingOptions = { apiKey: API_KEY, baseUrl: BASE_URL };

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom > 0 ? dot / denom : 0;
}

/** Run async fn over items with bounded concurrency, preserving order. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

interface CaseResult {
  id: string;
  category: ExtractionCategory;
  expectedCount: number;
  candidates: string[]; // extracted contents
  matchedExpected: number; // gold facts a candidate matched
  goodCandidates: number; // candidates that matched a gold fact
  expectedDetail: { fact: string; matched: boolean; best: number }[];
  candidateDetail: { content: string; matched: boolean; best: number; forbidden: boolean }[];
  /** Candidates that matched a `forbidden` fact — confirmed junk, the strongest signal. */
  forbiddenHits: number;
  /**
   * Per gold entity: was it extracted (covered), what kind did the model give
   * it, and was that the right kind. `predicted` is the bucket for the
   * confusion matrix — the extracted kind, or NO_KIND (extracted, no kind) /
   * MISSED (not extracted at all).
   */
  entityDetail: {
    name: string;
    expectedKind: string;
    covered: boolean;
    extractedName: string | null;
    extractedKind: string | null;
    kindCorrect: boolean;
    predicted: string;
  }[];
}

// Production keeps only candidates at/above this confidence (DEFAULT_MIN_
// CONFIDENCE in autoExtract.ts, applied inside extractAndRetain). extractFacts
// itself does NOT apply it, so the eval must — otherwise precision/recall/clean
// rate are scored over candidates that would never be saved, and the prompt's
// own ">= 0.7" instruction goes unmeasured. Mirror the constant here (this is a
// test harness; not worth widening the package's public surface to import it).
const PROD_MIN_CONFIDENCE = 0.7;

async function scoreCase(c: ExtractionCase): Promise<CaseResult> {
  const rawCandidates = await extractFacts(
    c.messages.map((m) => ({ id: m.id, role: m.role, content: m.content })),
    { apiKey: API_KEY, baseUrl: BASE_URL, ...(args.model && { model: args.model }) }
  );
  const candidates = rawCandidates.filter((c2) => c2.confidence >= PROD_MIN_CONFIDENCE);
  const candTexts = candidates.map((c2) => c2.content);
  const forbidden = c.forbidden ?? [];

  // Kind scoring: gather entities off the retained candidates and match each
  // labeled gold entity to the BEST-scoring extracted entity by name overlap
  // (highest match score wins, so an exact match beats a looser subset and a
  // gold entity is never mis-paired to whichever candidate happened to be first).
  // Track matched entities to ensure one-to-one assignment and prevent double-counting.
  const extractedEntities = candidates.flatMap((c2) => c2.entities);
  const matchedIndices = new Set<number>();
  const entityDetail = (c.expectedEntities ?? []).map((exp) => {
    let match: (typeof extractedEntities)[number] | undefined;
    let bestScore = 0;
    let bestIndex = -1;
    for (let i = 0; i < extractedEntities.length; i++) {
      if (matchedIndices.has(i)) continue;
      const ee = extractedEntities[i];
      const score = entityMatchScore(exp.name, ee.name);
      if (score > bestScore) {
        bestScore = score;
        match = ee;
        bestIndex = i;
      }
    }
    if (bestIndex >= 0) matchedIndices.add(bestIndex);
    const covered = match !== undefined;
    const extractedKind = match?.kind ?? null;
    const predicted = !covered ? MISSED : (extractedKind ?? NO_KIND);
    return {
      name: exp.name,
      expectedKind: exp.kind,
      covered,
      extractedName: match?.name ?? null,
      extractedKind,
      kindCorrect: covered && extractedKind === exp.kind,
      predicted,
    };
  });

  // Embed gold + forbidden + candidate texts together, then match by cosine.
  const texts = [...c.expected, ...forbidden, ...candTexts];
  const embeddings = texts.length > 0 ? await generateEmbeddings(texts, embeddingOptions) : [];
  const goldEmb = embeddings.slice(0, c.expected.length);
  const forbiddenEmb = embeddings.slice(c.expected.length, c.expected.length + forbidden.length);
  const candEmb = embeddings.slice(c.expected.length + forbidden.length);

  const expectedDetail = c.expected.map((fact, i) => {
    let best = 0;
    for (const ce of candEmb) best = Math.max(best, cosine(goldEmb[i], ce));
    return { fact, matched: best >= MATCH_THRESHOLD, best };
  });
  const candidateDetail = candTexts.map((content, i) => {
    let best = 0;
    for (const ge of goldEmb) best = Math.max(best, cosine(candEmb[i], ge));
    let forbiddenBest = 0;
    for (const fe of forbiddenEmb) forbiddenBest = Math.max(forbiddenBest, cosine(candEmb[i], fe));
    const matched = best >= MATCH_THRESHOLD;
    return {
      content,
      matched,
      best,
      // A forbidden hit counts as junk when the candidate is closer to a
      // forbidden fact than to any gold fact. Gold and forbidden often share a
      // template ("lives in SF" vs "lives in Portland") so both clear the
      // threshold; the discriminator is which it's NEARER. Using `!matched`
      // instead would let a junk "Portland" candidate that merely grazes the
      // "SF" template escape counting.
      forbidden: forbiddenBest >= MATCH_THRESHOLD && forbiddenBest > best,
    };
  });

  return {
    id: c.id,
    category: c.category,
    expectedCount: c.expected.length,
    candidates: candTexts,
    matchedExpected: expectedDetail.filter((e) => e.matched).length,
    // A candidate counts toward precision only if it matched a gold fact AND
    // isn't flagged forbidden. On update cases a junk extraction (old job /
    // location) can sit above threshold for both the gold and the forbidden
    // template; without the `!forbidden` guard it would inflate precision even
    // as it increments forbiddenHits.
    goodCandidates: candidateDetail.filter((e) => e.matched && !e.forbidden).length,
    expectedDetail,
    candidateDetail,
    forbiddenHits: candidateDetail.filter((e) => e.forbidden).length,
    entityDetail,
  };
}

function pct(n: number, d: number): string {
  return d > 0 ? `${((100 * n) / d).toFixed(1)}%` : "—";
}

interface RunSummary {
  results: CaseResult[];
  overall: {
    recall: number;
    precision: number;
    avgCandidatesPerCase: number;
    negativeJunkCandidates: number;
    negativeCleanRate: number;
    forbiddenHits: number;
    totalCandidates: number;
    expectedEntities: number;
    coveredEntities: number;
    kindCorrect: number;
    /** Fraction of labeled gold entities that were extracted at all. */
    entityCoverage: number;
    /** Fraction of EXTRACTED gold entities given the correct kind (isolates
     * classification quality from extraction coverage). */
    kindAccuracy: number;
  };
  /** Per expected kind: correct/covered/total + predicted-bucket tally. */
  kindConfusion: {
    kind: string;
    total: number;
    covered: number;
    correct: number;
    predictions: Record<string, number>;
  }[];
  byCategory: {
    category: ExtractionCategory;
    cases: number;
    recall: number | null;
    precision: number | null;
    candidates: number;
  }[];
  negativesCount: number;
  cleanNegatives: number;
}

async function runOnce(): Promise<RunSummary> {
  const results = await mapLimit(EXTRACTION_CASES, CONCURRENCY, scoreCase);

  const withExpected = results.filter((r) => r.expectedCount > 0);
  const negatives = results.filter((r) => r.expectedCount === 0);

  const totalExpected = withExpected.reduce((s, r) => s + r.expectedCount, 0);
  const totalMatchedExpected = withExpected.reduce((s, r) => s + r.matchedExpected, 0);
  const totalCandidates = results.reduce((s, r) => s + r.candidates.length, 0);
  const totalGoodCandidates = results.reduce((s, r) => s + r.goodCandidates, 0);
  const negativeCandidates = negatives.reduce((s, r) => s + r.candidates.length, 0);
  const cleanNegatives = negatives.filter((r) => r.candidates.length === 0).length;
  const forbiddenHits = results.reduce((s, r) => s + r.forbiddenHits, 0);

  // Kind aggregation over every labeled gold entity across all cases.
  const allEntities = results.flatMap((r) => r.entityDetail);
  const expectedEntities = allEntities.length;
  const coveredEntities = allEntities.filter((e) => e.covered).length;
  const kindCorrect = allEntities.filter((e) => e.kindCorrect).length;

  const confusionMap = new Map<
    string,
    { total: number; covered: number; correct: number; predictions: Record<string, number> }
  >();
  for (const e of allEntities) {
    let row = confusionMap.get(e.expectedKind);
    if (!row) {
      row = { total: 0, covered: 0, correct: 0, predictions: {} };
      confusionMap.set(e.expectedKind, row);
    }
    row.total++;
    if (e.covered) row.covered++;
    if (e.kindCorrect) row.correct++;
    row.predictions[e.predicted] = (row.predictions[e.predicted] ?? 0) + 1;
  }
  const kindConfusion = Array.from(confusionMap.entries())
    .map(([kind, v]) => ({ kind, ...v }))
    .sort((a, b) => b.total - a.total);

  const overall = {
    recall: totalMatchedExpected / (totalExpected || 1),
    precision: totalGoodCandidates / (totalCandidates || 1),
    avgCandidatesPerCase: totalCandidates / results.length,
    negativeJunkCandidates: negativeCandidates,
    negativeCleanRate: cleanNegatives / (negatives.length || 1),
    forbiddenHits,
    totalCandidates,
    expectedEntities,
    coveredEntities,
    kindCorrect,
    entityCoverage: coveredEntities / (expectedEntities || 1),
    // Accuracy over EXTRACTED gold entities. Degenerate 0-covered case yields 0
    // here, but `coveredEntities` is emitted alongside (so the 0 denominator is
    // explicit) and the human report renders "—" via pct(); with any labeled
    // corpus coverage is ≥1 so it never actually hits.
    kindAccuracy: kindCorrect / (coveredEntities || 1),
  };

  const categories: ExtractionCategory[] = [
    "durable",
    "multi-fact",
    "buried",
    "update",
    "negative",
  ];
  const byCategory = categories.map((cat) => {
    const group = results.filter((r) => r.category === cat);
    const exp = group.reduce((s, r) => s + r.expectedCount, 0);
    const matched = group.reduce((s, r) => s + r.matchedExpected, 0);
    const cands = group.reduce((s, r) => s + r.candidates.length, 0);
    const good = group.reduce((s, r) => s + r.goodCandidates, 0);
    return {
      category: cat,
      cases: group.length,
      recall: exp > 0 ? matched / exp : null,
      precision: cands > 0 ? good / cands : null,
      candidates: cands,
    };
  });

  return {
    results,
    overall,
    kindConfusion,
    byCategory,
    negativesCount: negatives.length,
    cleanNegatives,
  };
}

interface VarianceBand {
  mean: number;
  min: number;
  max: number;
}

function band(xs: number[]): VarianceBand {
  return {
    mean: xs.reduce((a, b) => a + b, 0) / xs.length,
    min: Math.min(...xs),
    max: Math.max(...xs),
  };
}

/** Spread of the headline metrics across N runs — the point of `--repeat`. */
function computeVariance(runs: RunSummary[]): Record<string, VarianceBand> {
  return {
    recall: band(runs.map((r) => r.overall.recall)),
    precision: band(runs.map((r) => r.overall.precision)),
    negativeCleanRate: band(runs.map((r) => r.overall.negativeCleanRate)),
    forbiddenHits: band(runs.map((r) => r.overall.forbiddenHits)),
    entityCoverage: band(runs.map((r) => r.overall.entityCoverage)),
    kindAccuracy: band(runs.map((r) => r.overall.kindAccuracy)),
  };
}

// ---------------------------------------------------------------------------
// Baseline (regression gate). Pure comparison math lives in ./baseline.ts so it
// can be unit-tested without a live LLM run; this section is only I/O + display.
// ---------------------------------------------------------------------------

const DEFAULT_BASELINE_PATH = "test/memory/src/extraction/baseline.json";

/** Write the baseline file and report where it landed. */
async function saveBaseline(runs: RunSummary[], path: string): Promise<void> {
  const baseline = buildBaseline(
    runs.map((r) => r.overall),
    MATCH_THRESHOLD
  );
  await writeFile(path, JSON.stringify(baseline, null, 2) + "\n");
  console.error(
    `\nBaseline written to ${path} ` +
      `(${runs.length} run${runs.length === 1 ? "" : "s"}; ` +
      `pair --save-baseline with --repeat 3+ for a noise-aware tolerance).`
  );
}

/** Load, compare, and exit non-zero on regression. Returns on a clean gate. */
async function gateAgainstBaseline(runs: RunSummary[], path: string): Promise<void> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(path, "utf-8"));
  } catch (err) {
    console.error(`Failed to load baseline from ${path}: ${String(err)}`);
    process.exit(1);
  }
  // Fail loudly on a wrong-shaped file rather than passing vacuously — a
  // malformed baseline (or the eval's after.json by mistake) would otherwise
  // skip every metric and report "no regressions".
  if (!isValidBaseline(parsed)) {
    console.error(
      `\n  ${path} is not a valid extraction baseline ` +
        `(expected a matchThreshold + metrics object). ` +
        `Generate one with --save-baseline.\n`
    );
    process.exit(1);
  }
  const baseline = parsed;
  // The match threshold changes what counts as a hit, so comparing runs scored
  // at a different threshold than the baseline is apples-to-oranges. Refuse it.
  if (Math.abs(baseline.matchThreshold - MATCH_THRESHOLD) > 1e-9) {
    console.error(
      `\n  match-threshold ${MATCH_THRESHOLD} differs from the baseline's ` +
        `${baseline.matchThreshold}; re-run with --match-threshold ${baseline.matchThreshold} ` +
        `or regenerate the baseline.\n`
    );
    process.exit(1);
  }
  const regressions = compareToBaseline(
    runs.map((r) => r.overall),
    baseline
  );
  if (regressions.length === 0) {
    console.error("\n  Baseline comparison: no regressions detected.\n");
    return;
  }
  console.error("\n  REGRESSION DETECTED\n");
  console.error("  Metric             Baseline   Current    Tolerance");
  console.error("  ─────────────────  ─────────  ─────────  ─────────");
  for (const r of regressions) {
    const fmt = (v: number) => (r.metric === "forbiddenHits" ? v.toFixed(1) : pct(v, 1));
    console.error(
      `  ${r.metric.padEnd(17)}  ${fmt(r.baseline).padStart(9)}  ` +
        `${fmt(r.current).padStart(9)}  ${fmt(r.tolerance).padStart(9)}`
    );
  }
  console.error("");
  process.exit(1);
}

/** Human-readable single-run report (category table + headline metrics). */
function printRunHuman(run: RunSummary): void {
  const { overall, byCategory, negativesCount, cleanNegatives } = run;
  console.log("\n  EXTRACTION QUALITY  (match cosine ≥ " + MATCH_THRESHOLD + ")\n");
  console.log("  Category     Cases  Recall   Precision  Cands");
  console.log("  ───────────  ─────  ───────  ─────────  ─────");
  for (const c of byCategory) {
    console.log(
      `  ${c.category.padEnd(11)}  ${String(c.cases).padStart(5)}  ` +
        `${(c.recall === null ? "—" : pct(c.recall, 1)).padStart(7)}  ` +
        `${(c.precision === null ? "—" : pct(c.precision, 1)).padStart(9)}  ` +
        `${String(c.candidates).padStart(5)}`
    );
  }
  console.log("  ───────────────────────────────────────────────");
  console.log(`  Recall (gold facts caught)     ${pct(overall.recall, 1)}`);
  console.log(`  Precision (extracted are real) ${pct(overall.precision, 1)}`);
  console.log(
    `  Negative clean rate            ${pct(overall.negativeCleanRate, 1)} ` +
      `(${cleanNegatives}/${negativesCount} negatives produced 0 facts)`
  );
  console.log(`  Junk on negatives              ${overall.negativeJunkCandidates} candidates`);
  console.log(
    `  Forbidden-fact hits            ${overall.forbiddenHits} (matched a known junk pattern)`
  );
  console.log(`  Avg candidates/case            ${overall.avgCandidatesPerCase.toFixed(2)}`);
  printKindReport(run);
}

/** Entity-kind classification quality: coverage, accuracy, confusion by kind. */
function printKindReport(run: RunSummary): void {
  const { overall, kindConfusion } = run;
  if (overall.expectedEntities === 0) return;
  console.log("\n  ENTITY KIND CLASSIFICATION\n");
  console.log(
    `  Entity coverage (gold entities extracted)  ` +
      `${pct(overall.coveredEntities, overall.expectedEntities)} ` +
      `(${overall.coveredEntities}/${overall.expectedEntities})`
  );
  console.log(
    `  Kind accuracy (of extracted, right kind)   ` +
      `${pct(overall.kindCorrect, overall.coveredEntities)} ` +
      `(${overall.kindCorrect}/${overall.coveredEntities})`
  );
  console.log("\n  Expected kind   Total  Cov'd  Correct  Confusions (predicted×n)");
  console.log("  ──────────────  ─────  ─────  ───────  ───────────────────────");
  for (const k of kindConfusion) {
    // Confusions = predicted buckets that aren't the correct kind, worst first.
    const confusions = Object.entries(k.predictions)
      .filter(([pred]) => pred !== k.kind)
      .sort((a, b) => b[1] - a[1])
      .map(([pred, n]) => `${pred}×${n}`)
      .join(", ");
    console.log(
      `  ${k.kind.padEnd(14)}  ${String(k.total).padStart(5)}  ` +
        `${String(k.covered).padStart(5)}  ${String(k.correct).padStart(7)}  ${confusions || "—"}`
    );
  }
}

/** Per-case detail to STDERR (never stdout, so it can't corrupt --json). */
function printVerbose(run: RunSummary): void {
  console.error("\n── Per-case detail ──");
  for (const r of run.results) {
    const flag = r.expectedCount === 0 && r.candidates.length > 0 ? " ⚠ JUNK" : "";
    console.error(`\n[${r.category}] ${r.id}${flag}`);
    for (const e of r.expectedDetail) {
      console.error(`  ${e.matched ? "✓" : "✗ MISS"} gold: ${e.fact}  (${e.best.toFixed(2)})`);
    }
    for (const cd of r.candidateDetail) {
      if (cd.forbidden) {
        console.error(`  ✗ FORBIDDEN: ${cd.content}  (matched a junk pattern)`);
      } else if (!cd.matched) {
        console.error(`  • extra: ${cd.content}  (best ${cd.best.toFixed(2)})`);
      }
    }
    for (const ed of r.entityDetail) {
      if (!ed.covered) {
        console.error(`  ✗ entity MISSED: ${ed.name} (want ${ed.expectedKind})`);
      } else if (ed.kindCorrect) {
        console.error(`  ✓ entity: ${ed.name} → ${ed.expectedKind}`);
      } else {
        console.error(
          `  ✗ entity KIND: ${ed.name} want ${ed.expectedKind}, got ${ed.extractedKind ?? "(none)"}`
        );
      }
    }
  }
}

/** Human variance band — answers "is this delta real or noise?". */
function printVarianceHuman(variance: Record<string, VarianceBand>): void {
  const line = (label: string, b: VarianceBand, rate = true): void => {
    const fmt = (v: number) => (rate ? pct(v, 1) : v.toFixed(1));
    console.log(
      `  ${label.padEnd(30)} mean ${fmt(b.mean)}  [min ${fmt(b.min)}, max ${fmt(b.max)}, spread ${fmt(b.max - b.min)}]`
    );
  };
  console.log("\n  VARIANCE");
  console.log("  ──────────────────────────────────────────────────────────────");
  line("Recall", variance.recall);
  line("Precision", variance.precision);
  line("Negative clean rate", variance.negativeCleanRate);
  line("Forbidden-fact hits", variance.forbiddenHits, false);
  line("Entity coverage", variance.entityCoverage);
  line("Kind accuracy", variance.kindAccuracy);
}

async function main(): Promise<void> {
  console.error(
    `Extracting facts for ${EXTRACTION_CASES.length} cases ` +
      `(model: ${args.model ?? "default gpt-oss-120b"}${REPEAT > 1 ? `, ${REPEAT} runs` : ""})...`
  );
  const runs: RunSummary[] = [];
  for (let i = 0; i < REPEAT; i++) {
    if (REPEAT > 1) console.error(`  run ${i + 1}/${REPEAT}...`);
    runs.push(await runOnce());
  }

  const primary = runs[0];
  const variance = REPEAT > 1 ? computeVariance(runs) : undefined;

  if (args.json) {
    // ONE JSON document on stdout — variance folded in (not a second print
    // after it), so a CI gate parsing stdout gets both the run and the spread.
    console.log(
      JSON.stringify(
        {
          matchThreshold: MATCH_THRESHOLD,
          overall: primary.overall,
          kindConfusion: primary.kindConfusion,
          byCategory: primary.byCategory,
          ...(variance && { runs: REPEAT, variance }),
        },
        null,
        2
      )
    );
  } else {
    printRunHuman(primary);
    if (variance) printVarianceHuman(variance);
  }
  // Verbose detail goes to stderr in both modes — safe alongside --json stdout.
  if (args.verbose) printVerbose(primary);

  // Baseline handling runs last so the normal report is always emitted first.
  // All baseline I/O goes to stderr so it never corrupts --json stdout.
  const baselinePath = args.baseline ?? DEFAULT_BASELINE_PATH;
  if (args["save-baseline"]) {
    await saveBaseline(runs, baselinePath);
  } else if (args.baseline) {
    await gateAgainstBaseline(runs, baselinePath);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
