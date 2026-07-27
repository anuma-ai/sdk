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
 *   dropped    : memories in a failed/unanswered batch — the metric this pass
 *                exists to keep at 0 (#757 regressed exactly here)
 *   canon      : canonicalization reuse-rate WITH vs WITHOUT the vocab hint
 *
 * Run:
 *   PORTAL_API_KEY=... pnpm eval:topic
 *   pnpm eval:topic --models inclusionai/ling-2.6-flash,gpt-oss/gpt-oss-120b --repeat 3 [--verbose]
 *   pnpm eval:topic --json
 *   pnpm eval:topic --repeat 10 --save-baseline  # write the golden baseline
 *   pnpm eval:topic --repeat 10 --baseline test/memory/src/topic/baseline.json
 *                                                # gate: exit 1 on a regression
 *
 * The gate REFUSES a repeat count that differs from the baseline's, so 10 is not
 * a suggestion here — it is what the committed baseline records.
 */
import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

import { DEFAULT_EXTRACTION_MODEL } from "../../../../src/lib/memory/autoExtract.js";
import { extractEntitiesForMemories } from "../../../../src/lib/memory/topicExtract.js";
import { normalizeEntityName } from "../../../../src/lib/db/entities/types.js";
import {
  buildGateBaseline,
  compareToGateBaseline,
  describeConfigMismatch,
  formatGateRegressions,
  type GateBaseline,
  type GateMetricSpec,
  isValidGateBaseline,
} from "../gate.js";
import { TOPIC_CASES, CANON_CASES, CANON_VOCAB } from "./dataset.js";

const DEFAULT_BASELINE_PATH = "test/memory/src/topic/baseline.json";

/**
 * Gated metrics.
 *
 * Floors are sized to the MEAN of the 10 gated runs, not to a single run. One
 * flipped item moves a 10-run mean by 1/(items x 10) — e.g. 1/340 = 0.3pt for
 * the 34 gold entities — so most floors below sit well above that.
 *
 * `junkCleanRate` is the exception and keeps a wide floor: see its comment. A
 * floor has to cover the noise the metric ACTUALLY exhibits, not just one item's
 * worth, and a capture with stdDev 0 leaves the floor doing all the work.
 *
 * They were previously 0.06–0.30, sized to the spread of a SINGLE run. Applied to
 * a 5-run mean that made the gate ~sqrt(5) too loose (#772 review): the same
 * mistake that let a consolidation case fail on every pass unnoticed. `gate.ts`
 * now derives the working tolerance from the standard error of the mean
 * difference, so these floors only stop a freakishly stable capture from setting
 * a hair-trigger.
 */
const GATE_METRICS: GateMetricSpec[] = [
  // Observed 100% across all 10 baseline runs. Floor = 2 of 34 gold entities.
  { key: "recall", direction: "higher-better", minTolerance: 0.02 },
  // Observed 89.5–100% (one run produced 4 false positives). Floor covers that.
  { key: "precision", direction: "higher-better", minTolerance: 0.03 },
  { key: "f1", direction: "higher-better", minTolerance: 0.02 },
  // Observed 91.2–100%: a 3-of-34 kind flip is inherent noise, not a regression.
  { key: "kindAccuracy", direction: "higher-better", minTolerance: 0.03, label: "kind accuracy" },
  // Sized inside a hard ceiling: there are exactly 7 traps (EMPTY_CASES), so
  // junkCleanRate moves in 1/7 = 14.29pt steps per trap per run, and with a
  // zero-stdDev capture `meanDiffTolerance` returns this floor flat.
  //
  //   1 trap broken on EVERY run (systematic)  drop 14.29pt  <- must FIRE
  //   one historically-normal 57.1% run of 5   drop  8.57pt  <- must PASS
  //   two such runs                            drop 17.14pt  <- must FIRE
  //
  // 0.12 satisfies all three. 0.15 (an earlier revision of this PR) sat just
  // ABOVE the systematic case, so a prompt edit that reliably over-extracts one
  // trap every run went green — the exact shape #757/#765 shipped.
  //
  // At n=7 the ambiguity is irreducible: "1 trap broken every run" and "5 traps
  // broken in one run" are both 14.29pt on the mean, so any floor catching the
  // first also reds the second. Growing the trap corpus is what separates them.
  { key: "junkCleanRate", direction: "higher-better", minTolerance: 0.12, label: "junk-clean" },
  // 8 cases → one flip is 12.5%. Only the WITH-vocab rate is gated; the no-vocab
  // rate is the control arm and is reported, not gated.
  { key: "canonWithVocab", direction: "higher-better", minTolerance: 0.05, label: "canon (vocab)" },
  // Sub-1 on purpose. `dropped` is compared as a MEAN over the repeats against a
  // baseline of 0, so a floor of 1.0 would let a SYSTEMATIC one-memory drop
  // (mean exactly 1) through — the shape of the id-echo bug in #757. At 0.5 a
  // consistent single-memory drop fires while one flaky run dropping one memory
  // (mean 0.2 over 5 repeats) does not.
  {
    key: "dropped",
    direction: "lower-better",
    minTolerance: 0.5,
    format: "count",
    label: "dropped",
  },
];

const { values: args } = parseArgs({
  options: {
    models: { type: "string" },
    repeat: { type: "string" },
    verbose: { type: "boolean", default: false },
    json: { type: "boolean", default: false },
    // Regression gate — same contract as `eval:extraction`. `--save-baseline`
    // writes the current runs as the golden baseline; `--baseline <path>` alone
    // compares against that file and exits non-zero on a regression. Both are
    // single-model only (a gate over a model sweep is meaningless).
    baseline: { type: "string", short: "b" },
    "save-baseline": { type: "boolean", default: false },
  },
});

const GATE_MODE = args["save-baseline"] || args.baseline !== undefined;
/**
 * The A/B sweep defaults to the candidate line-up; the gate defaults to the ONE
 * model production actually runs, so a committed baseline describes the live path.
 */
const DEFAULT_MODELS = GATE_MODE
  ? DEFAULT_EXTRACTION_MODEL
  : "inclusionai/ling-2.6-flash,gpt-oss/gpt-oss-120b,glm/glm-5.2";
const MODELS = (args.models ?? DEFAULT_MODELS)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// A bad --repeat would otherwise yield NaN and aggregate over nothing.
const parsedRepeat = parseInt(args.repeat ?? "", 10);
const REPEAT = Number.isFinite(parsedRepeat) && parsedRepeat >= 1 ? parsedRepeat : 3;
const VERBOSE = args.verbose;

if (GATE_MODE && MODELS.length !== 1) {
  console.error(
    `\n  --baseline / --save-baseline compare ONE model against the baseline; ` +
      `got ${MODELS.length} (${MODELS.join(", ")}). Pass a single --models value.\n`
  );
  process.exit(1);
}

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
const CANON_HARD_TOTAL = CANON_CASES.filter((c) => c.hard).length;

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
  for (const c of CANON_CASES) {
    const ents = res.get(c.id) ?? [];
    const canon = normalizeEntityName(c.canonical);
    const hit = ents.some((e) => normalizeEntityName(e.name) === canon);
    if (hit) {
      reused++;
      if (c.hard) hardReused++;
    }
  }
  return { reused, total: CANON_CASES.length, hardReused, hardTotal: CANON_HARD_TOTAL };
}

