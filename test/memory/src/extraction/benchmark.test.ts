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
 */

import "dotenv/config";
import { parseArgs } from "node:util";

import { extractFacts } from "../../../../src/lib/memory/autoExtract.js";
import { generateEmbeddings } from "../../../../src/lib/memoryEngine/embeddings.js";
import type { EmbeddingOptions } from "../../../../src/lib/memoryEngine/types.js";
import { EXTRACTION_CASES, type ExtractionCase, type ExtractionCategory } from "./dataset.js";

const { values: args } = parseArgs({
  options: {
    json: { type: "boolean", default: false },
    verbose: { type: "boolean", default: false },
    "match-threshold": { type: "string" },
    model: { type: "string" },
    concurrency: { type: "string" },
    repeat: { type: "string" },
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
  };
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

  const overall = {
    recall: totalMatchedExpected / (totalExpected || 1),
    precision: totalGoodCandidates / (totalCandidates || 1),
    avgCandidatesPerCase: totalCandidates / results.length,
    negativeJunkCandidates: negativeCandidates,
    negativeCleanRate: cleanNegatives / (negatives.length || 1),
    forbiddenHits,
    totalCandidates,
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
    byCategory,
    negativesCount: negatives.length,
    cleanNegatives,
  };
}

/** Detailed single-run report (category table + headline metrics + verbose). */
function printRun(run: RunSummary): void {
  const { overall, byCategory, negativesCount, cleanNegatives } = run;
  if (args.json) {
    console.log(JSON.stringify({ matchThreshold: MATCH_THRESHOLD, overall, byCategory }, null, 2));
  } else {
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
  }

  if (args.verbose) {
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
    }
  }
}

/** Variance band across N runs — answers "is this delta real or noise?". */
function printVariance(runs: RunSummary[]): void {
  const band = (label: string, sel: (r: RunSummary) => number, rate = true): void => {
    const xs = runs.map(sel);
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    const min = Math.min(...xs);
    const max = Math.max(...xs);
    const fmt = (v: number) => (rate ? pct(v, 1) : v.toFixed(1));
    console.log(
      `  ${label.padEnd(30)} mean ${fmt(mean)}  [min ${fmt(min)}, max ${fmt(max)}, spread ${fmt(max - min)}]`
    );
  };
  console.log(`\n  VARIANCE over ${runs.length} runs`);
  console.log("  ──────────────────────────────────────────────────────────────");
  band("Recall", (r) => r.overall.recall);
  band("Precision", (r) => r.overall.precision);
  band("Negative clean rate", (r) => r.overall.negativeCleanRate);
  band("Forbidden-fact hits", (r) => r.overall.forbiddenHits, false);
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

  // Report the first run in full (category table + verbose); the headline
  // numbers across all runs go in the variance band below.
  printRun(runs[0]);
  if (REPEAT > 1) printVariance(runs);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
