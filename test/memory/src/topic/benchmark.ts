#!/usr/bin/env node
/**
 * Topic-extraction QUALITY benchmark — the dimensions the recall-only proxy
 * missed: precision, junk-suppression, and name canonicalization.
 *
 * Drives the ACTUAL topic pass `extractEntitiesForMemories` over a corpus with
 * COMPLETE gold labels, so an extracted entity matching no gold is a true false
 * positive. Reports, per model, across N repeats (extraction is non-deterministic):
 *
 *   recall     : gold entities surfaced        (coverage)
 *   precision  : extracted that are real gold  (1 - junk)
 *   f1         : harmonic mean
 *   kind acc   : right kind among matched
 *   junk-clean : empty-gold memories that stayed empty (no over-extraction)
 *   canon      : canonicalization reuse-rate WITH vs WITHOUT the vocab hint
 *
 *   PORTAL_API_KEY=... pnpm tsx test/memory/src/topic/benchmark.ts \
 *     --models inclusionai/ling-2.6-flash,gpt-oss/gpt-oss-120b,glm/glm-5.2 --repeat 3 [--verbose]
 */
import "dotenv/config";
import { extractEntitiesForMemories } from "../../../../src/lib/memory/topicExtract.js";
import { normalizeEntityName } from "../../../../src/lib/db/entities/types.js";
import { TOPIC_CASES, CANON_CASES, CANON_VOCAB } from "./dataset.js";

const argv = process.argv.slice(2);
const has = (f: string) => argv.includes(`--${f}`);
function flag(name: string, def: string): string {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
}
const MODELS = flag("models", "inclusionai/ling-2.6-flash,gpt-oss/gpt-oss-120b,glm/glm-5.2")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const REPEAT = parseInt(flag("repeat", "3"), 10);
const VERBOSE = has("verbose");

const API_KEY = process.env.PORTAL_API_KEY;
const BASE_URL = process.env.ANUMA_API_URL || "https://portal.anuma-dev.ai";
if (!API_KEY) {
  console.error("Error: PORTAL_API_KEY is required (.env).");
  process.exit(1);
}

// Sanctioned subset-aware token matcher (benchmark.test.ts:53).
function entityMatchScore(gold: string, extracted: string): number {
  const toks = (s: string) =>
    new Set(
      normalizeEntityName(s)
        .split(/[^\p{L}\p{N}]+/u)
        .filter((t) => t.length > 0)
    );
  const g = toks(gold),
    e = toks(extracted);
  if (g.size === 0 || e.size === 0) return 0;
  const [small, big] = g.size <= e.size ? [g, e] : [e, g];
  for (const t of small) if (!big.has(t)) return 0;
  return small.size / big.size;
}

const GOLD_TOTAL = TOPIC_CASES.reduce((n, c) => n + c.gold.length, 0);
const EMPTY_CASES = TOPIC_CASES.filter((c) => c.gold.length === 0);

interface Pr {
  tp: number;
  goldTotal: number;
  extractedTotal: number;
  kindCorrect: number;
  junkClean: number;
  junkTotal: number;
  unanswered: number;
  fps: string[];
  ms: number;
}

async function scorePrecisionRecall(model: string): Promise<Pr> {
  const start = Date.now();
  const memories = TOPIC_CASES.map((c) => ({ id: c.id, content: c.content }));
  const res = await extractEntitiesForMemories(memories, {
    apiKey: API_KEY,
    baseUrl: BASE_URL,
    model,
  });
  const m: Pr = {
    tp: 0,
    goldTotal: GOLD_TOTAL,
    extractedTotal: 0,
    kindCorrect: 0,
    junkClean: 0,
    junkTotal: EMPTY_CASES.length,
    unanswered: 0,
    fps: [],
    ms: 0,
  };
  for (const c of TOPIC_CASES) {
    const ents = res.get(c.id);
    if (ents === undefined) {
      m.unanswered++;
      continue;
    } // absent = failed batch
    m.extractedTotal += ents.length;
    if (c.gold.length === 0 && ents.length === 0) m.junkClean++;
    // one-to-one gold -> extracted, highest score wins
    const used = new Set<number>();
    for (const exp of c.gold) {
      let best = 0,
        bestIdx = -1;
      for (let i = 0; i < ents.length; i++) {
        if (used.has(i)) continue;
        const s = entityMatchScore(exp.name, ents[i].name);
        if (s > best) {
          best = s;
          bestIdx = i;
        }
      }
      if (bestIdx >= 0) {
        used.add(bestIdx);
        m.tp++;
        if (ents[bestIdx].kind === exp.kind) m.kindCorrect++;
      }
    }
    // unmatched extracted = false positives (junk / over-extraction)
    ents.forEach((e, i) => {
      if (!used.has(i)) m.fps.push(`${c.id}: "${e.name}" (${e.kind})`);
    });
  }
  m.ms = Date.now() - start;
  return m;
}