/**
 * One repeat's metrics — a plain object TYPE (not an interface) so it stays
 * assignable to the gate's `Record<string, number>` run shape.
 */
type TopicRunMetrics = {
  precision: number;
  recall: number;
  f1: number;
  kindAccuracy: number;
  junkCleanRate: number;
  canonNoVocab: number;
  canonWithVocab: number;
  canonHard: number;
  dropped: number;
};

interface TopicRun {
  metrics: TopicRunMetrics;
  fps: string[];
  ms: number;
}

/**
 * One full repeat: the precision/recall pass plus BOTH canon arms. The canon arms
 * run per-repeat (not once per model) so every gated metric has a spread measured
 * the same way — a single-sample metric can't contribute a real tolerance.
 */
async function runOnce(model: string): Promise<TopicRun> {
  const pr = await scorePrecisionRecall(model);
  const canonNo = await scoreCanon(model, false);
  const canonYes = await scoreCanon(model, true);

  const precision = pr.tp / (pr.extractedTotal || 1);
  const recall = pr.tp / pr.goldTotal;
  return {
    metrics: {
      precision,
      recall,
      f1: precision + recall ? (2 * precision * recall) / (precision + recall) : 0,
      kindAccuracy: pr.kindCorrect / (pr.tp || 1),
      junkCleanRate: pr.junkClean / (pr.junkTotal || 1),
      canonNoVocab: canonNo.reused / (canonNo.total || 1),
      canonWithVocab: canonYes.reused / (canonYes.total || 1),
      canonHard: canonYes.hardReused / (canonYes.hardTotal || 1),
      dropped: pr.unanswered,
    },
    fps: pr.fps,
    ms: pr.ms,
  };
}

