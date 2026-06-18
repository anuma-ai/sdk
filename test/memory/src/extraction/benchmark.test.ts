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
  },
});

const MATCH_THRESHOLD = args["match-threshold"] ? parseFloat(args["match-threshold"]) : 0.62;
const CONCURRENCY = args.concurrency ? Math.max(1, parseInt(args.concurrency, 10)) : 4;

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
  candidateDetail: { content: string; matched: boolean; best: number }[];
}

async function scoreCase(c: ExtractionCase): Promise<CaseResult> {
  const candidates = await extractFacts(
    c.messages.map((m) => ({ id: m.id, role: m.role, content: m.content })),
    { apiKey: API_KEY, baseUrl: BASE_URL, ...(args.model && { model: args.model }) }
  );
  const candTexts = candidates.map((c2) => c2.content);

  // Embed gold + candidate texts together, then match by cosine.
  const texts = [...c.expected, ...candTexts];
  const embeddings = texts.length > 0 ? await generateEmbeddings(texts, embeddingOptions) : [];
  const goldEmb = embeddings.slice(0, c.expected.length);
  const candEmb = embeddings.slice(c.expected.length);

  const expectedDetail = c.expected.map((fact, i) => {
    let best = 0;
    for (const ce of candEmb) best = Math.max(best, cosine(goldEmb[i], ce));
    return { fact, matched: best >= MATCH_THRESHOLD, best };
  });
  const candidateDetail = candTexts.map((content, i) => {
    let best = 0;
    for (const ge of goldEmb) best = Math.max(best, cosine(candEmb[i], ge));
    return { content, matched: best >= MATCH_THRESHOLD, best };
  });

  return {
    id: c.id,
    category: c.category,
    expectedCount: c.expected.length,
    candidates: candTexts,
    matchedExpected: expectedDetail.filter((e) => e.matched).length,
    goodCandidates: candidateDetail.filter((e) => e.matched).length,
    expectedDetail,
    candidateDetail,
  };
}

function pct(n: number, d: number): string {
  return d > 0 ? `${((100 * n) / d).toFixed(1)}%` : "—";
}

async function main(): Promise<void> {
  console.error(
    `Extracting facts for ${EXTRACTION_CASES.length} cases (model: ${args.model ?? "default gpt-oss-120b"})...`
  );
  const results = await mapLimit(EXTRACTION_CASES, CONCURRENCY, scoreCase);

  const withExpected = results.filter((r) => r.expectedCount > 0);
  const negatives = results.filter((r) => r.expectedCount === 0);

  const totalExpected = withExpected.reduce((s, r) => s + r.expectedCount, 0);
  const totalMatchedExpected = withExpected.reduce((s, r) => s + r.matchedExpected, 0);
  const totalCandidates = results.reduce((s, r) => s + r.candidates.length, 0);
  const totalGoodCandidates = results.reduce((s, r) => s + r.goodCandidates, 0);
  const negativeCandidates = negatives.reduce((s, r) => s + r.candidates.length, 0);
  const cleanNegatives = negatives.filter((r) => r.candidates.length === 0).length;

  const overall = {
    recall: totalMatchedExpected / (totalExpected || 1),
    precision: totalGoodCandidates / (totalCandidates || 1),
    avgCandidatesPerCase: totalCandidates / results.length,
    negativeJunkCandidates: negativeCandidates,
    negativeCleanRate: cleanNegatives / (negatives.length || 1),
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
        `(${cleanNegatives}/${negatives.length} negatives produced 0 facts)`
    );
    console.log(`  Junk on negatives              ${negativeCandidates} candidates`);
    console.log(`  Avg candidates/case            ${overall.avgCandidatesPerCase.toFixed(2)}`);
  }

  if (args.verbose) {
    console.error("\n── Per-case detail ──");
    for (const r of results) {
      const flag = r.expectedCount === 0 && r.candidates.length > 0 ? " ⚠ JUNK" : "";
      console.error(`\n[${r.category}] ${r.id}${flag}`);
      for (const e of r.expectedDetail) {
        console.error(`  ${e.matched ? "✓" : "✗ MISS"} gold: ${e.fact}  (${e.best.toFixed(2)})`);
      }
      for (const cd of r.candidateDetail) {
        if (!cd.matched) console.error(`  • extra: ${cd.content}  (best ${cd.best.toFixed(2)})`);
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