// Canonicalization: fraction of cases where the model reused the seeded name
// (any extracted entity normalizes to the canonical). Run with + without vocab.
async function scoreCanon(
  model: string,
  withVocab: boolean
): Promise<{ reused: number; total: number; hardReused: number; hardTotal: number }> {
  const memories = CANON_CASES.map((c) => ({ id: c.id, content: c.content }));
  const res = await extractEntitiesForMemories(memories, {
    apiKey: API_KEY,
    baseUrl: BASE_URL,
    model,
    ...(withVocab ? { existingEntityNames: CANON_VOCAB } : {}),
  });
  let reused = 0,
    hardReused = 0;
  const hardTotal = CANON_CASES.filter((c) => c.hard).length;
  for (const c of CANON_CASES) {
    const ents = res.get(c.id) ?? [];
    const canon = normalizeEntityName(c.canonical);
    const hit = ents.some((e) => normalizeEntityName(e.name) === canon);
    if (hit) {
      reused++;
      if (c.hard) hardReused++;
    }
  }
  return { reused, total: CANON_CASES.length, hardReused, hardTotal };
}

const pct = (n: number) => (n * 100).toFixed(1).padStart(5) + "%";
const meanOf = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const band = (xs: number[]) =>
  `${pct(meanOf(xs))} [${pct(Math.min(...xs))}-${pct(Math.max(...xs))}]`;

(async () => {
  console.error(
    `Topic quality: ${TOPIC_CASES.length} memories, ${GOLD_TOTAL} gold entities, ` +
      `${EMPTY_CASES.length} junk-traps, ${CANON_CASES.length} canon cases, ${REPEAT} repeat(s)\n`
  );
  const out: Record<string, unknown> = {};
  const rows: string[] = [];
  const nameW = Math.max(...MODELS.map((m) => m.length), 5);

  for (const model of MODELS) {
    const prRuns: Pr[] = [];
    for (let r = 0; r < REPEAT; r++) {
      process.stderr.write(`  ${model} pr ${r + 1}/${REPEAT}... `);
      const pr = await scorePrecisionRecall(model);
      prRuns.push(pr);
      const p = pr.tp / (pr.extractedTotal || 1),
        rec = pr.tp / pr.goldTotal;
      process.stderr.write(
        `P=${pct(p)} R=${pct(rec)} kind=${pct(pr.kindCorrect / (pr.tp || 1))} ` +
          `junk-clean=${pct(pr.junkClean / (pr.junkTotal || 1))} FP=${pr.fps.length} ${(pr.ms / 1000).toFixed(1)}s\n`
      );
      if (VERBOSE && pr.fps.length) console.error(`     false positives: ${pr.fps.join(" | ")}`);
    }
    process.stderr.write(`  ${model} canon (no vocab)... `);
    const canonNo = await scoreCanon(model, false);
    process.stderr.write(`${canonNo.reused}/${canonNo.total}\n`);
    process.stderr.write(`  ${model} canon (with vocab)... `);
    const canonYes = await scoreCanon(model, true);
    process.stderr.write(
      `${canonYes.reused}/${canonYes.total} (hard ${canonYes.hardReused}/${canonYes.hardTotal})\n`
    );

    const precision = prRuns.map((m) => m.tp / (m.extractedTotal || 1));
    const recall = prRuns.map((m) => m.tp / m.goldTotal);
    const f1 = prRuns.map((m) => {
      const p = m.tp / (m.extractedTotal || 1),
        r = m.tp / m.goldTotal;
      return p + r ? (2 * p * r) / (p + r) : 0;
    });
    const kind = prRuns.map((m) => m.kindCorrect / (m.tp || 1));
    const junk = prRuns.map((m) => m.junkClean / (m.junkTotal || 1));
    const secs = meanOf(prRuns.map((m) => m.ms)) / 1000;
    const unans = meanOf(prRuns.map((m) => m.unanswered));

    rows.push(
      model.padEnd(nameW) +
        ` | ${band(precision)} | ${band(recall)} | ${band(f1)} | ${band(kind)} | ${band(junk)} | ` +
        `${pct(canonNo.reused / canonNo.total)}->${pct(canonYes.reused / canonYes.total)} | ${secs.toFixed(1).padStart(5)}`
    );
    out[model] = { prRuns, canonNo, canonYes };
  }

  console.log("\n===== TOPIC-EXTRACTION QUALITY =====\n");
  console.log(
    "model".padEnd(nameW) +
      " | precision           | recall              | f1                  | kind acc            | junk-clean          | canon(no->voc) | s"
  );
  console.log(
    "-".repeat(nameW) +
      "-+---------------------+---------------------+---------------------+---------------------+---------------------+----------------+----"
  );
  rows.forEach((r) => console.log(r));
  console.log(
    `\nprecision = TP/extracted (1-junk) · recall = TP/${GOLD_TOTAL} gold · junk-clean = empty memories kept empty (${EMPTY_CASES.length}) · ` +
      `canon = seeded-name reuse-rate, no-vocab -> with-vocab lift (${CANON_CASES.length} cases). Run --verbose to audit false positives against gold completeness.`
  );
  console.log(JSON.stringify(out));
})();