const pct = (n: number) => (n * 100).toFixed(1).padStart(5) + "%";
const meanOf = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const band = (xs: number[]) =>
  `${pct(meanOf(xs))} [${pct(Math.min(...xs))}-${pct(Math.max(...xs))}]`;
const seriesOf = (runs: TopicRun[], key: keyof TopicRunMetrics) => runs.map((r) => r.metrics[key]);

/** The knobs the numbers depend on, recorded in the baseline and refused on mismatch. */
function gateConfig(model: string): { model: string; repeat: number } {
  return { model, repeat: REPEAT };
}

/** Write the baseline file and report where it landed (stderr — never stdout). */
async function saveBaseline(runs: TopicRun[], model: string, path: string): Promise<void> {
  const baseline = buildGateBaseline(
    runs.map((r) => r.metrics),
    GATE_METRICS,
    gateConfig(model)
  );
  await writeFile(path, JSON.stringify(baseline, null, 2) + "\n");
  console.error(
    `\nBaseline written to ${path} (${runs.length} run${runs.length === 1 ? "" : "s"}, ${model}; ` +
      `pair --save-baseline with --repeat 3+ for a noise-aware tolerance).`
  );
}

/** Load, compare, and exit non-zero on regression. Returns on a clean gate. */
async function gateAgainstBaseline(runs: TopicRun[], model: string, path: string): Promise<void> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(path, "utf-8"));
  } catch (err) {
    console.error(`Failed to load baseline from ${path}: ${String(err)}`);
    process.exit(1);
  }
  // Fail loudly on a wrong-shaped file rather than passing vacuously — a
  // malformed baseline (or this eval's own --json output by mistake) would
  // otherwise skip every metric and report "no regressions".
  if (!isValidGateBaseline(parsed, GATE_METRICS)) {
    console.error(
      `\n  ${path} is not a valid topic baseline (expected a config + metrics object). ` +
        `Generate one with --save-baseline.\n`
    );
    process.exit(1);
  }
  const baseline: GateBaseline = parsed;
  // Model and repeat count both change what the numbers mean; refuse rather
  // than silently comparing apples to oranges.
  const mismatch = describeConfigMismatch(baseline, gateConfig(model));
  if (mismatch) {
    console.error(`\n  Refusing to gate: ${mismatch}. Re-run to match, or regenerate.\n`);
    process.exit(1);
  }
  const regressions = compareToGateBaseline(
    runs.map((r) => r.metrics),
    baseline,
    GATE_METRICS
  );
  if (regressions.length === 0) {
    console.error("\n  Baseline comparison: no regressions detected.\n");
    return;
  }
  console.error("\n  REGRESSION DETECTED\n");
  console.error(formatGateRegressions(regressions));
  console.error("");
  process.exit(1);
}

async function main(): Promise<void> {
  console.error(
    `Topic quality: ${TOPIC_CASES.length} memories, ${GOLD_TOTAL} gold entities, ` +
      `${EMPTY_CASES.length} junk-traps, ${CANON_CASES.length} canon cases, ${REPEAT} repeat(s)\n`
  );
  const byModel: Record<string, TopicRun[]> = {};
  const rows: string[] = [];
  const nameW = Math.max(...MODELS.map((m) => m.length), 5);

  for (const model of MODELS) {
    const runs: TopicRun[] = [];
    for (let r = 0; r < REPEAT; r++) {
      process.stderr.write(`  ${model} ${r + 1}/${REPEAT}... `);
      const run = await runOnce(model);
      runs.push(run);
      const m = run.metrics;
      process.stderr.write(
        `P=${pct(m.precision)} R=${pct(m.recall)} kind=${pct(m.kindAccuracy)} ` +
          `junk-clean=${pct(m.junkCleanRate)} dropped=${m.dropped} FP=${run.fps.length} ` +
          `canon=${pct(m.canonNoVocab)}->${pct(m.canonWithVocab)} ${(run.ms / 1000).toFixed(1)}s\n`
      );
      if (VERBOSE && run.fps.length) console.error(`     false positives: ${run.fps.join(" | ")}`);
    }
    byModel[model] = runs;

    rows.push(
      model.padEnd(nameW) +
        ` | ${band(seriesOf(runs, "precision"))} | ${band(seriesOf(runs, "recall"))}` +
        ` | ${band(seriesOf(runs, "f1"))} | ${band(seriesOf(runs, "kindAccuracy"))}` +
        ` | ${band(seriesOf(runs, "junkCleanRate"))}` +
        ` | ${meanOf(seriesOf(runs, "dropped")).toFixed(1).padStart(7)} | ` +
        `${pct(meanOf(seriesOf(runs, "canonNoVocab")))}->${pct(meanOf(seriesOf(runs, "canonWithVocab")))} | ` +
        `${(meanOf(runs.map((r) => r.ms)) / 1000).toFixed(1).padStart(5)}`
    );
  }

  if (args.json) {
    // ONE JSON document on stdout, so a CI gate parsing stdout gets the whole
    // result. Everything else this script prints goes to stderr.
    console.log(
      JSON.stringify(
        {
          repeat: REPEAT,
          corpus: {
            memories: TOPIC_CASES.length,
            goldEntities: GOLD_TOTAL,
            junkTraps: EMPTY_CASES.length,
            canonCases: CANON_CASES.length,
          },
          models: Object.fromEntries(
            Object.entries(byModel).map(([model, runs]) => [
              model,
              {
                runs: runs.map((r) => r.metrics),
                mean: Object.fromEntries(
                  (Object.keys(runs[0].metrics) as (keyof TopicRunMetrics)[]).map((k) => [
                    k,
                    meanOf(seriesOf(runs, k)),
                  ])
                ),
              },
            ])
          ),
        },
        null,
        2
      )
    );
  } else {
    console.log("\n===== TOPIC-EXTRACTION QUALITY =====\n");
    console.log(
      "model".padEnd(nameW) +
        " | precision           | recall              | f1                  | kind acc            | junk-clean          | dropped | canon(no->voc) | s"
    );
    console.log(
      "-".repeat(nameW) +
        "-+---------------------+---------------------+---------------------+---------------------+---------------------+---------+----------------+----"
    );
    rows.forEach((r) => console.log(r));
    console.log(
      `\nprecision = TP/extracted (1-junk) · recall = TP/${GOLD_TOTAL} gold · junk-clean = empty memories kept empty (${EMPTY_CASES.length}) · ` +
        `dropped = memories in a failed/unanswered batch (mean/${TOPIC_CASES.length}) — the metric this pass exists to keep at 0; recall and junk-clean are BOTH depressed by drops, so read dropped first · ` +
        `canon = seeded-name reuse-rate, no-vocab -> with-vocab lift (${CANON_CASES.length} cases). Run --verbose to audit false positives against gold completeness.`
    );
  }

  // Baseline handling runs last so the normal report is always emitted first.
  // All baseline I/O goes to stderr so it never corrupts --json stdout.
  const model = MODELS[0];
  const baselinePath = args.baseline ?? DEFAULT_BASELINE_PATH;
  if (args["save-baseline"]) {
    await saveBaseline(byModel[model], model, baselinePath);
  } else if (args.baseline) {
    await gateAgainstBaseline(byModel[model], model, baselinePath);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
